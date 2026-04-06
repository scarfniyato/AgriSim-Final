import { Leaf, Droplets, Layers, TrendingUp, Award, Sprout } from "lucide-react";

interface StatusCardProps {
  growthStage: string;
  biomass: number;
  soilMoisture: number;
  fertilizerLevel?: string;
  finalYield?: number | null;
}

export function StatusCard({ growthStage, biomass, soilMoisture, fertilizerLevel, finalYield }: StatusCardProps) {
  return (
    <div className="agri-card animate-fade-in">
      <h3 className="font-poppins font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Current Status
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Growth Stage */}
        <div className="space-y-1">
          <p className="agri-label flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" />
            Growth Stage
          </p>
          <div className="agri-badge agri-badge-success">
            {growthStage}
          </div>
        </div>

        {/* Biomass */}
        <div className="space-y-1">
          <p className="agri-label flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Biomass
          </p>
          <p className="agri-metric text-foreground">
            {biomass.toFixed(1)}
            <span className="text-sm font-normal text-muted-foreground ml-1">g/m²</span>
          </p>
        </div>

        {/* Soil Moisture */}
        <div className="space-y-1">
          <p className="agri-label flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5" />
            Soil Moisture
          </p>
          <div className="flex items-center gap-2">
            <p className="agri-metric text-foreground">
              {soilMoisture}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </p>
            <div className="flex-1 agri-progress">
              <div 
                className="agri-progress-bar bg-rain"
                style={{ width: `${soilMoisture}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fertilizer Level */}
        {fertilizerLevel && (
          <div className="space-y-1">
            <p className="agri-label flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5" />
              Fertilizer Level
            </p>
            <div className="agri-badge agri-badge-success">
              {fertilizerLevel}
            </div>
          </div>
        )}

        {/* Final Yield - only shown at Harvest Ready */}
        {finalYield != null && (
          <div className="col-span-2 space-y-1 border-t border-border pt-3 mt-1">
            <p className="agri-label flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Final Yield
            </p>
            <p className="agri-metric text-foreground">
              {finalYield.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground ml-1">kg/m²</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
