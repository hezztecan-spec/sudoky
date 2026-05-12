import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useWs } from '../useWs';
import { sfx } from '../sfx';

export default function ChallengePopup() {
  const [challenge, setChallenge] = useState(null);
  const nav = useNavigate();

  useWs((msg) => {
    if (msg.type === 'challenge') {
      sfx.tap();
      setChallenge(msg);
    }
    if (msg.type === 'game_start' && challenge && msg.sessionId === challenge.sessionId) {
      nav(`/game/${challenge.sessionId}`);
      setChallenge(null);
    }
  });

  const accept = async () => {
    try {
      await api.acceptChallenge(challenge.sessionId);
      nav(`/game/${challenge.sessionId}`);
      setChallenge(null);
    } catch { /* ignore */ }
  };

  const decline = async () => {
    try {
      await api.declineChallenge(challenge.sessionId);
    } catch { /* ignore */ }
    setChallenge(null);
  };

  // Автоматически скрываем через 30 сек
  useEffect(() => {
    if (!challenge) return;
    const t = setTimeout(() => setChallenge(null), 30000);
    return () => clearTimeout(t);
  }, [challenge]);

  if (!challenge) return null;

  const gameNames = { tictactoe: 'Крестики-нолики', battleship: 'Морской бой', reaction: 'Реакция', memory: 'Память' };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto card p-4 shadow-lg animate-pop border-2 border-black">
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚔️</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{challenge.from.username}</p>
          <p className="text-sm text-paper-600">вызывает тебя в {gameNames[challenge.gameType] || challenge.gameType}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button className="btn-ghost flex-1" onClick={decline}>Отклонить</button>
        <button className="btn flex-1" onClick={accept}>Принять</button>
      </div>
    </div>
  );
}
