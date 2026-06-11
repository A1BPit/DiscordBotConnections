const crypto = require('crypto');

/** In-memory play sessions, keyed by `${gameId}:${userId}`. */
const sessions = new Map();

function key(gameId, userId) {
  return `${gameId}:${userId}`;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getOrCreate(game, userId) {
  const k = key(game.id, userId);
  let session = sessions.get(k);
  if (!session) {
    session = {
      gameId: game.id,
      guildId: game.guildId,
      userId,
      channelId: null,
      order: shuffle(game.groups.flatMap((g) => g.words)),
      solvedColors: [],
      history: [],
      guessKeys: new Set(),
      attempts: 0,
      startedAt: Date.now(),
    };
    sessions.set(k, session);
  }
  return session;
}

function get(gameId, userId) {
  return sessions.get(key(gameId, userId)) || null;
}

function remove(gameId, userId) {
  sessions.delete(key(gameId, userId));
}

module.exports = { getOrCreate, get, remove };
