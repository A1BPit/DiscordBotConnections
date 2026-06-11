const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const gameStore = require('../services/gameStore');
const leaderboardStore = require('../services/leaderboardStore');
const { renderLeaderboardEmbed } = require('../ui/playSessionView');

const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription("Post a puzzle's leaderboard in this channel")
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

  const entries = leaderboardStore.entriesForGame(game.id);
  await interaction.reply({ embeds: [renderLeaderboardEmbed(game, entries)] });
}

module.exports = { data, execute, autocomplete };
