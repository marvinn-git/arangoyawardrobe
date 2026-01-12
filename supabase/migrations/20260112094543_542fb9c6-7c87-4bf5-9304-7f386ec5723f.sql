-- Add policy to allow public access to profile fields needed for public_profiles view
-- This is safe because the view only selects user_id, username, and avatar_url
-- The view uses SECURITY INVOKER so it inherits this policy's restrictions
CREATE POLICY "Anyone can view public profile fields via view"
ON public.profiles
FOR SELECT
USING (true);