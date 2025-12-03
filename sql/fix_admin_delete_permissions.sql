-- ============================================
-- FIX: Admin Delete Permissions
-- ============================================
-- Run this in Supabase SQL Editor
-- This fixes: Admins unable to delete tasks/intel_drops
--
-- ISSUE: RLS policies only allow users to delete their own items
-- SOLUTION: Add admin override to DELETE policies

-- =========================
-- 1. FIX TASKS DELETE POLICY
-- =========================
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;

-- Recreate with admin support
CREATE POLICY "Users can delete own tasks or admins can delete any"
  ON public.tasks FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =========================
-- 2. FIX PROFILES DELETE POLICY (Admin User Deletion)
-- =========================
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;

-- Recreate with admin support
CREATE POLICY "Users can delete own profile or admins can delete any"
  ON public.profiles FOR DELETE
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =========================
-- 3. FIX INTEL_DROPS DELETE POLICY
-- =========================
DROP POLICY IF EXISTS "Users can delete own intel drops" ON public.intel_drops;
DROP POLICY IF EXISTS "Admins can delete any intel drop" ON public.intel_drops;

-- Recreate with admin support
CREATE POLICY "Users can delete own intel drops or admins can delete any"
  ON public.intel_drops FOR DELETE
  USING (
    auth.uid() = author_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =========================
-- 4. VERIFY POLICIES
-- =========================
-- Run this to verify the policies are active:
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('tasks', 'intel_drops', 'profiles')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- =========================
-- DONE!
-- =========================
-- After running this, admins should be able to delete:
--   1. Any task (including other users' tasks)
--   2. Any intel drop (including other users' transmissions)
--   3. Any user profile (user management)
