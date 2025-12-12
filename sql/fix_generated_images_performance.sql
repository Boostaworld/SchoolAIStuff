-- ============================================
-- FIX: generated_images Performance Optimization
-- ============================================
-- This migration adds critical indexes and recommendations to fix
-- statement timeout errors on the generated_images table.
--
-- Root Cause: The table stores full base64 image data (1-5MB per image)
-- and SELECT * queries on 100+ images was timing out.
--
-- Code Fix Applied: Updated lib/imageStorage.ts to:
--   1. Select only metadata columns for gallery listing
--   2. Load actual image data on-demand per image
--   3. Use IntersectionObserver for lazy loading
-- ============================================

-- STEP 1: Add composite index for the most common query pattern
-- This optimizes: SELECT ... FROM generated_images WHERE user_id = X ORDER BY created_at DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created 
ON generated_images(user_id, created_at DESC);

-- STEP 2: Add index for folder filtering (also common)
CREATE INDEX IF NOT EXISTS idx_generated_images_user_folder_created 
ON generated_images(user_id, folder_id, created_at DESC);

-- STEP 3: Analyze the table to update query planner statistics
ANALYZE generated_images;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check table size and row count
SELECT 
  pg_size_pretty(pg_table_size('generated_images')) as table_size,
  pg_size_pretty(pg_indexes_size('generated_images')) as indexes_size,
  n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE relname = 'generated_images';

-- Check if image_url column is bloating the table
SELECT 
  pg_size_pretty(AVG(LENGTH(image_url))) as avg_image_size,
  pg_size_pretty(MAX(LENGTH(image_url))) as max_image_size,
  pg_size_pretty(SUM(LENGTH(image_url))) as total_image_data
FROM generated_images;

-- Check index usage
SELECT 
  indexrelname,
  idx_scan as times_used,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE relname = 'generated_images';

-- ============================================
-- FUTURE OPTIMIZATION: Move images to Storage
-- ============================================
-- Currently images are stored as base64 TEXT in the database.
-- For better performance, consider:
-- 1. Store images in Supabase Storage bucket
-- 2. Store only the URL in the database
-- 3. This would reduce table size by ~99%
--
-- Migration steps would be:
-- 1. Create a storage bucket 'generated-images'
-- 2. Write a migration script to:
--    a. For each image, upload base64 to storage
--    b. Update row with storage URL
-- 3. After verification, drop or truncate image_url column
