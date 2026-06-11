const fs = require('fs');
const path = require('path');
const express = require('express');

const gameStore = require('./services/gameStore');
const leaderboardStore = require('./services/leaderboardStore');
const sessions = require('./services/sessions');
const { judgeGuess } = require('./services/judge');
const { buildEmojiGrid } = require('./services/scoring');
const { GROUP_COUNT, WORDS_PER_GROUP } = require('./services/constants');
const { renderPublicResult, renderLeaderboardEmbed } = require('./ui/playSessionView');

const DISCORD_API = 'https://discord.com/api';

// Discord Activities require a registered OAuth2 redirect; the SDK uses this placeholder.
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'https://127.0.0.1';

/** Game state safe to send to the client: never includes unsolved answers. */
function publicState(game, session) {
  const solvedGroups = session.solvedColors.map((color) =>
    game.groups.find((g) => g.color === color)
  );
  const solvedWords = new Set(solvedGroups.flatMap((g) => g.words.map((w) => w.toLowerCase())));
  return {
    gameId: game.id,
    name: game.name,
    expiresAt: game.expiresAt,
    attempts: session.attempts,
    history: session.history,
    solvedGroups,
    words: session.order.filter((w) => !solvedWords.has(w.toLowerCase())),
  };
}

function createServer(botClient) {
  const app = express();
  app.use(express.json());

  /** access_token -> { id, displayName } (rebuilt lazily after restarts) */
  const tokenUsers = new Map();

  async function fetchUser(accessToken) {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return { id: u.id, displayName: u.global_name || u.username };
  }

  app.post('/api/token', async (req, res) => {
    const code = req.body?.code;
    if (!code) return res.status(400).json({ error: 'Missing OAuth code.' });

    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: OAUTH_REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) {
      console.error('OAuth token exchange failed:', await tokenRes.text());
      return res.status(401).json({ error: 'Token exchange failed.' });
    }

    const { access_token } = await tokenRes.json();
    const user = await fetchUser(access_token);
    if (!user) return res.status(401).json({ error: 'Could not resolve Discord user.' });

    tokenUsers.set(access_token, user);
    res.json({ access_token });
  });

  async function requireAuth(req, res, next) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Unauthorized.' });

    let user = tokenUsers.get(token);
    if (!user) {
      user = await fetchUser(token);
      if (!user) return res.status(401).json({ error: 'Unauthorized.' });
      tokenUsers.set(token, user);
    }
    req.user = user;
    next();
  }

  app.get('/api/puzzles', requireAuth, (req, res) => {
    const guildId = req.query.guildId;
    if (!guildId) return res.status(400).json({ error: 'Missing guildId.' });
    const puzzles = gameStore.listActive(guildId).map((g) => ({
      id: g.id,
      name: g.name,
      expiresAt: g.expiresAt,
      played: leaderboardStore.hasEntry(g.id, req.user.id),
    }));
    res.json({ puzzles });
  });

  app.post('/api/games/:gameId/session', requireAuth, (req, res) => {
    const game = gameStore.getGameById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Puzzle not found or expired.' });

    const prior = leaderboardStore.getEntry(game.id, req.user.id);
    if (prior) {
      return res.json({
        alreadyPlayed: true,
        name: game.name,
        groups: game.groups,
        entry: prior,
        leaderboard: leaderboardStore.entriesForGame(game.id),
      });
    }

    const session = sessions.getOrCreate(game, req.user.id);
    if (req.body?.channelId) session.channelId = req.body.channelId;
    res.json({ state: publicState(game, session) });
  });

  async function postCompletion(game, entry, channelId) {
    if (!channelId || !botClient) return;
    try {
      const channel = await botClient.channels.fetch(channelId);
      const entries = leaderboardStore.entriesForGame(game.id);
      await channel.send({
        content: renderPublicResult(game, entry),
        embeds: [renderLeaderboardEmbed(game, entries)],
      });
    } catch (err) {
      console.error('Failed to post completion message:', err);
    }
  }

  app.post('/api/games/:gameId/guess', requireAuth, async (req, res) => {
    const game = gameStore.getGameById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Puzzle not found or expired.' });

    const session = sessions.get(game.id, req.user.id);
    if (!session) return res.status(409).json({ error: 'No active session. Reopen the puzzle.' });

    const words = req.body?.words;
    if (!Array.isArray(words) || words.length !== WORDS_PER_GROUP) {
      return res.status(400).json({ error: `Pick exactly ${WORDS_PER_GROUP} words.` });
    }

    const normalized = words.map((w) => String(w).toLowerCase());
    const state = publicState(game, session);
    const remaining = new Set(state.words.map((w) => w.toLowerCase()));
    if (new Set(normalized).size !== WORDS_PER_GROUP || !normalized.every((w) => remaining.has(w))) {
      return res.status(400).json({ error: 'Invalid words for this puzzle.' });
    }

    const guessKey = [...normalized].sort().join('|');
    if (session.guessKeys.has(guessKey)) {
      return res.json({ result: { type: 'duplicate' }, state });
    }
    session.guessKeys.add(guessKey);
    session.attempts += 1;

    const verdict = judgeGuess(game, normalized);
    session.history.push(verdict.colors);

    if (verdict.type === 'correct') {
      session.solvedColors.push(verdict.group.color);
    }

    if (session.solvedColors.length === GROUP_COUNT) {
      const entry = leaderboardStore.addEntry({
        guildId: game.guildId,
        gameId: game.id,
        userId: req.user.id,
        displayName: req.user.displayName,
        attempts: session.attempts,
        durationSec: Math.round((Date.now() - session.startedAt) / 1000),
        grid: buildEmojiGrid(session.history),
        finishedAt: Date.now(),
        expiresAt: game.expiresAt,
      });
      const channelId = session.channelId;
      sessions.remove(game.id, req.user.id);
      await postCompletion(game, entry, channelId);

      return res.json({
        result: { type: 'correct', group: verdict.group },
        finished: true,
        groups: game.groups,
        entry,
        leaderboard: leaderboardStore.entriesForGame(game.id),
      });
    }

    res.json({
      result:
        verdict.type === 'correct'
          ? { type: 'correct', group: verdict.group }
          : { type: verdict.type },
      state: publicState(game, session),
    });
  });

  app.post('/api/games/:gameId/giveup', requireAuth, (req, res) => {
    const game = gameStore.getGameById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Puzzle not found or expired.' });

    sessions.remove(game.id, req.user.id);
    res.json({
      gaveUp: true,
      name: game.name,
      groups: game.groups,
      leaderboard: leaderboardStore.entriesForGame(game.id),
    });
  });

  // Serve the built Activity client in production.
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(indexHtml);
      }
      next();
    });
  }

  return app;
}

function startServer(botClient) {
  const port = Number(process.env.PORT) || 3001;
  const app = createServer(botClient);
  app.listen(port, () => console.log(`Activity server listening on port ${port}`));
  return app;
}

module.exports = { createServer, startServer };
