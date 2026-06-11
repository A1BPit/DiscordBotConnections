function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Results({ finale, onBack }) {
  const { name, groups, entry, leaderboard, gaveUp, alreadyPlayed, justFinished } = finale;

  let headline;
  if (justFinished) headline = `🎉 You solved “${name}”!`;
  else if (gaveUp) headline = `🏳️ “${name}” — here are the answers:`;
  else if (alreadyPlayed) headline = `You already solved “${name}”`;
  else headline = name;

  return (
    <div className="screen">
      <header className="header">
        <button className="link-btn" onClick={onBack}>← puzzles</button>
        <h1>{headline}</h1>
      </header>

      <div className="solved-area">
        {groups.map((g) => (
          <div key={g.color} className={`solved-banner ${g.color}`}>
            <strong>{g.words.map((w) => w.toUpperCase()).join(', ')}</strong>
            <span>{g.description}</span>
          </div>
        ))}
      </div>

      {entry && (
        <div className="result-stats">
          {entry.grid && <pre className="emoji-grid">{entry.grid}</pre>}
          <p>
            Solved in <strong>{entry.attempts}</strong> guess{entry.attempts === 1 ? '' : 'es'} ·{' '}
            {formatDuration(entry.durationSec)}
          </p>
        </div>
      )}

      <section className="leaderboard">
        <h2>🏆 Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="empty">No one has finished yet.</p>
        ) : (
          <ol>
            {leaderboard.slice(0, 10).map((e, i) => (
              <li key={e.userId} className={entry && e.userId === entry.userId ? 'me' : ''}>
                <span className="rank">{MEDALS[i] || `${i + 1}.`}</span>
                <span className="lb-name">{e.displayName}</span>
                <span className="lb-stats">
                  {e.attempts} guess{e.attempts === 1 ? '' : 'es'} · {formatDuration(e.durationSec)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
