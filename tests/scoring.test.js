const test = require('node:test');
const assert = require('node:assert/strict');
const { compareEntries, buildEmojiGrid, formatDuration } = require('../src/services/scoring');

test('compareEntries ranks by fewest guesses, then fastest, then earliest finish', () => {
  const base = { attempts: 7, durationSec: 60, finishedAt: 100 };
  const fewerGuesses = { attempts: 4, durationSec: 120, finishedAt: 200 };
  const faster = { attempts: 7, durationSec: 30, finishedAt: 300 };
  const earlier = { attempts: 7, durationSec: 60, finishedAt: 50 };

  const sorted = [base, faster, fewerGuesses, earlier].sort(compareEntries);
  assert.deepEqual(sorted, [fewerGuesses, faster, earlier, base]);
});

test('a perfect 4-guess run beats a faster run with more guesses', () => {
  const perfect = { attempts: 4, durationSec: 300, finishedAt: 1 };
  const fastButSloppy = { attempts: 9, durationSec: 45, finishedAt: 2 };
  assert.ok(compareEntries(perfect, fastButSloppy) < 0);
});

test('buildEmojiGrid renders colored rows per guess', () => {
  const grid = buildEmojiGrid([
    ['blue', 'blue', 'blue', 'blue'],
    ['green', 'yellow', 'pink', 'green'],
  ]);
  assert.equal(grid, '🟦🟦🟦🟦\n🟩🟨🟪🟩');
});

test('formatDuration renders minutes and seconds', () => {
  assert.equal(formatDuration(83), '1m 23s');
  assert.equal(formatDuration(9), '9s');
});
