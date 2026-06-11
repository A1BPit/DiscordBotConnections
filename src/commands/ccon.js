const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildCreatePuzzleModal, readModalSubmission } = require('../ui/createPuzzleModal');
const { parsePuzzleSubmission } = require('../services/puzzleParser');
const gameStore = require('../services/gameStore');
const { COLOR_EMOJI } = require('../services/constants');

const data = new SlashCommandBuilder()
  .setName('ccon')
  .setDescription('Create a Connections puzzle for others to play');

async function execute(interaction) {
  await interaction.showModal(buildCreatePuzzleModal());
}

async function handleModal(interaction) {
  const input = readModalSubmission(interaction);
  const result = parsePuzzleSubmission(input);

  if (!result.ok) {
    await interaction.reply({
      content: `❌ Couldn't create the puzzle:\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (gameStore.getGameByName(interaction.guildId, result.name)) {
    await interaction.reply({
      content: `❌ A puzzle named **${result.name}** already exists in this server. Pick another title or delete it with \`/condelete\`.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const game = gameStore.createGame({
    guildId: interaction.guildId,
    name: result.name,
    createdBy: interaction.user.id,
    groups: result.groups,
  });

  const preview = game.groups
    .map((g) => `${COLOR_EMOJI[g.color]} ${g.words.map((w) => w.toUpperCase()).join(', ')} — _${g.description}_`)
    .join('\n');

  await interaction.reply({
    content: `✅ Puzzle **${game.name}** created! It expires <t:${Math.floor(game.expiresAt / 1000)}:R>.\n\n${preview}`,
    flags: MessageFlags.Ephemeral,
  });

  // Public announcement without spoilers.
  if (interaction.channel) {
    await interaction.channel
      .send(
        `🧩 ${interaction.user} created a new Connections puzzle: **${game.name}**!\n` +
          `Launch the **Connections** activity to play — available until <t:${Math.floor(game.expiresAt / 1000)}:t>.`
      )
      .catch(() => {});
  }
}

module.exports = { data, execute, handleModal };
