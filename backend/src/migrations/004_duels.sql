CREATE TABLE IF NOT EXISTS duels (
  id TEXT PRIMARY KEY,
  puzzle_id INT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  creator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id INT REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting',   -- waiting | running | finished
  winner_id INT REFERENCES users(id) ON DELETE SET NULL,
  creator_finished_at TIMESTAMPTZ,
  opponent_finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_duels_creator ON duels(creator_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent ON duels(opponent_id);
