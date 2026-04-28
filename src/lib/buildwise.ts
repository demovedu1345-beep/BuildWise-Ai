// BuildWise AI — realistic planning engine
// All ranges based on India construction averages (2024–2026).
// Sources of estimates are documented inline so the UI can surface them.

export type Goal = "family" | "rental" | "luxury";

// Realistic city base rates (₹/sqft, mid-range residential, finished build).
// Each city carries a min/max band — rates are NEVER claimed as exact.
export interface CityInfo {
  id: string;
  name: string;
  rateMin: number;   // ₹/sqft floor
  rateMax: number;   // ₹/sqft ceiling
  rate: number;      // mid (kept for back-compat)
  mult: number;
}

export const CITIES: CityInfo[] = [
  { id: "bangalore", name: "Bangalore",   rateMin: 1900, rateMax: 2900, rate: 2400, mult: 1.15 },
  { id: "mumbai",    name: "Mumbai",      rateMin: 2700, rateMax: 3800, rate: 3200, mult: 1.45 },
  { id: "delhi",     name: "Delhi NCR",   rateMin: 2100, rateMax: 3100, rate: 2600, mult: 1.20 },
  { id: "hyderabad", name: "Hyderabad",   rateMin: 1700, rateMax: 2500, rate: 2100, mult: 1.00 },
  { id: "pune",      name: "Pune",        rateMin: 1900, rateMax: 2700, rate: 2300, mult: 1.10 },
  { id: "chennai",   name: "Chennai",     rateMin: 1800, rateMax: 2600, rate: 2200, mult: 1.05 },
];

export const GOALS: { id: Goal; label: string; rateMult: number }[] = [
  { id: "family", label: "Family Home", rateMult: 1.0 },
  { id: "rental", label: "Rental Unit", rateMult: 0.85 },
  { id: "luxury", label: "Luxury Villa", rateMult: 1.55 },
];

export interface PlanInput {
  budget: number;
  cityId: string;
  plotSqft: number;
  goal: Goal;
}

export interface BreakdownItem {
  name: string;
  value: number;
  pct: number;
  color: string;
  detail: string; // "what's included" — transparency
}

export interface Plan {
  totalBudget: number;
  ratePerSqft: number;          // mid estimate
  rateRange: [number, number];  // realistic band
  buildableSqft: number;
  buildableSqftRange: [number, number];
  bhk: number;
  city: CityInfo;
  goal: typeof GOALS[number];
  breakdown: BreakdownItem[];
  rooms: { name: string; w: number; h: number; x: number; y: number; color: string; sqft: number }[];
  recommendations: string[];
  warnings: string[];
  corrections: string[];        // what AI auto-fixed and why
  locations: { area: string; pricePerSqft: number; fit: "good" | "tight" | "over" }[];
  materials: { item: string; from: string; to: string; saves: number }[];
  // Realistic-architecture metadata
  ceilingHeightM: number;
  wallThicknessMm: number;
  // Trust signals
  confidence: "high" | "medium" | "low";
  assumptions: string[];
}

const fmtINR = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)} Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)} L`
    : `₹${Math.round(n).toLocaleString("en-IN")}`;
export { fmtINR };

// Realistic architectural ranges (sqft) used for room sizing.
const ROOM_RANGES = {
  bedroom: { min: 100, max: 180 },
  master:  { min: 140, max: 220 },
  living:  { min: 120, max: 250 },
  kitchen: { min: 70,  max: 120 },
  bath:    { min: 35,  max: 60 },
  dining:  { min: 80,  max: 140 },
} as const;

export function generatePlan(input: PlanInput): Plan {
  const city = CITIES.find((c) => c.id === input.cityId) ?? CITIES[0];
  const goal = GOALS.find((g) => g.id === input.goal) ?? GOALS[0];
  const corrections: string[] = [];
  const warnings: string[] = [];
  const assumptions: string[] = [];

  // Mid + range rates with goal multiplier
  const rateMin = Math.round(city.rateMin * goal.rateMult);
  const rateMax = Math.round(city.rateMax * goal.rateMult);
  const ratePerSqft = Math.round((rateMin + rateMax) / 2);

  // Buildable area band — show user a realistic range, not a fake exact number
  const sqftMax = Math.floor(input.budget / rateMin);
  const sqftMin = Math.floor(input.budget / rateMax);
  let buildableSqft = Math.floor(input.budget / ratePerSqft);

  // Hard floor — anything < 250 sqft is unrealistic
  if (buildableSqft < 250) {
    corrections.push(
      `Budget supports ~${buildableSqft} sqft, below the realistic minimum of 250 sqft. Showing a 250 sqft studio layout — actual cost will exceed your budget at this size in ${city.name}.`
    );
    buildableSqft = 250;
  }

  // Decide BHK from buildable area (realistic sqft thresholds incl. circulation)
  let bhk = 1;
  if (buildableSqft >= 650)  bhk = 2;
  if (buildableSqft >= 1100) bhk = 3;
  if (buildableSqft >= 1700) bhk = 4;

  // Logic-first AI: reject impossible "luxury" requests with a clear correction
  if (goal.id === "luxury" && buildableSqft < 1500) {
    corrections.push(
      `A luxury villa typically needs ≥1,500 sqft built-up. Your budget supports ~${buildableSqft.toLocaleString("en-IN")} sqft in ${city.name} — switching to a "premium ${bhk}BHK" template instead. Consider a tier-2 city or ₹${((1500 * ratePerSqft - input.budget) / 100000).toFixed(1)}L more for a true luxury build.`
    );
  }
  if (goal.id === "luxury") bhk = Math.max(bhk, 3);

  // Plot vs built-up sanity (assumes G+1 max for under 1500 sqft)
  if (input.plotSqft && buildableSqft > input.plotSqft * 2) {
    corrections.push(
      `Plot is ${input.plotSqft} sqft — going beyond G+1 (≈${input.plotSqft * 2} sqft built-up) is uncommon for residential. Recommended built-up capped at ${input.plotSqft * 2} sqft.`
    );
    buildableSqft = Math.min(buildableSqft, input.plotSqft * 2);
  }

  // Structured breakdown — Materials / Labor / Interior / Misc
  // Industry typical for finished residential build in India:
  // Materials 45–55%, Labor 25–30%, Interior 12–18%, Misc/Permits 5–10%.
  const breakdown: BreakdownItem[] = [
    { name: "Materials", value: input.budget * 0.50, pct: 50, color: "hsl(205 100% 60%)",
      detail: "Cement, steel, bricks, sand, aggregates, plumbing, electrical, doors, windows." },
    { name: "Labor", value: input.budget * 0.27, pct: 27, color: "hsl(220 15% 50%)",
      detail: "Mason, carpenter, electrician, plumber, painter — 25–30% of total." },
    { name: "Interior", value: input.budget * 0.15, pct: 15, color: "hsl(42 85% 60%)",
      detail: "Flooring finish, false ceiling, modular kitchen, paint, basic furniture." },
    { name: "Misc & Permits", value: input.budget * 0.08, pct: 8, color: "hsl(220 15% 35%)",
      detail: "Approvals, soil test, site clearance, contingency buffer." },
  ];

  // Floor plan — sized using realistic ranges
  const rooms = buildRealisticRooms(bhk, buildableSqft);

  // Recommendations
  const recommendations: string[] = [];
  recommendations.push(
    `Budget fits a ${bhk}BHK at ${buildableSqft.toLocaleString("en-IN")} sqft (range ${sqftMin.toLocaleString("en-IN")}–${sqftMax.toLocaleString("en-IN")} sqft) in ${city.name}.`
  );
  recommendations.push(
    `Vitrified tiles vs Italian marble can save ~${fmtINR(input.budget * 0.05)} without losing finish quality.`
  );
  recommendations.push(
    `Building 8–12 km outside ${city.name} core can lower land + labor cost by ~15–25%.`
  );
  recommendations.push(
    `Keep a 7–10% contingency buffer — material price fluctuations are common.`
  );

  // Warnings (real-world risk flags, not blockers)
  if (sqftMax < 600 && bhk < 2) {
    warnings.push(
      `At this budget, expect a 1BHK / studio in ${city.name}. For a 2BHK, target ₹${((650 * ratePerSqft) / 100000).toFixed(0)}L or move to a tier-2 city.`
    );
  }

  // Locations — realistic price bands
  const locations = [
    { area: `${city.name} North`,     pricePerSqft: Math.round(rateMin * 0.95),  fit: "good" as const },
    { area: `${city.name} Outskirts`, pricePerSqft: Math.round(rateMin * 0.80),  fit: "good" as const },
    { area: `${city.name} Central`,   pricePerSqft: Math.round(rateMax * 1.20),  fit: input.budget > 12000000 ? ("tight" as const) : ("over" as const) },
  ];

  const materials = [
    { item: "Flooring", from: "Italian Marble", to: "Premium Vitrified", saves: input.budget * 0.05 },
    { item: "Paint",    from: "Imported Premium", to: "Standard Emulsion", saves: input.budget * 0.02 },
    { item: "Fixtures", from: "Designer Brand",   to: "Quality Mid-range", saves: input.budget * 0.035 },
  ];

  // Confidence tier — narrower budgets at city extremes get medium/low.
  const confidence: Plan["confidence"] =
    input.budget < 2500000 || goal.id === "luxury"
      ? "medium"
      : input.budget > 8000000
      ? "high"
      : "high";

  assumptions.push("Rates are ₹/sqft built-up, finished — exclude land cost.");
  assumptions.push(`Ceiling height assumed 3.0 m (10 ft); wall thickness 230 mm exterior, 115 mm interior.`);
  assumptions.push("Material costs vary ±10–15% by season and supplier.");
  assumptions.push(`Labor rates assumed at ${city.name} 2026 averages; site conditions can shift labor by ±20%.`);

  return {
    totalBudget: input.budget,
    ratePerSqft,
    rateRange: [rateMin, rateMax],
    buildableSqft,
    buildableSqftRange: [sqftMin, sqftMax],
    bhk,
    city,
    goal,
    breakdown,
    rooms,
    recommendations,
    warnings,
    corrections,
    locations,
    materials,
    ceilingHeightM: 3.0,
    wallThicknessMm: 230,
    confidence,
    assumptions,
  };
}

// Realistic room sizing: distribute buildable sqft across rooms within
// architectural ranges, ensuring no overcrowding.
function buildRealisticRooms(bhk: number, totalSqft: number) {
  const palette = {
    bed:     "hsl(205 100% 60% / 0.18)",
    master:  "hsl(210 90% 65% / 0.22)",
    bath:    "hsl(195 80% 55% / 0.14)",
    kitchen: "hsl(42 85% 60% / 0.18)",
    hall:    "hsl(220 15% 30% / 0.5)",
    dining:  "hsl(280 40% 55% / 0.18)",
  };
  // ~25% goes to circulation/walls — usable internal area
  const usable = totalSqft * 0.75;

  // Allocations per BHK (sums to ~usable). Each room clamped to its realistic range.
  const clamp = (v: number, [min, max]: readonly [number, number]) =>
    Math.max(min, Math.min(max, v));

  let plan: { name: string; sqft: number; tone: string }[] = [];
  if (bhk <= 1) {
    plan = [
      { name: "Living/Hall", sqft: clamp(usable * 0.40, [ROOM_RANGES.living.min, ROOM_RANGES.living.max]), tone: palette.hall },
      { name: "Bedroom",     sqft: clamp(usable * 0.30, [ROOM_RANGES.bedroom.min, ROOM_RANGES.bedroom.max]), tone: palette.bed },
      { name: "Kitchen",     sqft: clamp(usable * 0.18, [ROOM_RANGES.kitchen.min, ROOM_RANGES.kitchen.max]), tone: palette.kitchen },
      { name: "Bath",        sqft: clamp(usable * 0.10, [ROOM_RANGES.bath.min, ROOM_RANGES.bath.max]),    tone: palette.bath },
    ];
  } else if (bhk === 2) {
    plan = [
      { name: "Living",  sqft: clamp(usable * 0.32, [ROOM_RANGES.living.min,  ROOM_RANGES.living.max]),  tone: palette.hall },
      { name: "Kitchen", sqft: clamp(usable * 0.16, [ROOM_RANGES.kitchen.min, ROOM_RANGES.kitchen.max]), tone: palette.kitchen },
      { name: "Master Bed", sqft: clamp(usable * 0.22, [ROOM_RANGES.master.min,  ROOM_RANGES.master.max]), tone: palette.master },
      { name: "Bedroom", sqft: clamp(usable * 0.18, [ROOM_RANGES.bedroom.min, ROOM_RANGES.bedroom.max]), tone: palette.bed },
      { name: "Bath",    sqft: clamp(usable * 0.08, [ROOM_RANGES.bath.min,    ROOM_RANGES.bath.max]),    tone: palette.bath },
    ];
  } else if (bhk === 3) {
    plan = [
      { name: "Living",     sqft: clamp(usable * 0.26, [ROOM_RANGES.living.min,   ROOM_RANGES.living.max]),  tone: palette.hall },
      { name: "Kitchen",    sqft: clamp(usable * 0.13, [ROOM_RANGES.kitchen.min,  ROOM_RANGES.kitchen.max]), tone: palette.kitchen },
      { name: "Bath",       sqft: clamp(usable * 0.08, [ROOM_RANGES.bath.min,     ROOM_RANGES.bath.max]),    tone: palette.bath },
      { name: "Master Bed", sqft: clamp(usable * 0.20, [ROOM_RANGES.master.min,   ROOM_RANGES.master.max]),  tone: palette.master },
      { name: "Bedroom 2",  sqft: clamp(usable * 0.16, [ROOM_RANGES.bedroom.min,  ROOM_RANGES.bedroom.max]), tone: palette.bed },
      { name: "Bedroom 3",  sqft: clamp(usable * 0.16, [ROOM_RANGES.bedroom.min,  ROOM_RANGES.bedroom.max]), tone: palette.bed },
    ];
  } else {
    plan = [
      { name: "Living",     sqft: clamp(usable * 0.22, [ROOM_RANGES.living.min,  ROOM_RANGES.living.max]),  tone: palette.hall },
      { name: "Dining",     sqft: clamp(usable * 0.12, [ROOM_RANGES.dining.min,  ROOM_RANGES.dining.max]),  tone: palette.dining },
      { name: "Kitchen",    sqft: clamp(usable * 0.12, [ROOM_RANGES.kitchen.min, ROOM_RANGES.kitchen.max]), tone: palette.kitchen },
      { name: "Master Bed", sqft: clamp(usable * 0.18, [ROOM_RANGES.master.min,  ROOM_RANGES.master.max]),  tone: palette.master },
      { name: "Bedroom 2",  sqft: clamp(usable * 0.13, [ROOM_RANGES.bedroom.min, ROOM_RANGES.bedroom.max]), tone: palette.bed },
      { name: "Bedroom 3",  sqft: clamp(usable * 0.13, [ROOM_RANGES.bedroom.min, ROOM_RANGES.bedroom.max]), tone: palette.bed },
      { name: "Bath",       sqft: clamp(usable * 0.10, [ROOM_RANGES.bath.min,    ROOM_RANGES.bath.max]),    tone: palette.bath },
    ];
  }

  // Convert sqft allocations into a packed 100×70 canvas layout.
  // We use a simple row-packing approach so positions don't overlap.
  const canvasW = 100, canvasH = 70;
  const totalAllocated = plan.reduce((s, r) => s + r.sqft, 0);
  // Two rows: top row holds the first ~half, bottom row holds the rest
  const half = Math.ceil(plan.length / 2);
  const rowA = plan.slice(0, half);
  const rowB = plan.slice(half);

  const layoutRow = (row: typeof plan, yStart: number, yHeight: number) => {
    const rowTotal = row.reduce((s, r) => s + r.sqft, 0) || 1;
    let xCursor = 2;
    return row.map((r) => {
      const w = ((r.sqft / rowTotal) * (canvasW - 4));
      const out = {
        name: r.name,
        x: xCursor,
        y: yStart,
        w,
        h: yHeight,
        color: r.tone,
        sqft: Math.round(r.sqft),
      };
      xCursor += w;
      return out;
    });
  };

  const topH = 30, botH = 30;
  const placed = [
    ...layoutRow(rowA, 4, topH),
    ...layoutRow(rowB, 4 + topH + 2, botH),
  ];

  return placed;
}
