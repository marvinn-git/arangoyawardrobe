import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fake user profiles for inspiration content
const fakeUsers = [
  { name: "StyleKing", username: "styleking_official" },
  { name: "Fashion Forward", username: "fashionforward" },
  { name: "Urban Vibes", username: "urban_vibes_23" },
  { name: "Street Style", username: "street.style.daily" },
  { name: "Drip Check", username: "drip_check" },
  { name: "Fit Enthusiast", username: "fit.enthusiast" },
  { name: "Vintage Soul", username: "vintage_soul_fits" },
  { name: "Modern Classic", username: "modern.classic" },
];

// Sample captions in EN/ES
const captions = [
  "Today's fit 🔥",
  "Casual Friday vibes",
  "New pickup, had to share",
  "Outfit of the day",
  "Keeping it simple",
  "Layering season is here",
  "Street ready",
  "Clean fit for the weekend",
  "Mi outfit favorito 💯",
  "Estilo urbano",
  "Look del día",
  "Vibes de verano",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const createdUsers: { id: string; username: string }[] = [];
    const createdPosts: string[] = [];

    // Create fake users
    for (const fakeUser of fakeUsers) {
      // Create auth user
      const email = `${fakeUser.username}@fakeinspiration.local`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: `FakeUser123!${Date.now()}`,
        email_confirm: true,
        user_metadata: { name: fakeUser.name },
      });

      if (authError) {
        console.log(`User ${fakeUser.username} might already exist:`, authError.message);
        // Try to find existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === email);
        if (existing) {
          // Update profile with username
          await supabase
            .from("profiles")
            .update({ username: fakeUser.username, name: fakeUser.name })
            .eq("user_id", existing.id);
          createdUsers.push({ id: existing.id, username: fakeUser.username });
        }
        continue;
      }

      if (authData.user) {
        // Update profile with username
        await supabase
          .from("profiles")
          .update({ username: fakeUser.username, name: fakeUser.name })
          .eq("user_id", authData.user.id);
        
        createdUsers.push({ id: authData.user.id, username: fakeUser.username });
      }
    }

    // For each fake user, create some inspiration posts
    for (const user of createdUsers) {
      const numPosts = Math.floor(Math.random() * 3) + 2; // 2-4 posts per user

      for (let i = 0; i < numPosts; i++) {
        const postType = ["fit_check", "outfit", "clothing_item"][Math.floor(Math.random() * 3)] as string;
        const caption = captions[Math.floor(Math.random() * captions.length)];
        const baseLikes = Math.floor(Math.random() * 150) + 10;

        // Create the post
        const { data: postData, error: postError } = await supabase
          .from("inspiration_posts")
          .insert({
            user_id: user.id,
            post_type: postType,
            caption,
            likes_count: baseLikes,
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last week
          })
          .select()
          .single();

        if (postError) {
          console.error("Error creating post:", postError);
          continue;
        }

        if (postData) {
          createdPosts.push(postData.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdUsers.length} users and ${createdPosts.length} posts`,
        users: createdUsers.map(u => u.username),
        postsCount: createdPosts.length,
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