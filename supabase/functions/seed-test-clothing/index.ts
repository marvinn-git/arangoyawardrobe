import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Placeholder image when AI generation fails
const PLACEHOLDER_IMAGE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlNWU1ZTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";

// Generate AI image for clothing with retry logic
async function generateClothingImage(description: string, apiKey: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
              content: `Generate a clean, professional product photo of ${description}. White background, centered, high quality fashion photography style. The clothing item should be displayed flat or on an invisible mannequin. Men's fashion item.`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Image generation attempt ${attempt + 1} failed:`, errorText);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        return PLACEHOLDER_IMAGE;
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      return imageUrl || PLACEHOLDER_IMAGE;
    } catch (error) {
      console.error(`Error generating image (attempt ${attempt + 1}):`, error);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return PLACEHOLDER_IMAGE;
    }
  }
  return PLACEHOLDER_IMAGE;
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

    // Get existing clothing items for this user to avoid duplicates
    const { data: existingItems } = await supabase
      .from("clothing_items")
      .select("name")
      .eq("user_id", user.id);

    const existingNames = new Set((existingItems || []).map((item: any) => item.name.toLowerCase()));

    // MASSIVE pool of men's clothing items - diverse styles with emphasis on baggy/oversized fits
    const allClothingItems = [
      // === T-SHIRTS ===
      { name: "White Essential Tee", color: "White", brand: "Uniqlo", categoryName: "T-Shirt", description: "a plain white cotton crew neck t-shirt for men, minimalist style" },
      { name: "Black Graphic Tee - Vintage Print", color: "Black", brand: "Supreme", categoryName: "T-Shirt", description: "a black men's t-shirt with vintage Japanese wave graphic print" },
      { name: "Washed Gray Boxy Tee", color: "Gray", brand: "Fear of God Essentials", categoryName: "T-Shirt", description: "an oversized boxy gray t-shirt with dropped shoulders for men" },
      { name: "Striped Breton Shirt", color: "Navy/White", brand: "Saint James", categoryName: "T-Shirt", description: "a classic navy and white striped breton t-shirt for men" },
      { name: "Vintage Band Tee - Faded", color: "Faded Black", brand: "Vintage", categoryName: "T-Shirt", description: "a faded black vintage rock band t-shirt with cracked print" },
      { name: "Olive Military Tee", color: "Olive", brand: "Alpha Industries", categoryName: "T-Shirt", description: "an olive green military style cotton t-shirt for men" },
      { name: "Tie-Dye Purple Tee", color: "Purple", brand: "Stussy", categoryName: "T-Shirt", description: "a purple and white tie-dye pattern t-shirt for men" },
      { name: "Cream Heavyweight Tee", color: "Cream", brand: "Lady White Co", categoryName: "T-Shirt", description: "a cream heavyweight cotton t-shirt, boxy fit for men" },
      { name: "Oversized Washed Black Tee", color: "Washed Black", brand: "Yeezy Gap", categoryName: "T-Shirt", description: "an oversized washed black cotton t-shirt for men, super baggy fit" },
      { name: "Double Layer Long Sleeve Tee", color: "Black/White", brand: "Rick Owens", categoryName: "T-Shirt", description: "a double layered long sleeve t-shirt in black and white for men, oversized" },
      { name: "Vintage Washed Navy Tee", color: "Washed Navy", brand: "Stussy", categoryName: "T-Shirt", description: "a vintage washed navy blue oversized t-shirt for men" },
      { name: "Oversized Pocket Tee", color: "Sand", brand: "Auralee", categoryName: "T-Shirt", description: "a sand colored oversized pocket t-shirt for men, Japanese minimalist" },
      
      // === SHIRTS ===
      { name: "Oxford Blue Button-Down", color: "Light Blue", brand: "Ralph Lauren", categoryName: "Shirt", description: "a classic light blue oxford button-down shirt for men" },
      { name: "Black Silk Shirt", color: "Black", brand: "The Kooples", categoryName: "Shirt", description: "a sleek black silk dress shirt with subtle sheen for men" },
      { name: "Flannel Red Plaid", color: "Red/Black", brand: "Pendleton", categoryName: "Shirt", description: "a red and black plaid flannel shirt for men, thick cotton" },
      { name: "White Linen Resort Shirt", color: "White", brand: "Onia", categoryName: "Shirt", description: "a loose white linen resort shirt for men, relaxed fit" },
      { name: "Bowling Shirt - Retro", color: "Teal/Cream", brand: "Wacko Maria", categoryName: "Shirt", description: "a retro bowling shirt with teal and cream colorblock for men" },
      { name: "Denim Western Shirt", color: "Medium Wash", brand: "Levi's", categoryName: "Shirt", description: "a medium wash denim western shirt with pearl snaps for men" },
      { name: "Camp Collar Hawaiian", color: "Tropical Print", brand: "Gitman Vintage", categoryName: "Shirt", description: "a tropical print camp collar hawaiian shirt for men" },
      { name: "Oversized Poplin Shirt", color: "White", brand: "Lemaire", categoryName: "Shirt", description: "an oversized white poplin shirt for men with dropped shoulders and relaxed silhouette" },
      { name: "Striped Oversized Shirt", color: "Blue/White", brand: "Our Legacy", categoryName: "Shirt", description: "a blue and white striped oversized cotton shirt for men, boxy cut" },
      { name: "Satin Camp Collar Shirt", color: "Burgundy", brand: "Celine", categoryName: "Shirt", description: "a burgundy satin camp collar shirt for men, relaxed fit" },
      
      // === SWEATERS & HOODIES ===
      { name: "Heather Gray Crewneck", color: "Heather Gray", brand: "Champion", categoryName: "Sweater", description: "a classic heather gray crewneck sweatshirt for men" },
      { name: "Navy Cable Knit Sweater", color: "Navy", brand: "J.Crew", categoryName: "Sweater", description: "a navy blue cable knit wool sweater for men" },
      { name: "Oversized Cream Hoodie", color: "Cream", brand: "Yeezy", categoryName: "Hoodie", description: "an oversized cream colored heavyweight hoodie for men, super baggy" },
      { name: "Black Zip-Up Hoodie", color: "Black", brand: "Nike Tech Fleece", categoryName: "Hoodie", description: "a black Nike tech fleece full-zip hoodie for men" },
      { name: "Burgundy Mohair Sweater", color: "Burgundy", brand: "Marni", categoryName: "Sweater", description: "a fuzzy burgundy mohair blend sweater for men, oversized" },
      { name: "Striped Cardigan", color: "Multicolor", brand: "Marni", categoryName: "Sweater", description: "a multicolor striped oversized cardigan sweater for men" },
      { name: "Sage Green Hoodie", color: "Sage", brand: "Carhartt WIP", categoryName: "Hoodie", description: "a sage green heavyweight hoodie with kangaroo pocket for men, oversized" },
      { name: "Oatmeal Fisherman Sweater", color: "Oatmeal", brand: "Aran Crafts", categoryName: "Sweater", description: "an oatmeal colored Irish fisherman cable knit sweater for men, oversized" },
      { name: "Forest Green Hoodie", color: "Forest Green", brand: "Reigning Champ", categoryName: "Hoodie", description: "a forest green midweight terry hoodie for men, relaxed fit" },
      { name: "Washed Brown Boxy Hoodie", color: "Washed Brown", brand: "Fear of God", categoryName: "Hoodie", description: "a washed brown boxy oversized hoodie for men with dropped shoulders" },
      { name: "Double Layer Hoodie", color: "Black", brand: "Balenciaga", categoryName: "Hoodie", description: "a black double layer oversized hoodie for men, extremely baggy" },
      { name: "Balaclava Hoodie", color: "Charcoal", brand: "Rick Owens DRKSHDW", categoryName: "Hoodie", description: "a charcoal gray balaclava hoodie for men with integrated face covering, oversized" },
      { name: "Cropped Boxy Sweater", color: "Ivory", brand: "Jil Sander", categoryName: "Sweater", description: "an ivory cropped boxy knit sweater for men, minimalist oversized" },
      { name: "Distressed Knit Sweater", color: "Black", brand: "Raf Simons", categoryName: "Sweater", description: "a distressed black knit sweater for men with intentional holes, oversized" },
      { name: "Patchwork Cardigan", color: "Multicolor", brand: "Bode", categoryName: "Sweater", description: "a vintage patchwork quilted cardigan for men, relaxed artisanal style" },
      
      // === JACKETS & COATS ===
      { name: "Classic Denim Jacket", color: "Medium Wash", brand: "Levi's", categoryName: "Jacket", description: "a classic medium wash blue denim trucker jacket for men" },
      { name: "Black Leather Biker Jacket", color: "Black", brand: "Schott NYC", categoryName: "Jacket", description: "a black leather motorcycle biker jacket for men with silver hardware" },
      { name: "MA-1 Bomber Jacket", color: "Black", brand: "Alpha Industries", categoryName: "Jacket", description: "a black MA-1 bomber jacket for men with orange reversible lining" },
      { name: "Camel Overcoat", color: "Camel", brand: "A.P.C.", categoryName: "Coat", description: "a camel colored wool overcoat for men, mid-length classic cut" },
      { name: "Black Puffer Jacket", color: "Black", brand: "The North Face", categoryName: "Jacket", description: "a black 700-fill down puffer jacket for men, Nuptse style" },
      { name: "Olive M-65 Field Jacket", color: "Olive", brand: "Alpha Industries", categoryName: "Jacket", description: "an olive green M-65 military field jacket for men with brass hardware" },
      { name: "Cream Teddy Fleece Jacket", color: "Cream", brand: "Patagonia", categoryName: "Jacket", description: "a cream colored teddy fleece zip jacket for men, oversized" },
      { name: "Oversized Denim Jacket", color: "Light Wash", brand: "Raf Simons", categoryName: "Jacket", description: "a light wash oversized denim jacket for men with dropped shoulders" },
      { name: "Padded Workwear Jacket", color: "Olive", brand: "Carhartt WIP", categoryName: "Jacket", description: "an olive padded workwear jacket for men, boxy oversized fit" },
      { name: "Oversized Puffer", color: "Cream", brand: "Maison Margiela", categoryName: "Jacket", description: "a cream colored oversized puffer jacket for men, duvet-like silhouette" },
      { name: "Long Black Trench", color: "Black", brand: "Vetements", categoryName: "Coat", description: "a black oversized leather trench coat for men, extra long" },
      { name: "Shearling Jacket", color: "Brown", brand: "Acne Studios", categoryName: "Jacket", description: "a brown shearling aviator jacket for men, oversized relaxed fit" },
      { name: "Waxed Canvas Chore Coat", color: "Navy", brand: "Barbour", categoryName: "Jacket", description: "a navy waxed canvas chore coat for men, baggy fit" },
      { name: "Quilted Liner Jacket", color: "Olive", brand: "Engineered Garments", categoryName: "Jacket", description: "an olive quilted liner jacket for men, oversized layering piece" },
      
      // === JEANS - BAGGY FOCUS ===
      { name: "Slim Black Jeans", color: "Black", brand: "Acne Studios", categoryName: "Jeans", description: "slim fit black denim jeans for men, clean minimal look" },
      { name: "Light Wash Baggy Jeans", color: "Light Wash", brand: "Levi's 550", categoryName: "Jeans", description: "light wash baggy relaxed fit jeans for men, 90s style" },
      { name: "Ultra Baggy Blue Jeans", color: "Medium Wash", brand: "Balenciaga", categoryName: "Jeans", description: "ultra baggy medium wash blue jeans for men, extremely wide leg" },
      { name: "Distressed Wide Leg Jeans", color: "Light Wash", brand: "Gallery Dept", categoryName: "Jeans", description: "light wash distressed wide leg jeans for men with paint splatter" },
      { name: "Dark Indigo Loose Jeans", color: "Dark Indigo", brand: "Orslow", categoryName: "Jeans", description: "dark indigo loose fit Japanese denim jeans for men" },
      { name: "Vintage Baggy Jeans", color: "Faded Blue", brand: "Vintage Levi's 560", categoryName: "Jeans", description: "faded blue vintage baggy jeans for men, 90s silhouette" },
      { name: "Double Knee Wide Jeans", color: "Washed Black", brand: "Carhartt WIP", categoryName: "Jeans", description: "washed black double knee wide leg jeans for men" },
      { name: "Carpenter Baggy Jeans", color: "Medium Wash", brand: "Dickies", categoryName: "Jeans", description: "medium wash baggy carpenter jeans for men with hammer loop" },
      { name: "Stacked Baggy Jeans", color: "Light Wash", brand: "Purple Brand", categoryName: "Jeans", description: "light wash stacked baggy jeans for men with heavy stacking at ankles" },
      { name: "Raw Denim Wide Leg", color: "Raw Indigo", brand: "Kapital", categoryName: "Jeans", description: "raw indigo wide leg selvedge jeans for men, Japanese workwear" },
      { name: "Cream Baggy Jeans", color: "Cream", brand: "Agolde", categoryName: "Jeans", description: "cream colored baggy relaxed jeans for men" },
      { name: "Patchwork Baggy Jeans", color: "Mixed Denim", brand: "Kapital", categoryName: "Jeans", description: "patchwork mixed denim baggy jeans for men, artisanal style" },
      
      // === PANTS - BAGGY FOCUS ===
      { name: "Black Wide Leg Trousers", color: "Black", brand: "Lemaire", categoryName: "Pants", description: "black wide leg pleated wool trousers for men, super wide" },
      { name: "Black Cargo Pants - Oversized", color: "Black", brand: "Rick Owens DRKSHDW", categoryName: "Cargo Pants", description: "black oversized cargo pants for men with multiple pockets" },
      { name: "Olive Parachute Pants", color: "Olive", brand: "Represent", categoryName: "Cargo Pants", description: "olive green parachute cargo pants for men with drawstring ankles" },
      { name: "Brown Corduroy Pants", color: "Brown", brand: "Corridor NYC", categoryName: "Pants", description: "brown wide wale corduroy pants for men, super baggy relaxed fit" },
      { name: "Gray Sweatpants - Heavyweight", color: "Gray", brand: "Essentials", categoryName: "Joggers", description: "gray heavyweight cotton sweatpants for men, super baggy relaxed fit" },
      { name: "Balloon Pants", color: "Beige", brand: "Homme Plissé Issey Miyake", categoryName: "Pants", description: "beige pleated balloon pants for men, dramatic wide silhouette" },
      { name: "Oversized Cargo Shorts", color: "Khaki", brand: "Stussy", categoryName: "Shorts", description: "khaki oversized cargo shorts for men with large pockets" },
      { name: "Nylon Parachute Pants", color: "Black", brand: "Misbhv", categoryName: "Cargo Pants", description: "black nylon parachute cargo pants for men, ultra baggy" },
      { name: "Pleated Wide Trousers", color: "Charcoal", brand: "Yohji Yamamoto", categoryName: "Pants", description: "charcoal pleated wide leg wool trousers for men, avant-garde" },
      { name: "Baggy Chinos", color: "Tan", brand: "Stan Ray", categoryName: "Chinos", description: "tan baggy chino pants for men, workwear style" },
      { name: "Drop Crotch Pants", color: "Black", brand: "Rick Owens", categoryName: "Pants", description: "black drop crotch harem pants for men, dramatic silhouette" },
      { name: "Relaxed Fatigue Pants", color: "Olive", brand: "Engineered Garments", categoryName: "Cargo Pants", description: "olive relaxed fatigue pants for men with oversized pockets" },
      
      // === SNEAKERS ===
      { name: "White Leather Sneakers", color: "White", brand: "Common Projects Achilles", categoryName: "Sneakers", description: "minimalist white leather low-top sneakers for men, gold serial number" },
      { name: "Air Jordan 1 Retro High", color: "Black/Red", brand: "Jordan", categoryName: "Sneakers", description: "Air Jordan 1 Retro High OG in bred black and red colorway" },
      { name: "New Balance 550", color: "White/Green", brand: "New Balance", categoryName: "Sneakers", description: "New Balance 550 white leather sneakers with green accents" },
      { name: "Nike Air Force 1 Low", color: "White", brand: "Nike", categoryName: "Sneakers", description: "classic all-white Nike Air Force 1 Low sneakers" },
      { name: "Chunky Dad Sneakers", color: "Gray/Cream", brand: "New Balance 990v5", categoryName: "Sneakers", description: "gray and cream New Balance 990v5 chunky running sneakers" },
      { name: "Nike Dunk Low Panda", color: "Black/White", brand: "Nike", categoryName: "Sneakers", description: "Nike Dunk Low in black and white panda colorway" },
      { name: "Adidas Samba OG", color: "Black/White", brand: "Adidas", categoryName: "Sneakers", description: "black Adidas Samba OG with white stripes and gum sole" },
      { name: "Vans Old Skool", color: "Black/White", brand: "Vans", categoryName: "Sneakers", description: "black Vans Old Skool with white stripe" },
      { name: "Nike Air Max 90", color: "White/Black", brand: "Nike", categoryName: "Sneakers", description: "Nike Air Max 90 in white with black accents" },
      { name: "Triple S Sneakers", color: "Black", brand: "Balenciaga", categoryName: "Sneakers", description: "black Balenciaga Triple S chunky platform sneakers for men" },
      { name: "ASICS Gel-Kayano 14", color: "Silver/White", brand: "ASICS", categoryName: "Sneakers", description: "silver and white ASICS Gel-Kayano 14 retro running sneakers" },
      { name: "Maison Margiela GATs", color: "White/Gum", brand: "Maison Margiela", categoryName: "Sneakers", description: "white leather Maison Margiela German Army Trainers with gum sole" },
      { name: "Nike Air Jordan 4", color: "White/Cement", brand: "Jordan", categoryName: "Sneakers", description: "Air Jordan 4 White Cement colorway sneakers" },
      { name: "Salomon XT-6", color: "Black/Phantom", brand: "Salomon", categoryName: "Sneakers", description: "black Salomon XT-6 trail running sneakers, technical style" },
      { name: "New Balance 2002R", color: "Rain Cloud", brand: "New Balance", categoryName: "Sneakers", description: "gray rain cloud New Balance 2002R retro sneakers" },
      { name: "Converse Run Star Motion", color: "Black", brand: "Converse", categoryName: "Sneakers", description: "black Converse Run Star Motion platform sneakers" },
      { name: "Yeezy 700 V3", color: "Alvah", brand: "Adidas Yeezy", categoryName: "Sneakers", description: "black Yeezy 700 V3 Alvah sneakers with cage upper" },
      
      // === BOOTS ===
      { name: "Suede Chelsea Boots", color: "Tan", brand: "Common Projects", categoryName: "Boots", description: "tan suede Chelsea boots for men with elastic side panels" },
      { name: "Black Combat Boots", color: "Black", brand: "Dr. Martens 1460", categoryName: "Boots", description: "black leather Dr. Martens 1460 combat boots for men" },
      { name: "Brown Leather Chukka Boots", color: "Brown", brand: "Clarks Desert Boot", categoryName: "Boots", description: "brown suede Clarks desert chukka boots for men" },
      { name: "Black Leather Chelsea Boots", color: "Black", brand: "Saint Laurent", categoryName: "Boots", description: "sleek black leather Chelsea boots with cuban heel for men" },
      { name: "Tan Timberland Boots", color: "Wheat", brand: "Timberland", categoryName: "Boots", description: "classic wheat nubuck Timberland 6-inch boots for men" },
      { name: "Black KISS Boots", color: "Black", brand: "Rick Owens", categoryName: "Boots", description: "black leather Rick Owens KISS boots with platform sole for men" },
      { name: "Creeper Boots", color: "Black", brand: "T.U.K.", categoryName: "Boots", description: "black leather creeper boots with thick platform sole for men" },
      { name: "Motorcycle Boots", color: "Black", brand: "Harley-Davidson", categoryName: "Boots", description: "black leather motorcycle harness boots for men" },
      
      // === LOAFERS ===
      { name: "Brown Leather Loafers", color: "Brown", brand: "G.H. Bass Weejuns", categoryName: "Loafers", description: "brown leather penny loafers for men, classic preppy style" },
      { name: "Black Bit Loafers", color: "Black", brand: "Gucci", categoryName: "Loafers", description: "black leather horsebit loafers for men" },
      { name: "Burgundy Tassel Loafers", color: "Burgundy", brand: "Alden", categoryName: "Loafers", description: "burgundy cordovan tassel loafers for men" },
      { name: "Platform Loafers", color: "Black", brand: "Prada", categoryName: "Loafers", description: "black leather platform loafers with thick sole for men" },
      
      // === HATS ===
      { name: "Black Baseball Cap", color: "Black", brand: "New Era Yankees", categoryName: "Hat", description: "black New York Yankees fitted baseball cap for men" },
      { name: "Cream Bucket Hat", color: "Cream", brand: "Stussy", categoryName: "Hat", description: "cream colored cotton bucket hat for men" },
      { name: "Navy Dad Hat", color: "Navy", brand: "Polo Ralph Lauren", categoryName: "Hat", description: "navy blue cotton dad hat with polo player logo" },
      { name: "Vintage Trucker Hat", color: "Brown/Tan", brand: "Patagonia", categoryName: "Hat", description: "brown and tan vintage mesh trucker hat for men" },
      { name: "Wide Brim Hat", color: "Black", brand: "Brixton", categoryName: "Hat", description: "black wide brim fedora hat for men, modern cowboy style" },
      
      // === BEANIES ===
      { name: "Gray Wool Beanie", color: "Gray", brand: "Acne Studios", categoryName: "Beanie", description: "gray ribbed wool beanie for men with face logo" },
      { name: "Black Carhartt Beanie", color: "Black", brand: "Carhartt", categoryName: "Beanie", description: "black Carhartt knit watch beanie for men" },
      { name: "Navy Fisherman Beanie", color: "Navy", brand: "Norse Projects", categoryName: "Beanie", description: "navy blue merino wool fisherman beanie for men" },
      { name: "Oversized Slouchy Beanie", color: "Charcoal", brand: "Rick Owens", categoryName: "Beanie", description: "charcoal gray oversized slouchy beanie for men" },
      
      // === SUNGLASSES ===
      { name: "Black Aviator Sunglasses", color: "Gold/Black", brand: "Ray-Ban", categoryName: "Sunglasses", description: "gold frame black lens aviator sunglasses for men" },
      { name: "Tortoise Wayfarer Sunglasses", color: "Tortoise", brand: "Persol", categoryName: "Sunglasses", description: "tortoise shell Persol wayfarer sunglasses for men" },
      { name: "Black Square Sunglasses", color: "Black", brand: "Tom Ford", categoryName: "Sunglasses", description: "black square frame Tom Ford sunglasses for men" },
      { name: "Shield Sunglasses", color: "Silver", brand: "Oakley", categoryName: "Sunglasses", description: "silver shield-style Oakley sport sunglasses for men" },
      { name: "Oversized Square Sunglasses", color: "Black", brand: "Saint Laurent", categoryName: "Sunglasses", description: "oversized square black Saint Laurent sunglasses for men" },
      
      // === WATCHES ===
      { name: "Silver Watch - Minimalist", color: "Silver", brand: "Daniel Wellington", categoryName: "Watch", description: "minimalist silver watch for men with white dial and black leather strap" },
      { name: "Black G-Shock Watch", color: "Black", brand: "Casio G-Shock", categoryName: "Watch", description: "black Casio G-Shock digital watch for men, rugged style" },
      { name: "Gold Rolex Day-Date", color: "Gold", brand: "Rolex", categoryName: "Watch", description: "gold Rolex Day-Date watch with champagne dial" },
      { name: "Steel Submariner", color: "Silver/Blue", brand: "Rolex", categoryName: "Watch", description: "stainless steel Rolex Submariner with blue bezel for men" },
      { name: "Digital Watch", color: "Silver", brand: "Casio A168", categoryName: "Watch", description: "silver Casio A168 retro digital watch for men" },
      
      // === CHAINS & JEWELRY ===
      { name: "Gold Cuban Link Chain", color: "Gold", brand: "The GLD Shop", categoryName: "Chain", description: "18k gold plated cuban link chain necklace for men, medium width" },
      { name: "Silver Chain Necklace", color: "Silver", brand: "Miansai", categoryName: "Chain", description: "sterling silver box chain necklace for men, minimal style" },
      { name: "Pearl Necklace", color: "White", brand: "Vivienne Westwood", categoryName: "Chain", description: "white pearl choker necklace for men with orb pendant" },
      { name: "Rope Chain Gold", color: "Gold", brand: "King Ice", categoryName: "Chain", description: "gold rope chain necklace for men, thick statement piece" },
      { name: "Cross Pendant Chain", color: "Silver", brand: "Chrome Hearts", categoryName: "Chain", description: "sterling silver cross pendant chain for men" },
      { name: "Layered Chain Set", color: "Silver", brand: "Vitaly", categoryName: "Chain", description: "layered sterling silver chain necklace set for men, 3 chains" },
      { name: "Figaro Chain", color: "Gold", brand: "Hatton Labs", categoryName: "Chain", description: "gold figaro link chain necklace for men" },
      
      // === BRACELETS ===
      { name: "Beaded Bracelet Set", color: "Earth Tones", brand: "Vitaly", categoryName: "Bracelet", description: "earth-toned beaded bracelet set for men, 3 pieces" },
      { name: "Silver Cuff Bracelet", color: "Silver", brand: "David Yurman", categoryName: "Bracelet", description: "sterling silver cable cuff bracelet for men" },
      { name: "Cuban Link Bracelet", color: "Gold", brand: "The GLD Shop", categoryName: "Bracelet", description: "gold cuban link bracelet for men, matching chain set" },
      { name: "Leather Wrap Bracelet", color: "Brown", brand: "Miansai", categoryName: "Bracelet", description: "brown leather wrap bracelet with silver hook clasp for men" },
      { name: "Tennis Bracelet", color: "Silver", brand: "Swarovski", categoryName: "Bracelet", description: "silver tennis bracelet with crystals for men" },
      
      // === RINGS ===
      { name: "Silver Signet Ring", color: "Silver", brand: "Tom Wood", categoryName: "Bracelet", description: "sterling silver signet ring for men, minimalist design" },
      { name: "Gold Band Ring", color: "Gold", brand: "Miansai", categoryName: "Bracelet", description: "14k gold simple band ring for men" },
      { name: "Black Titanium Ring", color: "Black", brand: "Vitaly", categoryName: "Bracelet", description: "black titanium band ring for men, matte finish" },
      
      // === BELTS ===
      { name: "Black Leather Belt", color: "Black", brand: "Gucci", categoryName: "Belt", description: "black leather belt for men with interlocking G buckle" },
      { name: "Brown Woven Belt", color: "Brown", brand: "Anderson's", categoryName: "Belt", description: "brown woven elastic belt for men with leather trim" },
      { name: "Black Canvas Belt", color: "Black", brand: "Off-White", categoryName: "Belt", description: "black industrial canvas belt for men with yellow logo" },
      { name: "Silver Buckle Belt", color: "Black", brand: "Chrome Hearts", categoryName: "Belt", description: "black leather belt with oversized silver cross buckle for men" },
      
      // === BAGS ===
      { name: "Canvas Tote Bag", color: "Natural", brand: "L.L.Bean", categoryName: "Bag", description: "natural canvas boat and tote bag for men with navy handles" },
      { name: "Black Crossbody Bag", color: "Black", brand: "Prada", categoryName: "Bag", description: "black nylon crossbody sling bag for men with triangle logo" },
      { name: "Leather Backpack", color: "Tan", brand: "Mismo", categoryName: "Bag", description: "tan leather minimalist backpack for men, clean lines" },
      { name: "Black Messenger Bag", color: "Black", brand: "Tumi", categoryName: "Bag", description: "black ballistic nylon messenger bag for men" },
      { name: "Mini Shoulder Bag", color: "Black", brand: "Bottega Veneta", categoryName: "Bag", description: "black woven leather mini shoulder bag for men" },
      { name: "Utility Chest Rig", color: "Black", brand: "Alyx", categoryName: "Bag", description: "black tactical utility chest rig bag for men" },
      { name: "Nylon Belt Bag", color: "Black", brand: "Arc'teryx", categoryName: "Bag", description: "black nylon belt bag fanny pack for men" },
      
      // === SCARVES ===
      { name: "Cashmere Scarf", color: "Gray", brand: "Acne Studios", categoryName: "Scarf", description: "oversized gray cashmere scarf for men with fringe" },
      { name: "Wool Scarf", color: "Camel", brand: "A.P.C.", categoryName: "Scarf", description: "camel colored wool scarf for men, classic style" },
      { name: "Bandana Scarf", color: "Red", brand: "Kapital", categoryName: "Scarf", description: "red paisley bandana scarf for men, oversized" },
    ];

    // Filter out items that already exist
    const availableItems = allClothingItems.filter(
      item => !existingNames.has(item.name.toLowerCase())
    );

    if (availableItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All available test clothing items have already been added!",
          itemCount: 0,
          totalAvailable: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shuffle and pick 15 random items from different categories
    const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
    
    // Try to get variety - pick from different category types
    const selectedItems: typeof allClothingItems = [];
    const usedCategories = new Map<string, number>();
    
    for (const item of shuffled) {
      if (selectedItems.length >= 15) break;
      
      // Prefer items from categories we haven't used much yet (max 3 per category)
      const categoryCount = usedCategories.get(item.categoryName) || 0;
      if (categoryCount < 3 || shuffled.length - selectedItems.length <= 15) {
        selectedItems.push(item);
        usedCategories.set(item.categoryName, categoryCount + 1);
      }
    }

    const createdItems = [];
    const skippedItems = [];

    // Process each item sequentially (only 3 items so no batching needed)
    for (const item of selectedItems) {
      const category = categories.find((c: any) => c.name === item.categoryName);
      if (!category) {
        console.log(`Category not found: ${item.categoryName}`);
        skippedItems.push({ name: item.name, reason: "category_not_found" });
        continue;
      }

      console.log(`Generating image for: ${item.name}`);
      const imageUrl = await generateClothingImage(item.description, LOVABLE_API_KEY);

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
        skippedItems.push({ name: item.name, reason: "insert_error" });
        continue;
      }

      createdItems.push(clothingItem);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdItems.length} new test clothing items`,
        itemCount: createdItems.length,
        remainingAvailable: availableItems.length - createdItems.length,
        items: createdItems.map(i => i.name),
        skipped: skippedItems,
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
