const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { getWordForSlot } = require('../utils/words');

const router = express.Router();

// Получить текущее слово (длину и слот, не само слово)
router.get('/info', authRequired, (req, res) => {
  const word = getWordForSlot();
  res.json({ length: word.length, slot: getCurrentSlotId() });
});

// Попытка угадать
router.post('/guess', authRequired, async (req, res) => {
  const guess = String(req.body?.guess || '').toUpperCase().trim();
  const word = getWordForSlot();

  if (guess.length !== word.length) return res.status(400).json({ error: `Слово должно быть ${word.length} букв` });
  if (!/^[А-ЯЁ]+$/.test(guess)) return res.status(400).json({ error: 'Только русские буквы' });

  // Проверяем каждую букву
  const result = [];
  const wordArr = word.split('');
  const used = Array(word.length).fill(false);

  // Сначала точные совпадения
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === wordArr[i]) {
      result[i] = { letter: guess[i], status: 'correct' };
      used[i] = true;
    }
  }
  // Потом неточные
  for (let i = 0; i < guess.length; i++) {
    if (result[i]) continue;
    const idx = wordArr.findIndex((ch, j) => ch === guess[i] && !used[j]);
    if (idx >= 0) {
      result[i] = { letter: guess[i], status: 'present' };
      used[idx] = true;
    } else {
      result[i] = { letter: guess[i], status: 'absent' };
    }
  }

  const won = guess === word;
  res.json({ result, won, word: won ? word : undefined });
});

function getCurrentSlotId() {
  const now = new Date();
  return now.toISOString().slice(0, 10) + '_' + Math.floor(now.getUTCHours() / 2);
}

module.exports = router;
