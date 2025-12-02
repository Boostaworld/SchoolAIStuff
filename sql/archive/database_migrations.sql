-- ============================================
-- ORBIT DATABASE MIGRATIONS
-- ============================================
-- Run these migrations in your Supabase SQL Editor
-- This file contains schema changes for the new Intel,
-- Operative Search, and Identity features
-- ============================================

-- ============================================
-- 1. REMOVE SQUAD SYSTEM
-- ============================================

-- Drop squad_id column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS squad_id;

-- ============================================
-- 2. CREATE INTEL DROPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.intel_drops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  summary_bullets TEXT[] NOT NULL,
  sources JSONB NOT NULL,
  related_concepts TEXT[] NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.intel_drops ENABLE ROW LEVEL SECURITY;

-- Public drops viewable by everyone, private only by author
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Public intel drops are viewable by everyone'
    ) THEN
        CREATE POLICY "Public intel drops are viewable by everyone"
          ON public.intel_drops FOR SELECT
          USING (is_private = false OR auth.uid() = author_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Users can create own intel drops'
    ) THEN
        CREATE POLICY "Users can create own intel drops"
          ON public.intel_drops FOR INSERT
          WITH CHECK (auth.uid() = author_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Users can update own intel drops'
    ) THEN
        CREATE POLICY "Users can update own intel drops"
          ON public.intel_drops FOR UPDATE
          USING (auth.uid() = author_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Users can delete own intel drops'
    ) THEN
        CREATE POLICY "Users can delete own intel drops"
          ON public.intel_drops FOR DELETE
          USING (auth.uid() = author_id);
    END IF;
END
$$;

-- Enable Realtime for intel drops
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'intel_drops'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.intel_drops;
  END IF;
END
$$;

-- ============================================
-- 3. ADD PROFILE FIELDS
-- ============================================

-- Add bio field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Add intel instructions field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intel_instructions TEXT DEFAULT '';

-- ============================================
-- 4. CREATE AVATAR STORAGE BUCKET
-- ============================================

-- Create avatars bucket (public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow everyone to view avatars
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Avatar images are publicly accessible'
    ) THEN
        CREATE POLICY "Avatar images are publicly accessible"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'avatars');
    END IF;
END
$$;

-- Users can upload to their own folder
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload their own avatar'
    ) THEN
        CREATE POLICY "Users can upload their own avatar"
          ON storage.objects FOR INSERT
          WITH CHECK (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
          );
    END IF;
END
$$;

-- Users can update their own avatars
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update own avatar'
    ) THEN
        CREATE POLICY "Users can update own avatar"
          ON storage.objects FOR UPDATE
          USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
          );
    END IF;
END
$$;

-- Users can delete their own avatars
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own avatar'
    ) THEN
        CREATE POLICY "Users can delete own avatar"
          ON storage.objects FOR DELETE
          USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
          );
    END IF;
END
$$;

-- ============================================
-- DONE!
-- ============================================
-- Migrations complete. Your Orbit database now supports:
-- - Intel Drops (research sharing with privacy)
-- - User profiles with bio and custom Intel instructions
-- - Avatar uploads via Supabase Storage
-- - No more squad system (global collaboration model)
-- ============================================
