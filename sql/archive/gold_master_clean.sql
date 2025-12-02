-- ============================================
-- GOLD MASTER SCHEMA - CLEAN VERSION
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Add missing columns to profiles
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_theme_id UUID,
  ADD COLUMN IF NOT EXISTS unlocked_models TEXT[] DEFAULT ARRAY['gemini-2.0-flash-thinking-exp-01-21'],
  ADD COLUMN IF NOT EXISTS can_customize_ai BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_depth_limit INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_passive_claim TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS active_session_start TIMESTAMP WITH TIME ZONE;

-- ============================================
-- STEP 2: Shop System Tables
-- ============================================

-- SAFETY: Drop table to ensure clean creation (since it's a new feature)
DROP TABLE IF EXISTS public.shop_items CASCADE;

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


CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.shop_items(id) ON DELETE CASCADE NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  equipped BOOLEAN DEFAULT false,
  slot TEXT,
  UNIQUE(user_id, item_id)
);

-- ============================================
-- STEP 3: Vault System
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

CREATE TABLE IF NOT EXISTS public.vault_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.vault_files(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);

-- ============================================
-- STEP 4: Contracts/Bounties
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

-- ============================================
-- STEP 5: Notifications
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

-- ============================================
-- STEP 6: User Settings
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  notifications_enabled BOOLEAN DEFAULT true,
  notifications_during_race BOOLEAN DEFAULT false,
  notification_types JSONB DEFAULT '{"dm": true, "contract": true, "achievement": true, "system": true}'::jsonb,
  theme_preference TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 7: Enable RLS on new tables
-- ============================================

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: RLS Policies (idempotent)
-- ============================================

-- Shop Items
DROP POLICY IF EXISTS "Anyone can view active shop items" ON public.shop_items;
CREATE POLICY "Anyone can view active shop items"
  ON public.shop_items FOR SELECT
  USING (is_active = true);

-- User Inventory
DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;
CREATE POLICY "Users can view own inventory"
  ON public.user_inventory FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can modify own inventory" ON public.user_inventory;
CREATE POLICY "Users can modify own inventory"
  ON public.user_inventory FOR ALL
  USING (auth.uid() = user_id);

-- Vault Files
DROP POLICY IF EXISTS "Anyone can view vault files" ON public.vault_files;
CREATE POLICY "Anyone can view vault files"
  ON public.vault_files FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can upload vault files" ON public.vault_files;
CREATE POLICY "Users can upload vault files"
  ON public.vault_files FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

-- Contracts
DROP POLICY IF EXISTS "Users can view contracts" ON public.contracts;
CREATE POLICY "Users can view contracts"
  ON public.contracts FOR SELECT
  USING (status = 'open' OR creator_id = auth.uid() OR claimant_id = auth.uid());

DROP POLICY IF EXISTS "Users can create contracts" ON public.contracts;
CREATE POLICY "Users can create contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- User Settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 9: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS shop_items_type_idx ON public.shop_items(item_type, is_active);
CREATE INDEX IF NOT EXISTS user_inventory_user_idx ON public.user_inventory(user_id, equipped);
CREATE INDEX IF NOT EXISTS vault_files_course_idx ON public.vault_files(course_tag);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications(recipient_id, is_read, created_at DESC);

-- ============================================
-- STEP 10: Seed Shop Items
-- ============================================

INSERT INTO public.shop_items (name, description, item_type, price, rarity, metadata) VALUES
  ('Cyber Void', 'Dark matrix theme with neon accents', 'theme', 200, 'rare', '{"bg": "#0a0e27", "accent": "#00d4ff"}'::jsonb),
  ('Sunset Hacker', 'Warm orange and purple gradient', 'theme', 150, 'common', '{"bg": "#1a1625", "accent": "#ff6b35"}'::jsonb),
  ('Gold Rush', 'Legendary golden theme', 'theme', 500, 'legendary', '{"bg": "#1c1008", "accent": "#ffd700"}'::jsonb),
  ('Neon Pulse', 'Animated neon border', 'border', 300, 'epic', '{"color": "#ff00ff", "animation": "pulse"}'::jsonb),
  ('Gemini Pro Access', 'Unlock Gemini 1.5 Pro model', 'ai_model', 1000, 'epic', '{"model": "pro"}'::jsonb),
  ('Orbit-X Thinking', 'Advanced reasoning model', 'ai_model', 2000, 'legendary', '{"model": "orbit-x"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 11: RPC Functions
-- ============================================

-- Passive Mining
CREATE OR REPLACE FUNCTION claim_passive_points()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  points_earned INTEGER := 0;
  time_diff INTERVAL;
  last_claim TIMESTAMP;
  elapsed_minutes INTEGER;
BEGIN
  SELECT last_passive_claim INTO last_claim
  FROM public.profiles
  WHERE id = auth.uid();

  IF last_claim IS NULL THEN
    time_diff := INTERVAL '0 minutes';
  ELSE
    time_diff := NOW() - last_claim;
  END IF;

  IF time_diff < INTERVAL '5 minutes' THEN
    RETURN 0;
  END IF;

  elapsed_minutes := EXTRACT(EPOCH FROM time_diff) / 60;
  points_earned := LEAST(elapsed_minutes, 60);

  UPDATE public.profiles
  SET
    orbit_points = orbit_points + points_earned,
    last_passive_claim = NOW()
  WHERE id = auth.uid();

  RETURN points_earned;
END;
$$;

-- Purchase Item
CREATE OR REPLACE FUNCTION purchase_item(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_price INTEGER;
  user_balance INTEGER;
  item_slot TEXT;
BEGIN
  SELECT price, item_type INTO item_price, item_slot FROM public.shop_items WHERE id = p_item_id;
  IF item_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  SELECT orbit_points INTO user_balance FROM public.profiles WHERE id = auth.uid();
  IF user_balance < item_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  UPDATE public.profiles SET orbit_points = orbit_points - item_price WHERE id = auth.uid();

  INSERT INTO public.user_inventory (user_id, item_id, slot)
  VALUES (auth.uid(), p_item_id, item_slot)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'new_balance', user_balance - item_price);
END;
$$;

-- Equip Item
CREATE OR REPLACE FUNCTION equip_item(p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_slot TEXT;
BEGIN
  SELECT slot INTO item_slot FROM public.user_inventory WHERE user_id = auth.uid() AND item_id = p_item_id;
  IF item_slot IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_inventory SET equipped = false WHERE user_id = auth.uid() AND slot = item_slot;
  UPDATE public.user_inventory SET equipped = true WHERE user_id = auth.uid() AND item_id = p_item_id;

  RETURN true;
END;
$$;

-- ============================================
-- SUCCESS! Run diagnose_database.sql again to verify
-- ============================================
