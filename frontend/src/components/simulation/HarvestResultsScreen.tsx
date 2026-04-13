import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimulationApiData, SimulationConfig } from "@/lib/types";
import { getCO2DisplayName, getCropDisplayName, getLocationDisplayName, getMonthDisplayName } from "@/lib/utils";
import { Wheat, Droplets, Sun, Thermometer, TrendingUp, ArrowLeft, Sprout, BarChart3 } from "lucide-react";
import { BiomassAccumulationChart } from "./BiomassAccumulationChart";

interface HarvestResultsScreenProps {
  simulationData: SimulationApiData;
  config: SimulationConfig;
  onBack: () => void;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono font-medium text-foreground text-sm">{value}</span>
    </div>
  );
}

export function HarvestResultsScreen({ simulationData, config, onBack }: HarvestResultsScreenProps) {
  const navigate = useNavigate();
  const hs = simulationData.harvest_summary;

  const biomassData = useMemo(() => {
    if (!simulationData?.daily_results?.length) return [];
    return simulationData.daily_results.map(d => ({
      day: d.day,
      biomass: d.biomass,
      delta_biomass: d.delta_biomass,
      growth_stage: d.growth_stage,
    }));
  }, [simulationData]);

  if (!hs) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Wheat className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h1 className="font-poppins text-xl font-bold text-foreground">Harvest Results</h1>
              <p className="text-sm text-muted-foreground">
                {getCropDisplayName(config.crop)} — {getLocationDisplayName(config.location)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Simulation
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              New Simulation
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Primary Results - Hero Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Final Yield
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-800">
                {hs.final_yield_t_ha != null ? `${hs.final_yield_t_ha.toFixed(2)}` : "N/A"}
              </p>
              <p className="text-sm text-green-600 mt-1">t/ha (tonnes per hectare)</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                <Sprout className="w-4 h-4" />
                Final Biomass
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-800">
                {hs.final_biomass_kg_ha.toFixed(1)}
              </p>
              <p className="text-sm text-amber-600 mt-1">kg/ha</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Harvest Index
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-800">{hs.harvest_index.toFixed(2)}</p>
              <p className="text-sm text-blue-600 mt-1">fraction (HI)</p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: Season Summary + Stress Indicators */}
        <div className="grid grid-cols-2 gap-4">
          {/* Season Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Season Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <StatRow label="Total Rainfall" value={`${hs.total_rainfall_mm.toFixed(1)} mm`} />
              <StatRow label="Total Irrigation Applied" value={`${hs.total_irrigation_mm.toFixed(1)} mm`} />
              <StatRow label="Average Solar Radiation" value={`${hs.avg_srad.toFixed(2)} MJ/m²/day`} />
              <StatRow label="Average Temperature" value={`${hs.avg_temperature.toFixed(1)} °C`} />
              <StatRow label="Average ARID" value={hs.avg_arid.toFixed(4)} />
              <StatRow label="Severe Drought Days (ARID > 0.5)" value={hs.severe_drought_days} />
            </CardContent>
          </Card>

          {/* Stress Indicators */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                Average Stress Indicators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <StatRow label="Water Stress" value={hs.avg_f_water.toFixed(4)} />
              <StatRow label="Temperature Stress" value={hs.avg_f_temp.toFixed(4)} />
              <StatRow label="Heat Stress" value={hs.avg_f_heat.toFixed(4)} />
              <StatRow label="Nutrient Stress" value={hs.avg_f_nutrient.toFixed(4)} />
              <StatRow label="Pest Stress" value={hs.avg_f_pest.toFixed(4)} />
              <div className="flex justify-between items-center py-1.5 mt-2 bg-red-50 rounded-lg px-3">
                <span className="text-sm font-medium text-red-700">Dominant Stress Factor</span>
                <span className="font-mono font-semibold text-red-800 text-sm">
                  {hs.dominant_stress
                    .replace('(f_water)', '')
                    .replace('(f_temp)', '')
                    .replace('(f_heat)', '')
                    .replace('(f_nutrient)', '')
                    .replace('(f_pest)', '')
                    .trim()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Simulation Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              Simulation Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-x-8 gap-y-0">
              <StatRow label="Crop" value={getCropDisplayName(config.crop)} />
              <StatRow label="Scenario" value={config.scenario.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())} />
              <StatRow label="CO2" value={getCO2DisplayName(config.co2_level)} />
              <StatRow label="Initial Soil Moisture" value={`${(config.initial_moisture * 100).toFixed(0)}%`} />
              <StatRow label="Season" value={config.season === "wet_season" ? "Wet Season" : "Dry Season"} />
              <StatRow label="Planting Month" value={getMonthDisplayName(config.planting_month)} />
              <StatRow label="Sowing Date" value={hs.sowing_date} />
              <StatRow label="Harvest Date" value={hs.harvest_date} />
              <StatRow label="Crop Duration" value={`${hs.crop_duration_days} days`} />
            </div>
          </CardContent>
        </Card>

        {/* Biomass Graph - Enhanced with dual-axis chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Biomass Accumulation</CardTitle>
          </CardHeader>
          <CardContent>
            <BiomassAccumulationChart data={biomassData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
