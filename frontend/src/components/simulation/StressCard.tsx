import { Activity, Droplets, Thermometer, Flame, Leaf, Bug } from "lucide-react";

interface StressIndicator {
  name: string;
  value: number;
  icon: React.ReactNode;
}

interface StressCardProps {
  waterStress: number;
  temperatureStress: number;
  heatStress: number;
  nutrientStress: number;
  pestStress: number;
}

function getStressColor(value: number): string {
  if (value >= 0.8) return "bg-stress-healthy";
  if (value >= 0.5) return "bg-stress-moderate";
  return "bg-stress-severe";
}

function getStressLabel(value: number): string {
  if (value >= 0.8) return "Healthy";
  if (value >= 0.5) return "Moderate";
  return "Stressed";
}

function getStressTextColor(value: number): string {
  if (value >= 0.8) return "text-stress-healthy";
  if (value >= 0.5) return "text-stress-moderate";
  return "text-stress-severe";
}

export function StressCard({ waterStress, temperatureStress, heatStress, nutrientStress, pestStress }: StressCardProps) {
  const indicators: StressIndicator[] = [
    { name: "Water Stress", value: waterStress, icon: <Droplets className="w-4 h-4" /> },
    { name: "Temperature Stress", value: temperatureStress, icon: <Thermometer className="w-4 h-4" /> },
    { name: "Heat Stress", value: heatStress, icon: <Flame className="w-4 h-4" /> },
    { name: "Nutrient Stress", value: nutrientStress, icon: <Leaf className="w-4 h-4" /> },
    { name: "Pest Stress", value: pestStress, icon: <Bug className="w-4 h-4" /> },
  ];

  return (
    <div className="agri-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <h3 className="font-poppins font-semibold text-foreground mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Stress Indicators
      </h3>
      
      <div className="space-y-3">
        {indicators.map((indicator) => (
          <div key={indicator.name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {indicator.icon}
                <span>{indicator.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${getStressTextColor(indicator.value)}`}>
                  {getStressLabel(indicator.value)}
                </span>
                <span className="text-sm font-poppins font-semibold text-foreground">
                  {indicator.value.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="agri-progress">
              <div 
                className={`agri-progress-bar ${getStressColor(indicator.value)}`}
                style={{ width: `${indicator.value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-stress-healthy" />
              Healthy (≥0.8)
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-stress-moderate" />
              Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-stress-severe" />
              Stressed (&lt;0.5)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
