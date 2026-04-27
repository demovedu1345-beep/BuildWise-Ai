import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ExternalLink, ShoppingBag, Palette, AlertTriangle, CheckCircle2, TrendingDown, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  generateInteriorPlan,
  InteriorInput,
  RoomType,
  StylePref,
  SpaceType,
} from "@/lib/interior";
import { fmtINR } from "@/lib/buildwise";

const SPACES: { id: SpaceType; label: string }[] = [
  { id: "house", label: "House" },
  { id: "flat", label: "Flat" },
  { id: "room", label: "Single Room" },
];
const ROOMS: { id: RoomType; label: string }[] = [
  { id: "living", label: "Living Room" },
  { id: "bedroom", label: "Bedroom" },
  { id: "kitchen", label: "Kitchen" },
  { id: "bathroom", label: "Bathroom" },
  { id: "dining", label: "Dining" },
  { id: "study", label: "Study" },
];
const STYLES: { id: StylePref; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
  { id: "scandinavian", label: "Scandinavian" },
  { id: "industrial", label: "Industrial" },
];

export const InteriorDesigner = () => {
  const [space, setSpace] = useState<SpaceType>("flat");
  const [room, setRoom] = useState<RoomType>("living");
  const [style, setStyle] = useState<StylePref>("modern");
  const [budget, setBudget] = useState(150000);
  const [generated, setGenerated] = useState(false);

  const input: InteriorInput = { space, room, style, budget };
  const plan = useMemo(() => generateInteriorPlan(input), [space, room, style, budget]);

  return (
    <section id="designer" className="relative py-20 md:py-28 border-t border-border/50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-12"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">AI Interior Designer</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Design your space.
            <br />
            <span className="text-gradient-hero">Buy every piece in one click.</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Get a fully itemized plan — furniture, finishes, paint, lighting — with direct purchase links from Amazon, Pepperfry, IKEA, Urban Ladder & more.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[420px_1fr] gap-8">
          {/* Inputs */}
          <div className="glass-strong rounded-3xl p-7 h-fit lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl">Your space</h3>
              <Palette className="w-5 h-5 text-accent" />
            </div>

            <div className="space-y-6">
              <Field label="Space type">
                <Pills<SpaceType> options={SPACES} value={space} onChange={setSpace} />
              </Field>

              <Field label="Room">
                <div className="grid grid-cols-3 gap-2">
                  {ROOMS.map((r) => (
                    <PillBtn key={r.id} active={room === r.id} onClick={() => setRoom(r.id)}>
                      {r.label}
                    </PillBtn>
                  ))}
                </div>
              </Field>

              <Field label="Style">
                <div className="grid grid-cols-3 gap-2">
                  {STYLES.map((s) => (
                    <PillBtn key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                      {s.label}
                    </PillBtn>
                  ))}
                </div>
              </Field>

              <Field label={
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-1.5"><IndianRupee className="w-3 h-3" /> Interior budget</span>
                  <span className="font-display text-xl text-gradient-gold">{fmtINR(budget)}</span>
                </div>
              }>
                <Slider
                  value={[budget]}
                  min={25000}
                  max={1500000}
                  step={5000}
                  onValueChange={(v) => setBudget(v[0])}
                  className="[&_[role=slider]]:bg-gradient-primary [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-[0_0_20px_hsl(205_100%_60%/0.6)] [&>span:first-child>span]:bg-gradient-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                  <span>₹25K</span><span>₹7.5L</span><span>₹15L</span>
                </div>
              </Field>

              {/* Palette preview */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Style palette</p>
                <div className="flex gap-2">
                  {plan.palette.map((c) => (
                    <div key={c.hex} className="flex-1 h-12 rounded-xl border border-border/50 relative overflow-hidden" style={{ background: c.hex }}>
                      <div className="absolute bottom-1 left-1 right-1 text-[9px] font-medium px-1 py-0.5 rounded bg-background/70 text-foreground truncate text-center">
                        {c.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setGenerated(true)}
                className="w-full h-13 py-3 text-base bg-gradient-hero rounded-2xl glow-blue group"
              >
                <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                Design my {ROOMS.find((r) => r.id === room)?.label}
              </Button>
            </div>
          </div>

          {/* Output */}
          <div>
            <AnimatePresence mode="wait">
              {!generated ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass rounded-3xl p-12 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-muted-foreground">
                    Configure your space on the left and tap <span className="text-foreground font-medium">Design</span> to see a full itemized plan with Buy Now links.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`${room}-${style}-${budget}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="space-y-6"
                >
                  {/* Status banner */}
                  <div
                    className={`glass rounded-2xl p-5 flex items-start gap-4 border ${
                      plan.withinBudget
                        ? "border-primary/30"
                        : "border-warning/30"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      plan.withinBudget ? "bg-primary/15" : "bg-warning/15"
                    }`}>
                      {plan.withinBudget ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <AlertTriangle className="w-5 h-5 text-warning" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${plan.withinBudget ? "text-primary" : "text-warning"}`}>
                        {plan.withinBudget ? "Plan fits your budget" : "AI auto-optimized to fit budget"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Subtotal <span className="text-foreground font-medium">{fmtINR(plan.subtotal)}</span> · Budget <span className="text-foreground font-medium">{fmtINR(budget)}</span>
                        {plan.overBy > 0 && <span className="text-warning"> · still ₹{plan.overBy.toLocaleString("en-IN")} over — consider raising budget</span>}
                      </p>
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-muted-foreground">{plan.items.length} items</p>
                      <p className="font-display text-2xl text-gradient-gold">{fmtINR(plan.subtotal)}</p>
                    </div>
                  </div>

                  {/* Style notes */}
                  <div className="glass rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Style direction</p>
                    <ul className="grid md:grid-cols-3 gap-3">
                      {plan.styleNotes.map((n) => (
                        <li key={n} className="text-sm text-foreground/85 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Itemized breakdown */}
                  <div className="glass rounded-3xl p-6 md:p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-display text-lg flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" /> Itemized cost & Buy Links
                      </h3>
                      <p className="text-xs text-muted-foreground">Tap any item to buy</p>
                    </div>

                    <div className="space-y-3">
                      {plan.items.map((it, i) => (
                        <motion.a
                          key={it.id}
                          href={it.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="group block p-4 md:p-5 rounded-2xl bg-secondary/40 border border-border/50 hover:border-primary/40 hover:bg-secondary/60 transition-all"
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase tracking-wider text-accent font-medium">{it.category}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{it.retailer}</span>
                              </div>
                              <p className="font-medium text-foreground truncate">{it.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {it.material} · Qty {it.qty}{it.unit ? ` ${it.unit}` : ""} · {fmtINR(it.unitCost)}{it.unit ? `/${it.unit}` : ""}
                              </p>
                              {it.alternative && (
                                <p className="text-[11px] text-accent mt-2 flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" />
                                  Cheaper option: {it.alternative.name} — save ₹{it.alternative.saves.toLocaleString("en-IN")}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between md:flex-col md:items-end gap-2 md:gap-1">
                              <p className="font-display text-xl text-foreground">{fmtINR(it.totalCost)}</p>
                              <span className="inline-flex items-center gap-1.5 text-xs text-primary group-hover:translate-x-0.5 transition-transform">
                                Buy Now <ExternalLink className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        </motion.a>
                      ))}
                    </div>

                    {/* Subtotal row */}
                    <div className="mt-5 pt-5 border-t border-border/50 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total estimated cost</span>
                      <span className="font-display text-3xl text-gradient-gold">{fmtINR(plan.subtotal)}</span>
                    </div>
                  </div>

                  {/* Optimizations */}
                  {plan.optimizations.length > 0 && (
                    <div className="glass rounded-3xl p-6 md:p-7">
                      <h3 className="font-display text-lg flex items-center gap-2 mb-4">
                        <TrendingDown className="w-5 h-5 text-accent" /> Smart Optimizations
                      </h3>
                      <ul className="space-y-3">
                        {plan.optimizations.map((o, i) => (
                          <li key={i} className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/50">
                            <div>
                              <p className="text-sm font-medium">{o.item}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{o.suggestion}</p>
                            </div>
                            <span className="text-accent font-display text-lg shrink-0">−₹{o.saves.toLocaleString("en-IN")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

const Field = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
      {label}
    </div>
    {children}
  </div>
);

const PillBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
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

function Pills<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <PillBtn key={o.id} active={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </PillBtn>
      ))}
    </div>
  );
}
