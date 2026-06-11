const fs = require('fs');
const path = require('path');

const { compareEntries } = require('./scoring');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'leaderboards.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function save(entries) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(entries, null, 2));
}

function addEntry(entry) {
  const entries = load();
  entries.push(entry);
  save(entries);
  return entry;
}

function hasEntry(gameId, userId) {
  return load().some((e) => e.gameId === gameId && e.userId === userId);
}

function getEntry(gameId, userId) {
  return load().find((e) => e.gameId === gameId && e.userId === userId) || null;
}

/** Entries for a game, best first. */
function entriesForGame(gameId) {
  return load()
    .filter((e) => e.gameId === gameId)
    .sort(compareEntries);
}

function deleteForGame(gameId) {
  const entries = load();
  const next = entries.filter((e) => e.gameId !== gameId);
  const removed = entries.length - next.length;
  if (removed) save(next);
  return removed;
}

function deleteForGames(gameIds) {
  let total = 0;
  for (const id of gameIds) total += deleteForGame(id);
  return total;
}

function purgeExpired() {
  const now = Date.now();
  const entries = load();
  const next = entries.filter((e) => e.expiresAt > now);
  if (next.length !== entries.length) save(next);
  return entries.length - next.length;
}

module.exports = { addEntry, hasEntry, getEntry, entriesForGame, deleteForGame, deleteForGames, purgeExpired };
