import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Sun, Moon, ExternalLink, ShoppingBag, AlertTriangle, CheckCircle2,
  TrendingDown, IndianRupee, Maximize2, Layers, Lightbulb, Sofa, Palette, X,
  Expand, Minimize,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  generateStudioPlan, fmtINR, StudioRoom, StudioStyle, StudioPriority, StudioInput,
} from "@/lib/studio";
import { RoomScene } from "./RoomScene";

const ROOMS: { id: StudioRoom; label: string; w: number; d: number }[] = [
  { id: "bedroom", label: "Bedroom", w: 4.0, d: 4.5 },
  { id: "living", label: "Living Room", w: 5.0, d: 5.5 },
  { id: "kitchen", label: "Kitchen", w: 4.0, d: 4.0 },
  { id: "bathroom", label: "Bathroom", w: 2.5, d: 3.0 },
];
const STYLES: { id: StudioStyle; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
  { id: "traditional", label: "Traditional" },
];
const PRIORITIES: { id: StudioPriority; label: string }[] = [
  { id: "saving", label: "Budget Saving" },
  { id: "balanced", label: "Balanced" },
  { id: "premium", label: "Premium Feel" },
];

const SPLIT_LABELS: Record<keyof ReturnType<typeof generateStudioPlan>["split"], { label: string; color: string; icon: React.ElementType }> = {
  furniture: { label: "Furniture", color: "hsl(205 100% 60%)", icon: Sofa },
  materials: { label: "Materials", color: "hsl(220 15% 50%)", icon: Layers },
  lighting:  { label: "Lighting", color: "hsl(42 85% 60%)", icon: Lightbulb },
  decor:     { label: "Decor", color: "hsl(280 60% 65%)", icon: Palette },
  buffer:    { label: "Buffer", color: "hsl(160 50% 50%)", icon: Sparkles },
};

export const Studio3D = () => {
  const [room, setRoom] = useState<StudioRoom>("living");
  const [style, setStyle] = useState<StudioStyle>("modern");
  const [priority, setPriority] = useState<StudioPriority>("balanced");
  const [budget, setBudget] = useState(250000);
  const [autoSize, setAutoSize] = useState(true);
  const [width, setWidth] = useState(5.0);
  const [depth, setDepth] = useState(5.5);
  const [night, setNight] = useState(false);
  const [focus, setFocus] = useState(false);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Lock body scroll while in Focus Mode + ESC to exit
  useEffect(() => {
    if (!focus) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocus(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [focus]);

  const effW = autoSize ? ROOMS.find((r) => r.id === room)!.w : width;
  const effD = autoSize ? ROOMS.find((r) => r.id === room)!.d : depth;

  const input: StudioInput = { room, style, priority, budget, width: effW, depth: effD, height: 2.7 };
  const plan = useMemo(() => generateStudioPlan(input), [room, style, priority, budget, effW, effD]);

  const selected = selectedId ? plan.items.find((i) => i.id === selectedId) ?? null : null;

  // Group items by category for the inventory panel
  const grouped = useMemo(() => {
    const out: Record<string, typeof plan.items> = {};
    plan.items.forEach((it) => {
      out[it.category] ||= [];
      out[it.category].push(it);
    });
    return out;
  }, [plan.items]);

  return (
    <section id="studio" className="relative py-20 md:py-28 border-t border-border/50">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-10"
        >
          <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground mb-4">3D Interior Studio</p>
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Walk through your room.
            <br />
            <span className="text-primary">Buy what you love.</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-lg max-w-xl">
            A real-time 3D AI designer. Every chair, lamp and tile is placed intelligently, priced, and linked to a real product.
          </p>
        </motion.div>

        {/* Layout: controls | scene + panels */}
        <div className="grid xl:grid-cols-[360px_1fr] gap-6">
          {/* Controls */}
          <div className="glass-strong rounded-3xl p-6 h-fit xl:sticky xl:top-24 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Room</p>
              <div className="grid grid-cols-2 gap-2">
                {ROOMS.map((r) => (
                  <Pill key={r.id} active={room === r.id} onClick={() => { setRoom(r.id); setSelectedId(null); }}>
                    {r.label}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Style</p>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <Pill key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>{s.label}</Pill>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Priority</p>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <Pill key={p.id} active={priority === p.id} onClick={() => setPriority(p.id)}>{p.label}</Pill>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <IndianRupee className="w-3 h-3" /> Interior budget
                </p>
                <p className="font-display text-xl text-gradient-gold">{fmtINR(budget)}</p>
              </div>
              <Slider
                value={[budget]}
                min={50000}
                max={2500000}
                step={10000}
                onValueChange={(v) => setBudget(v[0])}
                className="[&_[role=slider]]:bg-gradient-primary [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-[0_0_20px_hsl(205_100%_60%/0.6)] [&>span:first-child>span]:bg-gradient-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>₹50K</span><span>₹12.5L</span><span>₹25L</span>
              </div>
            </div>

            {/* Room size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Maximize2 className="w-3 h-3" /> Room size
                </p>
                <button
                  onClick={() => setAutoSize((v) => !v)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                    autoSize ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"
                  }`}
                >
                  {autoSize ? "Auto" : "Manual"}
                </button>
              </div>
              {!autoSize ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Width</span><span>{width.toFixed(1)} m</span>
                    </div>
                    <Slider value={[width]} min={2.5} max={8} step={0.1} onValueChange={(v) => setWidth(v[0])} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Depth</span><span>{depth.toFixed(1)} m</span>
                    </div>
                    <Slider value={[depth]} min={2.5} max={8} step={0.1} onValueChange={(v) => setDepth(v[0])} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Estimated <span className="text-foreground font-medium">{effW.toFixed(1)} × {effD.toFixed(1)} m</span> ({Math.round(effW * effD * 10.764)} sqft)
                </p>
              )}
            </div>

            {/* Day / night */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Lighting</p>
              <div className="grid grid-cols-2 gap-2">
                <Pill active={!night} onClick={() => setNight(false)}>
                  <Sun className="w-3.5 h-3.5 mr-1.5 inline" /> Day
                </Pill>
                <Pill active={night} onClick={() => setNight(true)}>
                  <Moon className="w-3.5 h-3.5 mr-1.5 inline" /> Night
                </Pill>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
              <p className="mb-1 text-foreground/80 font-medium">Tip</p>
              Drag to orbit · scroll to zoom · click any object to inspect price & buy link.
            </div>
          </div>

          {/* Scene + side panels */}
          <div className="space-y-6">
            {/* Status bar */}
            <div className={`glass rounded-2xl p-4 md:p-5 flex flex-wrap items-center gap-4 border ${
              plan.withinBudget ? "border-primary/30" : "border-warning/30"
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                plan.withinBudget ? "bg-primary/15" : "bg-warning/15"
              }`}>
                {plan.withinBudget ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-warning" />}
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className={`font-medium ${plan.withinBudget ? "text-primary" : "text-warning"}`}>
                  {plan.withinBudget ? "Plan fits your budget" : "AI auto-optimized to fit budget"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Subtotal <span className="text-foreground font-medium">{fmtINR(plan.subtotal)}</span> ·
                  Budget <span className="text-foreground font-medium">{fmtINR(budget)}</span> ·
                  {plan.items.length} items
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="font-display text-2xl text-gradient-gold">{fmtINR(plan.subtotal)}</p>
              </div>
            </div>

            {/* 3D scene — full width, with Focus Mode + sliding right product panel */}
            <div
              className={
                focus
                  ? "fixed inset-0 z-50 bg-background"
                  : "glass rounded-3xl overflow-hidden border border-border/50 relative aspect-[16/10] lg:min-h-[560px]"
              }
            >
              <RoomScene
                plan={plan}
                hoveredId={hoveredId}
                selectedId={selectedId}
                onHover={setHoveredId}
                onSelect={setSelectedId}
                night={night}
              />

              {/* Top-left: live tag (hidden in focus when nothing selected) */}
              {!focus && (
                <div className="absolute top-3 left-3 glass-strong rounded-full px-3 py-1.5 text-[11px] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                  Live · {plan.input.room} · {plan.input.style}
                </div>
              )}

              {/* Top-right: focus toggle + day/night */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={() => setNight((v) => !v)}
                  aria-label="Toggle lighting"
                  className="w-9 h-9 rounded-xl glass-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors press"
                >
                  {night ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setFocus((v) => !v)}
                  aria-label="Toggle focus mode"
                  className="h-9 px-3 rounded-xl glass-strong flex items-center gap-2 text-xs text-foreground/85 hover:text-foreground transition-colors press"
                >
                  {focus ? <Minimize className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
                  {focus ? "Exit Focus" : "Focus Mode"}
                </button>
              </div>

              {/* Bottom-left: hover label */}
              {hoveredId && !selectedId && (
                <div className="absolute bottom-4 left-4 glass-strong rounded-full px-3 py-1.5 text-xs animate-fade-in">
                  {plan.items.find((i) => i.id === hoveredId)?.name}
                </div>
              )}

              {/* Focus Mode hint */}
              {focus && !selected && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-strong rounded-full px-4 py-2 text-xs text-muted-foreground animate-fade-in">
                  Drag to orbit · click any object · ESC to exit
                </div>
              )}

              {/* Sliding right-side product panel */}
              <ProductPanel
                item={selected}
                onClose={() => setSelectedId(null)}
                inFocus={focus}
              />
            </div>

            {/* Budget distribution */}
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg">Budget Distribution</h3>
                <p className="text-xs text-muted-foreground">Auto-tuned for <span className="text-foreground font-medium">{priority}</span></p>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {(Object.keys(plan.split) as (keyof typeof plan.split)[]).map((k) => (
                  <div key={k} className="h-full" style={{ width: `${plan.split[k] * 100}%`, background: SPLIT_LABELS[k].color }} />
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(Object.keys(plan.split) as (keyof typeof plan.split)[]).map((k) => {
                  const Icon = SPLIT_LABELS[k].icon;
                  return (
                    <div key={k} className="p-3 rounded-xl bg-secondary/40 border border-border/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-sm" style={{ background: SPLIT_LABELS[k].color }} />
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{SPLIT_LABELS[k].label}</span>
                      </div>
                      <p className="text-sm font-medium">{Math.round(plan.split[k] * 100)}%</p>
                      <p className="text-[11px] text-muted-foreground">{fmtINR(budget * plan.split[k])}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory grouped */}
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Smart Inventory
                </h3>
                <p className="text-xs text-muted-foreground">Click any row to focus & buy</p>
              </div>
              <div className="space-y-5">
                {Object.entries(grouped).map(([cat, list]) => (
                  <div key={cat}>
                    <p className="text-[10px] uppercase tracking-wider text-accent mb-2">{cat}</p>
                    <div className="space-y-2">
                      {list.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => setSelectedId(it.id)}
                          onMouseEnter={() => setHoveredId(it.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`w-full text-left p-3 md:p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                            selectedId === it.id
                              ? "border-primary/50 bg-primary/10"
                              : hoveredId === it.id
                              ? "border-accent/40 bg-accent/5"
                              : "border-border/50 bg-secondary/30 hover:border-primary/30"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{it.name}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">{it.retailer}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {it.material} · {it.dimensions} · Qty {it.qty}{it.unit ? ` ${it.unit}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display text-base">{fmtINR(it.cost)}</p>
                            <a
                              href={it.buyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline"
                            >
                              Buy <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimizations */}
            {plan.optimizations.length > 0 && (
              <div className="glass rounded-3xl p-6">
                <h3 className="font-display text-lg flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-accent" /> Micro-optimizations
                </h3>
                <ul className="space-y-3">
                  {plan.optimizations.map((o, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.item}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.suggestion}</p>
                      </div>
                      <span className="text-accent font-display text-base shrink-0">−₹{o.saves.toLocaleString("en-IN")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
      active
        ? "bg-gradient-primary text-primary-foreground shadow-[0_0_20px_hsl(205_100%_60%/0.35)]"
        : "bg-input/40 border border-border hover:border-primary/40 text-muted-foreground"
    }`}
  >
    {children}
  </button>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className="text-foreground/90 text-right">{value}</span>
  </div>
);
