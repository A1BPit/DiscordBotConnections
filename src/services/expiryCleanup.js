const gameStore = require('./gameStore');
const leaderboardStore = require('./leaderboardStore');

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

function runCleanup() {
  const removedGameIds = gameStore.purgeExpired();
  if (removedGameIds.length) {
    leaderboardStore.deleteForGames(removedGameIds);
    console.log(`Cleanup: removed ${removedGameIds.length} expired game(s).`);
  }
  const removedEntries = leaderboardStore.purgeExpired();
  if (removedEntries) {
    console.log(`Cleanup: removed ${removedEntries} expired leaderboard entr(ies).`);
  }
}

function startCleanupJob() {
  runCleanup();
  const timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  timer.unref();
  return timer;
}

module.exports = { startCleanupJob, runCleanup };
