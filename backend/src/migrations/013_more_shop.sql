INSERT INTO shop_items (code, category, name, description, price, data) VALUES
  ('frame_rainbow', 'frame', 'Радужная рамка', 'Переливающаяся рамка', 1200, '{"border":"3px solid","borderImage":"linear-gradient(45deg,#ef4444,#eab308,#22c55e,#3b82f6,#a855f7) 1"}'),
  ('frame_matrix', 'frame', 'Матрица', 'Зелёная хакерская рамка', 600, '{"border":"3px solid #22c55e","boxShadow":"0 0 10px #22c55e"}'),
  ('title_boss', 'title', 'BOSS', 'Титул BOSS', 1000, '{"text":"BOSS","color":"#dc2626"}'),
  ('title_ninja', 'title', 'NINJA', 'Титул NINJA', 500, '{"text":"NINJA","color":"#6366f1"}'),
  ('title_chill', 'title', 'CHILL', 'Титул CHILL', 400, '{"text":"CHILL","color":"#06b6d4"}'),
  ('emoji_rocket', 'emoji', 'Ракета 🚀', 'Эмодзи рядом с ником', 200, '{"emoji":"🚀"}'),
  ('emoji_ghost', 'emoji', 'Призрак 👻', 'Эмодзи рядом с ником', 200, '{"emoji":"👻"}'),
  ('emoji_alien', 'emoji', 'Инопланетянин 👽', 'Эмодзи рядом с ником', 250, '{"emoji":"👽"}'),
  ('emoji_skull', 'emoji', 'Череп 💀', 'Эмодзи рядом с ником', 200, '{"emoji":"💀"}'),
  ('color_rainbow', 'color', 'Радужный ник', 'Ник переливается', 800, '{"gradient":"linear-gradient(90deg,#ef4444,#eab308,#22c55e,#3b82f6,#a855f7)"}'),
  ('color_green', 'color', 'Зелёный ник', 'Ник отображается зелёным', 200, '{"color":"#22c55e"}')
ON CONFLICT (code) DO NOTHING;
