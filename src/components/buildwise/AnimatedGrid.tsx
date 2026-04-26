export const AnimatedGrid = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 grid-bg animate-grid" />
    <div
      className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-40 animate-pulse-glow"
      style={{ background: "radial-gradient(circle, hsl(205 100% 55% / 0.45), transparent 60%)" }}
    />
    <div
      className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 animate-float-slow"
      style={{ background: "radial-gradient(circle, hsl(42 85% 55% / 0.3), transparent 60%)" }}
    />
  </div>
);
