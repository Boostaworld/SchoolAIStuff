-- FIX: Allow game updates (for advancing rounds, setting winners)
-- The client needs to update 'poker_games' to change status, community_cards, winner_id, etc.

-- 1. Enable RLS on poker_games if not already enabled (it should be, but safety first)
ALTER TABLE poker_games ENABLE ROW LEVEL SECURITY;

-- 2. Allow Host (or any player) to update the game
-- ideally only the host should drive the game state, but for this MVP 
-- any active player might trigger the update via client-side logic.
-- We'll restrict it to the Host for better security fallback, 
-- assuming the client running the 'advanceGameStage' is the host.

DROP POLICY IF EXISTS "Hosts can update their games" ON poker_games;

CREATE POLICY "Hosts can update their games" ON poker_games
  FOR UPDATE
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

-- FALLBACK: If we want ANY player to be able to advance state (e.g. if host disconnects logic?)
-- For now, let's Stick to HOST only. If you are testing as non-host and it fails, we can expand.

-- 3. Also ensure INSERT permissions (Creating games)
DROP POLICY IF EXISTS "Authenticated users can create games" ON poker_games;
CREATE POLICY "Authenticated users can create games" ON poker_games
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 4. READ permissions (Everyone can see games)
DROP POLICY IF EXISTS "Everyone can view games" ON poker_games;
CREATE POLICY "Everyone can view games" ON poker_games
  FOR SELECT
  USING (true);
