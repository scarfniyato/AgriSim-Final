import { useState } from 'react';
import { ArrowLeft, X, Rocket, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SimulationConfig, SimulationApiData, CropId, LocationId, SeasonId, ScenarioId, CO2LevelId, FertilizerLevelId, MonthId } from '@/lib/types';
import { getCropDisplayName, getCropScientificName, getCropBaseEmoji, getLocationDisplayName, getCO2DisplayName, getMonthDisplayName, cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';

const CROPS: CropId[] = ['sweet_corn', 'carrot', 'tomato'];
const LOCATIONS: LocationId[] = ['baguio_benguet', 'malaybalay_bukidnon', 'tuguegarao_cagayan'];
const SCENARIOS: { id: ScenarioId; name: string; description: string }[] = [
  { id: 'baseline', name: 'Recommended Practices (Baseline)', description: 'Standard agricultural practices with optimal management' },
  { id: 'drought', name: 'Drought Stress Scenario', description: 'Simulates extended dry periods and water scarcity' },
  { id: 'heat', name: 'Heat Stress Scenario', description: 'Higher than normal temperatures affecting growth' },
  { id: 'nutrient', name: 'Nutrient Limitation Scenario', description: 'Limited fertilizer availability and soil nutrients' },
];
const FERTILIZER_LEVELS: { id: FertilizerLevelId; name: string; description: string }[] = [
  { id: 'none', name: 'No Fertilizer', description: 'No fertilizer applied - relies on natural soil nutrients only' },
  { id: 'low', name: 'Low (50%)', description: 'Half of the recommended fertilizer rate - budget-friendly option' },
  { id: 'recommended', name: 'Recommended (100%)', description: 'Standard recommended fertilizer rate for optimal growth' },
  { id: 'high', name: 'High (150%)', description: 'Above recommended rate - may boost yield but increases cost' },
];
const CO2_LEVELS: { id: CO2LevelId; name: string; description: string }[] = [
  { id: 'low', name: 'Low CO₂ (350 ppm)', description: 'Pre-industrial / baseline scenario' },
  { id: 'medium', name: 'Medium CO₂ (500 ppm)', description: 'Future elevated CO₂ scenario' },
  { id: 'high', name: 'High CO₂ (700 ppm)', description: 'Extreme CO₂ scenario (near saturation)' },
];

const WET_SEASON_MONTHS: MonthId[] = ['june', 'july', 'august', 'september', 'october', 'november'];
const DRY_SEASON_MONTHS: MonthId[] = ['december', 'january', 'february', 'march', 'april', 'may'];

export default function ScenarioSetup() {
  const navigate = useNavigate();
  const [selectedCrop, setSelectedCrop] = useState<CropId>('sweet_corn');
  const [selectedLocation, setSelectedLocation] = useState<LocationId>('baguio_benguet');
  const [selectedSeason, setSelectedSeason] = useState<SeasonId>('wet_season');
  const [selectedMonth, setSelectedMonth] = useState<MonthId>('june');
  const [initialMoisture, setInitialMoisture] = useState(50);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('baseline');
  const [selectedCO2, setSelectedCO2] = useState<CO2LevelId>('medium');
  const [selectedFertilizer, setSelectedFertilizer] = useState<FertilizerLevelId>('recommended');
  
  // Handles "Start Simulation": builds config, calls backend simulation API, then routes to SimulationScreen.
  const handleStart = async () => {
    // 1) Build UI config as before (still used by the simulation screen).
    const config: SimulationConfig = {
      crop: selectedCrop,
      location: selectedLocation,
      season: selectedSeason,
      planting_month: selectedMonth,
      soil_type: 'clay_loam',
      initial_moisture: initialMoisture / 100,
      scenario: selectedScenario,
      co2_level: selectedCO2,
      fertilizer_level: selectedFertilizer,
      start_date: new Date().toISOString().split('T')[0],
    };

    try {
      // 2) Call backend simulate API using the full config expected by routes.py.
      const response = await fetch(apiUrl('/simulate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        let backendMessage = 'Failed to run simulation';
        try {
          const errorPayload = await response.json();
          if (typeof errorPayload?.error === 'string') {
            backendMessage = errorPayload.error;
          }
        } catch {
          // Keep default message if response is not JSON.
        }
        throw new Error(backendMessage);
      }

      const simulationData = (await response.json()) as SimulationApiData;
      // 3) Pass both config + backend result to the next screen.
      toast.success('Simulation data loaded from backend');
      navigate('/simulation', { state: { config, simulationData } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Could not fetch simulation data from backend', {
        description: message,
      });
      console.error(error);
    }
  };

  // Returns user to main menu screen.
  const handleBack = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-heading font-semibold text-xl text-foreground">
            AgriSim - New Simulation Setup
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Crop Selection */}
        <div className="card-agri animate-fade-in">
          <h2 className="card-agri-header">
            {/*<span>🌱</span>*/} Crop Selection
          </h2>
          <hr className="border-border mb-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CROPS.map((cropId) => (
              <button
                key={cropId}
                onClick={() => setSelectedCrop(cropId)}
                className={cn(
                  "relative p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                  selectedCrop === cropId
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-muted-foreground"
                )}
              >
                {selectedCrop === cropId && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className="text-center space-y-2">
                  <span className="text-5xl block">{getCropBaseEmoji(cropId)}</span>
                  <p className="font-heading font-semibold text-foreground">{getCropDisplayName(cropId)}</p>
                  <p className="text-sm text-muted-foreground italic">{getCropScientificName(cropId)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Location & Climate */}
        <div className="card-agri animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="card-agri-header">
            {/*<span>🌍</span>*/} Location & Climate
          </h2>
          <hr className="border-border mb-4" />
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Weather Station</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value as LocationId)}
                className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{getLocationDisplayName(loc)}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Growing Season</label>
              <select
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(e.target.value as SeasonId);
                  // Reset month to first month of selected season
                  if (e.target.value === 'wet_season') {
                    setSelectedMonth('june');
                  } else {
                    setSelectedMonth('december');
                  }
                }}
                className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="wet_season">Wet Season (June - November)</option>
                <option value="dry_season">Dry Season (December - May)</option>
              </select>
            </div>

            {/* Planting Month - shown for both columns */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Planting Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as MonthId)}
                className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                {selectedSeason === 'wet_season' 
                  ? WET_SEASON_MONTHS.map((month) => (
                      <option key={month} value={month}>{getMonthDisplayName(month)}</option>
                    ))
                  : DRY_SEASON_MONTHS.map((month) => (
                      <option key={month} value={month}>{getMonthDisplayName(month)}</option>
                    ))
                }
              </select>
            </div>
          </div>
        </div>
        
        {/* Soil Conditions */}
        <div className="card-agri animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="card-agri-header">
            {/*<span>🏜️</span>*/} Soil Conditions
          </h2>
          <hr className="border-border mb-4" />

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Initial Soil Moisture</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 25, label: 'Dry Soil', description: 'Low starting water' },
                { value: 50, label: 'Moderate Soil', description: 'Average starting water' },
                { value: 85, label: 'Wet Soil', description: 'High starting water' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setInitialMoisture(option.value)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md text-center",
                    initialMoisture === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-muted-foreground"
                  )}
                >
                  {initialMoisture === option.value && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="text-2xl font-heading font-bold text-primary">
                    {option.value}%
                  </div>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fertilizer Level */}
        <div className="card-agri animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <h2 className="card-agri-header">
            Fertilizer Level
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set the fertilizer application rate for the entire growing season
          </p>
          <hr className="border-border mb-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FERTILIZER_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedFertilizer(level.id)}
                className={cn(
                  "relative text-left p-4 rounded-lg border-2 transition-all duration-200",
                  selectedFertilizer === level.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-muted-foreground"
                )}
              >
                {selectedFertilizer === level.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <p className="font-semibold text-foreground text-sm">{level.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Management Scenario */}
          <div className="card-agri animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="card-agri-header">
              {/*<span>⚙️</span>*/} Management Scenario
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select predefined conditions to explore different agricultural challenges
            </p>
            <hr className="border-border mb-4" />
            
            <div className="space-y-3">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
                    selectedScenario === scenario.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-muted-foreground"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                      selectedScenario === scenario.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {selectedScenario === scenario.id && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{scenario.name}</p>
                      <p className="text-sm text-muted-foreground">{scenario.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CO2 Levels */}
          <div className="card-agri animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <h2 className="card-agri-header">
              {/*<span>☁️</span>*/} Atmospheric CO2 Level
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Adjust CO2 concentrations to simulate different atmospheric conditions
            </p>
            <hr className="border-border mb-4" />
            
            <div className="space-y-3">
              {CO2_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedCO2(level.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
                    selectedCO2 === level.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-muted-foreground"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                      selectedCO2 === level.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {selectedCO2 === level.id && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{level.name}</p>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Start Button */}
        <div className="flex justify-center py-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={handleStart}
            className="group px-12 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-heading font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
          >
            {/* <Rocket className="w-6 h-6" />*/}
            Start Simulation
          </button>
        </div>
      </main>
    </div>
  );
}
