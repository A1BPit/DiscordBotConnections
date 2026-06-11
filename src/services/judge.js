const { WORDS_PER_GROUP } = require('./constants');

/**
 * Judges a guess of 4 words against the puzzle's groups.
 * Returns the verdict plus each guessed word's group color (for the share grid).
 * @param {{groups: Array<{color: string, words: string[], description: string}>}} game
 * @param {string[]} guessWords
 * @returns {{type: 'correct'|'one-away'|'wrong', colors: string[], group?: object}}
 */
function judgeGuess(game, guessWords) {
  const colorByWord = new Map();
  for (const group of game.groups) {
    for (const word of group.words) colorByWord.set(word.toLowerCase(), group.color);
  }

  const colors = guessWords.map((w) => colorByWord.get(w.toLowerCase()));
  const counts = {};
  for (const c of colors) counts[c] = (counts[c] || 0) + 1;
  const best = Math.max(...Object.values(counts));

  if (best === WORDS_PER_GROUP) {
    const group = game.groups.find((g) => g.color === colors[0]);
    return { type: 'correct', colors, group };
  }
  return { type: best === WORDS_PER_GROUP - 1 ? 'one-away' : 'wrong', colors };
}

module.exports = { judgeGuess };
