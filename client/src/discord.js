import { DiscordSDK } from '@discord/embedded-app-sdk';

const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

export const discordSdk = new DiscordSDK(clientId);

/**
 * Standard Activity handshake: ready -> authorize -> exchange code on our
 * server -> authenticate. Returns the auth context the app needs.
 */
export async function setupDiscord() {
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify'],
  });

  const res = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('Could not authenticate with the game server.');
  const { access_token: accessToken } = await res.json();

  const auth = await discordSdk.commands.authenticate({ access_token: accessToken });

  return {
    accessToken,
    user: auth.user,
    guildId: discordSdk.guildId,
    channelId: discordSdk.channelId,
  };
}
