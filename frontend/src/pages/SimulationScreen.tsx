import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { SimulationHeader } from "@/components/simulation/SimulationHeader";
import { TimeControls } from "@/components/simulation/TimeControls";
import { CropVisualization } from "@/components/simulation/CropVisualization";
import { BiomassChart } from "@/components/simulation/BiomassChart";
import { StatusCard } from "@/components/simulation/StatusCard";
import { EnvironmentCard } from "@/components/simulation/EnvironmentCard";
import { StressCard } from "@/components/simulation/StressCard";
import { AlertCard } from "@/components/simulation/AlertCard";
import { FarmActions } from "@/components/simulation/FarmActions";
import { SimulationApiData, SimulationConfig, DailySimulationResult } from "@/lib/types";
import { getCropDisplayName, getLocationDisplayName, getCO2DisplayName, getMonthDisplayName } from "@/lib/utils";
import { HarvestResultsScreen } from "@/components/simulation/HarvestResultsScreen";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers to derive UI state from backend DailySimulationResult
// ---------------------------------------------------------------------------

/** Map backend growth_stage key to CropVisualization's expected stage string. */
function mapGrowthStageToVisual(stage: string): string {
  const map: Record<string, string> = {
    pre_emergence: "Pre-Emergence",
    emergence:     "Emergence",
    seedling:      "Seedling",
    vegetative:    "Vegetative",
    reproductive:  "Reproductive",
    flowering:     "Flowering",
    grain_filling: "Grain Filling",
    fruit_set:     "Fruit Set",
    root_bulking:  "Root Bulking",
    maturity:      "Maturity",
    harvest_ready: "Harvest Ready",
  };
  return map[stage] ?? stage;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimulationScreen() {
  const location = useLocation();
  const routeState = location.state as { config: SimulationConfig; simulationData?: SimulationApiData } | undefined;
  const config = routeState?.config;
  const initialSimulationData = routeState?.simulationData;

  // Simulation data can be updated when user applies irrigation and re-simulates
  const [simulationData, setSimulationData] = useState<SimulationApiData | undefined>(initialSimulationData);

  // Track irrigation schedule: { "dayNumber": mm }
  const [irrigationSchedule, setIrrigationSchedule] = useState<Record<string, number>>({});
  // Track pesticide spray days: [day1, day2, ...]
  const [pesticideSchedule, setPesticideSchedule] = useState<number[]>([]);
  const [isResimulating, setIsResimulating] = useState(false);

  // Total days is driven by backend result; fall back to 120 if not available
  const totalDays = simulationData?.days_simulated ?? 120;

  // Playback state
  const [isRunning, setIsRunning] = useState(true);
  const [currentDay, setCurrentDay] = useState(1);
    const [speed, setSpeed] = useState("0.5");
  const [activeEffect, setActiveEffect] = useState<"water" | "fertilizer" | "pesticide" | null>(null);
  const [overlayAlerts, setOverlayAlerts] = useState<{ id: string; type: "info" | "warning" | "error" | "success"; message: string }[]>([]);

  // Harvest results screen toggle
  const [showHarvestResults, setShowHarvestResults] = useState(false);

  // ---------------------------------------------------------------------------
  // Derive today's data from backend daily_results
  // ---------------------------------------------------------------------------
  const dayResult: DailySimulationResult | null = useMemo(() => {
    if (!simulationData?.daily_results?.length) return null;
    const idx = Math.max(0, Math.min(currentDay - 1, simulationData.daily_results.length - 1));
    return simulationData.daily_results[idx];
  }, [simulationData, currentDay]);

  // Effective soil moisture: directly from backend value
  const soilMoisturePct = dayResult?.paw_pct ?? 65;

  // Growth stage for CropVisualization
  const growthStage = dayResult ? mapGrowthStageToVisual(dayResult.growth_stage) : "Pre-Emergence";

  // Determine if crop has reached maturity at current day
  const isAtMaturity = simulationData?.maturity_day != null && currentDay >= simulationData.maturity_day;

  // Biomass chart data — map all daily_results to {day, biomass}
  const biomassData = useMemo(() => {
    if (!simulationData?.daily_results?.length) return [{ day: 0, biomass: 0 }];
    return simulationData.daily_results.map(d => ({ day: d.day, biomass: d.biomass }));
  }, [simulationData]);

  const currentBiomass = dayResult?.biomass ?? 0;

  // Stress levels from backend (1 = no stress; invert for display where needed)
  const stressLevels = useMemo(() => ({
    water:       dayResult?.f_water    ?? 1,
    temperature: dayResult?.f_temp     ?? 1,
    heat:        dayResult?.f_heat     ?? 1,
    nutrient:    dayResult?.f_nutrient ?? 1,
    pest:        dayResult?.f_pest     ?? 1,
  }), [dayResult]);

  // Pest level for visual effects: derived from f_pest (1 = no pest → 0%, 0.75 = moderate → 25%)
  const pestLevel = useMemo(() => {
    const fPest = dayResult?.f_pest ?? 1;
    return (1 - fPest) * 100;
  }, [dayResult]);

  // Final yield — use backend-computed yield (uses correct HI from crop_parameters.json)
  const finalYield = useMemo(() => {
    if (!isAtMaturity) return null;
    if (simulationData?.yield_estimate_kg_m2 != null) return simulationData.yield_estimate_kg_m2;
    return null;
  }, [isAtMaturity, simulationData]);

  // ---------------------------------------------------------------------------
  // Simulation playback loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCurrentDay(prev => {
        // Auto-stop at maturity day
        const matDay = simulationData?.maturity_day;
        if (matDay != null && prev >= matDay) {
          setIsRunning(false);
          return matDay;
        }
        if (prev >= totalDays) {
          setIsRunning(false);
          return prev;
        }
        return prev + 1;
      });

    }, 1000 / parseFloat(speed));

    return () => clearInterval(interval);
  }, [isRunning, speed, totalDays]);

  // Keyboard space bar → toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsRunning(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------
  const handlePause = useCallback(() => setIsRunning(prev => !prev), []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setCurrentDay(1);
    setOverlayAlerts([]);
  }, []);

  const handleJump = useCallback((days: number) => {
    setCurrentDay(prev => Math.max(1, Math.min(totalDays, prev + days)));
  }, [totalDays]);

  // ---------------------------------------------------------------------------
  // Farm actions — client-side interactive adjustments
  // ---------------------------------------------------------------------------
  const triggerEffect = useCallback((effect: "water" | "fertilizer" | "pesticide") => {
    setActiveEffect(effect);
    setTimeout(() => setActiveEffect(null), 2000);
  }, []);

  const handleWater = useCallback((mm: number) => {
    if (!config || isResimulating) return;
    triggerEffect("water");

    // Add this day's irrigation to the schedule
    const dayKey = String(currentDay);
    const updatedSchedule = { ...irrigationSchedule, [dayKey]: (irrigationSchedule[dayKey] ?? 0) + mm };
    setIrrigationSchedule(updatedSchedule);

    toast.success(`Irrigation queued: ${mm} mm on Day ${currentDay}`, {
      description: "Re-simulating with updated water balance...",
    });

    // Re-simulate with the updated irrigation schedule
    setIsResimulating(true);
    const payload = {
      ...config,
      irrigation_schedule: updatedSchedule,
      pesticide_schedule: pesticideSchedule,
    };

    fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data: SimulationApiData) => {
        setSimulationData(data);
        toast.success(`Re-simulation complete! Irrigation of ${mm} mm applied on Day ${currentDay}.`);
      })
      .catch(err => {
        toast.error(`Re-simulation failed: ${err.message}`);
      })
      .finally(() => {
        setIsResimulating(false);
      });
  }, [config, currentDay, irrigationSchedule, pesticideSchedule, isResimulating, triggerEffect]);

  const handleApplyPesticide = useCallback(() => {
    if (!config || isResimulating) return;
    triggerEffect("pesticide");

    // Add this day to pesticide spray schedule (if not already sprayed today)
    const updatedSchedule = pesticideSchedule.includes(currentDay)
      ? pesticideSchedule
      : [...pesticideSchedule, currentDay];
    setPesticideSchedule(updatedSchedule);

    toast.success(`Pesticide applied on Day ${currentDay}`, {
      description: "Re-simulating with updated pest pressure...",
    });

    // Re-simulate with the updated pesticide schedule
    setIsResimulating(true);
    const payload = {
      ...config,
      irrigation_schedule: irrigationSchedule,
      pesticide_schedule: updatedSchedule,
    };

    fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data: SimulationApiData) => {
        setSimulationData(data);
        toast.success(`Re-simulation complete! Pesticide applied on Day ${currentDay}.`);
      })
      .catch(err => {
        toast.error(`Re-simulation failed: ${err.message}`);
      })
      .finally(() => {
        setIsResimulating(false);
      });
  }, [config, currentDay, irrigationSchedule, pesticideSchedule, isResimulating, triggerEffect]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Show harvest results screen when user clicks the Harvest button
  if (showHarvestResults && simulationData && config) {
    return (
      <HarvestResultsScreen
        simulationData={simulationData}
        config={config}
        onBack={() => setShowHarvestResults(false)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <SimulationHeader
        currentDay={currentDay}
        totalDays={totalDays}
        isRunning={isRunning}
        onPause={handlePause}
        onStop={handleStop}
      />

      {/* Configuration summary bar */}
      {config && (
        <div className="bg-card border-b border-border px-6 py-3 shadow-sm overflow-x-auto">
          <div className="max-w-full flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">Crop:</span>
              <span className="font-semibold text-foreground">{getCropDisplayName(config.crop)}</span>
              {simulationData?.variety && (
                <span className="text-xs text-muted-foreground italic">({simulationData.variety})</span>
              )}
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-semibold text-foreground">{getLocationDisplayName(config.location)}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">Season:</span>
              <span className="font-semibold text-foreground">{config.season === 'wet_season' ? 'Wet Season' : 'Dry Season'}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">Planting Month:</span>
              <span className="font-semibold text-foreground">{getMonthDisplayName(config.planting_month)}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">CO2:</span>
              <span className="font-semibold text-foreground">{getCO2DisplayName(config.co2_level)}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">Fertilizer:</span>
              <span className="font-semibold text-foreground">
                {config.fertilizer_level === 'none' ? 'No Fertilizer'
                  : config.fertilizer_level === 'low' ? 'Low (50%)'
                  : config.fertilizer_level === 'recommended' ? 'Recommended'
                  : 'High (150%)'}
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">Scenario:</span>
              <span className="font-semibold text-foreground">{config.scenario.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}</span>
            </div>
            {/* Maturity day badge */}
            {simulationData?.maturity_day != null && (
              <>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-muted-foreground">Maturity:</span>
                  <span className="font-semibold text-foreground">Day {simulationData.maturity_day}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">
        {/* Left panel — 60% */}
        <div className="w-[60%] flex flex-col gap-4">
          <div className="flex-1 min-h-0 relative">
            <CropVisualization
              growthStage={growthStage}
              day={currentDay}
              activeEffect={activeEffect}
              pestLevel={pestLevel}
              crop={config?.crop}
            />
            <FarmActions
              onWater={handleWater}
              onApplyPesticide={handleApplyPesticide}
              soilMoisture={Math.round(soilMoisturePct)}
              pestLevel={pestLevel}
            />
            {/* Harvest button overlay when crop reaches maturity */}
            {isAtMaturity && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 rounded-2xl">
                <button
                  onClick={() => setShowHarvestResults(true)}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-2xl shadow-lg transition-all hover:scale-105 flex items-center gap-3 animate-pulse hover:animate-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>
                  Harvest Crop
                </button>
              </div>
            )}
          </div>

          <div className="h-52">
            <BiomassChart data={biomassData} currentDay={currentDay} />
          </div>
        </div>

        {/* Right panel — 40% */}
        <div className="w-[40%] flex flex-col gap-4 overflow-y-auto pr-1">
          <StatusCard
            growthStage={growthStage}
            biomass={currentBiomass}
            soilMoisture={Math.round(soilMoisturePct)}
            fertilizerLevel={
              config
                ? (config.fertilizer_level === 'none' ? 'No Fertilizer'
                    : config.fertilizer_level === 'low' ? 'Low (50%)'
                    : config.fertilizer_level === 'recommended' ? 'Recommended'
                    : 'High (150%)')
                : undefined
            }
            finalYield={finalYield}
          />

          <EnvironmentCard
            temperature={{
              current: dayResult?.tmean  ?? 28,
              min:     dayResult?.tmin   ?? 22,
              max:     dayResult?.tmax   ?? 32,
            }}
            rainfall={dayResult?.rainfall ?? 0}
            solarRadiation={dayResult?.srad ?? 18}
          />

          <StressCard
            waterStress={stressLevels.water}
            temperatureStress={stressLevels.temperature}
            heatStress={stressLevels.heat}
            nutrientStress={stressLevels.nutrient}
            pestStress={stressLevels.pest}
          />

          {/* GDD progress info */}
          {dayResult && (
            <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-foreground">Thermal Time (GDD)</h3>
              <div className="flex justify-between text-muted-foreground">
                <span>Today's GDD</span>
                <span className="font-mono text-foreground">{dayResult.gdd.toFixed(1)} °C·d</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Cumulative GDD</span>
                <span className="font-mono text-foreground">{dayResult.cumulative_gdd.toFixed(0)} °C·d</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>fTemp</span>
                <span className="font-mono text-foreground">{dayResult.f_temp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Soil Water (PAW)</span>
                <span className="font-mono text-foreground">{dayResult.paw_mm.toFixed(1)} mm ({dayResult.paw_pct.toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>ETp / ETa</span>
                <span className="font-mono text-foreground">{dayResult.etp.toFixed(1)} / {dayResult.eta.toFixed(1)} mm</span>
              </div>
              {simulationData?.yield_estimate_t_ha != null && growthStage === "Harvest Ready" && (
                <div className="flex justify-between font-semibold text-green-600">
                  <span>Estimated Yield</span>
                  <span>{simulationData.yield_estimate_t_ha.toFixed(2)} t/ha</span>
                </div>
              )}
            </div>
          )}

          <AlertCard dayResult={dayResult} overlayAlerts={overlayAlerts} />
        </div>
      </div>

      {/* Time Controls */}
      <TimeControls
        onJump={handleJump}
        speed={speed}
        onSpeedChange={setSpeed}
      />
    </div>
  );
}
