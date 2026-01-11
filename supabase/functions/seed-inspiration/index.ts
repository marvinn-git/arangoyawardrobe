import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Diverse fake user profiles for inspiration content
const fakeUsers = [
  { name: "StyleKing", username: "styleking_official", style: "streetwear" },
  { name: "Fashion Forward", username: "fashionforward", style: "minimalist" },
  { name: "Urban Vibes", username: "urban_vibes_23", style: "urban" },
  { name: "Street Style", username: "street.style.daily", style: "streetwear" },
  { name: "Drip Check", username: "drip_check", style: "hypebeast" },
  { name: "Fit Enthusiast", username: "fit.enthusiast", style: "casual" },
  { name: "Vintage Soul", username: "vintage_soul_fits", style: "vintage" },
  { name: "Modern Classic", username: "modern.classic", style: "elegant" },
  { name: "Y2K Queen", username: "y2k_queen", style: "y2k" },
  { name: "Grunge Life", username: "grunge.life", style: "grunge" },
  { name: "Korean Wave", username: "korean_wave_style", style: "korean" },
  { name: "Bohemian Dream", username: "bohemian_dream", style: "bohemian" },
  { name: "Sporty Chic", username: "sporty_chic_", style: "sporty" },
  { name: "Prep School", username: "prep_school_fits", style: "preppy" },
  { name: "Edgy Looks", username: "edgy.looks", style: "edgy" },
];

// Sample captions by type
const fitCheckCaptions = [
  "Rate my fit 1-10 🔥",
  "OOTD - yay or nay?",
  "Thoughts on this combo?",
  "Does this work? 🤔",
  "Fit check before going out",
  "Quick fit check ✨",
  "Is this giving what I think it's giving?",
  "What we think about this one?",
  "¿Qué opinan del outfit? 💯",
  "Outfit del día, ¿aprobado?",
  "¿Les gusta esta combinación?",
  "Fit check rápido 🔥",
];

const outfitCaptions = [
  "Today's fit 🔥",
  "Casual Friday vibes",
  "Outfit of the day",
  "Keeping it simple",
  "Layering season is here",
  "Street ready",
  "Clean fit for the weekend",
  "New favorite combo",
  "This outfit hits different",
  "Spring/Summer rotation 🌸",
  "Mi outfit favorito 💯",
  "Estilo urbano",
  "Look del día",
  "Vibes de verano",
  "El outfit perfecto",
];

const clothingItemCaptions = [
  "New pickup, had to share",
  "This piece is everything 🙌",
  "Added to the collection",
  "Best purchase of the month",
  "Vintage find 💎",
  "Grail acquired ✨",
  "This goes with everything",
  "New favorite piece",
  "Finally got my hands on this",
  "¡Nueva adquisición! 💯",
  "Pieza clave del armario",
  "Mi prenda favorita",
];

// Sample clothing items with images
const sampleClothingItems = [
  { name: "White Oversized Tee", image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", is_top: true },
  { name: "Black Graphic Hoodie", image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400", is_top: true },
  { name: "Denim Jacket", image_url: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400", is_top: true },
  { name: "Striped Button Down", image_url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400", is_top: true },
  { name: "Vintage Band Tee", image_url: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400", is_top: true },
  { name: "Cropped Cardigan", image_url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400", is_top: true },
  { name: "Leather Bomber Jacket", image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400", is_top: true },
  { name: "Navy Crewneck Sweater", image_url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400", is_top: true },
  { name: "Baggy Blue Jeans", image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", is_bottom: true },
  { name: "Black Cargo Pants", image_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400", is_bottom: true },
  { name: "Pleated Trousers", image_url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400", is_bottom: true },
  { name: "Mini Skirt", image_url: "https://images.unsplash.com/photo-1583496661160-fb5886a0uj9a?w=400", is_bottom: true },
  { name: "Wide Leg Pants", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400", is_bottom: true },
  { name: "Corduroy Pants", image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400", is_bottom: true },
  { name: "Chunky Sneakers", image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", is_accessory: true },
  { name: "Gold Chain Necklace", image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400", is_accessory: true },
  { name: "Bucket Hat", image_url: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=400", is_accessory: true },
  { name: "Vintage Sunglasses", image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400", is_accessory: true },
  { name: "Crossbody Bag", image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400", is_accessory: true },
  { name: "Statement Rings", image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400", is_accessory: true },
  { name: "Platform Boots", image_url: "https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=400", is_accessory: true },
  { name: "Beanie", image_url: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400", is_accessory: true },
];

// Fit check images (people wearing outfits)
const fitCheckImages = [
  "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600",
  "https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=600",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600",
  "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const createdUsers: { id: string; username: string; style: string }[] = [];
    const createdPosts: string[] = [];
    const createdItems: { id: string; name: string; image_url: string; user_id: string }[] = [];
    const createdOutfits: { id: string; name: string; user_id: string; items: string[] }[] = [];

    // Get existing categories
    const { data: existingCategories } = await supabase
      .from("categories")
      .select("id, name, is_top, is_bottom")
      .limit(1);

    let defaultUserId = existingCategories?.[0] ? null : null;

    // Create fake users
    for (const fakeUser of fakeUsers) {
      const email = `${fakeUser.username}@fakeinspiration.local`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: `FakeUser123!${Date.now()}${Math.random()}`,
        email_confirm: true,
        user_metadata: { name: fakeUser.name },
      });

      if (authError) {
        console.log(`User ${fakeUser.username} might already exist:`, authError.message);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === email);
        if (existing) {
          await supabase
            .from("profiles")
            .update({ 
              username: fakeUser.username, 
              name: fakeUser.name,
              style_preferences: fakeUser.style,
            })
            .eq("user_id", existing.id);
          createdUsers.push({ id: existing.id, username: fakeUser.username, style: fakeUser.style });
        }
        continue;
      }

      if (authData.user) {
        await supabase
          .from("profiles")
          .update({ 
            username: fakeUser.username, 
            name: fakeUser.name,
            style_preferences: fakeUser.style,
          })
          .eq("user_id", authData.user.id);
        
        createdUsers.push({ id: authData.user.id, username: fakeUser.username, style: fakeUser.style });
      }
    }

    // Create clothing items for each user
    for (const user of createdUsers) {
      // Get or create categories for this user
      let userCategories: { id: string; name: string; is_top?: boolean; is_bottom?: boolean }[] = [];
      
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, is_top, is_bottom")
        .eq("user_id", user.id);
      
      if (!cats || cats.length === 0) {
        // Create default categories
        const defaultCats = [
          { name: "T-Shirts", name_es: "Camisetas", is_top: true, is_bottom: false, user_id: user.id },
          { name: "Hoodies", name_es: "Sudaderas", is_top: true, is_bottom: false, user_id: user.id },
          { name: "Jackets", name_es: "Chaquetas", is_top: true, is_bottom: false, user_id: user.id },
          { name: "Pants", name_es: "Pantalones", is_top: false, is_bottom: true, user_id: user.id },
          { name: "Shoes", name_es: "Zapatos", is_top: false, is_bottom: false, user_id: user.id },
          { name: "Accessories", name_es: "Accesorios", is_top: false, is_bottom: false, user_id: user.id },
        ];
        
        const { data: newCats } = await supabase
          .from("categories")
          .insert(defaultCats)
          .select();
        
        userCategories = newCats || [];
      } else {
        userCategories = cats;
      }

      // Create 5-8 clothing items per user
      const numItems = Math.floor(Math.random() * 4) + 5;
      const shuffledItems = [...sampleClothingItems].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(numItems, shuffledItems.length); i++) {
        const item = shuffledItems[i];
        
        // Find appropriate category
        let categoryId = null;
        if (item.is_top) {
          categoryId = userCategories.find(c => c.is_top)?.id || null;
        } else if (item.is_bottom) {
          categoryId = userCategories.find(c => c.is_bottom)?.id || null;
        } else {
          categoryId = userCategories.find(c => !c.is_top && !c.is_bottom)?.id || null;
        }

        const { data: itemData, error: itemError } = await supabase
          .from("clothing_items")
          .insert({
            user_id: user.id,
            name: item.name,
            image_url: item.image_url,
            category_id: categoryId,
            is_public: true,
            is_favorite: Math.random() > 0.7,
          })
          .select()
          .single();

        if (!itemError && itemData) {
          createdItems.push({ 
            id: itemData.id, 
            name: item.name, 
            image_url: item.image_url,
            user_id: user.id 
          });
        }
      }
    }

    // Create outfits for each user (using their items)
    for (const user of createdUsers) {
      const userItems = createdItems.filter(i => i.user_id === user.id);
      if (userItems.length < 3) continue;

      // Create 1-3 outfits per user
      const numOutfits = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numOutfits; i++) {
        const outfitName = `${user.style.charAt(0).toUpperCase() + user.style.slice(1)} Look ${i + 1}`;
        
        // Select 4-8 random items for the outfit
        const numOutfitItems = Math.floor(Math.random() * 5) + 4;
        const shuffledUserItems = [...userItems].sort(() => Math.random() - 0.5);
        const outfitItemIds = shuffledUserItems.slice(0, numOutfitItems).map(i => i.id);

        const { data: outfitData, error: outfitError } = await supabase
          .from("outfits")
          .insert({
            user_id: user.id,
            name: outfitName,
            is_public: true,
            is_favorite: Math.random() > 0.5,
            tags: [user.style, "2024", Math.random() > 0.5 ? "summer" : "fall"],
          })
          .select()
          .single();

        if (!outfitError && outfitData) {
          // Add outfit items
          const outfitItems = outfitItemIds.map(itemId => ({
            outfit_id: outfitData.id,
            clothing_item_id: itemId,
          }));

          await supabase.from("outfit_items").insert(outfitItems);
          
          createdOutfits.push({ 
            id: outfitData.id, 
            name: outfitName, 
            user_id: user.id,
            items: outfitItemIds 
          });
        }
      }
    }

    // Create inspiration posts
    for (const user of createdUsers) {
      const userItems = createdItems.filter(i => i.user_id === user.id);
      const userOutfits = createdOutfits.filter(o => o.user_id === user.id);
      
      // Create 2-5 posts per user
      const numPosts = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < numPosts; i++) {
        // Determine post type with weighted randomness
        const rand = Math.random();
        let postType: string;
        let caption: string;
        let imageUrl: string | null = null;
        let outfitId: string | null = null;
        let clothingItemId: string | null = null;

        if (rand < 0.35) {
          // Fit check post (35%)
          postType = "fit_check";
          caption = fitCheckCaptions[Math.floor(Math.random() * fitCheckCaptions.length)];
          imageUrl = fitCheckImages[Math.floor(Math.random() * fitCheckImages.length)];
        } else if (rand < 0.7 && userOutfits.length > 0) {
          // Outfit post (35%)
          postType = "outfit";
          caption = outfitCaptions[Math.floor(Math.random() * outfitCaptions.length)];
          const randomOutfit = userOutfits[Math.floor(Math.random() * userOutfits.length)];
          outfitId = randomOutfit.id;
        } else if (userItems.length > 0) {
          // Clothing item post (30%)
          postType = "clothing_item";
          caption = clothingItemCaptions[Math.floor(Math.random() * clothingItemCaptions.length)];
          const randomItem = userItems[Math.floor(Math.random() * userItems.length)];
          clothingItemId = randomItem.id;
        } else {
          // Fallback to fit check
          postType = "fit_check";
          caption = fitCheckCaptions[Math.floor(Math.random() * fitCheckCaptions.length)];
          imageUrl = fitCheckImages[Math.floor(Math.random() * fitCheckImages.length)];
        }

        const baseLikes = Math.floor(Math.random() * 250) + 20;
        const daysAgo = Math.random() * 14; // Random time in last 2 weeks

        const { data: postData, error: postError } = await supabase
          .from("inspiration_posts")
          .insert({
            user_id: user.id,
            post_type: postType,
            caption,
            image_url: imageUrl,
            outfit_id: outfitId,
            clothing_item_id: clothingItemId,
            likes_count: baseLikes,
            created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (!postError && postData) {
          createdPosts.push(postData.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdUsers.length} users, ${createdItems.length} clothing items, ${createdOutfits.length} outfits, and ${createdPosts.length} posts`,
        stats: {
          users: createdUsers.length,
          items: createdItems.length,
          outfits: createdOutfits.length,
          posts: createdPosts.length,
        },
        usernames: createdUsers.map(u => u.username),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Seed inspiration error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});