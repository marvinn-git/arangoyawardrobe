import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Placeholder for items that fail image generation
const PLACEHOLDER_IMAGE = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGM0YzRjMiLz48dGV4dCB4PSIxNTAiIHk9IjE1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5JbWFnZSBQZW5kaW5nPC90ZXh0Pjwvc3ZnPg==";

// Generate AI image for clothing - quick with fallback
async function generateClothingImage(description: string, apiKey: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Generate a clean product photo of ${description}. White/light gray background, centered, professional fashion photography.`,
          },
        ],
        modalities: ["image", "text"],
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Image gen failed: ${response.status}`);
      return PLACEHOLDER_IMAGE;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || PLACEHOLDER_IMAGE;
  } catch (error) {
    console.log(`Image error: ${error}`);
    return PLACEHOLDER_IMAGE;
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

    if (categories.length === 0) {
      const defaultCategories = [
        { name: "T-Shirt", name_es: "Camiseta", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Shirt", name_es: "Camisa", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Sweater", name_es: "Jersey", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Hoodie", name_es: "Sudadera", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Jacket", name_es: "Chaqueta", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Blazer", name_es: "Blazer", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Coat", name_es: "Abrigo", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Vest", name_es: "Chaleco", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Tank Top", name_es: "Camiseta de Tirantes", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Polo", name_es: "Polo", is_top: true, is_bottom: false, user_id: user.id },
        { name: "Jeans", name_es: "Vaqueros", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Pants", name_es: "Pantalones", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Shorts", name_es: "Shorts", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Joggers", name_es: "Joggers", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Cargo Pants", name_es: "Pantalones Cargo", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Chinos", name_es: "Chinos", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Skirt", name_es: "Falda", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Sneakers", name_es: "Zapatillas", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Boots", name_es: "Botas", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Loafers", name_es: "Mocasines", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Hat", name_es: "Gorra", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Beanie", name_es: "Gorro", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Watch", name_es: "Reloj", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Sunglasses", name_es: "Gafas de Sol", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Belt", name_es: "Cinturón", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Bag", name_es: "Bolso", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Chain", name_es: "Cadena", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Bracelet", name_es: "Pulsera", is_top: false, is_bottom: false, user_id: user.id },
        { name: "Scarf", name_es: "Bufanda", is_top: false, is_bottom: false, user_id: user.id },
      ];

      const { data: newCategories, error: catError } = await supabase
        .from("categories")
        .insert(defaultCategories)
        .select();

      if (catError) throw catError;
      categories = newCategories || [];
    }

    // DIVERSE TEST ITEMS - Korean, UK Drill, Streetwear, Baggy, Y2K, Minimalist
    const testClothingItems = [
      // === KOREAN STREETWEAR ===
      { name: "Oversized Cloud Hoodie", color: "Off-White", brand: "Ader Error", categoryName: "Hoodie", description: "an extremely oversized off-white hoodie with dropped shoulders and raw hem, korean minimalist style" },
      { name: "Wide Sleeve Striped Tee", color: "Black/White", brand: "Wooyoungmi", categoryName: "T-Shirt", description: "a black and white horizontal striped oversized t-shirt with extra wide sleeves, korean aesthetic" },
      { name: "Cropped Boxy Blazer", color: "Beige", brand: "System", categoryName: "Blazer", description: "a cropped boxy beige blazer with oversized lapels, korean tailoring" },
      { name: "Pleated Wide Pants", color: "Cream", brand: "Juun.J", categoryName: "Pants", description: "ultra wide pleated cream trousers, floor-length korean silhouette" },
      { name: "Layered Knit Vest", color: "Gray", brand: "Solid Homme", categoryName: "Vest", description: "a gray ribbed knit vest designed to layer over shirts, korean minimal" },
      { name: "Balloon Sleeve Shirt", color: "White", brand: "Andersson Bell", categoryName: "Shirt", description: "a white cotton shirt with dramatic balloon sleeves, korean romantic style" },
      { name: "Deconstructed Denim Jacket", color: "Light Blue", brand: "Ader Error", categoryName: "Jacket", description: "a light blue denim jacket with asymmetric cut and raw edges, korean streetwear" },
      { name: "Oversized Logo Sweatshirt", color: "Lavender", brand: "Thisisneverthat", categoryName: "Sweater", description: "a lavender oversized sweatshirt with small embroidered logo, korean casual" },
      
      // === UK DRILL / ROADMAN STYLE ===
      { name: "Trapstar Puffer", color: "Black", brand: "Trapstar", categoryName: "Jacket", description: "a black oversized puffer jacket with Trapstar logo, UK drill style" },
      { name: "Tech Fleece Tracksuit Top", color: "Dark Gray", brand: "Nike Tech", categoryName: "Hoodie", description: "a dark gray Nike Tech Fleece hoodie with full zip, UK roadman essential" },
      { name: "Matching Tech Joggers", color: "Dark Gray", brand: "Nike Tech", categoryName: "Joggers", description: "dark gray Nike Tech Fleece joggers, slim fit with zip pockets" },
      { name: "Corteiz Cargo Pants", color: "Black", brand: "Corteiz", categoryName: "Cargo Pants", description: "black oversized cargo pants with multiple pockets, UK streetwear" },
      { name: "Stone Island Crewneck", color: "Navy", brand: "Stone Island", categoryName: "Sweater", description: "a navy blue Stone Island crewneck sweatshirt with arm badge" },
      { name: "CP Company Goggle Jacket", color: "Khaki", brand: "C.P. Company", categoryName: "Jacket", description: "a khaki CP Company soft shell jacket with signature goggle hood" },
      { name: "Moncler Puffer Vest", color: "Black", brand: "Moncler", categoryName: "Vest", description: "a black Moncler down puffer vest, quilted design" },
      { name: "Palm Angels Track Jacket", color: "Black/White", brand: "Palm Angels", categoryName: "Jacket", description: "a black Palm Angels track jacket with white side stripes" },
      
      // === STREETWEAR / HYPE ===
      { name: "Supreme Box Logo Hoodie", color: "Red", brand: "Supreme", categoryName: "Hoodie", description: "a red Supreme hoodie with iconic white box logo on chest" },
      { name: "Bape Shark Hoodie", color: "Camo", brand: "BAPE", categoryName: "Hoodie", description: "a green camo BAPE shark hoodie with full zip face design" },
      { name: "Off-White Industrial Belt", color: "Yellow", brand: "Off-White", categoryName: "Belt", description: "a long yellow Off-White industrial belt with black text" },
      { name: "Stussy World Tour Tee", color: "Black", brand: "Stussy", categoryName: "T-Shirt", description: "a black Stussy t-shirt with world tour back print" },
      { name: "Palace Tri-Ferg Hoodie", color: "White", brand: "Palace", categoryName: "Hoodie", description: "a white Palace hoodie with multicolor tri-ferg logo" },
      { name: "Fear of God Essentials Shorts", color: "Taupe", brand: "FOG Essentials", categoryName: "Shorts", description: "taupe Fear of God Essentials mesh shorts with reflective logo" },
      { name: "Gallery Dept Flared Jeans", color: "Blue", brand: "Gallery Dept", categoryName: "Jeans", description: "distressed blue flared jeans with paint splatter, Gallery Dept" },
      { name: "Rhude Racing Jacket", color: "Black/Red", brand: "Rhude", categoryName: "Jacket", description: "a black and red Rhude vintage racing jacket with patches" },
      
      // === BAGGY / OVERSIZED ===
      { name: "Ultra Wide Baggy Jeans", color: "Dark Indigo", brand: "Polar Skate Co", categoryName: "Jeans", description: "extremely wide baggy dark indigo jeans, skater style" },
      { name: "JNCO Style Mega Wide Jeans", color: "Light Wash", brand: "Empyre", categoryName: "Jeans", description: "light wash mega wide leg jeans with 32 inch leg opening, Y2K style" },
      { name: "Oversized Work Jacket", color: "Brown", brand: "Carhartt WIP", categoryName: "Jacket", description: "a brown oversized Carhartt WIP chore coat, boxy fit" },
      { name: "Baggy Carpenter Pants", color: "Khaki", brand: "Dickies", categoryName: "Pants", description: "khaki baggy Dickies carpenter pants with tool loop and hammer loop" },
      { name: "Double Knee Work Pants", color: "Black", brand: "Carhartt WIP", categoryName: "Pants", description: "black Carhartt WIP double knee work pants, relaxed baggy fit" },
      { name: "Massive Oversized Tee", color: "Washed Black", brand: "Yeezy Gap", categoryName: "T-Shirt", description: "a washed black extremely oversized t-shirt reaching past knees" },
      { name: "Balloon Fit Sweatpants", color: "Heather Gray", brand: "Acne Studios", categoryName: "Joggers", description: "heather gray balloon fit sweatpants, ultra wide through leg" },
      { name: "Parachute Cargo Pants", color: "Olive", brand: "Represent", categoryName: "Cargo Pants", description: "olive green parachute cargo pants with drawstring ankles and many pockets" },
      
      // === MINIMALIST / SCANDINAVIAN ===
      { name: "Clean White Oxford", color: "White", brand: "COS", categoryName: "Shirt", description: "a crisp white oversized oxford shirt, minimal scandinavian design" },
      { name: "Black Wool Overcoat", color: "Black", brand: "Acne Studios", categoryName: "Coat", description: "a black wool blend overcoat with minimal design, knee length" },
      { name: "Ecru Knit Sweater", color: "Ecru", brand: "Lemaire", categoryName: "Sweater", description: "an ecru chunky knit wool sweater, loose boxy fit" },
      { name: "Charcoal Tailored Trousers", color: "Charcoal", brand: "AMI Paris", categoryName: "Pants", description: "charcoal wool tailored trousers with single pleat, wide leg" },
      { name: "Cream Cashmere Hoodie", color: "Cream", brand: "The Row", categoryName: "Hoodie", description: "a cream 100% cashmere hoodie, ultra luxe minimal" },
      { name: "Navy Merino Polo", color: "Navy", brand: "Norse Projects", categoryName: "Polo", description: "a navy merino wool knit polo shirt, scandinavian quality" },
      
      // === VINTAGE / RETRO ===
      { name: "Vintage Varsity Jacket", color: "Burgundy/Cream", brand: "Vintage", categoryName: "Jacket", description: "a burgundy wool varsity jacket with cream leather sleeves, vintage 80s" },
      { name: "Faded Band Tee - Nirvana", color: "Vintage Black", brand: "Vintage", categoryName: "T-Shirt", description: "a faded vintage black Nirvana band t-shirt with cracked print" },
      { name: "Retro Adidas Tracksuit", color: "Navy/White", brand: "Adidas Originals", categoryName: "Jacket", description: "a navy Adidas Originals track jacket with white three stripes, 80s style" },
      { name: "Washed Levi's 501", color: "Vintage Blue", brand: "Levi's Vintage", categoryName: "Jeans", description: "vintage washed Levi's 501 jeans with natural fading and whiskers" },
      { name: "70s Collar Knit Polo", color: "Brown/Orange", brand: "Vintage", categoryName: "Polo", description: "a brown and orange striped knit polo with 70s wide collar" },
      { name: "Corduroy Flared Pants", color: "Rust", brand: "Wrangler", categoryName: "Pants", description: "rust colored corduroy flared pants, 70s western style" },
      
      // === TECHWEAR / UTILITY ===
      { name: "Acronym Jacket", color: "Black", brand: "Acronym", categoryName: "Jacket", description: "a black technical Acronym jacket with multiple zip pockets, futuristic" },
      { name: "Arc'teryx Veilance Coat", color: "Black", brand: "Arc'teryx Veilance", categoryName: "Coat", description: "a black Gore-Tex Arc'teryx Veilance monitor coat, techwear" },
      { name: "Tactical Cargo Vest", color: "Black", brand: "ALYX", categoryName: "Vest", description: "a black tactical utility vest with chest rig buckles, ALYX" },
      { name: "Waterproof Shell Pants", color: "Black", brand: "Acronym", categoryName: "Pants", description: "black waterproof shell pants with articulated knees, technical" },
      { name: "Ninja Tech Hoodie", color: "All Black", brand: "Enfin Levé", categoryName: "Hoodie", description: "an all black tech hoodie with thumbholes and face mask cowl" },
      
      // === FOOTWEAR ===
      { name: "Triple S Chunky Sneakers", color: "White/Gray", brand: "Balenciaga", categoryName: "Sneakers", description: "Balenciaga Triple S chunky platform sneakers in white and gray" },
      { name: "Air Jordan 4 Retro", color: "Bred", brand: "Jordan", categoryName: "Sneakers", description: "Air Jordan 4 Retro in black and red bred colorway" },
      { name: "New Balance 2002R", color: "Rain Cloud", brand: "New Balance", categoryName: "Sneakers", description: "New Balance 2002R in gray rain cloud colorway, chunky dad shoe" },
      { name: "Rick Owens DRKSHDW Ramones", color: "Black", brand: "Rick Owens", categoryName: "Sneakers", description: "black Rick Owens DRKSHDW Ramones high-top sneakers" },
      { name: "Nike Dunk Low", color: "Panda", brand: "Nike", categoryName: "Sneakers", description: "Nike Dunk Low in black and white panda colorway" },
      { name: "Salomon XT-6", color: "Black/Gray", brand: "Salomon", categoryName: "Sneakers", description: "Salomon XT-6 trail running sneakers in black and gray, techwear essential" },
      { name: "Chelsea Boots - Suede", color: "Tan", brand: "Bottega Veneta", categoryName: "Boots", description: "tan suede Chelsea boots with elastic side panels, luxury" },
      { name: "Dr. Martens Platform", color: "Black", brand: "Dr. Martens", categoryName: "Boots", description: "black Dr. Martens Jadon platform boots with yellow stitching" },
      { name: "Yeezy Slides", color: "Onyx", brand: "Yeezy", categoryName: "Sneakers", description: "onyx black Yeezy slides, minimal foam sandals" },
      { name: "Converse Chuck 70 High", color: "Parchment", brand: "Converse", categoryName: "Sneakers", description: "parchment white Converse Chuck 70 high-top canvas sneakers" },
      
      // === ACCESSORIES ===
      { name: "Chrome Hearts Trucker Hat", color: "Black", brand: "Chrome Hearts", categoryName: "Hat", description: "black Chrome Hearts trucker hat with cross patch" },
      { name: "Goyard Cardholder", color: "Black", brand: "Goyard", categoryName: "Bag", description: "black Goyard Saint Sulpice cardholder with signature print" },
      { name: "Vivienne Westwood Orb Necklace", color: "Silver", brand: "Vivienne Westwood", categoryName: "Chain", description: "silver Vivienne Westwood mini orb pendant necklace" },
      { name: "Balaclava - Ski Mask", color: "Black", brand: "Corteiz", categoryName: "Beanie", description: "black knit balaclava ski mask, UK drill style" },
      { name: "Cuban Link Chain Heavy", color: "Silver", brand: "The GLD Shop", categoryName: "Chain", description: "heavy silver cuban link chain, 12mm width, iced out look" },
      { name: "Designer Belt - GG", color: "Black", brand: "Gucci", categoryName: "Belt", description: "black leather Gucci belt with interlocking GG buckle" },
      { name: "Messenger Bag", color: "Black", brand: "Prada", categoryName: "Bag", description: "black nylon Prada messenger crossbody bag with triangle logo" },
      { name: "Bucket Hat - Terry", color: "Cream", brand: "Jacquemus", categoryName: "Hat", description: "cream terry cloth Jacquemus bucket hat, summer vibes" },
      { name: "Oval Sunglasses", color: "Black", brand: "Gentle Monster", categoryName: "Sunglasses", description: "black oval shaped Gentle Monster sunglasses, korean style" },
      { name: "Cashmere Scarf Long", color: "Camel", brand: "Loro Piana", categoryName: "Scarf", description: "camel colored long cashmere scarf, luxury quality" },
      { name: "Sports Watch - G-Shock", color: "All Black", brand: "Casio G-Shock", categoryName: "Watch", description: "all black Casio G-Shock digital watch, stealth edition" },
      { name: "Leather Bracelet Set", color: "Brown/Black", brand: "Vitaly", categoryName: "Bracelet", description: "brown and black leather bracelet set, 3 pieces" },
      
      // === MORE TOPS ===
      { name: "Graphic Tee - Anime", color: "White", brand: "Pleasures", categoryName: "T-Shirt", description: "white t-shirt with vintage anime character graphic print" },
      { name: "Mesh Football Jersey", color: "Red", brand: "Supreme", categoryName: "T-Shirt", description: "red mesh football jersey with number print, streetwear" },
      { name: "Ribbed Tank Top", color: "White", brand: "Calvin Klein", categoryName: "Tank Top", description: "white ribbed cotton tank top, classic fit" },
      { name: "Cropped Cardigan", color: "Pink", brand: "Acne Studios", categoryName: "Sweater", description: "pink cropped mohair cardigan with pearl buttons" },
      { name: "Vintage Racing Polo", color: "Navy/Red", brand: "Tommy Hilfiger", categoryName: "Polo", description: "navy and red vintage Tommy Hilfiger racing polo shirt" },
    ];

    const createdItems: unknown[] = [];
    const placeholderItems: string[] = [];

    // Process items sequentially with small delays
    for (let i = 0; i < testClothingItems.length; i++) {
      const item = testClothingItems[i];
      const category = categories.find((c: { name: string }) => c.name === item.categoryName);
      
      if (!category) {
        console.log(`Skipping ${item.name}: category ${item.categoryName} not found`);
        continue;
      }

      console.log(`Processing ${i + 1}/${testClothingItems.length}: ${item.name}`);
      
      const imageUrl = await generateClothingImage(item.description, LOVABLE_API_KEY);
      const hasPlaceholder = imageUrl === PLACEHOLDER_IMAGE;
      
      if (hasPlaceholder) {
        placeholderItems.push(item.name);
      }

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
      } else {
        createdItems.push(clothingItem);
      }

      // Small delay between items
      if (i < testClothingItems.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdItems.length} items (${placeholderItems.length} with placeholder images)`,
        itemCount: createdItems.length,
        placeholderCount: placeholderItems.length,
        placeholderItems,
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
