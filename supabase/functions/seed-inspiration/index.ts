import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Diverse fake user profiles with style tags
const fakeUsers = [
  { name: "StyleKing", username: "styleking_official", styles: ["streetwear", "hypebeast", "urban"] },
  { name: "Fashion Forward", username: "fashionforward", styles: ["minimalist", "modern", "chic"] },
  { name: "Urban Vibes", username: "urban_vibes_23", styles: ["urban", "streetwear", "casual"] },
  { name: "Street Style", username: "street.style.daily", styles: ["streetwear", "edgy", "grunge"] },
  { name: "Drip Check", username: "drip_check", styles: ["hypebeast", "streetwear", "uk drill"] },
  { name: "Fit Enthusiast", username: "fit.enthusiast", styles: ["casual", "sporty", "relaxed"] },
  { name: "Vintage Soul", username: "vintage_soul_fits", styles: ["vintage", "bohemian", "classic"] },
  { name: "Modern Classic", username: "modern.classic", styles: ["elegant", "classic", "preppy"] },
  { name: "Y2K Queen", username: "y2k_queen", styles: ["y2k", "edgy", "romantic"] },
  { name: "Grunge Life", username: "grunge.life", styles: ["grunge", "edgy", "vintage"] },
  { name: "Korean Wave", username: "korean_wave_style", styles: ["korean style", "minimalist", "modern"] },
  { name: "Bohemian Dream", username: "bohemian_dream", styles: ["bohemian", "romantic", "vintage"] },
  { name: "Sporty Chic", username: "sporty_chic_", styles: ["sporty", "casual", "modern"] },
  { name: "Prep School", username: "prep_school_fits", styles: ["preppy", "classic", "elegant"] },
  { name: "Edgy Looks", username: "edgy.looks", styles: ["edgy", "grunge", "streetwear"] },
];

// Extended captions by type
const fitCheckCaptions = [
  "Rate my fit 1-10 🔥", "OOTD - yay or nay?", "Thoughts on this combo?",
  "Does this work? 🤔", "Fit check before going out", "Quick fit check ✨",
  "Is this giving what I think it's giving?", "What we think about this one?",
  "¿Qué opinan del outfit? 💯", "Outfit del día, ¿aprobado?",
  "¿Les gusta esta combinación?", "Fit check rápido 🔥",
  "How's the drip today? 💧", "Stepping out like this",
  "This fit or nah?", "Rate the layers 🧥", "Today's vibe check",
  "Going out fit - honest thoughts?", "Mirror selfie hours",
  "Simple but clean right?", "Overdressed or just right?",
];

const outfitCaptions = [
  "Today's fit 🔥", "Casual Friday vibes", "Outfit of the day",
  "Keeping it simple", "Layering season is here", "Street ready",
  "Clean fit for the weekend", "New favorite combo",
  "This outfit hits different", "Spring/Summer rotation 🌸",
  "Mi outfit favorito 💯", "Estilo urbano", "Look del día",
  "Vibes de verano", "El outfit perfecto", "Fall layers activated 🍂",
  "Monochrome mood", "Earth tones today", "All black everything",
  "Neutral game strong", "Weekend warrior fit", "Cozy but make it fashion",
];

const clothingItemCaptions = [
  "New pickup, had to share", "This piece is everything 🙌",
  "Added to the collection", "Best purchase of the month",
  "Vintage find 💎", "Grail acquired ✨", "This goes with everything",
  "New favorite piece", "Finally got my hands on this",
  "¡Nueva adquisición! 💯", "Pieza clave del armario", "Mi prenda favorita",
  "Thrift store gem 💎", "Statement piece alert", "Closet essential",
  "This texture though 🔥", "The details on this one",
  "Quality over quantity", "Investment piece", "Had to cop immediately",
];

// Extended sample clothing items
const sampleClothingItems = [
  // Tops
  { name: "White Oversized Tee", image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", is_top: true },
  { name: "Black Graphic Hoodie", image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400", is_top: true },
  { name: "Denim Jacket", image_url: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400", is_top: true },
  { name: "Striped Button Down", image_url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400", is_top: true },
  { name: "Vintage Band Tee", image_url: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400", is_top: true },
  { name: "Cropped Cardigan", image_url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400", is_top: true },
  { name: "Leather Bomber Jacket", image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400", is_top: true },
  { name: "Navy Crewneck Sweater", image_url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400", is_top: true },
  { name: "Cream Knit Sweater", image_url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400", is_top: true },
  { name: "Black Turtleneck", image_url: "https://images.unsplash.com/photo-1608991591498-790e1d8fa72c?w=400", is_top: true },
  { name: "Flannel Shirt", image_url: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=400", is_top: true },
  { name: "Polo Shirt", image_url: "https://images.unsplash.com/photo-1625910513413-5fc45b370e17?w=400", is_top: true },
  // Bottoms
  { name: "Baggy Blue Jeans", image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", is_bottom: true },
  { name: "Black Cargo Pants", image_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400", is_bottom: true },
  { name: "Pleated Trousers", image_url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400", is_bottom: true },
  { name: "Wide Leg Pants", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400", is_bottom: true },
  { name: "Corduroy Pants", image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400", is_bottom: true },
  { name: "Black Slim Jeans", image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400", is_bottom: true },
  { name: "Khaki Chinos", image_url: "https://images.unsplash.com/photo-1624378441864-6eda7fac2c3e?w=400", is_bottom: true },
  { name: "Track Pants", image_url: "https://images.unsplash.com/photo-1515586838455-8f8f940d6853?w=400", is_bottom: true },
  // Accessories
  { name: "Chunky Sneakers", image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", is_accessory: true },
  { name: "Gold Chain Necklace", image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400", is_accessory: true },
  { name: "Bucket Hat", image_url: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=400", is_accessory: true },
  { name: "Vintage Sunglasses", image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400", is_accessory: true },
  { name: "Crossbody Bag", image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400", is_accessory: true },
  { name: "Statement Rings", image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400", is_accessory: true },
  { name: "Platform Boots", image_url: "https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=400", is_accessory: true },
  { name: "Beanie", image_url: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400", is_accessory: true },
  { name: "White Air Forces", image_url: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400", is_accessory: true },
  { name: "Canvas Tote Bag", image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400", is_accessory: true },
  { name: "Silver Watch", image_url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400", is_accessory: true },
  { name: "Leather Belt", image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400", is_accessory: true },
];

// Fit check images (people wearing outfits) - extended collection
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
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600",
  "https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=600",
  "https://images.unsplash.com/photo-1492447166138-50c3889fccb1?w=600",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600",
  "https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=600",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600",
  "https://images.unsplash.com/photo-1485968579169-51d4782f7a90?w=600",
  "https://images.unsplash.com/photo-1495385794356-15371f348c31?w=600",
  "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=600",
  "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=600",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600",
  "https://images.unsplash.com/photo-1512353087810-25dfcd100962?w=600",
];

// List of allowed admin emails - configure this for your application
const ALLOWED_ADMIN_EMAILS: string[] = [];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Authentication check - require valid user session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Use anon key client to verify user token (not service role)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional: Restrict to specific admin emails if configured
    if (ALLOWED_ADMIN_EMAILS.length > 0 && !ALLOWED_ADMIN_EMAILS.includes(user.email || "")) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const createdUsers: { id: string; username: string; styles: string[] }[] = [];
    const createdPosts: string[] = [];
    const createdItems: { id: string; name: string; image_url: string; user_id: string }[] = [];
    const createdOutfits: { id: string; name: string; user_id: string; items: string[] }[] = [];

    // Get existing style tags
    const { data: styleTags } = await supabase
      .from("style_tags")
      .select("id, name");
    
    const styleTagMap: Record<string, string> = {};
    if (styleTags) {
      for (const tag of styleTags) {
        styleTagMap[tag.name.toLowerCase()] = tag.id;
      }
    }

    // Create fake users
    for (const fakeUser of fakeUsers) {
      const email = `${fakeUser.username}@fakeinspiration.local`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: `FakeUser123!${Date.now()}${Math.random()}`,
        email_confirm: true,
        user_metadata: { name: fakeUser.name },
      });

      let userId: string | null = null;

      if (authError) {
        console.log(`User ${fakeUser.username} might already exist:`, authError.message);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === email);
        if (existing) {
          userId = existing.id;
        }
      } else if (authData.user) {
        userId = authData.user.id;
      }

      if (userId) {
        // Update profile with username and style preferences
        await supabase
          .from("profiles")
          .update({ 
            username: fakeUser.username, 
            name: fakeUser.name,
            style_preferences: fakeUser.styles.join(", "),
          })
          .eq("user_id", userId);

        // Link user to style tags
        for (const style of fakeUser.styles) {
          const tagId = styleTagMap[style.toLowerCase()];
          if (tagId) {
            await supabase
              .from("user_style_tags")
              .upsert({ 
                user_id: userId, 
                style_tag_id: tagId 
              }, { 
                onConflict: "user_id,style_tag_id",
                ignoreDuplicates: true 
              });
          }
        }

        createdUsers.push({ id: userId, username: fakeUser.username, styles: fakeUser.styles });
      }
    }

    // Create clothing items for each user (10-15 items each)
    for (const user of createdUsers) {
      let userCategories: { id: string; name: string; is_top?: boolean; is_bottom?: boolean }[] = [];
      
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, is_top, is_bottom")
        .eq("user_id", user.id);
      
      if (!cats || cats.length === 0) {
        const defaultCats = [
          { name: "T-Shirts", name_es: "Camisetas", is_top: true, is_bottom: false, user_id: user.id },
          { name: "Hoodies", name_es: "Sudaderas", is_top: true, is_bottom: false, user_id: user.id },
          { name: "Jackets", name_es: "Chaquetas", is_top: true, is_bottom: false, user_id: user.id },
          { name: "Sweaters", name_es: "Suéteres", is_top: true, is_bottom: false, user_id: user.id },
          { name: "Pants", name_es: "Pantalones", is_top: false, is_bottom: true, user_id: user.id },
          { name: "Jeans", name_es: "Jeans", is_top: false, is_bottom: true, user_id: user.id },
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

      // Create 10-15 clothing items per user
      const numItems = Math.floor(Math.random() * 6) + 10;
      const shuffledItems = [...sampleClothingItems].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(numItems, shuffledItems.length); i++) {
        const item = shuffledItems[i];
        
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

    // Create outfits for each user (3-5 outfits each)
    for (const user of createdUsers) {
      const userItems = createdItems.filter(i => i.user_id === user.id);
      if (userItems.length < 4) continue;

      const numOutfits = Math.floor(Math.random() * 3) + 3;
      const outfitStyles = ["Casual", "Street", "Clean", "Layered", "Minimal", "Bold", "Cozy", "Fresh"];
      
      for (let i = 0; i < numOutfits; i++) {
        const styleWord = outfitStyles[Math.floor(Math.random() * outfitStyles.length)];
        const outfitName = `${styleWord} ${user.styles[0].charAt(0).toUpperCase() + user.styles[0].slice(1)} Look`;
        
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
            tags: [...user.styles, "2024"],
          })
          .select()
          .single();

        if (!outfitError && outfitData) {
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

    // Create ~20 inspiration posts per user (mix of fit checks, outfits, clothing items)
    for (const user of createdUsers) {
      const userItems = createdItems.filter(i => i.user_id === user.id);
      const userOutfits = createdOutfits.filter(o => o.user_id === user.id);
      
      // Target around 20 posts per user
      const numPosts = Math.floor(Math.random() * 5) + 18; // 18-22 posts

      for (let i = 0; i < numPosts; i++) {
        // Weighted distribution: 40% fit checks, 35% outfits, 25% clothing items
        const rand = Math.random();
        let postType: string;
        let caption: string;
        let imageUrl: string | null = null;
        let outfitId: string | null = null;
        let clothingItemId: string | null = null;

        if (rand < 0.40) {
          // Fit check post (40%)
          postType = "fit_check";
          caption = fitCheckCaptions[Math.floor(Math.random() * fitCheckCaptions.length)];
          imageUrl = fitCheckImages[Math.floor(Math.random() * fitCheckImages.length)];
        } else if (rand < 0.75 && userOutfits.length > 0) {
          // Outfit post (35%)
          postType = "outfit";
          caption = outfitCaptions[Math.floor(Math.random() * outfitCaptions.length)];
          const randomOutfit = userOutfits[Math.floor(Math.random() * userOutfits.length)];
          outfitId = randomOutfit.id;
        } else if (userItems.length > 0) {
          // Clothing item post (25%)
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

        // Varied likes: some posts get viral (high likes), most get moderate
        let baseLikes;
        const viralChance = Math.random();
        if (viralChance < 0.1) {
          baseLikes = Math.floor(Math.random() * 500) + 300; // Viral: 300-800
        } else if (viralChance < 0.3) {
          baseLikes = Math.floor(Math.random() * 200) + 100; // Popular: 100-300
        } else {
          baseLikes = Math.floor(Math.random() * 100) + 10; // Normal: 10-110
        }

        // Spread posts over last 3 weeks
        const daysAgo = Math.random() * 21;

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
        message: `Created ${createdUsers.length} users, ${createdItems.length} items, ${createdOutfits.length} outfits, and ${createdPosts.length} posts`,
        stats: {
          users: createdUsers.length,
          items: createdItems.length,
          outfits: createdOutfits.length,
          posts: createdPosts.length,
          avgPostsPerUser: Math.round(createdPosts.length / createdUsers.length),
        },
        usernames: createdUsers.map(u => `@${u.username} (${u.styles.join(", ")})`),
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