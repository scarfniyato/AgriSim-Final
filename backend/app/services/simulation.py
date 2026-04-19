"""
simulation.py — SIMPLE Crop Model Engine (Corrected)

Reference: Zhao C. et al. (2019). "A SIMPLE crop model."
           European Journal of Agronomy, 104, 97-107.

Equations implemented exactly as specified in the document:

  Eq. 1  GDD_i     = max(0, Tmean - Tbase)
  Eq. 5  fTemp     = ramp from 0 at Tbase to 1 at Topt; stays 1 above Topt
  Eq. 6  fSolar    = fSolarMax/(1+exp(-0.01*(TTc-I50A)))         [growth phase]
                   = fSolarMax/(1+exp(+0.01*(TTc-(Tsum-I50B)))) [senescence phase]
  Eq. 7  fHeat     = linear drop from 1 at T_heat_onset to 0 at T_extreme (using Tmax)
  Eq. 9  I50B +=   I50maxH*(1-fHeat)    each day (heat accelerates senescence)
  Eq. 10 fCO2      = 1 + S_CO2*(CO2-350); saturates at CO2=700ppm
  Eq. 12 ETa       = min(ETo, 0.096*PAW)
  Eq. 13 I50B +=   I50maxW*(1-fWater)   each day (drought accelerates senescence)
  Eq. 14 fSolar    further reduced when fWater < 0.1 (extreme drought closes stomata)
  ARID            = 1 - ETa/ETo
  fWater          = max(0, 1 - S_water * ARID)
  SCS-CN runoff:  S=(25400/RCN)-254; if rain>0.2S: Q=(rain-0.2S)^2/(rain+0.8S) else Q=0
  PAW update:     PAW(t+1) = PAW(t) + (rain-Q) - ETa - DDC*PAW; clamped [0, AWC*RZD]
  Biomass:        dB = RUE_eff * SRAD * fSolar * fTemp * min(fHeat, fWater)
                  RUE_eff = RUE * fCO2 * fertilizer_modifier
  Yield:          Y = Biomass * HI at maturity (TTc >= Tsum)
"""

import math
from typing import Dict, Any, Tuple

from app.models import CropState, SoilState
from app.services import expert_system


# ---------------------------------------------------------------------------
# Scenario weather modifiers
# ---------------------------------------------------------------------------

SCENARIO_WEATHER_MODIFIERS: Dict[str, Dict[str, float]] = {
    'baseline':  {'tmax_offset': 0.0, 'tmin_offset': 0.0, 'rainfall_multiplier': 1.0},
    'drought':   {'tmax_offset': 2.0, 'tmin_offset': 1.0, 'rainfall_multiplier': 0.3},
    'heat':      {'tmax_offset': 4.0, 'tmin_offset': 2.0, 'rainfall_multiplier': 1.0},
    'nutrient':  {'tmax_offset': 0.0, 'tmin_offset': 0.0, 'rainfall_multiplier': 1.0},
}
SCENARIOS_START_AT_VEGETATIVE = {'drought', 'heat', 'nutrient'}

CO2_PPM: Dict[str, float] = {
    'low':    350.0,
    'medium': 500.0,
    'high':   700.0,
}


# ---------------------------------------------------------------------------
# Public: single-day simulation step
# ---------------------------------------------------------------------------

def step_day(
    day_num: int,
    weather: Dict[str, Any],
    crop_params: Dict[str, Any],
    soil_params: Dict[str, Any],
    crop_state: CropState,
    soil_state: SoilState,
    scenario: str,
    co2_level: str,
    fertilizer_level: str,
    etp: float,         # Priestley-Taylor ETo computed by weather.py (mm/day)
    irrigation_mm: float = 0.0,  # irrigation applied this day (mm)
    application_ratio: float = 1.0,  # fertilizer application ratio (0.0-1.0)
    days_since_spray: int = 999,  # days since last pesticide application
) -> Tuple[CropState, SoilState, Dict[str, Any]]:
    """
    Run one daily step of the SIMPLE model.

    Parameters
    ----------
    day_num          : int — current simulation day (1-based)
    weather          : dict — from weather.load_weather_window()[i]
    crop_params      : dict — single crop entry from crop_parameters.json
    soil_params      : dict — single soil entry from soil_parameters.json
    crop_state       : CropState — mutated in-place and returned
    soil_state       : SoilState — mutated in-place and returned
    scenario         : str — 'baseline' | 'drought' | 'heat' | 'nutrient'
    co2_level        : str — 'low' | 'medium' | 'high'
    fertilizer_level : str — 'none' | 'low' | 'recommended' | 'high'
    etp              : float — potential ET (mm/day) from Priestley-Taylor
    irrigation_mm    : float — irrigation applied this day (mm)
    application_ratio: float — fertilizer application ratio (0.0-1.0, default 1.0)
    days_since_spray : int — days since last pesticide application (default 999 = no spray)

    Returns
    -------
    (updated CropState, updated SoilState, daily_metrics dict)
    """

    # ------------------------------------------------------------------
    # 1. Apply scenario modifiers to today's raw weather
    # ------------------------------------------------------------------
    # Delay stress scenarios until vegetative stage (TTc >= I50A).
    # Before this threshold, weather stays at baseline.
    i_50a = crop_params['canopy']['i_50a']
    scenario_is_active = (
        scenario in SCENARIOS_START_AT_VEGETATIVE and
        crop_state.ttc >= i_50a
    )
    active_scenario = scenario if scenario_is_active else 'baseline'
    mod = SCENARIO_WEATHER_MODIFIERS.get(active_scenario, SCENARIO_WEATHER_MODIFIERS['baseline'])
    tmax = weather['tmax'] + mod['tmax_offset']
    tmin = weather['tmin'] + mod['tmin_offset']
    tmin = min(tmin, tmax - 0.5)       # ensure physical consistency
    tmean = (tmax + tmin) / 2.0
    rainfall = max(0.0, weather['rainfall'] * mod['rainfall_multiplier'])
    srad = weather['srad']              # MJ/m2/day

    # ------------------------------------------------------------------
    # 2. Thermal time (GDD) — Eq. 1
    #    GDD_i = max(0, Tmean - Tbase)
    # ------------------------------------------------------------------
    t_base = crop_params['temperature']['t_base']
    gdd = max(0.0, tmean - t_base)
    crop_state.ttc += gdd

    # ------------------------------------------------------------------
    # 3. Temperature effect on RUE — Eq. 5 (fTemp)
    #    fTemp = 0                              if Tmean < Tbase
    #    fTemp = (Tmean-Tbase)/(Topt-Tbase)    if Tbase <= Tmean < Topt
    #    fTemp = 1.0                            if Tmean >= Topt
    # ------------------------------------------------------------------
    t_opt = crop_params['temperature']['t_opt']
    if tmean < t_base:
        f_temp = 0.0
    elif tmean < t_opt:
        f_temp = (tmean - t_base) / (t_opt - t_base)
    else:
        f_temp = 1.0

    # ------------------------------------------------------------------
    # 4. Heat stress factor — Eq. 7 (fHeat, uses daily Tmax)
    #    fHeat = 1                                              if Tmax <= T_heat_onset
    #    fHeat = 1-(Tmax-T_heat_onset)/(T_extreme-T_heat_onset) linearly to 0
    #    fHeat = 0                                              if Tmax >= T_extreme
    # ------------------------------------------------------------------
    t_heat = crop_params['temperature']['t_heat_onset']
    t_extreme = crop_params['temperature']['t_extreme']

    if tmax <= t_heat:
        f_heat = 1.0
    elif tmax >= t_extreme:
        f_heat = 0.0
    else:
        f_heat = 1.0 - (tmax - t_heat) / (t_extreme - t_heat)
    f_heat = max(0.0, min(1.0, f_heat))

    # ------------------------------------------------------------------
    # 5. CO2 fertilization — Eq. 10 (fCO2)
    #    fCO2 = 1 + S_CO2 * (CO2 - 350)    if CO2 <= 700 ppm
    #    fCO2 = 1 + S_CO2 * 350            if CO2 > 700 ppm (saturation)
    #    S_CO2 is per-ppm (table value / 100).
    # ------------------------------------------------------------------
    co2_ppm = CO2_PPM.get(co2_level, 500.0)
    co2_ref  = crop_params['co2_reference']          # 350 ppm
    co2_sat  = crop_params['co2_saturation']         # 700 ppm
    s_co2    = crop_params['stress']['s_co2']        # per ppm

    co2_effect = min(co2_ppm, co2_sat) - co2_ref    # capped at saturation
    f_co2 = 1.0 + s_co2 * co2_effect
    f_co2 = max(1.0, f_co2)                         # fCO2 >= 1 always

    # ------------------------------------------------------------------
    # 6. Soil water balance — Woli et al. (2012) PAW system
    #    Corrected step ordering per Implementation Guide Steps 1–9:
    #
    #    Step 1: Water_input = Rain + Irrigation
    #    Step 2: SCS-CN runoff
    #    Step 3: Infiltration = Water_input - Runoff
    #    Step 4: PAW_temp = PAW + Infiltration
    #    Step 5: Cap at PAW_max (overflow lost)
    #    Step 6: Drainage only if PAW > field_capacity (0.13 × RZD)
    #    Step 7: ETo (computed externally via Priestley-Taylor)
    #    Step 8: ETa = min(ETo, 0.096 × PAW); PAW -= ETa
    #    Step 9: PAW = max(0, PAW)
    # ------------------------------------------------------------------
    AWC    = soil_params['AWC']
    RCN    = soil_params['RCN']
    DDC    = soil_params['DDC']
    RZD    = soil_params['RZD']
    paw_max = AWC * RZD               # maximum plant-available water (mm)

    # Step 1: Water inputs
    water_input = rainfall + irrigation_mm

    # Step 2: SCS-CN runoff
    S_cn = (25400.0 / RCN) - 254.0
    Ia = 0.2 * S_cn
    if water_input > Ia:
        runoff = (water_input - Ia) ** 2 / (water_input - Ia + S_cn)
    else:
        runoff = 0.0

    # Step 3: Infiltration
    infiltration = max(0.0, water_input - runoff)

    # Step 4: Add infiltration to PAW
    paw = soil_state.paw_mm + infiltration

    # Step 5: Cap at PAW_max (overflow lost as deep percolation)
    paw = min(paw, paw_max)

    # Step 6: Deep drainage — only when PAW exceeds field capacity
    # Woli Eq. 9: field_capacity threshold = 0.13 × RZD (mm)
    field_capacity = 0.13 * RZD
    if paw > field_capacity:
        drainage = DDC * (paw - field_capacity)
    else:
        drainage = 0.0
    paw = paw - drainage

    # Step 7: ETo already computed externally (etp parameter)

    # Step 8: Actual ET — Eq. 12 (Woli Eq. 7)
    eta = min(etp, 0.096 * paw)
    eta = max(0.0, eta)
    paw = paw - eta

    # Step 9: Ensure non-negative
    paw_new = max(0.0, paw)
    soil_state.paw_mm = paw_new

    # ARID index — computed after PAW update using ETa and ETo
    if etp > 0.0:
        arid = 1.0 - eta / etp
    else:
        arid = 0.0
    arid = max(0.0, min(1.0, arid))

    # Consecutive dry days
    if rainfall < 1.0:
        soil_state.consecutive_dry_days += 1
    else:
        soil_state.consecutive_dry_days = 0

    paw_pct = (paw_new / paw_max * 100.0) if paw_max > 0 else 0.0
    paw_pct = max(0.0, min(100.0, paw_pct))

    # ------------------------------------------------------------------
    # 7. Water stress factor (fWater)
    #    fWater = max(0, 1 - S_water * ARID)
    # ------------------------------------------------------------------
    s_water = crop_params['stress']['s_water']
    f_water = max(0.0, 1.0 - s_water * arid)

    # ------------------------------------------------------------------
    # 7a. Determine growth stage FIRST (before computing stress factors)
    #     This ensures that on the day maturity is reached, f_pest is set to 1.0
    # ------------------------------------------------------------------
    t_sum = crop_params['phenology']['t_sum']
    i_50a = crop_params['canopy']['i_50a']
    
    # Get current i_50b (will be updated later for stress effects, but use current value for stage)
    i_50b_current = crop_state.i_50b
    
    crop_state.growth_stage = _determine_growth_stage(
        ttc=crop_state.ttc,
        t_sum=t_sum,
        i_50a=i_50a,
        i_50b=i_50b_current,
    )

    # ------------------------------------------------------------------
    # 7b. Nutrient and Pest stress factors (Expert System)
    #     Computed by expert_system based on environmental conditions.
    # ------------------------------------------------------------------
    stress_factors = expert_system.compute_stress_factors(
        growth_stage=crop_state.growth_stage,
        application_ratio=application_ratio,
        crop_name=crop_params.get('name', 'Sweet Corn'),
        days_since_spray=days_since_spray,
    )
    f_nutrient = stress_factors['f_nutrient']
    f_pest = stress_factors['f_pest']

    # ------------------------------------------------------------------
    # 8. Canopy solar radiation interception — Eq. 6 (fSolar)
    #    Two-phase logistic:
    #      Growth phase (TTc <= Tsum - I50B_dynamic):
    #        fSolar = fSolarMax / (1 + exp(-0.01 * (TTc - I50A)))
    #      Senescence phase (TTc > Tsum - I50B_dynamic):
    #        fSolar = fSolarMax / (1 + exp(+0.01 * (TTc - (Tsum - I50B_dynamic))))
    # ------------------------------------------------------------------
    f_solar_max = crop_params['radiation']['f_solar_max']

    senescence_threshold = t_sum - crop_state.i_50b      # uses DYNAMIC I50B

    if crop_state.ttc <= senescence_threshold:
        # Growth phase
        arg = -0.01 * (crop_state.ttc - i_50a)
    else:
        # Senescence phase
        arg = +0.01 * (crop_state.ttc - senescence_threshold)

    arg = max(-500.0, min(500.0, arg))                   # prevent overflow
    f_solar = f_solar_max / (1.0 + math.exp(arg))

    # Eq. 14: extreme water stress further closes canopy
    if f_water < 0.1:
        f_solar_water = 0.9 + f_water                    # extra 0–0.1 reduction
    else:
        f_solar_water = 1.0
    f_solar = f_solar * f_solar_water
    f_solar = max(0.0, min(f_solar_max, f_solar))
    crop_state.f_solar = f_solar

    # ------------------------------------------------------------------
    # 9. Update dynamic I50B due to stress — Eqs. 9 and 13
    #    Heat stress accelerates senescence: I50B += I50maxH*(1-fHeat)
    #    Water stress accelerates senescence: I50B += I50maxW*(1-fWater)
    #    I50B INCREASING means (Tsum - I50B) DECREASES → senescence starts earlier.
    # ------------------------------------------------------------------
    i_50maxH = crop_params['stress']['i_50maxH']
    i_50maxW = crop_params['stress']['i_50maxW']
    crop_state.i_50b += i_50maxH * (1.0 - f_heat)
    crop_state.i_50b += i_50maxW * (1.0 - f_water)

    # ------------------------------------------------------------------
    # 10. Effective RUE and daily biomass increment
    #     RUE_eff = RUE * fCO2
    #     dB = RUE_eff * SRAD * fSolar * fTemp * min(fHeat, fWater) * fNutrient * fPest
    # ------------------------------------------------------------------
    base_rue = crop_params['radiation']['rue']

    # Biomass increment equation with all stress factors
    # min(fHeat, fWater) means growth is limited by the MOST severe stress
    # fNutrient and fPest are multiplicative (reduce growth proportionally)
    delta_biomass = (srad * f_solar * base_rue * f_co2 * f_temp *
                     min(f_heat, f_water) * f_nutrient * f_pest)
    delta_biomass = max(0.0, delta_biomass)
    crop_state.biomass += delta_biomass

    # ------------------------------------------------------------------
    # 11. Growth stage from SIMPLE crop growth cycle thresholds
    #     Section H logic:
    #       TT < i50a                      -> seedling
    #       i50a <= TT < (Tsum - i50b)     -> vegetative
    #       (Tsum - i50b) <= TT < Tsum     -> reproductive
    #       TT >= Tsum                     -> maturity
    # ------------------------------------------------------------------
    crop_state.growth_stage = _determine_growth_stage(
        ttc=crop_state.ttc,
        t_sum=t_sum,
        i_50a=i_50a,
        i_50b=crop_state.i_50b,
    )

    # ------------------------------------------------------------------
    # 12. Maturity check
    # ------------------------------------------------------------------
    if crop_state.ttc >= t_sum:
        crop_state.is_mature = True

    # ------------------------------------------------------------------
    # 13. Pack metrics dict for DailyOutput
    # ------------------------------------------------------------------
    metrics = {
        'tmax':                 round(tmax, 2),
        'tmin':                 round(tmin, 2),
        'tmean':                round(tmean, 2),
        'rainfall':             round(rainfall, 2),
        'srad':                 round(srad, 2),
        'srad_method':          weather.get('srad_method', 'seasonal_hargreaves'),
        'gdd':                  round(gdd, 2),
        'cumulative_gdd':       round(crop_state.ttc, 2),
        'biomass':              round(crop_state.biomass, 2),
        'delta_biomass':        round(delta_biomass, 4),
        'growth_stage':         crop_state.growth_stage,
        'growth_stage_label':   _stage_label(crop_state.growth_stage),
        'f_solar':              round(f_solar, 4),
        'f_temp':               round(f_temp, 4),
        'f_heat':               round(f_heat, 4),
        'f_water':              round(f_water, 4),
        'f_co2':                round(f_co2, 4),
        'f_nutrient':           round(f_nutrient, 4),
        'f_pest':               round(f_pest, 4),
        'arid':                 round(arid, 4),
        'paw_mm':               round(paw_new, 2),
        'paw_pct':              round(paw_pct, 1),
        'etp':                  round(etp, 2),
        'eta':                  round(eta, 2),
        'runoff':               round(runoff, 2),
        'consecutive_dry_days': soil_state.consecutive_dry_days,
        'co2_ppm':              co2_ppm,
        'irrigation_mm':        round(irrigation_mm, 2),
    }

    return crop_state, soil_state, metrics


# ---------------------------------------------------------------------------
# Growth stage helpers
# ---------------------------------------------------------------------------

_STAGE_LABELS = {
    'pre_emergence': 'Pre-Emergence',
    'emergence':     'Emergence',
    'seedling':      'Seedling',
    'vegetative':    'Vegetative',
    'reproductive':  'Reproductive',
    'flowering':     'Flowering',
    'grain_filling': 'Grain Filling',
    'fruit_set':     'Fruit Set',
    'root_bulking':  'Root Bulking',
    'maturity':      'Maturity',
    'harvest_ready': 'Harvest Ready',
}


def _stage_label(key: str) -> str:
    return _STAGE_LABELS.get(key, key.replace('_', ' ').title())


def _determine_growth_stage(ttc: float, t_sum: float, i_50a: float, i_50b: float) -> str:
    """Return growth stage using Section H crop-cycle thresholds."""
    reproductive_start = t_sum - i_50b

    if ttc < i_50a:
        return 'seedling'
    if ttc < reproductive_start:
        return 'vegetative'
    if ttc < t_sum:
        return 'reproductive'
    return 'maturity'


def compute_yield(crop_state: CropState, crop_params: Dict[str, Any]) -> Tuple[float, float]:
    """
    Yield at physiological maturity.
    yield (kg/m2) = Biomass (g/m2) * HI / 1000
    yield (t/ha)  = yield (kg/m2) * 10
    """
    hi = crop_params['yield']['hi']
    kg_m2 = (crop_state.biomass * hi) / 1000.0
    t_ha  = kg_m2 * 10.0
    return round(kg_m2, 4), round(t_ha, 3)
