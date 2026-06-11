require('dotenv').config();
const { REST, Routes } = require('discord.js');

const ccon = require('./commands/ccon');
const condelete = require('./commands/condelete');
const leaderboard = require('./commands/leaderboard');
const leaderboarddelete = require('./commands/leaderboarddelete');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const body = [ccon, condelete, leaderboard, leaderboarddelete].map((c) => c.data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

const PRIMARY_ENTRY_POINT = 4;

(async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
      console.log(`Registered ${body.length} guild commands for guild ${GUILD_ID}.`);
    } else {
      // The Activity's auto-created "Launch" Entry Point command is a global
      // command; Discord rejects bulk updates that would remove it, so carry
      // it over from the existing registration.
      const existing = await rest.get(Routes.applicationCommands(CLIENT_ID));
      const entryPoints = existing.filter((c) => c.type === PRIMARY_ENTRY_POINT);
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [...body, ...entryPoints] });
      console.log(
        `Registered ${body.length} global commands (+${entryPoints.length} entry point kept). May take up to an hour to appear.`
      );
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
})();
