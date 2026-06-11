const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const gameStore = require('../services/gameStore');
const leaderboardStore = require('../services/leaderboardStore');

const data = new SlashCommandBuilder()
  .setName('leaderboarddelete')
  .setDescription("Clear a puzzle's leaderboard (keeps the puzzle playable)")
  .addStringOption((o) =>
    o.setName('name').setDescription('Puzzle name').setRequired(true).setAutocomplete(true)
  );

async function autocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const choices = gameStore
    .listActive(interaction.guildId)
    .filter((g) => g.name.toLowerCase().includes(focused))
    .slice(0, 25)
    .map((g) => ({ name: g.name, value: g.name }));
  await interaction.respond(choices);
}

async function execute(interaction) {
  const name = interaction.options.getString('name');
  const game = gameStore.getGameByName(interaction.guildId, name);

  if (!game) {
    await interaction.reply({
      content: `❌ No active puzzle named **${name}** in this server.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const allowed =
    game.createdBy === interaction.user.id ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  if (!allowed) {
    await interaction.reply({
      content: '🚫 Only the puzzle creator or members with **Manage Server** can clear this leaderboard.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const removed = leaderboardStore.deleteForGame(game.id);
  await interaction.reply(
    `🧹 Cleared **${removed}** leaderboard entr(ies) for **${game.name}**. The puzzle is still playable.`
  );
}

module.exports = { data, execute, autocomplete };
