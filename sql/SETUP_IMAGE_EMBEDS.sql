-- ============================================
-- Complete setup for image embeds in DMs and Intel Drops (Transmissions)
-- Run ALL of these in your Supabase SQL editor
-- ============================================

-- 1. Make DM attachments bucket PUBLIC
UPDATE storage.buckets
SET public = true
WHERE id = 'dm_attachments';

-- 2. Add attachment columns to intel_drops table
ALTER TABLE public.intel_drops
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 3. Create intel_attachments storage bucket (PUBLIC)
INSERT INTO storage.buckets (id, name, public)
VALUES ('intel_attachments', 'intel_attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Storage policies for intel attachments
DROP POLICY IF EXISTS "Users can upload intel attachments" ON storage.objects;
CREATE POLICY "Users can upload intel attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'intel_attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can view intel attachments" ON storage.objects;
CREATE POLICY "Anyone can view intel attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'intel_attachments');

-- ============================================
-- VERIFICATION QUERIES (run these to check)
-- ============================================

-- Check buckets are public
SELECT id, name, public FROM storage.buckets
WHERE id IN ('dm_attachments', 'intel_attachments');

-- Check intel_drops columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'intel_drops'
AND column_name IN ('attachment_url', 'attachment_type');
