import '@sapphire/plugin-logger/register';

import {
  ApplicationCommandRegistries,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';

// Load env + container side effects FIRST so any subsequent import can use them.
import './container.js';
import { branding } from './config/branding.js';
import { env } from './config/env.js';
import { startHealthcheck } from './healthcheck/server.js';
import { sapphireLogLevel } from './lib/logger.js';

// Register slash commands to dev guild for instant updates if configured.
if (env.DISCORD_DEV_GUILD_ID !== undefined) {
  ApplicationCommandRegistries.setDefaultGuildIds([env.DISCORD_DEV_GUILD_ID]);
}
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);

const client = new SapphireClient({
  loadMessageCommandListeners: false,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    // GuildMessageReactions, MessageContent — added per-phase as needed
  ],
  partials: [Partials.GuildMember, Partials.Channel],
  logger: { level: sapphireLogLevel },
});

// Graceful shutdown on SIGTERM/SIGINT (Docker stop sends SIGTERM)
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    client.logger.warn(`Received ${signal} — shutting down gracefully`);
    void client.destroy().finally(() => {
      process.exit(0);
    });
  });
}

try {
  await client.login(env.DISCORD_TOKEN);
  await startHealthcheck({
    port: env.PORT,
    isReady: () => client.isReady(),
  });
  client.logger.info(`🚀 ${branding.name} bootstrap complete (env=${env.NODE_ENV})`);
} catch (err) {
  // Last-resort logger before process exits — Sapphire logger may not be ready.
  // eslint-disable-next-line no-console
  console.error('💥 Fatal bootstrap error:', err);
  process.exit(1);
}
