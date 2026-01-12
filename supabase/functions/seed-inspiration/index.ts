import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base user profiles - will be personalized based on the registering user's styles
const baseUserProfiles = [
  { namePrefix: "Style", usernamePrefixes: ["style", "fit", "drip", "vibes"] },
  { namePrefix: "Fashion", usernamePrefixes: ["fashion", "trend", "chic", "mode"] },
  { namePrefix: "Urban", usernamePrefixes: ["urban", "street", "city", "metro"] },
  { namePrefix: "Aesthetic", usernamePrefixes: ["aesthetic", "mood", "vibe", "aura"] },
  { namePrefix: "Vintage", usernamePrefixes: ["vintage", "retro", "classic", "old"] },
  { namePrefix: "Modern", usernamePrefixes: ["modern", "minimal", "clean", "sleek"] },
  { namePrefix: "Bold", usernamePrefixes: ["bold", "edgy", "fierce", "daring"] },
  { namePrefix: "Cozy", usernamePrefixes: ["cozy", "comfy", "soft", "warm"] },
];

// Style pools for personalization
const styleGroups: Record<string, string[]> = {
  streetwear: ["streetwear", "urban", "hypebeast", "casual"],
  elegant: ["elegant", "classic", "chic", "preppy"],
  minimalist: ["minimalist", "modern", "clean", "scandinavian"],
  bohemian: ["bohemian", "vintage", "romantic", "boho"],
  edgy: ["edgy", "grunge", "punk", "alternative"],
  sporty: ["sporty", "athleisure", "casual", "relaxed"],
  korean: ["korean style", "k-fashion", "minimalist", "modern"],
  y2k: ["y2k", "retro", "bold", "colorful"],
};

// Extended captions - 50+ per category for variety
const fitCheckCaptions = [
  "Rate my fit 1-10 🔥", "OOTD - yay or nay?", "Thoughts on this combo?",
  "Does this work? 🤔", "Fit check before going out", "Quick fit check ✨",
  "Is this giving what I think it's giving?", "What we think about this one?",
  "¿Qué opinan del outfit? 💯", "Outfit del día, ¿aprobado?",
  "¿Les gusta esta combinación?", "Fit check rápido 🔥",
  "How's the drip today? 💧", "Stepping out like this",
  "This fit or nah?", "Rate the layers 🧥", "Today's vibe check",
  "Going out fit - honest thoughts?", "Mirror selfie hours 📸",
  "Simple but clean right?", "Overdressed or just right?",
  "Keeping it casual today", "Date night ready?",
  "Work from home but make it fashion", "Coffee run lewk ☕",
  "Sunday brunch fit", "First date outfit check",
  "Interview outfit - professional enough?", "Concert ready 🎵",
  "Festival fit check ✌️", "Beach day vibes 🏖️",
  "Gym to brunch transition", "Late night adventure fit",
  "Airport outfit game strong ✈️", "Wedding guest look",
  "Casual Friday energy", "Staying in but still dressed up",
  "Thrifted this whole look 💎", "All vintage today",
  "New pieces, who dis?", "Mixing patterns - thoughts?",
  "Monochrome mood today", "Color blocking attempt",
  "Tried something new today", "Going bold with this one",
  "Playing it safe or nah?", "Comfort over everything today",
  "The accessories make it right?", "Oversized everything kinda day",
  "Fitted and tailored today", "Street meets formal vibes",
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
  "Night out ready", "Effortless vibes only", "Less is more today",
  "Going all out with this one", "Threw this together last minute",
  "Been planning this fit all week", "Signature look activated",
  "Back to basics", "Statement piece carrying the fit",
  "The details matter", "Comfort meets style",
  "Oversized everything", "Fitted and clean", "Texture play today",
  "Mixing high and low", "Thrift finds only", "Designer pieces showing",
  "Color pop for the day", "Staying neutral", "Pattern mixing",
  "Denim on denim day", "Leather weather 🖤", "Knit season begins",
  "Summer to fall transition", "Winter layers coming through",
  "Light and airy vibes", "Heavy and cozy fit",
  "The bag makes the outfit", "Shoes are the star today",
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
  "Wardrobe staple unlocked", "Game changer piece",
  "Been searching for this forever", "Impulse buy but no regrets",
  "Gift to myself", "Birthday haul piece", "Sale find 🏷️",
  "Full price but worth it", "Secondhand treasure",
  "Designer at discount", "Local brand support",
  "Handmade quality", "The craftsmanship though",
  "Unique find alert", "One of one piece", "Custom made for me",
  "Vintage from the 90s", "Y2K revival piece", "Classic that never ages",
  "Trending piece acquired", "Before it sells out",
  "Restocked and copped", "Waited months for this drop",
  "Collaboration piece", "Limited edition secured",
  "Artist collab 🎨", "Sustainable fashion find",
  "Ethical brand love", "Small business support",
  "The color is perfect", "Fits like a dream",
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
  { name: "Linen Shirt", image_url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400", is_top: true },
  { name: "Cropped Tank", image_url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400", is_top: true },
  { name: "Oversized Blazer", image_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400", is_top: true },
  // Bottoms
  { name: "Baggy Blue Jeans", image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", is_bottom: true },
  { name: "Black Cargo Pants", image_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400", is_bottom: true },
  { name: "Pleated Trousers", image_url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400", is_bottom: true },
  { name: "Wide Leg Pants", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400", is_bottom: true },
  { name: "Corduroy Pants", image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400", is_bottom: true },
  { name: "Black Slim Jeans", image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400", is_bottom: true },
  { name: "Khaki Chinos", image_url: "https://images.unsplash.com/photo-1624378441864-6eda7fac2c3e?w=400", is_bottom: true },
  { name: "Track Pants", image_url: "https://images.unsplash.com/photo-1515586838455-8f8f940d6853?w=400", is_bottom: true },
  { name: "Linen Shorts", image_url: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400", is_bottom: true },
  { name: "Leather Skirt", image_url: "https://images.unsplash.com/photo-1583496661160-fb5886a0afe0?w=400", is_bottom: true },
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
  { name: "Silk Scarf", image_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400", is_accessory: true },
  { name: "Designer Sneakers", image_url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400", is_accessory: true },
];

// Extended fit check images for variety
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
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600",
];

// Helper function to generate unique usernames
function generateUsername(prefix: string, index: number): string {
  const suffixes = ["_", ".", "__", ".x", "_x"];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  const variations = [
    `${prefix}${suffix}${number}`,
    `${prefix}${number}`,
    `${prefix}_official${index}`,
    `the.${prefix}.${number}`,
    `${prefix}.daily${index}`,
    `x${prefix}x${number}`,
  ];
  return variations[Math.floor(Math.random() * variations.length)];
}

// Helper to find matching styles for personalization
function getMatchingStyles(userStyles: string[], allStyles: string[]): string[] {
  const normalizedUserStyles = userStyles.map(s => s.toLowerCase());
  
  // Find which style groups the user belongs to
  const matchingGroups: string[] = [];
  for (const [group, styles] of Object.entries(styleGroups)) {
    if (styles.some(s => normalizedUserStyles.includes(s))) {
      matchingGroups.push(group);
    }
  }
  
  // Get related styles from matching groups
  const relatedStyles = new Set<string>();
  for (const group of matchingGroups) {
    styleGroups[group]?.forEach(s => relatedStyles.add(s));
  }
  
  // Add some variety - include 1-2 random styles
  const randomStyles = allStyles
    .filter(s => !relatedStyles.has(s.toLowerCase()))
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);
  
  randomStyles.forEach(s => relatedStyles.add(s.toLowerCase()));
  
  return Array.from(relatedStyles);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for user's style preferences
    let userStyles: string[] = [];
    let refreshMode = false;
    try {
      const body = await req.json();
      userStyles = body.userStyles || [];
      refreshMode = body.refreshMode || false;
    } catch {
      // No body provided, will use default styles
    }

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // DUPLICATE PREVENTION: Check if inspiration content already exists
    const { count: existingPostCount } = await supabase
      .from("inspiration_posts")
      .select("*", { count: "exact", head: true });

    if (existingPostCount && existingPostCount > 50) {
      // Already seeded - in refresh mode, we could add a few more personalized posts
      if (refreshMode && userStyles.length > 0) {
        console.log("Refresh mode: Content exists, skipping full seed");
      }
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Inspiration content already exists",
          existingPosts: existingPostCount,
          skipped: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createdUsers: { id: string; username: string; styles: string[] }[] = [];
    const createdPosts: string[] = [];
    const createdItems: { id: string; name: string; image_url: string; user_id: string }[] = [];
    const createdOutfits: { id: string; name: string; user_id: string; items: string[] }[] = [];

    // Get existing style tags
    const { data: styleTags } = await supabase
      .from("style_tags")
      .select("id, name");
    
    const styleTagMap: Record<string, string> = {};
    const allStyleNames: string[] = [];
    if (styleTags) {
      for (const tag of styleTags) {
        styleTagMap[tag.name.toLowerCase()] = tag.id;
        allStyleNames.push(tag.name.toLowerCase());
      }
    }

    // Determine which styles to prioritize for fake users
    const prioritizedStyles = userStyles.length > 0 
      ? getMatchingStyles(userStyles, allStyleNames)
      : allStyleNames;

    // Generate 10-12 personalized fake users
    const numUsers = Math.floor(Math.random() * 3) + 10;
    
    for (let i = 0; i < numUsers; i++) {
      const baseProfile = baseUserProfiles[i % baseUserProfiles.length];
      const usernamePrefix = baseProfile.usernamePrefixes[Math.floor(Math.random() * baseProfile.usernamePrefixes.length)];
      const username = generateUsername(usernamePrefix, i);
      const name = `${baseProfile.namePrefix} ${["Master", "King", "Queen", "Pro", "Daily", "Lover", "Life", "Goals"][Math.floor(Math.random() * 8)]}`;
      
      // Assign 2-4 styles, prioritizing those matching user preferences
      const numStyles = Math.floor(Math.random() * 3) + 2;
      const shuffledStyles = [...prioritizedStyles].sort(() => Math.random() - 0.5);
      const userStylesForFake = shuffledStyles.slice(0, numStyles);
      
      const email = `${username}@fakeinspiration.local`;
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: `FakeUser123!${Date.now()}${Math.random()}`,
        email_confirm: true,
        user_metadata: { name },
      });

      let userId: string | null = null;

      if (createError) {
        console.log(`User ${username} might already exist:`, createError.message);
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
            username, 
            name,
            style_preferences: userStylesForFake.join(", "),
          })
          .eq("user_id", userId);

        // Link user to style tags
        for (const style of userStylesForFake) {
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

        createdUsers.push({ id: userId, username, styles: userStylesForFake });
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
      const outfitStyles = ["Casual", "Street", "Clean", "Layered", "Minimal", "Bold", "Cozy", "Fresh", "Chic", "Urban"];
      
      for (let i = 0; i < numOutfits; i++) {
        const styleWord = outfitStyles[Math.floor(Math.random() * outfitStyles.length)];
        const primaryStyle = user.styles[0] || "casual";
        const outfitName = `${styleWord} ${primaryStyle.charAt(0).toUpperCase() + primaryStyle.slice(1)} Look`;
        
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

    // Create ~15-20 inspiration posts per user (mix of fit checks, outfits, clothing items)
    for (const user of createdUsers) {
      const userItems = createdItems.filter(i => i.user_id === user.id);
      const userOutfits = createdOutfits.filter(o => o.user_id === user.id);
      
      // Varied post count per user for more natural distribution
      const numPosts = Math.floor(Math.random() * 8) + 15; // 15-22 posts

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
        if (viralChance < 0.08) {
          baseLikes = Math.floor(Math.random() * 800) + 400; // Viral: 400-1200
        } else if (viralChance < 0.25) {
          baseLikes = Math.floor(Math.random() * 250) + 100; // Popular: 100-350
        } else {
          baseLikes = Math.floor(Math.random() * 80) + 5; // Normal: 5-85
        }

        // Spread posts over last 4 weeks for more variety
        const daysAgo = Math.random() * 28;

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
        personalized: userStyles.length > 0,
        userStylesProvided: userStyles,
        stats: {
          users: createdUsers.length,
          items: createdItems.length,
          outfits: createdOutfits.length,
          posts: createdPosts.length,
          avgPostsPerUser: Math.round(createdPosts.length / Math.max(createdUsers.length, 1)),
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
