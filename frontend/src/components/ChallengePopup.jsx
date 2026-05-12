import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useWs } from '../useWs';
import { sfx } from '../sfx';

export default function ChallengePopup() {
  const [challenge, setChallenge] = useState(null);
  const [declined, setDeclined] = useState(null); // {by: {username}}
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
    if (msg.type === 'challenge_declined') {
      setDeclined(msg);
      setTimeout(() => setDeclined(null), 4000);
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

  useEffect(() => {
    if (!challenge) return;
    const t = setTimeout(() => setChallenge(null), 30000);
    return () => clearTimeout(t);
  }, [challenge]);

  const gameNames = { tictactoe: 'Крестики-нолики', battleship: 'Морской бой', reaction: 'Реакция', memory: 'Память' };

  return (
    <>
      {/* Входящий вызов */}
      {challenge && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto card p-4 shadow-lg animate-pop border-2 border-black dark:border-white">
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
      )}

      {/* Уведомление об отказе */}
      {declined && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto card p-4 shadow-lg animate-pop border border-red-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl">😔</span>
            <p className="text-sm">
              <span className="font-bold">{declined.by?.username || 'Соперник'}</span> отклонил вызов
            </p>
          </div>
        </div>
      )}
    </>
  );
}
