-- ============================================
-- STEP 1: IMAGE STORAGE MIGRATION
-- ============================================
-- Run this FIRST in Supabase SQL Editor
-- This sets up the storage bucket and schema changes
-- ============================================

-- ============================================
-- 1A: ADD storage_url COLUMN TO DATABASE
-- ============================================
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS storage_url TEXT;

-- Index for finding migrated vs non-migrated images
CREATE INDEX IF NOT EXISTS idx_generated_images_storage_url 
ON generated_images(storage_url) WHERE storage_url IS NOT NULL;

-- ============================================
-- 1B: CREATE STORAGE BUCKET
-- ============================================
-- Create the public storage bucket for generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images', 
  'generated-images', 
  true,  -- Public bucket so images can be viewed via URL
  52428800,  -- 50MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 1C: STORAGE RLS POLICIES
-- ============================================

-- Policy: Users can upload their own images (folder = user_id)
CREATE POLICY "Users can upload generated images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view images (public bucket)
CREATE POLICY "Public read access for generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

-- Policy: Users can update their own images
CREATE POLICY "Users can update their generated images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their generated images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- VERIFICATION: Check setup was successful
-- ============================================
-- Run these to verify:

-- Check bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'generated-images';

-- Check column was added:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'generated_images' AND column_name = 'storage_url';

-- Check how many images need migration:
-- SELECT 
--   COUNT(*) FILTER (WHERE storage_url IS NULL AND image_url IS NOT NULL) as needs_migration,
--   COUNT(*) FILTER (WHERE storage_url IS NOT NULL) as already_migrated,
--   COUNT(*) as total
-- FROM generated_images;
