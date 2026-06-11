import { useState } from 'react';
import { api } from '../api';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Board({ gameId, initialState, onFinish, onExit }) {
  const [words, setWords] = useState(initialState.words);
  const [solvedGroups, setSolvedGroups] = useState(initialState.solvedGroups);
  const [attempts, setAttempts] = useState(initialState.attempts);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [busy, setBusy] = useState(false);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  function toggleWord(word) {
    setSelected((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
  }

  async function submit() {
    if (selected.length !== 4 || busy) return;
    setBusy(true);
    try {
      const res = await api.submitGuess(gameId, selected);
      const { result } = res;

      if (res.finished) {
        onFinish({
          name: initialState.name,
          groups: res.groups,
          entry: res.entry,
          leaderboard: res.leaderboard,
          justFinished: true,
        });
        return;
      }

      if (result.type === 'duplicate') {
        showToast('Already guessed that combination');
      } else if (result.type === 'correct') {
        setSolvedGroups(res.state.solvedGroups);
        setWords(res.state.words);
        setSelected([]);
        showToast(`✅ ${result.group.description}`);
      } else {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        showToast(result.type === 'one-away' ? '🟡 You were one word off!' : '❌ Not a group');
      }
      setAttempts(res.state.attempts);
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function giveUp() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.giveUp(gameId);
      onFinish({ name: res.name, groups: res.groups, leaderboard: res.leaderboard, gaveUp: true });
    } catch (err) {
      showToast(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <header className="header board-header">
        <button className="link-btn" onClick={onExit}>← puzzles</button>
        <h1>{initialState.name}</h1>
        <span className="attempts">Guesses: {attempts}</span>
      </header>

      <div className="solved-area">
        {solvedGroups.map((g) => (
          <div key={g.color} className={`solved-banner ${g.color}`}>
            <strong>{g.words.map((w) => w.toUpperCase()).join(', ')}</strong>
            <span>{g.description}</span>
          </div>
        ))}
      </div>

      <div className={`grid ${shaking ? 'shake' : ''}`}>
        {words.map((word) => (
          <button
            key={word}
            className={`tile ${selected.includes(word) ? 'selected' : ''}`}
            onClick={() => toggleWord(word)}
            disabled={busy}
          >
            {word.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="controls">
        <button className="ctrl-btn" onClick={() => setWords(shuffle(words))} disabled={busy}>
          🔀 Shuffle
        </button>
        <button
          className="ctrl-btn"
          onClick={() => setSelected([])}
          disabled={busy || selected.length === 0}
        >
          Deselect
        </button>
        <button
          className="ctrl-btn primary"
          onClick={submit}
          disabled={busy || selected.length !== 4}
        >
          Submit
        </button>
        <button className="ctrl-btn danger" onClick={giveUp} disabled={busy}>
          🏳️ Give Up
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
