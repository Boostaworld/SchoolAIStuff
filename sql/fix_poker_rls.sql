-- FIX: Allow AI actions to be inserted by authenticated users (hosts/players)
-- The previous policy only allowed users to insert actions for their OWN player_id.
-- This blocked the client from inserting actions on behalf of AI bots.

DROP POLICY IF EXISTS "Players can record their actions" ON poker_actions;

CREATE POLICY "Players can record actions" ON poker_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM poker_game_players
      WHERE id = player_id AND (
        user_id = auth.uid()  -- User acting for themselves
        OR 
        is_ai = true          -- User acting for an AI bot (e.g. Host processing AI turn)
      )
    )
  );
