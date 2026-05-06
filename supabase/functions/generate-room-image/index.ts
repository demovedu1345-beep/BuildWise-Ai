// Generate a photorealistic room image from a Room Blueprint.
// Uses Lovable AI Gateway. Supports two quality tiers:
//   - "fast" -> google/gemini-2.5-flash-image (Nano Banana)
//   - "pro"  -> google/gemini-3-pro-image-preview
// Returns { imageUrl: "data:image/png;base64,...", model, prompt }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BlueprintObject {
  id: string;
  type: string;
  category: string;
  position: [number, number, number];
  size: [number, number, number];
  rotation: number;
  color: string;
  material?: string;
  shape?: string;
}

interface RoomBlueprint {
  version: number;
  hash: string;
  room: string;
  style: string;
  dimensions: { width: number; length: number; height: number };
  palette: { wall: string; floor: string; accent?: string };
  materials: { wall: string; floor: string };
  lighting: "day" | "night";
  objects: BlueprintObject[];
}

type Angle = "iso" | "front" | "back" | "left" | "right" | "top";
type Quality = "fast" | "pro";

const ANGLE_DESCRIPTION: Record<Angle, string> = {
  iso: "wide isometric three-quarter view from the front-right corner at human eye level, showing the full room",
  front: "straight-on front camera view from the entrance, eye-level, showing the back wall and most furniture",
  back: "reverse view from the back wall looking toward the entrance, eye-level",
  left: "view from the left wall looking across the room toward the right wall, eye-level",
  right: "view from the right wall looking across the room toward the left wall, eye-level",
  top: "clean top-down architectural floor plan view, orthographic",
};

function buildPrompt(bp: RoomBlueprint, angle: Angle, userPrompt?: string): string {
  const items = bp.objects
    .filter((o) => o.type !== "frame")
    .slice(0, 16)
    .map(
      (o) =>
        `${o.type} (${o.color}${o.material ? `, ${o.material}` : ""}) at floor position (${o.position[0]}m, ${o.position[2]}m) sized ${o.size[0]}×${o.size[2]}m`,
    )
    .join("; ");

  const lighting =
    bp.lighting === "night"
      ? "cinematic warm interior night lighting with lamp glow and soft shadows, dim ambient blue from window"
      : "natural soft daylight from a large window, global illumination, gentle shadows";

  const lines = [
    `Ultra realistic ${bp.style} ${bp.room} interior, ${bp.dimensions.width}m wide × ${bp.dimensions.length}m deep × ${bp.dimensions.height}m tall`,
    `Floor finish: ${bp.materials.floor}. Wall finish: ${bp.materials.wall}.`,
    `Furniture and objects: ${items}.`,
    `Camera: ${ANGLE_DESCRIPTION[angle]}.`,
    `Lighting: ${lighting}.`,
    `Render style: photorealistic 4k architectural interior render, accurate scale, sharp materials, cinematic depth of field.`,
    `Strict: do not add text, watermarks, people, or extra furniture beyond the listed objects. Match the layout exactly.`,
  ];
  if (userPrompt && userPrompt.trim()) {
    lines.push(`Additional user direction: ${userPrompt.trim()}`);
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const blueprint = body?.blueprint as RoomBlueprint | undefined;
    const angle = (body?.angle ?? "iso") as Angle;
    const quality = (body?.quality ?? "fast") as Quality;
    const userPrompt = (body?.userPrompt ?? "") as string;
    const seed = body?.seed as number | undefined;

    if (!blueprint || !blueprint.objects) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid blueprint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const primaryModel =
      quality === "pro"
        ? "google/gemini-3-pro-image-preview"
        : "google/gemini-3.1-flash-image-preview";
    // Fallback chain: if primary fails on a non-billing/non-rate error, try the lighter model.
    const fallbackModel = "google/gemini-2.5-flash-image";

    const prompt = buildPrompt(blueprint, angle, userPrompt) +
      (seed != null ? `\nVariation seed: ${seed}` : "");

    async function callModel(model: string) {
      return await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        },
      );
    }

    let aiResp = await callModel(primaryModel);
    let usedModel = primaryModel;

    // Surface billing/rate-limit errors immediately — fallback won't help.
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please wait a few seconds and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Other failure → try fallback model once.
    if (!aiResp.ok && primaryModel !== fallbackModel) {
      const errText = await aiResp.text().catch(() => "");
      console.warn("Primary model failed, trying fallback:", primaryModel, aiResp.status, errText);
      aiResp = await callModel(fallbackModel);
      usedModel = fallbackModel;
    }

    if (!aiResp.ok) {
      const text = await aiResp.text().catch(() => "");
      console.error("AI gateway error:", aiResp.status, text);
      return new Response(
        JSON.stringify({ error: `Image model error (${aiResp.status}). Please try again.` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.error("No image in response", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Model returned no image. Try regenerating." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, model: usedModel, angle, quality }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-room-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
