-- ============================================
-- ORBIT OS - UI FEATURES MIGRATION SQL
-- Date: 2025-11-25
-- Purpose: Support new UI components and features
-- ============================================

-- ============================================
-- 1. ACHIEVEMENTS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji or icon name
  category TEXT NOT NULL, -- 'racing', 'tasks', 'economy', 'social', 'intel'
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_type TEXT NOT NULL, -- 'count', 'threshold', 'streak', 'special'
  requirement_value INTEGER NOT NULL, -- e.g., 100 for "100 WPM"
  requirement_field TEXT, -- e.g., 'max_wpm', 'tasks_completed'
  point_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0, -- for tracking partial progress
  UNIQUE(user_id, achievement_id)
);

-- Sample achievements
INSERT INTO achievements (name, description, icon, category, rarity, requirement_type, requirement_value, requirement_field, point_reward) VALUES
('First Steps', 'Complete your first task', '👣', 'tasks', 'common', 'count', 1, 'tasks_completed', 50),
('Speed Demon', 'Reach 100 WPM', '⚡', 'racing', 'rare', 'threshold', 100, 'max_wpm', 200),
('Point Hoarder', 'Accumulate 10,000 orbit points', '💰', 'economy', 'epic', 'threshold', 10000, 'orbit_points', 500),
('Task Master', 'Complete 50 tasks', '📋', 'tasks', 'epic', 'count', 50, 'tasks_completed', 300),
('AI Whisperer', 'Make 100 Intel queries', '🧠', 'intel', 'rare', 'count', 100, 'intel_queries', 250),
('Champion Racer', 'Win 25 races', '🏆', 'racing', 'legendary', 'count', 25, 'races_won', 1000),
('Perfect Week', 'Complete daily challenges for 7 consecutive days', '🔥', 'tasks', 'legendary', 'streak', 7, 'daily_streak', 750);

-- ============================================
-- 2. DAILY CHALLENGES SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type TEXT NOT NULL, -- 'race', 'task', 'wpm', 'accuracy', 'social'
  description TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  point_reward INTEGER NOT NULL,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day')
);

CREATE TABLE IF NOT EXISTS user_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, challenge_id)
);

-- Add streak tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_completion DATE;

-- Function to generate daily challenges (call this daily via cron)
CREATE OR REPLACE FUNCTION generate_daily_challenges() RETURNS VOID AS $$
BEGIN
  -- Delete old challenges
  DELETE FROM daily_challenges WHERE expires_at < NOW();

  -- Generate 3 random challenges for today
  INSERT INTO daily_challenges (challenge_type, description, requirement_value, point_reward)
  SELECT * FROM (VALUES
    ('race', 'Complete 5 races', 5, 100),
    ('task', 'Complete 3 tasks', 3, 75),
    ('wpm', 'Reach 80 WPM in any session', 80, 50),
    ('accuracy', 'Achieve 95% accuracy in a race', 95, 100),
    ('social', 'Send 10 messages in Comms', 10, 50)
  ) AS potential_challenges(type, desc, req, reward)
  ORDER BY RANDOM()
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. CUSTOM THEMES SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS user_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  theme_data JSONB NOT NULL, -- stores colors, fonts, effects
  is_active BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE, -- allow sharing
  theme_code TEXT UNIQUE, -- shareable code like "CYBER-2K9A"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example theme structure:
-- {
--   "primary": "#06b6d4",
--   "secondary": "#8b5cf6",
--   "accent": "#f59e0b",
--   "background": ["#0f172a", "#1e293b"],
--   "font": "JetBrains Mono",
--   "scanlines": true,
--   "particles": "medium"
-- }

-- ============================================
-- 4. TEAM RACES (MULTIPLAYER)
-- ============================================

CREATE TABLE IF NOT EXISTS race_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_code TEXT UNIQUE NOT NULL, -- 6-char code
  host_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('solo', '2v2', '3v3', 'free-for-all')),
  max_players INTEGER NOT NULL DEFAULT 4,
  is_private BOOLEAN DEFAULT FALSE,
  challenge_id UUID REFERENCES typing_challenges(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'in_progress', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS race_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES race_lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_number INTEGER, -- 1 or 2 for team races, NULL for solo
  final_wpm INTEGER,
  final_accuracy DECIMAL(5,2),
  final_position INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(lobby_id, user_id)
);

-- Add race stats to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS races_won INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS races_participated INTEGER DEFAULT 0;

-- ============================================
-- 5. INTEL TRACKING (FOR COMMAND DECK)
-- ============================================

-- Track Intel query usage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intel_queries INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS intel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL, -- 'flash', 'pro', 'orbit-x'
  depth_level INTEGER NOT NULL CHECK (depth_level BETWEEN 1 AND 9),
  research_mode BOOLEAN DEFAULT FALSE,
  custom_instructions TEXT,
  query TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. MARKETPLACE (P2P ECONOMY)
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES shop_items(id), -- if selling shop item
  custom_item_data JSONB, -- if selling custom creation
  price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  is_auction BOOLEAN DEFAULT FALSE,
  auction_end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL, -- 10% of price
  seller_revenue INTEGER NOT NULL, -- 90% of price
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. LEARNING PATHS (ORBIT UNIVERSITY)
-- ============================================

CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'programming', 'data-science', 'writing', etc.
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours INTEGER,
  icon TEXT,
  created_by UUID REFERENCES profiles(id),
  is_official BOOLEAN DEFAULT FALSE, -- official vs community-created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- lesson content (markdown)
  video_url TEXT,
  typing_challenge_id UUID REFERENCES typing_challenges(id),
  quiz_data JSONB, -- questions and answers
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id),
  completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, path_id, module_id)
);

-- ============================================
-- 8. AUDIO/PODCAST INTEGRATION
-- ============================================

CREATE TABLE IF NOT EXISTS audio_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL, -- Supabase Storage URL
  duration_seconds INTEGER,
  transcript TEXT,
  category TEXT, -- 'podcast', 'audiobook', 'lesson', 'music'
  language TEXT DEFAULT 'en',
  plays_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audio_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES audio_playlists(id) ON DELETE CASCADE,
  audio_id UUID NOT NULL REFERENCES audio_content(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  UNIQUE(playlist_id, audio_id)
);

-- ============================================
-- 9. ANALYTICS TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS wpm_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL(5,2),
  session_type TEXT, -- 'practice', 'race', 'challenge'
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_wpm_history_user_date ON wpm_history(user_id, recorded_at DESC);

-- ============================================
-- 10. NOTIFICATION ENHANCEMENTS
-- ============================================

-- Add notification types for new features
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'general';
-- Types: 'general', 'achievement', 'challenge', 'race_invite', 'marketplace', 'social'

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
-- Deep link to specific feature

-- ============================================
-- 11. RPC FUNCTIONS FOR NEW FEATURES
-- ============================================

-- Complete daily challenge
CREATE OR REPLACE FUNCTION complete_daily_challenge(
  p_user UUID,
  p_challenge UUID
) RETURNS JSONB AS $$
DECLARE
  v_points INTEGER;
  v_new_streak INTEGER;
BEGIN
  -- Get challenge reward
  SELECT point_reward INTO v_points FROM daily_challenges WHERE id = p_challenge;

  -- Mark challenge complete
  UPDATE user_daily_progress
  SET completed = TRUE, completed_at = NOW(), progress = requirement_value
  FROM daily_challenges
  WHERE user_id = p_user AND challenge_id = p_challenge
  AND daily_challenges.id = p_challenge;

  -- Update user streak
  UPDATE profiles
  SET
    orbit_points = orbit_points + v_points,
    daily_streak = CASE
      WHEN last_daily_completion = CURRENT_DATE - INTERVAL '1 day' THEN daily_streak + 1
      WHEN last_daily_completion = CURRENT_DATE THEN daily_streak
      ELSE 1
    END,
    last_daily_completion = CURRENT_DATE
  WHERE id = p_user
  RETURNING orbit_points, daily_streak INTO v_points, v_new_streak;

  RETURN jsonb_build_object('points', v_points, 'streak', v_new_streak);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unlock achievement
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user UUID,
  p_achievement UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_reward INTEGER;
BEGIN
  -- Check if already unlocked
  IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user AND achievement_id = p_achievement) THEN
    RETURN FALSE;
  END IF;

  -- Get reward
  SELECT point_reward INTO v_reward FROM achievements WHERE id = p_achievement;

  -- Unlock achievement
  INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user, p_achievement);

  -- Grant points
  UPDATE profiles SET orbit_points = orbit_points + v_reward WHERE id = p_user;

  -- Create notification
  INSERT INTO notifications (recipient_id, content, notification_type, link_url)
  SELECT p_user, jsonb_build_object('message', 'Achievement unlocked: ' || name), 'achievement', '/achievements'
  FROM achievements WHERE id = p_achievement;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join race lobby
CREATE OR REPLACE FUNCTION join_race_lobby(
  p_user UUID,
  p_lobby UUID,
  p_team INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_max_players INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Check capacity
  SELECT max_players INTO v_max_players FROM race_lobbies WHERE id = p_lobby;
  SELECT COUNT(*) INTO v_current_count FROM race_participants WHERE lobby_id = p_lobby;

  IF v_current_count >= v_max_players THEN
    RAISE EXCEPTION 'Lobby is full';
  END IF;

  -- Add participant
  INSERT INTO race_participants (lobby_id, user_id, team_number)
  VALUES (p_lobby, p_user, p_team);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track WPM for analytics
CREATE OR REPLACE FUNCTION track_wpm_session(
  p_user UUID,
  p_wpm INTEGER,
  p_accuracy DECIMAL,
  p_session_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO wpm_history (user_id, wpm, accuracy, session_type)
  VALUES (p_user, p_wpm, p_accuracy, p_session_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Achievements (public read, admin write)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Only admins can manage achievements" ON achievements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- User achievements (users can view their own)
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their achievements" ON user_achievements FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "System can grant achievements" ON user_achievements FOR INSERT
  USING (true);

-- Daily challenges (public read)
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily challenges" ON daily_challenges FOR SELECT USING (true);

-- User daily progress (users can view/update their own)
ALTER TABLE user_daily_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their daily progress" ON user_daily_progress FOR ALL
  USING (user_id = auth.uid());

-- Themes (users can manage their own + view public)
ALTER TABLE user_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their themes" ON user_themes FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "Anyone can view public themes" ON user_themes FOR SELECT
  USING (is_public = true);

-- Race lobbies (public read, host can update)
ALTER TABLE race_lobbies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lobbies" ON race_lobbies FOR SELECT USING (true);
CREATE POLICY "Users can create lobbies" ON race_lobbies FOR INSERT
  USING (host_user_id = auth.uid());
CREATE POLICY "Hosts can update their lobbies" ON race_lobbies FOR UPDATE
  USING (host_user_id = auth.uid());

-- Intel sessions (users can view/create their own)
ALTER TABLE intel_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their intel sessions" ON intel_sessions FOR ALL
  USING (user_id = auth.uid());

-- Marketplace (sellers manage their listings, buyers can view)
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active listings" ON marketplace_listings FOR SELECT
  USING (status = 'active');
CREATE POLICY "Sellers can manage their listings" ON marketplace_listings FOR ALL
  USING (seller_id = auth.uid());

-- ============================================
-- 13. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(created_date);
CREATE INDEX IF NOT EXISTS idx_race_participants_lobby ON race_participants(lobby_id);
CREATE INDEX IF NOT EXISTS idx_intel_sessions_user ON intel_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);

-- ============================================
-- 14. TRIGGERS
-- ============================================

-- Auto-check for achievement unlock on profile update
CREATE OR REPLACE FUNCTION check_achievements() RETURNS TRIGGER AS $$
BEGIN
  -- Check WPM achievements
  IF NEW.max_wpm >= 100 AND OLD.max_wpm < 100 THEN
    PERFORM unlock_achievement(NEW.id, (SELECT id FROM achievements WHERE name = 'Speed Demon'));
  END IF;

  -- Check point achievements
  IF NEW.orbit_points >= 10000 AND OLD.orbit_points < 10000 THEN
    PERFORM unlock_achievement(NEW.id, (SELECT id FROM achievements WHERE name = 'Point Hoarder'));
  END IF;

  -- Check task achievements
  IF NEW.tasks_completed >= 50 AND OLD.tasks_completed < 50 THEN
    PERFORM unlock_achievement(NEW.id, (SELECT id FROM achievements WHERE name = 'Task Master'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_achievements
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_achievements();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- To apply this migration, run:
-- psql -d orbit_db -f ui_features_migration.sql

-- Or in Supabase dashboard:
-- SQL Editor > New Query > Paste contents > Run

COMMENT ON TABLE achievements IS 'Achievement badges that users can unlock';
COMMENT ON TABLE daily_challenges IS 'Refreshes daily at midnight UTC';
COMMENT ON TABLE race_lobbies IS 'Multiplayer race matchmaking lobbies';
COMMENT ON TABLE intel_sessions IS 'Tracks AI Command Deck usage';
COMMENT ON TABLE marketplace_listings IS 'Player-to-player item trading';
COMMENT ON TABLE learning_paths IS 'Orbit University course structure';
