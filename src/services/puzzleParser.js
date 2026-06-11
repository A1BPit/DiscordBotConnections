const { COLORS, WORDS_PER_GROUP } = require('./constants');

const MAX_WORD_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_NAME_LENGTH = 50;

/**
 * Parses a single group's modal input of the form:
 *   "WORD1, WORD2, WORD3, WORD4 | Group description"
 */
function parseGroupInput(color, raw) {
  const errors = [];
  const text = (raw || '').trim();
  const pipeIndex = text.indexOf('|');

  if (pipeIndex === -1) {
    return { errors: [`**${color}**: missing \`|\` separator. Use \`WORD1, WORD2, WORD3, WORD4 | description\`.`] };
  }

  const wordsPart = text.slice(0, pipeIndex);
  const description = text.slice(pipeIndex + 1).trim();

  const words = wordsPart
    .split(',')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  if (words.length !== WORDS_PER_GROUP) {
    errors.push(`**${color}**: expected exactly ${WORDS_PER_GROUP} comma-separated words, got ${words.length}.`);
  }
  for (const word of words) {
    if (word.length > MAX_WORD_LENGTH) {
      errors.push(`**${color}**: word "${word.slice(0, 20)}…" is too long (max ${MAX_WORD_LENGTH} characters).`);
    }
  }
  const lowered = words.map((w) => w.toLowerCase());
  if (new Set(lowered).size !== words.length) {
    errors.push(`**${color}**: contains duplicate words.`);
  }
  if (!description) {
    errors.push(`**${color}**: missing description after \`|\`.`);
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`**${color}**: description is too long (max ${MAX_DESCRIPTION_LENGTH} characters).`);
  }

  if (errors.length) return { errors };
  return { errors: [], group: { color, words, description } };
}

/**
 * Parses the full /ccon modal submission.
 * @param {{name: string, blue: string, green: string, yellow: string, pink: string}} input
 * @returns {{ok: true, name: string, groups: Array}|{ok: false, errors: string[]}}
 */
function parsePuzzleSubmission(input) {
  const errors = [];
  const name = (input.name || '').trim();

  if (!name) {
    errors.push('**Title**: puzzle name is required.');
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.push(`**Title**: puzzle name is too long (max ${MAX_NAME_LENGTH} characters).`);
  }

  const groups = [];
  for (const color of COLORS) {
    const result = parseGroupInput(color, input[color]);
    if (result.errors.length) errors.push(...result.errors);
    else groups.push(result.group);
  }

  if (groups.length === COLORS.length) {
    const allWords = groups.flatMap((g) => g.words.map((w) => w.toLowerCase()));
    if (new Set(allWords).size !== allWords.length) {
      errors.push('Words must be unique across all groups (a word appears in more than one group).');
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, name, groups };
}

module.exports = { parseGroupInput, parsePuzzleSubmission, MAX_NAME_LENGTH };
