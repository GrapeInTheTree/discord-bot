import {
  ConflictError,
  NotFoundError,
  PermissionError,
  ValidationError,
} from '@discord-bot/shared';
import { Events, Listener } from '@sapphire/framework';
import type { ChatInputCommandErrorPayload, InteractionHandlerError } from '@sapphire/framework';
import type { Interaction } from 'discord.js';
import { MessageFlags } from 'discord.js';

import { i18n } from '../i18n/index.js';

// Sapphire's InteractionHandlerError event fires when a handler throws —
// distinct from a service returning Result.err(). Service-level errors are
// already mapped to ephemeral replies inside the handler. This listener is
// the safety net for unexpected throws (programmer errors, network blips,
// AppError leaks past Result-mapping).
//
// Strategy: AppError.userFacing===true → reply with error.message
//           anything else                → log + Sentry + generic copy
//
// Sapphire surfaces a separate event (ChatInputCommandError) for slash
// commands; we register both with the same handler.

export class InteractionHandlerErrorListener extends Listener<
  typeof Events.InteractionHandlerError
> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.InteractionHandlerError });
  }

  public override async run(error: unknown, payload: InteractionHandlerError): Promise<void> {
    await respond(error, payload.interaction, this.container.logger);
  }
}

export class ChatInputCommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ChatInputCommandError });
  }

  public override async run(error: unknown, payload: ChatInputCommandErrorPayload): Promise<void> {
    await respond(error, payload.interaction, this.container.logger);
  }
}

async function respond(
  error: unknown,
  interaction: Interaction,
  logger: { error: (msg: string, err: unknown) => void },
): Promise<void> {
  const userFacing =
    error instanceof PermissionError ||
    error instanceof ConflictError ||
    error instanceof NotFoundError ||
    error instanceof ValidationError;
  const message = userFacing ? (error as Error).message : i18n.common.errors.generic;

  if (!userFacing) {
    logger.error('Unhandled interaction error', error);
  }

  if (!('isRepliable' in interaction) || !interaction.isRepliable()) return;

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  } catch {
    // Reply itself failed (interaction expired, missing permissions, etc.).
    // Nothing to do but stay silent so we don't spam the logs.
  }
}
