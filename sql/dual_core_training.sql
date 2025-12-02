-- ============================================
-- DUAL-CORE TYPING ECOSYSTEM - DATABASE MIGRATION
-- ============================================
-- Date: 2025-11-25
-- Purpose: Add infrastructure for VELOCITY and ACADEMY training modes
-- Author: skeleton-builder agent

-- ============================================
-- 1. EXTEND EXISTING TABLES
-- ============================================

-- Add mode field to typing_challenges
ALTER TABLE typing_challenges
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'velocity';

ALTER TABLE typing_challenges
ADD CONSTRAINT IF NOT EXISTS check_mode
CHECK (mode IN ('velocity', 'academy'));

-- Add performance metrics to typing_sessions (maps to typing_history in spec)
-- Note: The spec references "typing_history" but existing codebase uses "typing_sessions"
-- We'll extend typing_sessions to maintain consistency
ALTER TABLE typing_sessions
ADD COLUMN IF NOT EXISTS latency_avg INTEGER DEFAULT NULL; -- Average milliseconds between keystrokes

ALTER TABLE typing_sessions
ADD COLUMN IF NOT EXISTS rhythm_score INTEGER DEFAULT NULL; -- 0-100 consistency rating

ALTER TABLE typing_sessions
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'velocity';

-- Add constraint for rhythm_score range
ALTER TABLE typing_sessions
ADD CONSTRAINT IF NOT EXISTS check_rhythm_score
CHECK (rhythm_score IS NULL OR (rhythm_score >= 0 AND rhythm_score <= 100));

-- ============================================
-- 2. RACE BOTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS race_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  target_wpm INTEGER NOT NULL CHECK (target_wpm > 0 AND target_wpm <= 200),
  error_rate DECIMAL(4,3) DEFAULT 0.020 CHECK (error_rate >= 0 AND error_rate <= 1), -- 2.0% default
  personality VARCHAR(50) NOT NULL CHECK (personality IN ('aggressive', 'steady', 'cautious')),
  avatar_url TEXT,
  tagline VARCHAR(200), -- Optional bot personality flavor text
  active BOOLEAN DEFAULT TRUE, -- Allow bots to be temporarily disabled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for matchmaking queries (find bots by WPM range)
CREATE INDEX IF NOT EXISTS idx_race_bots_target_wpm ON race_bots(target_wpm) WHERE active = TRUE;

-- Index for personality filtering
CREATE INDEX IF NOT EXISTS idx_race_bots_personality ON race_bots(personality) WHERE active = TRUE;

-- ============================================
-- 3. ACADEMY DRILLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS academy_drills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_keys VARCHAR(50) NOT NULL, -- Comma-separated weak keys: 'P,Q,X'
  drill_text TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  final_accuracy DECIMAL(5,2) DEFAULT NULL CHECK (final_accuracy IS NULL OR (final_accuracy >= 0 AND final_accuracy <= 100)),
  final_wpm INTEGER DEFAULT NULL,
  session_id UUID DEFAULT NULL REFERENCES typing_sessions(id) ON DELETE SET NULL -- Link to the session where drill was completed
);

-- Index for fetching user's drill history
CREATE INDEX IF NOT EXISTS idx_academy_drills_user_id ON academy_drills(user_id, generated_at DESC);

-- Index for finding incomplete drills
CREATE INDEX IF NOT EXISTS idx_academy_drills_incomplete ON academy_drills(user_id, completed) WHERE completed = FALSE;

-- ============================================
-- 4. TYPING STATS AGGREGATE TABLE
-- ============================================
-- Weekly rollup of per-key performance for trend analysis

CREATE TABLE IF NOT EXISTS typing_stats_aggregate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week
  key_char CHAR(1) NOT NULL,
  total_presses INTEGER DEFAULT 0 CHECK (total_presses >= 0),
  total_errors INTEGER DEFAULT 0 CHECK (total_errors >= 0 AND total_errors <= total_presses),
  -- Computed accuracy column (stored for query performance)
  accuracy DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_presses > 0
      THEN ((total_presses - total_errors)::DECIMAL / total_presses) * 100
      ELSE 100.00
    END
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start, key_char)
);

-- Index for time-series queries (user's weekly progress)
CREATE INDEX IF NOT EXISTS idx_typing_stats_aggregate_user_week ON typing_stats_aggregate(user_id, week_start DESC);

-- Index for finding weak keys in a specific week
CREATE INDEX IF NOT EXISTS idx_typing_stats_aggregate_accuracy ON typing_stats_aggregate(user_id, week_start, accuracy ASC);

-- ============================================
-- 5. UTILITY FUNCTIONS
-- ============================================

-- Function to get current week start (Monday)
CREATE OR REPLACE FUNCTION get_week_start(date_input DATE DEFAULT CURRENT_DATE)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (date_input - (EXTRACT(DOW FROM date_input)::INTEGER - 1) * INTERVAL '1 day')::DATE;
$$;

-- Function to aggregate typing stats for the current week
-- This should be called periodically or after each typing session
CREATE OR REPLACE FUNCTION update_weekly_stats(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_start DATE := get_week_start();
BEGIN
  -- Upsert aggregated stats from typing_stats table
  INSERT INTO typing_stats_aggregate (user_id, week_start, key_char, total_presses, total_errors, updated_at)
  SELECT
    p_user_id,
    v_week_start,
    ts.key_char,
    ts.total_presses,
    ts.error_count,
    NOW()
  FROM typing_stats ts
  WHERE ts.user_id = p_user_id
  ON CONFLICT (user_id, week_start, key_char)
  DO UPDATE SET
    total_presses = EXCLUDED.total_presses,
    total_errors = EXCLUDED.total_errors,
    updated_at = NOW();
END;
$$;

-- ============================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE race_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_stats_aggregate ENABLE ROW LEVEL SECURITY;

-- Race Bots: Public read access (anyone can see bots)
CREATE POLICY IF NOT EXISTS "Race bots are publicly readable"
  ON race_bots FOR SELECT
  USING (TRUE);

-- Race Bots: Only admins can insert/update/delete
CREATE POLICY IF NOT EXISTS "Only admins can manage race bots"
  ON race_bots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Academy Drills: Users can only access their own drills
CREATE POLICY IF NOT EXISTS "Users can view their own drills"
  ON academy_drills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own drills"
  ON academy_drills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own drills"
  ON academy_drills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own drills"
  ON academy_drills FOR DELETE
  USING (auth.uid() = user_id);

-- Typing Stats Aggregate: Users can only access their own stats
CREATE POLICY IF NOT EXISTS "Users can view their own stats aggregate"
  ON typing_stats_aggregate FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own stats aggregate"
  ON typing_stats_aggregate FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own stats aggregate"
  ON typing_stats_aggregate FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Auto-update academy_drills completed_at timestamp
CREATE OR REPLACE FUNCTION update_drill_completed_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_drill_completed
  BEFORE UPDATE ON academy_drills
  FOR EACH ROW
  EXECUTE FUNCTION update_drill_completed_timestamp();

-- ============================================
-- 8. COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE race_bots IS 'AI-controlled opponents for VELOCITY racing mode with different personalities and skill levels';
COMMENT ON COLUMN race_bots.personality IS 'Bot behavior: aggressive (fast start, high variance), steady (consistent pace), cautious (slow start, improves over time)';
COMMENT ON COLUMN race_bots.error_rate IS 'Probability of bot making a typo (0.0 - 1.0). Affects final accuracy score.';
COMMENT ON COLUMN race_bots.tagline IS 'Flavor text shown in bot profile (e.g., "Speed is my religion")';

COMMENT ON TABLE academy_drills IS 'AI-generated personalized typing drills targeting user weak points';
COMMENT ON COLUMN academy_drills.target_keys IS 'Comma-separated list of keys this drill focuses on improving';
COMMENT ON COLUMN academy_drills.difficulty IS 'Drill complexity: 1 (simple words) to 5 (complex sentences, rare words)';

COMMENT ON TABLE typing_stats_aggregate IS 'Weekly rollup of per-key typing performance for trend analysis and weak key detection';
COMMENT ON COLUMN typing_stats_aggregate.week_start IS 'Monday of the week (computed via get_week_start function)';
COMMENT ON COLUMN typing_stats_aggregate.accuracy IS 'Auto-calculated accuracy percentage for this key during this week';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next Steps:
-- 1. Run sql/seed_race_bots.sql to populate initial bot personalities
-- 2. Update Zustand store to include training state management
-- 3. Create TypeScript types for new entities
