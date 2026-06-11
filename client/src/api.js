// All requests go through Discord's activity proxy (/.proxy is stripped and
// mapped to our server by the URL Mappings config).
const BASE = '/.proxy/api';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  listPuzzles: (guildId) => request(`/puzzles?guildId=${encodeURIComponent(guildId)}`),
  startSession: (gameId, channelId) =>
    request(`/games/${gameId}/session`, { method: 'POST', body: JSON.stringify({ channelId }) }),
  submitGuess: (gameId, words) =>
    request(`/games/${gameId}/guess`, { method: 'POST', body: JSON.stringify({ words }) }),
  giveUp: (gameId) => request(`/games/${gameId}/giveup`, { method: 'POST' }),
};
