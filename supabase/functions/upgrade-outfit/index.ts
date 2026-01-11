import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to format item concisely
const formatItem = (item: any) => 
  `${item.name}${item.color ? ` (${item.color})` : ""} [${item.id}]`;

const limitItems = (items: any[], max = 12) => items.slice(0, max);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const outfitId = typeof body.outfitId === "string" && uuidRegex.test(body.outfitId) ? body.outfitId : null;
    const upgradePreference = typeof body.upgradePreference === "string" ? body.upgradePreference.slice(0, 200) : "";

    if (!outfitId) {
      return new Response(
        JSON.stringify({ error: "Valid Outfit ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch outfit (minimal fields)
    const { data: outfit, error: outfitError } = await supabase
      .from("outfits")
      .select("id, name, notes")
      .eq("id", outfitId)
      .eq("user_id", user.id)
      .single();

    if (outfitError || !outfit) throw new Error("Outfit not found");

    // Fetch outfit item IDs
    const { data: outfitItems } = await supabase
      .from("outfit_items")
      .select("clothing_item_id")
      .eq("outfit_id", outfitId);

    const currentItemIds = outfitItems?.map(i => i.clothing_item_id) || [];

    // Fetch current clothes (no image_url for prompt building)
    const { data: currentClothes } = await supabase
      .from("clothing_items")
      .select(`id, name, color, category_id, categories (name, is_top, is_bottom)`)
      .in("id", currentItemIds);

    // Fetch available upgrades (limited, no image_url)
    const { data: allItems } = await supabase
      .from("clothing_items")
      .select(`id, name, color, category_id, categories (name, is_top, is_bottom)`)
      .eq("user_id", user.id)
      .limit(80);

    // Fetch style tags
    const { data: userTags } = await supabase
      .from("user_style_tags")
      .select("style_tags(name)")
      .eq("user_id", user.id)
      .limit(10);

    const styleTags = userTags?.map((t: any) => t.style_tags?.name).filter(Boolean) || [];

    const currentIdSet = new Set(currentItemIds);
    const availableUpgrades = allItems?.filter((item: any) => !currentIdSet.has(item.id)) || [];

    const tops = availableUpgrades.filter((i: any) => i.categories?.is_top);
    const bottoms = availableUpgrades.filter((i: any) => i.categories?.is_bottom);
    const accessories = availableUpgrades.filter((i: any) => !i.categories?.is_top && !i.categories?.is_bottom);

    // Build COMPACT prompt
    const prompt = `Analyze outfit "${outfit.name}" and suggest improvements.

CURRENT: ${currentClothes?.map((i: any) => `${i.name} (${i.color || ""})`).join(", ") || "Empty"}
${upgradePreference ? `REQUEST: ${upgradePreference}` : ""}
${styleTags.length ? `STYLE: ${styleTags.join(", ")}` : ""}

AVAILABLE TO ADD:
${tops.length ? `Tops: ${limitItems(tops).map(formatItem).join("; ")}` : ""}
${bottoms.length ? `Bottoms: ${limitItems(bottoms).map(formatItem).join("; ")}` : ""}
${accessories.length ? `Accessories: ${limitItems(accessories).map(formatItem).join("; ")}` : ""}

Rate 1-10, suggest adds/swaps if needed.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Fashion stylist. Be honest - if outfit is great, say so. Suggest specific improvements with item IDs." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_and_upgrade",
            description: "Analyze outfit and suggest upgrades",
            parameters: {
              type: "object",
              properties: {
                is_already_great: { type: "boolean" },
                current_rating: { type: "number" },
                current_analysis: { type: "string" },
                improvement_areas: { type: "string" },
                add_item_ids: { type: "array", items: { type: "string" } },
                styling_tips: { type: "string" },
                upgraded_rating: { type: "number" },
              },
              required: ["current_rating", "current_analysis", "styling_tips"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_and_upgrade" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("Invalid AI response");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Fetch full details only for suggested items (with images)
    const suggestedIds = analysis.add_item_ids || [];
    let suggestedItems: any[] = [];
    
    if (suggestedIds.length > 0) {
      const { data } = await supabase
        .from("clothing_items")
        .select(`id, name, color, brand, image_url, category_id, categories (name, is_top, is_bottom)`)
        .in("id", suggestedIds)
        .eq("user_id", user.id);
      suggestedItems = data || [];
    }

    // Fetch full current items with images for response
    const { data: fullCurrentClothes } = await supabase
      .from("clothing_items")
      .select(`id, name, color, brand, image_url, category_id, categories (name, is_top, is_bottom)`)
      .in("id", currentItemIds);

    return new Response(
      JSON.stringify({
        outfit,
        currentItems: fullCurrentClothes,
        analysis: { ...analysis, suggestedItems },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
