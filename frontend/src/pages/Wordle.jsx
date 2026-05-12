import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { sfx } from '../sfx';
import Confetti from '../components/Confetti';

const MAX_GUESSES = 6;

export default function Wordle() {
  const [guesses, setGuesses] = useState([]); // [{letters: [{letter, status}]}]
  const [current, setCurrent] = useState('');
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [word, setWord] = useState('');
  const [error, setError] = useState('');
  const [wordLength, setWordLength] = useState(5);
  const inputRef = useRef(null);

  useEffect(() => {
    api.wordleInfo().then((d) => setWordLength(d.length)).catch(() => {});
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [guesses]);

  const submit = async (e) => {
    e?.preventDefault();
    if (won || lost) return;
    if (current.length !== wordLength) { setError(`Нужно ${wordLength} букв`); return; }
    setError('');
    try {
      const res = await api.wordleGuess(current);
      setGuesses((g) => [...g, { letters: res.result }]);
      setCurrent('');
      if (res.won) {
        setWon(true);
        setWord(res.word);
        sfx.win();
        api.submitWordle(guesses.length + 1, true).catch(() => {});
      } else if (guesses.length + 1 >= MAX_GUESSES) {
        setLost(true);
        sfx.wrong();
        api.submitWordle(MAX_GUESSES, false).catch(() => {});
      } else {
        sfx.tap();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const statusColor = { correct: 'bg-emerald-500 text-white', present: 'bg-amber-400 text-white', absent: 'bg-paper-300 text-paper-700' };

  return (
    <div className="max-w-sm mx-auto space-y-5 text-center">
      <Confetti show={won} />
      <div className="space-y-2">
        <p className="text-5xl">📝</p>
        <h1 className="text-2xl font-bold">Слова</h1>
        <p className="text-paper-600 text-sm">Угадай слово из {wordLength} букв за {MAX_GUESSES} попыток</p>
      </div>

      {/* Guesses */}
      <div className="space-y-2">
        {guesses.map((g, gi) => (
          <div key={gi} className="flex gap-1 justify-center">
            {g.letters.map((l, li) => (
              <div key={li} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-lg ${statusColor[l.status]}`}>
                {l.letter}
              </div>
            ))}
          </div>
        ))}
        {/* Empty rows */}
        {!won && !lost && Array.from({ length: MAX_GUESSES - guesses.length - 1 }).map((_, i) => (
          <div key={`e${i}`} className="flex gap-1 justify-center">
            {Array.from({ length: wordLength }).map((_, j) => (
              <div key={j} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-paper-300" />
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      {!won && !lost && (
        <form onSubmit={submit} className="flex gap-2 justify-center">
          <input
            ref={inputRef}
            className="input text-center uppercase font-bold tracking-widest max-w-[200px]"
            value={current}
            onChange={(e) => setCurrent(e.target.value.replace(/[^а-яёА-ЯЁ]/g, '').slice(0, wordLength).toUpperCase())}
            maxLength={wordLength}
            placeholder={'_'.repeat(wordLength)}
            autoFocus
          />
          <button className="btn" type="submit" disabled={current.length !== wordLength}>→</button>
        </form>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {won && (
        <div className="card p-5 space-y-2 animate-pop">
          <p className="text-xl font-bold">🎉 Угадал!</p>
          <p className="text-paper-600">Слово: <span className="font-bold">{word}</span></p>
          <p className="text-sm text-paper-500">Попыток: {guesses.length}/{MAX_GUESSES}</p>
        </div>
      )}

      {lost && (
        <div className="card p-5 space-y-2 animate-pop">
          <p className="text-xl font-bold">😢 Не угадал</p>
          <p className="text-paper-600 text-sm">Новое слово через 2 часа. Попробуй снова!</p>
        </div>
      )}
    </div>
  );
}
