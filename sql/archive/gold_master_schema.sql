-- ============================================
-- ORBIT OS - GOLD MASTER DATABASE SCHEMA
-- Complete Consolidated Migration
-- ============================================
-- Run this entire script in your Supabase SQL Editor
-- This creates ALL tables needed for the full Orbit OS experience
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SECTION 1: CORE TABLES (Base + Phase 3)
-- ============================================

-- 1.1 PROFILES TABLE (Enhanced with Gold Master fields)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  
  -- Core stats
  tasks_completed INTEGER DEFAULT 0,
  tasks_forfeited INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Online',
  bio TEXT DEFAULT '',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Phase 3 fields
  max_wpm NUMERIC(6, 2) DEFAULT 0,
  orbit_points INTEGER DEFAULT 0,
  intel_instructions TEXT DEFAULT '',
  
  -- Gold Master fields
  current_theme_id UUID,
  unlocked_models TEXT[] DEFAULT ARRAY['gemini-2.0-flash-thinking-exp-01-21'],
  can_customize_ai BOOLEAN DEFAULT false,
  ai_depth_limit INTEGER DEFAULT 5,
  last_passive_claim TIMESTAMP WITH TIME ZONE,
  active_session_start TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles (with conflict handling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.profiles FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- 1.2 TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Grind',
  difficulty TEXT DEFAULT 'Medium',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can view own tasks') THEN
    CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can insert own tasks') THEN
    CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can update own tasks') THEN
    CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Admin deletion policy (drop old version first)
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks or admins can delete any" ON public.tasks;

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

-- 1.3 INTEL DROPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.intel_drops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  summary_bullets TEXT[] NOT NULL,
  sources JSONB NOT NULL,
  related_concepts TEXT[] NOT NULL,
  essay TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.intel_drops ENABLE ROW LEVEL SECURITY;

-- Drop old policies first
DROP POLICY IF EXISTS "Public intel drops are viewable by everyone" ON public.intel_drops;
DROP POLICY IF EXISTS "Users can create own intel drops" ON public.intel_drops;
DROP POLICY IF EXISTS "Users can delete own intel drops" ON public.intel_drops;
DROP POLICY IF EXISTS "Users can delete own intel drops or admins can delete any" ON public.intel_drops;

CREATE POLICY "Public intel drops are viewable by everyone"
  ON public.intel_drops FOR SELECT
  USING (is_private = false OR auth.uid() = author_id);

CREATE POLICY "Users can create own intel drops"
  ON public.intel_drops FOR INSERT
  WITH CHECK (auth.uid() = author_id);

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
-- SECTION 2: SOCIAL & MESSAGING
-- ============================================

-- 2.1 DM CHANNELS
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

DROP POLICY IF EXISTS "Users can view own DM channels" ON public.dm_channels;
DROP POLICY IF EXISTS "Users can create DM channels" ON public.dm_channels;

CREATE POLICY "Users can view own DM channels"
  ON public.dm_channels FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create DM channels"
  ON public.dm_channels FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);


CREATE INDEX dm_channels_user1_idx ON public.dm_channels(user1_id);
CREATE INDEX dm_channels_user2_idx ON public.dm_channels(user2_id);

-- 2.2 MESSAGES
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

DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their channels" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;

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


CREATE INDEX messages_channel_idx ON public.messages(channel_id, created_at DESC);

-- 2.3 MESSAGE REACTIONS
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

DROP POLICY IF EXISTS "Users can view reactions in their channels" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.message_reactions;

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
-- SECTION 3: TYPING SYSTEM
-- ============================================

-- 3.1 TYPING CHALLENGES (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  text_content TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
  
  -- Enhanced fields
  category TEXT DEFAULT 'Standard',
  length_type TEXT CHECK (length_type IN ('Sprint', 'Medium', 'Marathon')) DEFAULT 'Medium',
  is_custom BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_count INTEGER,
  char_count INTEGER,
  
  -- Adaptive difficulty fields
  min_wpm INTEGER DEFAULT 0, -- Minimum WPM to show this challenge
  max_wpm INTEGER, -- Maximum WPM (null = no limit)
  ai_difficulty_score NUMERIC(3, 2), -- AI-analyzed difficulty (0.00-1.00)
  complexity_factors JSONB, -- {uncommon_words: 5, special_chars: 12, avg_word_length: 6.2}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.typing_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Typing challenges are viewable by everyone"
  ON public.typing_challenges FOR SELECT
  USING (true);

CREATE POLICY "Users can create custom challenges"
  ON public.typing_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX typing_challenges_category_idx ON public.typing_challenges(category, difficulty);
CREATE INDEX typing_challenges_user_idx ON public.typing_challenges(user_id);

-- 3.2 TYPING SESSIONS
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

CREATE INDEX typing_sessions_user_idx ON public.typing_sessions(user_id, completed_at DESC);

-- 3.3 TYPING STATS (Heatmap)
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

-- 3.4 TYPING HISTORY (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.typing_challenges(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.typing_sessions(id) ON DELETE CASCADE,

  -- Performance metrics
  wpm NUMERIC(6, 2) NOT NULL,
  accuracy NUMERIC(5, 2) NOT NULL,
  error_count INTEGER DEFAULT 0,
  time_elapsed INTEGER, -- seconds

  -- Challenge snapshot
  challenge_text TEXT,
  challenge_title TEXT,

  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.typing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own typing history"
  ON public.typing_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own typing history"
  ON public.typing_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX typing_history_user_idx ON public.typing_history(user_id, completed_at DESC);

-- 3.5 RACE REPLAYS (Anti-Bloat)
-- ============================================
CREATE TABLE IF NOT EXISTS public.race_replays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  typing_history_id UUID REFERENCES public.typing_history(id) ON DELETE CASCADE,
  replay_data JSONB NOT NULL,
  is_personal_best BOOLEAN DEFAULT false,
  is_race BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.race_replays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own race replays"
  ON public.race_replays FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX race_replays_user_pb_idx ON public.race_replays(user_id, is_personal_best);

-- 3.6 TYPING RACES
-- ============================================
CREATE TABLE IF NOT EXISTS public.typing_races (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id UUID REFERENCES public.typing_challenges(id) ON DELETE CASCADE NOT NULL,
  host_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  bot_count INTEGER DEFAULT 3,
  bot_wpm_ranges INTEGER[],

  status TEXT CHECK (status IN ('waiting', 'in_progress', 'completed')) DEFAULT 'waiting',
  started_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.typing_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view races"
  ON public.typing_races FOR SELECT
  USING (true);

CREATE POLICY "Users can create races"
  ON public.typing_races FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

-- 3.7 RACE PARTICIPANTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.race_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  race_id UUID REFERENCES public.typing_races(id) ON DELETE CASCADE NOT NULL,

  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_bot BOOLEAN DEFAULT false,
  bot_name TEXT,
  bot_target_wpm INTEGER,

  position INTEGER,
  final_wpm NUMERIC(6, 2),
  final_accuracy NUMERIC(5, 2),
  completion_time INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.race_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view race participants"
  ON public.race_participants FOR SELECT
  USING (true);

CREATE INDEX race_participants_race_idx ON public.race_participants(race_id);

-- 3.8 AI CHALLENGE GENERATION QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenge_generation_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  length_type TEXT NOT NULL,
  custom_prompt TEXT,

  status TEXT CHECK (status IN ('pending', 'generating', 'completed', 'failed')) DEFAULT 'pending',
  generated_challenge_id UUID REFERENCES public.typing_challenges(id) ON DELETE SET NULL,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.challenge_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation queue"
  ON public.challenge_generation_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert generation requests"
  ON public.challenge_generation_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX generation_queue_user_status_idx ON public.challenge_generation_queue(user_id, status);

-- ============================================
-- SECTION 4: ECONOMY SYSTEM
-- ============================================

-- 4.1 SHOP ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT CHECK (item_type IN ('theme', 'border', 'cursor', 'avatar', 'ai_model')) NOT NULL,
  price INTEGER NOT NULL,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  preview_url TEXT,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shop items"
  ON public.shop_items FOR SELECT
  USING (is_active = true);

CREATE INDEX shop_items_type_idx ON public.shop_items(item_type, is_active);

-- 4.2 USER INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.shop_items(id) ON DELETE CASCADE NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  equipped BOOLEAN DEFAULT false,
  slot TEXT,
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
  ON public.user_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX user_inventory_user_idx ON public.user_inventory(user_id, equipped);

-- 4.3 VAULT FILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.vault_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  course_tag TEXT,
  teacher_name TEXT,
  unlock_cost INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vault files"
  ON public.vault_files FOR SELECT
  USING (true);

CREATE POLICY "Users can upload vault files"
  ON public.vault_files FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

CREATE INDEX vault_files_course_idx ON public.vault_files(course_tag);
CREATE INDEX vault_files_uploader_idx ON public.vault_files(uploader_id);

-- 4.4 VAULT ACCESS
-- ============================================
CREATE TABLE IF NOT EXISTS public.vault_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.vault_files(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);

ALTER TABLE public.vault_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault access"
  ON public.vault_access FOR SELECT
  USING (auth.uid() = user_id);

-- 4.5 CONTRACTS / BOUNTIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  bounty_value INTEGER NOT NULL,
  requirements JSONB,
  status TEXT CHECK (status IN ('open', 'claimed', 'completed', 'expired')) DEFAULT 'open',
  claimant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant contracts"
  ON public.contracts FOR SELECT
  USING (status = 'open' OR creator_id = auth.uid() OR claimant_id = auth.uid());

CREATE INDEX contracts_status_idx ON public.contracts(status, created_at DESC);

-- ============================================
-- SECTION 5: NOTIFICATIONS & SETTINGS
-- ============================================

-- 5.1 USER SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  notifications_enabled BOOLEAN DEFAULT true,
  notifications_during_race BOOLEAN DEFAULT false,
  notification_types JSONB DEFAULT '{"dm": true, "contract": true, "achievement": true, "system": true}'::jsonb,
  theme_preference TEXT DEFAULT 'dark',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can view own settings') THEN
    CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can update own settings') THEN
    CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can insert own settings') THEN
    CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5.2 NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('dm', 'mention', 'contract', 'achievement', 'system')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX notifications_recipient_idx ON public.notifications(recipient_id, is_read, created_at DESC);

-- ============================================
-- SECTION 6: RPC FUNCTIONS
-- ============================================

-- 6.1 PASSIVE MINING
-- ============================================
CREATE OR REPLACE FUNCTION claim_passive_points(target UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  points_earned INTEGER := 0;
  time_diff INTERVAL;
  last_claim TIMESTAMP;
BEGIN
  SELECT last_passive_claim INTO last_claim
  FROM public.profiles
  WHERE id = target;

  IF last_claim IS NULL THEN
    time_diff := INTERVAL '1 hour';
  ELSE
    time_diff := NOW() - last_claim;
  END IF;

  IF time_diff < INTERVAL '5 minutes' THEN
    RETURN 0;
  END IF;

  points_earned := LEAST(EXTRACT(EPOCH FROM time_diff) / 60, 60)::INTEGER;

  UPDATE public.profiles
  SET
    orbit_points = orbit_points + points_earned,
    last_passive_claim = NOW()
  WHERE id = target;

  RETURN points_earned;
END;
$$;

-- 6.2 PURCHASE ITEM
-- ============================================
CREATE OR REPLACE FUNCTION purchase_item(p_user UUID, p_item UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_price INTEGER;
  user_balance INTEGER;
  new_balance INTEGER;
BEGIN
  SELECT price INTO item_price FROM public.shop_items WHERE id = p_item;
  IF item_price IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;

  SELECT orbit_points INTO user_balance FROM public.profiles WHERE id = p_user;
  IF user_balance < item_price THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  new_balance := user_balance - item_price;
  UPDATE public.profiles SET orbit_points = new_balance WHERE id = p_user;

  INSERT INTO public.user_inventory (user_id, item_id, slot)
  VALUES (p_user, p_item, (SELECT item_type FROM public.shop_items WHERE id = p_item))
  ON CONFLICT (user_id, item_id) DO NOTHING;

  RETURN new_balance;
END;
$$;

-- 6.3 EQUIP ITEM
-- ============================================
CREATE OR REPLACE FUNCTION equip_item(p_user UUID, p_item UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE item_slot TEXT;
BEGIN
  SELECT slot INTO item_slot FROM public.user_inventory WHERE user_id = p_user AND item_id = p_item;
  IF item_slot IS NULL THEN RAISE EXCEPTION 'Item not in inventory'; END IF;

  UPDATE public.user_inventory SET equipped = false WHERE user_id = p_user AND slot = item_slot;
  UPDATE public.user_inventory SET equipped = true WHERE user_id = p_user AND item_id = p_item;
END;
$$;

-- 6.4 CREATE CONTRACT
-- ============================================
CREATE OR REPLACE FUNCTION create_contract(
  p_creator UUID, p_title TEXT, p_description TEXT, p_bounty INTEGER,
  p_requirements JSONB, p_expiry TIMESTAMP
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_balance INTEGER;
  contract_id UUID;
BEGIN
  SELECT orbit_points INTO creator_balance FROM public.profiles WHERE id = p_creator;
  IF creator_balance < p_bounty THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  UPDATE public.profiles SET orbit_points = orbit_points - p_bounty WHERE id = p_creator;

  INSERT INTO public.contracts (creator_id, title, description, bounty_value, requirements, expires_at)
  VALUES (p_creator, p_title, p_description, p_bounty, p_requirements, p_expiry)
  RETURNING id INTO contract_id;

  RETURN contract_id;
END;
$$;

-- ============================================
-- SECTION 7: TRIGGERS & AUTOMATIONS
-- ============================================

-- 7.1 AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SECTION 8: STORAGE BUCKETS
-- ============================================

-- 8.1 AVATARS BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 8.2 DM ATTACHMENTS BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm_attachments', 'dm_attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to their DM channels"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dm_attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view DM attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dm_attachments');

-- 8.3 VAULT UPLOADS BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault_uploads', 'vault_uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view vault uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vault_uploads');

CREATE POLICY "Authenticated users can upload to vault"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault_uploads'
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- SECTION 9: REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intel_drops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- SECTION 10: SEED DATA
-- ============================================

-- 10.1 TYPING CHALLENGES
-- ============================================
INSERT INTO public.typing_challenges (title, text_content, difficulty, category, length_type, word_count, char_count) VALUES
-- Sprint Challenges
('Quick Start', 'The quick brown fox jumps over the lazy dog near the riverbank where children play.', 'Easy', 'Quick Start', 'Sprint', 14, 78),
('Speed Test Alpha', 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!', 'Easy', 'Speed Training', 'Sprint', 24, 123),
('Git Commit', 'feat: add user authentication with JWT tokens and refresh token rotation for enhanced security', 'Easy', 'Programming', 'Sprint', 14, 95),

-- Medium Challenges
('Code Sprint', 'function calculateSum(arr) { return arr.reduce((a, b) => a + b, 0); }', 'Medium', 'Programming', 'Sprint', 11, 68),
('Database Query', 'SELECT users.name, orders.total FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE orders.status = ''completed'';', 'Medium', 'Programming', 'Medium', 18, 125),
('Technical Prose', 'Asynchronous programming allows applications to perform non-blocking operations, enabling better resource utilization and improved responsiveness in modern web applications.', 'Medium', 'Technical', 'Medium', 18, 152),
('CSS Flexbox', 'Flexbox is a one-dimensional layout method for arranging items in rows or columns. Items flex to fill additional space or shrink to fit into smaller spaces. This makes flexbox perfect for responsive layouts that adapt to different screen sizes and orientations.', 'Medium', 'Technical', 'Medium', 45, 263),

-- Hard Challenges
('Theory Test', 'Quantum entanglement describes a phenomenon where particles remain connected such that the state of one instantly influences the state of another, regardless of distance.', 'Hard', 'Science', 'Marathon', 21, 163),
('Variable Names', 'const userAuthenticationService = new AuthenticationService(config); await userAuthenticationService.validateCredentials(username, password);', 'Hard', 'Programming', 'Medium', 14, 119),
('React Component', 'import React, { useState, useEffect } from ''react''; export const UserProfile = ({ userId }) => { const [user, setUser] = useState(null); useEffect(() => { fetch(`/api/users/${userId}`).then(res => res.json()).then(setUser); }, [userId]); return <div>{user?.name}</div>; };', 'Hard', 'Programming', 'Medium', 36, 267),
('Cybersecurity Basics', 'Cybersecurity involves protecting systems, networks, and data from digital attacks. Common threats include malware, phishing, ransomware, and SQL injection. Defense mechanisms include firewalls, encryption, multi-factor authentication, and regular security audits. Best practices involve keeping software updated, using strong passwords, limiting access privileges, and educating users about social engineering. Modern security employs zero-trust architecture, assuming no user or system is trustworthy by default. Continuous monitoring, incident response plans, and penetration testing are essential for maintaining robust security posture.', 'Medium', 'Technical', 'Marathon', 87, 663)
ON CONFLICT DO NOTHING;

-- 10.2 SHOP ITEMS (Sample)
-- ============================================
INSERT INTO public.shop_items (name, description, item_type, price, rarity, metadata) VALUES
('Cyberpunk Theme', 'Neon purple and cyan color scheme', 'theme', 500, 'rare', '{"primary": "#06b6d4", "secondary": "#a855f7"}'::jsonb),
('Matrix Theme', 'Green terminal aesthetic', 'theme', 300, 'common', '{"primary": "#10b981", "secondary": "#064e3b"}'::jsonb),
('Sunset Theme', 'Warm orange and pink gradients', 'theme', 400, 'rare', '{"primary": "#f97316", "secondary": "#ec4899"}'::jsonb),
('Neon Border', 'Glowing cyan border effect', 'border', 200, 'common', '{"glow": "cyan"}'::jsonb),
('Legendary Border', 'Animated rainbow border', 'border', 1000, 'legendary', '{"glow": "rainbow"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- SECTION 11: ADMIN SETUP
-- ============================================

-- Set admin flag for site owner (update email to your admin email)
UPDATE public.profiles
SET is_admin = true, can_customize_ai = true, ai_depth_limit = 9
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'huttben7@gmail.com'
);

-- ============================================
-- DONE! 🎉
-- ============================================
-- Your Orbit OS Gold Master database is now complete!
--
-- Next steps:
-- 1. Enable Realtime replication in Supabase Dashboard > Database > Replication
-- 2. Verify all tables created: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- 3. Test RPC functions: SELECT claim_passive_points(auth.uid());
-- 4. Deploy your frontend to Vercel
--
-- Happy coding! 🚀
-- ============================================
