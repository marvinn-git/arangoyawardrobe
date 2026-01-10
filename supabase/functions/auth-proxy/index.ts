// Supabase Edge Function: auth-proxy
// Purpose: Proxy auth calls through a same-project function to avoid browser-side CORS/network flakiness.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  action: "signIn" | "signUp";
  email?: string;
  password?: string;
  name?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body?.action) return json({ error: "Missing action" }, 400);

    const email = (body.email ?? "").trim();
    const password = body.password ?? "";

    if (!email || !password) return json({ error: "Missing email or password" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const origin = req.headers.get("origin") || "";
    const emailRedirectTo = origin ? `${origin}/` : undefined;

    if (body.action === "signIn") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return json({ error: error.message }, 400);
      return json({ session: data.session, user: data.user });
    }

    if (body.action === "signUp") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { name: (body.name ?? "").trim() || null },
        },
      });

      if (error) return json({ error: error.message }, 400);
      return json({ session: data.session, user: data.user });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (_err) {
    return json({ error: "Request failed" }, 500);
  }
});
