-- Make clothing-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'clothing-images';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view clothing images" ON storage.objects;

-- Create a new SELECT policy that restricts access to authenticated users viewing their own images
CREATE POLICY "Users can view their own clothing images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'clothing-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );