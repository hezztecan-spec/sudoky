-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  total_points INT DEFAULT 0,
  total_solved INT DEFAULT 0,
  best_time INT,
  rank TEXT DEFAULT 'Новичок',
  avatar_color TEXT DEFAULT '#22d3ee',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Puzzles
CREATE TABLE IF NOT EXISTS puzzles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard','expert')),
  kind TEXT NOT NULL CHECK (kind IN ('daily','weekly','bonus')),
  puzzle TEXT NOT NULL,     -- 81 символ, 0 для пустых
  solution TEXT NOT NULL,   -- 81 символ
  base_points INT NOT NULL DEFAULT 100,
  min_seconds INT NOT NULL DEFAULT 30,
  active_from DATE NOT NULL,
  active_to DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puzzles_active ON puzzles(active_from, active_to);
CREATE INDEX IF NOT EXISTS idx_puzzles_kind ON puzzles(kind);

-- Attempts (одна активная попытка на пару user+puzzle)
CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id INT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_seconds INT,
  is_solved BOOLEAN DEFAULT FALSE,
  points_awarded INT DEFAULT 0,
  UNIQUE (user_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_puzzle ON attempts(puzzle_id);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Daily tasks (динамические, на каждый день/пользователя)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  target INT NOT NULL,
  progress INT DEFAULT 0,
  reward_points INT NOT NULL DEFAULT 50,
  is_completed BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, day, code)
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_day ON daily_tasks(user_id, day);

-- Chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC);

-- Prize pool / seasons
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ends_at DATE NOT NULL,
  prize_pool INT NOT NULL DEFAULT 0,
  finalized BOOLEAN DEFAULT FALSE,
  finalized_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS season_results (
  id SERIAL PRIMARY KEY,
  season_id INT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place INT NOT NULL,
  points INT NOT NULL,
  prize INT NOT NULL DEFAULT 0
);
