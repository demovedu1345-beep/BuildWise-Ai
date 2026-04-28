import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { AlertTriangle, Lightbulb, MapPin, Layers, Box, Wrench, TrendingDown, Check, Sparkles, Info, ShieldCheck, RefreshCcw } from "lucide-react";
import { Plan, fmtINR } from "@/lib/buildwise";
import { suggestAreas } from "@/lib/locations";
import { HouseModel } from "./HouseModel";

interface Props { plan: Plan; }

const card = "glass rounded-3xl p-6 md:p-7 hover-lift";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06 } }),
};

export const Dashboard = ({ plan }: Props) => {
  return (
    <section id="dashboard" className="relative py-20 md:py-28">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-12"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Your Plan</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            A <span className="text-gradient-hero">{plan.bhk}BHK</span> in {plan.city.name},
            <br />engineered to your budget.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            ~{plan.buildableSqft.toLocaleString("en-IN")} sqft
            <span className="text-foreground/60"> (range {plan.buildableSqftRange[0].toLocaleString("en-IN")}–{plan.buildableSqftRange[1].toLocaleString("en-IN")} sqft)</span>
            {" · "}
            ₹{plan.rateRange[0].toLocaleString("en-IN")}–₹{plan.rateRange[1].toLocaleString("en-IN")}/sqft
            {" · "}{plan.goal.label}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Confidence: {plan.confidence}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-border/60 bg-secondary/40 text-muted-foreground">
              Ceiling {plan.ceilingHeightM} m · Walls {plan.wallThicknessMm} mm
            </span>
            <span className="px-2.5 py-1 rounded-full border border-border/60 bg-secondary/40 text-muted-foreground">
              Estimates ±10–15% — see assumptions
            </span>
          </div>
        </motion.div>

        {/* Auto-corrections — what the AI fixed and why */}
        {plan.corrections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 glass rounded-2xl p-5 border border-accent/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                <RefreshCcw className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="font-medium text-accent">AI auto-corrections</p>
                <p className="text-xs text-muted-foreground">Adjusted to keep the plan realistic and buildable.</p>
              </div>
            </div>
            <ul className="space-y-2">
              {plan.corrections.map((c, i) => (
                <li key={i} className="text-sm text-foreground/85 flex gap-2 leading-relaxed">
                  <span className="text-accent mt-1">•</span>{c}
                </li>
              ))}
            </ul>
          </motion.div>
        )}


        {/* Warnings */}
        {plan.warnings.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 glass rounded-2xl p-5 border border-warning/30 flex gap-4"
            style={{ background: "linear-gradient(145deg, hsl(35 95% 50% / 0.08), hsl(0 75% 50% / 0.05))" }}
          >
            <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-warning mb-1">Reality check</p>
              <p className="text-sm text-muted-foreground">{w}</p>
            </div>
          </motion.div>
        ))}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Budget breakdown */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={card}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Budget Breakdown</h3>
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div className="h-52 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={plan.breakdown}
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {plan.breakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground tracking-wider">TOTAL</span>
                <span className="font-display text-2xl text-gradient-gold mt-0.5">{fmtINR(plan.totalBudget)}</span>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {plan.breakdown.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{d.pct}%</span>
                    <span className="font-medium">{fmtINR(d.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Smart recommendations */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={card}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Smart Recommendations</h3>
              <Lightbulb className="w-5 h-5 text-accent" />
            </div>
            <ul className="space-y-3">
              {plan.recommendations.map((r, i) => (
                <li key={i} className="flex gap-3 p-3 rounded-xl bg-secondary/40 border border-border/50">
                  <div className="w-7 h-7 rounded-lg bg-gradient-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{r}</p>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Quick locations summary */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={card}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Top Areas Snapshot</h3>
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              {plan.locations.map((loc) => {
                const tone =
                  loc.fit === "good" ? "text-primary border-primary/30 bg-primary/10"
                  : loc.fit === "tight" ? "text-warning border-warning/30 bg-warning/10"
                  : "text-destructive border-destructive/30 bg-destructive/10";
                const label = loc.fit === "good" ? "Fits budget" : loc.fit === "tight" ? "Tight fit" : "Over budget";
                return (
                  <div key={loc.area} className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">{loc.area}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tone}`}>{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg <span className="text-foreground font-medium">{fmtINR(loc.pricePerSqft)}</span>/sqft
                    </p>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground pt-1">See detailed areas below ↓</p>
            </div>
          </motion.div>

          {/* Floor plan */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={`${card} lg:col-span-1`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Floor Plan</h3>
              <span className="text-xs text-muted-foreground">{plan.bhk}BHK · 2D</span>
            </div>
            <div className="relative aspect-[10/7] rounded-2xl bg-background/60 border border-border overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-40" />
              {plan.rooms.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="absolute rounded-lg border border-primary/30 flex items-center justify-center text-[10px] md:text-xs font-medium text-foreground/80 backdrop-blur-sm"
                  style={{
                    left: `${r.x}%`, top: `${r.y}%`,
                    width: `${r.w}%`, height: `${r.h}%`,
                    background: r.color,
                  }}
                >
                  {r.name}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 3D model — span 2 */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={`${card} lg:col-span-2`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Box className="w-5 h-5 text-primary" /> 3D Visualization
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Drag to orbit · scroll to zoom</p>
              </div>
              <div className="text-xs text-muted-foreground">Live · WebGL</div>
            </div>
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-border">
              <HouseModel bhk={plan.bhk} sqft={plan.buildableSqft} />
              <div className="absolute top-3 left-3 glass-strong rounded-lg px-3 py-1.5 text-xs">
                {plan.bhk}BHK · {plan.buildableSqft.toLocaleString("en-IN")} sqft
              </div>
            </div>
          </motion.div>

          {/* Materials optimization */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={`${card} lg:col-span-3`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-accent" /> Material Optimization
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Smart swaps to stretch your budget further</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total potential savings</p>
                <p className="font-display text-2xl text-gradient-gold">
                  {fmtINR(plan.materials.reduce((s, m) => s + m.saves, 0))}
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {plan.materials.map((m) => (
                <div key={m.item} className="p-5 rounded-2xl bg-secondary/40 border border-border/50 hover-lift">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{m.item}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-muted-foreground">{m.from}</span>
                    <span>→</span>
                    <span className="font-medium text-foreground">{m.to}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-accent">
                    <TrendingDown className="w-4 h-4" />
                    <span className="font-display text-lg">Save {fmtINR(m.saves)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Detailed Area Intelligence */}
          <DetailedAreas plan={plan} />
        </div>
      </div>
    </section>
  );
};

const DetailedAreas = ({ plan }: { plan: Plan }) => {
  const suggestions = suggestAreas(plan.city.id, plan.totalBudget, plan.buildableSqft);
  if (suggestions.length === 0) return null;

  return (
    <motion.div
      custom={6}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className={`${card} lg:col-span-3`}
    >
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Detailed Area Intelligence — {plan.city.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            AI-ranked locations with price ranges, advantages and budget fit for your {plan.buildableSqft.toLocaleString("en-IN")} sqft build
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <Legend color="primary" label="Fits" />
          <Legend color="warning" label="Tight" />
          <Legend color="destructive" label="Over" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {suggestions.map((a) => {
          const tone =
            a.fit === "good" ? "border-primary/30 bg-primary/5"
            : a.fit === "tight" ? "border-warning/30 bg-warning/5"
            : "border-destructive/30 bg-destructive/5";
          const chip =
            a.fit === "good" ? "text-primary bg-primary/10 border-primary/30"
            : a.fit === "tight" ? "text-warning bg-warning/10 border-warning/30"
            : "text-destructive bg-destructive/10 border-destructive/30";
          const label = a.fit === "good" ? "Fits budget" : a.fit === "tight" ? "Tight fit" : "Over budget";
          return (
            <div key={a.name} className={`p-5 rounded-2xl border ${tone} hover-lift`}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div>
                  <p className="font-medium text-foreground">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.bestFor}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${chip}`}>{label}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-background/40 border border-border/40">
                  <p className="text-muted-foreground">Price / sqft</p>
                  <p className="font-medium mt-0.5">
                    ₹{a.minPsf.toLocaleString("en-IN")} – ₹{a.maxPsf.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background/40 border border-border/40">
                  <p className="text-muted-foreground">Est. for {plan.buildableSqft.toLocaleString("en-IN")} sqft</p>
                  <p className="font-medium mt-0.5">{fmtINR(a.estTotalForSqft)}</p>
                </div>
              </div>

              <p className="text-xs text-foreground/85 mt-3 leading-relaxed">{a.reasoning}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.advantages.map((adv) => (
                  <span key={adv} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 border border-border/50 text-foreground/80">
                    {adv}
                  </span>
                ))}
              </div>

              {a.fit !== "over" && (
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-[11px] text-accent">
                  <Sparkles className="w-3 h-3" />
                  AI pick: shortlist this area
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const Legend = ({ color, label }: { color: "primary" | "warning" | "destructive"; label: string }) => {
  const dot = color === "primary" ? "bg-primary" : color === "warning" ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/40 border border-border/50">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
};
