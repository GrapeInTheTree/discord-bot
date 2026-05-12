import { decode, matchesAction } from '@hearth/tickets-core';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type StringSelectMenuInteraction } from 'discord.js';

interface SelectionPayload {
  readonly panelId: string;
}

/**
 * StringSelectMenu submission handler for role-picker panels. Sapphire
 * routes any `interaction.isAnySelectMenu()` event into the
 * `select-menus/` subfolder; we filter by customId prefix
 * `role-picker:submit|...` so the same folder can host other future
 * SelectMenu domains without collision.
 *
 * Flow:
 *   ① parse: matchesAction → decode payload, else this.none()
 *   ② deferReply ephemeral (gives us 15 minutes to follow up)
 *   ③ services.rolePicker.handleSelection({panelId, userId, selectedValues})
 *   ④ editReply with the i18n ephemeral confirm copy
 *
 * Service does the heavy lifting (diff vs currentlyHeld, role ops,
 * audit writes). Handler stays thin so the bot doesn't accumulate
 * domain logic outside @hearth/role-picker-core.
 */
export class RolePickerSubmitHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.SelectMenu });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (!matchesAction(interaction.customId, 'role-picker:submit')) return this.none();
    try {
      return this.some<SelectionPayload>(decode(interaction.customId, 'role-picker:submit'));
    } catch (err) {
      this.container.logger.warn('role-picker-submit: malformed customId', err);
      return this.none();
    }
  }

  public async run(
    interaction: StringSelectMenuInteraction,
    payload: SelectionPayload,
  ): Promise<void> {
    if (interaction.guildId === null) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await this.container.services.rolePicker.handleSelection({
      panelId: payload.panelId,
      userId: interaction.user.id,
      selectedValues: interaction.values,
    });
    if (!result.ok) {
      this.container.logger.error('role-picker-submit: service error', result.error);
      await interaction.editReply({
        content: 'Something went wrong while updating your roles. Please try again later.',
      });
      return;
    }

    const { grantedCount, revokedCount, failedCount, grantedLabels, revokedLabels } = result.value;
    await interaction.editReply({
      content: renderEphemeral({
        grantedCount,
        revokedCount,
        failedCount,
        grantedLabels,
        revokedLabels,
      }),
    });
  }
}

interface RenderInput {
  readonly grantedCount: number;
  readonly revokedCount: number;
  readonly failedCount: number;
  readonly grantedLabels: readonly string[];
  readonly revokedLabels: readonly string[];
}

function renderEphemeral(input: RenderInput): string {
  if (input.grantedCount === 0 && input.revokedCount === 0) {
    if (input.failedCount > 0) {
      return 'Your role could not be updated — the bot is missing permissions or its role is below the target role. Please contact a server administrator.';
    }
    return 'No change.';
  }
  if (input.grantedCount > 0 && input.revokedCount > 0) {
    return `Updated. Removed: ${input.revokedLabels.join(', ')}. Added: ${input.grantedLabels.join(', ')}.${
      input.failedCount > 0 ? ' Some changes failed — contact an administrator.' : ''
    }`;
  }
  if (input.grantedCount > 0) {
    return `Added: ${input.grantedLabels.join(', ')}.${
      input.failedCount > 0 ? ' Some changes failed — contact an administrator.' : ''
    }`;
  }
  return `Removed: ${input.revokedLabels.join(', ')}.${
    input.failedCount > 0 ? ' Some changes failed — contact an administrator.' : ''
  }`;
}
