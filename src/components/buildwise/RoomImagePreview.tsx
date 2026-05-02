import { useMemo } from "react";
import { StudioPlan, PlacedItem } from "@/lib/studio";

/**
 * Photoreal-style instant preview rendered with SVG.
 * No WebGL, no network — looks like a real isometric room render
 * built directly from the StudioPlan.
 */
export const RoomImagePreview = ({ plan, night }: { plan: StudioPlan; night: boolean }) => {
  const { palette, input, items } = plan;

  const roomLabel = input.room.charAt(0).toUpperCase() + input.room.slice(1);
  const styleLabel = input.style.charAt(0).toUpperCase() + input.style.slice(1);

  // Viewport
  const VW = 1200;
  const VH = 750;

  // Isometric projection params — slightly tilted top-down view
  const cx = VW / 2;
  const horizon = VH * 0.28;
  const floorTop = horizon;
  const floorBottom = VH;

  // Project a world (x,z) coordinate (meters, origin = room center) to screen
  const project = (x: number, z: number) => {
    // Normalize to -1..1 across the room
    const nx = x / (input.width / 2);
    const nz = z / (input.depth / 2);
    // Foreshorten depth: front of room (z=+1) is wide, back (z=-1) is narrow
    const depthT = (nz + 1) / 2; // 0 (back) -> 1 (front)
    const widthScale = 0.35 + depthT * 0.55; // perspective
    const sx = cx + nx * (VW * 0.42) * widthScale;
    const sy = floorTop + (floorBottom - floorTop) * depthT;
    return { sx, sy, depthT, widthScale };
  };

  // Wall corners (back wall trapezoid)
  const backLeft = project(-input.width / 2, -input.depth / 2);
  const backRight = project(input.width / 2, -input.depth / 2);
  const frontLeft = project(-input.width / 2, input.depth / 2);
  const frontRight = project(input.width / 2, input.depth / 2);

  // Sort items back-to-front for painter's algorithm
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.pos[2] - b.pos[2]),
    [items]
  );

  // Lighting tints
  const ambient = night ? "hsl(220, 30%, 14%)" : "hsl(40, 30%, 96%)";
  const wallColor = night ? darken(palette.wall, 0.55) : palette.wall;
  const wallShadow = night ? darken(palette.wall, 0.7) : darken(palette.wall, 0.18);
  const floorColor = night ? darken(palette.floor, 0.5) : palette.floor;
  const floorEdge = darken(floorColor, 0.25);
  const ceilingColor = night ? "hsl(220, 25%, 8%)" : lighten(palette.wall, 0.08);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Floor wood/tile gradient */}
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={darken(floorColor, 0.15)} />
            <stop offset="60%" stopColor={floorColor} />
            <stop offset="100%" stopColor={lighten(floorColor, 0.05)} />
          </linearGradient>

          {/* Wall gradient with light from upper right */}
          <linearGradient id="wallGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={wallShadow} />
            <stop offset="60%" stopColor={wallColor} />
            <stop offset="100%" stopColor={lighten(wallColor, 0.06)} />
          </linearGradient>

          {/* Side wall (left) */}
          <linearGradient id="wallLeftGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={darken(wallColor, 0.35)} />
            <stop offset="100%" stopColor={wallShadow} />
          </linearGradient>
          {/* Side wall (right) */}
          <linearGradient id="wallRightGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={wallShadow} />
            <stop offset="100%" stopColor={darken(wallColor, 0.35)} />
          </linearGradient>

          {/* Ceiling */}
          <linearGradient id="ceilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={darken(ceilingColor, 0.2)} />
            <stop offset="100%" stopColor={ceilingColor} />
          </linearGradient>

          {/* Window light beam */}
          <radialGradient id="lightBeam" cx="0.7" cy="0.1" r="0.8">
            <stop offset="0%" stopColor={night ? "hsl(220, 70%, 60%)" : "hsl(45, 100%, 80%)"} stopOpacity={night ? 0.18 : 0.35} />
            <stop offset="60%" stopColor={night ? "hsl(220, 70%, 50%)" : "hsl(45, 100%, 75%)"} stopOpacity={0} />
          </radialGradient>

          {/* Lamp glow */}
          <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="hsl(45, 100%, 75%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(45, 100%, 70%)" stopOpacity="0" />
          </radialGradient>

          {/* Soft shadow */}
          <radialGradient id="objShadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Wood plank pattern */}
          <pattern id="floorPattern" x="0" y="0" width="80" height="20" patternUnits="userSpaceOnUse">
            <rect width="80" height="20" fill={floorColor} />
            <line x1="0" y1="0" x2="80" y2="0" stroke={darken(floorColor, 0.25)} strokeWidth="0.6" opacity="0.6" />
            <line x1="0" y1="20" x2="80" y2="20" stroke={darken(floorColor, 0.25)} strokeWidth="0.6" opacity="0.6" />
            <line x1="40" y1="0" x2="40" y2="20" stroke={darken(floorColor, 0.3)} strokeWidth="0.5" opacity="0.45" />
          </pattern>

          {/* Wall subtle texture */}
          <pattern id="wallPattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="1" cy="1" r="0.4" fill="rgba(255,255,255,0.04)" />
            <circle cx="4" cy="3" r="0.3" fill="rgba(0,0,0,0.05)" />
          </pattern>
        </defs>

        {/* Background sky/ambient */}
        <rect x="0" y="0" width={VW} height={VH} fill={ambient} />

        {/* Ceiling */}
        <polygon
          points={`0,0 ${VW},0 ${backRight.sx},${backRight.sy} ${backLeft.sx},${backLeft.sy}`}
          fill="url(#ceilGrad)"
        />

        {/* Left side wall */}
        <polygon
          points={`0,0 ${backLeft.sx},${backLeft.sy} ${frontLeft.sx},${frontLeft.sy} 0,${VH}`}
          fill="url(#wallLeftGrad)"
        />
        {/* Right side wall */}
        <polygon
          points={`${VW},0 ${backRight.sx},${backRight.sy} ${frontRight.sx},${frontRight.sy} ${VW},${VH}`}
          fill="url(#wallRightGrad)"
        />

        {/* Back wall */}
        <polygon
          points={`${backLeft.sx},${backLeft.sy} ${backRight.sx},${backRight.sy} ${backRight.sx},0 ${backLeft.sx},0`}
          fill="url(#wallGrad)"
        />
        <polygon
          points={`${backLeft.sx},${backLeft.sy} ${backRight.sx},${backRight.sy} ${backRight.sx},0 ${backLeft.sx},0`}
          fill="url(#wallPattern)"
          opacity="0.6"
        />

        {/* Window on back wall (right side) */}
        <g>
          {(() => {
            const winW = (backRight.sx - backLeft.sx) * 0.32;
            const winH = backLeft.sy * 0.55;
            const winX = backLeft.sx + (backRight.sx - backLeft.sx) * 0.55;
            const winY = backLeft.sy * 0.18;
            return (
              <>
                <rect
                  x={winX}
                  y={winY}
                  width={winW}
                  height={winH}
                  fill={night ? "hsl(220, 60%, 18%)" : "hsl(200, 70%, 75%)"}
                  stroke={darken(wallColor, 0.4)}
                  strokeWidth="2"
                  rx="2"
                />
                {/* Window frame cross */}
                <line x1={winX + winW / 2} y1={winY} x2={winX + winW / 2} y2={winY + winH} stroke={darken(wallColor, 0.4)} strokeWidth="2" />
                <line x1={winX} y1={winY + winH / 2} x2={winX + winW} y2={winY + winH / 2} stroke={darken(wallColor, 0.4)} strokeWidth="2" />
                {/* City silhouette / sky gradient inside */}
                {!night && (
                  <rect x={winX + 1} y={winY + 1} width={winW - 2} height={winH - 2} fill="url(#lightBeam)" />
                )}
                {night && (
                  <>
                    {[0.2, 0.45, 0.7].map((p, i) => (
                      <circle key={i} cx={winX + winW * p} cy={winY + winH * (0.2 + i * 0.1)} r="1.2" fill="hsl(45, 100%, 80%)" opacity="0.9" />
                    ))}
                  </>
                )}
              </>
            );
          })()}
        </g>

        {/* Floor */}
        <polygon
          points={`${backLeft.sx},${backLeft.sy} ${backRight.sx},${backRight.sy} ${frontRight.sx},${frontRight.sy} ${frontLeft.sx},${frontLeft.sy}`}
          fill="url(#floorPattern)"
        />
        {/* Floor depth shading */}
        <polygon
          points={`${backLeft.sx},${backLeft.sy} ${backRight.sx},${backRight.sy} ${frontRight.sx},${frontRight.sy} ${frontLeft.sx},${frontLeft.sy}`}
          fill="url(#floorGrad)"
          opacity="0.45"
        />
        {/* Floor / wall seam shadow */}
        <line
          x1={backLeft.sx}
          y1={backLeft.sy}
          x2={backRight.sx}
          y2={backRight.sy}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="2.5"
        />

        {/* Ambient light beam from window */}
        {!night && (
          <polygon
            points={`${backRight.sx - 80},${backRight.sy} ${backRight.sx - 20},${backRight.sy} ${frontLeft.sx + (frontRight.sx - frontLeft.sx) * 0.65},${frontRight.sy} ${frontLeft.sx + (frontRight.sx - frontLeft.sx) * 0.4},${frontRight.sy}`}
            fill="hsl(45, 100%, 80%)"
            opacity="0.10"
          />
        )}

        {/* Furniture — back to front */}
        {sortedItems.map((item) => (
          <FurnitureSprite
            key={item.id}
            item={item}
            project={project}
            roomW={input.width}
            roomD={input.depth}
            night={night}
          />
        ))}

        {/* Vignette */}
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
        <rect x="0" y="0" width={VW} height={VH} fill="url(#vignette)" />
      </svg>

      {/* Floating info card */}
      <div className="absolute top-4 left-4 glass-strong rounded-2xl px-4 py-3 border border-border/40 max-w-[260px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">AI Render</span>
        </div>
        <p className="font-display text-base leading-tight">{styleLabel} {roomLabel}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {input.width.toFixed(1)} × {input.depth.toFixed(1)} m · {night ? "Night" : "Day"}
        </p>
      </div>

      <div className="absolute bottom-4 right-4 glass rounded-full px-3 py-1.5 text-[10px] text-muted-foreground border border-border/40">
        Switch to <span className="text-primary font-medium">3D View</span> to edit
      </div>
    </div>
  );
};

// ============================================================================
// Furniture sprite renderer — draws a recognizable shape per item type
// ============================================================================

const FurnitureSprite = ({
  item,
  project,
  roomW,
  roomD,
  night,
}: {
  item: PlacedItem;
  project: (x: number, z: number) => { sx: number; sy: number; depthT: number; widthScale: number };
  roomW: number;
  roomD: number;
  night: boolean;
}) => {
  const p = project(item.pos[0], item.pos[2]);
  const { sx, sy, depthT, widthScale } = p;

  // Pixels per meter at this depth
  const pxPerMeter = 95 * widthScale;
  const w = item.size[0] * pxPerMeter;
  const d = item.size[2] * pxPerMeter * 0.55; // foreshortened depth
  const h = item.size[1] * pxPerMeter * 0.85;

  const baseColor = item.color;
  const top = lighten(baseColor, night ? -0.15 : 0.12);
  const front = baseColor;
  const side = darken(baseColor, 0.25);
  const shadowOpacity = 0.45 + depthT * 0.1;

  const shape = item.shape || "box";
  const name = item.name.toLowerCase();

  // Determine kind from name/category for richer rendering
  const isBed = /bed/.test(name);
  const isSofa = /sofa|couch|loveseat/.test(name);
  const isChair = /chair|armchair|stool/.test(name);
  const isTable = /table|desk|nightstand|console/.test(name);
  const isWardrobe = /wardrobe|cabinet|dresser|bookshelf|shelf/.test(name);
  const isLamp = shape === "lamp" || /lamp|sconce|chandelier/.test(name);
  const isRug = shape === "rug" || /rug|carpet/.test(name);
  const isFrame = shape === "frame" || /frame|art|painting|mirror/.test(name);
  const isPlant = /plant|fern|tree/.test(name);

  // Soft shadow under
  const shadowEl = !isFrame && !isLamp && (
    <ellipse
      cx={sx}
      cy={sy + 4}
      rx={w * 0.55}
      ry={d * 0.55}
      fill="url(#objShadow)"
      opacity={shadowOpacity}
    />
  );

  if (isRug) {
    return (
      <g>
        <ellipse
          cx={sx}
          cy={sy}
          rx={w * 0.55}
          ry={d * 0.85}
          fill={front}
          opacity="0.85"
        />
        <ellipse
          cx={sx}
          cy={sy}
          rx={w * 0.45}
          ry={d * 0.7}
          fill="none"
          stroke={lighten(front, 0.15)}
          strokeWidth="1.5"
          opacity="0.6"
        />
      </g>
    );
  }

  if (isFrame) {
    // Wall-mounted: place slightly above floor projection
    const fw = w * 0.9;
    const fh = h * 1.4;
    return (
      <g>
        <rect
          x={sx - fw / 2}
          y={sy - fh - d * 0.5}
          width={fw}
          height={fh}
          fill={darken(baseColor, 0.4)}
          stroke={lighten(baseColor, 0.1)}
          strokeWidth="2"
          rx="2"
        />
        <rect
          x={sx - fw / 2 + 4}
          y={sy - fh - d * 0.5 + 4}
          width={fw - 8}
          height={fh - 8}
          fill={baseColor}
          opacity="0.6"
        />
      </g>
    );
  }

  if (isLamp) {
    const stemH = h * 0.9;
    return (
      <g>
        {/* Glow */}
        {night && (
          <circle cx={sx} cy={sy - stemH} r={w * 1.2} fill="url(#lampGlow)" />
        )}
        {/* Base */}
        <ellipse cx={sx} cy={sy} rx={w * 0.35} ry={w * 0.12} fill={darken(baseColor, 0.3)} />
        {/* Stem */}
        <rect x={sx - 2} y={sy - stemH} width="4" height={stemH} fill={darken(baseColor, 0.2)} />
        {/* Shade */}
        <polygon
          points={`${sx - w * 0.4},${sy - stemH} ${sx + w * 0.4},${sy - stemH} ${sx + w * 0.5},${sy - stemH - h * 0.4} ${sx - w * 0.5},${sy - stemH - h * 0.4}`}
          fill={night ? "hsl(45, 80%, 70%)" : lighten(baseColor, 0.2)}
          stroke={darken(baseColor, 0.2)}
          strokeWidth="0.8"
        />
      </g>
    );
  }

  if (isPlant) {
    return (
      <g>
        {shadowEl}
        {/* Pot */}
        <polygon
          points={`${sx - w * 0.25},${sy} ${sx + w * 0.25},${sy} ${sx + w * 0.2},${sy - h * 0.3} ${sx - w * 0.2},${sy - h * 0.3}`}
          fill={darken(baseColor, 0.25)}
        />
        {/* Foliage */}
        <circle cx={sx - w * 0.15} cy={sy - h * 0.55} r={w * 0.3} fill="hsl(140, 35%, 35%)" />
        <circle cx={sx + w * 0.18} cy={sy - h * 0.6} r={w * 0.32} fill="hsl(140, 40%, 40%)" />
        <circle cx={sx} cy={sy - h * 0.85} r={w * 0.28} fill="hsl(140, 45%, 45%)" />
      </g>
    );
  }

  if (isBed) {
    // Mattress + headboard + pillows
    const matH = h * 0.35;
    const headH = h * 0.95;
    return (
      <g>
        {shadowEl}
        {/* Base/frame */}
        <rect x={sx - w / 2} y={sy - matH * 0.6} width={w} height={matH * 0.6} fill={darken(baseColor, 0.35)} rx="2" />
        {/* Mattress top */}
        <polygon
          points={`${sx - w / 2},${sy - matH} ${sx + w / 2},${sy - matH} ${sx + w / 2 - 6},${sy - matH - d * 0.7} ${sx - w / 2 + 6},${sy - matH - d * 0.7}`}
          fill={lighten(baseColor, 0.18)}
        />
        {/* Headboard */}
        <rect x={sx - w / 2 + 3} y={sy - matH - d * 0.7 - headH * 0.6} width={w - 6} height={headH * 0.6} fill={darken(baseColor, 0.15)} rx="3" />
        {/* Pillows */}
        <rect x={sx - w * 0.4} y={sy - matH - d * 0.55} width={w * 0.32} height={d * 0.35} fill="hsl(0, 0%, 95%)" rx="3" opacity="0.9" />
        <rect x={sx + w * 0.08} y={sy - matH - d * 0.55} width={w * 0.32} height={d * 0.35} fill="hsl(0, 0%, 95%)" rx="3" opacity="0.9" />
        {/* Blanket fold */}
        <rect x={sx - w / 2 + 4} y={sy - matH * 0.4} width={w - 8} height={matH * 0.35} fill={darken(baseColor, 0.1)} rx="2" />
      </g>
    );
  }

  if (isSofa) {
    const seatH = h * 0.45;
    const backH = h * 0.95;
    return (
      <g>
        {shadowEl}
        {/* Base */}
        <rect x={sx - w / 2} y={sy - seatH * 0.5} width={w} height={seatH * 0.5} fill={darken(baseColor, 0.3)} rx="3" />
        {/* Seat cushions */}
        <polygon
          points={`${sx - w / 2 + 4},${sy - seatH} ${sx + w / 2 - 4},${sy - seatH} ${sx + w / 2 - 8},${sy - seatH - d * 0.5} ${sx - w / 2 + 8},${sy - seatH - d * 0.5}`}
          fill={lighten(baseColor, 0.12)}
        />
        {/* Backrest */}
        <rect x={sx - w / 2 + 3} y={sy - seatH - d * 0.5 - backH * 0.55} width={w - 6} height={backH * 0.55} fill={baseColor} rx="6" />
        {/* Armrests */}
        <rect x={sx - w / 2} y={sy - seatH - d * 0.3 - backH * 0.35} width={w * 0.1} height={backH * 0.45} fill={baseColor} rx="3" />
        <rect x={sx + w / 2 - w * 0.1} y={sy - seatH - d * 0.3 - backH * 0.35} width={w * 0.1} height={backH * 0.45} fill={baseColor} rx="3" />
        {/* Cushion seam */}
        <line x1={sx} y1={sy - seatH} x2={sx} y2={sy - seatH - d * 0.5} stroke={darken(baseColor, 0.2)} strokeWidth="1" />
      </g>
    );
  }

  if (isChair) {
    const seatH = h * 0.45;
    const backH = h * 0.55;
    return (
      <g>
        {shadowEl}
        {/* Legs */}
        {[-1, 1].map((sx2) =>
          [-1, 1].map((sz2) => (
            <line
              key={`${sx2}-${sz2}`}
              x1={sx + sx2 * w * 0.4}
              y1={sy + sz2 * d * 0.2}
              x2={sx + sx2 * w * 0.4}
              y2={sy + sz2 * d * 0.2 - seatH}
              stroke={darken(baseColor, 0.4)}
              strokeWidth="2"
            />
          ))
        )}
        {/* Seat */}
        <polygon
          points={`${sx - w / 2},${sy - seatH} ${sx + w / 2},${sy - seatH} ${sx + w / 2 - 4},${sy - seatH - d * 0.6} ${sx - w / 2 + 4},${sy - seatH - d * 0.6}`}
          fill={baseColor}
        />
        {/* Back */}
        <rect x={sx - w / 2 + 3} y={sy - seatH - d * 0.6 - backH} width={w - 6} height={backH} fill={baseColor} rx="3" />
      </g>
    );
  }

  if (isTable) {
    const topH = h * 0.08;
    const legH = h * 0.92;
    return (
      <g>
        {shadowEl}
        {/* Legs */}
        {[-1, 1].map((sx2) =>
          [-1, 1].map((sz2) => (
            <line
              key={`${sx2}-${sz2}`}
              x1={sx + sx2 * w * 0.45}
              y1={sy + sz2 * d * 0.35}
              x2={sx + sx2 * w * 0.45}
              y2={sy + sz2 * d * 0.35 - legH}
              stroke={darken(baseColor, 0.4)}
              strokeWidth="2.5"
            />
          ))
        )}
        {/* Top surface */}
        <polygon
          points={`${sx - w / 2},${sy - legH} ${sx + w / 2},${sy - legH} ${sx + w / 2 - 8},${sy - legH - d * 0.75} ${sx - w / 2 + 8},${sy - legH - d * 0.75}`}
          fill={lighten(baseColor, 0.15)}
          stroke={darken(baseColor, 0.3)}
          strokeWidth="0.8"
        />
        {/* Top edge */}
        <rect x={sx - w / 2} y={sy - legH} width={w} height={topH} fill={darken(baseColor, 0.2)} />
      </g>
    );
  }

  if (isWardrobe) {
    return (
      <g>
        {shadowEl}
        {/* Side */}
        <polygon
          points={`${sx + w / 2},${sy} ${sx + w / 2 - d * 0.5},${sy - d * 0.6} ${sx + w / 2 - d * 0.5},${sy - d * 0.6 - h} ${sx + w / 2},${sy - h}`}
          fill={side}
        />
        {/* Front */}
        <rect x={sx - w / 2} y={sy - h} width={w} height={h} fill={front} stroke={darken(front, 0.3)} strokeWidth="1" />
        {/* Top */}
        <polygon
          points={`${sx - w / 2},${sy - h} ${sx + w / 2},${sy - h} ${sx + w / 2 - d * 0.5},${sy - h - d * 0.6} ${sx - w / 2 - d * 0.5},${sy - h - d * 0.6}`}
          fill={top}
        />
        {/* Doors */}
        <line x1={sx} y1={sy - h + 4} x2={sx} y2={sy - 4} stroke={darken(front, 0.4)} strokeWidth="1.2" />
        <circle cx={sx - 6} cy={sy - h * 0.5} r="1.5" fill={darken(front, 0.5)} />
        <circle cx={sx + 6} cy={sy - h * 0.5} r="1.5" fill={darken(front, 0.5)} />
      </g>
    );
  }

  // Default: 3D box
  return (
    <g>
      {shadowEl}
      {/* Side */}
      <polygon
        points={`${sx + w / 2},${sy} ${sx + w / 2 - d * 0.5},${sy - d * 0.6} ${sx + w / 2 - d * 0.5},${sy - d * 0.6 - h} ${sx + w / 2},${sy - h}`}
        fill={side}
      />
      {/* Front */}
      <rect x={sx - w / 2} y={sy - h} width={w} height={h} fill={front} />
      {/* Top */}
      <polygon
        points={`${sx - w / 2},${sy - h} ${sx + w / 2},${sy - h} ${sx + w / 2 - d * 0.5},${sy - h - d * 0.6} ${sx - w / 2 - d * 0.5},${sy - h - d * 0.6}`}
        fill={top}
      />
    </g>
  );
};

// ============================================================================
// Color helpers
// ============================================================================

function parseColor(c: string): { r: number; g: number; b: number } {
  // Handles #rrggbb / hsl(h s% l%) / hsl(h, s%, l%)
  if (c.startsWith("#")) {
    const v = c.slice(1);
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16),
    };
  }
  if (c.startsWith("hsl")) {
    const m = c.match(/hsl\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%/i);
    if (m) {
      const h = parseFloat(m[1]);
      const s = parseFloat(m[2]) / 100;
      const l = parseFloat(m[3]) / 100;
      return hslToRgb(h, s, l);
    }
  }
  return { r: 128, g: 128, b: 128 };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function darken(c: string, amt: number) {
  const { r, g, b } = parseColor(c);
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}

function lighten(c: string, amt: number) {
  const { r, g, b } = parseColor(c);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
