import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BiomassDataPoint {
  day: number;
  biomass: number;
  delta_biomass: number;
  growth_stage: string;
}

interface BiomassAccumulationChartProps {
  data: BiomassDataPoint[];
}

// Growth stage colors matching the reference image
const STAGE_COLORS: Record<string, string> = {
  pre_emergence: "#6b7280",   // gray-500
  emergence: "#6b7280",       // gray-500
  seedling: "#6b7280",        // gray-500
  vegetative: "#3b82f6",      // blue-500
  flowering: "#f97316",       // orange-500
  grain_filling: "#f97316",   // orange-500
  fruit_set: "#f97316",       // orange-500
  root_bulking: "#f97316",    // orange-500
  maturity: "#22c55e",        // green-500
  harvest_ready: "#22c55e",   // green-500
};

const STAGE_LABELS: Record<string, string> = {
  pre_emergence: "Pre-Emergence",
  emergence: "Emergence",
  seedling: "Seedling",
  vegetative: "Vegetative",
  flowering: "Flowering",
  grain_filling: "Grain Filling",
  fruit_set: "Fruit Set",
  root_bulking: "Root Bulking",
  maturity: "Maturity",
  harvest_ready: "Harvest Ready",
};

function getStageColor(stage: string): string {
  return STAGE_COLORS[stage] || "#6b7280";
}

export function BiomassAccumulationChart({ data }: BiomassAccumulationChartProps) {
  const [showNormalized, setShowNormalized] = useState(false);

  // Compute max values and normalized data
  const { maxBiomass, maxDelta, uniqueStages, finalBiomass, chartData } = useMemo(() => {
    let maxB = 0;
    let maxD = 0;
    const stages = new Set<string>();
    
    data.forEach(d => {
      if (d.biomass > maxB) maxB = d.biomass;
      if (d.delta_biomass > maxD) maxD = d.delta_biomass;
      stages.add(d.growth_stage);
    });

    const finalB = maxB;
    
    // Add normalized biomass to each data point
    const enrichedData = data.map(d => ({
      ...d,
      biomass_normalized: finalB > 0 ? (d.biomass / finalB) * 100 : 0,
    }));
    
    return {
      maxBiomass: Math.ceil(maxB / 50) * 50,  // Round up to nearest 50
      maxDelta: Math.ceil(maxD),               // Round up to nearest integer
      uniqueStages: Array.from(stages),
      finalBiomass: finalB,
      chartData: enrichedData,
    };
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const dayData = chartData.find(d => d.day === label);
    const stageName = dayData ? (STAGE_LABELS[dayData.growth_stage] || dayData.growth_stage) : "";
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-800 mb-2">Day {label}</p>
        <p className="text-gray-600 mb-2">Stage: <span className="font-medium">{stageName}</span></p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-mono font-medium">
              {entry.dataKey === "biomass" 
                ? `${entry.value.toFixed(1)} g/m²`
                : entry.dataKey === "biomass_normalized"
                ? `${entry.value.toFixed(1)}%`
                : `${entry.value.toFixed(2)} g/m²/day`
              }
            </span>
          </p>
        ))}
        {/* Show both values in tooltip regardless of view mode */}
        {dayData && (
          <p className="text-gray-500 text-xs mt-2 pt-2 border-t border-gray-100">
            {showNormalized 
              ? `Raw: ${dayData.biomass.toFixed(1)} g/m²`
              : `Normalized: ${dayData.biomass_normalized.toFixed(1)}% of final`
            }
          </p>
        )}
      </div>
    );
  };

  // Custom legend to show growth stages
  const renderLegend = () => {
    // Stage legend items
    const stageItems = [
      { stage: "seedling", label: "Seedling" },
      { stage: "vegetative", label: "Vegetative" },
      { stage: "flowering", label: "Flowering" },
      { stage: "maturity", label: "Maturity" },
    ].filter(item => uniqueStages.includes(item.stage));

    return (
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 text-sm">
        {/* Main data series */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-green-500 rounded" />
          <span className="text-muted-foreground">
            {showNormalized ? "Biomass (% of final)" : "Cumulative biomass (g/m²)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-sm" />
          <span className="text-muted-foreground">Daily increment (g/m²/day)</span>
        </div>
        
        {/* Divider */}
        <div className="w-px h-4 bg-gray-300 mx-2" />
        
        {/* Growth stages */}
        {stageItems.map(item => (
          <div key={item.stage} className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: STAGE_COLORS[item.stage] }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {showNormalized 
              ? "Normalized biomass (% of final) vs. daily growth rate"
              : "Cumulative total vs. daily growth rate"
            }
          </p>
        </div>
        {/* Toggle for normalized view */}
        <button
          onClick={() => setShowNormalized(!showNormalized)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            showNormalized
              ? "bg-green-50 border-green-300 text-green-700"
              : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
        >
          {showNormalized ? "Showing: % of Final" : "Show: % of Final"}
        </button>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(120, 10%, 88%)" 
              vertical={false} 
            />
            
            {/* Left Y-axis: Cumulative biomass (raw or normalized) */}
            <YAxis
              yAxisId="left"
              domain={showNormalized ? [0, 100] : [0, maxBiomass]}
              tick={{ fontSize: 11, fill: "hsl(120, 10%, 40%)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={showNormalized ? (v) => `${v}%` : undefined}
              label={{ 
                value: showNormalized ? "Biomass (% of final)" : "Cumulative biomass (g/m²)", 
                angle: -90, 
                position: "insideLeft",
                offset: 10,
                fontSize: 11, 
                fill: "#22c55e",
                style: { textAnchor: "middle" }
              }}
            />
            
            {/* Right Y-axis: Daily increment */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, maxDelta]}
              tick={{ fontSize: 11, fill: "hsl(120, 10%, 40%)" }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: "Daily increment (g/m²/day)", 
                angle: 90, 
                position: "insideRight",
                offset: 10,
                fontSize: 11, 
                fill: "#6b7280",
                style: { textAnchor: "middle" }
              }}
            />
            
            {/* X-axis: Day after sowing */}
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "hsl(120, 10%, 40%)" }}
              axisLine={{ stroke: "hsl(120, 10%, 88%)" }}
              tickLine={false}
              label={{ 
                value: "Day after sowing", 
                position: "insideBottom", 
                offset: -5, 
                fontSize: 11, 
                fill: "hsl(120, 10%, 40%)" 
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Daily increment bars (behind the line) */}
            <Bar 
              yAxisId="right" 
              dataKey="delta_biomass" 
              name="Daily increment"
              barSize={3}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getStageColor(entry.growth_stage)}
                  fillOpacity={0.55}
                />
              ))}
            </Bar>
            
            {/* Cumulative biomass line (on top) - raw or normalized */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={showNormalized ? "biomass_normalized" : "biomass"}
              name={showNormalized ? "Biomass (% of final)" : "Cumulative biomass"}
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#22c55e", stroke: "white", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Custom legend */}
      {renderLegend()}

      {/* Final biomass note when normalized */}
      {showNormalized && (
        <p className="text-xs text-center text-muted-foreground">
          Final biomass: {finalBiomass.toFixed(1)} g/m²
        </p>
      )}
    </div>
  );
}
