# Discord Connections Activity

A [Connections](https://www.nytimes.com/games/connections)-style word game that runs **inside Discord** as an Embedded App (Activity). Players launch the Activity, pick a puzzle made by someone in the server, and play on a real game board — tap tiles, find four groups of four, unlimited guesses. The leaderboard ranks whoever finished in the fewest guesses.

## How it works

| Where | What |
| --- | --- |
| `/ccon` (slash command) | Opens a modal to create a puzzle: a title plus 4 color groups (blue, green, yellow, pink). Each group takes 4 comma-separated words and a description, e.g. `OCEAN, SKY, JEANS, BLUEBERRY \| Things that are blue`. |
| **Launch** (Activity) | Opens the game inside Discord. Pick a puzzle, tap 4 tiles, Submit. Solved groups collapse into colored banners with their description. Unlimited guesses — no lives. |
| `/leaderboard name:<puzzle>` | Posts the puzzle's current leaderboard in the channel for everyone to see. |
| `/condelete name:<puzzle>` | Deletes a puzzle and its leaderboard. Creator or **Manage Server** only. |
| `/leaderboarddelete name:<puzzle>` | Clears a puzzle's leaderboard but keeps it playable. Creator or **Manage Server** only. |

Gameplay rules:

- Unlimited guesses; "One away!" hint when 3 of 4 words share a group.
- Each completed run posts your NYT-style emoji grid (🟦🟩🟨🟪) and the updated leaderboard to the channel.
- Leaderboard ranks by fewest guesses to finish (perfect = 4), ties broken by fastest time.
- Each user can play a given puzzle once; reopening shows your result.
- Puzzles and leaderboards expire 24 hours after creation.

## Architecture

One Node process runs both the discord.js bot (slash commands, channel posts) and an Express server (Activity API). The game UI is a Vite + React app served to Discord's sandboxed iframe; all guess judging happens server-side so answers never reach the client until solved.

```text
client/                    # React Activity UI (Vite)
  src/App.jsx              # Auth handshake, puzzle picker, screen routing
  src/components/Board.jsx # Tile grid, submit/shuffle/deselect, solved banners
  src/components/Results.jsx
src/
  index.js                 # Bot entry point; starts the Activity server
  server.js                # Express API: token exchange, sessions, guesses
  registerCommands.js      # Slash command registration
  commands/                # /ccon, /condelete, /leaderboarddelete
  services/                # Stores (JSON in data/), judge, scoring, sessions
tests/                     # node:test unit tests
```

## Setup

### 1. Discord application

At the [Developer Portal](https://discord.com/developers/applications):

1. Create an application, add a **Bot**, and copy its **Token** (`DISCORD_TOKEN`).
2. Copy the **Application ID** from General Information (`CLIENT_ID` and `VITE_DISCORD_CLIENT_ID`).
3. On the **OAuth2** page:
   - Copy the **Client Secret** (`CLIENT_SECRET`).
   - Under **Redirects**, add `https://127.0.0.1` and click **Save Changes**. (Required for Activity login; the SDK uses this placeholder.)
4. Under **Activities**, click **Enable Activities**. Discord auto-creates a "Launch" Entry Point command.
5. Invite the bot to your server (replace `YOUR_APP_ID`):

   ```text
   https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=2048
   ```

### 2. Environment

```powershell
Copy-Item .env.example .env
# then fill in DISCORD_TOKEN, CLIENT_ID, CLIENT_SECRET, VITE_DISCORD_CLIENT_ID, GUILD_ID
```

### 3. Install and register commands

```powershell
npm install
npm install --prefix client
npm run register
```

## Development (local, with tunnel)

Activities must be served over a public HTTPS URL, even in development. Use [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/):

```powershell
# Terminal 1: bot + API (port 3001) and Vite dev server (port 5173)
npm run dev

# Terminal 2: public tunnel to the Vite dev server
cloudflared tunnel --url http://localhost:5173
```

Copy the `https://....trycloudflare.com` URL cloudflared prints, then in the Developer Portal under **Activities -> URL Mappings** set:

| Prefix | Target |
| --- | --- |
| `/` | `your-tunnel.trycloudflare.com` |

In Discord, open a server channel and launch the Activity (rocket/activity button or the app's "Launch" command). Vite proxies `/api` requests to the bot process, so the single tunnel covers both UI and API.

## Production

```powershell
npm run build   # builds client/dist
npm start       # bot + API; Express serves client/dist
```

Host on anything that runs a persistent Node process with HTTPS (Railway, Render, Fly.io, a VPS). Set the URL Mapping `/` target to your host's domain. Vercel alone is not a fit: the bot needs an always-on process and storage is JSON files on disk.

## Testing

```powershell
npm test
```

Covers puzzle input parsing/validation, guess judging (correct / one-away / wrong), and leaderboard ranking.

To test expiry quickly, set `GAME_TTL_HOURS=0.05` in `.env` (3 minutes) and restart.

## Notes

- Storage is JSON files in `data/` — no external database.
- Play sessions are in-memory; if the server restarts mid-game, reopen the puzzle to start fresh.
- Pink groups use the purple square emoji (🟪) since Discord has no pink square.
- The Activity needs the launch channel to post results; results are posted by the bot, so make sure it can Send Messages in the channel where the Activity is launched.
