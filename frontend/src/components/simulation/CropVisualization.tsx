import { useEffect, useState } from "react";
import { VisualEffects } from "./VisualEffects";

interface CropVisualizationProps {
  growthStage: string;
  day: number;
  activeEffect?: "water" | "fertilizer" | "pesticide" | null;
  pestLevel?: number;
}

export function CropVisualization({ growthStage, day, activeEffect = null, pestLevel = 0 }: CropVisualizationProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate plant height and characteristics based on day
  const progress = Math.min(day / 120, 1);
  const plantHeight = 40 + progress * 180; // 40-220px
  const stemWidth = 4 + progress * 8; // 4-12px
  const leafCount = Math.min(Math.floor(day / 15) + 2, 8);
  
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky via-sky/70 to-agri-green-200 rounded-2xl overflow-hidden">
      {/* Sky with sun */}
      <div className="absolute top-8 right-12 w-20 h-20 rounded-full bg-gradient-to-br from-sun to-yellow-300 shadow-[0_0_60px_20px_rgba(234,179,8,0.3)]" />
      
      {/* Clouds */}
      <div className="absolute top-12 left-16 opacity-80">
        <div className="relative">
          <div className="w-16 h-8 bg-white/90 rounded-full" />
          <div className="absolute -top-2 left-4 w-10 h-10 bg-white/90 rounded-full" />
          <div className="absolute -top-1 left-10 w-8 h-8 bg-white/90 rounded-full" />
        </div>
      </div>
      
      <div className="absolute top-20 left-48 opacity-60">
        <div className="relative scale-75">
          <div className="w-16 h-8 bg-white/90 rounded-full" />
          <div className="absolute -top-2 left-4 w-10 h-10 bg-white/90 rounded-full" />
        </div>
      </div>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-agri-brown-400 via-agri-brown-300 to-agri-brown-200">
        {/* Soil texture lines */}
        <div className="absolute top-4 left-0 right-0 h-px bg-agri-brown-500/30" />
        <div className="absolute top-8 left-0 right-0 h-px bg-agri-brown-500/20" />
      </div>

      {/* Corn Plant */}
      <div 
        className={`absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        style={{ height: plantHeight }}
      >
        {/* Main Stalk */}
        <div 
          className="relative bg-gradient-to-t from-agri-green-600 via-agri-green-500 to-agri-green-400 rounded-t-full"
          style={{ 
            width: stemWidth, 
            height: '100%',
          }}
        >
          {/* Leaves */}
          {Array.from({ length: leafCount }).map((_, i) => {
            const leafOffset = (i + 1) * (plantHeight / (leafCount + 2));
            const isLeft = i % 2 === 0;
            const leafSize = 60 + (1 - i / leafCount) * 40;
            
            return (
              <div
                key={i}
                className={`absolute ${isLeft ? '-left-1' : '-right-1'} ${isLeft ? 'animate-sway' : 'animate-sway-delayed'}`}
                style={{ 
                  bottom: leafOffset,
                  transformOrigin: isLeft ? 'left center' : 'right center',
                }}
              >
                <svg
                  width={leafSize}
                  height={leafSize * 0.4}
                  viewBox="0 0 100 40"
                  className={isLeft ? '' : 'scale-x-[-1]'}
                >
                  <path
                    d="M0,20 Q30,0 70,5 Q100,10 100,20 Q100,30 70,35 Q30,40 0,20"
                    fill="url(#leafGradient)"
                    className="drop-shadow-sm"
                  />
                  {/* Leaf vein */}
                  <path
                    d="M5,20 Q50,18 95,20"
                    stroke="hsl(122, 39%, 35%)"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.5"
                  />
                  <defs>
                    <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(122, 39%, 45%)" />
                      <stop offset="50%" stopColor="hsl(122, 39%, 55%)" />
                      <stop offset="100%" stopColor="hsl(122, 39%, 40%)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            );
          })}

          {/* Tassel (flowering stage) */}
          {growthStage === "Flowering" && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-sway">
              <div className="flex flex-col items-center">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-gradient-to-t from-agri-green-400 to-sun"
                    style={{
                      height: 12 + Math.random() * 8,
                      transform: `rotate(${(i - 2) * 15}deg)`,
                      transformOrigin: 'bottom center',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ear of corn (if past flowering) */}
          {day > 50 && (
            <div className="absolute top-1/3 -right-3">
              <div className="w-4 h-10 bg-gradient-to-b from-sun/80 to-agri-brown-200 rounded-lg transform rotate-12" />
              <div className="absolute -top-2 left-1 w-6 h-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-0.5 h-6 bg-agri-brown-200/80"
                    style={{
                      left: i * 4,
                      transform: `rotate(${(i - 1.5) * 10}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Growth Stage Label */}
      <div className="absolute bottom-36 right-8 bg-card/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-border/50">
        <p className="text-xs text-muted-foreground font-medium">Growth Stage</p>
        <p className="font-poppins font-semibold text-primary">{growthStage}</p>
      </div>

      {/* Visual Effects Layer */}
      <VisualEffects activeEffect={activeEffect} pestLevel={pestLevel} day={day} />

      {/* 3D Viewport Label */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
        <span className="text-xs font-medium text-muted-foreground">Live Visualization</span>
      </div>
    </div>
  );
}
