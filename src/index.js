require('dotenv').config();
const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js');

const ccon = require('./commands/ccon');
const condelete = require('./commands/condelete');
const leaderboard = require('./commands/leaderboard');
const leaderboarddelete = require('./commands/leaderboarddelete');
const { CREATE_MODAL_ID } = require('./ui/createPuzzleModal');
const { startCleanupJob } = require('./services/expiryCleanup');
const { startServer } = require('./server');

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const commands = new Map(
  [ccon, condelete, leaderboard, leaderboarddelete].map((c) => [c.data.name, c])
);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA || 'dev (local)';
  console.log(`Logged in as ${c.user.tag} — running commit ${commit}`);
  startCleanupJob();
  startServer(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName);
      if (command?.autocomplete) await command.autocomplete(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === CREATE_MODAL_ID) {
      await ccon.handleModal(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (!interaction.isRepliable()) return;
    const payload = {
      content: '⚠️ Something went wrong handling that interaction.',
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
