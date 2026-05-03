import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Sun, Moon, ExternalLink, ShoppingBag, AlertTriangle, CheckCircle2,
  TrendingDown, IndianRupee, Maximize2, Layers, Lightbulb, Sofa, Palette, X,
  Expand, Minimize, Image, Box, Loader2, Plus, RotateCcw, Trash2, Move, RefreshCw,
  Paintbrush,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  generateStudioPlan, fmtINR, StudioRoom, StudioStyle, StudioPriority, StudioInput,
  PlacedItem, getCatalogForRoom, createItemFromCatalog, MATERIAL_OPTIONS, STYLE_COST_MULT,
  CatalogItem, toBlueprint, blueprintToPrompt, RoomBlueprint,
} from "@/lib/studio";
import { RoomImagePreview } from "./RoomImagePreview";
import { Code2 } from "lucide-react";

const RoomScene = lazy(() => import("./RoomScene").then((m) => ({ default: m.RoomScene })));

type ViewMode = "image" | "3d";

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
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));

  const [viewMode, setViewMode] = useState<ViewMode>("image");
  const [is3DLoading, setIs3DLoading] = useState(false);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);

  // User-modified items overlay on top of AI-generated plan
  const [userItems, setUserItems] = useState<PlacedItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Detect low-end device
  const isLowEnd = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as any).deviceMemory ?? 8;
    return cores <= 2 || mem <= 2;
  }, []);

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

  const input: StudioInput = { room, style, priority, budget, width: effW, depth: effD, height: 2.7, seed };
  const basePlan = useMemo(() => generateStudioPlan(input), [room, style, priority, budget, effW, effD, seed]);

  // Merge user modifications into plan
  const plan = useMemo(() => {
    const aiItems = basePlan.items.filter((it) => !deletedIds.has(it.id));
    const allItems = [...aiItems, ...userItems];
    const subtotal = allItems.reduce((s, it) => s + it.cost, 0);
    return {
      ...basePlan,
      items: allItems,
      subtotal,
      withinBudget: subtotal <= budget,
    };
  }, [basePlan, userItems, deletedIds, budget]);

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

  // Catalog items for current room
  const catalog = useMemo(() => getCatalogForRoom(room), [room]);
  const catalogByCategory = useMemo(() => {
    const out: Record<string, CatalogItem[]> = {};
    catalog.forEach((c) => {
      out[c.category] ||= [];
      out[c.category].push(c);
    });
    return out;
  }, [catalog]);

  // Handlers
  const handleRegenerate = useCallback(() => {
    setSeed(Math.floor(Math.random() * 999999));
    setUserItems([]);
    setDeletedIds(new Set());
    setSelectedId(null);
  }, []);

  const handleAddItem = useCallback((cat: CatalogItem) => {
    const pos: [number, number, number] = [
      (Math.random() - 0.5) * effW * 0.5,
      cat.size[1] / 2,
      (Math.random() - 0.5) * effD * 0.5,
    ];
    const item = createItemFromCatalog(cat, pos, STYLE_COST_MULT[style]);
    setUserItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setShowAddPanel(false);
  }, [effW, effD, style]);

  const handleDeleteItem = useCallback((id: string) => {
    // Check if it's a user-added item
    if (userItems.some((it) => it.id === id)) {
      setUserItems((prev) => prev.filter((it) => it.id !== id));
    } else {
      setDeletedIds((prev) => new Set(prev).add(id));
    }
    setSelectedId(null);
  }, [userItems]);

  const handleRotateItem = useCallback((id: string) => {
    const updateFn = (items: PlacedItem[]) =>
      items.map((it) => it.id === id ? { ...it, rot: (it.rot ?? 0) + Math.PI / 4 } : it);
    if (userItems.some((it) => it.id === id)) {
      setUserItems(updateFn);
    }
    // For AI items, we'd need to clone them to userItems to modify
  }, [userItems]);

  const handleMoveItem = useCallback((id: string, dx: number, dz: number) => {
    const updateFn = (items: PlacedItem[]) =>
      items.map((it) => it.id === id ? { ...it, pos: [it.pos[0] + dx, it.pos[1], it.pos[2] + dz] as [number, number, number] } : it);
    if (userItems.some((it) => it.id === id)) {
      setUserItems(updateFn);
    }
  }, [userItems]);

  // Reset user modifications when room/style changes
  useEffect(() => {
    setUserItems([]);
    setDeletedIds(new Set());
    setSelectedId(null);
  }, [room, style]);

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

            {/* Action buttons */}
            <div className="space-y-2 border-t border-border/50 pt-4">
              <button
                onClick={handleRegenerate}
                className="press w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Generate New Design
              </button>
              <button
                onClick={() => setShowAddPanel(true)}
                className="press w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-medium hover:bg-accent/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
              <p className="mb-1 text-foreground/80 font-medium">Tip</p>
              Click any object to edit, move, or delete. Use "Generate New Design" for a unique layout every time.
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
                  {plan.items.length} items · {plan.sqft} sqft
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Realistic range for a {plan.input.style} {plan.input.room}: {fmtINR(plan.realisticBudget.min)} – {fmtINR(plan.realisticBudget.max)} ·
                  Walkability {Math.round(plan.walkability * 100)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="font-display text-2xl text-gradient-gold">{fmtINR(plan.subtotal)}</p>
              </div>
            </div>

            {/* Auto-corrections */}
            {plan.corrections.length > 0 && (
              <div className="glass rounded-2xl p-4 md:p-5 border border-accent/30">
                <p className="font-medium text-accent text-sm flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" /> AI auto-corrections
                </p>
                <ul className="space-y-1.5">
                  {plan.corrections.map((c, i) => (
                    <li key={i} className="text-xs text-foreground/85 flex gap-2 leading-relaxed">
                      <span className="text-accent mt-0.5">•</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* View mode toggle */}
            <div className="flex items-center gap-3">
              <div className="glass-strong rounded-2xl p-1 flex items-center gap-1">
                <button
                  onClick={() => setViewMode("image")}
                  className={`press flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${
                    viewMode === "image"
                      ? "bg-primary/15 text-primary border border-primary/40 shadow-[0_0_20px_hsl(210_90%_62%/0.18)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Image className="w-3.5 h-3.5" /> Image View
                </button>
                <button
                  onClick={() => {
                    if (viewMode !== "3d") {
                      setIs3DLoading(true);
                      setViewMode("3d");
                      setTimeout(() => setIs3DLoading(false), 800);
                    }
                  }}
                  className={`press flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${
                    viewMode === "3d"
                      ? "bg-primary/15 text-primary border border-primary/40 shadow-[0_0_20px_hsl(210_90%_62%/0.18)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" /> 3D View
                </button>
              </div>
              {isLowEnd && viewMode === "3d" && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-warning" />
                  Image Mode recommended for this device
                </p>
              )}
            </div>

            {/* Scene — dual mode with Focus Mode + sliding right product panel */}
            <div
              className={
                focus
                  ? "fixed inset-0 z-50 bg-background"
                  : "glass rounded-3xl overflow-hidden border border-border/50 relative aspect-[16/10] lg:min-h-[560px]"
              }
            >
              {/* Image mode */}
              {viewMode === "image" && (
                <RoomImagePreview plan={plan} night={night} />
              )}

              {/* 3D mode — lazy loaded */}
              {viewMode === "3d" && (
                <>
                  {is3DLoading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Loading interactive 3D…</p>
                      </div>
                    </div>
                  )}
                  <Suspense fallback={
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Loading interactive 3D…</p>
                      </div>
                    </div>
                  }>
                    <RoomScene
                      plan={plan}
                      hoveredId={hoveredId}
                      selectedId={selectedId}
                      onHover={setHoveredId}
                      onSelect={setSelectedId}
                      night={night}
                    />
                  </Suspense>
                </>
              )}

              {/* Top-left: live tag */}
              {!focus && (
                <div className="absolute top-3 left-3 glass-strong rounded-full px-3 py-1.5 text-[11px] flex items-center gap-2 z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                  {viewMode === "3d" ? "Live 3D" : "Preview"} · {plan.input.room} · {plan.input.style}
                </div>
              )}

              {/* Top-right: focus toggle + day/night (only in 3D) */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  onClick={() => setNight((v) => !v)}
                  aria-label="Toggle lighting"
                  className="w-9 h-9 rounded-xl glass-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors press"
                >
                  {night ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                {viewMode === "3d" && (
                  <button
                    onClick={() => setFocus((v) => !v)}
                    aria-label="Toggle focus mode"
                    className="h-9 px-3 rounded-xl glass-strong flex items-center gap-2 text-xs text-foreground/85 hover:text-foreground transition-colors press"
                  >
                    {focus ? <Minimize className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
                    {focus ? "Exit Focus" : "Focus Mode"}
                  </button>
                )}
              </div>

              {/* Bottom-left: hover label (3D only) */}
              {viewMode === "3d" && hoveredId && !selectedId && (
                <div className="absolute bottom-4 left-4 glass-strong rounded-full px-3 py-1.5 text-xs animate-fade-in z-10">
                  {plan.items.find((i) => i.id === hoveredId)?.name}
                </div>
              )}

              {/* Focus Mode hint */}
              {viewMode === "3d" && focus && !selected && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-strong rounded-full px-4 py-2 text-xs text-muted-foreground animate-fade-in z-10">
                  Drag to orbit · click any object · ESC to exit
                </div>
              )}

              {/* Image mode: quick-switch CTA */}
              {viewMode === "image" && !focus && (
                <button
                  onClick={() => {
                    setIs3DLoading(true);
                    setViewMode("3d");
                    setTimeout(() => setIs3DLoading(false), 800);
                  }}
                  className="absolute bottom-4 right-4 glass-strong rounded-2xl px-4 py-2.5 text-xs font-medium text-foreground/85 hover:text-foreground flex items-center gap-2 transition-all press z-10 border border-primary/30 hover:border-primary/60"
                >
                  <Box className="w-3.5 h-3.5 text-primary" /> Edit in 3D
                </button>
              )}

              {/* Sliding right-side product panel (3D only) */}
              {viewMode === "3d" && (
                <ProductPanel
                  item={selected}
                  onClose={() => setSelectedId(null)}
                  inFocus={focus}
                  onDelete={handleDeleteItem}
                  onRotate={handleRotateItem}
                  onMove={handleMoveItem}
                />
              )}
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
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
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
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteItem(it.id); }}
                              className="w-7 h-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive/70 hover:text-destructive transition shrink-0"
                              aria-label="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Add Item Panel (modal overlay) */}
      {showAddPanel && (
        <AddItemPanel
          catalogByCategory={catalogByCategory}
          onAdd={handleAddItem}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </section>
  );
};

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`press px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${
      active
        ? "bg-primary/15 text-primary border border-primary/40 shadow-[0_0_20px_hsl(210_90%_62%/0.18)]"
        : "bg-input/40 border border-border hover:border-primary/30 hover:text-foreground text-muted-foreground"
    }`}
  >
    {children}
  </button>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className="text-foreground/90 text-right text-sm">{value}</span>
  </div>
);

/**
 * Right-side sliding product panel that overlays the 3D scene.
 * Minimal, premium product-card style.
 */
const ProductPanel = ({
  item,
  onClose,
  inFocus,
  onDelete,
  onRotate,
  onMove,
}: {
  item: PlacedItem | null;
  onClose: () => void;
  inFocus: boolean;
  onDelete: (id: string) => void;
  onRotate: (id: string) => void;
  onMove: (id: string, dx: number, dz: number) => void;
}) => {
  return (
    <AnimatePresence>
      {item && (
        <motion.aside
          key={item.id}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute top-0 bottom-0 right-0 w-full sm:w-[380px] glass-strong border-l border-border/50 p-6 flex flex-col z-10 overflow-y-auto ${
            inFocus ? "shadow-[0_0_80px_-20px_hsl(210_90%_50%/0.25)]" : ""
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{item.category}</p>
              <h4 className="font-display text-xl leading-tight mt-1.5">{item.name}</h4>
              {item.userAdded && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 mt-1.5 inline-block">Custom</span>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition press"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Edit controls */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => onRotate(item.id)}
              className="press flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-secondary/60 border border-border/50 text-xs text-foreground/80 hover:text-foreground hover:border-primary/30 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Rotate
            </button>
            <button
              onClick={() => onMove(item.id, 0.2, 0)}
              className="press flex items-center justify-center gap-1 h-9 w-9 rounded-xl bg-secondary/60 border border-border/50 text-xs text-foreground/80 hover:text-foreground hover:border-primary/30 transition"
              title="Move right"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="press flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive/80 hover:text-destructive hover:bg-destructive/20 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>

          {/* Visual swatch */}
          <div
            className="relative h-32 rounded-2xl overflow-hidden mb-5 border border-border/40"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${item.color}, hsl(222 22% 9%) 80%)`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(40_30%_95%_/_0.06),transparent_60%)]" />
            <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-wider text-foreground/60">
              {item.retailer}
            </div>
          </div>

          {/* Specs */}
          <div className="space-y-0.5">
            <Row label="Material" value={item.material} />
            <Row label="Dimensions" value={item.dimensions} />
            <Row label="Quantity" value={`${item.qty}${item.unit ? ` ${item.unit}` : ""}`} />
            <Row label="Retailer" value={item.retailer} />
          </div>

          {/* Price */}
          <div className="mt-5 p-4 rounded-2xl bg-secondary/40 border border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total cost</p>
            <p className="font-display text-3xl mt-1">{fmtINR(item.cost)}</p>
          </div>

          {/* CTA */}
          <a
            href={item.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition glow-blue"
          >
            View Product <ExternalLink className="w-4 h-4" />
          </a>

          {item.alternative && (
            <a
              href={item.alternative.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="press mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl border border-border hover:border-accent/40 text-sm text-foreground/85 hover:text-foreground transition"
            >
              <TrendingDown className="w-3.5 h-3.5 text-accent" />
              Save ₹{item.alternative.saves.toLocaleString("en-IN")} with alternative
            </a>
          )}

          <p className="text-[11px] text-muted-foreground mt-auto pt-6">
            Tap any other object to switch · Press ESC to exit Focus Mode
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

/**
 * Add Item panel — category-grouped catalog browser
 */
const AddItemPanel = ({
  catalogByCategory,
  onAdd,
  onClose,
}: {
  catalogByCategory: Record<string, CatalogItem[]>;
  onAdd: (cat: CatalogItem) => void;
  onClose: () => void;
}) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 10, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto border border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-xl">Add Item</h3>
            <p className="text-xs text-muted-foreground mt-1">Choose an item to place in your room</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {Object.entries(catalogByCategory).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-accent mb-2">{cat}</p>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onAdd(item)}
                    className="press text-left p-3 rounded-xl border border-border/50 bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div
                      className="w-full h-12 rounded-lg mb-2 border border-border/30"
                      style={{
                        background: `radial-gradient(circle at 40% 40%, ${item.color}44, hsl(222 22% 9%) 80%)`,
                      }}
                    />
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.material}</p>
                    <p className="text-xs font-display text-foreground/80 mt-1">{fmtINR(item.baseCost)}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);
