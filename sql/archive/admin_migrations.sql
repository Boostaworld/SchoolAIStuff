-- ============================================
-- ADMIN DELETION PROTOCOL
-- ============================================
-- Run this migration in your Supabase SQL Editor
-- This adds admin capabilities for content moderation
-- ============================================

-- ============================================
-- 1. ADD ADMIN FLAG TO PROFILES
-- ============================================

-- Add is_admin column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ============================================
-- 2. UPDATE RLS POLICIES FOR ADMIN DELETION
-- ============================================

-- DROP existing delete policies for tasks
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- CREATE new delete policy for tasks (own tasks OR admin)
CREATE POLICY "Users can delete own tasks or admins can delete any"
  ON public.tasks FOR DELETE
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- DROP existing delete policies for intel_drops
DROP POLICY IF EXISTS "Users can delete own intel drops" ON public.intel_drops;

-- CREATE new delete policy for intel_drops (own drops OR admin)
CREATE POLICY "Users can delete own intel drops or admins can delete any"
  ON public.intel_drops FOR DELETE
  USING (
    auth.uid() = author_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 3. SET FIRST ADMIN (Site Owner: Hay)
-- ============================================

-- Set admin flag for user with email 'huttben7@gmail.com'
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'huttben7@gmail.com'
);

-- ============================================
-- DONE!
-- ============================================
-- Admin deletion protocol is now active.
-- User 'huttben7@gmail.com' (Hay) is now an admin.
-- Admins can delete any task or intel drop.
-- ============================================
