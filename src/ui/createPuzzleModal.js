const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { COLORS, COLOR_LABEL } = require('../services/constants');
const { MAX_NAME_LENGTH } = require('../services/puzzleParser');

const CREATE_MODAL_ID = 'ccon:create';

const PLACEHOLDERS = {
  blue: 'OCEAN, SKY, JEANS, BLUEBERRY | Things that are blue',
  green: 'GRASS, EMERALD, LIME, FROG | Things that are green',
  yellow: 'SUN, BANANA, LEMON, CANARY | Things that are yellow',
  pink: 'FLAMINGO, ROSE, SALMON, BUBBLEGUM | Things that are pink',
};

function buildCreatePuzzleModal() {
  const modal = new ModalBuilder()
    .setCustomId(CREATE_MODAL_ID)
    .setTitle('Create a Connections Puzzle');

  const titleInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Puzzle title (shown in the activity)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(MAX_NAME_LENGTH)
    .setPlaceholder('e.g. friday-fun');

  modal.addComponents(new ActionRowBuilder().addComponents(titleInput));

  // Discord modals allow at most 5 inputs, so each color row combines
  // its 4 words and the group description: "W1, W2, W3, W4 | description"
  for (const color of COLORS) {
    const input = new TextInputBuilder()
      .setCustomId(color)
      .setLabel(`${COLOR_LABEL[color]}: 4 words, then | description`)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(400)
      .setPlaceholder(PLACEHOLDERS[color]);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  return modal;
}

function readModalSubmission(interaction) {
  const input = { name: interaction.fields.getTextInputValue('name') };
  for (const color of COLORS) {
    input[color] = interaction.fields.getTextInputValue(color);
  }
  return input;
}

module.exports = { buildCreatePuzzleModal, readModalSubmission, CREATE_MODAL_ID };
