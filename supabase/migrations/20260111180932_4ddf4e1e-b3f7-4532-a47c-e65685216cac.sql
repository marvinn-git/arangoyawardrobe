-- Fix: PUBLIC_DATA_EXPOSURE - Create a public_profiles view with only non-sensitive fields
-- Drop the overly permissive policy that exposes ALL profile data
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;

-- Create a view that only exposes non-sensitive public profile data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  username,
  avatar_url
FROM public.profiles;

-- Grant read access to the view for authenticated and anonymous users
GRANT SELECT ON public.public_profiles TO anon, authenticated;