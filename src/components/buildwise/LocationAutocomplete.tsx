import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, X } from "lucide-react";

export interface LocationValue {
  query: string;
  city?: string;
  area?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

interface NomResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface Props {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}

/**
 * Free location autocomplete powered by OpenStreetMap Nominatim.
 * No API key required. Debounced. Provides city + area-level granularity.
 */
export const LocationAutocomplete = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NomResult[]>([]);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleQuery = (q: string) => {
    onChange({ ...value, query: q });
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const data: NomResult[] = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const pick = (r: NomResult) => {
    const a = r.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.county;
    const area = a.suburb ?? a.neighbourhood;
    onChange({
      query: r.display_name,
      city,
      area,
      state: a.state,
      country: a.country,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    });
    setOpen(false);
  };

  const clear = () => {
    onChange({ query: "" });
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
        <MapPin className="w-3 h-3" /> Exact location (city + area)
      </label>
      <div className="relative">
        <input
          type="text"
          value={value.query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="e.g. Whitefield, Bangalore"
          className="w-full bg-input/60 border border-border rounded-xl pl-3 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          {loading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          ) : value.query ? (
            <button
              type="button"
              onClick={clear}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 left-0 right-0 max-h-72 overflow-y-auto glass-strong rounded-xl border border-border/60 shadow-xl">
          {results.map((r, i) => {
            const a = r.address ?? {};
            const primary =
              a.suburb ?? a.neighbourhood ?? a.city ?? a.town ?? a.village ?? r.display_name.split(",")[0];
            const secondary = [a.city ?? a.town ?? a.village, a.state, a.country]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(r)}
                className="w-full text-left px-3 py-2 hover:bg-primary/10 transition border-b border-border/30 last:border-0"
              >
                <p className="text-sm font-medium truncate">{primary}</p>
                <p className="text-[11px] text-muted-foreground truncate">{secondary || r.display_name}</p>
              </button>
            );
          })}
        </div>
      )}

      {value.city && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse-glow" />
          Locked to <span className="text-foreground font-medium">{value.area ? `${value.area}, ` : ""}{value.city}</span>
          {value.lat != null && (
            <span className="text-muted-foreground/70">
              · {value.lat.toFixed(3)}, {value.lng?.toFixed(3)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
