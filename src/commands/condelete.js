const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const gameStore = require('../services/gameStore');
const leaderboardStore = require('../services/leaderboardStore');

const data = new SlashCommandBuilder()
  .setName('condelete')
  .setDescription('Delete a Connections puzzle (and its leaderboard)')
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

function canManage(interaction, game) {
  return (
    game.createdBy === interaction.user.id ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  );
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

  if (!canManage(interaction, game)) {
    await interaction.reply({
      content: '🚫 Only the puzzle creator or members with **Manage Server** can delete this puzzle.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  gameStore.deleteGame(game.id);
  const removedEntries = leaderboardStore.deleteForGame(game.id);

  await interaction.reply(
    `🗑️ Puzzle **${game.name}** deleted by ${interaction.user} (${removedEntries} leaderboard entr(ies) cleared).`
  );
}

module.exports = { data, execute, autocomplete, canManage };
