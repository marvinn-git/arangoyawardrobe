import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Demo users with their style profiles
const demoUsers = [
  { name: "Alex Chen", email: "alex.demo@wardrobe.app", style: ["Minimalist", "Streetwear", "Urban"] },
  { name: "Sofia Martinez", email: "sofia.demo@wardrobe.app", style: ["Bohemian", "Vintage", "Artistic"] },
  { name: "Jordan Kim", email: "jordan.demo@wardrobe.app", style: ["Athleisure", "Sporty", "Casual"] },
  { name: "Emma Wilson", email: "emma.demo@wardrobe.app", style: ["Classic", "Preppy", "Elegant"] },
  { name: "Marcus Johnson", email: "marcus.demo@wardrobe.app", style: ["Streetwear", "Hip-Hop", "Bold"] },
  { name: "Luna Park", email: "luna.demo@wardrobe.app", style: ["Korean Fashion", "Y2K", "Trendy"] },
  { name: "Diego Santos", email: "diego.demo@wardrobe.app", style: ["Smart Casual", "Business", "Modern"] },
  { name: "Aria Patel", email: "aria.demo@wardrobe.app", style: ["Cottagecore", "Romantic", "Soft"] },
  { name: "Tyler Brooks", email: "tyler.demo@wardrobe.app", style: ["Skater", "Grunge", "Alternative"] },
  { name: "Mia Thompson", email: "mia.demo@wardrobe.app", style: ["Glamorous", "Chic", "Luxe"] },
];

// Clothing items pool with images
const clothingPool = [
  // Tops
  { name: "White Minimal Tee", category: "T-Shirts", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", brand: "Uniqlo" },
  { name: "Black Oversized Hoodie", category: "Hoodies", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400", brand: "Essentials" },
  { name: "Vintage Denim Jacket", category: "Jackets", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400", brand: "Levi's" },
  { name: "Navy Blazer", category: "Blazers", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400", brand: "Zara" },
  { name: "Cream Knit Sweater", category: "Sweaters", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400", brand: "COS" },
  { name: "Striped Button-Up", category: "Shirts", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400", brand: "Ralph Lauren" },
  { name: "Graphic Band Tee", category: "T-Shirts", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400", brand: "Vintage" },
  { name: "Cropped Cardigan", category: "Cardigans", is_top: true, is_bottom: false, image_url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400", brand: "& Other Stories" },
  
  // Bottoms
  { name: "Slim Black Jeans", category: "Jeans", is_top: false, is_bottom: true, image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400", brand: "Acne Studios" },
  { name: "Wide Leg Trousers", category: "Pants", is_top: false, is_bottom: true, image_url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400", brand: "Arket" },
  { name: "Cargo Pants", category: "Pants", is_top: false, is_bottom: true, image_url: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=400", brand: "Carhartt" },
  { name: "Pleated Midi Skirt", category: "Skirts", is_top: false, is_bottom: true, image_url: "https://images.unsplash.com/photo-1583496661160-fb5886a0uj?w=400", brand: "Massimo Dutti" },
  { name: "Athletic Shorts", category: "Shorts", is_top: false, is_bottom: true, image_url: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400", brand: "Nike" },
  { name: "Light Wash Denim", category: "Jeans", is_top: false, is_bottom: true, image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", brand: "Levi's" },
  
  // Accessories
  { name: "Leather Crossbody Bag", category: "Bags", is_top: false, is_bottom: false, is_accessory: true, image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400", brand: "Coach" },
  { name: "Minimalist Watch", category: "Watches", is_top: false, is_bottom: false, is_accessory: true, image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", brand: "Daniel Wellington" },
  { name: "Gold Hoop Earrings", category: "Jewelry", is_top: false, is_bottom: false, is_accessory: true, image_url: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=400", brand: "Mejuri" },
  { name: "Baseball Cap", category: "Hats", is_top: false, is_bottom: false, is_accessory: true, image_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400", brand: "New Era" },
  { name: "White Sneakers", category: "Shoes", is_top: false, is_bottom: false, is_accessory: true, image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", brand: "Common Projects" },
  { name: "Chunky Boots", category: "Shoes", is_top: false, is_bottom: false, is_accessory: true, image_url: "https://images.unsplash.com/photo-1605733160314-4fc7dac4bb16?w=400", brand: "Dr. Martens" },
];

// Outfit combinations
const outfitNames = [
  "Weekend Casual", "Office Ready", "Date Night", "City Walk", "Brunch Look",
  "Cozy Day", "Street Style", "Summer Vibes", "Autumn Layers", "Night Out",
  "Minimalist Monday", "Bohemian Dream", "Sporty Chic", "Classic Elegance"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const createdUsers: string[] = [];
    const createdOutfits: number[] = [];

    // Create demo users and their content
    for (const demoUser of demoUsers) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: demoUser.email,
        password: "DemoPassword123!",
        email_confirm: true,
        user_metadata: { name: demoUser.name }
      });

      if (authError) {
        // User might already exist, try to get them
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);
        if (!existingUser) {
          console.error(`Failed to create user ${demoUser.email}:`, authError);
          continue;
        }
        createdUsers.push(existingUser.id);
        continue;
      }

      if (!authData.user) continue;
      
      const userId = authData.user.id;
      createdUsers.push(userId);

      // Create profile
      await supabaseAdmin.from("profiles").upsert({
        user_id: userId,
        name: demoUser.name,
        onboarding_completed: true,
        style_preferences: demoUser.style.join(", "),
      });

      // Create categories for user
      const categoryMap: Record<string, string> = {};
      const uniqueCategories = [...new Set(clothingPool.map(c => c.category))];
      
      for (const catName of uniqueCategories) {
        const item = clothingPool.find(c => c.category === catName);
        const { data: catData } = await supabaseAdmin.from("categories").insert({
          user_id: userId,
          name: catName,
          is_top: item?.is_top || false,
          is_bottom: item?.is_bottom || false,
        }).select("id").single();
        
        if (catData) categoryMap[catName] = catData.id;
      }

      // Create random selection of clothing items (8-12 per user)
      const numItems = Math.floor(Math.random() * 5) + 8;
      const shuffledPool = [...clothingPool].sort(() => Math.random() - 0.5);
      const selectedItems = shuffledPool.slice(0, numItems);
      const createdItemIds: string[] = [];

      for (const item of selectedItems) {
        const { data: itemData } = await supabaseAdmin.from("clothing_items").insert({
          user_id: userId,
          name: item.name,
          category_id: categoryMap[item.category] || null,
          image_url: item.image_url,
          brand: item.brand,
          is_accessory: item.is_accessory || false,
          is_public: true, // Make public for inspiration feed
        }).select("id").single();

        if (itemData) createdItemIds.push(itemData.id);
      }

      // Create 2-3 outfits per user
      const numOutfits = Math.floor(Math.random() * 2) + 2;
      const shuffledOutfitNames = [...outfitNames].sort(() => Math.random() - 0.5);

      for (let i = 0; i < numOutfits; i++) {
        // Get items with categories to find tops and bottoms
        const { data: userItems } = await supabaseAdmin
          .from("clothing_items")
          .select("id, category_id")
          .eq("user_id", userId);

        if (!userItems || userItems.length < 2) continue;

        // Get categories to identify tops/bottoms
        const { data: userCategories } = await supabaseAdmin
          .from("categories")
          .select("id, is_top, is_bottom")
          .eq("user_id", userId);

        const topItems = userItems.filter(item => {
          const cat = userCategories?.find(c => c.id === item.category_id);
          return cat?.is_top;
        });

        const bottomItems = userItems.filter(item => {
          const cat = userCategories?.find(c => c.id === item.category_id);
          return cat?.is_bottom;
        });

        if (topItems.length === 0 || bottomItems.length === 0) continue;

        // Create outfit
        const { data: outfitData } = await supabaseAdmin.from("outfits").insert({
          user_id: userId,
          name: shuffledOutfitNames[i] || `Outfit ${i + 1}`,
          is_favorite: Math.random() > 0.7,
          is_public: true, // Make public for inspiration feed
          tags: demoUser.style.slice(0, 2),
        }).select("id").single();

        if (outfitData) {
          createdOutfits.push(1);
          
          // Add top and bottom to outfit
          const selectedTop = topItems[Math.floor(Math.random() * topItems.length)];
          const selectedBottom = bottomItems[Math.floor(Math.random() * bottomItems.length)];
          
          await supabaseAdmin.from("outfit_items").insert([
            { outfit_id: outfitData.id, clothing_item_id: selectedTop.id },
            { outfit_id: outfitData.id, clothing_item_id: selectedBottom.id },
          ]);

          // Maybe add an accessory
          const accessories = userItems.filter(item => {
            const cat = userCategories?.find(c => c.id === item.category_id);
            return !cat?.is_top && !cat?.is_bottom;
          });

          if (accessories.length > 0 && Math.random() > 0.5) {
            const accessory = accessories[Math.floor(Math.random() * accessories.length)];
            await supabaseAdmin.from("outfit_items").insert({
              outfit_id: outfitData.id,
              clothing_item_id: accessory.id,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdUsers.length} demo users with ${createdOutfits.length} outfits`,
        users: createdUsers.length,
        outfits: createdOutfits.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error seeding demo data:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
