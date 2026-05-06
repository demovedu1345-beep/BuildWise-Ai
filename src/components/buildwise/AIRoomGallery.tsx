import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, RefreshCw, Sparkles, Wand2, Zap, Crown, Image as ImageIcon, AlertTriangle, Maximize2, X,
} from "lucide-react";
import { invokeFn } from "@/lib/invokeFn";
import { RoomBlueprint } from "@/lib/studio";
import { RoomImagePreview } from "./RoomImagePreview";
import type { StudioPlan } from "@/lib/studio";

type Angle = "iso" | "front" | "back" | "left" | "right";
type Quality = "fast" | "pro";

const ANGLES: { id: Angle; label: string }[] = [
  { id: "iso", label: "Isometric" },
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "left", label: "Left side" },
  { id: "right", label: "Right side" },
];

interface CacheEntry {
  url: string;
  hash: string;
  quality: Quality;
}

interface Props {
  plan: StudioPlan;
  blueprint: RoomBlueprint;
  night: boolean;
}

export const AIRoomGallery = ({ plan, blueprint, night }: Props) => {
  const [quality, setQuality] = useState<Quality>("fast");
  const [userPrompt, setUserPrompt] = useState("");
  const [activeAngle, setActiveAngle] = useState<Angle>("iso");
  const [loading, setLoading] = useState<Record<Angle, boolean>>({
    iso: false, front: false, back: false, left: false, right: false,
  });
  const [errors, setErrors] = useState<Record<Angle, string | null>>({
    iso: null, front: null, back: null, left: null, right: null,
  });
  // Cache keyed by `${angle}-${hash}-${quality}-${promptHash}`
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  const promptHash = useMemo(() => simpleHash(userPrompt.trim().toLowerCase()), [userPrompt]);

  const cacheKey = useCallback(
    (angle: Angle) => `${angle}-${blueprint.hash}-${quality}-${promptHash}`,
    [blueprint.hash, quality, promptHash],
  );

  const inFlight = useRef<Set<string>>(new Set());

  const fetchAngle = useCallback(
    async (angle: Angle, force = false) => {
      const key = cacheKey(angle);
      if (!force && cache[key]) return;
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      setLoading((p) => ({ ...p, [angle]: true }));
      setErrors((p) => ({ ...p, [angle]: null }));
      try {
        const data = await invokeFn<{ imageUrl?: string }>("generate-room-image", {
          blueprint,
          angle,
          quality,
          userPrompt,
          seed: force ? Math.floor(Math.random() * 1e9) : undefined,
        });
        const url = data?.imageUrl;
        if (!url) throw new Error("No image returned");
        setCache((prev) => ({ ...prev, [key]: { url, hash: blueprint.hash, quality } }));
      } catch (e: any) {
        const msg = e?.message ?? "Failed to generate image";
        setErrors((p) => ({ ...p, [angle]: msg }));
      } finally {
        inFlight.current.delete(key);
        setLoading((p) => ({ ...p, [angle]: false }));
      }
    },
    [blueprint, quality, userPrompt, cache, cacheKey],
  );

  // Auto-fetch the active angle whenever blueprint/quality/prompt changes.
  useEffect(() => {
    fetchAngle(activeAngle, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAngle, blueprint.hash, quality, promptHash]);

  const regenerateAll = useCallback(() => {
    ANGLES.forEach((a) => fetchAngle(a.id, true));
  }, [fetchAngle]);

  const activeKey = cacheKey(activeAngle);
  const activeImage = cache[activeKey];
  const activeLoading = loading[activeAngle];
  const activeError = errors[activeAngle];

  return (
    <div className="relative w-full h-full flex flex-col bg-background/40">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/40 bg-background/60 backdrop-blur-md z-10">
        {/* Angle tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          {ANGLES.map((a) => {
            const cached = !!cache[cacheKey(a.id)];
            const isActive = activeAngle === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setActiveAngle(a.id)}
                className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {a.label}
                {cached && <span className="w-1 h-1 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        {/* Quality toggle */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 ml-auto">
          <button
            onClick={() => setQuality("fast")}
            className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              quality === "fast"
                ? "bg-accent/20 text-accent border border-accent/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Faster, good quality (Lovable AI)"
          >
            <Zap className="w-3 h-3" /> Fast
          </button>
          <button
            onClick={() => setQuality("pro")}
            className={`press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              quality === "pro"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Best quality, slower (Lovable AI Pro)"
          >
            <Crown className="w-3 h-3" /> Pro
          </button>
        </div>

        <button
          onClick={regenerateAll}
          className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition"
        >
          <RefreshCw className="w-3 h-3" /> Regenerate all
        </button>
      </div>

      {/* Custom prompt */}
      <div className="px-3 pt-3 pb-2 border-b border-border/30 bg-background/40 z-10">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
          <Wand2 className="w-3 h-3 text-accent" /> Personalize this room (optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder='e.g. "warm wood floor, large painting on back wall, indoor plants near window"'
            className="flex-1 bg-input/60 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={() => fetchAngle(activeAngle, true)}
            disabled={activeLoading}
            className="press px-3 py-2 rounded-xl bg-accent/15 border border-accent/40 text-accent text-[11px] font-medium hover:bg-accent/25 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" /> Apply
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div className="relative flex-1 min-h-[420px] overflow-hidden">
        {/* Always render SVG preview as base layer (instant, structurally exact) */}
        <div className="absolute inset-0">
          <RoomImagePreview plan={plan} night={night} blueprint={blueprint} />
        </div>

        {/* AI image overlay */}
        <AnimatePresence mode="wait">
          {activeImage && !activeLoading && (
            <motion.img
              key={activeImage.url}
              src={activeImage.url}
              alt={`AI rendered ${plan.input.style} ${plan.input.room} — ${activeAngle} view`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </AnimatePresence>

        {/* Loading overlay */}
        {activeLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">
                Rendering {ANGLES.find((a) => a.id === activeAngle)?.label.toLowerCase()} view…
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {quality === "pro" ? "Pro quality (slower)" : "Fast preview"} · synced to blueprint #{blueprint.hash}
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {activeError && !activeLoading && (
          <div className="absolute bottom-4 left-4 right-4 z-20 glass-strong rounded-xl p-3 border border-warning/40 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-warning">Couldn't render this view</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{activeError}</p>
            </div>
            <button
              onClick={() => fetchAngle(activeAngle, true)}
              className="press text-[11px] px-2 py-1 rounded-lg bg-warning/15 border border-warning/40 text-warning hover:bg-warning/25 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top-left badge */}
        <div className="absolute top-3 left-3 glass-strong rounded-full px-3 py-1.5 text-[11px] flex items-center gap-2 z-10">
          <ImageIcon className="w-3 h-3 text-primary" />
          AI Render · {ANGLES.find((a) => a.id === activeAngle)?.label}
          {activeImage && (
            <span className="text-muted-foreground">· {quality === "pro" ? "Pro" : "Fast"}</span>
          )}
        </div>

        {/* Bottom-right per-angle regen */}
        {activeImage && !activeLoading && (
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
            <button
              onClick={() => setLightbox(activeImage.url)}
              className="press w-9 h-9 rounded-xl glass-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition"
              title="Expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchAngle(activeAngle, true)}
              className="press flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 border border-primary/40 text-primary text-[11px] font-medium hover:bg-primary/25 transition"
            >
              <RefreshCw className="w-3 h-3" /> New variation
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="grid grid-cols-5 gap-1.5 p-2 border-t border-border/40 bg-background/60">
        {ANGLES.map((a) => {
          const entry = cache[cacheKey(a.id)];
          const isActive = activeAngle === a.id;
          const isLoading = loading[a.id];
          return (
            <button
              key={a.id}
              onClick={() => setActiveAngle(a.id)}
              className={`relative aspect-video rounded-lg overflow-hidden border transition-all ${
                isActive ? "border-primary/60 ring-2 ring-primary/30" : "border-border/40 hover:border-primary/30"
              }`}
            >
              {entry ? (
                <img src={entry.url} alt={a.label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/40">
                  <ImageIcon className="w-3 h-3 text-muted-foreground/50" />
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                </div>
              )}
              <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center py-0.5 bg-background/70 backdrop-blur-sm">
                {a.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-xl glass-strong flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Expanded view" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}
