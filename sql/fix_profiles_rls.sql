-- ============================================
-- FIX: Profiles RLS Policy
-- ============================================
-- Run this in Supabase SQL Editor
-- This fixes:
--   1. "Failed to load profile" error (even after fixing table name)
--   2. Blank author info in Horde Feed and Modals

-- Enable RLS (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policy if it exists (to replace it or add to it)
-- We want to ensure anyone can view profiles (needed for feed, leaderboards, etc.)

DO $$
BEGIN
  -- Check if "Users can view own profile" exists and drop it if we want to replace it with a broader one
  -- OR we can just add a new policy "Anyone can view profiles"
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Anyone can view profiles'
  ) THEN
    CREATE POLICY "Anyone can view profiles" ON public.profiles
      FOR SELECT USING (true);
  END IF;

END $$;

-- Verify:
-- After running this, the Horde Feed should show author names/avatars,
-- and clicking a profile should load the data correctly.
