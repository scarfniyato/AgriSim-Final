import { DailySimulationResult, SimulationApiData, SimulationConfig } from "./types";

interface ExportBundleInput {
  config: SimulationConfig;
  simulationData: SimulationApiData;
  irrigationSchedule?: Record<string, number>;
  pesticideSchedule?: number[];
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

function sanitizeFilePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const asString = String(value);
  const escaped = asString.replace(/"/g, "\"\"");
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function buildDailyCsvRows(results: DailySimulationResult[]): string[] {
  const headers = [
    "day",
    "date",
    "growth_stage",
    "biomass_g_m2",
    "delta_biomass_g_m2_day",
    "gdd",
    "cumulative_gdd",
    "rainfall_mm",
    "irrigation_mm",
    "tmin_c",
    "tmax_c",
    "tmean_c",
    "srad_mj_m2_day",
    "etp_mm",
    "eta_mm",
    "runoff_mm",
    "paw_mm",
    "paw_pct",
    "arid",
    "f_solar",
    "f_temp",
    "f_heat",
    "f_water",
    "f_co2",
    "f_nutrient",
    "f_pest",
    "consecutive_dry_days",
    "alerts_count",
    "primary_limiting_factor",
    "recommended_action",
  ];

  const lines = [headers.join(",")];
  for (const d of results) {
    const primaryFactor =
      "rule_id" in d.primary_limiting_factor ? d.primary_limiting_factor.rule_id : "";
    const recommendedAction =
      "action_type" in d.best_available_action ? d.best_available_action.action_type : "";

    const row = [
      d.day,
      d.date,
      d.growth_stage,
      d.biomass,
      d.delta_biomass,
      d.gdd,
      d.cumulative_gdd,
      d.rainfall,
      d.irrigation_mm,
      d.tmin,
      d.tmax,
      d.tmean,
      d.srad,
      d.etp,
      d.eta,
      d.runoff,
      d.paw_mm,
      d.paw_pct,
      d.arid,
      d.f_solar,
      d.f_temp,
      d.f_heat,
      d.f_water,
      d.f_co2,
      d.f_nutrient,
      d.f_pest,
      d.consecutive_dry_days,
      d.alerts.length,
      primaryFactor,
      recommendedAction,
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  return lines;
}

function buildSummaryRows(simulationData: SimulationApiData): string[] {
  const finalYield = simulationData.yield_estimate_t_ha;
  const finalBiomass = simulationData.total_biomass_g_m2;

  return [
    "",
    "summary_metric,summary_value",
    `final_yield_t_ha,${csvEscape(finalYield ?? "N/A")}`,
    `final_biomass_g_m2,${csvEscape(finalBiomass ?? "N/A")}`,
  ];
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportSimulationBundle(input: ExportBundleInput): { csvFile: string } {
  const timestamp = formatTimestamp(new Date());
  const cropPart = sanitizeFilePart(input.config.crop);
  const locationPart = sanitizeFilePart(input.config.location);
  const baseName = `simulation_${cropPart}_${locationPart}_${timestamp}`;
  const csvFile = `${baseName}_daily.csv`;
  const csvRows = [
    ...buildDailyCsvRows(input.simulationData.daily_results),
    ...buildSummaryRows(input.simulationData),
  ];
  const csvContent = csvRows.join("\n");

  downloadTextFile(csvFile, csvContent, "text/csv;charset=utf-8");

  return { csvFile };
}
