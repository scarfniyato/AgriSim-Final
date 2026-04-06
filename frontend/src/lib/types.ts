// Crop types
export type CropId = 'sweet_corn' | 'carrot' | 'tomato';

// Location types
export type LocationId = 'baguio_benguet' | 'malaybalay_bukidnon' | 'tuguegarao_cagayan';

// Season types
export type SeasonId = 'wet_season' | 'dry_season';

// Month types
export type MonthId = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';

// Soil type
export type SoilTypeId = 'clay_loam' | 'sandy_loam' | 'loam';

// Scenario types
export type ScenarioId = 'baseline' | 'drought' | 'heat' | 'nutrient';

// CO2 levels in ppm
export type CO2LevelId = 'low' | 'medium' | 'high';

// Fertilizer levels
export type FertilizerLevelId = 'none' | 'low' | 'recommended' | 'high';

// Simulation configuration — sent to backend as POST /api/simulate body
export interface SimulationConfig {
  crop: CropId;
  location: LocationId;
  season: SeasonId;
  planting_month: MonthId;
  soil_type: SoilTypeId;
  initial_moisture: number; // 0-1 range
  scenario: ScenarioId;
  co2_level: CO2LevelId;
  fertilizer_level: FertilizerLevelId;
  start_date: string; // ISO date string
  irrigation_schedule?: Record<string, number>; // day_number → mm applied
  pesticide_schedule?: number[]; // days when pesticide was applied
}

// ---------------------------------------------------------------------------
// Expert system alert (matches backend DailyOutput.alerts structure)
// ---------------------------------------------------------------------------
export type AlertSeverity = 'None' | 'Low' | 'Moderate' | 'Severe' | 'Critical';
export type AlertLayer = 'layer1' | 'layer2';

export interface SimulationAlert {
  rule_id: string;
  layer: AlertLayer;
  severity: AlertSeverity;
  message: string;
  action_type?: string;  // Only for layer2 (e.g., 'Irrigate', 'Spray')
  basis: string;
  is_primary: boolean;
  rank: number;  // 1 = primary, 2+ = secondary, 0 = not ranked
}

// Status summary for each stress variable (Level 1)
export interface StressStatusSummary {
  value: number;
  status: string;  // 'Optimal' | 'Mild' | 'Moderate' | 'Severe' | 'Critical'
  label: string;
}

export interface StatusSummary {
  temperature: StressStatusSummary;
  heat: StressStatusSummary;
  water: StressStatusSummary;
  nutrient: StressStatusSummary;
  pest: StressStatusSummary;
  co2: StressStatusSummary;
  solar: StressStatusSummary;
}

// ---------------------------------------------------------------------------
// Per-day simulation output (matches backend DailyOutput dataclass)
// ---------------------------------------------------------------------------
export interface DailySimulationResult {
  day: number;
  date: string;

  // Weather inputs (after scenario modifier applied)
  tmax: number;
  tmin: number;
  tmean: number;
  rainfall: number;
  srad: number;         // MJ/m2/day
  srad_method: string;  // 'hargreaves_estimate' | 'sunshine_angstrom'

  // SIMPLE model outputs
  gdd: number;               // GDD today (degC.d)
  cumulative_gdd: number;    // cumulative thermal time (degC.d)
  biomass: number;           // cumulative biomass (g/m2)
  delta_biomass: number;     // biomass increment today (g/m2/day)
  growth_stage: string;      // stage key e.g. 'vegetative'
  growth_stage_label: string;// human-readable label e.g. 'Vegetative'

  // Stress factors (0-1; 1 = no stress)
  f_solar: number;
  f_temp: number;            // temperature effect on RUE (0-1)
  f_heat: number;
  f_water: number;
  f_co2: number;
  f_nutrient: number;        // nutrient availability (0-1; 1 = optimal)
  f_pest: number;            // pest damage factor (0.5-1; 1 = no pest pressure)
  arid: number;              // ARID index = 1 - ETa/ETo (0 = no stress, 1 = full drought)

  // Water balance
  paw_mm: number;            // plant-available water in root zone (mm)
  paw_pct: number;           // PAW as % of PAW_max (0-100)
  etp: number;               // potential ET (mm/day)
  eta: number;               // actual ET (mm/day)
  runoff: number;            // surface runoff (mm)
  irrigation_mm: number;     // irrigation applied today (mm)
  consecutive_dry_days: number;

  // Expert system alerts for this day
  alerts: SimulationAlert[];

  // Three-tier alert structure (Level 1, 2, 3)
  status_summary: StatusSummary;
  primary_limiting_factor: SimulationAlert | Record<string, never>;  // Empty object if none
  level2_warnings: SimulationAlert[];
  level3_recommendations: SimulationAlert[];
  best_available_action: SimulationAlert | Record<string, never>;
  other_actions: SimulationAlert[];
}

// ---------------------------------------------------------------------------
// Harvest summary (computed by backend from daily_results at maturity)
// ---------------------------------------------------------------------------
export interface HarvestSummary {
  final_yield_t_ha: number | null;
  final_biomass_kg_ha: number;
  harvest_index: number;
  total_rainfall_mm: number;
  total_irrigation_mm: number;
  avg_srad: number;
  avg_temperature: number;
  avg_arid: number;
  severe_drought_days: number;
  avg_f_water: number;
  avg_f_temp: number;
  avg_f_heat: number;
  avg_f_co2: number;
  avg_f_nutrient: number;
  avg_f_pest: number;
  dominant_stress: string;
  sowing_date: string;
  harvest_date: string;
  crop_duration_days: number;
}

// ---------------------------------------------------------------------------
// Full simulation output (matches backend SimulationOutput dataclass)
// ---------------------------------------------------------------------------
export interface SimulationApiData {
  // Simulation identity
  station: string;
  crop: string;
  location: string;
  variety: string;
  planting_month: string;
  scenario: string;
  co2_ppm: number;
  fertilizer_level: string;
  soil_type: string;

  // Summary
  days_simulated: number;
  maturity_day: number | null;
  maturity_reached: boolean;
  yield_estimate_kg_m2: number | null;
  yield_estimate_t_ha: number | null;
  total_biomass_g_m2: number;

  // Harvest summary (populated by backend when simulation completes)
  harvest_summary: HarvestSummary | null;

  // Per-day detail (length == days_simulated)
  daily_results: DailySimulationResult[];
}
