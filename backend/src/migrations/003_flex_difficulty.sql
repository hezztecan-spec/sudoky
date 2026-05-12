-- Убираем ограничение на difficulty чтобы поддержать 7 уровней
ALTER TABLE puzzles DROP CONSTRAINT IF EXISTS puzzles_difficulty_check;
-- active_from/active_to теперь timestamptz для 2-часовых слотов
ALTER TABLE puzzles ALTER COLUMN active_from TYPE TIMESTAMPTZ USING active_from::timestamptz;
ALTER TABLE puzzles ALTER COLUMN active_to TYPE TIMESTAMPTZ USING active_to::timestamptz;
