import { Thermometer, CloudRain, Sun, TrendingUp, TrendingDown } from "lucide-react";

interface EnvironmentCardProps {
  temperature: { current: number; min: number; max: number };
  rainfall: number;
  solarRadiation: number;
}

export function EnvironmentCard({ temperature, rainfall, solarRadiation }: EnvironmentCardProps) {
  return (
    <div className="agri-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <h3 className="font-poppins font-semibold text-foreground mb-4 flex items-center gap-2">
        <Sun className="w-5 h-5 text-sun" />
        Environmental Conditions
      </h3>
      
      <div className="space-y-4">
        {/* Temperature */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Temperature</p>
              <p className="font-poppins font-semibold text-lg text-foreground">
                {temperature.current}°C
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rain" />
              {temperature.min}°C
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-destructive" />
              {temperature.max}°C
            </span>
          </div>
        </div>

        {/* Rainfall */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rain/10 flex items-center justify-center">
              <CloudRain className="w-5 h-5 text-rain" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Rainfall</p>
              <p className="font-poppins font-semibold text-lg text-foreground">
                {rainfall}
                <span className="text-sm font-normal text-muted-foreground ml-1">mm</span>
              </p>
            </div>
          </div>
        </div>

        {/* Solar Radiation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sun/10 flex items-center justify-center">
              <Sun className="w-5 h-5 text-sun" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Solar Radiation</p>
              <p className="font-poppins font-semibold text-lg text-foreground">
                {solarRadiation}
                <span className="text-sm font-normal text-muted-foreground ml-1">MJ/m²</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
