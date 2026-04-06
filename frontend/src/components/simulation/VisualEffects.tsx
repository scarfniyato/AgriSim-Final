import { useEffect, useState } from "react";

interface VisualEffectsProps {
  activeEffect: "water" | "fertilizer" | "pesticide" | null;
  pestLevel: number;
  day: number;
}

// Corn-specific pests that appear
const PEST_TYPES = [
  { name: "Corn Borer", emoji: "🐛" },
  { name: "Aphid", emoji: "🪲" },
  { name: "Armyworm", emoji: "🐛" },
];

export function VisualEffects({ activeEffect, pestLevel, day }: VisualEffectsProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [pests, setPests] = useState<Array<{ id: number; x: number; y: number; type: number; speed: number }>>([]);

  // Generate particles when effect is active
  useEffect(() => {
    if (activeEffect) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: 30 + Math.random() * 40, // Center area where crop is
        y: Math.random() * 60 + 20,
        delay: Math.random() * 0.5,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [activeEffect]);

  // Generate pests based on pest level - they appear after day 20
  useEffect(() => {
    if (day < 20 || pestLevel < 10) {
      setPests([]);
      return;
    }

    const pestCount = Math.floor((pestLevel / 100) * 8); // Max 8 pests
    const newPests = Array.from({ length: pestCount }, (_, i) => ({
      id: i,
      x: 35 + Math.random() * 30, // Around the crop
      y: 30 + Math.random() * 40,
      type: Math.floor(Math.random() * PEST_TYPES.length),
      speed: 2 + Math.random() * 3,
    }));
    setPests(newPests);
  }, [pestLevel, day]);

  return (
    <>
      {/* Water Effect - Blue droplets falling */}
      {activeEffect === "water" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute animate-water-drop"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
              }}
            >
              <svg width="12" height="16" viewBox="0 0 12 16">
                <path
                  d="M6 0C6 0 0 8 0 11C0 14 3 16 6 16C9 16 12 14 12 11C12 8 6 0 6 0Z"
                  fill="hsl(200, 80%, 60%)"
                  opacity="0.8"
                />
              </svg>
            </div>
          ))}
          {/* Water spray overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-rain/20 via-transparent to-transparent animate-pulse" />
        </div>
      )}

      {/* Fertilizer Effect - Green/brown particles rising */}
      {activeEffect === "fertilizer" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute animate-fertilizer-rise"
              style={{
                left: `${p.x}%`,
                bottom: "20%",
                animationDelay: `${p.delay}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: Math.random() > 0.5 ? "hsl(122, 39%, 45%)" : "hsl(25, 24%, 50%)",
                  opacity: 0.7,
                }}
              />
            </div>
          ))}
          {/* Soil glow effect */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-agri-green-500/30 to-transparent animate-pulse" />
        </div>
      )}

      {/* Pesticide Effect - Mist/spray effect */}
      {activeEffect === "pesticide" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute animate-pesticide-spray"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full bg-agri-brown-300/60 blur-sm"
              />
            </div>
          ))}
          {/* Mist overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-agri-brown-200/40 via-transparent to-transparent animate-pulse" />
        </div>
      )}

      {/* Pest Visualization */}
      {pests.map((pest) => (
        <div
          key={pest.id}
          className="absolute pointer-events-none animate-pest-fly"
          style={{
            left: `${pest.x}%`,
            top: `${pest.y}%`,
            animationDuration: `${pest.speed}s`,
          }}
        >
          <div className="relative">
            <span className="text-lg drop-shadow-md" role="img" aria-label={PEST_TYPES[pest.type].name}>
              {PEST_TYPES[pest.type].emoji}
            </span>
            {/* Damage indicator when pest level is high */}
            {pestLevel > 40 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-stress-severe rounded-full animate-pulse" />
            )}
          </div>
        </div>
      ))}

      {/* Warning overlay when pest level is critical */}
      {pestLevel > 60 && (
        <div className="absolute top-4 right-4 bg-stress-severe/90 text-white px-3 py-1.5 rounded-lg animate-pulse flex items-center gap-2 z-20">
          <span>🚨</span>
          <span className="text-xs font-semibold">Pest Infestation Critical!</span>
        </div>
      )}
    </>
  );
}
