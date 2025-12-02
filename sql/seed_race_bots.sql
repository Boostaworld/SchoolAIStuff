-- ============================================
-- RACE BOTS SEED DATA
-- ============================================
-- Date: 2025-11-25
-- Purpose: Populate race_bots table with diverse AI personalities
-- Author: skeleton-builder agent
--
-- Usage: Run this after dual_core_training.sql migration
-- Note: Uses ON CONFLICT to allow re-running without duplicates

-- ============================================
-- SEED DATA: 10 DIVERSE BOT PERSONALITIES
-- ============================================

INSERT INTO race_bots (name, target_wpm, error_rate, personality, tagline, active)
VALUES
  -- ========== AGGRESSIVE BOTS (High speed, higher variance) ==========
  (
    'NitroNinja',
    110,
    0.045,
    'aggressive',
    'Speed is my religion. Mistakes are my fuel.',
    TRUE
  ),
  (
    'BlitzTyper',
    95,
    0.040,
    'aggressive',
    'Fast and furious. No brakes, only acceleration.',
    TRUE
  ),
  (
    'TurboThrasher',
    88,
    0.038,
    'aggressive',
    'I type like I''m escaping a burning building.',
    TRUE
  ),

  -- ========== STEADY BOTS (Consistent, balanced) ==========
  (
    'SteadySteve',
    75,
    0.020,
    'steady',
    'Slow and steady wins the race. Always.',
    TRUE
  ),
  (
    'MetronomeMike',
    68,
    0.018,
    'steady',
    'Tick-tock. My rhythm never stops.',
    TRUE
  ),
  (
    'ConsistentCarl',
    62,
    0.015,
    'steady',
    'Predictable? Yes. Beatable? Rarely.',
    TRUE
  ),

  -- ========== CAUTIOUS BOTS (Slow start, high accuracy) ==========
  (
    'PrecisionPete',
    58,
    0.012,
    'cautious',
    'Every keystroke is deliberate. Every word is perfect.',
    TRUE
  ),
  (
    'AccuracyAnnie',
    52,
    0.008,
    'cautious',
    'Speed means nothing if you can''t spell.',
    TRUE
  ),
  (
    'CarefulCathy',
    48,
    0.005,
    'cautious',
    'Measure twice, type once.',
    TRUE
  ),
  (
    'PerfectionistPaul',
    45,
    0.003,
    'cautious',
    'Zero errors. Zero excuses.',
    TRUE
  )
ON CONFLICT (name) DO UPDATE
SET
  target_wpm = EXCLUDED.target_wpm,
  error_rate = EXCLUDED.error_rate,
  personality = EXCLUDED.personality,
  tagline = EXCLUDED.tagline,
  active = EXCLUDED.active;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify bots were created successfully:
-- SELECT name, target_wpm, personality, tagline FROM race_bots ORDER BY target_wpm DESC;

-- ============================================
-- STATISTICS
-- ============================================

-- Bots by personality distribution:
-- - Aggressive: 3 bots (88-110 WPM, 3.8-4.5% error rate)
-- - Steady: 3 bots (62-75 WPM, 1.5-2.0% error rate)
-- - Cautious: 4 bots (45-58 WPM, 0.3-1.2% error rate)

-- WPM Range Coverage:
-- - Beginner (40-60 WPM): 4 bots
-- - Intermediate (60-80 WPM): 3 bots
-- - Advanced (80-120 WPM): 3 bots

-- This distribution ensures:
-- 1. All skill levels have appropriate opponents
-- 2. Matchmaking can find bots within ±10 WPM for most users
-- 3. Personality variety prevents repetitive racing
-- 4. Error rates reflect realistic typing behavior per speed tier

-- ============================================
-- BONUS: SAMPLE MATCHMAKING QUERIES
-- ============================================

-- Find bots for a 70 WPM user (±10 WPM range):
-- SELECT * FROM race_bots
-- WHERE active = TRUE
--   AND target_wpm BETWEEN 60 AND 80
-- ORDER BY RANDOM()
-- LIMIT 3;

-- Find bots with diverse personalities for 65 WPM user:
-- WITH ranked AS (
--   SELECT *,
--     ROW_NUMBER() OVER (PARTITION BY personality ORDER BY ABS(target_wpm - 65)) as rn
--   FROM race_bots
--   WHERE active = TRUE
-- )
-- SELECT name, target_wpm, personality
-- FROM ranked
-- WHERE rn = 1
-- LIMIT 3;

-- ============================================
-- SEED COMPLETE
-- ============================================
