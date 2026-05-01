// AI Room Studio — 3D-aware design engine with budget distribution,
// style consistency, smart placement, variation engine and purchase links.

export type StudioRoom = "bedroom" | "living" | "kitchen" | "bathroom";
export type StudioStyle = "modern" | "luxury" | "minimal" | "traditional";
export type StudioPriority = "saving" | "balanced" | "premium";

export interface StudioInput {
  room: StudioRoom;
  style: StudioStyle;
  priority: StudioPriority;
  budget: number;        // ₹ total
  width: number;         // meters
  depth: number;         // meters
  height?: number;       // meters
  seed?: number;         // variation seed for layout randomization
}

export interface PlacedItem {
  id: string;
  category: "Furniture" | "Materials" | "Lighting" | "Decor";
  name: string;
  material: string;
  brand?: string;
  qty: number;
  unit?: string;
  dimensions: string;          // e.g. "2.0 × 0.9 × 0.8 m"
  cost: number;                // total ₹ for qty
  buyUrl: string;
  retailer: "Amazon" | "Pepperfry" | "IKEA" | "Urban Ladder" | "Asian Paints" | "Local Supplier";
  // 3D placement (meters), origin = room center, +x right, +z forward
  pos: [number, number, number];
  size: [number, number, number]; // width, height, depth
  rot?: number;                  // y rotation radians
  color: string;                 // hex
  shape?: "box" | "cylinder" | "lamp" | "rug" | "frame";
  alternative?: { name: string; saves: number; buyUrl: string };
  userAdded?: boolean;           // true if user manually added this item
}

export interface BudgetSplit {
  furniture: number;
  materials: number;
  lighting: number;
  decor: number;
  buffer: number;
}

export interface StudioPlan {
  input: StudioInput;
  split: BudgetSplit;
  items: PlacedItem[];
  subtotal: number;
  withinBudget: boolean;
  optimizations: { item: string; suggestion: string; saves: number }[];
  palette: { wall: string; floor: string; accent: string; trim: string };
  styleNotes: string[];
  corrections: string[];
  realisticBudget: { min: number; max: number };
  sqft: number;
  walkability: number;
}

// ---- VARIATION ENGINE -------------------------------------------------------

/** Simple seeded PRNG for deterministic randomization */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Pick one item from array using rng */
function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Jitter a number by ±range */
function jitter(value: number, range: number, rng: () => number): number {
  return value + (rng() - 0.5) * 2 * range;
}

// ---- ADDABLE ITEMS CATALOG --------------------------------------------------

export interface CatalogItem {
  id: string;
  category: PlacedItem["category"];
  name: string;
  material: string;
  baseCost: number;
  size: [number, number, number];
  shape: PlacedItem["shape"];
  color: string;
  retailer: PlacedItem["retailer"];
  searchQuery: string;
  rooms: StudioRoom[];  // compatible rooms
}

export const ITEM_CATALOG: CatalogItem[] = [
  // Furniture
  { id: "cat-sofa-modern", category: "Furniture", name: "Modern 3-Seater Sofa", material: "Fabric + foam", baseCost: 28000, size: [2.2, 0.9, 0.95], shape: "box", color: "#4A5568", retailer: "Pepperfry", searchQuery: "3 seater fabric sofa", rooms: ["living"] },
  { id: "cat-sofa-leather", category: "Furniture", name: "Leather L-Shape Sofa", material: "Leather", baseCost: 65000, size: [2.6, 0.9, 0.95], shape: "box", color: "#3A2A22", retailer: "Pepperfry", searchQuery: "L shape leather sofa", rooms: ["living"] },
  { id: "cat-armchair", category: "Furniture", name: "Accent Armchair", material: "Velvet", baseCost: 14000, size: [0.8, 0.85, 0.85], shape: "box", color: "#6A7A8A", retailer: "Urban Ladder", searchQuery: "accent armchair", rooms: ["living", "bedroom"] },
  { id: "cat-bed-queen", category: "Furniture", name: "Queen Bed with Storage", material: "Engineered wood", baseCost: 28000, size: [1.8, 0.55, 2.05], shape: "box", color: "#2A2D34", retailer: "Pepperfry", searchQuery: "queen bed storage", rooms: ["bedroom"] },
  { id: "cat-bed-king", category: "Furniture", name: "King Bed (Velvet Headboard)", material: "Velvet + Solid wood", baseCost: 45000, size: [2.0, 0.55, 2.05], shape: "box", color: "#5C2A2A", retailer: "Pepperfry", searchQuery: "king bed velvet", rooms: ["bedroom"] },
  { id: "cat-wardrobe", category: "Furniture", name: "Sliding Wardrobe", material: "Engineered wood + laminate", baseCost: 35000, size: [0.6, 2.1, 2.0], shape: "box", color: "#2A2D34", retailer: "Pepperfry", searchQuery: "sliding wardrobe", rooms: ["bedroom"] },
  { id: "cat-dresser", category: "Furniture", name: "Dresser with Mirror", material: "Engineered wood", baseCost: 11000, size: [0.45, 0.85, 1.2], shape: "box", color: "#2A2D34", retailer: "Urban Ladder", searchQuery: "dresser mirror", rooms: ["bedroom"] },
  { id: "cat-coffee-table", category: "Furniture", name: "Coffee Table", material: "Wood + metal", baseCost: 6500, size: [1.1, 0.45, 0.6], shape: "box", color: "#2A2D34", retailer: "Urban Ladder", searchQuery: "modern coffee table", rooms: ["living"] },
  { id: "cat-side-table", category: "Furniture", name: "Side Table", material: "Engineered wood", baseCost: 2400, size: [0.45, 0.5, 0.4], shape: "box", color: "#2A2D34", retailer: "IKEA", searchQuery: "side table", rooms: ["living", "bedroom"] },
  { id: "cat-tv-unit", category: "Furniture", name: "TV Unit Cabinet", material: "Engineered wood", baseCost: 12000, size: [1.8, 0.5, 0.4], shape: "box", color: "#2A2D34", retailer: "Urban Ladder", searchQuery: "tv unit cabinet", rooms: ["living"] },
  { id: "cat-bookshelf", category: "Furniture", name: "Bookshelf", material: "Solid wood", baseCost: 8500, size: [0.35, 1.8, 0.9], shape: "box", color: "#5C3A22", retailer: "Urban Ladder", searchQuery: "bookshelf", rooms: ["living", "bedroom"] },
  { id: "cat-dining-table", category: "Furniture", name: "Dining Table (4 Seater)", material: "Solid wood", baseCost: 18000, size: [1.2, 0.75, 0.8], shape: "box", color: "#5C3A22", retailer: "Pepperfry", searchQuery: "4 seater dining table", rooms: ["living", "kitchen"] },
  { id: "cat-chair", category: "Furniture", name: "Dining Chair", material: "Wood + fabric", baseCost: 3500, size: [0.45, 0.9, 0.45], shape: "box", color: "#4A5568", retailer: "Pepperfry", searchQuery: "dining chair", rooms: ["living", "kitchen"] },
  { id: "cat-stool", category: "Furniture", name: "Bar Stool", material: "Metal + leatherette", baseCost: 3500, size: [0.4, 0.75, 0.4], shape: "cylinder", color: "#3A3A3A", retailer: "Pepperfry", searchQuery: "bar stool", rooms: ["kitchen"] },
  // Lighting
  { id: "cat-floor-lamp", category: "Lighting", name: "Tripod Floor Lamp", material: "Wood + fabric shade", baseCost: 4500, size: [0.5, 1.6, 0.5], shape: "lamp", color: "#F1E6C8", retailer: "Amazon", searchQuery: "tripod floor lamp", rooms: ["living", "bedroom"] },
  { id: "cat-table-lamp", category: "Lighting", name: "Table Lamp", material: "Fabric shade + metal", baseCost: 1800, size: [0.25, 0.45, 0.25], shape: "lamp", color: "#F1E6C8", retailer: "Amazon", searchQuery: "table lamp modern", rooms: ["living", "bedroom"] },
  { id: "cat-pendant", category: "Lighting", name: "Pendant Light", material: "Metal + glass", baseCost: 5500, size: [0.5, 0.35, 0.5], shape: "lamp", color: "#FFE9A8", retailer: "Amazon", searchQuery: "pendant light modern", rooms: ["living", "bedroom", "kitchen"] },
  { id: "cat-chandelier", category: "Lighting", name: "Crystal Chandelier", material: "Crystal + brass", baseCost: 18000, size: [0.6, 0.4, 0.6], shape: "lamp", color: "#FFE9A8", retailer: "Amazon", searchQuery: "crystal chandelier", rooms: ["living", "bedroom"] },
  { id: "cat-wall-sconce", category: "Lighting", name: "Wall Sconce (Pair)", material: "Metal + glass", baseCost: 3200, size: [0.15, 0.3, 0.12], shape: "lamp", color: "#FFE0A3", retailer: "Amazon", searchQuery: "wall sconce pair", rooms: ["living", "bedroom", "bathroom"] },
  // Decor
  { id: "cat-rug-small", category: "Decor", name: "Area Rug (Small)", material: "Wool blend", baseCost: 5500, size: [1.4, 0.02, 1.0], shape: "rug", color: "#5C3A22", retailer: "IKEA", searchQuery: "area rug", rooms: ["living", "bedroom"] },
  { id: "cat-rug-large", category: "Decor", name: "Area Rug (Large)", material: "Wool blend", baseCost: 9500, size: [2.4, 0.02, 1.6], shape: "rug", color: "#3A4A5C", retailer: "IKEA", searchQuery: "large area rug", rooms: ["living", "bedroom"] },
  { id: "cat-wall-art", category: "Decor", name: "Framed Wall Art", material: "Canvas + frame", baseCost: 3200, size: [0.6, 0.9, 0.04], shape: "frame", color: "#3B82F6", retailer: "Amazon", searchQuery: "framed wall art", rooms: ["living", "bedroom"] },
  { id: "cat-plant", category: "Decor", name: "Indoor Plant (Pot)", material: "Ceramic pot", baseCost: 1200, size: [0.35, 0.6, 0.35], shape: "cylinder", color: "#2D5A27", retailer: "Amazon", searchQuery: "indoor plant pot", rooms: ["living", "bedroom", "bathroom"] },
  { id: "cat-plant-tall", category: "Decor", name: "Tall Floor Plant", material: "Ceramic pot", baseCost: 2800, size: [0.45, 1.2, 0.45], shape: "cylinder", color: "#2D5A27", retailer: "Amazon", searchQuery: "tall indoor plant", rooms: ["living", "bedroom"] },
  { id: "cat-mirror", category: "Decor", name: "Decorative Mirror", material: "Glass + metal frame", baseCost: 4500, size: [0.7, 0.9, 0.04], shape: "frame", color: "#A8C8E0", retailer: "Amazon", searchQuery: "decorative wall mirror", rooms: ["living", "bedroom", "bathroom"] },
  { id: "cat-cushion-set", category: "Decor", name: "Cushion Set (4 pcs)", material: "Cotton", baseCost: 1800, size: [0.4, 0.15, 0.4], shape: "box", color: "#D4AF37", retailer: "Amazon", searchQuery: "cushion set", rooms: ["living", "bedroom"] },
  { id: "cat-books", category: "Decor", name: "Decorative Book Stack", material: "Paper + cloth", baseCost: 800, size: [0.25, 0.2, 0.18], shape: "box", color: "#8B4513", retailer: "Amazon", searchQuery: "decorative books", rooms: ["living", "bedroom"] },
  { id: "cat-vase", category: "Decor", name: "Ceramic Vase", material: "Ceramic", baseCost: 1500, size: [0.2, 0.35, 0.2], shape: "cylinder", color: "#D8D2C7", retailer: "IKEA", searchQuery: "ceramic vase", rooms: ["living", "bedroom"] },
  { id: "cat-tv", category: "Decor", name: "55-inch Smart TV", material: "LED panel", baseCost: 42000, size: [1.25, 0.72, 0.07], shape: "box", color: "#0A0A0A", retailer: "Amazon", searchQuery: "55 inch smart tv", rooms: ["living", "bedroom"] },
];

/** Get catalog items filtered by room compatibility */
export function getCatalogForRoom(room: StudioRoom): CatalogItem[] {
  return ITEM_CATALOG.filter((c) => c.rooms.includes(room));
}

/** Create a PlacedItem from a catalog entry at a given position */
export function createItemFromCatalog(
  catalog: CatalogItem,
  pos: [number, number, number],
  styleMult: number,
): PlacedItem {
  const uniqueId = `${catalog.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id: uniqueId,
    category: catalog.category,
    name: catalog.name,
    material: catalog.material,
    qty: 1,
    dimensions: `${catalog.size[0].toFixed(1)} × ${catalog.size[1].toFixed(1)} × ${catalog.size[2].toFixed(1)} m`,
    cost: Math.round(catalog.baseCost * styleMult),
    buyUrl: `https://www.amazon.in/s?k=${encodeURIComponent(catalog.searchQuery)}`,
    retailer: catalog.retailer,
    pos,
    size: [...catalog.size] as [number, number, number],
    color: catalog.color,
    shape: catalog.shape,
    userAdded: true,
  };
}

// ---- MATERIAL OPTIONS -------------------------------------------------------

export interface MaterialOption {
  id: string;
  label: string;
  category: "wall" | "floor" | "furniture";
  costMult: number;  // multiplier on base cost
  color: string;     // preview hex
}

export const MATERIAL_OPTIONS: MaterialOption[] = [
  // Wall materials
  { id: "wall-white", label: "White Emulsion", category: "wall", costMult: 1.0, color: "#F4F2EE" },
  { id: "wall-cream", label: "Warm Cream", category: "wall", costMult: 1.0, color: "#F0E1C0" },
  { id: "wall-grey", label: "Elegant Grey", category: "wall", costMult: 1.05, color: "#A8A29E" },
  { id: "wall-charcoal", label: "Charcoal", category: "wall", costMult: 1.1, color: "#1F1B16" },
  { id: "wall-sage", label: "Sage Green", category: "wall", costMult: 1.05, color: "#8A9A7A" },
  { id: "wall-navy", label: "Deep Navy", category: "wall", costMult: 1.1, color: "#1A2744" },
  // Floor materials
  { id: "floor-tiles", label: "Vitrified Tiles", category: "floor", costMult: 1.0, color: "#D8D2C7" },
  { id: "floor-wood", label: "Engineered Wood", category: "floor", costMult: 1.3, color: "#9C7A52" },
  { id: "floor-marble", label: "Italian Marble", category: "floor", costMult: 2.5, color: "#E8E4DD" },
  { id: "floor-dark-wood", label: "Dark Walnut", category: "floor", costMult: 1.5, color: "#3A2A1F" },
  { id: "floor-concrete", label: "Polished Concrete", category: "floor", costMult: 0.9, color: "#8A8A8A" },
  // Furniture materials
  { id: "furn-fabric", label: "Fabric", category: "furniture", costMult: 1.0, color: "#7A8A9A" },
  { id: "furn-leather", label: "Leather", category: "furniture", costMult: 1.6, color: "#3A2A22" },
  { id: "furn-velvet", label: "Velvet", category: "furniture", costMult: 1.4, color: "#5C2A4A" },
  { id: "furn-wood-light", label: "Light Oak", category: "furniture", costMult: 1.0, color: "#C4A872" },
  { id: "furn-wood-dark", label: "Dark Walnut", category: "furniture", costMult: 1.2, color: "#3A2A1F" },
  { id: "furn-metal", label: "Brushed Metal", category: "furniture", costMult: 1.3, color: "#8A8A9A" },
];

const PALETTES: Record<StudioStyle, { wall: string; floor: string; accent: string; trim: string }> = {
  modern:      { wall: "#E8E4DD", floor: "#9C7A52", accent: "#3B82F6", trim: "#2A2D34" },
  luxury:      { wall: "#1F1B16", floor: "#3A2A1F", accent: "#D4AF37", trim: "#0F0D0A" },
  minimal:     { wall: "#F4F2EE", floor: "#D8D2C7", accent: "#222222", trim: "#A8A29E" },
  traditional: { wall: "#F0E1C0", floor: "#7A4A24", accent: "#8B2E2E", trim: "#3E2A18" },
};

const STYLE_NOTES: Record<StudioStyle, string[]> = {
  modern: ["Neutral palette + bold accent", "Clean lines, matte finishes", "Layered task + ambient lighting"],
  luxury: ["Rich textures, brass / gold hardware", "Velvet / leather upholstery", "Statement chandelier focal point"],
  minimal: ["Less is more — limit decor", "Hidden storage everywhere", "Monochrome palette"],
  traditional: ["Warm wood tones, ornate details", "Rich fabrics, layered rugs", "Classic frames & trims"],
};

const STYLE_COST_MULT: Record<StudioStyle, number> = {
  minimal: 0.85,
  modern: 1.0,
  traditional: 1.1,
  luxury: 1.55,
};

// Budget split by priority (must sum to 1.0)
const SPLIT_BY_PRIORITY: Record<StudioPriority, BudgetSplit> = {
  balanced: { furniture: 0.40, materials: 0.25, lighting: 0.10, decor: 0.15, buffer: 0.10 },
  saving:   { furniture: 0.45, materials: 0.30, lighting: 0.08, decor: 0.07, buffer: 0.10 },
  premium:  { furniture: 0.45, materials: 0.20, lighting: 0.12, decor: 0.18, buffer: 0.05 },
};

// Retailer URL builders
const amazon = (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`;
const flipkart = (q: string) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`;
const pepperfry = (q: string) => `https://www.pepperfry.com/site_product/search?q=${encodeURIComponent(q)}`;
const urbanLadder = (q: string) => `https://www.urbanladder.com/products/search?keywords=${encodeURIComponent(q)}`;
const ikea = (q: string) => `https://www.ikea.com/in/en/search/?q=${encodeURIComponent(q)}`;
const asianPaints = (q: string) => `https://www.asianpaints.com/search.html?searchTerm=${encodeURIComponent(q)}`;

function buildUrl(retailer: PlacedItem["retailer"], q: string) {
  switch (retailer) {
    case "Amazon": return amazon(q);
    case "Pepperfry": return pepperfry(q);
    case "IKEA": return ikea(q);
    case "Urban Ladder": return urbanLadder(q);
    case "Asian Paints": return asianPaints(q);
    case "Local Supplier": return flipkart(q + " india");
  }
}

// ---- ROOM LAYOUT BUILDERS --------------------------------------------------

interface BuildCtx {
  W: number; D: number; H: number;
  style: StudioStyle;
  palette: { wall: string; floor: string; accent: string; trim: string };
  furnBudget: number;
  lightBudget: number;
  decorBudget: number;
  matBudget: number;
  styleMult: number;
}

function fmt(n: number) { return n.toFixed(1); }

function bedroomItems(c: BuildCtx): PlacedItem[] {
  const { W, D, H, palette, styleMult } = c;
  const items: PlacedItem[] = [];

  // Bed against the back wall, centered
  const bedW = Math.min(2.0, W * 0.55);
  const bedD = 2.05;
  const bedH = 0.55;
  const bedZ = -D / 2 + bedD / 2 + 0.2;
  items.push({
    id: "bed",
    category: "Furniture",
    name: c.style === "luxury" ? "King Bed (Velvet Headboard)" : "Queen Bed with Storage",
    material: c.style === "luxury" ? "Velvet + Solid wood" : "Engineered wood",
    qty: 1,
    dimensions: `${fmt(bedW)} × ${fmt(bedD)} × ${fmt(bedH)} m`,
    cost: Math.round(28000 * styleMult),
    retailer: "Pepperfry",
    buyUrl: buildUrl("Pepperfry", "queen bed hydraulic storage"),
    pos: [0, bedH / 2, bedZ],
    size: [bedW, bedH, bedD],
    color: c.style === "luxury" ? "#5C2A2A" : palette.trim,
    shape: "box",
    alternative: { name: "Standard non-storage bed", saves: 9000, buyUrl: buildUrl("Pepperfry", "queen size bed") },
  });

  // Headboard panel
  items.push({
    id: "headboard",
    category: "Furniture",
    name: "Upholstered Headboard Panel",
    material: c.style === "luxury" ? "Velvet" : "Fabric",
    qty: 1,
    dimensions: `${fmt(bedW + 0.4)} × 1.2 × 0.1 m`,
    cost: Math.round(6500 * styleMult),
    retailer: "Urban Ladder",
    buyUrl: buildUrl("Urban Ladder", "upholstered headboard"),
    pos: [0, 0.9, -D / 2 + 0.05],
    size: [bedW + 0.4, 1.2, 0.1],
    color: c.style === "luxury" ? "#7A3A3A" : palette.accent,
    shape: "box",
  });

  // Bedside tables
  for (const side of [-1, 1]) {
    items.push({
      id: `bedside-${side}`,
      category: "Furniture",
      name: "Bedside Table",
      material: "Engineered wood",
      qty: 1,
      dimensions: "0.45 × 0.5 × 0.4 m",
      cost: Math.round(2400 * styleMult),
      retailer: "IKEA",
      buyUrl: buildUrl("IKEA", "bedside table"),
      pos: [(bedW / 2 + 0.35) * side, 0.25, bedZ - bedD / 2 + 0.25],
      size: [0.45, 0.5, 0.4],
      color: palette.trim,
      shape: "box",
    });
    // Lamp on each
    items.push({
      id: `lamp-${side}`,
      category: "Lighting",
      name: "Bedside Lamp",
      material: "Fabric shade + metal",
      qty: 1,
      dimensions: "0.25 × 0.45 × 0.25 m",
      cost: Math.round(1800 * styleMult),
      retailer: "Amazon",
      buyUrl: buildUrl("Amazon", "bedside table lamp"),
      pos: [(bedW / 2 + 0.35) * side, 0.7, bedZ - bedD / 2 + 0.25],
      size: [0.25, 0.45, 0.25],
      color: "#F1E6C8",
      shape: "lamp",
    });
  }

  // Wardrobe along left wall
  const wDepth = 0.6;
  items.push({
    id: "wardrobe",
    category: "Furniture",
    name: c.style === "luxury" ? "4-door Wardrobe with Mirror" : "3-door Sliding Wardrobe",
    material: "Engineered wood + laminate",
    qty: 1,
    dimensions: `2.0 × 2.1 × ${wDepth} m`,
    cost: Math.round(35000 * styleMult),
    retailer: "Pepperfry",
    buyUrl: buildUrl("Pepperfry", "4 door wardrobe"),
    pos: [-W / 2 + wDepth / 2 + 0.05, 1.05, 0.5],
    size: [wDepth, 2.1, 2.0],
    color: palette.trim,
    shape: "box",
    alternative: { name: "2-door compact wardrobe", saves: 12000, buyUrl: buildUrl("Pepperfry", "2 door wardrobe") },
  });

  // Dresser along right wall
  items.push({
    id: "dresser",
    category: "Furniture",
    name: "Dresser with Mirror",
    material: "Engineered wood",
    qty: 1,
    dimensions: "1.2 × 0.85 × 0.45 m",
    cost: Math.round(11000 * styleMult),
    retailer: "Urban Ladder",
    buyUrl: buildUrl("Urban Ladder", "dresser with mirror"),
    pos: [W / 2 - 0.25, 0.42, 0.3],
    size: [0.45, 0.85, 1.2],
    color: palette.trim,
    shape: "box",
  });

  // Rug
  items.push({
    id: "rug",
    category: "Decor",
    name: "Area Rug",
    material: "Wool blend",
    qty: 1,
    dimensions: "1.8 × 0.02 × 1.4 m",
    cost: Math.round(7500 * styleMult),
    retailer: "IKEA",
    buyUrl: buildUrl("IKEA", "area rug bedroom"),
    pos: [0, 0.01, bedZ + bedD / 2 + 0.6],
    size: [1.8, 0.02, 1.4],
    color: c.style === "luxury" ? "#7A4A2A" : palette.accent,
    shape: "rug",
  });

  // Ceiling light
  items.push({
    id: "ceiling",
    category: "Lighting",
    name: c.style === "luxury" ? "Crystal Chandelier" : "Flush Ceiling Light",
    material: c.style === "luxury" ? "Crystal + brass" : "LED + acrylic",
    qty: 1,
    dimensions: "0.5 × 0.3 × 0.5 m",
    cost: Math.round((c.style === "luxury" ? 18000 : 4500) * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", c.style === "luxury" ? "crystal chandelier" : "modern ceiling light"),
    pos: [0, H - 0.25, 0],
    size: [0.5, 0.3, 0.5],
    color: "#FFE9A8",
    shape: "lamp",
  });

  // Wall art
  items.push({
    id: "art",
    category: "Decor",
    name: "Framed Wall Art (Set of 2)",
    material: "Canvas + wood frame",
    qty: 2,
    dimensions: "0.6 × 0.9 × 0.04 m",
    cost: Math.round(3200 * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "framed wall art bedroom set"),
    pos: [W / 2 - 0.04, 1.5, -0.5],
    size: [0.04, 0.9, 0.6],
    color: palette.accent,
    shape: "frame",
    rot: Math.PI / 2,
  });

  return items;
}

function livingItems(c: BuildCtx): PlacedItem[] {
  const { W, D, H, palette, styleMult } = c;
  const items: PlacedItem[] = [];

  // Sofa against back wall
  const sofaW = Math.min(2.4, W * 0.6);
  items.push({
    id: "sofa",
    category: "Furniture",
    name: c.style === "luxury" ? "L-Shape Leather Sofa" : "3-Seater Fabric Sofa",
    material: c.style === "luxury" ? "Leather" : "Fabric + foam",
    qty: 1,
    dimensions: `${fmt(sofaW)} × 0.9 × 0.95 m`,
    cost: Math.round((c.style === "luxury" ? 65000 : 28000) * styleMult),
    retailer: "Pepperfry",
    buyUrl: buildUrl("Pepperfry", c.style === "luxury" ? "L shape leather sofa" : "3 seater fabric sofa"),
    pos: [0, 0.45, -D / 2 + 0.55],
    size: [sofaW, 0.9, 0.95],
    color: c.style === "luxury" ? "#3A2A22" : palette.accent,
    shape: "box",
    alternative: { name: "2-seater + armchair combo", saves: 10000, buyUrl: buildUrl("Pepperfry", "2 seater sofa with armchair") },
  });

  // Coffee table
  items.push({
    id: "coffee",
    category: "Furniture",
    name: "Coffee Table",
    material: "Engineered wood + metal",
    qty: 1,
    dimensions: "1.1 × 0.45 × 0.6 m",
    cost: Math.round(6500 * styleMult),
    retailer: "Urban Ladder",
    buyUrl: buildUrl("Urban Ladder", "modern coffee table"),
    pos: [0, 0.22, -D / 2 + 1.7],
    size: [1.1, 0.45, 0.6],
    color: palette.trim,
    shape: "box",
    alternative: { name: "Nesting tables", saves: 2500, buyUrl: buildUrl("Urban Ladder", "nesting coffee tables") },
  });

  // TV unit on opposite wall
  items.push({
    id: "tvunit",
    category: "Furniture",
    name: "TV Unit",
    material: "Engineered wood",
    qty: 1,
    dimensions: "1.8 × 0.5 × 0.4 m",
    cost: Math.round(12000 * styleMult),
    retailer: "Urban Ladder",
    buyUrl: buildUrl("Urban Ladder", "tv unit cabinet"),
    pos: [0, 0.25, D / 2 - 0.25],
    size: [1.8, 0.5, 0.4],
    color: palette.trim,
    shape: "box",
  });

  // TV
  items.push({
    id: "tv",
    category: "Decor",
    name: "55-inch Smart TV",
    material: "LED panel",
    qty: 1,
    dimensions: "1.25 × 0.72 × 0.07 m",
    cost: Math.round(42000 * styleMult * 0.6),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "55 inch 4k smart tv"),
    pos: [0, 1.05, D / 2 - 0.06],
    size: [1.25, 0.72, 0.07],
    color: "#0A0A0A",
    shape: "box",
  });

  // Armchair on the side
  items.push({
    id: "armchair",
    category: "Furniture",
    name: "Accent Armchair",
    material: "Velvet upholstery",
    qty: 1,
    dimensions: "0.8 × 0.85 × 0.85 m",
    cost: Math.round(14000 * styleMult),
    retailer: "Urban Ladder",
    buyUrl: buildUrl("Urban Ladder", "accent armchair"),
    pos: [W / 2 - 0.6, 0.42, -D / 2 + 1.7],
    size: [0.8, 0.85, 0.85],
    rot: -Math.PI / 6,
    color: c.style === "luxury" ? palette.accent : "#6A7A8A",
    shape: "box",
  });

  // Rug
  items.push({
    id: "rug",
    category: "Decor",
    name: "Area Rug",
    material: "Wool blend",
    qty: 1,
    dimensions: "2.4 × 0.02 × 1.6 m",
    cost: Math.round(8500 * styleMult),
    retailer: "IKEA",
    buyUrl: buildUrl("IKEA", "area rug 6x8"),
    pos: [0, 0.01, -D / 2 + 1.6],
    size: [2.4, 0.02, 1.6],
    color: c.style === "luxury" ? "#5C3A22" : "#3A4A5C",
    shape: "rug",
  });

  // Floor lamp
  items.push({
    id: "floorlamp",
    category: "Lighting",
    name: "Tripod Floor Lamp",
    material: "Wood + fabric shade",
    qty: 1,
    dimensions: "0.5 × 1.6 × 0.5 m",
    cost: Math.round(4500 * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "tripod floor lamp"),
    pos: [-W / 2 + 0.45, 0.8, -D / 2 + 1.6],
    size: [0.5, 1.6, 0.5],
    color: "#F1E6C8",
    shape: "lamp",
  });

  // Ceiling pendant
  items.push({
    id: "pendant",
    category: "Lighting",
    name: c.style === "luxury" ? "Modern Chandelier" : "Pendant Light",
    material: "Metal + glass",
    qty: 1,
    dimensions: "0.6 × 0.4 × 0.6 m",
    cost: Math.round((c.style === "luxury" ? 16000 : 5500) * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", c.style === "luxury" ? "modern chandelier" : "pendant light living"),
    pos: [0, H - 0.35, -D / 2 + 1.7],
    size: [0.6, 0.4, 0.6],
    color: "#FFE9A8",
    shape: "lamp",
  });

  // Wall art over sofa
  items.push({
    id: "art",
    category: "Decor",
    name: "Statement Wall Art",
    material: "Canvas + frame",
    qty: 1,
    dimensions: "1.4 × 0.9 × 0.05 m",
    cost: Math.round(5500 * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "large canvas wall art"),
    pos: [0, 1.7, -D / 2 + 0.04],
    size: [1.4, 0.9, 0.05],
    color: palette.accent,
    shape: "frame",
  });

  return items;
}

function kitchenItems(c: BuildCtx): PlacedItem[] {
  const { W, D, H, palette, styleMult } = c;
  const items: PlacedItem[] = [];

  // Base cabinets along back wall
  items.push({
    id: "cabinets-base",
    category: "Furniture",
    name: "Modular Base Cabinets",
    material: "BWP Plywood + laminate",
    qty: 1,
    unit: "set",
    dimensions: `${fmt(W - 0.4)} × 0.85 × 0.6 m`,
    cost: Math.round(95000 * styleMult),
    retailer: "Local Supplier",
    buyUrl: buildUrl("Local Supplier", "modular kitchen cabinets"),
    pos: [0, 0.42, -D / 2 + 0.3],
    size: [W - 0.4, 0.85, 0.6],
    color: palette.trim,
    shape: "box",
    alternative: { name: "MDF carcass cabinets", saves: 22000, buyUrl: buildUrl("Local Supplier", "MDF kitchen cabinets") },
  });

  // Countertop
  items.push({
    id: "counter",
    category: "Materials",
    name: "Granite Countertop",
    material: "Granite",
    qty: 1,
    dimensions: `${fmt(W - 0.4)} × 0.04 × 0.62 m`,
    cost: Math.round(18000 * styleMult),
    retailer: "Local Supplier",
    buyUrl: buildUrl("Local Supplier", "granite countertop"),
    pos: [0, 0.87, -D / 2 + 0.3],
    size: [W - 0.4, 0.04, 0.62],
    color: c.style === "luxury" ? "#1A1A1A" : "#3D3A36",
    shape: "box",
  });

  // Wall cabinets
  items.push({
    id: "cabinets-wall",
    category: "Furniture",
    name: "Wall-mounted Cabinets",
    material: "BWP Plywood + laminate",
    qty: 1,
    unit: "set",
    dimensions: `${fmt(W - 0.4)} × 0.7 × 0.35 m`,
    cost: Math.round(45000 * styleMult),
    retailer: "Local Supplier",
    buyUrl: buildUrl("Local Supplier", "modular wall cabinets"),
    pos: [0, 1.85, -D / 2 + 0.18],
    size: [W - 0.4, 0.7, 0.35],
    color: palette.trim,
    shape: "box",
  });

  // Chimney
  items.push({
    id: "chimney",
    category: "Furniture",
    name: "Auto-clean Chimney 90cm",
    material: "Stainless steel",
    qty: 1,
    dimensions: "0.9 × 0.55 × 0.4 m",
    cost: Math.round(14000 * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "auto clean chimney 90cm"),
    pos: [0, 1.7, -D / 2 + 0.2],
    size: [0.9, 0.55, 0.4],
    color: "#3A3A3A",
    shape: "box",
  });

  // Hob
  items.push({
    id: "hob",
    category: "Furniture",
    name: "4-burner Glass Hob",
    material: "Tempered glass",
    qty: 1,
    dimensions: "0.7 × 0.05 × 0.5 m",
    cost: Math.round(9500 * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "4 burner glass hob"),
    pos: [0, 0.92, -D / 2 + 0.3],
    size: [0.7, 0.05, 0.5],
    color: "#0A0A0A",
    shape: "box",
  });

  // Island / Breakfast bar
  if (W >= 3.5 && D >= 3.5) {
    items.push({
      id: "island",
      category: "Furniture",
      name: "Kitchen Island",
      material: "Plywood + quartz top",
      qty: 1,
      dimensions: "1.6 × 0.9 × 0.8 m",
      cost: Math.round(48000 * styleMult),
      retailer: "Local Supplier",
      buyUrl: buildUrl("Local Supplier", "kitchen island"),
      pos: [0, 0.45, 0.5],
      size: [1.6, 0.9, 0.8],
      color: palette.trim,
      shape: "box",
    });
    // Bar stools
    for (const x of [-0.45, 0.45]) {
      items.push({
        id: `stool-${x}`,
        category: "Furniture",
        name: "Bar Stool",
        material: "Metal + leatherette",
        qty: 1,
        dimensions: "0.4 × 0.75 × 0.4 m",
        cost: Math.round(3500 * styleMult),
        retailer: "Pepperfry",
        buyUrl: buildUrl("Pepperfry", "bar stool"),
        pos: [x, 0.37, 1.1],
        size: [0.4, 0.75, 0.4],
        color: palette.accent,
        shape: "cylinder",
      });
    }
  }

  // Pendant lights over island/counter
  for (let i = -1; i <= 1; i++) {
    items.push({
      id: `pendant-${i}`,
      category: "Lighting",
      name: "Pendant Light",
      material: "Metal + glass",
      qty: 1,
      dimensions: "0.25 × 0.3 × 0.25 m",
      cost: Math.round(2200 * styleMult),
      retailer: "Amazon",
      buyUrl: buildUrl("Amazon", "kitchen pendant light"),
      pos: [i * 0.7, H - 0.35, W >= 3.5 && D >= 3.5 ? 0.5 : -D / 2 + 0.5],
      size: [0.25, 0.3, 0.25],
      color: "#FFE9A8",
      shape: "lamp",
    });
  }

  return items;
}

function bathroomItems(c: BuildCtx): PlacedItem[] {
  const { W, D, palette, styleMult } = c;
  const items: PlacedItem[] = [];

  // WC
  items.push({
    id: "wc",
    category: "Furniture",
    name: c.style === "luxury" ? "Wall-hung WC" : "Floor-mount WC",
    material: "Ceramic",
    qty: 1,
    dimensions: "0.4 × 0.4 × 0.65 m",
    cost: Math.round((c.style === "luxury" ? 12000 : 7500) * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "wall hung WC jaquar"),
    pos: [-W / 2 + 0.3, 0.32, -D / 2 + 0.4],
    size: [0.4, 0.65, 0.6],
    color: "#FAFAFA",
    shape: "box",
    alternative: { name: "Standard floor WC", saves: 4500, buyUrl: buildUrl("Amazon", "floor mounted WC") },
  });

  // Vanity
  items.push({
    id: "vanity",
    category: "Furniture",
    name: "Vanity with Basin",
    material: "Ceramic + WPC",
    qty: 1,
    dimensions: "0.9 × 0.85 × 0.45 m",
    cost: Math.round(14000 * styleMult),
    retailer: "Pepperfry",
    buyUrl: buildUrl("Pepperfry", "bathroom vanity unit"),
    pos: [0.3, 0.42, -D / 2 + 0.25],
    size: [0.9, 0.85, 0.45],
    color: palette.trim,
    shape: "box",
  });

  // Mirror w/ LED
  items.push({
    id: "mirror",
    category: "Lighting",
    name: "LED Bathroom Mirror",
    material: "LED + glass",
    qty: 1,
    dimensions: "0.7 × 0.9 × 0.04 m",
    cost: Math.round(4500 * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "led bathroom mirror"),
    pos: [0.3, 1.55, -D / 2 + 0.04],
    size: [0.7, 0.9, 0.04],
    color: "#A8E0FF",
    shape: "frame",
  });

  // Shower enclosure
  items.push({
    id: "shower",
    category: "Furniture",
    name: "Glass Shower Enclosure",
    material: "Tempered glass",
    qty: 1,
    dimensions: "1.0 × 2.0 × 1.0 m",
    cost: Math.round(22000 * styleMult),
    retailer: "Local Supplier",
    buyUrl: buildUrl("Local Supplier", "glass shower enclosure"),
    pos: [W / 2 - 0.55, 1.0, D / 2 - 0.55],
    size: [1.0, 2.0, 1.0],
    color: "#A8C8E0",
    shape: "box",
  });

  // Ceiling light
  items.push({
    id: "ceil",
    category: "Lighting",
    name: "Waterproof Ceiling Light",
    material: "LED",
    qty: 2,
    dimensions: "0.3 × 0.08 × 0.3 m",
    cost: Math.round(1500 * styleMult),
    retailer: "Amazon",
    buyUrl: buildUrl("Amazon", "waterproof ceiling light"),
    pos: [0, 2.2, 0],
    size: [0.3, 0.08, 0.3],
    color: "#FFFFFF",
    shape: "lamp",
  });

  return items;
}

function buildItems(input: StudioInput, palette: BuildCtx["palette"]): PlacedItem[] {
  const ctx: BuildCtx = {
    W: input.width,
    D: input.depth,
    H: input.height ?? 2.7,
    style: input.style,
    palette,
    styleMult: STYLE_COST_MULT[input.style],
    furnBudget: 0, lightBudget: 0, decorBudget: 0, matBudget: 0,
  };
  switch (input.room) {
    case "bedroom": return bedroomItems(ctx);
    case "living": return livingItems(ctx);
    case "kitchen": return kitchenItems(ctx);
    case "bathroom": return bathroomItems(ctx);
  }
}

// ---- MAIN PLAN GENERATOR ---------------------------------------------------

// Realistic room dimension ranges (meters) — width × depth bounds.
const ROOM_DIM_RANGES: Record<StudioRoom, { wMin: number; wMax: number; dMin: number; dMax: number }> = {
  bedroom:  { wMin: 3.0, wMax: 5.5, dMin: 3.0, dMax: 5.5 },
  living:   { wMin: 3.5, wMax: 7.5, dMin: 3.5, dMax: 7.5 },
  kitchen:  { wMin: 2.4, wMax: 4.5, dMin: 2.4, dMax: 4.5 },
  bathroom: { wMin: 1.5, wMax: 3.5, dMin: 1.8, dMax: 3.5 },
};

// Realistic interior budget bands (₹) for a single room, excluding civil work.
const REALISTIC_BUDGET: Record<StudioRoom, Record<StudioStyle, { min: number; max: number }>> = {
  bedroom: {
    minimal:     { min: 60000,  max: 180000 },
    modern:      { min: 90000,  max: 260000 },
    traditional: { min: 100000, max: 280000 },
    luxury:      { min: 250000, max: 700000 },
  },
  living: {
    minimal:     { min: 100000, max: 280000 },
    modern:      { min: 150000, max: 450000 },
    traditional: { min: 180000, max: 500000 },
    luxury:      { min: 400000, max: 1200000 },
  },
  kitchen: {
    minimal:     { min: 120000, max: 250000 },
    modern:      { min: 180000, max: 450000 },
    traditional: { min: 200000, max: 500000 },
    luxury:      { min: 400000, max: 1100000 },
  },
  bathroom: {
    minimal:     { min: 50000,  max: 120000 },
    modern:      { min: 80000,  max: 200000 },
    traditional: { min: 90000,  max: 220000 },
    luxury:      { min: 200000, max: 600000 },
  },
};

function clampRoom(input: StudioInput, corrections: string[]): StudioInput {
  const r = ROOM_DIM_RANGES[input.room];
  let w = input.width, d = input.depth;
  if (w < r.wMin) { corrections.push(`${input.room} width ${w.toFixed(1)} m is below realistic minimum (${r.wMin} m). Adjusted to ${r.wMin} m.`); w = r.wMin; }
  if (w > r.wMax) { corrections.push(`${input.room} width ${w.toFixed(1)} m exceeds typical maximum (${r.wMax} m). Capped to ${r.wMax} m.`); w = r.wMax; }
  if (d < r.dMin) { corrections.push(`${input.room} depth ${d.toFixed(1)} m is below realistic minimum (${r.dMin} m). Adjusted to ${r.dMin} m.`); d = r.dMin; }
  if (d > r.dMax) { corrections.push(`${input.room} depth ${d.toFixed(1)} m exceeds typical maximum (${r.dMax} m). Capped to ${r.dMax} m.`); d = r.dMax; }
  return { ...input, width: w, depth: d };
}

/** Compute walkability score by measuring free floor area after subtracting furniture footprints. */
function computeWalkability(items: PlacedItem[], W: number, D: number): number {
  const floorArea = W * D;
  const occupied = items
    .filter((it) => it.shape !== "lamp" && it.shape !== "frame" && it.size[1] > 0.05 && it.pos[1] < 1.5)
    .reduce((s, it) => s + it.size[0] * it.size[2], 0);
  const free = Math.max(0, floorArea - occupied);
  return Math.min(1, free / floorArea);
}

/** Drop non-essential items if walkability is too low. Essentials: bed/sofa/wardrobe/cabinets. */
const ESSENTIAL_IDS = new Set([
  "bed", "headboard", "wardrobe",         // bedroom
  "sofa", "tvunit", "tv",                 // living
  "cabinets-base", "cabinets-wall", "counter", "hob", "chimney", // kitchen
  "wc", "vanity", "shower",               // bathroom
  "flooring", "paint",
]);

function enforceClearance(items: PlacedItem[], W: number, D: number, corrections: string[]): PlacedItem[] {
  let walk = computeWalkability(items, W, D);
  if (walk >= 0.45) return items;
  // Sort removable items by largest footprint first
  const removable = items
    .map((it, idx) => ({ idx, area: it.size[0] * it.size[2], it }))
    .filter((x) => !ESSENTIAL_IDS.has(x.it.id))
    .sort((a, b) => b.area - a.area);

  let result = [...items];
  for (const r of removable) {
    if (walk >= 0.45) break;
    result = result.filter((it) => it.id !== r.it.id);
    walk = computeWalkability(result, W, D);
    corrections.push(`Removed "${r.it.name}" to maintain walkable clearance (≥45% free floor).`);
  }
  return result;
}

export function generateStudioPlan(rawInput: StudioInput): StudioPlan {
  const corrections: string[] = [];
  // 1. Clamp dimensions to realistic ranges
  const input = clampRoom(rawInput, corrections);
  const palette = PALETTES[input.style];

  // 2. Validate budget against realistic bands — auto-adjust style or warn
  const band = REALISTIC_BUDGET[input.room][input.style];
  if (input.budget < band.min) {
    corrections.push(
      `Budget ₹${input.budget.toLocaleString("en-IN")} is below realistic minimum (₹${band.min.toLocaleString("en-IN")}) for a ${input.style} ${input.room}. Plan will prioritize essentials and skip premium accents.`
    );
  } else if (input.budget > band.max * 1.5) {
    corrections.push(
      `Budget ₹${input.budget.toLocaleString("en-IN")} exceeds typical ${input.style} ${input.room} (₹${band.max.toLocaleString("en-IN")}). Excess can fund higher-grade finishes or premium brands.`
    );
  }

  let items = buildItems(input, palette);

  // 3. Add materials line items (paint + flooring)
  const area = input.width * input.depth;
  items.push({
    id: "flooring",
    category: "Materials",
    name: input.style === "luxury" ? "Italian Marble Flooring" : "Vitrified Tiles",
    material: input.style === "luxury" ? "Italian marble" : "Glazed vitrified",
    qty: Math.round(area * 10.764),
    unit: "sqft",
    dimensions: `${fmt(input.width)} × ${fmt(input.depth)} m floor`,
    cost: Math.round((input.style === "luxury" ? 280 : 65) * area * 10.764 * STYLE_COST_MULT[input.style] * 0.7),
    retailer: "Local Supplier",
    buyUrl: buildUrl("Local Supplier", input.style === "luxury" ? "italian marble tile" : "vitrified tile 600x600"),
    pos: [0, -0.001, 0],
    size: [input.width, 0.01, input.depth],
    color: palette.floor,
    shape: "box",
    alternative: input.style !== "luxury"
      ? { name: "Standard ceramic tiles", saves: 5500, buyUrl: buildUrl("Local Supplier", "ceramic floor tile") }
      : undefined,
  });
  items.push({
    id: "paint",
    category: "Materials",
    name: "Premium Wall Paint",
    material: "Emulsion",
    qty: Math.ceil((2 * (input.width + input.depth) * (input.height ?? 2.7)) / 12),
    unit: "ltr",
    dimensions: "Walls — 4 sides",
    cost: Math.round(320 * 18 * STYLE_COST_MULT[input.style]),
    retailer: "Asian Paints",
    buyUrl: buildUrl("Asian Paints", "Royale luxury emulsion"),
    pos: [0, 0, 0],
    size: [0, 0, 0],
    color: palette.wall,
    shape: "box",
  });

  // 4. Enforce walkable clearance — drop non-essentials if cramped
  items = enforceClearance(items, input.width, input.depth, corrections);

  let subtotal = items.reduce((s, it) => s + it.cost, 0);

  // 5. Auto-optimize to fit budget (style consistency preserved)
  const optimizations: StudioPlan["optimizations"] = [];
  if (subtotal > input.budget) {
    const candidates = items
      .map((it, idx) => ({ idx, saves: it.alternative?.saves ?? 0 }))
      .filter((x) => x.saves > 0)
      .sort((a, b) => b.saves - a.saves);
    for (const c of candidates) {
      if (subtotal <= input.budget) break;
      const it = items[c.idx];
      if (!it.alternative) continue;
      const newCost = it.cost - it.alternative.saves;
      optimizations.push({
        item: it.name,
        suggestion: `Replace with ${it.alternative.name} → save ₹${it.alternative.saves.toLocaleString("en-IN")}`,
        saves: it.alternative.saves,
      });
      items[c.idx] = {
        ...it,
        name: it.alternative.name,
        cost: newCost,
        buyUrl: it.alternative.buyUrl,
        alternative: undefined,
      };
      subtotal = items.reduce((s, x) => s + x.cost, 0);
    }
    if (subtotal > input.budget) {
      corrections.push(
        `Even after swaps, plan is ₹${(subtotal - input.budget).toLocaleString("en-IN")} over budget. Consider raising budget or simplifying further.`
      );
    }
  } else {
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

  const split = SPLIT_BY_PRIORITY[input.priority];
  const walkability = computeWalkability(items, input.width, input.depth);
  const sqft = Math.round(area * 10.764);

  return {
    input,
    split,
    items,
    subtotal,
    withinBudget: subtotal <= input.budget,
    optimizations,
    palette,
    styleNotes: STYLE_NOTES[input.style],
    corrections,
    realisticBudget: band,
    sqft,
    walkability,
  };
}

export function fmtINR(n: number) {
  return n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)} Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)} L`
    : `₹${Math.round(n).toLocaleString("en-IN")}`;
}
