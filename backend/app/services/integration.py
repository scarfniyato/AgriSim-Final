"""
integration.py — Simulation Orchestrator (Integration Layer)

Responsibilities:
  1. Load crop, soil, and expert rule parameters from JSON config files.
  2. Load and validate weather data for the chosen station + planting month.
  3. Apply scenario and config settings to initialise simulation state.
  4. Run the day-by-day SIMPLE model time-stepper.
  5. After each day's SIMPLE model step, pass the state to the expert system.
  6. Assemble DailyOutput and SimulationOutput objects.
  7. Return the complete SimulationOutput to routes.py.

This module is the single entry point called by routes.py:
  from app.services.integration import run_simulation
  result = run_simulation(config)

SUGGESTION: If simulation of user farm actions (irrigation, pesticide) is required
in a future version, accept an 'actions' parameter here — a dict keyed by day number
with action payloads — and apply them before each daily step.
"""

import json
import os
from datetime import date, timedelta
from typing import Dict, Any, Tuple

from app.models import CropState, SoilState, DailyOutput, SimulationOutput
from app.services.weather import load_weather_window, priestley_taylor_eto
from app.services import simulation as sim
from app.services import expert_system as es


# ---------------------------------------------------------------------------
# Config file paths
# ---------------------------------------------------------------------------

_CONFIG_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'config')

def _load_json(filename: str) -> Dict[str, Any]:
    path = os.path.join(_CONFIG_DIR, filename)
    with open(path, 'r') as f:
        return json.load(f)


# Load once at module import
_CROP_PARAMS = _load_json('crop_parameters.json')
_SOIL_PARAMS = _load_json('soil_parameters.json')


# ---------------------------------------------------------------------------
# Station key mapping (frontend location ID → backend station key)
# ---------------------------------------------------------------------------

LOCATION_TO_STATION: Dict[str, str] = {
    'baguio_benguet':     'baguio',
    'malaybalay_bukidnon':'malaybalay',
    'tuguegarao_cagayan': 'tuguegarao',
}


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_simulation(config: Dict[str, Any]) -> SimulationOutput:
    """
    Run the full crop simulation for the given configuration.

    Parameters
    ----------
    config : dict — validated request payload from routes.py, must contain:
        crop            : str  ('sweet_corn' | 'tomato' | 'carrot')
        location        : str  (frontend LocationId)
        station         : str  (backend station key; derived from location if absent)
        season          : str  ('wet_season' | 'dry_season')
        planting_month  : str  (e.g. 'june')
        soil_type       : str  ('clay_loam' | 'sandy_loam' | 'loam')
        initial_moisture: float (0.0-1.0; fraction of available water capacity)
        scenario        : str  ('baseline' | 'drought' | 'heat' | 'nutrient')
        co2_level       : str  ('low' | 'medium' | 'high')
        fertilizer_level: str  ('none' | 'low' | 'recommended' | 'high')
        max_days        : int  (optional override; defaults to crop's max_days param)

    Returns
    -------
    SimulationOutput
    """
    # ------------------------------------------------------------------
    # 1. Resolve parameters
    # ------------------------------------------------------------------
    crop_key = config['crop']
    location = config.get('location', '')
    station = config.get('station') or LOCATION_TO_STATION.get(location, '')
    planting_month = config['planting_month']
    season = config.get('season', 'dry_season')
    soil_key = config['soil_type']
    scenario = config.get('scenario', 'baseline')
    co2_level = config.get('co2_level', 'medium')
    fertilizer_level = config.get('fertilizer_level', 'recommended')
    initial_moisture = float(config.get('initial_moisture', 0.7))
    initial_moisture = max(0.0, min(1.0, initial_moisture))

    if crop_key not in _CROP_PARAMS:
        raise ValueError(f"Unknown crop: '{crop_key}'. Available: {list(_CROP_PARAMS)}")
    if soil_key not in _SOIL_PARAMS:
        raise ValueError(f"Unknown soil type: '{soil_key}'. Available: {list(_SOIL_PARAMS)}")

    crop_params = _CROP_PARAMS[crop_key]
    soil_params = _SOIL_PARAMS[soil_key]

    # --------------- Stop mode: run until maturity, cap at safety limit ------
    # stop_mode = 'maturity' → simulate until TTc >= T_sum
    # max_days_safety = hard cap to prevent infinite runs (default 365)
    stop_mode = crop_params.get('stop_mode', 'maturity')
    max_days_safety = int(crop_params.get('max_days_safety', 365))
    max_days_safety = max(1, min(max_days_safety, 730))  # hard limit: 2 years

    # Allow request-level override (e.g. for testing)
    if 'max_days_safety' in config:
        max_days_safety = int(config['max_days_safety'])
        max_days_safety = max(1, min(max_days_safety, 730))

    # ------------------------------------------------------------------
    # 2. Load weather data window
    # ------------------------------------------------------------------
    # Load the full safety-cap window of weather data upfront.
    # The loop below will break early once the crop reaches maturity.
    # Derive a deterministic seed from the config so the same setup always
    # produces the same stochastic rainfall sequence.  This ensures
    # re-simulations (e.g. after irrigation) keep past-day rainfall stable.
    seed_str = f"{station}:{planting_month}:{season}:{scenario}:{co2_level}"
    weather_seed = hash(seed_str) & 0xFFFFFFFF  # unsigned 32-bit

    weather_window = load_weather_window(station, planting_month, max_days_safety, season, seed=weather_seed)

    # ------------------------------------------------------------------
    # 3. Initialise simulation state
    # ------------------------------------------------------------------
    # SIMPLE model uses PAW directly:
    # paw_max = AWC * RZD (mm), where AWC is volumetric available water fraction.
    paw_max = soil_params['AWC'] * soil_params['RZD']
    initial_paw = paw_max * initial_moisture
    initial_paw = max(0.0, min(paw_max, initial_paw))

    crop_state = CropState(
        biomass=0.0,
        ttc=0.0,
        i_50b=crop_params['canopy']['i_50b'],
        f_solar=0.0,
        growth_stage='pre_emergence',
        is_mature=False,
    )

    soil_state = SoilState(
        paw_mm=initial_paw,
        consecutive_dry_days=0,
    )

    # ------------------------------------------------------------------
    # 4. Day-by-day simulation loop
    # ------------------------------------------------------------------
    daily_results = []
    maturity_day = None
    co2_ppm_value = sim.CO2_PPM.get(co2_level, 500.0)

    # Irrigation schedule: dict of {day_number: mm_applied}
    # Provided by frontend when user clicks irrigate on a specific day.
    irrigation_schedule = config.get('irrigation_schedule', {})

    # Pesticide schedule: list of days when pesticide was applied [day1, day2, ...]
    # Used to compute days_since_spray for f_pest calculation.
    pesticide_schedule = config.get('pesticide_schedule', [])

    # Compute planting date for labelling purposes
    try:
        planting_year = int(weather_window[0]['date'][:4])
        planting_date = date.fromisoformat(weather_window[0]['date'])
    except Exception:
        planting_date = date.today()

    for day_idx, weather_dict in enumerate(weather_window):
        day_num = day_idx + 1
        cal_date = weather_dict['date']

        # Reference ET via Priestley-Taylor (mm/day).
        # Uses season-corrected SRAD and station elevation for γ.
        etp = priestley_taylor_eto(
            weather_dict['tmean'],
            weather_dict['srad'],
            weather_dict['elevation'],
            weather_dict['tmax'],
            weather_dict['tmin'],
            weather_dict['rh'],
            weather_dict['ra'],
        )

        # Irrigation for this day (0 if not scheduled)
        irrigation_mm = float(irrigation_schedule.get(str(day_num), 0.0))

        # Compute days since last pesticide spray for f_pest calculation
        # Filter spray days that are <= current day, find most recent
        past_sprays = [d for d in pesticide_schedule if d <= day_num]
        if past_sprays:
            days_since_spray = day_num - max(past_sprays)
        else:
            days_since_spray = 999  # No spray yet

        # Fertilizer application ratio based on user-selected fertilizer_level
        # Maps UI selection to application_ratio for f_nutrient computation:
        #   'none'        → 0.0  → f_nutrient = 0.30
        #   'low'         → 0.5  → f_nutrient = 0.65
        #   'recommended' → 1.0  → f_nutrient = 1.00
        #   'high'        → 1.5  → f_nutrient = 0.89 (with penalty)
        fertilizer_to_ratio = {
            'none':        0.0,
            'low':         0.5,
            'recommended': 1.0,
            'high':        1.5,
        }
        application_ratio = fertilizer_to_ratio.get(fertilizer_level, 1.0)

        # Run one SIMPLE model step
        crop_state, soil_state, metrics = sim.step_day(
            day_num=day_num,
            weather=weather_dict,
            crop_params=crop_params,
            soil_params=soil_params,
            crop_state=crop_state,
            soil_state=soil_state,
            scenario=scenario,
            co2_level=co2_level,
            fertilizer_level=fertilizer_level,
            etp=etp,
            irrigation_mm=irrigation_mm,
            application_ratio=application_ratio,
            days_since_spray=days_since_spray,
        )

        # Record maturity day and stop simulation (first occurrence)
        if crop_state.is_mature and maturity_day is None:
            maturity_day = day_num

        # ------------------------------------------------------------------
        # 5. Expert system: evaluate rules against today's fact base
        # ------------------------------------------------------------------
        fact_base = {
            'f_water':              metrics['f_water'],
            'f_heat':               metrics['f_heat'],
            'f_co2':                metrics['f_co2'],
            'f_solar':              metrics['f_solar'],
            'f_temp':               metrics['f_temp'],
            'f_nutrient':           metrics['f_nutrient'],
            'f_pest':               metrics['f_pest'],
            'soil_water_mm':        metrics['paw_mm'],
            'soil_water_pct':       metrics['paw_pct'],
            'tmax':                 metrics['tmax'],
            'tmin':                 metrics['tmin'],
            'tmean':                metrics['tmean'],
            'rainfall':             metrics['rainfall'],
            'biomass':              metrics['biomass'],
            'cumulative_gdd':       metrics['cumulative_gdd'],
            'growth_stage':         metrics['growth_stage'],
            'day':                  day_num,
            'consecutive_dry_days': metrics['consecutive_dry_days'],
            'eta':                  metrics['eta'],
            'etp':                  metrics['etp'],
            # Additional fields for tiered alert ranking
            'application_ratio':    application_ratio,
            'crop_name':            crop_params.get('name', crop_key),
            'days_since_spray':     days_since_spray,
            'days_without_spray':   days_since_spray,
            'dap':                  day_num,
            't_avg':                metrics['tmean'],
            'co2_ppm':              co2_ppm_value,
            'i50a':                 crop_params['canopy']['i_50a'],
            'i50b':                 crop_state.i_50b,
            't_sum':                crop_params['phenology']['t_sum'],
        }

        # Generate tiered alerts (Level 1, 2, 3)
        tiered_alerts = es.generate_tiered_alerts(fact_base)
        alerts = tiered_alerts['all_alerts']
        status_summary = tiered_alerts['level1_status_summary']
        primary_limiting_factor = tiered_alerts['primary_limiting_factor'] or {}
        level2_warnings = tiered_alerts['level2_warnings']
        level3_recommendations = tiered_alerts['level3_recommendations']
        best_available_action = tiered_alerts.get('best_available_action') or {}
        other_actions = tiered_alerts.get('other_actions', [])

        # ------------------------------------------------------------------
        # 6. Build DailyOutput
        # ------------------------------------------------------------------
        daily_out = DailyOutput(
            day=day_num,
            date=cal_date,
            tmax=metrics['tmax'],
            tmin=metrics['tmin'],
            tmean=metrics['tmean'],
            rainfall=metrics['rainfall'],
            srad=metrics['srad'],
            srad_method=metrics['srad_method'],
            gdd=metrics['gdd'],
            cumulative_gdd=metrics['cumulative_gdd'],
            biomass=metrics['biomass'],
            delta_biomass=metrics['delta_biomass'],
            growth_stage=metrics['growth_stage'],
            growth_stage_label=metrics['growth_stage_label'],
            f_solar=metrics['f_solar'],
            f_temp=metrics['f_temp'],
            f_heat=metrics['f_heat'],
            f_water=metrics['f_water'],
            f_co2=metrics['f_co2'],
            f_nutrient=metrics['f_nutrient'],
            f_pest=metrics['f_pest'],
            arid=metrics['arid'],
            paw_mm=metrics['paw_mm'],
            paw_pct=metrics['paw_pct'],
            etp=metrics['etp'],
            eta=metrics['eta'],
            runoff=metrics['runoff'],
            irrigation_mm=metrics['irrigation_mm'],
            consecutive_dry_days=metrics['consecutive_dry_days'],
            alerts=alerts,
            status_summary=status_summary,
            primary_limiting_factor=primary_limiting_factor,
            level2_warnings=level2_warnings,
            level3_recommendations=level3_recommendations,
            best_available_action=best_available_action,
            other_actions=other_actions,
        )
        daily_results.append(daily_out)

        # Stop early if crop has reached maturity
        if stop_mode == 'maturity' and crop_state.is_mature:
            break

    # ------------------------------------------------------------------
    # 7. Maturity warning + yield calculation
    # ------------------------------------------------------------------
    maturity_reached = crop_state.is_mature

    # If maturity was NOT reached by the safety cap, add a warning alert
    # to the last day so the frontend can display it.
    if not maturity_reached and daily_results:
        t_sum = crop_params['phenology']['t_sum']
        final_ttc = round(crop_state.ttc, 1)
        pct = round((crop_state.ttc / t_sum) * 100, 1) if t_sum > 0 else 0
        warning_msg = (
            f"Crop did not reach maturity within {len(daily_results)} days. "
            f"Accumulated {final_ttc} / {t_sum} °C·d ({pct}%). "
            f"Consider a warmer location or different planting month."
        )
        # Append warning to last day's alerts
        last_day = daily_results[-1]
        updated_alerts = list(last_day.alerts) + [{
            'type': 'warning',
            'severity': 'high',
            'message': warning_msg,
            'category': 'maturity',
        }]
        # Replace last day with updated alerts
        daily_results[-1] = DailyOutput(
            **{k: getattr(last_day, k) for k in last_day.__dataclass_fields__ if k != 'alerts'},
            alerts=updated_alerts,
        )
    yield_kg_m2, yield_t_ha = None, None
    if crop_state.is_mature or maturity_day is not None:
        yield_kg_m2, yield_t_ha = sim.compute_yield(crop_state, crop_params)

    # ------------------------------------------------------------------
    # 8. Compute harvest summary from daily_results
    # ------------------------------------------------------------------
    harvest_summary = None
    if daily_results:
        n = len(daily_results)
        total_rainfall = sum(d.rainfall for d in daily_results)
        total_irrigation = sum(d.irrigation_mm for d in daily_results)
        avg_srad = sum(d.srad for d in daily_results) / n
        avg_temp = sum(d.tmean for d in daily_results) / n
        avg_arid = sum(d.arid for d in daily_results) / n
        severe_drought_days = sum(1 for d in daily_results if d.arid > 0.5)

        avg_f_water = sum(d.f_water for d in daily_results) / n
        avg_f_temp = sum(d.f_temp for d in daily_results) / n
        avg_f_heat = sum(d.f_heat for d in daily_results) / n
        avg_f_co2 = sum(d.f_co2 for d in daily_results) / n
        avg_f_nutrient = sum(d.f_nutrient for d in daily_results) / n
        avg_f_pest = sum(d.f_pest for d in daily_results) / n

        # Dominant stress: choose the most limiting true stress factor only
        # (exclude CO2 because it is a fertilization effect, not a stress).
        stress_map = {
            'Water (f_water)': avg_f_water,
            'Temperature (f_temp)': avg_f_temp,
            'Heat (f_heat)': avg_f_heat,
            'Nutrient (f_nutrient)': avg_f_nutrient,
            'Pest (f_pest)': avg_f_pest,
        }
        dominant_stress = min(stress_map, key=stress_map.get)

        hi = crop_params['yield']['hi']
        sowing_date = daily_results[0].date
        harvest_date = daily_results[-1].date

        harvest_summary = {
            'final_yield_t_ha': round(yield_t_ha, 3) if yield_t_ha is not None else None,
            'final_biomass_kg_ha': round(crop_state.biomass * 10, 2),  # g/m2 × 10 = kg/ha
            'harvest_index': hi,
            'total_rainfall_mm': round(total_rainfall, 1),
            'total_irrigation_mm': round(total_irrigation, 1),
            'avg_srad': round(avg_srad, 2),
            'avg_temperature': round(avg_temp, 2),
            'avg_arid': round(avg_arid, 4),
            'severe_drought_days': severe_drought_days,
            'avg_f_water': round(avg_f_water, 4),
            'avg_f_temp': round(avg_f_temp, 4),
            'avg_f_heat': round(avg_f_heat, 4),
            'avg_f_co2': round(avg_f_co2, 4),
            'avg_f_nutrient': round(avg_f_nutrient, 4),
            'avg_f_pest': round(avg_f_pest, 4),
            'dominant_stress': dominant_stress,
            'sowing_date': sowing_date,
            'harvest_date': harvest_date,
            'crop_duration_days': n,
        }

    # ------------------------------------------------------------------
    # 9. Assemble and return SimulationOutput
    # ------------------------------------------------------------------
    return SimulationOutput(
        station=station,
        crop=crop_key,
        location=location,
        variety=crop_params.get('variety', ''),
        planting_month=planting_month,
        scenario=scenario,
        co2_ppm=co2_ppm_value,
        fertilizer_level=fertilizer_level,
        soil_type=soil_key,
        days_simulated=len(daily_results),
        maturity_day=maturity_day,
        maturity_reached=maturity_reached,
        yield_estimate_kg_m2=yield_kg_m2,
        yield_estimate_t_ha=yield_t_ha,
        total_biomass_g_m2=round(crop_state.biomass, 2),
        harvest_summary=harvest_summary,
        daily_results=daily_results,
    )


def run_skip_with_auto(
    config: Dict[str, Any],
    start_day: int,
    end_day: int,
    auto_irrigate_enabled: bool,
    auto_pesticide_enabled: bool,
    irrigation_mm: float,
    water_threshold: float = 1.0,
    pest_threshold: float = 0.92,
) -> Tuple[SimulationOutput, Dict[str, float], list, Dict[str, int]]:
    """
    Process skipped-day auto-actions in backend with accurate day-by-day updates.

    This keeps decision accuracy by re-simulating only when an action is added,
    so each next-day decision uses updated stress values.

    Returns
    -------
    (final_result, irrigation_schedule, pesticide_schedule, counts)
    """
    start_day = max(1, int(start_day))
    end_day = max(start_day, int(end_day))
    irrigation_mm = max(0.0, min(float(irrigation_mm), 200.0))

    working_config = dict(config)
    working_irrigation = {
        str(int(k)): float(v)
        for k, v in (config.get('irrigation_schedule', {}) or {}).items()
    }
    working_pesticide = sorted({
        int(d) for d in (config.get('pesticide_schedule', []) or []) if int(d) >= 1
    })

    working_config['irrigation_schedule'] = working_irrigation
    working_config['pesticide_schedule'] = working_pesticide

    result = run_simulation(working_config)

    counts = {'irrigation': 0, 'pesticide': 0}

    for day in range(start_day + 1, end_day + 1):
        if day < 1 or day > len(result.daily_results):
            break

        day_result = result.daily_results[day - 1]
        should_resimulate = False
        day_key = str(day)

        if auto_irrigate_enabled:
            already_irrigated = working_irrigation.get(day_key, 0.0) > 0.0
            if (not already_irrigated) and (day_result.f_water < water_threshold):
                working_irrigation[day_key] = working_irrigation.get(day_key, 0.0) + irrigation_mm
                counts['irrigation'] += 1
                should_resimulate = True

        if auto_pesticide_enabled:
            already_sprayed = day in working_pesticide
            if (not already_sprayed) and (day_result.f_pest < pest_threshold):
                working_pesticide.append(day)
                working_pesticide = sorted(set(working_pesticide))
                counts['pesticide'] += 1
                should_resimulate = True

        if should_resimulate:
            working_config['irrigation_schedule'] = working_irrigation
            working_config['pesticide_schedule'] = working_pesticide
            result = run_simulation(working_config)

    return result, working_irrigation, working_pesticide, counts
