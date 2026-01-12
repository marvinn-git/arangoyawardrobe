-- Remove the overly permissive policy that exposes all profile data
-- The public_profiles view already has proper GRANT permissions for public access
-- Users can still access their own full profile via the "Users can view their own profile" policy

DROP POLICY IF EXISTS "Anyone can view public profile fields via view" ON public.profiles;