import { motion } from "framer-motion";
import { Sparkles, MapPin, Ruler, Target, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CITIES, GOALS, Goal, fmtINR } from "@/lib/buildwise";
import { AnimatedGrid } from "./AnimatedGrid";

interface Props {
  budget: number;
  setBudget: (n: number) => void;
  cityId: string;
  setCityId: (id: string) => void;
  plotSqft: number;
  setPlotSqft: (n: number) => void;
  goal: Goal;
  setGoal: (g: Goal) => void;
  onGenerate: () => void;
  loading: boolean;
}

export const HeroPlanner = ({
  budget, setBudget, cityId, setCityId, plotSqft, setPlotSqft, goal, setGoal, onGenerate, loading,
}: Props) => {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden noise">
      <AnimatedGrid />

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium tracking-wide text-accent"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI-POWERED HOME PLANNING
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight"
            >
              <span className="text-gradient-soft">Turn your budget into a</span>
              <br />
              <span className="text-gradient-hero">smart home plan.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed"
            >
              AI-powered cost estimation, planning, and 3D visualization — all in one place.
              Designed for the way modern homeowners build.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" /> Live planning engine</div>
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" /> 3D visualization</div>
            </motion.div>
          </div>

          {/* Right: planner card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-hero opacity-25 blur-2xl rounded-3xl" />
            <div className="relative glass-strong rounded-3xl p-7 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground tracking-widest">DESIGN STUDIO</p>
                  <h3 className="font-display text-xl mt-1">Plan your home</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow-blue">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <IndianRupee className="w-3 h-3" /> Budget
                  </label>
                  <span className="font-display text-2xl text-gradient-gold">{fmtINR(budget)}</span>
                </div>
                <Slider
                  value={[budget]}
                  min={1000000}
                  max={50000000}
                  step={100000}
                  onValueChange={(v) => setBudget(v[0])}
                  className="[&_[role=slider]]:bg-gradient-primary [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-[0_0_20px_hsl(205_100%_60%/0.6)] [&>span:first-child>span]:bg-gradient-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>₹10L</span><span>₹2.5Cr</span><span>₹5Cr</span>
                </div>
              </div>

              {/* City + Plot */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3 h-3" /> City
                  </label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    className="w-full bg-input/60 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Ruler className="w-3 h-3" /> Plot (sqft)
                  </label>
                  <input
                    type="number"
                    value={plotSqft || ""}
                    onChange={(e) => setPlotSqft(Number(e.target.value) || 0)}
                    placeholder="Optional"
                    className="w-full bg-input/60 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Goal */}
              <div className="mt-6">
                <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Target className="w-3 h-3" /> Goal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`relative px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        goal === g.id
                          ? "bg-gradient-primary text-primary-foreground shadow-[0_0_25px_hsl(205_100%_60%/0.4)]"
                          : "bg-input/40 border border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={onGenerate}
                disabled={loading}
                className="mt-7 w-full h-14 text-base font-medium bg-gradient-hero hover:opacity-90 transition-all rounded-2xl group relative overflow-hidden glow-blue"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
                  {loading ? "AI is designing your home..." : "Generate My Plan"}
                </span>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
