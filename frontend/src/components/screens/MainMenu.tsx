import { PlayCircle, FolderOpen, Info, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function MainMenu() {
  const navigate = useNavigate();

  const handleStartSimulation = () => {
    navigate("/scenario-setup");
  };

  const handleLoad = () => {
    toast.info("Load Simulation - Not implemented yet");
  };

  const handleAbout = () => {
    toast.info("About - Not implemented yet");
  };

  const handleExit = () => {
    toast.info("Exit - Not implemented yet");
  };

  return (
    <div className="min-h-screen bg-background from-green-50 to-amber-50 flex flex-col items-center justify-center p-4">
      {/* Logo/Icon 
      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mb-6 shadow-lg">
        <span className="text-4xl">🌱</span>
      </div>*/}

      {/* Title Section */}
      <div className="text-center mb-8">
        <h1 className="text-8xl font-bold text-green-800 font-heading mb-10">
          AgriSim
        </h1>
        <p className="text-lg text-gray-600">
          A Hybrid Crop Growth Simulation Framework
        </p>
        <p className="text-lg text-gray-600">
          calibrated for Philippine crops and climate conditions
        </p>
        {/* <p className="text-sm text-gray-500 italic mt-2">
          Explore crop-environment interactions through simulation...
        </p>*/}
      </div>

      {/* Growing Season Selector 
      <div className="mb-8 w-full max-w-xs">
        <p className="text-center text-sm text-gray-600 mb-2 font-medium">Growing Season</p>
        <div className="border-2 border-green-400 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2">
            <div className="bg-green-100 p-3 text-center border-r border-green-400">
              <p className="font-semibold text-green-800">Wet Season</p>
              <p className="text-xs text-gray-600">May - October</p>
            </div>
            <div className="bg-amber-50 p-3 text-center">
              <p className="font-semibold text-amber-800">Dry Season</p>
              <p className="text-xs text-gray-600">November - April</p>
            </div>
          </div>
        </div>
      </div>*/}

      {/* Menu Buttons */}
      <div className="w-full max-w-xs flex flex-col gap-4">
        {/* Primary Button - Start New Simulation */}
        <button
          onClick={handleStartSimulation}
          className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-heading font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex justify-center gap-3"
        >
          {/*<PlayCircle className="w-5 h-5" />*/}
          Start Simulation
        </button>

        {/* Secondary Button - Load Simulation
        <button
          onClick={handleLoad}
          className="w-full py-4 px-6 bg-white text-green-600 font-semibold text-lg rounded-lg border-2 border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
        >
          <FolderOpen className="w-5 h-5" />
          Load Simulation
        </button>*/}

        {/* Secondary Button - About 
        <button
          onClick={handleAbout}
          className="w-full py-4 px-6 bg-white text-green-600 font-semibold text-lg rounded-lg border-2 border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
        >
          <Info className="w-5 h-5" />
          About
        </button>*/}

        {/* Secondary Button - Exit 
        <button
          onClick={handleExit}
          className="w-full py-4 px-6 bg-white text-green-600 font-semibold text-lg rounded-lg border-2 border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Exit
        </button>*/}
      </div>

      {/* Footer */}
      <p className="text-sm text-gray-400 mt-8 text-center">
        Version 1.0 Beta • AgriSim • Thesis Project 2025-2026
      </p>
    </div>
  );
}
