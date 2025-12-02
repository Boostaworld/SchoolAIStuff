-- Intel + Profile persistence patch (idempotent)
-- Run in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure intel_sessions exists for Command Deck history
CREATE TABLE IF NOT EXISTS public.intel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  depth_level INTEGER NOT NULL CHECK (depth_level BETWEEN 1 AND 9),
  research_mode BOOLEAN DEFAULT FALSE,
  custom_instructions TEXT,
  query TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic intel drops table (if missing)
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

-- RLS for profiles (enable bio/intel updates)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- RLS for intel history persistence
ALTER TABLE public.intel_sessions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'intel_sessions' AND policyname = 'Users can manage their intel sessions'
  ) THEN
    CREATE POLICY "Users can manage their intel sessions" ON public.intel_sessions FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- RLS for intel drops feed
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
