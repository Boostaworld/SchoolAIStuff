-- ============================================
-- DM Comms: tables, RLS, realtime, storage
-- Run in Supabase SQL editor
-- ============================================

-- 1) DM Channels
CREATE TABLE IF NOT EXISTS public.dm_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT ensure_user_order CHECK (user1_id < user2_id),
  CONSTRAINT unique_dm_pair UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own DM channels" ON public.dm_channels;
CREATE POLICY "Users can view own DM channels"
  ON public.dm_channels FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create DM channels" ON public.dm_channels;
CREATE POLICY "Users can create DM channels"
  ON public.dm_channels FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE INDEX IF NOT EXISTS dm_channels_user1_idx ON public.dm_channels(user1_id);
CREATE INDEX IF NOT EXISTS dm_channels_user2_idx ON public.dm_channels(user2_id);

-- 2) Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES public.dm_channels(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.messages;
CREATE POLICY "Users can view messages in their channels"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_channels
      WHERE id = channel_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their channels" ON public.messages;
CREATE POLICY "Users can send messages in their channels"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.dm_channels
      WHERE id = channel_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_channels
      WHERE id = channel_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS messages_channel_idx ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender_id);

-- 3) Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_emoji_per_message UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions in their channels" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their channels"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.dm_channels c ON m.channel_id = c.id
      WHERE m.id = message_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.message_reactions;
CREATE POLICY "Users can delete own reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reactions_message_idx ON public.message_reactions(message_id);

-- 4) Realtime publications (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'dm_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_channels;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;

-- 5) Storage bucket for DM attachments (PUBLIC for image embeds)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm_attachments', 'dm_attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Users can upload files under their own user folder
DROP POLICY IF EXISTS "Users can upload to their channels" ON storage.objects;
CREATE POLICY "Users can upload to their channels"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dm_attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view attachments (bucket is private by default; RLS required)
DROP POLICY IF EXISTS "Users can view attachments in their channels" ON storage.objects;
CREATE POLICY "Users can view attachments in their channels"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dm_attachments');
