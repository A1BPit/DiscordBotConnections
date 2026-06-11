const { EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../services/scoring');

/** Public message announcing a completed run (no spoilers). */
function renderPublicResult(game, entry) {
  const guesses = `${entry.attempts} guess${entry.attempts === 1 ? '' : 'es'}`;
  const lines = [`🧩 **${entry.displayName}** solved **${game.name}** in **${guesses}**!`];
  if (entry.grid) lines.push(entry.grid);
  lines.push(`⏱️ ${formatDuration(entry.durationSec)}`);
  return lines.join('\n');
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Leaderboard embed for a game (entries must be pre-sorted, best first). */
function renderLeaderboardEmbed(game, entries) {
  const lines = entries.slice(0, 10).map((e, i) => {
    const rank = MEDALS[i] || `${i + 1}.`;
    return `${rank} **${e.displayName}** — ${e.attempts} guess${e.attempts === 1 ? '' : 'es'} · ${formatDuration(e.durationSec)}`;
  });

  return new EmbedBuilder()
    .setTitle(`🏆 Leaderboard — ${game.name}`)
    .setDescription(lines.join('\n') || '_No plays yet._')
    .setFooter({ text: 'Launch the Connections activity to play — entries expire with the puzzle' })
    .addFields({
      name: 'Expires',
      value: `<t:${Math.floor(game.expiresAt / 1000)}:R>`,
      inline: true,
    })
    .setColor(0x8064a8);
}

module.exports = { renderPublicResult, renderLeaderboardEmbed };
