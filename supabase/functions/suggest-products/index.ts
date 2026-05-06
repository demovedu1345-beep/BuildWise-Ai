// Suggest real, buyable products for a redesigned room using LLM structured output.
// Generates Amazon.in / Flipkart / Pepperfry search URLs (no API keys required, always works).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");
    const { analysis, style, roomPurpose, budget, location, colorTheme, userPrompt } = await req.json();

    const tool = {
      type: "function",
      function: {
        name: "list_products",
        description: "Real products to recreate the redesigned room within budget",
        parameters: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string", enum: ["Furniture","Lighting","Decor","Materials","Textiles","Storage"] },
                  name: { type: "string", description: "Specific product name e.g. 'Wakefit Engineered Wood Queen Bed'" },
                  brand: { type: "string", description: "Real Indian/global brand sold in India" },
                  description: { type: "string" },
                  price_inr: { type: "number" },
                  qty: { type: "number" },
                  retailer: { type: "string", enum: ["Amazon","Flipkart","Pepperfry","Urban Ladder","IKEA","Asian Paints","Nilkamal"] },
                  search_query: { type: "string", description: "Exact phrase to search on the retailer site" },
                  color: { type: "string", description: "hex color #rrggbb" },
                  why: { type: "string", description: "1 line: why this product fits the design" },
                },
                required: ["category","name","brand","description","price_inr","qty","retailer","search_query","color","why"],
                additionalProperties: false,
              },
            },
          },
          required: ["products"],
          additionalProperties: false,
        },
      },
    };

    const sys = `You are a senior Indian interior designer & product sourcer. Recommend 8-14 SPECIFIC, REAL products available in India that together recreate a redesigned ${style} ${roomPurpose} within ₹${budget?.toLocaleString?.("en-IN")}. Use real brands (Wakefit, Urban Ladder, Pepperfry, Nilkamal, IKEA India, Asian Paints, Philips Hue, Sleepyhead, Hometown, etc). Prices must be realistic Indian retail prices in INR. Total must stay within budget.`;
    const userMsg = `Color theme: ${colorTheme}. Location: ${location || "India"}. ${analysis ? `Existing room: ${analysis.dimensions?.width}×${analysis.dimensions?.length}m, ${analysis.current_style}.` : ""} ${userPrompt ? `User wants: ${userPrompt}` : ""}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "list_products" } },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("suggest-products AI error", r.status, t);
      const status = r.status === 429 || r.status === 402 ? r.status : 500;
      const error = r.status === 402 ? "AI credits exhausted. Add credits in Settings → Workspace → Usage." : r.status === 429 ? "Rate limit reached. Please retry." : `AI gateway error: ${r.status}`;
      return new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { products: [] };

    // Build buy URLs (always work — search results pages)
    const products = (parsed.products || []).map((p: any, i: number) => {
      const q = encodeURIComponent(p.search_query || `${p.brand} ${p.name}`);
      const buyUrl =
        p.retailer === "Flipkart" ? `https://www.flipkart.com/search?q=${q}` :
        p.retailer === "Pepperfry" ? `https://www.pepperfry.com/site_product/search?q=${q}` :
        p.retailer === "Urban Ladder" ? `https://www.urbanladder.com/products/search?keywords=${q}` :
        p.retailer === "IKEA" ? `https://www.ikea.com/in/en/search/?q=${q}` :
        p.retailer === "Asian Paints" ? `https://www.asianpaints.com/search-results.html?q=${q}` :
        p.retailer === "Nilkamal" ? `https://www.nilkamalfurniture.com/search?q=${q}` :
        `https://www.amazon.in/s?k=${q}`;
      // Use a deterministic placeholder image (Unsplash source service was deprecated).
      // The retailer search page will show the real product photos when the user clicks "Buy".
      const seed = encodeURIComponent(`${p.brand}-${p.name}-${i}`);
      const imageUrl = `https://picsum.photos/seed/${seed}/600/400`;
      return { id: `prod-${i}`, ...p, buyUrl, imageUrl };
    });

    return new Response(JSON.stringify({ products }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("suggest-products error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
