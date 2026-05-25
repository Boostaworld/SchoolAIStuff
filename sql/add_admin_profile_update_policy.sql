-- ============================================
-- FIX: Admin Update Permissions on Profiles
-- ============================================
-- Run this in Supabase SQL Editor
--
-- Issue: Admin updates in God Mode are blocked because the existing RLS only
-- allows a user to update their own profile (auth.uid() = id). Admin users
-- need an override to update any profile.
--
-- Solution: Recreate the update policy to allow owners OR admins to update.
-- This ensures admin edits from God Mode persist while keeping owner-only
-- restrictions for normal users.

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up old policies to avoid duplicates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.profiles;

-- Create combined policy: owners or admins can update any profile
CREATE POLICY "Users can update own profile or admins can update any"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  );

-- Verify the policy is active
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
  AND cmd = 'UPDATE';
