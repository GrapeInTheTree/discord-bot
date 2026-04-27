import { Events, Listener } from '@sapphire/framework';
import type { DMChannel, GuildChannel } from 'discord.js';

// When a guild text channel is deleted (via Discord UI, audit-log action, etc.)
// we reconcile any Ticket row that points at it: mark it closed and write a
// 'channel-deleted-externally' TicketEvent. The service holds a 60-second
// in-memory set of channels we deleted ourselves (via /panel … delete + modal
// confirm) so this listener no-ops for our own deletions.
//
// The listener fires for DM channels too — we skip those since tickets are
// always guild-scoped.
export class ChannelDeleteListener extends Listener<typeof Events.ChannelDelete> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ChannelDelete });
  }

  public override async run(channel: GuildChannel | DMChannel): Promise<void> {
    if (!('guildId' in channel)) return;
    try {
      await this.container.services.ticket.markChannelOrphaned(channel.id);
    } catch (err) {
      this.container.logger.error(
        `channelDelete: failed to reconcile orphaned ticket for channel ${channel.id}`,
        err,
      );
    }
  }
}
