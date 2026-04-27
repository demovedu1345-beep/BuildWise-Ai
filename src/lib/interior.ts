// AI Interior Designer — itemized cost breakdown with Buy Now links

export type SpaceType = "house" | "flat" | "room";
export type RoomType = "living" | "bedroom" | "kitchen" | "bathroom" | "dining" | "study";
export type StylePref = "modern" | "luxury" | "minimal" | "scandinavian" | "industrial";

export interface InteriorInput {
  space: SpaceType;
  room: RoomType;
  style: StylePref;
  budget: number; // ₹
}

export interface InteriorItem {
  id: string;
  category: string;          // e.g. Furniture, Lighting, Flooring
  name: string;              // e.g. 3-seater Fabric Sofa
  material: string;          // Fabric / Engineered wood / Vitrified
  brand?: string;
  qty: number;
  unit?: string;             // pcs, sqft, ltr
  unitCost: number;          // ₹
  totalCost: number;         // qty * unitCost
  retailer: "Amazon" | "Flipkart" | "IKEA" | "Pepperfry" | "Urban Ladder" | "Asian Paints" | "Local Supplier";
  buyUrl: string;            // direct search/product link
  alternative?: { name: string; saves: number; buyUrl: string };
}

export interface InteriorPlan {
  input: InteriorInput;
  items: InteriorItem[];
  subtotal: number;
  withinBudget: boolean;
  overBy: number;
  optimizations: { item: string; suggestion: string; saves: number }[];
  styleNotes: string[];
  palette: { name: string; hex: string }[];
}

const amazon = (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`;
const flipkart = (q: string) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`;
const pepperfry = (q: string) => `https://www.pepperfry.com/site_product/search?q=${encodeURIComponent(q)}`;
const urbanLadder = (q: string) => `https://www.urbanladder.com/products/search?keywords=${encodeURIComponent(q)}`;
const ikea = (q: string) => `https://www.ikea.com/in/en/search/?q=${encodeURIComponent(q)}`;
const asianPaints = (q: string) => `https://www.asianpaints.com/search.html?searchTerm=${encodeURIComponent(q)}`;

// Style modifiers
const STYLE_MULT: Record<StylePref, number> = {
  minimal: 0.85,
  scandinavian: 0.95,
  modern: 1.0,
  industrial: 1.1,
  luxury: 1.6,
};

const STYLE_PALETTE: Record<StylePref, { name: string; hex: string }[]> = {
  modern: [
    { name: "Charcoal", hex: "#2A2D34" },
    { name: "Warm White", hex: "#F4EFEA" },
    { name: "Brass Accent", hex: "#B08D57" },
  ],
  luxury: [
    { name: "Onyx Black", hex: "#1C1C1E" },
    { name: "Champagne Gold", hex: "#D4AF37" },
    { name: "Ivory", hex: "#FAF7F0" },
  ],
  minimal: [
    { name: "Pure White", hex: "#FFFFFF" },
    { name: "Cool Grey", hex: "#D6D6D6" },
    { name: "Soft Black", hex: "#1A1A1A" },
  ],
  scandinavian: [
    { name: "Snow", hex: "#F8F4EC" },
    { name: "Oak", hex: "#C9A77D" },
    { name: "Sage", hex: "#A8B8A0" },
  ],
  industrial: [
    { name: "Concrete Grey", hex: "#7A7A7A" },
    { name: "Rust Brown", hex: "#8A4B2A" },
    { name: "Metal Black", hex: "#222222" },
  ],
};

interface ItemTemplate {
  category: string;
  name: string;
  material: string;
  baseCost: number;
  qty: number | ((roomBudget: number) => number);
  unit?: string;
  retailer: InteriorItem["retailer"];
  query: string;
  alt?: { name: string; savesPct: number; query: string };
}

const ROOM_TEMPLATES: Record<RoomType, ItemTemplate[]> = {
  living: [
    { category: "Furniture", name: "3-Seater Sofa", material: "Fabric", baseCost: 28000, qty: 1, retailer: "Pepperfry", query: "3 seater fabric sofa",
      alt: { name: "Compact 2-seater + chair", savesPct: 0.3, query: "2 seater sofa with armchair" } },
    { category: "Furniture", name: "Coffee Table", material: "Engineered wood + metal", baseCost: 6500, qty: 1, retailer: "Urban Ladder", query: "modern coffee table",
      alt: { name: "Nesting tables", savesPct: 0.25, query: "nesting coffee tables" } },
    { category: "Furniture", name: "TV Unit", material: "Engineered wood", baseCost: 12000, qty: 1, retailer: "Urban Ladder", query: "tv unit cabinet" },
    { category: "Lighting", name: "Pendant Light", material: "Metal + glass", baseCost: 3500, qty: 1, retailer: "Amazon", query: "modern pendant light living room" },
    { category: "Soft Goods", name: "Area Rug 6x8 ft", material: "Wool blend", baseCost: 7500, qty: 1, retailer: "IKEA", query: "area rug 6x8" },
    { category: "Flooring", name: "Vitrified Tiles", material: "Glazed vitrified", baseCost: 60, qty: 200, unit: "sqft", retailer: "Local Supplier", query: "vitrified tile 600x600",
      alt: { name: "Standard ceramic tiles", savesPct: 0.4, query: "ceramic floor tile" } },
    { category: "Paint", name: "Wall Paint", material: "Premium emulsion", baseCost: 320, qty: 40, unit: "ltr", retailer: "Asian Paints", query: "Royale luxury emulsion" },
    { category: "Curtains", name: "Blackout Curtains", material: "Polyester blend", baseCost: 1800, qty: 4, retailer: "Amazon", query: "blackout curtains 7ft" },
  ],
  bedroom: [
    { category: "Furniture", name: "Queen Bed with Storage", material: "Engineered wood", baseCost: 22000, qty: 1, retailer: "Urban Ladder", query: "queen bed hydraulic storage",
      alt: { name: "Non-storage bed", savesPct: 0.25, query: "queen size bed" } },
    { category: "Furniture", name: "Mattress (Memory Foam)", material: "Memory foam", baseCost: 18000, qty: 1, retailer: "Amazon", query: "queen memory foam mattress",
      alt: { name: "HR Foam mattress", savesPct: 0.4, query: "HR foam queen mattress" } },
    { category: "Furniture", name: "Wardrobe 4-door", material: "Engineered wood + laminate", baseCost: 35000, qty: 1, retailer: "Pepperfry", query: "4 door wardrobe with mirror" },
    { category: "Furniture", name: "Bedside Tables", material: "Engineered wood", baseCost: 4500, qty: 2, retailer: "IKEA", query: "bedside table" },
    { category: "Lighting", name: "Bedside Lamps", material: "Fabric shade", baseCost: 1800, qty: 2, retailer: "Amazon", query: "bedside table lamp" },
    { category: "Flooring", name: "Laminate Flooring", material: "AC4 Laminate", baseCost: 95, qty: 150, unit: "sqft", retailer: "Local Supplier", query: "laminate wood flooring" },
    { category: "Paint", name: "Wall Paint", material: "Emulsion", baseCost: 280, qty: 25, unit: "ltr", retailer: "Asian Paints", query: "tractor emulsion" },
    { category: "Soft Goods", name: "Bedding Set", material: "Cotton 300TC", baseCost: 3200, qty: 1, retailer: "Amazon", query: "queen bedsheet 300tc" },
  ],
  kitchen: [
    { category: "Modular", name: "Modular Kitchen Cabinets", material: "BWP Plywood + laminate", baseCost: 1450, qty: 80, unit: "sqft", retailer: "Local Supplier", query: "modular kitchen cabinets",
      alt: { name: "MDF carcass cabinets", savesPct: 0.25, query: "MDF kitchen cabinets" } },
    { category: "Countertop", name: "Granite Countertop", material: "Granite", baseCost: 280, qty: 25, unit: "sqft", retailer: "Local Supplier", query: "granite countertop kitchen",
      alt: { name: "Quartz alternative", savesPct: -0.15, query: "quartz kitchen countertop" } },
    { category: "Appliances", name: "Chimney 90cm", material: "Stainless steel", baseCost: 14000, qty: 1, retailer: "Amazon", query: "auto clean chimney 90cm" },
    { category: "Appliances", name: "Hob 4-burner", material: "Glass top", baseCost: 9500, qty: 1, retailer: "Flipkart", query: "4 burner glass hob" },
    { category: "Sink", name: "SS Single Bowl Sink", material: "304 stainless steel", baseCost: 4500, qty: 1, retailer: "Amazon", query: "stainless steel kitchen sink single bowl" },
    { category: "Lighting", name: "Under-cabinet LED", material: "LED strip", baseCost: 1200, qty: 3, retailer: "Amazon", query: "under cabinet led strip" },
    { category: "Tiles", name: "Backsplash Tiles", material: "Ceramic glossy", baseCost: 75, qty: 35, unit: "sqft", retailer: "Local Supplier", query: "kitchen backsplash tile" },
  ],
  bathroom: [
    { category: "Sanitary", name: "Wall-hung WC", material: "Ceramic", baseCost: 12000, qty: 1, retailer: "Amazon", query: "wall hung WC jaquar",
      alt: { name: "Floor-mount WC", savesPct: 0.4, query: "floor mounted WC" } },
    { category: "Sanitary", name: "Vanity Basin + Counter", material: "Ceramic + MDF", baseCost: 14000, qty: 1, retailer: "Pepperfry", query: "bathroom vanity unit" },
    { category: "Fittings", name: "Shower Set + Diverter", material: "Chrome brass", baseCost: 8500, qty: 1, retailer: "Amazon", query: "shower diverter set jaquar" },
    { category: "Tiles", name: "Wall Tiles", material: "Glazed ceramic", baseCost: 55, qty: 120, unit: "sqft", retailer: "Local Supplier", query: "bathroom wall tile" },
    { category: "Tiles", name: "Anti-skid Floor Tiles", material: "Anti-skid ceramic", baseCost: 70, qty: 35, unit: "sqft", retailer: "Local Supplier", query: "anti skid bathroom floor tile" },
    { category: "Lighting", name: "Mirror with LED", material: "LED + glass", baseCost: 4500, qty: 1, retailer: "Amazon", query: "led bathroom mirror" },
  ],
  dining: [
    { category: "Furniture", name: "6-seater Dining Table", material: "Solid wood top", baseCost: 32000, qty: 1, retailer: "Urban Ladder", query: "6 seater dining table set",
      alt: { name: "4-seater set", savesPct: 0.3, query: "4 seater dining table" } },
    { category: "Lighting", name: "Statement Chandelier", material: "Metal + glass", baseCost: 9500, qty: 1, retailer: "Amazon", query: "dining chandelier modern" },
    { category: "Furniture", name: "Sideboard / Crockery Unit", material: "Engineered wood", baseCost: 18000, qty: 1, retailer: "Pepperfry", query: "crockery unit sideboard" },
    { category: "Soft Goods", name: "Dining Rug", material: "Polyester", baseCost: 4500, qty: 1, retailer: "IKEA", query: "dining rug rectangle" },
    { category: "Paint", name: "Accent Wall Paint", material: "Premium emulsion", baseCost: 320, qty: 8, unit: "ltr", retailer: "Asian Paints", query: "accent wall paint" },
  ],
  study: [
    { category: "Furniture", name: "Study Desk", material: "Engineered wood", baseCost: 9500, qty: 1, retailer: "IKEA", query: "study desk" },
    { category: "Furniture", name: "Ergonomic Chair", material: "Mesh + nylon base", baseCost: 12000, qty: 1, retailer: "Amazon", query: "ergonomic office chair",
      alt: { name: "Mid-back task chair", savesPct: 0.4, query: "task chair mesh" } },
    { category: "Storage", name: "Bookshelf", material: "Engineered wood", baseCost: 7500, qty: 1, retailer: "Pepperfry", query: "bookshelf 5 shelves" },
    { category: "Lighting", name: "Desk Lamp", material: "Metal + LED", baseCost: 2200, qty: 1, retailer: "Amazon", query: "led desk lamp" },
    { category: "Paint", name: "Wall Paint", material: "Emulsion", baseCost: 280, qty: 12, unit: "ltr", retailer: "Asian Paints", query: "interior emulsion paint" },
    { category: "Flooring", name: "Vinyl Flooring", material: "Vinyl planks", baseCost: 65, qty: 100, unit: "sqft", retailer: "Local Supplier", query: "vinyl plank flooring" },
  ],
};

function buyUrl(retailer: InteriorItem["retailer"], q: string) {
  switch (retailer) {
    case "Amazon": return amazon(q);
    case "Flipkart": return flipkart(q);
    case "IKEA": return ikea(q);
    case "Pepperfry": return pepperfry(q);
    case "Urban Ladder": return urbanLadder(q);
    case "Asian Paints": return asianPaints(q);
    case "Local Supplier": return amazon(q + " india");
  }
}

export function generateInteriorPlan(input: InteriorInput): InteriorPlan {
  const templates = ROOM_TEMPLATES[input.room] ?? ROOM_TEMPLATES.living;
  const mult = STYLE_MULT[input.style];

  let items: InteriorItem[] = templates.map((t, i) => {
    const qty = typeof t.qty === "function" ? t.qty(input.budget) : t.qty;
    const unitCost = Math.round(t.baseCost * mult);
    const totalCost = unitCost * qty;
    const altSaves = t.alt ? Math.round(totalCost * t.alt.savesPct) : 0;
    return {
      id: `${input.room}-${i}`,
      category: t.category,
      name: t.name,
      material: t.material,
      qty,
      unit: t.unit,
      unitCost,
      totalCost,
      retailer: t.retailer,
      buyUrl: buyUrl(t.retailer, t.query),
      alternative: t.alt && altSaves > 0
        ? { name: t.alt.name, saves: altSaves, buyUrl: buyUrl(t.retailer, t.alt.query) }
        : undefined,
    };
  });

  let subtotal = items.reduce((s, it) => s + it.totalCost, 0);
  const optimizations: InteriorPlan["optimizations"] = [];

  // Auto-optimize: if over budget, swap to alternatives until within or no more
  if (subtotal > input.budget) {
    // Sort by largest possible saves first
    const order = [...items]
      .map((it, idx) => ({ idx, saves: it.alternative?.saves ?? 0 }))
      .filter((x) => x.saves > 0)
      .sort((a, b) => b.saves - a.saves);

    for (const o of order) {
      if (subtotal <= input.budget) break;
      const it = items[o.idx];
      if (!it.alternative) continue;
      const newTotal = it.totalCost - it.alternative.saves;
      optimizations.push({
        item: it.name,
        suggestion: `Switch to ${it.alternative.name} → save ₹${it.alternative.saves.toLocaleString("en-IN")}`,
        saves: it.alternative.saves,
      });
      items[o.idx] = {
        ...it,
        name: it.alternative.name,
        totalCost: newTotal,
        unitCost: Math.round(newTotal / it.qty),
        buyUrl: it.alternative.buyUrl,
        alternative: undefined,
      };
      subtotal = items.reduce((s, x) => s + x.totalCost, 0);
    }
  } else {
    // Suggest opportunistic swaps for top 2 alternatives even if within budget
    items
      .filter((it) => it.alternative)
      .slice(0, 2)
      .forEach((it) =>
        optimizations.push({
          item: it.name,
          suggestion: `Switch to ${it.alternative!.name} → save ₹${it.alternative!.saves.toLocaleString("en-IN")}`,
          saves: it.alternative!.saves,
        })
      );
  }

  const styleNotes: Record<StylePref, string[]> = {
    modern: ["Clean lines, neutral palette with one bold accent", "Mix matte finishes with brushed metal", "Layered ambient + task lighting"],
    luxury: ["Marble or quartz surfaces", "Brass / gold hardware", "Statement chandelier as focal point", "Velvet upholstery"],
    minimal: ["Less is more — limit decor to 2–3 pieces", "Hidden storage everywhere", "Monochrome palette"],
    scandinavian: ["Light woods (oak, ash)", "Warm whites + cozy textiles", "Plenty of natural light"],
    industrial: ["Exposed concrete/brick accent wall", "Black metal frames", "Edison bulb pendants"],
  };

  return {
    input,
    items,
    subtotal,
    withinBudget: subtotal <= input.budget,
    overBy: Math.max(0, subtotal - input.budget),
    optimizations,
    styleNotes: styleNotes[input.style],
    palette: STYLE_PALETTE[input.style],
  };
}
