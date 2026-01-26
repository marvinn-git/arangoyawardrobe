import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatItem = (item: any) => 
  `${item.name}${item.color ? ` (${item.color})` : ""} [${item.id}]`;

const limitItems = (items: any[], max = 12) => items.slice(0, max);

// Weather-aware guidance
const getWeatherGuidance = (weather: string): string => {
  const w = weather.toLowerCase();
  if (w.includes("cold") || w.includes("winter") || w.includes("freezing") || w.includes("snow")) {
    return "MUST include: jacket/coat, layers. Consider: scarf, gloves, warm accessories. Avoid: shorts, tank tops, sandals.";
  }
  if (w.includes("cool") || w.includes("autumn") || w.includes("fall") || w.includes("chilly")) {
    return "Include: light jacket or sweater for layering. Optional: scarf. Avoid: heavy winter coats.";
  }
  if (w.includes("hot") || w.includes("summer") || w.includes("warm") || w.includes("humid")) {
    return "Prioritize: breathable fabrics, light colors. Avoid: jackets, scarves, heavy layers, boots.";
  }
  if (w.includes("rain") || w.includes("wet")) {
    return "Include: water-resistant jacket if available. Avoid: suede shoes, delicate fabrics.";
  }
  return "";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const occasion = typeof body.occasion === "string" ? body.occasion.slice(0, 100) : "";
    const weather = typeof body.weather === "string" ? body.weather.slice(0, 50) : "";
    const mood = typeof body.mood === "string" ? body.mood.slice(0, 50) : "";
    const extraDetails = typeof body.extraDetails === "string" ? body.extraDetails.slice(0, 200) : "";
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let excludeItemIds: string[] = [];
    if (Array.isArray(body.excludeItemIds)) {
      excludeItemIds = body.excludeItemIds.filter(
        (id): id is string => typeof id === "string" && uuidRegex.test(id)
      ).slice(0, 50);
    }

    // Fetch clothing with categories in one query
    const { data: clothingItems, error: clothingError } = await supabase
      .from("clothing_items")
      .select(`id, name, color, brand, category_id, categories (name, is_top, is_bottom)`)
      .eq("user_id", user.id)
      .limit(80);

    if (clothingError) throw clothingError;

    if (!clothingItems?.length) {
      return new Response(JSON.stringify({ error: "No clothing items found. Add some clothes first!" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const excludeSet = new Set(excludeItemIds);
    const availableItems = clothingItems.filter((item: any) => !excludeSet.has(item.id));

    // Categorize efficiently
    const tops: any[] = [], bottoms: any[] = [], footwear: any[] = [], accessories: any[] = [];
    
    for (const item of availableItems) {
      const cat = item.categories as any;
      const catName = cat?.name?.toLowerCase() || "";
      if (cat?.is_top) tops.push(item);
      else if (cat?.is_bottom) bottoms.push(item);
      else if (catName.includes("shoe") || catName.includes("sneaker") || catName.includes("boot") || catName.includes("sandal") || catName.includes("loafer")) {
        footwear.push(item);
      } else accessories.push(item);
    }

    if (!tops.length || !bottoms.length) {
      return new Response(JSON.stringify({ error: "Need at least one top and one bottom" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get weather guidance
    const weatherGuidance = weather ? getWeatherGuidance(weather) : "";

    // Build concise prompt
    const prompt = `Create outfit (4-8 pieces) for: ${occasion || "everyday"}
${weather ? `Weather: ${weather}` : ""}${mood ? ` | Vibe: ${mood}` : ""}
${extraDetails ? `User notes: ${extraDetails}` : ""}
${weatherGuidance ? `\n⚠️ WEATHER RULES: ${weatherGuidance}` : ""}

WARDROBE:
TOPS: ${limitItems(tops).map(formatItem).join("; ")}
BOTTOMS: ${limitItems(bottoms).map(formatItem).join("; ")}
${footwear.length ? `SHOES: ${limitItems(footwear, 8).map(formatItem).join("; ")}` : ""}
${accessories.length ? `ACCESSORIES: ${limitItems(accessories, 10).map(formatItem).join("; ")}` : ""}

Select items that work together. Follow weather rules strictly!`;

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
          { 
            role: "system", 
            content: `You are an expert fashion stylist. Create cohesive outfits using ONLY provided item IDs. 
CRITICAL: Follow weather rules exactly - if it's cold, include jackets/layers; if hot, avoid heavy items.
Be practical and stylish. Include accessories when appropriate.` 
          },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_outfit",
            description: "Suggest outfit with exact item IDs from wardrobe",
            parameters: {
              type: "object",
              properties: {
                outfit_name: { type: "string", description: "Creative outfit name" },
                item_ids: { type: "array", items: { type: "string" }, description: "Selected item IDs" },
                styling_tips: { type: "string", description: "Brief styling advice" },
                explanation: { type: "string", description: "Why these items work together" },
              },
              required: ["outfit_name", "item_ids", "styling_tips", "explanation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_outfit" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) throw new Error("Invalid AI response");

    const suggestion = JSON.parse(toolCall.function.arguments);
    const selectedIds = new Set(suggestion.item_ids || []);

    // Fetch full details only for selected items
    const { data: selectedItems } = await supabase
      .from("clothing_items")
      .select(`id, name, color, brand, image_url, category_id, categories (name, is_top, is_bottom)`)
      .in("id", Array.from(selectedIds))
      .eq("user_id", user.id);

    const validItems = selectedItems || [];
    const topItem = validItems.find((i: any) => i.categories?.is_top);
    const bottomItem = validItems.find((i: any) => i.categories?.is_bottom);

    return new Response(
      JSON.stringify({
        suggestion: {
          outfit_name: suggestion.outfit_name,
          top_id: topItem?.id,
          bottom_id: bottomItem?.id,
          accessory_ids: validItems.filter((i: any) => i.id !== topItem?.id && i.id !== bottomItem?.id).map((i: any) => i.id),
          styling_tips: suggestion.styling_tips,
          explanation: suggestion.explanation,
          items: validItems,
        },
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
