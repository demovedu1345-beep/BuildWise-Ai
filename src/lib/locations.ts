// City area intelligence — Bangalore-rich, with budget fit logic

export interface Area {
  name: string;
  minPsf: number;     // ₹ per sqft (land/built avg)
  maxPsf: number;
  advantages: string[];
  bestFor: string;    // tagline
  whyFits?: (budget: number) => string;
}

export interface CityAreas {
  cityId: string;
  cityName: string;
  areas: Area[];
}

export const CITY_AREAS: Record<string, CityAreas> = {
  bangalore: {
    cityId: "bangalore",
    cityName: "Bangalore",
    areas: [
      {
        name: "Whitefield",
        minPsf: 7500,
        maxPsf: 11000,
        advantages: ["IT corridor jobs", "Metro Phase 2 live", "Top schools", "Mature social infra"],
        bestFor: "Working professionals & families",
      },
      {
        name: "Sarjapur Road",
        minPsf: 6800,
        maxPsf: 10500,
        advantages: ["Close to ORR tech parks", "Premium gated communities", "Strong rental yield"],
        bestFor: "Long-term investors",
      },
      {
        name: "Electronic City",
        minPsf: 5200,
        maxPsf: 7800,
        advantages: ["Affordable entry", "Elevated expressway", "IT hub", "Namma Metro extension"],
        bestFor: "First-time buyers",
      },
      {
        name: "Yelahanka",
        minPsf: 5800,
        maxPsf: 8500,
        advantages: ["Airport connectivity", "Planned greenery", "Wider plots available"],
        bestFor: "Independent home builders",
      },
      {
        name: "Hennur / Thanisandra",
        minPsf: 6200,
        maxPsf: 9000,
        advantages: ["Manyata Tech Park nearby", "Upcoming metro", "Mid-budget villas"],
        bestFor: "Mid-budget villa builds",
      },
      {
        name: "Devanahalli",
        minPsf: 4200,
        maxPsf: 6500,
        advantages: ["Lowest entry price", "Airport region growth", "Large plot sizes"],
        bestFor: "Tight budgets & future appreciation",
      },
      {
        name: "Indiranagar / Koramangala (Central)",
        minPsf: 16000,
        maxPsf: 28000,
        advantages: ["Premium lifestyle", "Highest rental rates", "Prime resale"],
        bestFor: "Luxury buyers only",
      },
    ],
  },
  mumbai: {
    cityId: "mumbai",
    cityName: "Mumbai",
    areas: [
      { name: "Thane West", minPsf: 14000, maxPsf: 22000, advantages: ["Metro 4 connectivity", "Lakes & parks", "Mid-premium"], bestFor: "Family homes" },
      { name: "Navi Mumbai (Kharghar)", minPsf: 11000, maxPsf: 16000, advantages: ["Planned city", "Upcoming airport", "Wide roads"], bestFor: "Value seekers" },
      { name: "Andheri East", minPsf: 22000, maxPsf: 32000, advantages: ["Metro hub", "BKC proximity", "Strong rentals"], bestFor: "Investors" },
      { name: "Bandra West", minPsf: 45000, maxPsf: 75000, advantages: ["Sea-facing premium", "Top dining/retail"], bestFor: "Luxury only" },
    ],
  },
  delhi: {
    cityId: "delhi",
    cityName: "Delhi NCR",
    areas: [
      { name: "Noida Sector 150", minPsf: 9500, maxPsf: 14000, advantages: ["Greenest Noida sector", "Sports city", "Wide layouts"], bestFor: "Family homes" },
      { name: "Gurgaon Sohna Road", minPsf: 11000, maxPsf: 17000, advantages: ["Close to Cyber Hub", "New highway access"], bestFor: "Working pros" },
      { name: "Greater Noida West", minPsf: 6500, maxPsf: 9500, advantages: ["Affordable", "Aqua line metro", "Newer infra"], bestFor: "First-time buyers" },
      { name: "Dwarka Expressway", minPsf: 12000, maxPsf: 18000, advantages: ["IGI airport proximity", "Premium upcoming"], bestFor: "Mid-luxury" },
    ],
  },
  hyderabad: {
    cityId: "hyderabad",
    cityName: "Hyderabad",
    areas: [
      { name: "Gachibowli", minPsf: 8500, maxPsf: 13000, advantages: ["IT corridor", "International schools"], bestFor: "Working pros" },
      { name: "Kondapur", minPsf: 7500, maxPsf: 11000, advantages: ["Established neighborhood", "Mall/retail"], bestFor: "Family homes" },
      { name: "Tellapur", minPsf: 6500, maxPsf: 9000, advantages: ["Emerging premium", "Wide plots"], bestFor: "Independent builds" },
      { name: "Kompally", minPsf: 4500, maxPsf: 6500, advantages: ["Affordable north", "ORR connectivity"], bestFor: "Tight budgets" },
    ],
  },
  pune: {
    cityId: "pune",
    cityName: "Pune",
    areas: [
      { name: "Hinjewadi", minPsf: 7500, maxPsf: 11000, advantages: ["IT park", "Metro upcoming"], bestFor: "Working pros" },
      { name: "Wakad", minPsf: 8000, maxPsf: 12000, advantages: ["Central west", "Schools/retail"], bestFor: "Family homes" },
      { name: "Wagholi", minPsf: 5500, maxPsf: 8000, advantages: ["Affordable east", "Airport-side growth"], bestFor: "First-time buyers" },
      { name: "Baner", minPsf: 11000, maxPsf: 16000, advantages: ["Premium lifestyle"], bestFor: "Mid-luxury" },
    ],
  },
  chennai: {
    cityId: "chennai",
    cityName: "Chennai",
    areas: [
      { name: "OMR (Sholinganallur)", minPsf: 7000, maxPsf: 10500, advantages: ["IT corridor", "Beach proximity"], bestFor: "Working pros" },
      { name: "Porur", minPsf: 7500, maxPsf: 11000, advantages: ["Central west", "Metro upcoming"], bestFor: "Family homes" },
      { name: "Tambaram", minPsf: 5500, maxPsf: 8000, advantages: ["Affordable south", "Suburban rail"], bestFor: "First-time buyers" },
      { name: "ECR (Injambakkam)", minPsf: 9000, maxPsf: 14000, advantages: ["Beach-side", "Premium villas"], bestFor: "Luxury" },
    ],
  },
};

export type Fit = "good" | "tight" | "over";

export interface AreaSuggestion extends Area {
  fit: Fit;
  reasoning: string;
  estTotalForSqft: number; // budget required for given sqft at avg psf
  saveVsBest?: number;     // savings vs best central area
}

export function suggestAreas(cityId: string, budget: number, sqft: number): AreaSuggestion[] {
  const data = CITY_AREAS[cityId];
  if (!data) return [];

  const desired = Math.max(sqft, 600);

  const enriched = data.areas.map<AreaSuggestion>((a) => {
    const avg = (a.minPsf + a.maxPsf) / 2;
    const estTotal = Math.round(avg * desired);
    const ratio = estTotal / budget;
    let fit: Fit = "good";
    if (ratio > 1.15) fit = "over";
    else if (ratio > 0.92) fit = "tight";

    let reasoning = "";
    if (fit === "good") {
      reasoning = `At ~₹${avg.toLocaleString("en-IN")}/sqft you can fit ${desired.toLocaleString("en-IN")} sqft well within your ${"₹" + (budget / 100000).toFixed(0) + "L"} budget.`;
    } else if (fit === "tight") {
      reasoning = `Doable but close to your budget ceiling — consider a slightly smaller build or a sub-pocket here.`;
    } else {
      reasoning = `Out of budget for ${desired.toLocaleString("en-IN")} sqft — choose a more affordable area or reduce sqft.`;
    }

    return { ...a, fit, reasoning, estTotalForSqft: estTotal };
  });

  // Sort: good first by closeness to budget, then tight, then over
  enriched.sort((a, b) => {
    const order = { good: 0, tight: 1, over: 2 } as const;
    if (order[a.fit] !== order[b.fit]) return order[a.fit] - order[b.fit];
    return Math.abs(budget - a.estTotalForSqft) - Math.abs(budget - b.estTotalForSqft);
  });

  // Add saveVsBest comparison
  const max = Math.max(...enriched.map((e) => e.estTotalForSqft));
  enriched.forEach((e) => (e.saveVsBest = max - e.estTotalForSqft));

  return enriched;
}
