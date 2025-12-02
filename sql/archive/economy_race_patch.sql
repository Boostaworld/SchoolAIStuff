-- Economy (Passive Miner) + Racing tables/RLS + RPC (idempotent)
-- Run in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Passive Miner RPC
-- ============================================
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

-- Allow calling the RPC
REVOKE ALL ON FUNCTION public.claim_passive_points() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_passive_points() TO authenticated;

-- ============================================
-- Typing/Racing Tables
-- ============================================

-- Challenge library
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

-- Session history
CREATE TABLE IF NOT EXISTS public.typing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.typing_challenges(id),
  wpm INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  error_count INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.typing_sessions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'typing_sessions' AND policyname = 'Users can manage their sessions') THEN
    CREATE POLICY "Users can manage their sessions" ON public.typing_sessions FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Add created_at for compatibility if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'typing_sessions' AND column_name = 'created_at') THEN
    ALTER TABLE public.typing_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Per-key stats
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

-- Race lobbies (for multiplayer/spectate)
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

-- Indexes for stats lookups
CREATE INDEX IF NOT EXISTS idx_typing_sessions_user ON public.typing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_race_participants_lobby ON public.race_participants(lobby_id);
