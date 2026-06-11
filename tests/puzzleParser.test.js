const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePuzzleSubmission, parseGroupInput } = require('../src/services/puzzleParser');

const validInput = {
  name: 'test-puzzle',
  blue: 'OCEAN, SKY, JEANS, BLUEBERRY | Things that are blue',
  green: 'GRASS, EMERALD, LIME, FROG | Things that are green',
  yellow: 'SUN, BANANA, LEMON, CANARY | Things that are yellow',
  pink: 'FLAMINGO, ROSE, SALMON, BUBBLEGUM | Things that are pink',
};

test('parses a valid submission into 4 groups', () => {
  const result = parsePuzzleSubmission(validInput);
  assert.equal(result.ok, true);
  assert.equal(result.name, 'test-puzzle');
  assert.equal(result.groups.length, 4);
  assert.deepEqual(result.groups[0].words, ['OCEAN', 'SKY', 'JEANS', 'BLUEBERRY']);
  assert.equal(result.groups[0].description, 'Things that are blue');
  assert.deepEqual(
    result.groups.map((g) => g.color),
    ['blue', 'green', 'yellow', 'pink']
  );
});

test('rejects a group with the wrong word count', () => {
  const result = parsePuzzleSubmission({ ...validInput, blue: 'A, B, C | only three' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('blue')));
});

test('rejects a group missing the | separator', () => {
  const result = parseGroupInput('green', 'A, B, C, D no pipe here');
  assert.ok(result.errors.length > 0);
  assert.match(result.errors[0], /separator/);
});

test('rejects a group with an empty description', () => {
  const result = parseGroupInput('pink', 'A, B, C, D |   ');
  assert.ok(result.errors.some((e) => e.includes('description')));
});

test('rejects duplicate words within a group', () => {
  const result = parseGroupInput('yellow', 'SUN, sun, MOON, STAR | dupes');
  assert.ok(result.errors.some((e) => e.includes('duplicate')));
});

test('rejects duplicate words across groups (case-insensitive)', () => {
  const result = parsePuzzleSubmission({
    ...validInput,
    green: 'ocean, EMERALD, LIME, FROG | overlaps with blue',
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('unique across all groups')));
});

test('rejects a missing puzzle name', () => {
  const result = parsePuzzleSubmission({ ...validInput, name: '   ' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('Title')));
});
