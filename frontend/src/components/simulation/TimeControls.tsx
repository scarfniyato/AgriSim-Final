import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Gauge } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeControlsProps {
  onJump: (days: number) => void;
  speed: string;
  onSpeedChange: (speed: string) => void;
}

export function TimeControls({ onJump, speed, onSpeedChange }: TimeControlsProps) {
  return (
    <div className="h-16 bg-card border-t border-border px-6 flex items-center justify-between shadow-sm">
      {/* Left - Time Navigation */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground font-medium mr-3">Time Navigation</span>
        
        <button
          onClick={() => onJump(-10)}
          className="control-btn flex items-center gap-1.5 group"
        >
          <ChevronsLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>-10 Days</span>
        </button>
        
        <button
          onClick={() => onJump(-1)}
          className="control-btn flex items-center gap-1.5 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>-1 Day</span>
        </button>
        
        <div className="w-px h-8 bg-border mx-2" />
        
        <button
          onClick={() => onJump(1)}
          className="control-btn flex items-center gap-1.5 group"
        >
          <span>+1 Day</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
        
        <button
          onClick={() => onJump(10)}
          className="control-btn flex items-center gap-1.5 group"
        >
          <span>+10 Days</span>
          <ChevronsRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Center - Info */}
      <div className="text-sm text-muted-foreground">
        Press <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Space</kbd> to pause/resume
      </div>

      {/* Right - Speed Control */}
      <div className="flex items-center gap-3">
        <Gauge className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-medium">Simulation Speed</span>
        <Select value={speed} onValueChange={onSpeedChange}>
          <SelectTrigger className="w-24 bg-muted border-0">
            <SelectValue placeholder="Speed" />
          </SelectTrigger>
          <SelectContent className="bg-card">
            <SelectItem value="0.1">0.5x</SelectItem>
            <SelectItem value="0.5">1x</SelectItem>
            <SelectItem value="1">2x</SelectItem>
            <SelectItem value="3">5x</SelectItem>
            <SelectItem value="5">10x</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
