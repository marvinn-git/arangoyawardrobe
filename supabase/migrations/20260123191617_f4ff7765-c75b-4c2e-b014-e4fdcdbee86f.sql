-- Add dark_mode column to profiles table for dark mode preference
ALTER TABLE public.profiles 
ADD COLUMN dark_mode BOOLEAN DEFAULT false;