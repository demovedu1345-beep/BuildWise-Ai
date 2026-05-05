// Analyze uploaded room photos with GPT-5 vision -> structured RoomAnalysis JSON.
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
    const { images, hint } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "images required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const content: any[] = [
      { type: "text", text: `Analyze ${images.length} photo(s) of a real room${hint ? ` (user note: ${hint})` : ""}. Return a strict structured analysis. Estimate room dimensions in meters. List existing furniture and major objects with approximate positions (x,z meters from front-left corner) and sizes. Identify wall color, floor type, lighting, natural light direction, current style.` },
      ...images.map((url: string) => ({ type: "image_url", image_url: { url } })),
    ];

    const tool = {
      type: "function",
      function: {
        name: "report_room",
        description: "Structured analysis of the uploaded room",
        parameters: {
          type: "object",
          properties: {
            room_type: { type: "string", enum: ["bedroom","living","kitchen","bathroom","study","gaming","dining","office","kids","other"] },
            dimensions: { type: "object", properties: { width: { type: "number" }, length: { type: "number" }, height: { type: "number" } }, required: ["width","length","height"] },
            wall_color: { type: "string" },
            floor_type: { type: "string" },
            lighting: { type: "string" },
            natural_light: { type: "string" },
            current_style: { type: "string" },
            condition: { type: "string", enum: ["poor","fair","good","excellent"] },
            existing_objects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  description: { type: "string" },
                  position: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                  size: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                  color: { type: "string" },
                },
                required: ["type","description","position","size","color"],
                additionalProperties: false,
              },
            },
            walls: {
              type: "object",
              properties: {
                front: { type: "string" }, back: { type: "string" }, left: { type: "string" }, right: { type: "string" },
              },
            },
            recommendations_summary: { type: "string" },
          },
          required: ["room_type","dimensions","wall_color","floor_type","lighting","current_style","condition","existing_objects","recommendations_summary"],
          additionalProperties: false,
        },
      },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert interior architect analyzing real room photos. Be accurate and conservative with estimates." },
          { role: "user", content },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_room" } },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("analyze-room AI error", r.status, t);
      const status = r.status === 429 || r.status === 402 ? r.status : 500;
      const error = r.status === 402 ? "AI credits exhausted. Add credits in Settings → Workspace → Usage." : r.status === 429 ? "Rate limit reached. Please retry." : `AI gateway error: ${r.status}`;
      return new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const analysis = args ? JSON.parse(args) : null;
    if (!analysis) throw new Error("No analysis returned");

    return new Response(JSON.stringify({ analysis }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("analyze-room error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
