-- =============================================
-- POKER GAME SYSTEM - DATABASE SCHEMA
-- =============================================
-- Texas Hold'em poker with real-time multiplayer
-- 10% house rake, AI difficulty modifiers, daily diminishing returns
-- =============================================

-- Poker Games Table
CREATE TABLE IF NOT EXISTS poker_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_type VARCHAR(20) DEFAULT 'practice', -- 'practice' or 'multiplayer'
  ai_difficulty VARCHAR(20), -- 'novice', 'intermediate', 'expert' (for practice)
  buy_in INTEGER NOT NULL CHECK (buy_in > 0),
  max_players INTEGER NOT NULL DEFAULT 6 CHECK (max_players BETWEEN 2 AND 6),
  current_players INTEGER DEFAULT 1,
  
  -- Game State
  status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed'
  current_round VARCHAR(20), -- 'pre_flop', 'flop', 'turn', 'river', 'showdown'
  current_turn_player_id UUID,
  dealer_position INTEGER DEFAULT 0,
  small_blind INTEGER DEFAULT 5,
  big_blind INTEGER DEFAULT 10,
  
  -- Pot & Cards
  pot_amount INTEGER DEFAULT 0,
  community_cards JSONB DEFAULT '[]'::jsonb, -- Array of card objects [{suit, rank}]
  deck JSONB, -- Remaining cards in deck
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Metadata
  winner_id UUID REFERENCES profiles(id),
  winning_hand JSONB,
  final_pot_amount INTEGER,
  house_rake_amount INTEGER -- 10% of pot
);

-- Game Players (both human and AI)
CREATE TABLE IF NOT EXISTS poker_game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES poker_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Player State
  is_ai BOOLEAN DEFAULT FALSE,
  ai_name VARCHAR(100),
  position INTEGER NOT NULL, -- Seat position 0-5
  chips INTEGER NOT NULL, -- Current chips in play
  current_bet INTEGER DEFAULT 0,
  is_folded BOOLEAN DEFAULT FALSE,
  is_all_in BOOLEAN DEFAULT FALSE,
  
  -- Cards (hole cards - private)
  hole_cards JSONB DEFAULT '[]'::jsonb, -- [{suit, rank}, {suit, rank}]
  
  -- Result
  final_position INTEGER, -- 1st, 2nd, 3rd, etc.
  winnings INTEGER DEFAULT 0,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(game_id, position),
  UNIQUE(game_id, user_id)
);

-- Action Log (complete history of all actions)
CREATE TABLE IF NOT EXISTS poker_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES poker_games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES poker_game_players(id) ON DELETE CASCADE,
  
  action_type VARCHAR(20) NOT NULL, -- 'fold', 'check', 'call', 'raise', 'all_in'
  amount INTEGER DEFAULT 0,
  round VARCHAR(20) NOT NULL, -- 'pre_flop', 'flop', 'turn', 'river'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Statistics (aggregated stats)
CREATE TABLE IF NOT EXISTS poker_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Overall Stats
  total_games_played INTEGER DEFAULT 0,
  total_games_won INTEGER DEFAULT 0,
  total_hands_played INTEGER DEFAULT 0,
  total_coins_wagered INTEGER DEFAULT 0,
  total_coins_won INTEGER DEFAULT 0,
  total_coins_lost INTEGER DEFAULT 0,
  
  -- Daily Tracking (for diminishing returns)
  daily_winnings INTEGER DEFAULT 0,
  daily_winnings_date DATE DEFAULT CURRENT_DATE,
  
  -- Best Records
  biggest_pot_won INTEGER DEFAULT 0,
  best_hand_rank INTEGER DEFAULT 0, -- 0=high card, 9=royal flush
  longest_win_streak INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  
  -- AI Practice Stats
  novice_games_won INTEGER DEFAULT 0,
  intermediate_games_won INTEGER DEFAULT 0,
  expert_games_won INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hand History (for replays and analysis)
CREATE TABLE IF NOT EXISTS poker_hand_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES poker_games(id) ON DELETE CASCADE,
  
  -- Complete game state snapshot
  players JSONB NOT NULL, -- All player states
  community_cards JSONB,
  pot_amount INTEGER,
  actions JSONB, -- All actions in this hand
  winner_id UUID,
  winning_hand JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE poker_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_hand_history ENABLE ROW LEVEL SECURITY;

-- Poker Games Policies
CREATE POLICY "Anyone can view active games" ON poker_games
  FOR SELECT USING (status IN ('waiting', 'in_progress'));

CREATE POLICY "Authenticated users can create games" ON poker_games
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their games" ON poker_games
  FOR UPDATE USING (auth.uid() = host_user_id);

CREATE POLICY "System can update game state" ON poker_games
  FOR UPDATE USING (true); -- Server-side updates

-- Game Players Policies
CREATE POLICY "Anyone can view players in active games" ON poker_game_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM poker_games
      WHERE id = game_id AND status IN ('waiting', 'in_progress')
    )
  );

CREATE POLICY "Users can join games" ON poker_game_players
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_ai = true);

CREATE POLICY "Players can update their own state" ON poker_game_players
  FOR UPDATE USING (auth.uid() = user_id);

-- Actions Policies
CREATE POLICY "Players in game can view actions" ON poker_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM poker_game_players
      WHERE game_id = poker_actions.game_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players can record their actions" ON poker_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM poker_game_players
      WHERE id = player_id AND user_id = auth.uid()
    )
  );

-- Statistics Policies
CREATE POLICY "Users can view own statistics" ON poker_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view others' statistics" ON poker_statistics
  FOR SELECT USING (true);

CREATE POLICY "System can update statistics" ON poker_statistics
  FOR ALL USING (true);

-- Hand History Policies
CREATE POLICY "Players can view hand history from their games" ON poker_hand_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM poker_game_players
      WHERE game_id = poker_hand_history.game_id AND user_id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to reset daily winnings at midnight
CREATE OR REPLACE FUNCTION reset_daily_poker_winnings()
RETURNS void AS $$
BEGIN
  UPDATE poker_statistics
  SET daily_winnings = 0, daily_winnings_date = CURRENT_DATE
  WHERE daily_winnings_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate actual winnings with modifiers
CREATE OR REPLACE FUNCTION calculate_poker_winnings(
  p_raw_winnings INTEGER,
  p_is_practice BOOLEAN,
  p_ai_difficulty VARCHAR,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_ai_modifier DECIMAL := 1.0;
  v_daily_modifier DECIMAL := 1.0;
  v_current_daily INTEGER;
  v_final_winnings INTEGER;
BEGIN
  -- Apply AI difficulty modifier (practice games only)
  IF p_is_practice THEN
    CASE p_ai_difficulty
      WHEN 'novice' THEN v_ai_modifier := 0.20; -- 80% reduction
      WHEN 'intermediate' THEN v_ai_modifier := 0.60; -- 40% reduction
      WHEN 'expert' THEN v_ai_modifier := 1.00; -- Full rewards
      ELSE v_ai_modifier := 1.0;
    END CASE;
  END IF;
  
  -- Get current daily winnings
  SELECT COALESCE(daily_winnings, 0) INTO v_current_daily
  FROM poker_statistics
  WHERE user_id = p_user_id;
  
  -- Apply daily diminishing returns
  IF v_current_daily >= 501 THEN
    v_daily_modifier := 0.25; -- 75% reduction
  ELSIF v_current_daily >= 201 THEN
    v_daily_modifier := 0.50; -- 50% reduction
  ELSE
    v_daily_modifier := 1.00; -- Full amount
  END IF;
  
  -- Calculate final winnings
  v_final_winnings := FLOOR(p_raw_winnings * v_ai_modifier * v_daily_modifier);
  
  RETURN v_final_winnings;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_poker_games_status ON poker_games(status);
CREATE INDEX idx_poker_games_host ON poker_games(host_user_id);
CREATE INDEX idx_poker_game_players_game ON poker_game_players(game_id);
CREATE INDEX idx_poker_game_players_user ON poker_game_players(user_id);
CREATE INDEX idx_poker_actions_game ON poker_actions(game_id);
CREATE INDEX idx_poker_statistics_user ON poker_statistics(user_id);
CREATE INDEX idx_poker_statistics_daily ON poker_statistics(daily_winnings_date);

-- =============================================
-- INITIAL SETUP
-- =============================================

COMMENT ON TABLE poker_games IS 'Texas Hold''em poker games with real-time multiplayer and AI practice mode';
COMMENT ON TABLE poker_game_players IS 'Players in poker games (both human and AI opponents)';
COMMENT ON TABLE poker_actions IS 'Complete action log for game replay and analysis';
COMMENT ON TABLE poker_statistics IS 'Aggregated player statistics with daily tracking for diminishing returns';
COMMENT ON TABLE poker_hand_history IS 'Hand history for replays and analysis';
