import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation
    const occasion = typeof body.occasion === "string" ? body.occasion.slice(0, 200) : "";
    const weather = typeof body.weather === "string" ? body.weather.slice(0, 100) : "";
    const mood = typeof body.mood === "string" ? body.mood.slice(0, 100) : "";
    const extraDetails = typeof body.extraDetails === "string" ? body.extraDetails.slice(0, 500) : "";
    
    // Validate excludeItemIds as array of UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let excludeItemIds: string[] = [];
    if (Array.isArray(body.excludeItemIds)) {
      excludeItemIds = body.excludeItemIds.filter(
        (id): id is string => typeof id === "string" && uuidRegex.test(id)
      ).slice(0, 100);
    }

    // Fetch user's clothing items
    const { data: clothingItems, error: clothingError } = await supabase
      .from("clothing_items")
      .select(`
        id,
        name,
        color,
        brand,
        image_url,
        category_id,
        categories (
          name,
          name_es,
          is_top,
          is_bottom
        )
      `)
      .eq("user_id", user.id);

    if (clothingError) throw clothingError;

    if (!clothingItems || clothingItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No clothing items found. Add some clothes first!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out excluded items if any
    const excludeSet = new Set(excludeItemIds || []);
    const availableItems = clothingItems.filter((item: any) => !excludeSet.has(item.id));

    // Fetch user's style preferences
    const { data: userTags } = await supabase
      .from("user_style_tags")
      .select("style_tags(name)")
      .eq("user_id", user.id);

    const styleTags = userTags?.map((t: any) => t.style_tags?.name).filter(Boolean) || [];

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, style_preferences, height_cm, weight_kg")
      .eq("user_id", user.id)
      .single();

    // Categorize items with more detail
    const baseLayerTops = availableItems.filter((item: any) => {
      const catName = item.categories?.name?.toLowerCase() || "";
      return item.categories?.is_top && 
        (catName.includes("t-shirt") || catName.includes("tank") || catName.includes("polo") || catName === "shirt");
    });
    
    const midLayerTops = availableItems.filter((item: any) => {
      const catName = item.categories?.name?.toLowerCase() || "";
      return item.categories?.is_top && 
        (catName.includes("sweater") || catName.includes("hoodie") || catName.includes("cardigan") || catName.includes("vest"));
    });
    
    const outerLayerTops = availableItems.filter((item: any) => {
      const catName = item.categories?.name?.toLowerCase() || "";
      return item.categories?.is_top && 
        (catName.includes("jacket") || catName.includes("coat") || catName.includes("blazer"));
    });
    
    const allTops = availableItems.filter((item: any) => item.categories?.is_top);
    const bottoms = availableItems.filter((item: any) => item.categories?.is_bottom);
    const footwear = availableItems.filter((item: any) => {
      const catName = item.categories?.name?.toLowerCase() || "";
      return !item.categories?.is_top && !item.categories?.is_bottom && 
        (catName.includes("sneaker") || catName.includes("boot") || catName.includes("loafer") || catName.includes("shoe") || catName.includes("sandal"));
    });
    const accessories = availableItems.filter((item: any) => {
      const catName = item.categories?.name?.toLowerCase() || "";
      return !item.categories?.is_top && !item.categories?.is_bottom && 
        !catName.includes("sneaker") && !catName.includes("boot") && !catName.includes("loafer") && !catName.includes("shoe") && !catName.includes("sandal");
    });
    
    // Separate jewelry from other accessories for better AI guidance
    const jewelry = accessories.filter((item: any) => {
      const catName = item.categories?.name?.toLowerCase() || "";
      return catName.includes("ring") || catName.includes("chain") || catName.includes("necklace") || 
             catName.includes("bracelet") || catName.includes("earring") || catName.includes("jewelry");
    });
    const otherAccessories = accessories.filter((item: any) => {
      const catName = item.categories?.name?.toLowerCase() || "";
      return !(catName.includes("ring") || catName.includes("chain") || catName.includes("necklace") || 
               catName.includes("bracelet") || catName.includes("earring") || catName.includes("jewelry"));
    });

    if (allTops.length === 0 || bottoms.length === 0) {
      return new Response(
        JSON.stringify({ error: "You need at least one top and one bottom item to generate an outfit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build comprehensive AI prompt
    const prompt = `You are an expert fashion stylist AI. Create a complete, well-coordinated outfit from the user's wardrobe.

IMPORTANT GUIDELINES:
1. ALWAYS include MULTIPLE tops when appropriate - combine a base layer (t-shirt) with mid-layer (sweater/hoodie) AND/OR outer layer (jacket/coat)
2. Consider LAYERING based on weather - cold weather needs more layers, warm weather can be minimal
3. ALWAYS include footwear if available - it completes the look
4. ALWAYS add accessories that complement the style - especially JEWELRY (rings, chains, necklaces, bracelets, watches), hats, belts, bags
5. Consider color coordination and style coherence
6. The outfit should have 4-10 pieces total for a complete, styled look - don't be minimal, accessorize generously!
7. Include multiple accessories when available - a chain, a ring, and a watch can all work together

USER'S STYLE PREFERENCES:
${styleTags.length > 0 ? `Style tags: ${styleTags.join(", ")}` : "No specific style tags"}
${profile?.style_preferences ? `Notes: ${profile.style_preferences}` : ""}
${profile?.height_cm ? `Height: ${profile.height_cm}cm` : ""}

USER'S REQUIREMENTS:
${occasion ? `Occasion: ${occasion}` : "General daily wear"}
${weather ? `Weather: ${weather}` : "Moderate weather"}
${mood ? `Mood/Vibe: ${mood}` : ""}
${extraDetails ? `Additional requests: ${extraDetails}` : ""}

AVAILABLE WARDROBE:

${baseLayerTops.length > 0 ? `BASE LAYER TOPS (T-shirts, Tank tops, Basic shirts):
${baseLayerTops.map((t: any) => `- ${t.name} (${t.color || "no color"}, ${t.brand || "no brand"}, Category: ${t.categories?.name}) [ID: ${t.id}]`).join("\n")}
` : ""}

${midLayerTops.length > 0 ? `MID LAYER TOPS (Sweaters, Hoodies, Cardigans):
${midLayerTops.map((t: any) => `- ${t.name} (${t.color || "no color"}, ${t.brand || "no brand"}, Category: ${t.categories?.name}) [ID: ${t.id}]`).join("\n")}
` : ""}

${outerLayerTops.length > 0 ? `OUTER LAYER TOPS (Jackets, Coats, Blazers):
${outerLayerTops.map((t: any) => `- ${t.name} (${t.color || "no color"}, ${t.brand || "no brand"}, Category: ${t.categories?.name}) [ID: ${t.id}]`).join("\n")}
` : ""}

BOTTOMS:
${bottoms.map((b: any) => `- ${b.name} (${b.color || "no color"}, ${b.brand || "no brand"}, Category: ${b.categories?.name}) [ID: ${b.id}]`).join("\n")}

${footwear.length > 0 ? `FOOTWEAR:
${footwear.map((f: any) => `- ${f.name} (${f.color || "no color"}, ${f.brand || "no brand"}) [ID: ${f.id}]`).join("\n")}
` : ""}

${jewelry.length > 0 ? `JEWELRY (Rings, Chains, Necklaces, Bracelets - ADD MULTIPLE!):
${jewelry.map((j: any) => `- ${j.name} (${j.color || "no color"}, ${j.brand || "no brand"}, Category: ${j.categories?.name}) [ID: ${j.id}]`).join("\n")}
` : ""}

${otherAccessories.length > 0 ? `OTHER ACCESSORIES (Hats, Watches, Belts, Bags, Sunglasses, etc.):
${otherAccessories.map((a: any) => `- ${a.name} (${a.color || "no color"}, ${a.brand || "no brand"}, Category: ${a.categories?.name}) [ID: ${a.id}]`).join("\n")}
` : ""}

Create a stylish, cohesive outfit using the suggest_outfit function. Remember to LAYER appropriately and ADD JEWELRY/ACCESSORIES generously!`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert fashion stylist. Create complete, layered outfits with 4-10 pieces that look cohesive and stylish. ALWAYS include footwear and MULTIPLE accessories including jewelry (rings, chains, necklaces). Think about how pieces work together - colors, textures, and overall vibe. Be generous with accessories!" },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_outfit",
              description: "Suggest a complete outfit combination with multiple pieces including layering",
              parameters: {
                type: "object",
                properties: {
                  outfit_name: { 
                    type: "string", 
                    description: "A creative, descriptive name for the outfit that captures its vibe" 
                  },
                  base_layer_ids: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "IDs of base layer tops (t-shirts, tank tops, basic shirts worn closest to body)" 
                  },
                  mid_layer_ids: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "IDs of mid layer tops (sweaters, hoodies, cardigans worn over base layer)" 
                  },
                  outer_layer_ids: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "IDs of outer layer tops (jackets, coats, blazers worn on top)" 
                  },
                  bottom_id: { 
                    type: "string", 
                    description: "The ID of the selected bottom item (pants, jeans, shorts)" 
                  },
                  footwear_id: { 
                    type: "string", 
                    description: "The ID of the selected footwear (optional)" 
                  },
                  accessory_ids: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Array of accessory IDs (hats, watches, chains, belts, bags)" 
                  },
                  styling_tips: { 
                    type: "string", 
                    description: "Detailed styling tips - how to wear each piece, what to tuck, roll, etc." 
                  },
                  explanation: { 
                    type: "string", 
                    description: "Why this combination works - color story, style coherence, and how it matches the user's preferences" 
                  },
                  color_palette: {
                    type: "string",
                    description: "The main colors in this outfit and how they work together"
                  },
                },
                required: ["outfit_name", "bottom_id", "styling_tips", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_outfit" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response");
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    // Collect all selected item IDs
    const allSelectedIds = [
      ...(suggestion.base_layer_ids || []),
      ...(suggestion.mid_layer_ids || []),
      ...(suggestion.outer_layer_ids || []),
      suggestion.bottom_id,
      suggestion.footwear_id,
      ...(suggestion.accessory_ids || []),
    ].filter(Boolean);

    // Validate and collect the items
    const validItems = availableItems.filter((item: any) => allSelectedIds.includes(item.id));

    // For backward compatibility, set top_id to the first base layer or first top
    const topId = suggestion.base_layer_ids?.[0] || suggestion.mid_layer_ids?.[0] || suggestion.outer_layer_ids?.[0];

    return new Response(
      JSON.stringify({
        suggestion: {
          outfit_name: suggestion.outfit_name,
          top_id: topId,
          bottom_id: suggestion.bottom_id,
          accessory_ids: [
            ...(suggestion.mid_layer_ids || []),
            ...(suggestion.outer_layer_ids || []),
            suggestion.footwear_id,
            ...(suggestion.accessory_ids || []),
          ].filter(Boolean),
          styling_tips: suggestion.styling_tips,
          explanation: suggestion.explanation,
          color_palette: suggestion.color_palette,
          items: validItems,
          layers: {
            base: suggestion.base_layer_ids || [],
            mid: suggestion.mid_layer_ids || [],
            outer: suggestion.outer_layer_ids || [],
            bottom: suggestion.bottom_id,
            footwear: suggestion.footwear_id,
            accessories: suggestion.accessory_ids || [],
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-outfit:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
