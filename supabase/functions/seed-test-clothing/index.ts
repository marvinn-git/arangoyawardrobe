import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate AI image for clothing
async function generateClothingImage(description: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Generate a clean, professional product photo of ${description}. White background, centered, high quality fashion photography style. The clothing item should be displayed flat or on an invisible mannequin.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", await response.text());
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // First, ensure user has categories
    const { data: existingCategories } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id);

    let categories = existingCategories || [];

    // If user has no categories, create them
    if (categories.length === 0) {
      const defaultCategories = [
        { name: "T-Shirt", name_es: "Camiseta", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Shirt", name_es: "Camisa", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Sweater", name_es: "Jersey", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Jacket", name_es: "Chaqueta", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Jeans", name_es: "Vaqueros", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Pants", name_es: "Pantalones", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Shorts", name_es: "Shorts", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Sneakers", name_es: "Zapatillas", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Hat", name_es: "Gorra", is_top: false, is_bottom: false, user_id: user.id },
      ];

      const { data: newCategories, error: catError } = await supabase
        .from("categories")
        .insert(defaultCategories)
        .select();

      if (catError) throw catError;
      categories = newCategories || [];
    }

    // Define test clothing items
    const testClothingItems = [
      // Tops
      { name: "White Basic T-Shirt", color: "White", brand: "Uniqlo", categoryName: "T-Shirt", description: "a plain white cotton crew neck t-shirt" },
      { name: "Black Graphic Tee", color: "Black", brand: "Supreme", categoryName: "T-Shirt", description: "a black t-shirt with minimal graphic print" },
      { name: "Navy Blue Polo", color: "Navy", brand: "Ralph Lauren", categoryName: "Shirt", description: "a navy blue polo shirt with collar" },
      { name: "Oversized Hoodie", color: "Gray", brand: "Nike", categoryName: "Sweater", description: "a gray oversized hoodie sweatshirt" },
      { name: "Denim Jacket", color: "Blue", brand: "Levi's", categoryName: "Jacket", description: "a classic blue denim jacket" },
      { name: "Black Bomber Jacket", color: "Black", brand: "Alpha Industries", categoryName: "Jacket", description: "a black bomber jacket with orange lining" },
      // Bottoms
      { name: "Slim Fit Black Jeans", color: "Black", brand: "Levi's", categoryName: "Jeans", description: "slim fit black denim jeans" },
      { name: "Light Wash Jeans", color: "Light Blue", brand: "Zara", categoryName: "Jeans", description: "light wash blue straight leg jeans" },
      { name: "Khaki Chinos", color: "Khaki", brand: "Dockers", categoryName: "Pants", description: "khaki colored chino pants" },
      { name: "Black Joggers", color: "Black", brand: "Adidas", categoryName: "Pants", description: "black athletic jogger pants with three stripes" },
      { name: "Navy Shorts", color: "Navy", brand: "Nike", categoryName: "Shorts", description: "navy blue athletic shorts" },
      { name: "Beige Cargo Shorts", color: "Beige", brand: "Carhartt", categoryName: "Shorts", description: "beige cargo shorts with pockets" },
      // Accessories
      { name: "White Sneakers", color: "White", brand: "Nike Air Force 1", categoryName: "Sneakers", description: "white Nike Air Force 1 sneakers" },
      { name: "Black Cap", color: "Black", brand: "New Era", categoryName: "Hat", description: "a black baseball cap" },
    ];

    const createdItems = [];

    for (const item of testClothingItems) {
      // Find the category
      const category = categories.find((c: any) => c.name === item.categoryName);
      if (!category) continue;

      // Generate AI image
      console.log(`Generating image for: ${item.name}`);
      const imageUrl = await generateClothingImage(item.description, LOVABLE_API_KEY);

      if (!imageUrl) {
        console.error(`Failed to generate image for ${item.name}`);
        continue;
      }

      // Insert clothing item
      const { data: clothingItem, error: itemError } = await supabase
        .from("clothing_items")
        .insert({
          user_id: user.id,
          name: item.name,
          color: item.color,
          brand: item.brand,
          category_id: category.id,
          image_url: imageUrl,
          is_favorite: false,
          is_accessory: !category.is_top && !category.is_bottom,
        })
        .select()
        .single();

      if (itemError) {
        console.error(`Error inserting ${item.name}:`, itemError);
        continue;
      }

      createdItems.push(clothingItem);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdItems.length} test clothing items`,
        items: createdItems,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in seed-test-clothing:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
