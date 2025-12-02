-- ============================================
-- ORBIT OS - MASTER SCHEMA FIX
-- Date: 2025-11-25
-- Purpose: Consolidate ALL tables and ensure schema integrity without data loss.
-- Usage: Run this in Supabase SQL Editor. It is safe to run multiple times.
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CORE PROFILES & AUTH
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  tasks_completed INTEGER DEFAULT 0,
  tasks_forfeited INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Online',
  bio TEXT DEFAULT '',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  max_wpm NUMERIC(6, 2) DEFAULT 0,
  orbit_points INTEGER DEFAULT 0,
  intel_instructions TEXT DEFAULT '',
  current_theme_id UUID,
  unlocked_models TEXT[] DEFAULT ARRAY['gemini-2.0-flash-thinking-exp-01-21'],
  can_customize_ai BOOLEAN DEFAULT false,
  ai_depth_limit INTEGER DEFAULT 5,
  last_passive_claim TIMESTAMP WITH TIME ZONE,
  active_session_start TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT false,
  daily_streak INTEGER DEFAULT 0,
  last_daily_completion DATE,
  races_won INTEGER DEFAULT 0,
  races_participated INTEGER DEFAULT 0,
  intel_queries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_streak') THEN
    ALTER TABLE public.profiles ADD COLUMN daily_streak INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_daily_completion') THEN
    ALTER TABLE public.profiles ADD COLUMN last_daily_completion DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'races_won') THEN
    ALTER TABLE public.profiles ADD COLUMN races_won INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'races_participated') THEN
    ALTER TABLE public.profiles ADD COLUMN races_participated INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'intel_queries') THEN
    ALTER TABLE public.profiles ADD COLUMN intel_queries INTEGER DEFAULT 0;
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. TASKS SYSTEM
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

-- ============================================
-- 3. INTEL SYSTEM (Enhanced)
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

-- NEW: Intel Sessions (for persistence)
CREATE TABLE IF NOT EXISTS public.intel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  depth_level INTEGER NOT NULL,
  research_mode BOOLEAN DEFAULT FALSE,
  custom_instructions TEXT,
  query TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.intel_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. ORACLE CHAT (NEW - Fix for disappearing messages)
-- ============================================

CREATE TABLE IF NOT EXISTS public.oracle_chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  is_sos BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.oracle_chat_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. SOCIAL & MESSAGING
-- ============================================

CREATE TABLE IF NOT EXISTS public.dm_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_dm_pair UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_emoji_per_message UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. ECONOMY SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  rarity TEXT DEFAULT 'common',
  preview_url TEXT,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE IF NOT EXISTS public.vault_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.vault_files(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);

ALTER TABLE public.vault_access ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  bounty_value INTEGER NOT NULL,
  requirements JSONB,
  status TEXT DEFAULT 'open',
  claimant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. NEW UI FEATURES (Achievements, Daily, Etc)
-- ============================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  requirement_field TEXT,
  point_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type TEXT NOT NULL,
  description TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  point_reward INTEGER NOT NULL,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day')
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.user_daily_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. POLICIES (Idempotent)
-- ============================================

-- Oracle Chat History Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oracle_chat_history' AND policyname = 'Users can view own oracle history') THEN
    CREATE POLICY "Users can view own oracle history" ON public.oracle_chat_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oracle_chat_history' AND policyname = 'Users can insert own oracle history') THEN
    CREATE POLICY "Users can insert own oracle history" ON public.oracle_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Intel Sessions Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'intel_sessions' AND policyname = 'Users can manage their intel sessions') THEN
    CREATE POLICY "Users can manage their intel sessions" ON public.intel_sessions FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- 9. SEED DATA (Safe)
-- ============================================

-- Seed Shop Items if empty
INSERT INTO public.shop_items (name, description, item_type, price, rarity, is_active)
SELECT 'Cyber Gold', 'Premium gold border', 'border', 500, 'rare', true
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items WHERE name = 'Cyber Gold');

INSERT INTO public.shop_items (name, description, item_type, price, rarity, is_active)
SELECT 'Neon Blue', 'Classic neon cursor', 'cursor', 200, 'common', true
WHERE NOT EXISTS (SELECT 1 FROM public.shop_items WHERE name = 'Neon Blue');

-- ============================================
-- DONE
-- ============================================
