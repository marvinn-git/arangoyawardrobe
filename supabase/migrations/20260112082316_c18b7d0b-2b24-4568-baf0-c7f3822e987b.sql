-- Add body measurement columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS chest_cm numeric,
ADD COLUMN IF NOT EXISTS waist_cm numeric,
ADD COLUMN IF NOT EXISTS hips_cm numeric,
ADD COLUMN IF NOT EXISTS shoulder_width_cm numeric,
ADD COLUMN IF NOT EXISTS inseam_cm numeric,
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'warm-neutral',
ADD COLUMN IF NOT EXISTS username_last_changed timestamp with time zone;

-- Add comment for context
COMMENT ON COLUMN public.profiles.theme IS 'User selected theme: warm-neutral, ocean-breeze, forest-moss, midnight-purple';
COMMENT ON COLUMN public.profiles.username_last_changed IS 'Last time username was changed, for 30-day restriction';