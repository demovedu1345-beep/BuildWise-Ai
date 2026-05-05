// Redesign an uploaded room photo using Lovable AI image editing.
// Preserves existing room geometry (walls, windows, doors) and applies the chosen style/decor.
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
    const body = await req.json();
    const {
      sourceImage,        // data url or https url of original room
      analysis,           // RoomAnalysis JSON (optional but recommended)
      style = "modern",
      colorTheme = "warm neutrals",
      roomPurpose = "living",
      budgetTier = "balanced",
      userPrompt = "",
      quality = "pro",
      seed,
    } = body;
    if (!sourceImage) {
      return new Response(JSON.stringify({ error: "sourceImage required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const objectsLine = analysis?.existing_objects?.length
      ? `Existing structural elements to preserve: ${analysis.existing_objects.map((o: any) => o.type).join(", ")}.`
      : "";

    const dims = analysis?.dimensions ? `Room is approximately ${analysis.dimensions.width}m × ${analysis.dimensions.length}m × ${analysis.dimensions.height}m.` : "";

    const prompt = [
      `Redesign this exact room as a ${style} ${roomPurpose} space using a ${colorTheme} palette, ${budgetTier} budget tier.`,
      `STRICT: keep the original camera angle, walls, windows, doors, ceiling height, and overall geometry IDENTICAL to the source image. Do not change the room's shape or perspective.`,
      `Replace furniture and decor to match the new style. Add appropriate lighting, rugs, art, plants.`,
      dims, objectsLine,
      `Photorealistic 4k interior render, cinematic lighting, sharp materials, accurate scale, no text, no watermark, no people.`,
      userPrompt ? `Additional user direction: ${userPrompt}` : "",
      seed != null ? `Variation seed: ${seed}` : "",
    ].filter(Boolean).join("\n");

    const model = quality === "pro" ? "google/gemini-3-pro-image-preview" : "google/gemini-2.5-flash-image";

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: sourceImage } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("redesign-room AI error", r.status, t);
      const status = r.status === 429 || r.status === 402 ? r.status : 500;
      const error = r.status === 402 ? "AI credits exhausted. Add credits in Settings → Workspace → Usage." : r.status === 429 ? "Rate limit reached. Please retry." : `AI gateway error: ${r.status}`;
      return new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error("No image returned");
    return new Response(JSON.stringify({ imageUrl, model }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("redesign-room error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
