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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const outfitId = typeof body.outfitId === "string" && uuidRegex.test(body.outfitId) 
      ? body.outfitId 
      : null;
    const upgradePreference = typeof body.upgradePreference === "string" 
      ? body.upgradePreference.slice(0, 500) 
      : "";

    if (!outfitId) {
      return new Response(
        JSON.stringify({ error: "Valid Outfit ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the outfit
    const { data: outfit, error: outfitError } = await supabase
      .from("outfits")
      .select("*")
      .eq("id", outfitId)
      .eq("user_id", user.id)
      .single();

    if (outfitError || !outfit) {
      throw new Error("Outfit not found");
    }

    // Fetch outfit items
    const { data: outfitItems } = await supabase
      .from("outfit_items")
      .select("clothing_item_id")
      .eq("outfit_id", outfitId);

    const currentItemIds = outfitItems?.map(i => i.clothing_item_id) || [];

    // Fetch current outfit clothing details
    const { data: currentClothes } = await supabase
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
      .in("id", currentItemIds);

    // Fetch ALL user's clothing items for potential upgrades
    const { data: allClothingItems } = await supabase
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

    // Fetch user's style preferences
    const { data: userTags } = await supabase
      .from("user_style_tags")
      .select("style_tags(name)")
      .eq("user_id", user.id);

    const styleTags = userTags?.map((t: any) => t.style_tags?.name).filter(Boolean) || [];

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, style_preferences")
      .eq("user_id", user.id)
      .single();

    // Find items NOT in current outfit for potential additions
    const currentIdSet = new Set(currentItemIds);
    const availableUpgrades = allClothingItems?.filter((item: any) => !currentIdSet.has(item.id)) || [];

    // Categorize available upgrades
    const availableTops = availableUpgrades.filter((item: any) => item.categories?.is_top);
    const availableBottoms = availableUpgrades.filter((item: any) => item.categories?.is_bottom);
    const availableAccessories = availableUpgrades.filter((item: any) => 
      !item.categories?.is_top && !item.categories?.is_bottom
    );

    // Build comprehensive AI prompt
    const prompt = `You are an expert fashion stylist AI. Analyze this outfit and suggest improvements.

CURRENT OUTFIT: "${outfit.name}"
${outfit.notes ? `Notes: ${outfit.notes}` : ""}

CURRENT PIECES:
${currentClothes?.map((item: any) => 
  `- ${item.name} (${item.color || "no color"}, ${item.brand || "no brand"}, ${item.categories?.name})`
).join("\n") || "No items"}

USER'S STYLE:
${styleTags.length > 0 ? `Style tags: ${styleTags.join(", ")}` : "No specific style tags"}
${profile?.style_preferences ? `Notes: ${profile.style_preferences}` : ""}

${upgradePreference ? `USER'S UPGRADE REQUEST: ${upgradePreference}` : ""}

AVAILABLE ITEMS FOR UPGRADE (not in current outfit):

${availableTops.length > 0 ? `TOPS:
${availableTops.map((t: any) => `- ${t.name} (${t.color || "no color"}, ${t.brand || "no brand"}, ${t.categories?.name}) [ID: ${t.id}]`).join("\n")}
` : "No additional tops available"}

${availableBottoms.length > 0 ? `BOTTOMS:
${availableBottoms.map((b: any) => `- ${b.name} (${b.color || "no color"}, ${b.brand || "no brand"}, ${b.categories?.name}) [ID: ${b.id}]`).join("\n")}
` : "No additional bottoms available"}

${availableAccessories.length > 0 ? `ACCESSORIES:
${availableAccessories.map((a: any) => `- ${a.name} (${a.color || "no color"}, ${a.brand || "no brand"}, ${a.categories?.name}) [ID: ${a.id}]`).join("\n")}
` : "No additional accessories available"}

YOUR TASK:
1. First, analyze if the current outfit is good as-is or needs improvement
2. If it's already great, say so and explain why
3. If it can be improved, suggest SPECIFIC items to ADD or SWAP
4. Consider color coordination, layering opportunities, and style coherence
5. Be honest - if the outfit is solid, don't force unnecessary changes

Use the analyze_and_upgrade function to return your analysis.`;

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
          { role: "system", content: "You are an expert fashion stylist who gives honest, helpful feedback. Be specific about improvements but also recognize when an outfit is already well-composed. Consider the user's style preferences deeply." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_and_upgrade",
              description: "Analyze the current outfit and suggest upgrades",
              parameters: {
                type: "object",
                properties: {
                  is_already_great: { 
                    type: "boolean", 
                    description: "True if the outfit is already well-composed and doesn't need changes" 
                  },
                  current_rating: {
                    type: "number",
                    description: "Rate the current outfit from 1-10"
                  },
                  current_analysis: { 
                    type: "string", 
                    description: "Detailed analysis of what's working well in the current outfit" 
                  },
                  improvement_areas: { 
                    type: "string", 
                    description: "Areas that could be improved (or 'None - this outfit is fire!' if perfect)" 
                  },
                  add_item_ids: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "IDs of items to ADD to the outfit from user's wardrobe" 
                  },
                  swap_suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        remove_item_name: { type: "string", description: "Name of item to remove" },
                        add_item_id: { type: "string", description: "ID of item to add instead" },
                        reason: { type: "string", description: "Why this swap improves the outfit" }
                      }
                    },
                    description: "Suggested swaps (replace one item with another)"
                  },
                  styling_tips: { 
                    type: "string", 
                    description: "Specific styling advice for this outfit" 
                  },
                  upgraded_rating: {
                    type: "number",
                    description: "Predicted rating after upgrades (1-10)"
                  },
                  shopping_suggestions: {
                    type: "string",
                    description: "If the wardrobe is missing key pieces, what should the user consider buying?"
                  }
                },
                required: ["is_already_great", "current_rating", "current_analysis", "improvement_areas", "styling_tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_and_upgrade" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Get full details of suggested items
    const addItemIds = analysis.add_item_ids || [];
    const swapItemIds = (analysis.swap_suggestions || []).map((s: any) => s.add_item_id).filter(Boolean);
    const allSuggestedIds = [...new Set([...addItemIds, ...swapItemIds])];

    const suggestedItems = allClothingItems?.filter((item: any) => 
      allSuggestedIds.includes(item.id)
    ) || [];

    return new Response(
      JSON.stringify({
        outfit,
        currentItems: currentClothes,
        analysis: {
          ...analysis,
          suggestedItems,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in upgrade-outfit:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
