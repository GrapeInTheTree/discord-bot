import { Events, Listener } from '@sapphire/framework';
import type { Client } from 'discord.js';

import { branding } from '../config/branding.js';

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ClientReady, once: true });
  }

  public override run(client: Client<true>): void {
    const guilds = client.guilds.cache.size;
    const tag = client.user.tag;
    this.container.logger.info(
      `🟢 ${branding.name} ready as ${tag} — connected to ${guilds} guild${guilds === 1 ? '' : 's'}`,
    );
  }
}
