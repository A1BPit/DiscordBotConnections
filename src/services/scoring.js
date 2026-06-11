const { COLOR_EMOJI } = require('./constants');

/**
 * Leaderboard ranking with unlimited guesses: whoever completed the puzzle
 * in the fewest guesses wins (perfect = 4), ties broken by fastest
 * completion, then earliest finish.
 */
function compareEntries(a, b) {
  return (
    a.attempts - b.attempts ||
    a.durationSec - b.durationSec ||
    a.finishedAt - b.finishedAt
  );
}

/**
 * NYT-style share grid. Each guess is rendered as a row of the
 * colored squares of the groups each guessed word belongs to.
 * @param {string[][]} history array of guesses, each an array of 4 color names
 */
function buildEmojiGrid(history) {
  return history
    .map((row) => row.map((color) => COLOR_EMOJI[color] || '⬛').join(''))
    .join('\n');
}

function formatDuration(durationSec) {
  const sec = Math.max(0, Math.round(durationSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

module.exports = { compareEntries, buildEmojiGrid, formatDuration };
