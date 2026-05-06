import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Sparkles, Loader2, X, Check, IndianRupee, MapPin, Wand2, ShoppingBag,
  ExternalLink, RefreshCw, Image as ImageIcon, Palette, Eye, Crown, Zap, Camera,
  ChevronRight, Trash2, AlertTriangle, PieChart,
} from "lucide-react";
import { invokeFn } from "@/lib/invokeFn";
import {
  RoomAnalysis, DecorProduct, computeCost, ROOM_TYPES, STYLES, COLOR_THEMES,
} from "@/lib/decorator";
import { LocationAutocomplete, LocationValue } from "./LocationAutocomplete";

type Step = "upload" | "preferences" | "generating" | "result";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const RoomDecorator = () => {
  const [step, setStep] = useState<Step>("upload");
  const [images, setImages] = useState<string[]>([]); // data urls
  const [hint, setHint] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);

  const [roomPurpose, setRoomPurpose] = useState("living");
  const [style, setStyle] = useState("modern");
  const [colorTheme, setColorTheme] = useState("warm-neutrals");
  const [budget, setBudget] = useState(150000);
  const [location, setLocation] = useState<LocationValue>({ query: "" });
  const [userPrompt, setUserPrompt] = useState("");
  const [quality, setQuality] = useState<"fast" | "pro">("pro");

  const [redesigning, setRedesigning] = useState(false);
  const [redesignedImage, setRedesignedImage] = useState<string | null>(null);
  const [products, setProducts] = useState<DecorProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) setImages((p) => [...p, url].slice(0, 5));
      };
      reader.readAsDataURL(f);
    });
  }, []);

  const removeImage = (i: number) => setImages((p) => p.filter((_, idx) => idx !== i));

  const analyze = async () => {
    if (images.length === 0) return;
    setAnalyzing(true); setError(null);
    try {
      const data = await invokeFn<{ analysis: RoomAnalysis }>("analyze-room", { images, hint });
      setAnalysis(data.analysis);
      setRoomPurpose(data.analysis.room_type === "other" ? "living" : data.analysis.room_type);
      setStep("preferences");
    } catch (e: any) {
      setError(e?.message ?? "Failed to analyze room");
    } finally {
      setAnalyzing(false);
    }
  };

  const generate = async () => {
    if (!analysis) return;
    setStep("generating"); setRedesigning(true); setProductsLoading(true); setError(null);
    setRedesignedImage(null); setProducts([]);
    try {
      const colorLabel = COLOR_THEMES.find((c) => c.id === colorTheme)?.label ?? colorTheme;
      // Run image regen + product suggestion in parallel
      const [imgRes, prodRes] = await Promise.all([
        supabase.functions.invoke("redesign-room", {
          body: {
            sourceImage: images[0],
            analysis, style, colorTheme: colorLabel,
            roomPurpose, budgetTier: budget < 80000 ? "saving" : budget > 300000 ? "premium" : "balanced",
            userPrompt, quality,
          },
        }),
        supabase.functions.invoke("suggest-products", {
          body: { analysis, style, roomPurpose, budget, location: (location.city || location.query), colorTheme: colorLabel, userPrompt },
        }),
      ]);
      if (imgRes.error) throw imgRes.error;
      if (imgRes.data?.error) throw new Error(imgRes.data.error);
      setRedesignedImage(imgRes.data.imageUrl);

      if (prodRes.error) console.error(prodRes.error);
      else if (prodRes.data?.error) console.error(prodRes.data.error);
      else setProducts(prodRes.data.products || []);

      setStep("result");
    } catch (e: any) {
      setError(e?.message ?? "Generation failed");
      setStep("preferences");
    } finally {
      setRedesigning(false); setProductsLoading(false);
    }
  };

  const regenerateImage = async () => {
    if (!analysis) return;
    setRedesigning(true); setError(null);
    try {
      const colorLabel = COLOR_THEMES.find((c) => c.id === colorTheme)?.label ?? colorTheme;
      const { data, error } = await supabase.functions.invoke("redesign-room", {
        body: {
          sourceImage: images[0], analysis, style, colorTheme: colorLabel,
          roomPurpose, budgetTier: "balanced", userPrompt, quality,
          seed: Math.floor(Math.random() * 1e9),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRedesignedImage(data.imageUrl);
    } catch (e: any) {
      setError(e?.message ?? "Regeneration failed");
    } finally { setRedesigning(false); }
  };

  const cost = useMemo(() => {
    const area = analysis ? analysis.dimensions.width * analysis.dimensions.length : 18;
    return computeCost(products, budget, area, (location.city || location.query), analysis?.condition ?? "good");
  }, [products, budget, location, analysis]);

  const reset = () => {
    setStep("upload"); setImages([]); setAnalysis(null); setRedesignedImage(null);
    setProducts([]); setError(null); setUserPrompt("");
  };

  return (
    <section id="decorator" className="relative py-24 px-6 border-t border-border/40">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-primary mb-4">
              <Sparkles className="w-3 h-3" /> AI Room Decorator · Real Products · Real Costs
            </span>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Upload your room. <span className="text-gradient">See it redesigned.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Snap any room, pick your style, and get a photorealistic redesign with shoppable Indian products and accurate costs by city.
            </p>
          </motion.div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {(["upload", "preferences", "generating", "result"] as Step[]).map((s, i) => {
            const active = step === s;
            const done = (["upload", "preferences", "generating", "result"].indexOf(step) > i);
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all
                  ${active ? "bg-primary text-primary-foreground border-primary scale-110" : done ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary/40 text-muted-foreground border-border"}`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden md:inline capitalize ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
                {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="glass-strong rounded-xl p-4 mb-6 border border-warning/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1"><p className="text-sm font-medium text-warning">{error}</p></div>
            <button onClick={() => setError(null)} className="text-warning/70 hover:text-warning"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* STEP: UPLOAD */}
        {step === "upload" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-8">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-primary/5"
            >
              <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">Upload room photos</h3>
              <p className="text-sm text-muted-foreground mb-4">Drop up to 5 photos (front, sides, corners). JPG / PNG.</p>
              <button className="btn-primary inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm">
                <Camera className="w-4 h-4" /> Choose photos
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => onFiles(e.target.files)} />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                {images.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                    <img src={src} alt={`Room ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Anything we should know? (optional)</label>
              <input value={hint} onChange={(e) => setHint(e.target.value)}
                placeholder='e.g. "small balcony to the left, low ceiling, kids will use this room"'
                className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={analyze} disabled={images.length === 0 || analyzing}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing room…</>
                  : <><Sparkles className="w-4 h-4" /> Analyze room</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP: PREFERENCES */}
        {step === "preferences" && analysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-3 gap-6">
            {/* Analysis card */}
            <div className="glass rounded-2xl p-6 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Room analysis</h3>
              </div>
              <img src={images[0]} alt="Your room" className="w-full aspect-video object-cover rounded-xl mb-4 border border-border" />
              <dl className="space-y-2 text-sm">
                <Row k="Detected as" v={analysis.room_type} />
                <Row k="Dimensions" v={`${analysis.dimensions.width}×${analysis.dimensions.length}×${analysis.dimensions.height} m`} />
                <Row k="Walls" v={analysis.wall_color} />
                <Row k="Floor" v={analysis.floor_type} />
                <Row k="Lighting" v={analysis.lighting} />
                <Row k="Style now" v={analysis.current_style} />
                <Row k="Condition" v={analysis.condition} />
              </dl>
              {analysis.existing_objects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Existing objects ({analysis.existing_objects.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.existing_objects.slice(0, 12).map((o, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60">{o.type}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preferences */}
            <div className="glass rounded-2xl p-6 lg:col-span-2 space-y-6">
              <div>
                <Label icon={<Wand2 className="w-3 h-3" />}>Room purpose</Label>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mt-2">
                  {ROOM_TYPES.map((r) => (
                    <Chip key={r.id} active={roomPurpose === r.id} onClick={() => setRoomPurpose(r.id)}>
                      <span className="mr-1">{r.emoji}</span>{r.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <Label icon={<Sparkles className="w-3 h-3" />}>Design style</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {STYLES.map((s) => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${style === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label icon={<Palette className="w-3 h-3" />}>Color theme</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
                  {COLOR_THEMES.map((c) => (
                    <button key={c.id} onClick={() => setColorTheme(c.id)}
                      className={`p-2 rounded-xl border transition-all ${colorTheme === c.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                      <div className="flex gap-1 mb-1">
                        {c.swatches.map((sw) => <div key={sw} className="flex-1 h-5 rounded" style={{ background: sw }} />)}
                      </div>
                      <p className="text-[10px] font-medium">{c.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label icon={<IndianRupee className="w-3 h-3" />}>Budget · {formatINR(budget)}</Label>
                  <input type="range" min={30000} max={1000000} step={5000} value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-primary mt-2" />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>₹30k</span><span>₹10L</span>
                  </div>
                </div>
                <div>
                  <Label icon={<MapPin className="w-3 h-3" />}>Your city / area</Label>
                  <div className="mt-2"><LocationAutocomplete value={location} onChange={setLocation} /></div>
                </div>
              </div>

              <div>
                <Label icon={<Wand2 className="w-3 h-3" />}>Personalize (optional)</Label>
                <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder='e.g. "I love indoor plants, need a reading nook, my partner prefers warm wood"'
                  rows={2}
                  className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm mt-2 focus:outline-none focus:border-primary resize-none" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 glass rounded-xl p-1">
                  <button onClick={() => setQuality("fast")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium ${quality === "fast" ? "bg-accent/20 text-accent border border-accent/40" : "text-muted-foreground"}`}>
                    <Zap className="w-3 h-3" /> Fast
                  </button>
                  <button onClick={() => setQuality("pro")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium ${quality === "pro" ? "bg-primary/20 text-primary border border-primary/40" : "text-muted-foreground"}`}>
                    <Crown className="w-3 h-3" /> Pro
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={reset} className="px-4 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary/40">Restart</button>
                  <button onClick={generate}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium">
                    <Sparkles className="w-4 h-4" /> Redesign my room
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP: GENERATING */}
        {step === "generating" && (
          <div className="glass rounded-3xl p-12 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">Designing your new room…</h3>
            <p className="text-sm text-muted-foreground">Generating photoreal render and matching real products.</p>
          </div>
        )}

        {/* STEP: RESULT */}
        {step === "result" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Before / After */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-4 py-2 text-xs font-medium border-b border-border/40 flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" /> Before
                </div>
                <img src={images[0]} alt="Before" className="w-full aspect-video object-cover" />
              </div>
              <div className="glass rounded-2xl overflow-hidden relative">
                <div className="px-4 py-2 text-xs font-medium border-b border-border/40 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" /> After · {STYLES.find((s) => s.id === style)?.label}
                </div>
                <div className="relative aspect-video bg-secondary/40">
                  {redesignedImage && (
                    <img src={redesignedImage} alt="Redesigned room" className="w-full h-full object-cover" />
                  )}
                  {redesigning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Refinement bar */}
            <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <input value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)}
                placeholder='Refine: "darker wood floor", "add a green velvet sofa", "remove the chandelier"…'
                className="flex-1 bg-input/60 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              <div className="flex gap-2">
                <button onClick={regenerateImage} disabled={redesigning}
                  className="press inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 border border-primary/40 text-primary text-sm font-medium disabled:opacity-50">
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <button onClick={() => setStep("preferences")}
                  className="press px-4 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary/40">
                  Edit prefs
                </button>
              </div>
            </div>

            {/* Cost summary */}
            <div className="grid md:grid-cols-4 gap-3">
              <Stat label="Total estimate" value={formatINR(cost.total)} accent={cost.withinBudget ? "good" : "warn"} />
              <Stat label="Your budget" value={formatINR(budget)} />
              <Stat label="Products" value={formatINR(cost.productsSubtotal)} />
              <Stat label="Labor + install" value={formatINR(cost.laborEstimate + cost.deliveryInstall)} />
            </div>

            {/* Products */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Shoppable products ({products.length})</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  Region: {(location.city || location.query) || "India"} · {(cost.regionalMultiplier * 100).toFixed(0)}% pricing
                </span>
              </div>
              {productsLoading && (
                <div className="py-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              )}
              {!productsLoading && products.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No products yet.</p>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((p) => (
                  <a key={p.id} href={p.buyUrl} target="_blank" rel="noopener noreferrer"
                    className="group glass-strong rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-all">
                    <div className="aspect-video bg-secondary/40 relative overflow-hidden">
                      <img src={p.imageUrl} alt={p.name} loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-background/80 backdrop-blur">{p.category}</span>
                      <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/80 text-primary-foreground backdrop-blur">{p.retailer}</span>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.brand}</p>
                      <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.why}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                        <span className="font-semibold text-primary">{formatINR(p.price_inr * p.qty)}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-primary group-hover:underline">
                          Buy <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button onClick={reset} className="px-6 py-2.5 rounded-xl text-sm border border-border hover:bg-secondary/40">
                Decorate another room
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted-foreground">{k}</dt>
    <dd className="font-medium text-right capitalize">{v}</dd>
  </div>
);

const Label = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
    {icon} {children}
  </label>
);

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className={`text-xs px-2.5 py-2 rounded-xl border whitespace-nowrap transition ${
      active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"
    }`}>{children}</button>
);

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: "good" | "warn" }) => (
  <div className={`glass rounded-xl p-4 border ${accent === "good" ? "border-primary/40" : accent === "warn" ? "border-warning/40" : "border-border"}`}>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-lg font-bold mt-1 ${accent === "good" ? "text-primary" : accent === "warn" ? "text-warning" : ""}`}>{value}</p>
  </div>
);
