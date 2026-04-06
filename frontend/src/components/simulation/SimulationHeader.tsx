import { Pause, Square, Play, Sprout, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SimulationHeaderProps {
  currentDay: number;
  totalDays: number;
  isRunning: boolean;
  onPause: () => void;
  onStop: () => void;
}

export function SimulationHeader({
  currentDay,
  totalDays,
  isRunning,
  onPause,
  onStop,
}: SimulationHeaderProps) {
  const navigate = useNavigate();

  const handleNewSimulation = () => {
    navigate('/scenario-setup');
  };

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shadow-sm">
      {/* Left - Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Sprout className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-poppins font-semibold text-lg text-foreground tracking-tight">
            AgriSim
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-primary animate-pulse-soft' : 'bg-muted-foreground'}`} />
            {isRunning ? "Running Simulation" : "Paused"}
          </p>
        </div>
      </div>

      {/* Center - Day Counter */}
      <div className="flex items-center gap-4">
        <div className="bg-muted rounded-xl px-6 py-2.5 flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Day</span>
          <div className="flex items-baseline gap-1">
            <span className="font-poppins font-bold text-2xl text-foreground">
              {currentDay}
            </span>
            <span className="text-muted-foreground font-medium">/</span>
            <span className="text-muted-foreground font-medium">{totalDays}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-agri-green-400 rounded-full transition-all duration-500"
            style={{ width: `${(currentDay / totalDays) * 100}%` }}
          />
        </div>
      </div>

      {/* Right - Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleNewSimulation}
          className="control-btn control-btn-success flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Simulation</span>
        </button>
        <button
          onClick={onPause}
          className="control-btn control-btn-primary flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Resume</span>
            </>
          )}
        </button>
        <button
          onClick={onStop}
          className="control-btn control-btn-danger flex items-center gap-2"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </button>
      </div>
    </header>
  );
}
