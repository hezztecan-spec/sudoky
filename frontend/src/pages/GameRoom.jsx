import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';
import { useWs } from '../useWs';
import { sfx } from '../sfx';
import Confetti from '../components/Confetti';
import BattleshipBoard from './BattleshipBoard';

export default function GameRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await api.getSession(id);
      setSession(s);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useWs((msg) => {
    if (!msg || msg.sessionId !== id) return;
    if (msg.type === 'game_move' || msg.type === 'game_start') load();
  });

  if (error) return <p className="text-center text-red-600 pt-10">{error}</p>;
  if (!session) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;

  if (session.status === 'pending') {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 pt-10">
        <p className="text-4xl animate-wiggle">⏳</p>
        <p className="text-lg font-bold">Ждём соперника…</p>
        <p className="text-sm text-paper-600">Вызов отправлен. Как только примут — игра начнётся.</p>
      </div>
    );
  }

  if (session.game_type === 'tictactoe') {
    return <TTTBoard session={session} userId={user?.id} sessionId={id} nav={nav} />;
  }

  if (session.game_type === 'battleship') {
    return <BattleshipBoard session={session} userId={user?.id} sessionId={id} onUpdate={load} />;
  }

  return <p className="text-center text-paper-500 pt-10">Игра {session.game_type} пока не реализована на фронте</p>;
}

function TTTBoard({ session, userId, sessionId, nav }) {
  const state = typeof session.state === 'string' ? JSON.parse(session.state) : session.state;
  const board = state?.board || Array(9).fill(null);
  const isMyTurn = state?.turnUserId === userId;
  const finished = session.status === 'finished';
  const iWon = finished && session.winner_id === userId;
  const isDraw = finished && !session.winner_id;
  const iLost = finished && session.winner_id && session.winner_id !== userId;

  const mySymbol = session.player1_id === userId ? 'X' : 'O';
  const opponentName = session.player1_id === userId ? session.p2_name : session.p1_name;

  const makeMove = async (idx) => {
    if (!isMyTurn || finished || board[idx] !== null) return;
    sfx.tap();
    try {
      await api.makeMove(sessionId, idx);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto space-y-5 text-center">
      <Confetti show={iWon} />

      <div className="space-y-1">
        <h1 className="text-xl font-bold">❌⭕ vs {opponentName}</h1>
        <p className="text-sm text-paper-600">
          Ты играешь за <span className="font-bold">{mySymbol}</span>
        </p>
      </div>

      {!finished && (
        <p className={`text-sm font-medium ${isMyTurn ? 'text-black' : 'text-paper-500'}`}>
          {isMyTurn ? '👉 Твой ход' : '⏳ Ход соперника…'}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => makeMove(idx)}
            disabled={!isMyTurn || finished || cell !== null}
            className={`aspect-square rounded-xl text-3xl font-bold flex items-center justify-center transition
              ${cell === null && isMyTurn && !finished ? 'bg-paper-100 hover:bg-paper-200 cursor-pointer' : 'bg-paper-100'}
              ${cell === 'X' ? 'text-black' : 'text-paper-700'}
              active:scale-95`}
          >
            {cell}
          </button>
        ))}
      </div>

      {finished && (
        <div className="card p-5 space-y-3 animate-pop">
          <p className="text-3xl">{iWon ? '🏆' : isDraw ? '🤝' : '💀'}</p>
          <p className="text-lg font-bold">
            {iWon ? 'Победа! +10 pts' : isDraw ? 'Ничья! +3 pts' : 'Поражение'}
          </p>
          <div className="flex gap-2 justify-center">
            <button className="btn-ghost" onClick={() => nav('/tictactoe')}>Ещё раз</button>
            <button className="btn" onClick={() => nav('/')}>На главную</button>
          </div>
        </div>
      )}
    </div>
  );
}
