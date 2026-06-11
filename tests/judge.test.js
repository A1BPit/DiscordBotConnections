const test = require('node:test');
const assert = require('node:assert/strict');
const { judgeGuess } = require('../src/services/judge');

const game = {
  groups: [
    { color: 'blue', words: ['OCEAN', 'SKY', 'JEANS', 'BLUEBERRY'], description: 'Blue things' },
    { color: 'green', words: ['GRASS', 'EMERALD', 'LIME', 'FROG'], description: 'Green things' },
    { color: 'yellow', words: ['SUN', 'BANANA', 'LEMON', 'CANARY'], description: 'Yellow things' },
    { color: 'pink', words: ['FLAMINGO', 'ROSE', 'SALMON', 'BUBBLEGUM'], description: 'Pink things' },
  ],
};

test('all 4 words from one group is correct and returns the group', () => {
  const result = judgeGuess(game, ['ocean', 'sky', 'jeans', 'blueberry']);
  assert.equal(result.type, 'correct');
  assert.equal(result.group.color, 'blue');
  assert.equal(result.group.description, 'Blue things');
  assert.deepEqual(result.colors, ['blue', 'blue', 'blue', 'blue']);
});

test('matching is case-insensitive', () => {
  const result = judgeGuess(game, ['GRASS', 'Emerald', 'lime', 'fRoG']);
  assert.equal(result.type, 'correct');
  assert.equal(result.group.color, 'green');
});

test('3 words from one group is one-away', () => {
  const result = judgeGuess(game, ['sun', 'banana', 'lemon', 'rose']);
  assert.equal(result.type, 'one-away');
  assert.deepEqual(result.colors, ['yellow', 'yellow', 'yellow', 'pink']);
});

test('2+2 split is wrong, not one-away', () => {
  const result = judgeGuess(game, ['sun', 'banana', 'rose', 'salmon']);
  assert.equal(result.type, 'wrong');
});

test('one word from each group is wrong', () => {
  const result = judgeGuess(game, ['ocean', 'grass', 'sun', 'flamingo']);
  assert.equal(result.type, 'wrong');
  assert.deepEqual(result.colors, ['blue', 'green', 'yellow', 'pink']);
});
