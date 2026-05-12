import { ConflictError, NotFoundError, ValidationError } from '@hearth/shared';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags } from 'discord.js';

import { i18n } from '../../i18n/index.js';

/**
 * /rolepicker — admin-only management of StringSelectMenu-based
 * role-picker panels.
 *
 * Sub-tree:
 *   /rolepicker create … — create a placeholder panel
 *   /rolepicker edit … — edit panel metadata
 *   /rolepicker delete panel — drop panel + Discord message
 *   /rolepicker list — show panels in this guild
 *   /rolepicker repost panel — drop existing message + post a fresh one
 *   /rolepicker option add … — bind a role to a dropdown option (≤25)
 *   /rolepicker option edit option … — patch option fields
 *   /rolepicker option remove option — drop a binding (role grants on
 *                                      existing users stay)
 *
 * v1 ships locked to single-select (selectionMode 'single', min/max = 1)
 * — the slash command doesn't expose those columns to keep the operator
 * surface small. v2 will unlock them via dashboard form first; the slash
 * command catches up after. 8 subcommands; Discord caps at 25.
 */
export class RolePickerCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'rolepicker',
      description: 'Manage role-picker panels (admin only).',
      preconditions: ['GuildOnly', 'AdminOnly'],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('rolepicker')
        .setDescription('Manage role-picker panels (admin only).')
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a role-picker panel placeholder in a channel.')
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Channel where the role-picker message will live.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            )
            .addStringOption((opt) =>
              opt
                .setName('title')
                .setDescription('Embed title (defaults to "Pick your role").')
                .setMaxLength(256)
                .setRequired(false),
            )
            .addStringOption((opt) =>
              opt
                .setName('description')
                .setDescription('Embed body text. Multi-line OK.')
                .setMaxLength(4000)
                .setRequired(false),
            )
            .addStringOption((opt) =>
              opt
                .setName('placeholder')
                .setDescription('Dropdown chrome — shown when nothing is selected.')
                .setMaxLength(150)
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('edit')
            .setDescription('Edit role-picker panel metadata.')
            .addStringOption((opt) =>
              opt.setName('panel').setDescription('Panel ID.').setRequired(true),
            )
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Move panel to a different channel.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
            )
            .addStringOption((opt) =>
              opt
                .setName('title')
                .setDescription('New embed title.')
                .setMaxLength(256)
                .setRequired(false),
            )
            .addStringOption((opt) =>
              opt
                .setName('description')
                .setDescription('New embed body text.')
                .setMaxLength(4000)
                .setRequired(false),
            )
            .addStringOption((opt) =>
              opt
                .setName('placeholder')
                .setDescription('New dropdown placeholder text.')
                .setMaxLength(150)
                .setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Delete a role-picker panel and its Discord message.')
            .addStringOption((opt) =>
              opt.setName('panel').setDescription('Panel ID.').setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('List all role-picker panels configured in this server.'),
        )
        .addSubcommand((sub) =>
          sub
            .setName('repost')
            .setDescription(
              'Drop the existing role-picker message and post a fresh one (preserves role grants).',
            )
            .addStringOption((opt) =>
              opt.setName('panel').setDescription('Panel ID.').setRequired(true),
            ),
        )
        .addSubcommandGroup((group) =>
          group
            .setName('option')
            .setDescription('Manage individual options on a role-picker panel.')
            .addSubcommand((sub) =>
              sub
                .setName('add')
                .setDescription('Add an option to a role-picker panel (≤25).')
                .addStringOption((opt) =>
                  opt
                    .setName('panel')
                    .setDescription('Panel ID (see /rolepicker list).')
                    .setRequired(true),
                )
                .addStringOption((opt) =>
                  opt
                    .setName('label')
                    .setDescription('Display name in the dropdown row, e.g. "English".')
                    .setMaxLength(80)
                    .setRequired(true),
                )
                .addRoleOption((opt) =>
                  opt
                    .setName('role')
                    .setDescription('Role granted when this option is picked.')
                    .setRequired(true),
                )
                .addIntegerOption((opt) =>
                  opt
                    .setName('position')
                    .setDescription('Slot 0-24 (top-to-bottom). Must be unique per panel.')
                    .setMinValue(0)
                    .setMaxValue(24)
                    .setRequired(true),
                )
                .addStringOption((opt) =>
                  opt
                    .setName('description')
                    .setDescription('Optional sub-line shown under the label in the dropdown.')
                    .setMaxLength(100)
                    .setRequired(false),
                )
                .addStringOption((opt) =>
                  opt
                    .setName('emoji')
                    .setDescription('Optional unicode flag like 🇺🇸 or custom <:name:id>.')
                    .setMaxLength(64)
                    .setRequired(false),
                ),
            )
            .addSubcommand((sub) =>
              sub
                .setName('edit')
                .setDescription('Update fields of an existing role-picker option.')
                .addStringOption((opt) =>
                  opt.setName('option').setDescription('Option ID.').setRequired(true),
                )
                .addStringOption((opt) =>
                  opt
                    .setName('label')
                    .setDescription('New label.')
                    .setMaxLength(80)
                    .setRequired(false),
                )
                .addStringOption((opt) =>
                  opt
                    .setName('description')
                    .setDescription('New description (sub-line).')
                    .setMaxLength(100)
                    .setRequired(false),
                )
                .addStringOption((opt) =>
                  opt
                    .setName('emoji')
                    .setDescription('New emoji.')
                    .setMaxLength(64)
                    .setRequired(false),
                )
                .addRoleOption((opt) =>
                  opt.setName('role').setDescription('Replace target role.').setRequired(false),
                )
                .addIntegerOption((opt) =>
                  opt
                    .setName('position')
                    .setDescription('New slot 0-24.')
                    .setMinValue(0)
                    .setMaxValue(24)
                    .setRequired(false),
                ),
            )
            .addSubcommand((sub) =>
              sub
                .setName('remove')
                .setDescription('Remove a role-picker option.')
                .addStringOption((opt) =>
                  opt.setName('option').setDescription('Option ID.').setRequired(true),
                ),
            ),
        ),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ): Promise<void> {
    if (interaction.guildId === null) return;
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(true);

    if (group === 'option') {
      switch (sub) {
        case 'add':
          await this.runOptionAdd(interaction);
          return;
        case 'edit':
          await this.runOptionEdit(interaction);
          return;
        case 'remove':
          await this.runOptionRemove(interaction);
          return;
      }
    }

    switch (sub) {
      case 'create':
        await this.runCreate(interaction);
        return;
      case 'edit':
        await this.runEdit(interaction);
        return;
      case 'delete':
        await this.runDelete(interaction);
        return;
      case 'list':
        await this.runList(interaction);
        return;
      case 'repost':
        await this.runRepost(interaction);
        return;
    }
  }

  private async runCreate(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel('channel', true);
    const title = interaction.options.getString('title', false) ?? undefined;
    const description = interaction.options.getString('description', false) ?? undefined;
    const placeholder = interaction.options.getString('placeholder', false) ?? undefined;

    const result = await this.container.services.rolePicker.createPanel({
      guildId: interaction.guildId,
      channelId: channel.id,
      ...(title !== undefined ? { embedTitle: title } : {}),
      ...(description !== undefined ? { embedDescription: description } : {}),
      ...(placeholder !== undefined ? { placeholder } : {}),
    });
    if (!result.ok) {
      await interaction.editReply({ content: result.error.message });
      return;
    }
    await interaction.editReply({
      content: `Created role-picker panel for <#${channel.id}>. (Panel ID: \`${result.value.panel.id}\`)\nNext: \`/rolepicker option add panel:${result.value.panel.id}\` to add options, then \`/rolepicker repost\` to publish.`,
    });
  }

  private async runEdit(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const panelId = interaction.options.getString('panel', true);
    const channel = interaction.options.getChannel('channel', false);
    const title = interaction.options.getString('title', false);
    const description = interaction.options.getString('description', false);
    const placeholder = interaction.options.getString('placeholder', false);

    const result = await this.container.services.rolePicker.editPanel(panelId, {
      ...(channel !== null ? { channelId: channel.id } : {}),
      ...(title !== null ? { embedTitle: title } : {}),
      ...(description !== null ? { embedDescription: description } : {}),
      ...(placeholder !== null ? { placeholder } : {}),
    });
    if (!result.ok) {
      await interaction.editReply({ content: result.error.message });
      return;
    }
    await interaction.editReply({
      content: `Updated role-picker panel \`${panelId}\`. Run \`/rolepicker repost\` to publish.`,
    });
  }

  private async runDelete(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const panelId = interaction.options.getString('panel', true);
    const result = await this.container.services.rolePicker.deletePanel(panelId);
    if (!result.ok) {
      const message =
        result.error instanceof NotFoundError ? result.error.message : i18n.common.errors.generic;
      await interaction.editReply({ content: message });
      return;
    }
    await interaction.editReply({ content: `Deleted role-picker panel \`${panelId}\`.` });
  }

  private async runList(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    const panels = await this.container.services.rolePicker.listPanels(interaction.guildId);
    if (panels.length === 0) {
      await interaction.reply({
        content: 'No role-picker panels configured yet. Use `/rolepicker create` to add one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const lines = [
      '**Configured role-picker panels:**',
      ...panels.map(
        (p) => `• <#${p.channelId}> — \`${p.id}\` (${String(p.options.length)} option(s))`,
      ),
    ];
    await interaction.reply({
      content: lines.join('\n'),
      flags: MessageFlags.Ephemeral,
    });
  }

  private async runRepost(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const panelId = interaction.options.getString('panel', true);
    const result = await this.container.services.rolePicker.repostPanel(panelId);
    if (!result.ok) {
      await interaction.editReply({ content: result.error.message });
      return;
    }
    await interaction.editReply({
      content: `Reposted role-picker panel \`${panelId}\`. New message: \`${result.value.messageId}\`.`,
    });
  }

  private async runOptionAdd(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const panelId = interaction.options.getString('panel', true);
    const label = interaction.options.getString('label', true);
    const role = interaction.options.getRole('role', true);
    const position = interaction.options.getInteger('position', true);
    const description = interaction.options.getString('description', false) ?? undefined;
    const emoji = interaction.options.getString('emoji', false) ?? undefined;

    const result = await this.container.services.rolePicker.addOption(panelId, {
      label,
      roleId: role.id,
      position,
      ...(description !== undefined ? { description } : {}),
      ...(emoji !== undefined ? { emoji } : {}),
    });
    if (!result.ok) {
      const message =
        result.error instanceof ConflictError ||
        result.error instanceof NotFoundError ||
        result.error instanceof ValidationError
          ? result.error.message
          : i18n.common.errors.generic;
      await interaction.editReply({ content: message });
      return;
    }
    const emojiDisplay = emoji !== undefined ? `${emoji} ` : '';
    await interaction.editReply({
      content: `Added option \`${result.value.id}\` (${emojiDisplay}**${label}** → <@&${role.id}>, slot ${String(position)}) to panel \`${panelId}\`. Run \`/rolepicker repost\` to publish.`,
    });
  }

  private async runOptionEdit(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const optionId = interaction.options.getString('option', true);
    const label = interaction.options.getString('label', false);
    const description = interaction.options.getString('description', false);
    const emoji = interaction.options.getString('emoji', false);
    const role = interaction.options.getRole('role', false);
    const position = interaction.options.getInteger('position', false);

    const result = await this.container.services.rolePicker.editOption(optionId, {
      ...(label !== null ? { label } : {}),
      ...(description !== null ? { description } : {}),
      ...(emoji !== null ? { emoji } : {}),
      ...(role !== null ? { roleId: role.id } : {}),
      ...(position !== null ? { position } : {}),
    });
    if (!result.ok) {
      await interaction.editReply({ content: result.error.message });
      return;
    }
    await interaction.editReply({ content: `Updated option \`${optionId}\`.` });
  }

  private async runOptionRemove(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const optionId = interaction.options.getString('option', true);
    const result = await this.container.services.rolePicker.removeOption(optionId);
    if (!result.ok) {
      await interaction.editReply({ content: result.error.message });
      return;
    }
    await interaction.editReply({ content: `Removed option \`${optionId}\`.` });
  }
}
