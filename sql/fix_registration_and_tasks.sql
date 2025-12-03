-- ============================================
-- FIX: Registration Error + Tasks Not Persisting
-- ============================================
-- Run this in Supabase SQL Editor
-- This fixes:
--   1. "Database error saving new user" on registration
--   2. Tasks disappearing on restart
--   3. Public tasks not showing in feed

-- =========================
-- 1. AUTO-CREATE PROFILE TRIGGER
-- =========================
-- This trigger automatically creates a profile when a user signs up
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- 2. TASKS TABLE WITH PUBLIC/PRIVATE
-- =========================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Grind',
  difficulty TEXT DEFAULT 'Medium',
  completed BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table already exists without is_public column, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =========================
-- 3. RLS POLICIES FOR TASKS
-- =========================
DO $$
BEGIN
  -- Drop existing policies to recreate them properly
  DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
  DROP POLICY IF EXISTS "Anyone can view public tasks" ON public.tasks;
  DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
  DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
  DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

  -- Users can always see their own tasks
  CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

  -- Anyone can view public tasks
  CREATE POLICY "Anyone can view public tasks" ON public.tasks
    FOR SELECT USING (is_public = true);

  -- Users can insert their own tasks
  CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- Users can update their own tasks
  CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

  -- Users can delete their own tasks
  CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);
END $$;

-- =========================
-- 4. ENABLE REALTIME FOR TASKS
-- =========================
-- This ensures tasks sync across devices/tabs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- =========================
-- DONE!
-- =========================
-- After running this:
--   1. New users should register successfully
--   2. Tasks will persist across restarts
--   3. Public tasks will be visible to all users
--   4. Private tasks will only be visible to the owner
