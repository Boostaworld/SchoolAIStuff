-- ============================================
-- SUPABASE CLEANUP MIGRATION
-- Generated: 2025-12-11
-- ============================================
-- This file contains safe removal steps for unused database resources.
-- Run in phases, monitoring for errors between each phase.
--
-- INSTRUCTIONS:
-- 1. Run PHASE 1 queries in Supabase SQL Editor
-- 2. Monitor your app for 7 days
-- 3. If no errors, run PHASE 2 queries
-- 4. Run FINAL CLEANUP after another 7 days
-- ============================================

-- ============================================
-- VERIFICATION QUERIES (Run First)
-- ============================================
-- Check row counts before cleanup
SELECT 'typing_challenges' as table_name, count(*) as row_count FROM typing_challenges
UNION ALL SELECT 'typing_sessions', count(*) FROM typing_sessions
UNION ALL SELECT 'typing_stats', count(*) FROM typing_stats
UNION ALL SELECT 'typing_history', count(*) FROM typing_history
UNION ALL SELECT 'race_replays', count(*) FROM race_replays
UNION ALL SELECT 'typing_races', count(*) FROM typing_races
UNION ALL SELECT 'race_participants', count(*) FROM race_participants
UNION ALL SELECT 'race_lobbies', count(*) FROM race_lobbies
UNION ALL SELECT 'challenge_generation_queue', count(*) FROM challenge_generation_queue
UNION ALL SELECT 'contracts', count(*) FROM contracts
UNION ALL SELECT 'user_settings', count(*) FROM user_settings
UNION ALL SELECT 'poker_statistics', count(*) FROM poker_statistics
UNION ALL SELECT 'poker_hand_history', count(*) FROM poker_hand_history;

-- Check unused profile columns
SELECT 
  count(*) FILTER (WHERE max_wpm > 0) as has_max_wpm,
  count(*) FILTER (WHERE races_won > 0) as has_races_won,
  count(*) FILTER (WHERE races_participated > 0) as has_races_participated,
  count(*) FILTER (WHERE daily_streak > 0) as has_daily_streak,
  count(*) FILTER (WHERE last_daily_completion IS NOT NULL) as has_last_daily,
  count(*) FILTER (WHERE intel_queries > 0) as has_intel_queries,
  count(*) FILTER (WHERE current_theme_id IS NOT NULL) as has_theme_id,
  count(*) FILTER (WHERE active_session_start IS NOT NULL) as has_active_session
FROM profiles;

-- ============================================
-- PHASE 1: DROP UNUSED FUNCTIONS (Safe)
-- ============================================
-- These functions have zero code references

DROP FUNCTION IF EXISTS reset_daily_poker_winnings();
DROP FUNCTION IF EXISTS calculate_poker_winnings(INTEGER, BOOLEAN, VARCHAR, UUID);
DROP FUNCTION IF EXISTS create_contract(UUID, TEXT, TEXT, INTEGER, JSONB, TIMESTAMP);

-- ============================================
-- PHASE 1: REMOVE FROM REALTIME PUBLICATION
-- ============================================
-- These tables are in realtime but unused

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS typing_races;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS race_participants;

-- ============================================
-- PHASE 1: RENAME UNUSED TABLES (Reversible)
-- ============================================
-- Renaming instead of dropping allows easy rollback

-- Typing/Racing System Tables
ALTER TABLE IF EXISTS typing_challenges RENAME TO _deprecated_typing_challenges;
ALTER TABLE IF EXISTS typing_sessions RENAME TO _deprecated_typing_sessions;
ALTER TABLE IF EXISTS typing_stats RENAME TO _deprecated_typing_stats;
ALTER TABLE IF EXISTS typing_history RENAME TO _deprecated_typing_history;
ALTER TABLE IF EXISTS race_replays RENAME TO _deprecated_race_replays;
ALTER TABLE IF EXISTS typing_races RENAME TO _deprecated_typing_races;
ALTER TABLE IF EXISTS race_participants RENAME TO _deprecated_race_participants;
ALTER TABLE IF EXISTS race_lobbies RENAME TO _deprecated_race_lobbies;
ALTER TABLE IF EXISTS challenge_generation_queue RENAME TO _deprecated_challenge_generation_queue;

-- Other Unused Tables
ALTER TABLE IF EXISTS contracts RENAME TO _deprecated_contracts;
ALTER TABLE IF EXISTS user_settings RENAME TO _deprecated_user_settings;
ALTER TABLE IF EXISTS poker_statistics RENAME TO _deprecated_poker_statistics;
ALTER TABLE IF EXISTS poker_hand_history RENAME TO _deprecated_poker_hand_history;

-- ============================================
-- PHASE 2: DROP UNUSED PROFILE COLUMNS
-- ============================================
-- NOTE: For max_wpm, update code FIRST to remove references
-- in store/useOrbitStore.ts lines 1595, 1596, 1651

-- Safe to remove immediately (zero references)
ALTER TABLE profiles DROP COLUMN IF EXISTS races_won;
ALTER TABLE profiles DROP COLUMN IF EXISTS races_participated;
ALTER TABLE profiles DROP COLUMN IF EXISTS daily_streak;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_daily_completion;
ALTER TABLE profiles DROP COLUMN IF EXISTS intel_queries;
ALTER TABLE profiles DROP COLUMN IF EXISTS current_theme_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS active_session_start;

-- Run AFTER code is updated:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS max_wpm;

-- ============================================
-- FINAL CLEANUP: DROP DEPRECATED TABLES
-- ============================================
-- Run this ONLY after 7+ days of monitoring with no errors
-- Uncomment when ready

/*
DROP TABLE IF EXISTS _deprecated_typing_challenges CASCADE;
DROP TABLE IF EXISTS _deprecated_typing_sessions CASCADE;
DROP TABLE IF EXISTS _deprecated_typing_stats CASCADE;
DROP TABLE IF EXISTS _deprecated_typing_history CASCADE;
DROP TABLE IF EXISTS _deprecated_race_replays CASCADE;
DROP TABLE IF EXISTS _deprecated_typing_races CASCADE;
DROP TABLE IF EXISTS _deprecated_race_participants CASCADE;
DROP TABLE IF EXISTS _deprecated_race_lobbies CASCADE;
DROP TABLE IF EXISTS _deprecated_challenge_generation_queue CASCADE;
DROP TABLE IF EXISTS _deprecated_contracts CASCADE;
DROP TABLE IF EXISTS _deprecated_user_settings CASCADE;
DROP TABLE IF EXISTS _deprecated_poker_statistics CASCADE;
DROP TABLE IF EXISTS _deprecated_poker_hand_history CASCADE;
*/

-- ============================================
-- ROLLBACK COMMANDS (if needed)
-- ============================================
/*
-- Restore renamed tables
ALTER TABLE _deprecated_typing_challenges RENAME TO typing_challenges;
ALTER TABLE _deprecated_typing_sessions RENAME TO typing_sessions;
-- ... etc

-- Add back realtime
ALTER PUBLICATION supabase_realtime ADD TABLE typing_races;
ALTER PUBLICATION supabase_realtime ADD TABLE race_participants;
*/

-- ============================================
-- POST-CLEANUP VERIFICATION
-- ============================================
-- Run after cleanup to verify

-- Check table sizes after cleanup
SELECT 
  schemaname || '.' || relname as table_name,
  pg_size_pretty(pg_table_size(relid)) as size,
  n_live_tup as rows
FROM pg_stat_user_tables 
WHERE relname NOT LIKE '_deprecated%'
ORDER BY pg_table_size(relid) DESC;

-- Check profile columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;
