-- ============================================
-- GET ALL DATA SCRIPT
-- ============================================
-- This script retrieves all data from the Orbit database tables.
-- Run this in your Supabase SQL Editor.

-- 1. PROFILES
SELECT 'PROFILES' as table_name;
SELECT * FROM public.profiles;

-- 2. TASKS
SELECT 'TASKS' as table_name;
SELECT * FROM public.tasks;

-- 3. INTEL DROPS
SELECT 'INTEL_DROPS' as table_name;
SELECT * FROM public.intel_drops;

-- 4. STORAGE BUCKETS
SELECT 'STORAGE_BUCKETS' as table_name;
SELECT * FROM storage.buckets;

-- 5. STORAGE OBJECTS (Files)
SELECT 'STORAGE_OBJECTS' as table_name;
SELECT * FROM storage.objects;
