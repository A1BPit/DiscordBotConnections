const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'games.json');

const MAX_TTL_HOURS = 24;

function ttlMs() {
  const hours = parseFloat(process.env.GAME_TTL_HOURS);
  const effective = Number.isFinite(hours) && hours > 0 ? Math.min(hours, MAX_TTL_HOURS) : MAX_TTL_HOURS;
  return effective * 60 * 60 * 1000;
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function save(games) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(games, null, 2));
}

function isActive(game, now = Date.now()) {
  return game.expiresAt > now;
}

/** Removes expired games and returns the ids that were removed. */
function purgeExpired() {
  const games = load();
  const now = Date.now();
  const removed = games.filter((g) => !isActive(g, now)).map((g) => g.id);
  if (removed.length) {
    save(games.filter((g) => isActive(g, now)));
  }
  return removed;
}

function createGame({ guildId, name, createdBy, groups }) {
  const games = load();
  const now = Date.now();
  const game = {
    id: crypto.randomBytes(4).toString('hex'),
    guildId,
    name,
    createdBy,
    createdAt: now,
    expiresAt: now + ttlMs(),
    groups,
  };
  games.push(game);
  save(games);
  return game;
}

function getGameByName(guildId, name) {
  const target = (name || '').trim().toLowerCase();
  return load().find(
    (g) => g.guildId === guildId && g.name.toLowerCase() === target && isActive(g)
  ) || null;
}

function getGameById(id) {
  const game = load().find((g) => g.id === id);
  return game && isActive(game) ? game : null;
}

function listActive(guildId) {
  return load().filter((g) => g.guildId === guildId && isActive(g));
}

function deleteGame(id) {
  const games = load();
  const next = games.filter((g) => g.id !== id);
  if (next.length === games.length) return false;
  save(next);
  return true;
}

module.exports = { createGame, getGameByName, getGameById, listActive, deleteGame, purgeExpired };
