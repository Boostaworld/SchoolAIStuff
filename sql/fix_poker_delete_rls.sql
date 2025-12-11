-- =============================================
-- FIX: Admin Delete Permissions for Poker Games
-- =============================================
-- Run this in Supabase SQL Editor
-- 
-- ISSUE: RLS policies block DELETE operations
-- SOLUTION: Add admin override to DELETE policies

-- 1. POKER GAMES DELETE POLICY
DROP POLICY IF EXISTS "Host can delete their games" ON poker_games;
DROP POLICY IF EXISTS "Admins can delete any poker game" ON poker_games;
DROP POLICY IF EXISTS "Host or admins can delete poker games" ON poker_games;

CREATE POLICY "Host or admins can delete poker games"
  ON poker_games FOR DELETE
  USING (
    auth.uid() = host_user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 2. POKER GAME PLAYERS DELETE POLICY
DROP POLICY IF EXISTS "Players can leave games" ON poker_game_players;
DROP POLICY IF EXISTS "Admins can remove any player" ON poker_game_players;
DROP POLICY IF EXISTS "Players or admins can delete player records" ON poker_game_players;

CREATE POLICY "Players or admins can delete player records"
  ON poker_game_players FOR DELETE
  USING (
    auth.uid() = user_id
    OR is_ai = true -- Allow deleting AI players (no user_id)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 3. POKER ACTIONS INSERT POLICY (CRITICAL - allows players to take actions)
DROP POLICY IF EXISTS "Players can insert actions" ON poker_actions;

CREATE POLICY "Players can insert actions"
  ON poker_actions FOR INSERT
  WITH CHECK (
    -- Allow if user is a player in this game
    EXISTS (
      SELECT 1 FROM poker_game_players
      WHERE game_id = poker_actions.game_id
      AND (user_id = auth.uid() OR is_ai = true)
    )
  );

-- 4. POKER ACTIONS DELETE POLICY (Admin only)
DROP POLICY IF EXISTS "Admins can delete poker actions" ON poker_actions;

CREATE POLICY "Admins can delete poker actions"
  ON poker_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Verify policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('poker_games', 'poker_game_players', 'poker_actions')
ORDER BY tablename, policyname;
