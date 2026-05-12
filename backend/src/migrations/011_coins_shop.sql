ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS shop_items (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,  -- frame, title, color, emoji
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  data JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_items (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  equipped BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

-- Начальные товары
INSERT INTO shop_items (code, category, name, description, price, data) VALUES
  ('frame_gold', 'frame', 'Золотая рамка', 'Золотая рамка вокруг аватарки', 500, '{"border":"3px solid #fbbf24"}'),
  ('frame_neon', 'frame', 'Неоновая рамка', 'Светящаяся рамка', 800, '{"border":"3px solid #22d3ee","boxShadow":"0 0 8px #22d3ee"}'),
  ('frame_fire', 'frame', 'Огненная рамка', 'Рамка с огнём', 1000, '{"border":"3px solid #ef4444","boxShadow":"0 0 12px #ef4444"}'),
  ('title_pro', 'title', 'PRO', 'Титул PRO рядом с ником', 300, '{"text":"PRO","color":"#a855f7"}'),
  ('title_legend', 'title', 'LEGEND', 'Титул LEGEND', 1500, '{"text":"LEGEND","color":"#fbbf24"}'),
  ('title_hacker', 'title', 'HACKER', 'Титул HACKER', 700, '{"text":"HACKER","color":"#22c55e"}'),
  ('color_pink', 'color', 'Розовый ник', 'Ник отображается розовым', 200, '{"color":"#ec4899"}'),
  ('color_cyan', 'color', 'Бирюзовый ник', 'Ник отображается бирюзовым', 200, '{"color":"#06b6d4"}'),
  ('color_gold', 'color', 'Золотой ник', 'Ник отображается золотым', 400, '{"color":"#eab308"}'),
  ('emoji_crown', 'emoji', 'Корона 👑', 'Эмодзи рядом с ником', 150, '{"emoji":"👑"}'),
  ('emoji_fire', 'emoji', 'Огонь 🔥', 'Эмодзи рядом с ником', 150, '{"emoji":"🔥"}'),
  ('emoji_star', 'emoji', 'Звезда ⭐', 'Эмодзи рядом с ником', 150, '{"emoji":"⭐"}'),
  ('emoji_diamond', 'emoji', 'Алмаз 💎', 'Эмодзи рядом с ником', 300, '{"emoji":"💎"}')
ON CONFLICT (code) DO NOTHING;
