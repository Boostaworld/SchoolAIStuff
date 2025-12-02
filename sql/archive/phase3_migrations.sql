-- ============================================
-- ORBIT OS PHASE 3 - DATABASE MIGRATIONS
-- Connectivity & Training Features
-- ============================================
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. DM CHANNELS (Direct Messaging)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dm_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT ensure_user_order CHECK (user1_id < user2_id),
  CONSTRAINT unique_dm_pair UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DM channels"
  ON public.dm_channels FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create DM channels"
  ON public.dm_channels FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE INDEX dm_channels_user1_idx ON public.dm_channels(user1_id);
CREATE INDEX dm_channels_user2_idx ON public.dm_channels(user2_id);

-- ============================================
-- 2. MESSAGES
-- ============================================
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

CREATE POLICY "Users can view messages in their channels"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_channels
      WHERE id = channel_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

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

CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_channels
      WHERE id = channel_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE INDEX messages_channel_idx ON public.messages(channel_id, created_at DESC);
CREATE INDEX messages_sender_idx ON public.messages(sender_id);

-- ============================================
-- 3. MESSAGE REACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_emoji_per_message UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX reactions_message_idx ON public.message_reactions(message_id);

-- ============================================
-- 4. TYPING CHALLENGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  text_content TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.typing_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Typing challenges are viewable by everyone"
  ON public.typing_challenges FOR SELECT
  USING (true);

-- ============================================
-- 5. TYPING SESSIONS (Performance Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.typing_challenges(id) ON DELETE CASCADE,
  wpm NUMERIC(6, 2) NOT NULL,
  accuracy NUMERIC(5, 2) NOT NULL,
  error_count INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.typing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own typing sessions"
  ON public.typing_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create typing sessions"
  ON public.typing_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX typing_sessions_user_idx ON public.typing_sessions(user_id);
CREATE INDEX typing_sessions_challenge_idx ON public.typing_sessions(challenge_id, wpm DESC);

-- ============================================
-- 6. TYPING STATS (Per-Key Heatmap Data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_stats (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  key_char CHAR(1) NOT NULL,
  error_count INTEGER DEFAULT 0,
  total_presses INTEGER DEFAULT 0,

  PRIMARY KEY (user_id, key_char)
);

ALTER TABLE public.typing_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own typing stats"
  ON public.typing_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own typing stats"
  ON public.typing_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own typing stats"
  ON public.typing_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. UPDATE PROFILES (Add Phase 3 Fields)
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS max_wpm NUMERIC(6, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orbit_points INTEGER DEFAULT 0;

-- ============================================
-- 8. ENABLE REALTIME SUBSCRIPTIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- ============================================
-- 9. CREATE STORAGE BUCKET FOR FILE ATTACHMENTS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm_attachments', 'dm_attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to their channels"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dm_attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view attachments in their channels"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dm_attachments');

-- ============================================
-- 10. SEED TYPING CHALLENGES
-- ============================================
INSERT INTO public.typing_challenges (title, text_content, difficulty) VALUES
('Quick Start', 'The quick brown fox jumps over the lazy dog near the riverbank where children play.', 'Easy'),
('Code Sprint', 'function calculateSum(arr) { return arr.reduce((a, b) => a + b, 0); }', 'Medium'),
('Theory Test', 'Quantum entanglement describes a phenomenon where particles remain connected such that the state of one instantly influences the state of another, regardless of distance.', 'Hard'),
('Database Query', 'SELECT users.name, orders.total FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE orders.status = ''completed'';', 'Medium'),
('Technical Prose', 'Asynchronous programming allows applications to perform non-blocking operations, enabling better resource utilization and improved responsiveness in modern web applications.', 'Medium'),
('Variable Names', 'const userAuthenticationService = new AuthenticationService(config); await userAuthenticationService.validateCredentials(username, password);', 'Hard');

-- ============================================
-- DONE! Phase 3 migrations complete.
-- ============================================
