import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate AI image for clothing with retries
async function generateClothingImage(description: string, apiKey: string, maxRetries: number = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
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
              content: `Generate a clean, professional product photo of ${description}. White background, centered, high quality fashion photography style.`,
            },
          ],
          modalities: ["image", "text"],
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.status === 429) {
        // Rate limited - wait with exponential backoff
        const waitTime = Math.pow(2, attempt) * 5000; // 10s, 20s, 40s
        console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        console.log(`Image generation failed with status ${response.status}, attempt ${attempt}/${maxRetries}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(`Failed after ${maxRetries} attempts`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        return imageUrl;
      }
      
      console.log(`No image in response, attempt ${attempt}/${maxRetries}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw new Error("No image returned");
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Timeout on attempt ${attempt}/${maxRetries}`);
      } else {
        console.log(`Image generation error on attempt ${attempt}/${maxRetries}:`, error);
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to generate image after all retries");
}

interface ProcessResult {
  item: { name: string };
  success: boolean;
  reason?: string;
  data?: unknown;
  hasPlaceholder?: boolean;
}

// Process items in batches to avoid rate limits
async function processBatch(
  items: Array<{ name: string; color: string; brand: string; categoryName: string; description: string }>,
  batchSize: number,
  delayMs: number,
  processor: (item: { name: string; color: string; brand: string; categoryName: string; description: string }) => Promise<ProcessResult>
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      console.log(`Processed ${Math.min(i + batchSize, items.length)}/${items.length} items`);
      await new Promise<void>(r => setTimeout(r, delayMs));
    }
  }
  return results;
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

    // If user has no categories, create them with more variety
    if (categories.length === 0) {
      const defaultCategories = [
        // Tops
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
        // Bottoms
        { name: "Jeans", name_es: "Vaqueros", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Pants", name_es: "Pantalones", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Shorts", name_es: "Shorts", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Joggers", name_es: "Joggers", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Cargo Pants", name_es: "Pantalones Cargo", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Chinos", name_es: "Chinos", is_top: false, is_bottom: true, user_id: user.id },
        { name: "Skirt", name_es: "Falda", is_top: false, is_bottom: true, user_id: user.id },
        // Accessories
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

    // Define a massive variety of test clothing items - extravagant and diverse
    const testClothingItems = [
      // === TOPS - Basic Layer ===
      { name: "White Essential Tee", color: "White", brand: "Uniqlo", categoryName: "T-Shirt", description: "a plain white cotton crew neck t-shirt, minimalist style" },
      { name: "Black Graphic Tee - Vintage Print", color: "Black", brand: "Supreme", categoryName: "T-Shirt", description: "a black t-shirt with vintage Japanese wave graphic print" },
      { name: "Washed Gray Boxy Tee", color: "Gray", brand: "Fear of God Essentials", categoryName: "T-Shirt", description: "an oversized boxy gray t-shirt with dropped shoulders" },
      { name: "Cream Ribbed Tank", color: "Cream", brand: "Aritzia", categoryName: "Tank Top", description: "a fitted cream ribbed tank top" },
      { name: "Striped Breton Shirt", color: "Navy/White", brand: "Saint James", categoryName: "T-Shirt", description: "a classic navy and white striped breton t-shirt" },
      { name: "Vintage Band Tee - Faded", color: "Faded Black", brand: "Vintage", categoryName: "T-Shirt", description: "a faded black vintage rock band t-shirt with cracked print" },
      { name: "Olive Military Tee", color: "Olive", brand: "Alpha Industries", categoryName: "T-Shirt", description: "an olive green military style cotton t-shirt" },
      { name: "Tie-Dye Purple Tee", color: "Purple", brand: "Stussy", categoryName: "T-Shirt", description: "a purple and white tie-dye pattern t-shirt" },
      
      // === TOPS - Shirts ===
      { name: "Oxford Blue Button-Down", color: "Light Blue", brand: "Ralph Lauren", categoryName: "Shirt", description: "a classic light blue oxford button-down shirt" },
      { name: "Black Silk Shirt", color: "Black", brand: "The Kooples", categoryName: "Shirt", description: "a sleek black silk dress shirt with subtle sheen" },
      { name: "Flannel Red Plaid", color: "Red/Black", brand: "Pendleton", categoryName: "Shirt", description: "a red and black plaid flannel shirt, thick cotton" },
      { name: "White Linen Resort Shirt", color: "White", brand: "Onia", categoryName: "Shirt", description: "a loose white linen resort shirt, relaxed fit" },
      { name: "Bowling Shirt - Retro", color: "Teal/Cream", brand: "Wacko Maria", categoryName: "Shirt", description: "a retro bowling shirt with teal and cream colorblock" },
      { name: "Denim Western Shirt", color: "Medium Wash", brand: "Levi's", categoryName: "Shirt", description: "a medium wash denim western shirt with pearl snaps" },
      { name: "Camp Collar Hawaiian", color: "Tropical Print", brand: "Gitman Vintage", categoryName: "Shirt", description: "a tropical print camp collar hawaiian shirt with palm leaves" },
      
      // === TOPS - Sweaters & Hoodies ===
      { name: "Heather Gray Crewneck", color: "Heather Gray", brand: "Champion", categoryName: "Sweater", description: "a classic heather gray crewneck sweatshirt" },
      { name: "Navy Cable Knit Sweater", color: "Navy", brand: "J.Crew", categoryName: "Sweater", description: "a navy blue cable knit wool sweater" },
      { name: "Oversized Cream Hoodie", color: "Cream", brand: "Yeezy", categoryName: "Hoodie", description: "an oversized cream colored heavyweight hoodie" },
      { name: "Black Zip-Up Hoodie", color: "Black", brand: "Nike Tech Fleece", categoryName: "Hoodie", description: "a black Nike tech fleece full-zip hoodie" },
      { name: "Burgundy Mohair Sweater", color: "Burgundy", brand: "Marni", categoryName: "Sweater", description: "a fuzzy burgundy mohair blend sweater, oversized" },
      { name: "Striped Cardigan", color: "Multicolor", brand: "Marni", categoryName: "Sweater", description: "a multicolor striped oversized cardigan sweater" },
      { name: "Sage Green Hoodie", color: "Sage", brand: "Carhartt WIP", categoryName: "Hoodie", description: "a sage green heavyweight hoodie with kangaroo pocket" },
      { name: "Brown Varsity Sweater", color: "Brown/Cream", brand: "Rhude", categoryName: "Sweater", description: "a brown and cream varsity style knit sweater with R patch" },
      
      // === TOPS - Outerwear ===
      { name: "Classic Denim Jacket", color: "Medium Wash", brand: "Levi's", categoryName: "Jacket", description: "a classic medium wash blue denim trucker jacket" },
      { name: "Black Leather Biker Jacket", color: "Black", brand: "Schott NYC", categoryName: "Jacket", description: "a black leather motorcycle biker jacket with silver hardware" },
      { name: "MA-1 Bomber Jacket", color: "Black", brand: "Alpha Industries", categoryName: "Jacket", description: "a black MA-1 bomber jacket with orange reversible lining" },
      { name: "Camel Overcoat", color: "Camel", brand: "A.P.C.", categoryName: "Coat", description: "a camel colored wool overcoat, mid-length classic cut" },
      { name: "Black Puffer Jacket", color: "Black", brand: "The North Face", categoryName: "Jacket", description: "a black 700-fill down puffer jacket, Nuptse style" },
      { name: "Olive M-65 Field Jacket", color: "Olive", brand: "Alpha Industries", categoryName: "Jacket", description: "an olive green M-65 military field jacket with brass hardware" },
      { name: "Cream Teddy Fleece Jacket", color: "Cream", brand: "Patagonia", categoryName: "Jacket", description: "a cream colored teddy fleece zip jacket, cozy texture" },
      { name: "Navy Blazer - Double Breasted", color: "Navy", brand: "Hugo Boss", categoryName: "Blazer", description: "a navy blue double-breasted wool blazer with gold buttons" },
      { name: "Checked Overcoat", color: "Gray Check", brand: "Cos", categoryName: "Coat", description: "a gray checked oversized wool overcoat" },
      { name: "Varsity Jacket - Leather Sleeves", color: "Black/White", brand: "Golden Bear", categoryName: "Jacket", description: "a black and white varsity jacket with leather sleeves" },
      { name: "Corduroy Trucker Jacket", color: "Tan", brand: "Carhartt WIP", categoryName: "Jacket", description: "a tan corduroy trucker jacket with sherpa lining" },
      { name: "Track Jacket - Retro", color: "Red/White", brand: "Adidas Originals", categoryName: "Jacket", description: "a red and white retro Adidas track jacket with three stripes" },
      
      // === BOTTOMS - Jeans ===
      { name: "Slim Black Jeans", color: "Black", brand: "Acne Studios", categoryName: "Jeans", description: "slim fit black denim jeans, clean minimal look" },
      { name: "Light Wash Baggy Jeans", color: "Light Wash", brand: "Levi's 550", categoryName: "Jeans", description: "light wash baggy relaxed fit jeans, 90s style" },
      { name: "Raw Selvedge Denim", color: "Indigo", brand: "A.P.C. Petit Standard", categoryName: "Jeans", description: "raw indigo selvedge denim jeans, slim straight fit" },
      { name: "Distressed Blue Jeans", color: "Medium Wash", brand: "Amiri", categoryName: "Jeans", description: "medium wash distressed jeans with rips at knees" },
      { name: "Wide Leg Carpenter Jeans", color: "Dark Wash", brand: "Carhartt WIP", categoryName: "Jeans", description: "dark wash wide leg carpenter jeans with tool loop" },
      { name: "Cream Straight Leg Jeans", color: "Cream", brand: "Agolde", categoryName: "Jeans", description: "cream colored straight leg high-waisted jeans" },
      { name: "Vintage Faded Boyfriend Jeans", color: "Vintage Blue", brand: "Re/Done", categoryName: "Jeans", description: "vintage faded blue boyfriend relaxed jeans" },
      
      // === BOTTOMS - Pants ===
      { name: "Black Wide Leg Trousers", color: "Black", brand: "Lemaire", categoryName: "Pants", description: "black wide leg pleated wool trousers, elegant drape" },
      { name: "Khaki Chinos", color: "Khaki", brand: "Dockers", categoryName: "Chinos", description: "classic khaki colored cotton chino pants, slim fit" },
      { name: "Black Cargo Pants - Oversized", color: "Black", brand: "Rick Owens DRKSHDW", categoryName: "Cargo Pants", description: "black oversized cargo pants with multiple pockets" },
      { name: "Olive Parachute Pants", color: "Olive", brand: "Represent", categoryName: "Cargo Pants", description: "olive green parachute cargo pants with drawstring ankles" },
      { name: "Navy Tailored Trousers", color: "Navy", brand: "Theory", categoryName: "Pants", description: "navy blue tailored wool trousers, pressed crease" },
      { name: "Brown Corduroy Pants", color: "Brown", brand: "Corridor NYC", categoryName: "Pants", description: "brown wide wale corduroy pants, relaxed fit" },
      { name: "Gray Sweatpants - Heavyweight", color: "Gray", brand: "Essentials", categoryName: "Joggers", description: "gray heavyweight cotton sweatpants, relaxed fit" },
      { name: "Black Track Pants", color: "Black", brand: "Nike", categoryName: "Joggers", description: "black Nike track pants with white stripe" },
      { name: "Beige Pleated Pants", color: "Beige", brand: "Ami Paris", categoryName: "Pants", description: "beige pleated wool pants, cropped length" },
      { name: "Stone Cargo Shorts", color: "Stone", brand: "Carhartt WIP", categoryName: "Shorts", description: "stone colored cotton cargo shorts with multiple pockets" },
      
      // === BOTTOMS - Shorts ===
      { name: "Navy Athletic Shorts", color: "Navy", brand: "Nike Dri-FIT", categoryName: "Shorts", description: "navy blue Nike athletic shorts with mesh lining" },
      { name: "Khaki Bermuda Shorts", color: "Khaki", brand: "Ralph Lauren", categoryName: "Shorts", description: "khaki colored bermuda length cotton shorts" },
      { name: "Black Nylon Shorts", color: "Black", brand: "Prada", categoryName: "Shorts", description: "black nylon logo shorts, luxury sporty style" },
      { name: "Denim Cutoff Shorts", color: "Light Wash", brand: "Levi's 501", categoryName: "Shorts", description: "light wash denim cutoff shorts, raw hem" },
      
      // === FOOTWEAR ===
      { name: "White Leather Sneakers", color: "White", brand: "Common Projects Achilles", categoryName: "Sneakers", description: "minimalist white leather low-top sneakers, gold serial number" },
      { name: "Air Jordan 1 Retro High", color: "Black/Red", brand: "Jordan", categoryName: "Sneakers", description: "Air Jordan 1 Retro High OG in bred black and red colorway" },
      { name: "New Balance 550", color: "White/Green", brand: "New Balance", categoryName: "Sneakers", description: "New Balance 550 white leather sneakers with green accents" },
      { name: "Nike Air Force 1 Low", color: "White", brand: "Nike", categoryName: "Sneakers", description: "classic all-white Nike Air Force 1 Low sneakers" },
      { name: "Chunky Dad Sneakers", color: "Gray/Cream", brand: "New Balance 990v5", categoryName: "Sneakers", description: "gray and cream New Balance 990v5 chunky running sneakers" },
      { name: "Black High-Top Converse", color: "Black", brand: "Converse Chuck 70", categoryName: "Sneakers", description: "black Converse Chuck 70 high-top canvas sneakers" },
      { name: "Suede Chelsea Boots", color: "Tan", brand: "Common Projects", categoryName: "Boots", description: "tan suede Chelsea boots with elastic side panels" },
      { name: "Black Combat Boots", color: "Black", brand: "Dr. Martens 1460", categoryName: "Boots", description: "black leather Dr. Martens 1460 combat boots" },
      { name: "Brown Leather Loafers", color: "Brown", brand: "G.H. Bass Weejuns", categoryName: "Loafers", description: "brown leather penny loafers, classic preppy style" },
      { name: "Birkenstock Arizona", color: "Taupe", brand: "Birkenstock", categoryName: "Sneakers", description: "taupe suede Birkenstock Arizona two-strap sandals" },
      
      // === ACCESSORIES ===
      { name: "Black Baseball Cap", color: "Black", brand: "New Era Yankees", categoryName: "Hat", description: "black New York Yankees fitted baseball cap" },
      { name: "Cream Bucket Hat", color: "Cream", brand: "Stussy", categoryName: "Hat", description: "cream colored cotton bucket hat" },
      { name: "Gray Wool Beanie", color: "Gray", brand: "Acne Studios", categoryName: "Beanie", description: "gray ribbed wool beanie with face logo" },
      { name: "Black Aviator Sunglasses", color: "Gold/Black", brand: "Ray-Ban", categoryName: "Sunglasses", description: "gold frame black lens aviator sunglasses" },
      { name: "Tortoise Wayfarer Sunglasses", color: "Tortoise", brand: "Persol", categoryName: "Sunglasses", description: "tortoise shell Persol wayfarer sunglasses" },
      { name: "Silver Watch - Minimalist", color: "Silver", brand: "Daniel Wellington", categoryName: "Watch", description: "minimalist silver watch with white dial and black leather strap" },
      { name: "Black G-Shock Watch", color: "Black", brand: "Casio G-Shock", categoryName: "Watch", description: "black Casio G-Shock digital watch, rugged style" },
      { name: "Gold Cuban Link Chain", color: "Gold", brand: "The GLD Shop", categoryName: "Chain", description: "18k gold plated cuban link chain necklace, medium width" },
      { name: "Silver Chain Necklace", color: "Silver", brand: "Miansai", categoryName: "Chain", description: "sterling silver box chain necklace, minimal style" },
      { name: "Black Leather Belt", color: "Black", brand: "Gucci", categoryName: "Belt", description: "black leather belt with interlocking G buckle" },
      { name: "Brown Woven Belt", color: "Brown", brand: "Anderson's", categoryName: "Belt", description: "brown woven elastic belt with leather trim" },
      { name: "Canvas Tote Bag", color: "Natural", brand: "L.L.Bean", categoryName: "Bag", description: "natural canvas boat and tote bag with navy handles" },
      { name: "Black Crossbody Bag", color: "Black", brand: "Prada", categoryName: "Bag", description: "black nylon crossbody sling bag with triangle logo" },
      { name: "Leather Backpack", color: "Tan", brand: "Mismo", categoryName: "Bag", description: "tan leather minimalist backpack, clean lines" },
      { name: "Cashmere Scarf", color: "Gray", brand: "Acne Studios", categoryName: "Scarf", description: "oversized gray cashmere scarf with fringe" },
      { name: "Beaded Bracelet Set", color: "Earth Tones", brand: "Vitaly", categoryName: "Bracelet", description: "earth-toned beaded bracelet set, 3 pieces" },
    ];

    const createdItems = [];
    const skippedItems = [];

    // Process items one at a time with delays to respect rate limits
    const processItem = async (item: typeof testClothingItems[0]): Promise<ProcessResult> => {
      // Find the category
      const category = categories.find((c: any) => c.name === item.categoryName);
      if (!category) {
        console.log(`Category not found: ${item.categoryName}`);
        return { item, success: false, reason: "category_not_found" };
      }

      try {
        // Generate AI image - will throw if all retries fail
        console.log(`Generating image for: ${item.name}`);
        const imageUrl = await generateClothingImage(item.description, LOVABLE_API_KEY);

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
          return { item, success: false, reason: "insert_error" };
        }

        return { item, success: true, data: clothingItem };
      } catch (error) {
        console.error(`Failed to generate image for ${item.name}:`, error);
        return { item, success: false, reason: "image_generation_failed" };
      }
    };

    // Process items in batches of 2 with 5 second delays to handle rate limits
    const results = await processBatch(testClothingItems, 2, 5000, processItem);

    for (const result of results) {
      if (result.success) {
        createdItems.push(result.data);
      } else {
        skippedItems.push({ name: result.item.name, reason: result.reason });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdItems.length} test clothing items with AI-generated images`,
        itemCount: createdItems.length,
        skipped: skippedItems,
        skippedCount: skippedItems.length,
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
