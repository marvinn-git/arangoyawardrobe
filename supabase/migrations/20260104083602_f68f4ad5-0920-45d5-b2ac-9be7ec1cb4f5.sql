-- Add is_favorite column to clothing_items
ALTER TABLE public.clothing_items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add is_top and is_bottom to categories for outfit validation
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_top BOOLEAN DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_bottom BOOLEAN DEFAULT false;

-- Create brands table for reusable brands
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Brands policies
CREATE POLICY "Users can view their own brands" ON public.brands
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own brands" ON public.brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own brands" ON public.brands
  FOR DELETE USING (auth.uid() = user_id);

-- Create style_tags table for predefined style preferences
CREATE TABLE IF NOT EXISTS public.style_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_es TEXT
);

-- Create user_style_tags junction table
CREATE TABLE IF NOT EXISTS public.user_style_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_tag_id UUID NOT NULL REFERENCES public.style_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, style_tag_id)
);

-- Enable RLS
ALTER TABLE public.user_style_tags ENABLE ROW LEVEL SECURITY;

-- User style tags policies
CREATE POLICY "Users can view their own style tags" ON public.user_style_tags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own style tags" ON public.user_style_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own style tags" ON public.user_style_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Style tags are public for all to read
CREATE POLICY "Anyone can view style tags" ON public.style_tags
  FOR SELECT USING (true);

-- Insert predefined style tags
INSERT INTO public.style_tags (name, name_es) VALUES
  ('Casual', 'Casual'),
  ('Elegant', 'Elegante'),
  ('Minimalist', 'Minimalista'),
  ('Streetwear', 'Streetwear'),
  ('Bohemian', 'Bohemio'),
  ('Sporty', 'Deportivo'),
  ('Classic', 'Clásico'),
  ('Romantic', 'Romántico'),
  ('Edgy', 'Atrevido'),
  ('Preppy', 'Preppy'),
  ('Vintage', 'Vintage'),
  ('Modern', 'Moderno'),
  ('Chic', 'Chic'),
  ('Urban', 'Urbano'),
  ('Relaxed', 'Relajado')
ON CONFLICT (name) DO NOTHING;