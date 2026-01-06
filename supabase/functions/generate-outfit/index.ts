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
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { occasion, weather, mood } = await req.json();

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

    // Categorize items
    const tops = clothingItems.filter((item: any) => item.categories?.is_top);
    const bottoms = clothingItems.filter((item: any) => item.categories?.is_bottom);
    const accessories = clothingItems.filter((item: any) => 
      !item.categories?.is_top && !item.categories?.is_bottom
    );

    if (tops.length === 0 || bottoms.length === 0) {
      return new Response(
        JSON.stringify({ error: "You need at least one top and one bottom item to generate an outfit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI prompt
    const prompt = `You are a fashion stylist AI. Based on the user's wardrobe and preferences, suggest a complete outfit.

User's style preferences: ${styleTags.join(", ")}
${profile?.style_preferences ? `Additional notes: ${profile.style_preferences}` : ""}
${occasion ? `Occasion: ${occasion}` : ""}
${weather ? `Weather: ${weather}` : ""}
${mood ? `Mood/Vibe: ${mood}` : ""}

Available tops:
${tops.map((t: any) => `- ${t.name} (${t.color || "no color"}, ${t.brand || "no brand"}) [ID: ${t.id}]`).join("\n")}

Available bottoms:
${bottoms.map((b: any) => `- ${b.name} (${b.color || "no color"}, ${b.brand || "no brand"}) [ID: ${b.id}]`).join("\n")}

${accessories.length > 0 ? `Available accessories:
${accessories.map((a: any) => `- ${a.name} (${a.color || "no color"}) [ID: ${a.id}]`).join("\n")}` : ""}

Please select the best combination that matches the user's style. Return your response using the suggest_outfit function.`;

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
          { role: "system", content: "You are a helpful fashion stylist AI. Always use the provided function to return structured outfit suggestions." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_outfit",
              description: "Suggest an outfit combination from the user's wardrobe",
              parameters: {
                type: "object",
                properties: {
                  outfit_name: { 
                    type: "string", 
                    description: "A creative name for the outfit" 
                  },
                  top_id: { 
                    type: "string", 
                    description: "The ID of the selected top item" 
                  },
                  bottom_id: { 
                    type: "string", 
                    description: "The ID of the selected bottom item" 
                  },
                  accessory_ids: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Array of accessory IDs (optional)" 
                  },
                  styling_tips: { 
                    type: "string", 
                    description: "Brief styling tips for this outfit" 
                  },
                  explanation: { 
                    type: "string", 
                    description: "Why this combination works for the user's style" 
                  },
                },
                required: ["outfit_name", "top_id", "bottom_id", "styling_tips", "explanation"],
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

    // Validate the suggested item IDs exist
    const selectedIds = [suggestion.top_id, suggestion.bottom_id, ...(suggestion.accessory_ids || [])];
    const validItems = clothingItems.filter((item: any) => selectedIds.includes(item.id));

    return new Response(
      JSON.stringify({
        suggestion: {
          ...suggestion,
          items: validItems,
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
