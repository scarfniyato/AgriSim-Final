import { useState } from "react";
import { Droplets, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FarmActionsProps {
  onWater: (mm: number) => void;
  onApplyPesticide: () => void;
  soilMoisture: number;
  pestLevel: number;
}

export function FarmActions({
  onWater,
  onApplyPesticide,
  soilMoisture,
  pestLevel,
}: FarmActionsProps) {
  const [irrigationMm, setIrrigationMm] = useState(20);

  return (
    <TooltipProvider>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
        {/* Water Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => onWater(irrigationMm)}
              size="lg"
              className="w-14 h-14 rounded-xl bg-rain/90 hover:bg-rain text-white shadow-lg backdrop-blur-sm border-2 border-white/20 transition-all hover:scale-110 active:scale-95"
            >
              <Droplets className="w-7 h-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card border-border">
            <div className="space-y-1">
              <p className="font-semibold">Apply Irrigation</p>
              <p className="text-xs text-muted-foreground">
                Current moisture: {soilMoisture}%
              </p>
              <p className="text-xs text-muted-foreground">
                Will apply {irrigationMm} mm of water
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Irrigation amount input */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-border/50 shadow-sm">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
            mm
          </label>
          <Input
            type="number"
            min={1}
            max={200}
            value={irrigationMm}
            onChange={(e) => {
              const val = Math.max(1, Math.min(200, Number(e.target.value) || 1));
              setIrrigationMm(val);
            }}
            className="w-14 h-7 text-xs text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Pesticide Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onApplyPesticide}
              size="lg"
              className="w-14 h-14 rounded-xl bg-agri-brown-400/90 hover:bg-agri-brown-400 text-white shadow-lg backdrop-blur-sm border-2 border-white/20 transition-all hover:scale-110 active:scale-95"
            >
              <Bug className="w-7 h-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card border-border">
            <div className="space-y-1">
              <p className="font-semibold">Apply Pesticide</p>
              <p className="text-xs text-muted-foreground">
                Pest infestation: {pestLevel.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Reduces pest damage by 50%
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Action Legend */}
        <div className="mt-2 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Farm Actions
          </p>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Droplets className="w-3 h-3 text-rain" /> Irrigate
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Bug className="w-3 h-3 text-agri-brown-400" /> Pesticide
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
