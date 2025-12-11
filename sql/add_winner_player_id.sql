-- Adds winner_player_id to allow AI winners without violating profiles FK
ALTER TABLE poker_games
ADD COLUMN IF NOT EXISTS winner_player_id UUID REFERENCES poker_game_players(id);

COMMENT ON COLUMN poker_games.winner_player_id IS 'References poker_game_players.id so AI winners can be recorded without profiles FK issues';
