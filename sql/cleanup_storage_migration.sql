-- ============================================
-- STEP 2: CLEANUP - DROP OLD IMAGE COLUMN
-- ============================================
-- Run this AFTER verifying all images are migrated to Supabase Storage
-- This will free up significant database space
-- ============================================

-- Double check verification before dropping:
-- Ensure no images have null storage_url but present image_url
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM generated_images 
        WHERE storage_url IS NULL AND image_url IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Aborting cleanup: Found images that have NOT been migrated yet!';
    END IF;
END $$;

-- 1. Drop the old base64 column
ALTER TABLE generated_images DROP COLUMN IF EXISTS image_url;

-- 2. Drop the temporary index if it exists
DROP INDEX IF EXISTS idx_generated_images_storage_url;

-- 3. Reclaim physical storage space
-- NOTE: VACUUM cannot run inside a transaction block (which Supabase SQL Editor uses).
-- Please run the following command SEPARATELY in a new query window:
-- VACUUM FULL generated_images;
