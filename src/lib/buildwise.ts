// BuildWise AI — mock planning engine
export type Goal = "family" | "rental" | "luxury";

export const CITIES = [
  { id: "bangalore", name: "Bangalore", rate: 2400, mult: 1.15 },
  { id: "mumbai", name: "Mumbai", rate: 3200, mult: 1.45 },
  { id: "delhi", name: "Delhi NCR", rate: 2600, mult: 1.2 },
  { id: "hyderabad", name: "Hyderabad", rate: 2100, mult: 1.0 },
  { id: "pune", name: "Pune", rate: 2300, mult: 1.1 },
  { id: "chennai", name: "Chennai", rate: 2200, mult: 1.05 },
];

export const GOALS: { id: Goal; label: string; rateMult: number }[] = [
  { id: "family", label: "Family Home", rateMult: 1.0 },
  { id: "rental", label: "Rental Unit", rateMult: 0.85 },
  { id: "luxury", label: "Luxury Villa", rateMult: 1.55 },
];

export interface PlanInput {
  budget: number; // in rupees
  cityId: string;
  plotSqft: number;
  goal: Goal;
}

export interface Plan {
  totalBudget: number;
  ratePerSqft: number;
  buildableSqft: number;
  bhk: number;
  city: typeof CITIES[number];
  goal: typeof GOALS[number];
  breakdown: { name: string; value: number; pct: number; color: string }[];
  rooms: { name: string; w: number; h: number; x: number; y: number; color: string }[];
  recommendations: string[];
  warnings: string[];
  locations: { area: string; pricePerSqft: number; fit: "good" | "tight" | "over" }[];
  materials: { item: string; from: string; to: string; saves: number }[];
}

const fmtINR = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)} Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)} L`
    : `₹${Math.round(n).toLocaleString("en-IN")}`;
export { fmtINR };

export function generatePlan(input: PlanInput): Plan {
  const city = CITIES.find((c) => c.id === input.cityId) ?? CITIES[0];
  const goal = GOALS.find((g) => g.id === input.goal) ?? GOALS[0];
  const ratePerSqft = Math.round(city.rate * goal.rateMult);
  const buildableSqft = Math.max(200, Math.floor(input.budget / ratePerSqft));

  let bhk = 1;
  if (buildableSqft >= 600) bhk = 2;
  if (buildableSqft >= 1100) bhk = 3;
  if (buildableSqft >= 1700) bhk = 4;
  if (goal.id === "luxury") bhk = Math.max(bhk, 3);

  const breakdown = [
    { name: "Materials", value: input.budget * 0.5, pct: 50, color: "hsl(205 100% 60%)" },
    { name: "Labor", value: input.budget * 0.3, pct: 30, color: "hsl(42 85% 60%)" },
    { name: "Misc & Permits", value: input.budget * 0.2, pct: 20, color: "hsl(220 15% 35%)" },
  ];

  // Floor plan grid (percentages of canvas)
  const rooms = buildRooms(bhk);

  const recommendations: string[] = [];
  const warnings: string[] = [];
  recommendations.push(`Your budget fits a ${bhk}BHK in ${city.name}.`);
  if (input.plotSqft && input.plotSqft < buildableSqft * 0.6) {
    recommendations.push(
      `Plot size is tight — consider a multi-floor design to fit ${buildableSqft} sqft.`
    );
  }
  recommendations.push(
    `Switching marble flooring to vitrified tiles can save ~${fmtINR(input.budget * 0.06)}.`
  );
  recommendations.push(
    `Building 10km outside ${city.name} core can lower costs by ~25%.`
  );

  if (goal.id === "luxury" && buildableSqft < 1500) {
    warnings.push(
      `This budget cannot support a luxury villa in ${city.name}. Recommended: a compact ${bhk}BHK or a different location.`
    );
  }
  if (buildableSqft < 400) {
    warnings.push(
      `Budget is tight for ${city.name}. Consider tier-2 cities or a studio layout.`
    );
  }

  const locations = [
    {
      area: `${city.name} North`,
      pricePerSqft: Math.round(ratePerSqft * 0.85),
      fit: "good" as const,
    },
    {
      area: `${city.name} Outskirts`,
      pricePerSqft: Math.round(ratePerSqft * 0.7),
      fit: "good" as const,
    },
    {
      area: `${city.name} Central`,
      pricePerSqft: Math.round(ratePerSqft * 1.25),
      fit: input.budget > 8000000 ? ("tight" as const) : ("over" as const),
    },
  ];

  const materials = [
    { item: "Flooring", from: "Italian Marble", to: "Premium Vitrified", saves: input.budget * 0.06 },
    { item: "Paint", from: "Imported Premium", to: "Standard Emulsion", saves: input.budget * 0.025 },
    { item: "Fixtures", from: "Designer Brand", to: "Quality Mid-range", saves: input.budget * 0.04 },
  ];

  return {
    totalBudget: input.budget,
    ratePerSqft,
    buildableSqft,
    bhk,
    city,
    goal,
    breakdown,
    rooms,
    recommendations,
    warnings,
    locations,
    materials,
  };
}

function buildRooms(bhk: number) {
  const palette = {
    bed: "hsl(205 100% 60% / 0.18)",
    bath: "hsl(195 80% 55% / 0.14)",
    kitchen: "hsl(42 85% 60% / 0.18)",
    hall: "hsl(220 15% 30% / 0.5)",
  };
  // Coordinates as percentages of a 100x70 canvas
  if (bhk <= 1) {
    return [
      { name: "Hall", w: 60, h: 40, x: 5, y: 5, color: palette.hall },
      { name: "Bedroom", w: 30, h: 40, x: 65, y: 5, color: palette.bed },
      { name: "Kitchen", w: 35, h: 23, x: 5, y: 47, color: palette.kitchen },
      { name: "Bath", w: 25, h: 23, x: 42, y: 47, color: palette.bath },
    ];
  }
  if (bhk === 2) {
    return [
      { name: "Hall", w: 55, h: 38, x: 5, y: 5, color: palette.hall },
      { name: "Kitchen", w: 35, h: 38, x: 60, y: 5, color: palette.kitchen },
      { name: "Bedroom 1", w: 40, h: 25, x: 5, y: 45, color: palette.bed },
      { name: "Bedroom 2", w: 35, h: 25, x: 47, y: 45, color: palette.bed },
      { name: "Bath", w: 13, h: 25, x: 84, y: 45, color: palette.bath },
    ];
  }
  if (bhk === 3) {
    return [
      { name: "Hall", w: 45, h: 35, x: 5, y: 5, color: palette.hall },
      { name: "Kitchen", w: 28, h: 35, x: 52, y: 5, color: palette.kitchen },
      { name: "Bath", w: 15, h: 35, x: 82, y: 5, color: palette.bath },
      { name: "Bedroom 1", w: 30, h: 28, x: 5, y: 42, color: palette.bed },
      { name: "Bedroom 2", w: 30, h: 28, x: 37, y: 42, color: palette.bed },
      { name: "Master", w: 28, h: 28, x: 69, y: 42, color: palette.bed },
    ];
  }
  return [
    { name: "Hall", w: 40, h: 32, x: 5, y: 5, color: palette.hall },
    { name: "Dining", w: 25, h: 32, x: 47, y: 5, color: palette.hall },
    { name: "Kitchen", w: 23, h: 32, x: 74, y: 5, color: palette.kitchen },
    { name: "Master", w: 32, h: 30, x: 5, y: 39, color: palette.bed },
    { name: "Bedroom", w: 22, h: 30, x: 39, y: 39, color: palette.bed },
    { name: "Bedroom", w: 22, h: 30, x: 63, y: 39, color: palette.bed },
    { name: "Bath", w: 11, h: 30, x: 86, y: 39, color: palette.bath },
  ];
}
