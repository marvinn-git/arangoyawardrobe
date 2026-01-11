-- Fix the SECURITY DEFINER view issue by recreating as SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = on)
AS
SELECT 
  user_id,
  username,
  avatar_url
FROM public.profiles;

-- Re-grant read access
GRANT SELECT ON public.public_profiles TO anon, authenticated;