import { Command } from '@sapphire/framework';

import { format, i18n } from '../../i18n/index.js';

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder.setName('ping').setDescription('Check bot latency and gateway health.'),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ): Promise<void> {
    const response = await interaction.reply({
      content: i18n.common.ping.label,
      withResponse: true,
    });
    const message = response.resource?.message;
    const roundtrip = message ? message.createdTimestamp - interaction.createdTimestamp : 0;
    const ws = Math.max(0, Math.round(this.container.client.ws.ping));

    await interaction.editReply({
      content: `${i18n.common.ping.label}\n${format(i18n.common.ping.detail, { latency: roundtrip, ws })}`,
    });
  }
}
