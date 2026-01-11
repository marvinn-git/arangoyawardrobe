import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to format item concisely (saves memory)
const formatItem = (item: any) => 
  `${item.name}${item.color ? ` (${item.color})` : ""} [${item.id}]`;

// Limit array size to prevent memory issues
const limitItems = (items: any[], max = 15) => items.slice(0, max);

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

    // Input validation with limits
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

    // Fetch ONLY needed fields (no image_url to save memory)
    const { data: clothingItems, error: clothingError } = await supabase
      .from("clothing_items")
      .select(`id, name, color, brand, category_id, categories (name, is_top, is_bottom)`)
      .eq("user_id", user.id)
      .limit(100);

    if (clothingError) throw clothingError;

    if (!clothingItems?.length) {
      return new Response(
        JSON.stringify({ error: "No clothing items found. Add some clothes first!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const excludeSet = new Set(excludeItemIds);
    const availableItems = clothingItems.filter((item: any) => !excludeSet.has(item.id));

    // Fetch style preferences (minimal data)
    const { data: userTags } = await supabase
      .from("user_style_tags")
      .select("style_tags(name)")
      .eq("user_id", user.id)
      .limit(10);

    const styleTags = userTags?.map((t: any) => t.style_tags?.name).filter(Boolean) || [];

    // Categorize items
    const categorize = (items: any[], filter: (item: any) => boolean) => 
      items.filter(filter);

    const allTops = categorize(availableItems, (i: any) => i.categories?.is_top);
    const bottoms = categorize(availableItems, (i: any) => i.categories?.is_bottom);
    
    const footwear = categorize(availableItems, (i: any) => {
      const cat = i.categories?.name?.toLowerCase() || "";
      return !i.categories?.is_top && !i.categories?.is_bottom && 
        (cat.includes("shoe") || cat.includes("sneaker") || cat.includes("boot") || cat.includes("sandal"));
    });
    
    const accessories = categorize(availableItems, (i: any) => {
      const cat = i.categories?.name?.toLowerCase() || "";
      return !i.categories?.is_top && !i.categories?.is_bottom && 
        !cat.includes("shoe") && !cat.includes("sneaker") && !cat.includes("boot") && !cat.includes("sandal");
    });

    if (!allTops.length || !bottoms.length) {
      return new Response(
        JSON.stringify({ error: "You need at least one top and one bottom to generate an outfit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build COMPACT prompt
    const prompt = `Create a complete outfit (4-10 pieces) with layering and accessories.

${occasion ? `Occasion: ${occasion}` : ""}${weather ? ` | Weather: ${weather}` : ""}${mood ? ` | Vibe: ${mood}` : ""}
${extraDetails ? `Notes: ${extraDetails}` : ""}
${styleTags.length ? `Style: ${styleTags.join(", ")}` : ""}

WARDROBE:
TOPS: ${limitItems(allTops).map(formatItem).join("; ")}
BOTTOMS: ${limitItems(bottoms).map(formatItem).join("; ")}
${footwear.length ? `FOOTWEAR: ${limitItems(footwear).map(formatItem).join("; ")}` : ""}
${accessories.length ? `ACCESSORIES: ${limitItems(accessories).map(formatItem).join("; ")}` : ""}

Layer appropriately. Add jewelry/accessories generously!`;

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
          { role: "system", content: "Expert fashion stylist. Create cohesive 4-10 piece outfits with layers and accessories." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_outfit",
            description: "Suggest outfit with item IDs",
            parameters: {
              type: "object",
              properties: {
                outfit_name: { type: "string" },
                item_ids: { type: "array", items: { type: "string" }, description: "All selected item IDs" },
                styling_tips: { type: "string" },
                explanation: { type: "string" },
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

    // Fetch full details only for selected items (with images now)
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
