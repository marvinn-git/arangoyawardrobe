-- Add username to profiles (unique, required format)
ALTER TABLE public.profiles 
ADD COLUMN username text UNIQUE;

-- Add constraint for username format (min 4 chars, only letters, numbers, dots, underscores)
ALTER TABLE public.profiles 
ADD CONSTRAINT username_format CHECK (
  username IS NULL OR (
    char_length(username) >= 4 AND 
    username ~ '^[a-zA-Z0-9._]+$'
  )
);

-- Create index for username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Add is_public to clothing_items (opt-in)
ALTER TABLE public.clothing_items 
ADD COLUMN is_public boolean DEFAULT false;

-- Add is_public to outfits (opt-in)
ALTER TABLE public.outfits 
ADD COLUMN is_public boolean DEFAULT false;

-- Create inspiration_posts table for fit checks and shared content
CREATE TABLE public.inspiration_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id uuid REFERENCES public.outfits(id) ON DELETE SET NULL,
  clothing_item_id uuid REFERENCES public.clothing_items(id) ON DELETE SET NULL,
  image_url text,
  caption text,
  post_type text NOT NULL CHECK (post_type IN ('fit_check', 'outfit', 'clothing_item')),
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create likes table
CREATE TABLE public.inspiration_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.inspiration_posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS on new tables
ALTER TABLE public.inspiration_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspiration_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for inspiration_posts (public read, user write their own)
CREATE POLICY "Anyone can view inspiration posts"
ON public.inspiration_posts
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.inspiration_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.inspiration_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.inspiration_posts
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for inspiration_likes
CREATE POLICY "Anyone can view likes"
ON public.inspiration_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own likes"
ON public.inspiration_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.inspiration_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Add RLS policy for public clothing items (extend existing)
CREATE POLICY "Anyone can view public clothing items"
ON public.clothing_items
FOR SELECT
USING (is_public = true);

-- Add RLS policy for public outfits (extend existing)
CREATE POLICY "Anyone can view public outfits"
ON public.outfits
FOR SELECT
USING (is_public = true);

-- Add RLS policy for public outfit items (when outfit is public)
CREATE POLICY "Anyone can view public outfit items"
ON public.outfit_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM outfits 
  WHERE outfits.id = outfit_items.outfit_id 
  AND outfits.is_public = true
));

-- Function to increment/decrement likes count
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE inspiration_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE inspiration_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger for likes count
CREATE TRIGGER update_post_likes_count
AFTER INSERT OR DELETE ON public.inspiration_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_likes_count();

-- Trigger for updated_at on inspiration_posts
CREATE TRIGGER update_inspiration_posts_updated_at
BEFORE UPDATE ON public.inspiration_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add policy for public profiles (to show username on posts)
CREATE POLICY "Anyone can view public profile info"
ON public.profiles
FOR SELECT
USING (true);