-- FIX: Add missing columns and fix types for Poker Games
-- This resolves 400 Bad Request errors caused by schema mismatches.

-- 1. Add 'last_action' columns for game feed
ALTER TABLE poker_games ADD COLUMN IF NOT EXISTS last_action TEXT;
ALTER TABLE poker_games ADD COLUMN IF NOT EXISTS last_action_amount INTEGER;

-- 2. Ensure 'current_turn_player_id' exists (critical for turn logic)
ALTER TABLE poker_games ADD COLUMN IF NOT EXISTS current_turn_player_id UUID;

-- 3. Relax 'winning_hand' type to TEXT to allow string descriptions (e.g. "Royal Flush", "Last Standing")
--    JSONB is too strict if we just want to save a display string.
DO $$ 
BEGIN 
    -- Only alter if it's not already TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'poker_games' 
        AND column_name = 'winning_hand' 
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE poker_games ALTER COLUMN winning_hand TYPE TEXT USING winning_hand::TEXT;
    END IF;
END $$;

-- 4. Create index for performance if missing
CREATE INDEX IF NOT EXISTS idx_poker_games_turn ON poker_games(current_turn_player_id);

COMMENT ON COLUMN poker_games.last_action IS 'Description of the last performed action for UI feed';
