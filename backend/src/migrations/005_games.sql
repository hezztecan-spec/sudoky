-- Универсальная таблица игровых сессий (крестики-нолики, морской бой и т.д.)
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,  -- tictactoe, battleship, etc.
  player1_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id INT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, finished, declined
  state JSONB NOT NULL DEFAULT '{}',
  winner_id INT REFERENCES users(id) ON DELETE SET NULL,
  turn_user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gs_players ON game_sessions(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_gs_status ON game_sessions(status);

-- Очки по играм
CREATE TABLE IF NOT EXISTS game_scores (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  session_id TEXT REFERENCES game_sessions(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gscores_user_game ON game_scores(user_id, game_type);
