import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Site-wide smooth scroll using Lenis.
 * Very subtle, Apple-like feel: short duration, gentle easing, minimal lerp.
 * Respects `prefers-reduced-motion` and disables on touch devices.
 */
export const SmoothScroll = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || isTouch) return;

    const lenis = new Lenis({
      duration: 1.05,
      // gentle ease-out-expo
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      lerp: 0.1,
      touchMultiplier: 1,
    });

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Pause Lenis when an element opts out (e.g. modals, 3D canvas)
    const onPause = () => lenis.stop();
    const onResume = () => lenis.start();
    window.addEventListener("lenis:stop", onPause);
    window.addEventListener("lenis:start", onResume);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("lenis:stop", onPause);
      window.removeEventListener("lenis:start", onResume);
      lenis.destroy();
    };
  }, []);

  return null;
};
