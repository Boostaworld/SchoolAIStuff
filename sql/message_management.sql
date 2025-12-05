-- ================================================
-- Message Management Features: Schema Migration
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Add message editing/deletion columns
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Add read receipts toggle to channels
ALTER TABLE public.dm_channels
  ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN DEFAULT true;

-- 3. User-side chat hiding (doesn't delete for other person)
CREATE TABLE IF NOT EXISTS public.user_hidden_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES public.dm_channels(id) ON DELETE CASCADE NOT NULL,
  hidden_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- 4. Enable RLS on user_hidden_channels
ALTER TABLE public.user_hidden_channels ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for hidden channels
DROP POLICY IF EXISTS "Users can view own hidden channels" ON public.user_hidden_channels;
CREATE POLICY "Users can view own hidden channels"
  ON public.user_hidden_channels FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can hide channels" ON public.user_hidden_channels;
CREATE POLICY "Users can hide channels"
  ON public.user_hidden_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unhide channels" ON public.user_hidden_channels;
CREATE POLICY "Users can unhide channels"
  ON public.user_hidden_channels FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON public.messages(edited_at);
CREATE INDEX IF NOT EXISTS idx_hidden_channels_user ON public.user_hidden_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_channels_lookup ON public.user_hidden_channels(user_id, channel_id);

-- 7. Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_hidden_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_hidden_channels;
  END IF;
END $$;

-- Verification queries
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('edited_at', 'deleted_at');

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'dm_channels' 
  AND column_name = 'read_receipts_enabled';

SELECT 
  table_name,
  COUNT(*) as row_count
FROM information_schema.tables
WHERE table_name = 'user_hidden_channels'
  AND table_schema = 'public'
GROUP BY table_name;
