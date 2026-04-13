import { useEffect, useState } from "react";
import { VisualEffects } from "./VisualEffects";

interface CropVisualizationProps {
  growthStage: string;
  day: number;
  activeEffect?: "water" | "fertilizer" | "pesticide" | null;
  pestLevel?: number;
  crop?: string;
}

function SweetCornPlant({ progress, day, growthStage, leafCount, mounted }: { progress: number; day: number; growthStage: string; leafCount: number; mounted: boolean }) {
  const plantHeight = 40 + progress * 180;
  const stemWidth = 4 + progress * 8;

  return (
    <div
      className={`absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ height: plantHeight }}
    >
      <div
        className="relative bg-gradient-to-t from-agri-green-600 via-agri-green-500 to-agri-green-400 rounded-t-full"
        style={{ width: stemWidth, height: '100%' }}
      >
        {Array.from({ length: leafCount }).map((_, i) => {
          const leafOffset = (i + 1) * (plantHeight / (leafCount + 2));
          const isLeft = i % 2 === 0;
          const leafSize = 60 + (1 - i / leafCount) * 40;
          return (
            <div
              key={i}
              className={`absolute ${isLeft ? '-left-1' : '-right-1'} ${isLeft ? 'animate-sway' : 'animate-sway-delayed'}`}
              style={{ bottom: leafOffset, transformOrigin: isLeft ? 'left center' : 'right center' }}
            >
              <svg width={leafSize} height={leafSize * 0.4} viewBox="0 0 100 40" className={isLeft ? '' : 'scale-x-[-1]'}>
                <path d="M0,20 Q30,0 70,5 Q100,10 100,20 Q100,30 70,35 Q30,40 0,20" fill="url(#leafGradient)" />
                <path d="M5,20 Q50,18 95,20" stroke="hsl(122, 39%, 35%)" strokeWidth="1" fill="none" opacity="0.5" />
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

        {growthStage === "Flowering" && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-sway">
            <div className="flex flex-col items-center">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-gradient-to-t from-agri-green-400 to-sun"
                  style={{ height: 12 + Math.random() * 8, transform: `rotate(${(i - 2) * 15}deg)`, transformOrigin: 'bottom center' }}
                />
              ))}
            </div>
          </div>
        )}

        {day > 50 && (
          <div className="absolute top-1/3 -right-3">
            <div className="w-4 h-10 bg-gradient-to-b from-sun/80 to-agri-brown-200 rounded-lg transform rotate-12" />
            <div className="absolute -top-2 left-1 w-6 h-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="absolute w-0.5 h-6 bg-agri-brown-200/80" style={{ left: i * 4, transform: `rotate(${(i - 1.5) * 10}deg)` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CarrotPlant({ progress, day, mounted }: { progress: number; day: number; mounted: boolean }) {
  const plantHeight = 30 + progress * 100;
  const leafCount = Math.min(Math.floor(day / 12) + 3, 10);
  const carrotSize = progress * 60;

  return (
    <div
      className={`absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ height: plantHeight + carrotSize }}
    >
      {/* Feathery top leaves */}
      <div className="relative flex flex-col items-center" style={{ height: plantHeight }}>
        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = (i - leafCount / 2) * 18;
          const leafH = 30 + (1 - Math.abs(i - leafCount / 2) / (leafCount / 2)) * 40;
          return (
            <div
              key={i}
              className="absolute bottom-0 animate-sway"
              style={{ transform: `rotate(${angle}deg)`, transformOrigin: 'bottom center' }}
            >
              <svg width="12" height={leafH} viewBox="0 0 12 80">
                <path d="M6,80 Q2,50 4,20 Q5,5 6,0 Q7,5 8,20 Q10,50 6,80" fill="hsl(122, 50%, 45%)" />
                <path d="M6,75 Q5,40 6,5" stroke="hsl(122, 39%, 35%)" strokeWidth="0.8" fill="none" opacity="0.5" />
              </svg>
            </div>
          );
        })}
      </div>

      {/* Carrot root (underground, shown growing) */}
      {day > 15 && (
        <div className="relative flex justify-center">
          <svg width={20 + carrotSize * 0.3} height={carrotSize} viewBox="0 0 40 80">
            <defs>
              <linearGradient id="carrotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(25, 90%, 55%)" />
                <stop offset="60%" stopColor="hsl(25, 85%, 50%)" />
                <stop offset="100%" stopColor="hsl(25, 80%, 40%)" />
              </linearGradient>
            </defs>
            <path d="M12,0 Q8,0 6,5 Q2,25 4,50 Q8,78 20,80 Q32,78 36,50 Q38,25 34,5 Q32,0 28,0 Z" fill="url(#carrotGrad)" />
            {/* Horizontal lines for texture */}
            {[15, 30, 45, 60].map((y, i) => (
              <path key={i} d={`M${8 + i},${y} Q20,${y + 2} ${32 - i},${y}`} stroke="hsl(25, 70%, 40%)" strokeWidth="0.5" fill="none" opacity="0.4" />
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

function TomatoPlant({ progress, day, growthStage, mounted }: { progress: number; day: number; growthStage: string; mounted: boolean }) {
  const plantHeight = 35 + progress * 140;
  const stemWidth = 3 + progress * 5;
  const branchCount = Math.min(Math.floor(day / 18) + 2, 7);
  const showFruit = day > 55;
  const fruitRipeness = Math.min((day - 55) / 50, 1);

  return (
    <div
      className={`absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ height: plantHeight }}
    >
      {/* Main stem */}
      <div
        className="relative bg-gradient-to-t from-agri-green-600 to-agri-green-400 rounded-t-full"
        style={{ width: stemWidth, height: '100%' }}
      >
        {/* Branches with compound leaves */}
        {Array.from({ length: branchCount }).map((_, i) => {
          const branchOffset = (i + 1) * (plantHeight / (branchCount + 2));
          const isLeft = i % 2 === 0;
          const branchLen = 35 + (1 - i / branchCount) * 25;
          return (
            <div
              key={i}
              className={`absolute ${isLeft ? '-left-1' : '-right-1'} ${isLeft ? 'animate-sway' : 'animate-sway-delayed'}`}
              style={{ bottom: branchOffset, transformOrigin: isLeft ? 'left center' : 'right center' }}
            >
              <svg width={branchLen} height={branchLen * 0.7} viewBox="0 0 70 50" className={isLeft ? '' : 'scale-x-[-1]'}>
                {/* Branch stem */}
                <path d="M0,25 Q35,22 65,20" stroke="hsl(122, 35%, 40%)" strokeWidth="2" fill="none" />
                {/* Compound leaves */}
                <ellipse cx="25" cy="18" rx="10" ry="7" fill="hsl(122, 45%, 48%)" />
                <ellipse cx="40" cy="15" rx="9" ry="6" fill="hsl(122, 45%, 50%)" />
                <ellipse cx="55" cy="18" rx="8" ry="5" fill="hsl(122, 45%, 45%)" />
                <ellipse cx="30" cy="32" rx="9" ry="6" fill="hsl(122, 45%, 46%)" />
                <ellipse cx="48" cy="30" rx="8" ry="5" fill="hsl(122, 45%, 44%)" />
              </svg>

              {/* Tomato fruits on some branches */}
              {showFruit && i % 2 === 0 && i < 5 && (
                <div className="absolute" style={{ left: isLeft ? branchLen * 0.6 : -branchLen * 0.2, top: -5 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <circle cx="12" cy="13" r="9" fill={`hsl(${fruitRipeness > 0.5 ? 0 : 60}, ${70 + fruitRipeness * 20}%, ${55 - fruitRipeness * 15}%)`} />
                    <path d="M10,5 Q12,2 14,5" stroke="hsl(122, 40%, 35%)" strokeWidth="1.5" fill="none" />
                    <ellipse cx="12" cy="4" rx="3" ry="2" fill="hsl(122, 45%, 40%)" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {/* Flowers during flowering stage */}
        {growthStage === "Flowering" && (
          <>
            {[0.3, 0.5, 0.7].map((pos, i) => (
              <div key={i} className="absolute animate-sway" style={{ bottom: plantHeight * pos, left: i % 2 === 0 ? -20 : stemWidth + 5 }}>
                <svg width="18" height="18" viewBox="0 0 20 20">
                  {[0, 72, 144, 216, 288].map((angle, j) => (
                    <ellipse key={j} cx="10" cy="4" rx="3" ry="4" fill="hsl(50, 90%, 65%)" transform={`rotate(${angle}, 10, 10)`} />
                  ))}
                  <circle cx="10" cy="10" r="3" fill="hsl(45, 80%, 55%)" />
                </svg>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function CropVisualization({ growthStage, day, activeEffect = null, pestLevel = 0, crop = "sweet_corn" }: CropVisualizationProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const progress = Math.min(day / 120, 1);
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
        <div className="absolute top-4 left-0 right-0 h-px bg-agri-brown-500/30" />
        <div className="absolute top-8 left-0 right-0 h-px bg-agri-brown-500/20" />
      </div>

      {/* Crop-specific plant */}
      {crop === "sweet_corn" && (
        <SweetCornPlant progress={progress} day={day} growthStage={growthStage} leafCount={leafCount} mounted={mounted} />
      )}
      {crop === "carrot" && (
        <CarrotPlant progress={progress} day={day} mounted={mounted} />
      )}
      {crop === "tomato" && (
        <TomatoPlant progress={progress} day={day} growthStage={growthStage} mounted={mounted} />
      )}

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
