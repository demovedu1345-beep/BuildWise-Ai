import { motion } from "framer-motion";

const steps = [
  "Analyzing budget",
  "Planning layout",
  "Designing interior",
  "Rendering 3D model",
];

export const Loader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-2xl">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="text-center max-w-sm px-6"
    >
      <div className="relative w-20 h-20 mx-auto mb-10">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse-glow" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-primary/20 border-t-primary/80"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-3 rounded-full border border-accent/20 border-b-accent/70"
        />
        <div className="absolute inset-0 flex items-center justify-center font-display text-xl text-foreground">B</div>
      </div>

      <p className="font-display text-2xl tracking-tight text-foreground">
        Designing your home<span className="text-primary">.</span>
      </p>
      <p className="text-sm text-muted-foreground mt-2">A few moments while the AI gets it right.</p>

      <div className="mt-8 space-y-3 text-sm text-left max-w-xs mx-auto">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
            />
            <span className="text-foreground/80">{s}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);
