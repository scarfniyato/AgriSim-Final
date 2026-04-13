"""
Dataclasses representing the internal state and output of the SIMPLE crop simulation.

Working Memory architecture:
  CropState    — mutable per-day crop variables
  SoilState    — mutable per-day soil water balance (PAW-based, matching SIMPLE model)
  DailyOutput  — immutable snapshot of one simulation day's results
  SimulationOutput — full simulation result returned to routes.py / frontend
"""

from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class CropState:
    """Mutable crop state updated each day by simulation.py."""

    biomass: float = 0.0
    """Cumulative above-ground biomass (g/m2)."""

    ttc: float = 0.0
    """Cumulative thermal time / growing degree days (degC.d)."""

    i_50b: float = 0.0
    """Dynamic I50B value (degC.d).
    Starts at the cultivar's i_50b parameter and INCREASES each day due to
    heat stress and water stress (accelerates canopy senescence).
    i_50b += i_50maxH*(1-fHeat) + i_50maxW*(1-fWater) per day.
    """

    f_solar: float = 0.0
    """Today's canopy solar radiation interception fraction (0-1)."""

    growth_stage: str = "pre_emergence"
    """Current growth stage key computed from SIMPLE stage thresholds."""

    is_mature: bool = False
    """True once cumulative TTc >= T_sum (crop has reached physiological maturity)."""


@dataclass
class SoilState:
    """Mutable soil water balance state. Uses SIMPLE model PAW system."""

    paw_mm: float = 0.0
    """Current plant-available water (PAW) in the root zone (mm).
    Range: 0 to PAW_max = AWC * RZD.
    ETa = min(ETo, 0.096 * PAW) — Zhao et al. (2019) Eq. 12.
    """

    consecutive_dry_days: int = 0
    """Number of consecutive days with rainfall < 1mm. Used by expert rules."""


@dataclass
class DailyOutput:
    """Immutable snapshot of one simulation day. Appended to SimulationOutput.daily_results."""

    day: int
    date: str

    # Weather inputs (after scenario modifier applied)
    tmax: float
    tmin: float
    tmean: float
    rainfall: float
    srad: float
    """Solar radiation (MJ/m2/day). Estimated from seasonal range + Hargreaves adjustment."""

    srad_method: str
    """How SRAD was obtained: 'seasonal_hargreaves' or 'sunshine_angstrom'."""

    # SIMPLE model outputs
    gdd: float
    """GDD today = max(0, Tmean - Tbase) (degC.d)."""

    cumulative_gdd: float
    """Cumulative thermal time from planting to end of this day (degC.d)."""

    biomass: float
    """Cumulative above-ground biomass at end of day (g/m2)."""

    delta_biomass: float
    """Biomass increment today: RUE_eff * SRAD * fSolar * fTemp * min(fHeat, fWater) * fNutrient * fPest (g/m2/day)."""

    growth_stage: str
    growth_stage_label: str

    # All SIMPLE model stress/growth factors (0-1 unless noted)
    f_solar: float
    """Canopy solar radiation interception fraction (0-1)."""

    f_temp: float
    """Temperature effect on RUE: 0 if Tmean<Tbase; ramps to 1 at Topt; stays 1 above Topt."""

    f_heat: float
    """Heat stress on biomass: 1 if Tmax<=T_heat_onset; drops to 0 at T_extreme."""

    f_water: float
    """Water stress factor: max(0, 1 - S_water * ARID). 1=no stress, 0=severe drought."""

    f_co2: float
    """CO2 fertilization: 1 + s_co2*(CO2-350); saturates at CO2=700ppm."""

    f_nutrient: float
    """Nutrient availability factor based on fertilizer level and soil status. 1=optimal, 0=severe deficiency."""

    f_pest: float
    """Pest damage factor based on temperature, humidity, and crop stage. 1=no pest pressure, 0.5=severe infestation."""

    arid: float
    """ARID index = 1 - ETa/ETo. 0=no stress, 1=complete drought."""

    # Water balance
    paw_mm: float
    """Plant-available water at end of day (mm)."""

    paw_pct: float
    """PAW as % of PAW_max (0-100%). Displayed as soil moisture in frontend."""

    etp: float
    """Potential evapotranspiration today via Priestley-Taylor (mm/day)."""

    eta: float
    """Actual ET = min(ETo, 0.096 * PAW) (mm/day)."""

    runoff: float
    """Surface runoff today via SCS-CN method (mm)."""

    irrigation_mm: float
    """Irrigation applied today (mm). 0 if no irrigation."""

    consecutive_dry_days: int

    # Expert system
    alerts: List[dict] = field(default_factory=list)
    """Expert system alerts for today.
    Each: {'rule_id': str, 'severity': str, 'message': str, 'layer': str, 'is_primary': bool, 'rank': int}
    """

    status_summary: dict = field(default_factory=dict)
    """Level 1 Status Summary — always shown, one line per stress variable.
    {'temperature': {'value': 0.85, 'status': 'Mild', 'label': 'Temperature'}, ...}
    """

    primary_limiting_factor: dict = field(default_factory=dict)
    """Primary limiting factor for this day (rank=1 alert), or empty dict if none."""

    level2_warnings: List[dict] = field(default_factory=list)
    """Level 2 Active Warnings — Layer 1 explanations with severity >= Moderate."""

    level3_recommendations: List[dict] = field(default_factory=list)
    best_available_action: dict = field(default_factory=dict)
    other_actions: List[dict] = field(default_factory=list)
    """Level 3 Recommendations — Layer 2 actionable advice that fired."""


@dataclass
class SimulationOutput:
    """Complete simulation result returned by integration.py to routes.py."""

    station: str
    crop: str
    location: str
    variety: str
    planting_month: str
    scenario: str
    co2_ppm: float
    fertilizer_level: str
    soil_type: str

    days_simulated: int
    maturity_day: Optional[int]
    maturity_reached: bool
    yield_estimate_kg_m2: Optional[float]
    yield_estimate_t_ha: Optional[float]
    total_biomass_g_m2: float

    harvest_summary: Optional[dict] = None
    """Harvest summary statistics computed from daily_results when maturity is reached."""

    daily_results: List[DailyOutput] = field(default_factory=list)
