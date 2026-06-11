import { useEffect, useState } from 'react';
import { setupDiscord } from './discord';
import { api, setAccessToken } from './api';
import Board from './components/Board';
import Results from './components/Results';

function formatExpiry(expiresAt) {
  const mins = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
  if (mins >= 90) return `${Math.round(mins / 60)}h left`;
  return `${mins}m left`;
}

export default function App() {
  const [phase, setPhase] = useState('loading'); // loading | picker | game | done | error
  const [error, setError] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [puzzles, setPuzzles] = useState([]);
  const [game, setGame] = useState(null); // { gameId, state }
  const [finale, setFinale] = useState(null); // { name, groups, entry?, leaderboard, gaveUp? }

  useEffect(() => {
    (async () => {
      try {
        const c = await setupDiscord();
        setAccessToken(c.accessToken);
        setCtx(c);
        if (!c.guildId) {
          throw new Error('Connections must be launched from a server channel.');
        }
        const { puzzles } = await api.listPuzzles(c.guildId);
        setPuzzles(puzzles);
        setPhase('picker');
      } catch (err) {
        setError(err.message);
        setPhase('error');
      }
    })();
  }, []);

  async function openPuzzle(puzzle) {
    try {
      const res = await api.startSession(puzzle.id, ctx.channelId);
      if (res.alreadyPlayed) {
        setFinale({
          name: res.name,
          groups: res.groups,
          entry: res.entry,
          leaderboard: res.leaderboard,
          alreadyPlayed: true,
        });
        setPhase('done');
      } else {
        setGame({ gameId: puzzle.id, state: res.state });
        setPhase('game');
      }
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }

  function handleFinish(result) {
    setFinale(result);
    setGame(null);
    setPhase('done');
  }

  async function backToPicker() {
    setFinale(null);
    setGame(null);
    try {
      const { puzzles } = await api.listPuzzles(ctx.guildId);
      setPuzzles(puzzles);
      setPhase('picker');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="screen center">
        <div className="spinner" />
        <p>Connecting to Discord…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="screen center">
        <h1>🧩 Connections</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (phase === 'picker') {
    return (
      <div className="screen">
        <header className="header">
          <h1>🧩 Connections</h1>
          <p className="subtitle">
            Hey {ctx.user.global_name || ctx.user.username} — pick a puzzle. Find four groups of
            four!
          </p>
        </header>
        {puzzles.length === 0 ? (
          <p className="empty">
            No active puzzles in this server. Create one with <code>/ccon</code>!
          </p>
        ) : (
          <ul className="puzzle-list">
            {puzzles.map((p) => (
              <li key={p.id}>
                <button className="puzzle-card" onClick={() => openPuzzle(p)}>
                  <span className="puzzle-name">{p.name}</span>
                  <span className="puzzle-meta">
                    {p.played ? '✅ played' : '▶ play'} · {formatExpiry(p.expiresAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (phase === 'game') {
    return <Board gameId={game.gameId} initialState={game.state} onFinish={handleFinish} onExit={backToPicker} />;
  }

  return <Results finale={finale} onBack={backToPicker} />;
}
