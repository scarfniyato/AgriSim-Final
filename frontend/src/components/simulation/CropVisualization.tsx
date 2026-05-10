import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { VisualEffects } from "./VisualEffects";

interface CropVisualizationProps {
  growthStage: string;
  day: number;
  activeEffect?: "water" | "fertilizer" | "pesticide" | null;
  pestLevel?: number;
  crop?: string;
  rainfall?: number;
  speed?: string;
  isRunning?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// ─────────────────────────────────────────────────────────────────────────────
// Day / time-of-day cycle
// ─────────────────────────────────────────────────────────────────────────────
// 3 phases per day: morning → afternoon → night
// Cycle duration matches one day's real-time: 1000ms / parseFloat(speed)
// Pauses when isRunning is false.
type ToD = "morning" | "afternoon" | "night";

function useTimeOfDay(speed: string, isRunning: boolean): ToD {
  const [ms, setMs] = useState(0);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = Date.now();
      return;
    }
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setMs((prev) => prev + delta);
    }, 50);
    return () => clearInterval(id);
  }, [isRunning, speed]);

  // Reset phase timer when speed changes
  useEffect(() => {
    setMs(0);
    lastTickRef.current = Date.now();
  }, [speed]);

  const dayDurationMs = 1000 / parseFloat(speed);
  const phaseDuration = dayDurationMs / 3;
  const phases: ToD[] = ["morning", "afternoon", "night"];
  const phaseIndex = Math.floor(ms / phaseDuration) % 3;
  return phases[phaseIndex];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeded random
// ─────────────────────────────────────────────────────────────────────────────
function makeRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fluffy Cloud SVG Component
// ─────────────────────────────────────────────────────────────────────────────
interface FluffyCloudProps {
  x: string; // left position, e.g. "10%"
  y: string; // top position, e.g. "5%"
  scale?: number; // size multiplier
  opacity?: number;
  isRain?: boolean;
  isDark?: boolean;
  flip?: boolean; // mirror horizontally for variety
}

function FluffyCloud({
  x,
  y,
  scale = 1,
  opacity = 1,
  isRain = false,
  isDark = false,
  flip = false,
}: FluffyCloudProps) {
  // Color palette depending on context
  const shadow = isRain ? "#6b7280" : isDark ? "#334155" : "#bfdbfe";
  const base = isRain ? "#9ca3af" : isDark ? "#475569" : "#dbeafe";
  const mid = isRain ? "#d1d5db" : isDark ? "#64748b" : "#eff6ff";
  const bright = isRain ? "#e5e7eb" : isDark ? "#94a3b8" : "#ffffff";
  const edge = isRain ? "#6b7280" : isDark ? "#1e293b" : "#bfdbfe";

  const w = 200 * scale;
  const h = 100 * scale;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        pointerEvents: "none",
        transform: flip ? "scaleX(-1)" : undefined,
        zIndex: 2,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        {/* Bottom shadow base — gives the cloud weight */}
        <ellipse
          cx="100"
          cy="82"
          rx="88"
          ry="14"
          fill={shadow}
          opacity="0.45"
        />

        {/* Main body */}
        <ellipse cx="100" cy="72" rx="88" ry="26" fill={base} />

        {/* Left puff cluster */}
        <ellipse cx="42" cy="58" rx="38" ry="32" fill={mid} />
        <ellipse cx="28" cy="52" rx="22" ry="20" fill={mid} />

        {/* Center-left puff */}
        <ellipse cx="78" cy="48" rx="42" ry="36" fill={mid} />

        {/* Center puff — tallest */}
        <ellipse cx="108" cy="38" rx="46" ry="42" fill={mid} />

        {/* Right puff */}
        <ellipse cx="148" cy="50" rx="38" ry="32" fill={mid} />
        <ellipse cx="166" cy="56" rx="24" ry="22" fill={base} />

        {/* Bright highlight tops */}
        <ellipse cx="82" cy="30" rx="28" ry="22" fill={bright} />
        <ellipse cx="112" cy="20" rx="30" ry="24" fill={bright} />
        <ellipse cx="138" cy="34" rx="22" ry="18" fill={mid} />
        <ellipse cx="52" cy="40" rx="18" ry="16" fill={bright} />

        {/* Specular top shine */}
        <ellipse cx="102" cy="14" rx="16" ry="10" fill={bright} opacity="0.7" />

        {/* Bottom flat base to cover ragged edges */}
        <rect x="12" y="78" width="176" height="18" rx="9" fill={base} />

        {/* Subtle edge stroke for definition */}
        <ellipse
          cx="100"
          cy="60"
          rx="87"
          ry="38"
          fill="none"
          stroke={edge}
          strokeWidth="0.8"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cloud layer — 6 clouds, evenly spread across the sky
// ─────────────────────────────────────────────────────────────────────────────
interface CloudLayerProps {
  isDark: boolean;
  isRain: boolean;
}

function CloudLayer({ isDark, isRain }: CloudLayerProps) {
  // 6 clouds at varied heights & sizes, spread evenly left→right
  const clouds: FluffyCloudProps[] = [
    { x: "-3%", y: "3%", scale: 0.72, opacity: 0.88, flip: false },
    { x: "18%", y: "10%", scale: 0.58, opacity: 0.8, flip: true },
    { x: "36%", y: "2%", scale: 0.8, opacity: 0.85, flip: false },
    { x: "54%", y: "12%", scale: 0.62, opacity: 0.78, flip: true },
    { x: "70%", y: "1%", scale: 0.75, opacity: 0.86, flip: false },
    { x: "85%", y: "8%", scale: 0.65, opacity: 0.82, flip: true },
  ];

  return (
    <>
      {clouds.map((c, i) => (
        <FluffyCloud
          key={i}
          x={c.x}
          y={c.y}
          scale={c.scale}
          opacity={isDark ? (c.opacity ?? 1) * 0.25 : c.opacity}
          isRain={isRain}
          isDark={isDark}
          flip={c.flip}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rain — canvas-based, physically correct streaks
// ─────────────────────────────────────────────────────────────────────────────
interface Drop {
  x: number;
  y: number;
  vy: number;
  len: number;
  alpha: number;
  w: number;
}

function RainCanvas({
  active,
  intensity,
}: {
  active: boolean;
  intensity: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dRef = useRef<Drop[]>([]);
  const raf = useRef(0);
  const cnt = Math.min(
    Math.round(lerp(60, 220, Math.min(intensity / 25, 1))),
    220,
  );

  const spawn = useCallback(
    (w: number, h: number): Drop => ({
      x: Math.random() * (w + 80) - 40,
      y: Math.random() * h,
      vy: lerp(9, 20, Math.random()),
      len: lerp(10, 26, Math.random()),
      alpha: lerp(0.18, 0.52, Math.random()),
      w: lerp(0.55, 1.3, Math.random()),
    }),
    [],
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animating = true;

    const resize = () => {
      canvas.width = canvas.offsetWidth || canvas.clientWidth || 400;
      canvas.height = canvas.offsetHeight || canvas.clientHeight || 300;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (!active) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dRef.current = [];
      return () => {
        animating = false;
        ro.disconnect();
      };
    }

    const W = () => canvas.width,
      H = () => canvas.height;
    dRef.current = Array.from({ length: cnt }, () => spawn(W(), H()));

    const frame = () => {
      if (!animating) return;
      const w = W(),
        h = H();
      ctx.clearRect(0, 0, w, h);

      dRef.current.forEach((d) => {
        d.y += d.vy;
        d.x -= d.vy * 0.18;
        if (d.y - d.len > h || d.x < -30) {
          Object.assign(d, spawn(w, h));
          d.y = -d.len;
          d.x = Math.random() * (w + 60);
        }
        ctx.save();
        ctx.globalAlpha = d.alpha;
        ctx.strokeStyle = "rgba(190,218,255,1)";
        ctx.lineWidth = d.w;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vy * 0.18, d.y - d.len);
        ctx.stroke();
        ctx.restore();
      });

      const g = ctx.createLinearGradient(0, h * 0.78, 0, h);
      g.addColorStop(0, "rgba(100,145,210,0)");
      g.addColorStop(0.5, "rgba(100,145,210,0.07)");
      g.addColorStop(1, "rgba(100,145,210,0.14)");
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.78, w, h * 0.22);

      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);

    return () => {
      animating = false;
      cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
  }, [active, cnt, spawn]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 12 }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SWEET CORN
// ─────────────────────────────────────────────────────────────────────────────
function SweetCornPlant({
  day,
  growthStage,
  mounted,
}: {
  day: number;
  growthStage: string;
  mounted: boolean;
}) {
  const progress = Math.min(day / 120, 1);
  const senescence = Math.max(0, (day - 90) / 40);

  const svgW = 160;
  const plantH = lerp(18, 300, Math.min(progress * 1.18, 1));
  const svgH = plantH + 55;
  const cx = svgW / 2;
  const stemBot = svgH - 14;
  const stemTop = stemBot - plantH;
  const sw = lerp(3.5, 15.5, Math.min(progress * 1.1, 1));

  const isSeedling =
    day < 14 ||
    ["Seedling", "Emergence", "Pre-Emergence"].includes(growthStage);
  const showBrace = progress > 0.35;
  const showTassel =
    day > 58 ||
    ["Flowering", "Grain Filling", "Maturity", "Harvest Ready"].includes(
      growthStage,
    );
  const stage = (growthStage || "").toLowerCase();
  const showEar = stage === "reproductive" || stage === "maturity";
  const tasselMature = day > 72;
  const leafCount = Math.min(Math.floor(day / 9) + 2, 11);

  const sc1 = `hsl(${lerp(118, 60, senescence)},42%,28%)`;
  const sc2 = `hsl(${lerp(122, 62, senescence)},48%,36%)`;
  const lg1 = `hsl(${lerp(120, 58, senescence)},52%,42%)`;
  const lg2 = `hsl(${lerp(124, 56, senescence)},48%,38%)`;
  const lg3 = `hsl(${lerp(116, 50, senescence)},44%,26%)`;
  const cobHue = 48;

  const commonStyle = {
    position: "absolute" as const,
    bottom: 92,
    left: "50%",
    transform: "translateX(-50%)",
    overflow: "visible" as const,
    zIndex: 7,
  };

  if (isSeedling) {
    const lvs = Math.max(1, Math.floor(day / 3));
    return (
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className={`absolute transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
        style={commonStyle}
      >
        <defs>
          <linearGradient id="shoot-g" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#5D9E3A" />
            <stop offset="50%" stopColor="#7DC45A" />
            <stop offset="100%" stopColor="#4E8A2E" />
          </linearGradient>
        </defs>
        <rect
          x={cx - 2}
          y={stemTop}
          width={4}
          height={plantH}
          rx={2}
          fill="url(#shoot-g)"
        />
        {Array.from({ length: lvs }).map((_, i) => {
          const side = i % 2 === 0 ? -1 : 1,
            frac = 0.25 + i * 0.22;
          const aY = stemBot - plantH * Math.min(frac, 0.9),
            lLen = 16 + i * 11;
          const angle = side * (35 - i * 6),
            rad = (angle * Math.PI) / 180;
          const ex = Math.sin(rad) * lLen,
            ey = -Math.cos(rad) * lLen;
          const c1x = ex * 0.35,
            c1y = ey * 0.3,
            c2x = ex * 0.7,
            c2y = ey * 0.65;
          return (
            <g key={i} transform={`translate(${cx},${aY})`}>
              <path
                d={`M0,0 C${c1x},${c1y - 4} ${c2x},${c2y} ${ex},${ey} C${c2x * 0.98},${c2y + 4} ${c1x},${c1y + 4} 0,2`}
                fill={i % 2 === 0 ? "#6BBF45" : "#5AAE38"}
              />
              <path
                d={`M0,0 C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`}
                stroke="#3A7A22"
                strokeWidth="0.6"
                fill="none"
                opacity="0.5"
              />
            </g>
          );
        })}
        <ellipse
          cx={cx}
          cy={stemBot}
          rx={5}
          ry={2.5}
          fill="#8B6914"
          opacity="0.6"
        />
      </svg>
    );
  }

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className={`absolute transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      style={commonStyle}
    >
      <defs>
        <linearGradient id="stem-corn" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={sc1} />
          <stop offset="45%" stopColor={sc2} />
          <stop offset="100%" stopColor={sc1} />
        </linearGradient>
        <linearGradient id="leaf-c1" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={lg3} />
          <stop offset="50%" stopColor={lg1} />
          <stop offset="100%" stopColor={lg3} />
        </linearGradient>
        <linearGradient id="leaf-c2" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={lg3} />
          <stop offset="55%" stopColor={lg2} />
          <stop offset="100%" stopColor={lg3} />
        </linearGradient>
        <linearGradient id="cob-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${cobHue + 10},88%,72%)`} />
          <stop offset="60%" stopColor={`hsl(${cobHue},84%,54%)`} />
          <stop offset="100%" stopColor={`hsl(${cobHue - 6},78%,42%)`} />
        </linearGradient>
      </defs>

      {showBrace &&
        ([-1, 1, -0.55, 0.55] as number[]).map((side, i) => {
          const rLen = 12 + i * 3,
            ang = (90 + side * (38 + i * 8)) * (Math.PI / 180);
          const ex = cx + Math.cos(ang) * rLen,
            ey = stemBot - 8 + Math.sin(ang) * rLen * 0.55;
          return (
            <path
              key={i}
              d={`M${cx + side * (sw / 2 - 1)},${stemBot - 8} Q${(cx + side * (sw / 2 - 1) + ex) / 2},${ey - 4} ${ex},${stemBot + 2}`}
              stroke={`hsl(${lerp(95, 50, senescence)},38%,28%)`}
              strokeWidth={1.3 - i * 0.15}
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
          );
        })}

      <rect
        x={cx - sw / 2}
        y={stemTop}
        width={sw}
        height={plantH}
        rx={sw * 0.4}
        fill="url(#stem-corn)"
      />

      {Array.from({ length: Math.min(leafCount, 10) }).map((_, i) => {
        const frac = 0.06 + (i / Math.max(leafCount - 1, 1)) * 0.84;
        const ny = stemBot - plantH * frac;
        return (
          <rect
            key={i}
            x={cx - sw / 2 - 1}
            y={ny - 1}
            width={sw + 2}
            height={2.5}
            rx={1.2}
            fill={sc1}
            opacity="0.45"
          />
        );
      })}

      {Array.from({ length: leafCount }).map((_, i) => {
        const frac = 0.06 + (i / Math.max(leafCount - 1, 1)) * 0.86;
        const aY = stemBot - plantH * frac;
        const side = i % 2 === 0 ? -1 : 1,
          np = i / Math.max(leafCount - 1, 1);
        const lLen = lerp(105, 50, np) * (0.88 + progress * 0.12);
        const lW = lerp(13, 5, np),
          droop = lerp(52, 16, np);
        const rad = (droop * Math.PI) / 180;
        const tx = side * Math.cos(rad) * lLen,
          ty = Math.sin(rad) * lLen * 0.56;
        const c1x = side * lLen * 0.3,
          c1y = -lW * 0.28,
          c2x = side * lLen * 0.7,
          c2y = ty * 0.5;
        const fill = i % 2 === 0 ? "url(#leaf-c1)" : "url(#leaf-c2)";
        return (
          <g key={i} transform={`translate(${cx + side * (sw / 2)},${aY})`}>
            <path
              d={`M0,0 C${c1x},${c1y - lW * 0.45} ${c2x},${c2y - lW * 0.28} ${tx},${ty} C${c2x * 0.97},${c2y + lW * 0.28} ${c1x * 0.95},${c1y + lW * 0.45} 0,${lW * 0.12}`}
              fill={fill}
            />
            <path
              d={`M0,${lW * 0.06} C${c1x},${c1y * 0.5} ${c2x},${c2y * 0.5} ${tx},${ty}`}
              stroke={lg3}
              strokeWidth="0.85"
              fill="none"
              opacity="0.55"
            />
            {[0, 1, 2].map((v) => {
              const vt = 0.25 + v * 0.2;
              const vx = side * lLen * vt * 0.92,
                vy = ty * vt + c1y * (1 - vt) * 0.5;
              const vex = vx + side * lW * 0.85,
                vey = vy + lW * 0.22;
              return (
                <path
                  key={v}
                  d={`M${vx},${vy} Q${(vx + vex) / 2},${(vy + vey) / 2 - 0.5} ${vex},${vey}`}
                  stroke={lg3}
                  strokeWidth="0.45"
                  fill="none"
                  opacity="0.3"
                />
              );
            })}
            <path
              d={`M0,0 C${-side * 2},${lW * 0.4} ${-side * 2},${lW * 0.8} 0,${lW * 0.12}`}
              fill={lg3}
              opacity="0.7"
            />
          </g>
        );
      })}

      {showEar &&
        (() => {
          const aY = stemBot - plantH * 0.52,
            offX = sw / 2 + 1;
          const eH = 74,
            eW = 21,
            rot = 18;
          const husk1 = "#8BC34A",
            husk2 = "#689F38",
            husk3 = "#A5D66A";
          const cobPath = `M0,${eH * 0.1} C${-eW * 0.7},${eH * 0.3} ${-eW * 0.7},${eH * 0.7} 0,${eH * 0.95} C${eW * 0.7},${eH * 0.7} ${eW * 0.7},${eH * 0.3} 0,${eH * 0.1}`;
          const rows = 10,
            kernelsPerRow = 8;
          const kernelColor = "#FFD600",
            kernelEdge = "#E6A800";
          const huskLeaves = [
            <path
              key="huskL"
              d={`M${-eW * 0.3},${eH * 0.3} C${-eW * 1.2},${eH * 0.1} ${-eW * 1.1},${eH * 0.8} ${-eW * 0.2},${eH * 0.95}`}
              fill={husk1}
              opacity="0.82"
            />,
            <path
              key="huskR"
              d={`M${eW * 0.3},${eH * 0.3} C${eW * 1.2},${eH * 0.1} ${eW * 1.1},${eH * 0.8} ${eW * 0.2},${eH * 0.95}`}
              fill={husk2}
              opacity="0.82"
            />,
            <path
              key="huskC"
              d={`M0,${eH * 0.1} C${-eW * 0.2},${eH * 0.25} ${-eW * 0.18},${eH * 0.7} 0,${eH * 0.85} C${eW * 0.18},${eH * 0.7} ${eW * 0.2},${eH * 0.25} 0,${eH * 0.1}`}
              fill={husk3}
              opacity="0.92"
            />,
          ];
          const kernels = [];
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < kernelsPerRow; col++) {
              const x =
                (col - (kernelsPerRow - 1) / 2) * eW * 0.13 +
                (row % 2 ? eW * 0.065 : 0);
              const y = eH * 0.13 + row * eH * 0.075;
              kernels.push(
                <ellipse
                  key={`k${row}-${col}`}
                  cx={x}
                  cy={y}
                  rx={eW * 0.055}
                  ry={eH * 0.045}
                  fill={kernelColor}
                  stroke={kernelEdge}
                  strokeWidth={0.8}
                  opacity={0.98}
                />,
              );
            }
          }
          return (
            <g transform={`translate(${cx + offX},${aY}) rotate(${rot},0,0)`}>
              {huskLeaves[0]}
              {huskLeaves[1]}
              <path
                d={cobPath}
                fill="#FFD600"
                stroke="#E6A800"
                strokeWidth={2.2}
                opacity="0.97"
              />
              {kernels}
              {huskLeaves[2]}
              <ellipse
                cx={0}
                cy={eH * 0.13}
                rx={eW * 0.18}
                ry={eH * 0.09}
                fill="#FFF59D"
                opacity="0.7"
              />
              <ellipse
                cx={0}
                cy={eH * 0.97}
                rx={eW * 0.18}
                ry={eW * 0.13}
                fill="#E6A800"
                opacity="0.5"
              />
            </g>
          );
        })()}

      {showTassel &&
        (() => {
          const tp = Math.min((day - 58) / 20, 1);
          const tC = tasselMature ? "#C8A840" : "#7DB840",
            tD = tasselMature ? "#906E18" : "#4E8A20";
          const bCnt = 6 + Math.floor(tp * 4);
          return (
            <g transform={`translate(${cx},${stemTop})`}>
              <path
                d={`M0,0 L0,${-28 - tp * 24}`}
                stroke={tC}
                strokeWidth="2"
                strokeLinecap="round"
              />
              {Array.from({ length: 8 }).map((_, i) => {
                const y = -6 - i * (3 + tp * 3.8),
                  aLen = 3 + tp * 4.5;
                return (
                  <g key={i}>
                    <line
                      x1={-aLen}
                      y1={y}
                      x2={aLen}
                      y2={y}
                      stroke={tasselMature ? "#C8A840" : "#9AC850"}
                      strokeWidth="0.85"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                    {tasselMature && (
                      <>
                        <circle
                          cx={-aLen}
                          cy={y}
                          r={1.0}
                          fill="#E0C060"
                          opacity="0.65"
                        />
                        <circle
                          cx={aLen}
                          cy={y}
                          r={1.0}
                          fill="#E0C060"
                          opacity="0.65"
                        />
                      </>
                    )}
                  </g>
                );
              })}
              {Array.from({ length: bCnt }).map((_, i) => {
                const side = i % 2 === 0 ? -1 : 1;
                const bf =
                  0.15 +
                  (Math.floor(i / 2) / Math.max(Math.floor(bCnt / 2) - 1, 1)) *
                    0.72;
                const baseY = -(bf * (28 + tp * 24));
                const bLen = lerp(26, 12, bf) * (0.7 + tp * 0.3);
                const bex = side * bLen,
                  bey = baseY + bLen * 0.35;
                return (
                  <g key={i}>
                    <path
                      d={`M0,${baseY} C${side * bLen * 0.38},${baseY - 2.5} ${bex * 0.78},${bey * 0.75} ${bex},${bey}`}
                      stroke={tD}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {Array.from({ length: 4 }).map((_, s) => {
                      const st = 0.25 + s * 0.22;
                      const sx = side * bLen * st * 0.95,
                        sy = bey * st * 0.9 + baseY * (1 - st);
                      return (
                        <g key={s}>
                          <line
                            x1={sx - side * 2.2}
                            y1={sy}
                            x2={sx + side * 2.2}
                            y2={sy}
                            stroke={tC}
                            strokeWidth="0.75"
                            strokeLinecap="round"
                            opacity="0.72"
                          />
                          {tasselMature && (
                            <circle
                              cx={sx}
                              cy={sy}
                              r={0.85}
                              fill="#DCC050"
                              opacity="0.6"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })()}

      <ellipse
        cx={cx}
        cy={stemBot}
        rx={sw * 1.05}
        ry={sw * 0.45}
        fill={sc1}
        opacity="0.65"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Carrot
// ─────────────────────────────────────────────────────────────────────────────
function CarrotPlant({ day, mounted }: { day: number; mounted: boolean }) {
  const progress = Math.min(day / 120, 1),
    lc = Math.min(Math.floor(day / 12) + 3, 10);
  const pH = 30 + progress * 100,
    cs = progress * 60;
  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      style={{ bottom: 100, height: pH + cs, zIndex: 7 }}
    >
      <div
        className="relative flex flex-col items-center"
        style={{ height: pH }}
      >
        {Array.from({ length: lc }).map((_, i) => {
          const ang = (i - lc / 2) * 18,
            lH = 30 + (1 - Math.abs(i - lc / 2) / (lc / 2)) * 40;
          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                transform: `rotate(${ang}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <svg width="12" height={lH} viewBox="0 0 12 80">
                <path
                  d="M6,80 Q2,50 4,20 Q5,5 6,0 Q7,5 8,20 Q10,50 6,80"
                  fill="hsl(122,50%,45%)"
                />
              </svg>
            </div>
          );
        })}
      </div>
      {day > 15 && (
        <svg width={20 + cs * 0.3} height={cs} viewBox="0 0 40 80">
          <defs>
            <linearGradient id="cG" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(25,90%,55%)" />
              <stop offset="100%" stopColor="hsl(25,80%,40%)" />
            </linearGradient>
          </defs>
          <path
            d="M12,0 Q8,0 6,5 Q2,25 4,50 Q8,78 20,80 Q32,78 36,50 Q38,25 34,5 Q32,0 28,0 Z"
            fill="url(#cG)"
          />
        </svg>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tomato
// ─────────────────────────────────────────────────────────────────────────────
function TomatoPlant({
  day,
  growthStage,
  mounted,
}: {
  day: number;
  growthStage: string;
  mounted: boolean;
}) {
  const progress = Math.min(day / 120, 1),
    pH = 35 + progress * 140,
    sw = 3 + progress * 5;
  const bCnt = Math.min(Math.floor(day / 18) + 2, 7);
  const showFruit = day > 55,
    fR = Math.min((day - 55) / 50, 1);
  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      style={{ bottom: 100, height: pH, zIndex: 7 }}
    >
      <div
        className="relative rounded-t-full"
        style={{
          width: sw,
          height: "100%",
          background:
            "linear-gradient(to top,hsl(122,42%,28%),hsl(122,48%,38%))",
        }}
      >
        {Array.from({ length: bCnt }).map((_, i) => {
          const bO = (i + 1) * (pH / (bCnt + 2)),
            isL = i % 2 === 0,
            bL = 35 + (1 - i / bCnt) * 25;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                bottom: bO,
                [isL ? "left" : "right"]: -1,
                transformOrigin: isL ? "left center" : "right center",
              }}
            >
              <svg
                width={bL}
                height={bL * 0.7}
                viewBox="0 0 70 50"
                style={isL ? {} : { transform: "scaleX(-1)" }}
              >
                <path
                  d="M0,25 Q35,22 65,20"
                  stroke="hsl(122,35%,40%)"
                  strokeWidth="2"
                  fill="none"
                />
                <ellipse
                  cx="30"
                  cy="20"
                  rx="12"
                  ry="8"
                  fill="hsl(122,45%,48%)"
                />
                <ellipse
                  cx="52"
                  cy="17"
                  rx="10"
                  ry="7"
                  fill="hsl(122,45%,44%)"
                />
              </svg>
              {showFruit && i % 2 === 0 && i < 5 && (
                <div
                  className="absolute"
                  style={{ left: isL ? bL * 0.6 : -bL * 0.2, top: -5 }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle
                      cx="10"
                      cy="11"
                      r="8"
                      fill={`hsl(${fR > 0.5 ? 0 : 55},${68 + fR * 20}%,${54 - fR * 14}%)`}
                    />
                    <ellipse
                      cx="10"
                      cy="3.5"
                      rx="2.5"
                      ry="1.8"
                      fill="hsl(122,45%,38%)"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sky gradient lookup
// ─────────────────────────────────────────────────────────────────────────────
const SKY_GRADIENTS: Record<ToD, string> = {
  morning:
    "from-[hsl(199,89%,68%)] via-[hsl(199,80%,58%)] to-[hsl(122,30%,80%)]",
  afternoon:
    "from-[hsl(25,70%,55%)] via-[hsl(280,30%,50%)] to-[hsl(240,25%,40%)]",
  night: "from-[hsl(230,40%,12%)] via-[hsl(230,35%,18%)] to-[hsl(230,25%,25%)]",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export function CropVisualization({
  growthStage,
  day,
  activeEffect = null,
  pestLevel = 0,
  crop = "sweet_corn",
  rainfall = 0,
  speed = "0.5",
  isRunning = true,
}: CropVisualizationProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const animatedToD = useTimeOfDay(speed, isRunning);
  const isNight = animatedToD === "night";
  const isDark = isNight;
  const isRain = rainfall > 0;

  const stars = useMemo(() => {
    if (!isNight) return [];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 40,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 3,
    }));
  }, [isNight]);

  return (
    <div
      className={`relative w-full h-full bg-gradient-to-b ${SKY_GRADIENTS[animatedToD]} rounded-2xl overflow-hidden transition-all duration-1000`}
    >
      {/* Sun */}
      {animatedToD === "morning" && (
        <div
          className="absolute w-20 h-20 rounded-full transition-all duration-1000"
          style={{
            right: "12%",
            top: "10%",
            background:
              "radial-gradient(circle, hsl(45, 93%, 60%), hsl(45, 93%, 47%))",
            boxShadow: "0 0 60px 20px hsla(45, 93%, 47%, 0.3)",
            zIndex: 1,
          }}
        />
      )}
      {/* Setting sun for afternoon */}
      {animatedToD === "afternoon" && (
        <div
          className="absolute w-20 h-20 rounded-full transition-all duration-1000"
          style={{
            right: "75%",
            top: "30%",
            background:
              "radial-gradient(circle, hsl(30, 100%, 60%), hsl(15, 90%, 50%))",
            boxShadow: "0 0 60px 20px hsla(30, 100%, 60%, 0.4)",
            opacity: 0.85,
            zIndex: 1,
          }}
        />
      )}

      {/* Moon */}
      {isNight && (
        <div
          className="absolute top-8 right-16 w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 shadow-[0_0_30px_8px_rgba(200,200,220,0.3)]"
          style={{ zIndex: 1 }}
        >
          <div className="absolute top-2 left-3 w-3 h-3 rounded-full bg-gray-200/50" />
          <div className="absolute top-6 left-7 w-2 h-2 rounded-full bg-gray-200/40" />
        </div>
      )}

      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            opacity: 0.7,
            zIndex: 1,
          }}
        />
      ))}

      {/* ─── BEAUTIFUL FLUFFY CLOUDS ─── */}
      {!isNight && <CloudLayer isDark={isDark} isRain={isRain} />}

      {/* Night overlay */}
      {isNight && (
        <div
          className="absolute inset-0 bg-black/30 pointer-events-none"
          style={{ zIndex: 3 }}
        />
      )}

      {/* Rain canvas */}
      {isRain && (
        <RainCanvas active={isRain && isRunning} intensity={rainfall} />
      )}

      {/* Ground */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-32 transition-all duration-1000 ${
          isDark
            ? "bg-gradient-to-t from-[hsl(16,20%,20%)] via-[hsl(16,22%,25%)] to-[hsl(16,20%,30%)]"
            : "bg-gradient-to-t from-agri-brown-400 via-agri-brown-300 to-agri-brown-200"
        }`}
        style={{ zIndex: 5 }}
      >
        <div className="absolute top-4 left-0 right-0 h-px bg-agri-brown-500/30" />
        <div className="absolute top-8 left-0 right-0 h-px bg-agri-brown-500/20" />
        {rainfall > 0 && (
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/10 to-transparent" />
        )}
      </div>

      {/* Crop plants */}
      {crop === "sweet_corn" && (
        <SweetCornPlant day={day} growthStage={growthStage} mounted={mounted} />
      )}
      {crop === "carrot" && <CarrotPlant day={day} mounted={mounted} />}
      {crop === "tomato" && (
        <TomatoPlant day={day} growthStage={growthStage} mounted={mounted} />
      )}

      {/* Growth Stage Label */}
      <div
        className="absolute bottom-36 right-8 bg-card/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-border/50"
        style={{ zIndex: 20 }}
      >
        <p className="text-xs text-muted-foreground font-medium">
          Growth Stage
        </p>
        <p className="font-poppins font-semibold text-primary">{growthStage}</p>
      </div>

      {/* Visual Effects Layer */}
      <VisualEffects
        activeEffect={activeEffect}
        pestLevel={pestLevel}
        day={day}
        rainfall={rainfall}
      />

      {/* Live Visualization label */}
      <div
        className="absolute top-4 left-4 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-lg px-3 py-1.5"
        style={{ zIndex: 20 }}
      >
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
        <span className="text-xs font-medium text-muted-foreground">
          Live Visualization
        </span>
      </div>
    </div>
  );
}
