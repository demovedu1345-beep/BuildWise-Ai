import { motion } from "framer-motion";

const steps = [
  "Analyzing your budget",
  "Mapping local cost data",
  "Optimizing room layout",
  "Rendering 3D model",
];

export const Loader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 rounded-2xl bg-gradient-hero opacity-30 blur-2xl animate-pulse-glow" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-2xl border-2 border-primary/40 border-t-primary"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-3 rounded-xl border-2 border-accent/40 border-b-accent"
        />
        <div className="absolute inset-0 flex items-center justify-center font-display text-2xl text-gradient-hero">B</div>
      </div>
      <p className="font-display text-2xl text-gradient-soft">AI is designing your home...</p>
      <div className="mt-6 space-y-1.5 text-sm text-muted-foreground">
        {steps.map((s, i) => (
          <motion.p
            key={s}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.4 }}
          >
            <span className="text-primary mr-2">●</span>{s}
          </motion.p>
        ))}
      </div>
    </motion.div>
  </div>
);
