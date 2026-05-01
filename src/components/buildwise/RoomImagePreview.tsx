import { useMemo } from "react";
import { StudioPlan } from "@/lib/studio";

/**
 * High-quality static image preview of the designed room.
 * Uses CSS gradients, layered visuals, and the plan data to render
 * a stylized representation that loads instantly — no WebGL required.
 */
export const RoomImagePreview = ({ plan, night }: { plan: StudioPlan; night: boolean }) => {
  const { palette, input, items } = plan;

  const roomLabel = input.room.charAt(0).toUpperCase() + input.room.slice(1);
  const styleLabel = input.style.charAt(0).toUpperCase() + input.style.slice(1);

  const furnCount = items.filter((i) => i.category === "Furniture").length;
  const lightCount = items.filter((i) => i.category === "Lighting").length;
  const decorCount = items.filter((i) => i.category === "Decor").length;

  // Dynamic background based on room + style + time
  const bg = useMemo(() => {
    const base = night ? "hsl(222, 22%, 6%)" : "hsl(222, 18%, 10%)";
    const wallTone = night
      ? `hsl(222, 20%, 12%)`
      : palette.wall;
    const floorTone = night
      ? `hsl(25, 15%, 10%)`
      : palette.floor;
    const accentGlow = `${palette.accent}22`;

    return `
      radial-gradient(ellipse 80% 50% at 50% 20%, ${wallTone}88, transparent 70%),
      radial-gradient(ellipse 120% 40% at 50% 95%, ${floorTone}99, transparent 60%),
      radial-gradient(circle at 30% 30%, ${accentGlow}, transparent 50%),
      ${base}
    `;
  }, [night, palette]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden" style={{ background: bg }}>
      {/* Ambient light shaft */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: night
            ? "radial-gradient(ellipse 40% 60% at 65% 30%, hsl(210 60% 40% / 0.15), transparent 70%)"
            : "radial-gradient(ellipse 40% 80% at 70% 20%, hsl(40 80% 90% / 0.18), transparent 60%)",
        }}
      />

      {/* Subtle grid / perspective lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, currentColor 1px, transparent 1px),
            linear-gradient(0deg, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Furniture silhouettes — abstract positioned blocks */}
      <div className="absolute inset-0 pointer-events-none">
        {items.slice(0, 8).map((item, i) => {
          const normX = ((item.pos[0] / (input.width / 2)) * 0.3 + 0.5) * 100;
          const normZ = ((item.pos[2] / (input.depth / 2)) * 0.2 + 0.6) * 100;
          const size = Math.max(item.size[0], item.size[2]) * 28;
          const height = item.size[1] * 22;
          const isLamp = item.shape === "lamp";

          return (
            <div
              key={item.id}
              className="absolute rounded-xl transition-all duration-700"
              style={{
                left: `${Math.min(Math.max(normX, 10), 90)}%`,
                top: `${Math.min(Math.max(normZ, 25), 85)}%`,
                width: `${Math.max(size, 16)}px`,
                height: `${Math.max(height, 12)}px`,
                background: isLamp
                  ? `radial-gradient(circle, ${item.color}66, ${item.color}11)`
                  : `linear-gradient(135deg, ${item.color}33, ${item.color}11)`,
                border: `1px solid ${item.color}22`,
                boxShadow: isLamp ? `0 0 30px ${item.color}33` : "none",
                transform: `translate(-50%, -50%) rotate(${(item.rot ?? 0) * (180 / Math.PI)}deg)`,
                animationDelay: `${i * 150}ms`,
              }}
            />
          );
        })}
      </div>

      {/* Center room info overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <div className="glass-strong rounded-3xl px-8 py-7 max-w-md border border-border/30">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">AI-Generated Preview</span>
          </div>
          <h3 className="font-display text-2xl tracking-tight mb-1">
            {styleLabel} {roomLabel}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {input.width.toFixed(1)} × {input.depth.toFixed(1)} m · {night ? "Night" : "Day"} lighting
          </p>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
              <p className="font-display text-lg">{furnCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Furniture</p>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
              <p className="font-display text-lg">{lightCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lights</p>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
              <p className="font-display text-lg">{decorCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Decor</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Switch to <span className="text-primary font-medium">3D View</span> for interactive editing
          </p>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
    </div>
  );
};
