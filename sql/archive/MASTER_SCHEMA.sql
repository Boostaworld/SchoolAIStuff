-- ORBIT OS - MASTER SCHEMA (Consolidated)
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- This file inlines the critical patches:
--   - intel_persistence_patch.sql
--   - economy_race_patch.sql
-- And references the larger baselines:
--   - MASTER_SCHEMA_FIX.sql
--   - ui_features_migration.sql

-- =========================
-- Extensions
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- CORE PROFILES (from MASTER_SCHEMA_FIX)
-- =========================
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
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- =========================
-- INTEL + ORACLE PERSISTENCE (intel_persistence_patch.sql)
-- =========================
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'intel_sessions' AND policyname = 'Users can manage their intel sessions') THEN
    CREATE POLICY "Users can manage their intel sessions" ON public.intel_sessions FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Public drops or owner access'
  ) THEN
    CREATE POLICY "Public drops or owner access" ON public.intel_drops
    FOR SELECT USING (is_private = false OR author_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Users can insert their drops'
  ) THEN
    CREATE POLICY "Users can insert their drops" ON public.intel_drops
    FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Authors can update their drops'
  ) THEN
    CREATE POLICY "Authors can update their drops" ON public.intel_drops
    FOR UPDATE USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'intel_drops' AND policyname = 'Authors can delete their drops'
  ) THEN
    CREATE POLICY "Authors can delete their drops" ON public.intel_drops
    FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.oracle_chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  is_sos BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.oracle_chat_history ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oracle_chat_history' AND policyname = 'Users can view own oracle history') THEN
    CREATE POLICY "Users can view own oracle history" ON public.oracle_chat_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oracle_chat_history' AND policyname = 'Users can insert own oracle history') THEN
    CREATE POLICY "Users can insert own oracle history" ON public.oracle_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- =========================
-- ECONOMY + RACING (economy_race_patch.sql)
-- =========================
CREATE OR REPLACE FUNCTION public.claim_passive_points()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID := auth.uid();
  last_claim TIMESTAMP WITH TIME ZONE;
  minutes_elapsed INTEGER;
  earned INTEGER := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_passive_claim INTO last_claim FROM public.profiles WHERE id = uid;

  IF last_claim IS NULL THEN
    earned := 60; -- first-time bonus (up to max)
  ELSE
    minutes_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - last_claim)) / 60);
    IF minutes_elapsed < 5 THEN
      RETURN 0; -- enforce 5-minute cooldown
    END IF;
    earned := LEAST(GREATEST(minutes_elapsed, 0), 60);
  END IF;

  UPDATE public.profiles
  SET orbit_points = COALESCE(orbit_points, 0) + earned,
      last_passive_claim = NOW()
  WHERE id = uid;

  RETURN earned;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_passive_points() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_passive_points() TO authenticated;

-- Typing challenges
CREATE TABLE IF NOT EXISTS public.typing_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  text_content TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
  category TEXT,
  length_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.typing_challenges ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'typing_challenges' AND policyname = 'Anyone can view challenges') THEN
    CREATE POLICY "Anyone can view challenges" ON public.typing_challenges FOR SELECT USING (true);
  END IF;
END $$;

-- Typing sessions
CREATE TABLE IF NOT EXISTS public.typing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.typing_challenges(id),
  wpm INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  error_count INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.typing_sessions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'typing_sessions' AND policyname = 'Users can manage their sessions') THEN
    CREATE POLICY "Users can manage their sessions" ON public.typing_sessions FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Typing stats
CREATE TABLE IF NOT EXISTS public.typing_stats (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_char TEXT NOT NULL,
  error_count INTEGER DEFAULT 0,
  total_presses INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, key_char)
);
ALTER TABLE public.typing_stats ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'typing_stats' AND policyname = 'Users can manage their typing stats') THEN
    CREATE POLICY "Users can manage their typing stats" ON public.typing_stats FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Race lobbies
CREATE TABLE IF NOT EXISTS public.race_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_code TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'solo',
  max_players INTEGER NOT NULL DEFAULT 4,
  is_private BOOLEAN DEFAULT FALSE,
  challenge_id UUID REFERENCES public.typing_challenges(id),
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.race_lobbies ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'race_lobbies' AND policyname = 'Anyone can view lobbies') THEN
    CREATE POLICY "Anyone can view lobbies" ON public.race_lobbies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'race_lobbies' AND policyname = 'Hosts can manage their lobby') THEN
    CREATE POLICY "Hosts can manage their lobby" ON public.race_lobbies FOR ALL USING (host_user_id = auth.uid());
  END IF;
END $$;

-- Race participants
CREATE TABLE IF NOT EXISTS public.race_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.race_lobbies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_bot BOOLEAN DEFAULT FALSE,
  bot_name TEXT,
  bot_target_wpm INTEGER,
  final_wpm INTEGER,
  final_accuracy NUMERIC(5,2),
  final_position INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.race_participants ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'race_participants' AND policyname = 'Users can manage their race entries') THEN
    CREATE POLICY "Users can manage their race entries" ON public.race_participants FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_typing_sessions_user ON public.typing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_race_participants_lobby ON public.race_participants(lobby_id);

-- =========================
-- REFERENCE: Remaining schema
-- =========================
-- For full feature coverage (achievements, marketplace, etc.), run:
--   - sql/MASTER_SCHEMA_FIX.sql
--   - sql/ui_features_migration.sql
-- These include additional tables (tasks, social, economy, achievements, daily challenges, marketplace, etc.) and RLS.

