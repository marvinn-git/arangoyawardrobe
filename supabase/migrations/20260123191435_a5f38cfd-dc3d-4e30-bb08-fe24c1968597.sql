-- Add background_style column to profiles table for background customization
ALTER TABLE public.profiles 
ADD COLUMN background_style TEXT DEFAULT 'default';