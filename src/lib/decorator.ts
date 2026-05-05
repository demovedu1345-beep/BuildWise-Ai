// Cost engine + types for the AI Room Decorator
export interface ExistingObject {
  type: string;
  description: string;
  position: [number, number];
  size: [number, number];
  color: string;
}
export interface RoomAnalysis {
  room_type: string;
  dimensions: { width: number; length: number; height: number };
  wall_color: string;
  floor_type: string;
  lighting: string;
  natural_light?: string;
  current_style: string;
  condition: "poor" | "fair" | "good" | "excellent";
  existing_objects: ExistingObject[];
  walls?: { front?: string; back?: string; left?: string; right?: string };
  recommendations_summary: string;
}

export interface DecorProduct {
  id: string;
  category: "Furniture" | "Lighting" | "Decor" | "Materials" | "Textiles" | "Storage";
  name: string;
  brand: string;
  description: string;
  price_inr: number;
  qty: number;
  retailer: string;
  search_query: string;
  color: string;
  why: string;
  buyUrl: string;
  imageUrl: string;
}

// Tier-based regional cost multipliers for Indian cities
const CITY_MULTIPLIERS: Record<string, number> = {
  mumbai: 1.18, "navi mumbai": 1.15, thane: 1.14, delhi: 1.15, "new delhi": 1.15,
  gurgaon: 1.15, gurugram: 1.15, noida: 1.12, bangalore: 1.12, bengaluru: 1.12,
  hyderabad: 1.08, chennai: 1.08, pune: 1.08, kolkata: 1.05, ahmedabad: 1.02,
  jaipur: 0.98, lucknow: 0.95, indore: 0.95, bhopal: 0.93, patna: 0.9, ranchi: 0.9,
  kochi: 1.02, chandigarh: 1.05, surat: 1.0,
};

export function regionalMultiplier(location?: string): number {
  if (!location) return 1.0;
  const key = location.toLowerCase();
  for (const city in CITY_MULTIPLIERS) {
    if (key.includes(city)) return CITY_MULTIPLIERS[city];
  }
  // Default: tier-2/3 estimate
  return 0.95;
}

export interface CostBreakdown {
  productsSubtotal: number;
  laborEstimate: number;
  deliveryInstall: number;
  paintingMaterials: number;
  contingency: number;
  regionalMultiplier: number;
  total: number;
  byCategory: Record<string, number>;
  withinBudget: boolean;
  budget: number;
}

export function computeCost(products: DecorProduct[], budget: number, areaSqm: number, location?: string, condition: RoomAnalysis["condition"] = "good"): CostBreakdown {
  const mult = regionalMultiplier(location);
  const productsSubtotal = products.reduce((s, p) => s + p.price_inr * p.qty, 0);
  // Painting & basic materials: ₹35-60 per sqft based on condition
  const paintRate = condition === "poor" ? 60 : condition === "fair" ? 50 : condition === "good" ? 40 : 35;
  const sqft = areaSqm * 10.764;
  const paintingMaterials = Math.round(sqft * paintRate * mult);
  // Labor: assembly, electrician, painter, helper
  const laborEstimate = Math.round((productsSubtotal * 0.08 + sqft * 25) * mult);
  // Delivery & installation: ~5%
  const deliveryInstall = Math.round(productsSubtotal * 0.05);
  const contingency = Math.round((productsSubtotal + paintingMaterials + laborEstimate) * 0.07);
  const total = Math.round((productsSubtotal + laborEstimate + deliveryInstall + paintingMaterials + contingency) * mult);
  const byCategory: Record<string, number> = {};
  products.forEach((p) => {
    byCategory[p.category] = (byCategory[p.category] || 0) + p.price_inr * p.qty;
  });
  return {
    productsSubtotal: Math.round(productsSubtotal * mult),
    laborEstimate, deliveryInstall, paintingMaterials, contingency,
    regionalMultiplier: mult,
    total,
    byCategory,
    withinBudget: total <= budget,
    budget,
  };
}

export const ROOM_TYPES = [
  { id: "living", label: "Living Room", emoji: "🛋️" },
  { id: "bedroom", label: "Bedroom", emoji: "🛏️" },
  { id: "gaming", label: "Gaming Room", emoji: "🎮" },
  { id: "study", label: "Study / Office", emoji: "📚" },
  { id: "kids", label: "Kids Room", emoji: "🧸" },
  { id: "kitchen", label: "Kitchen", emoji: "🍳" },
  { id: "dining", label: "Dining", emoji: "🍽️" },
];

export const STYLES = [
  { id: "modern", label: "Modern", desc: "Clean lines, neutrals, function-first" },
  { id: "luxury", label: "Luxury", desc: "Velvet, gold, marble, statement lighting" },
  { id: "minimal", label: "Minimal", desc: "Less is more, white + warm wood" },
  { id: "scandinavian", label: "Scandinavian", desc: "Light wood, cozy, hygge" },
  { id: "industrial", label: "Industrial", desc: "Exposed brick, metal, dark accents" },
  { id: "boho", label: "Boho", desc: "Plants, textures, eclectic colors" },
  { id: "japandi", label: "Japandi", desc: "Japanese minimal + Scandinavian warmth" },
  { id: "traditional", label: "Indian Traditional", desc: "Wood, brass, jewel tones" },
];

export const COLOR_THEMES = [
  { id: "warm-neutrals", label: "Warm Neutrals", swatches: ["#E8DCC4", "#C9B79C", "#8B7355"] },
  { id: "cool-greys", label: "Cool Greys", swatches: ["#E5E7EB", "#9CA3AF", "#374151"] },
  { id: "earthy", label: "Earthy Tones", swatches: ["#A0522D", "#8B7355", "#556B2F"] },
  { id: "moody-dark", label: "Moody Dark", swatches: ["#1F2937", "#7F1D1D", "#92400E"] },
  { id: "pastel", label: "Soft Pastels", swatches: ["#FBCFE8", "#BFDBFE", "#D9F99D"] },
  { id: "jewel", label: "Jewel Tones", swatches: ["#065F46", "#7C2D12", "#312E81"] },
];
