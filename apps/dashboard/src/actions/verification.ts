'use server';

import { dbDrizzle, eq, schema } from '@hearth/database';
import { type ActionError, type Result, err, isErr, ok } from '@hearth/shared';
import {
  type VerificationPanelInput,
  VerificationPanelInputSchema,
} from '@hearth/verification-core';
import { revalidatePath } from 'next/cache';

// Server Actions for verification panel CRUD. Each action follows the
// same pipeline as the panel actions:
//  1) authorize the user (Manage Guild on target guild)
//  2) validate input via the shared zod schema
//  3) write to the DB directly (single source of truth — same DB the bot
//     uses); Discord-side rendering goes through the bot's HTTP API.
//  4) revalidate Next.js cache paths so RSC pages refresh.
//
// Discord-side render failure does NOT roll back the DB write — the form
// surfaces a "Saved. Discord re-render queued" banner using the
// `discordSyncFailed` flag, and a Retry Sync action recovers.

import { callBot } from '@/lib/botClient';
import { authorizeGuild } from '@/lib/server-auth';

export type VerificationActionResult<T> = Result<
  { value: T; discordSyncFailed: boolean; discordSyncMessage?: string },
  ActionError
>;

interface CreatePanelArgs {
  readonly guildId: string;
  readonly input: VerificationPanelInput;
}

/**
 * Create a verification panel placeholder. Discord render is NOT triggered
 * yet — the operator must add options + set-correct + repost before the
 * panel can be published (the bot's render endpoint rejects publication
 * when correctOptionId is null).
 */
export async function createVerificationPanel(
  args: CreatePanelArgs,
): Promise<VerificationActionResult<{ panelId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const parsed = VerificationPanelInputSchema.safeParse(args.input);
  if (!parsed.success) {
    return err({ code: 'VALIDATION_ERROR', message: parsed.error.message });
  }
  if (parsed.data.guildId !== args.guildId) {
    return err({ code: 'VALIDATION_ERROR', message: 'guildId in form does not match URL' });
  }

  const [created] = await dbDrizzle
    .insert(schema.verificationPanel)
    .values({
      guildId: parsed.data.guildId,
      channelId: parsed.data.channelId,
      messageId: 'pending',
      embedTitle: parsed.data.embedTitle ?? 'Verification',
      embedDescription:
        parsed.data.embedDescription ??
        'Click the correct option below to receive your verification role.',
      roleId: parsed.data.roleId,
    })
    .returning();
  if (created === undefined) {
    return err({ code: 'INTERNAL_ERROR', message: 'Failed to create verification panel row' });
  }

  revalidatePath(`/g/${args.guildId}/verification`);

  return ok({
    value: { panelId: created.id },
    discordSyncFailed: false,
  });
}

interface UpdatePanelArgs {
  readonly guildId: string;
  readonly panelId: string;
  readonly channelId: string | undefined;
  readonly embedTitle: string | undefined;
  readonly embedDescription: string | undefined;
  readonly roleId: string | undefined;
}

export async function updateVerificationPanel(
  args: UpdatePanelArgs,
): Promise<VerificationActionResult<{ panelId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const updates: Partial<typeof schema.verificationPanel.$inferInsert> = {};
  if (args.channelId !== undefined) updates.channelId = args.channelId;
  if (args.embedTitle !== undefined) updates.embedTitle = args.embedTitle;
  if (args.embedDescription !== undefined) updates.embedDescription = args.embedDescription;
  if (args.roleId !== undefined) updates.roleId = args.roleId;
  if (Object.keys(updates).length > 0) {
    await dbDrizzle
      .update(schema.verificationPanel)
      .set(updates)
      .where(eq(schema.verificationPanel.id, args.panelId));
  }

  const renderResult = await callBot<{ messageId: string; recreated: boolean }>({
    path: `/internal/verifications/${args.panelId}/render`,
    method: 'POST',
    body: {},
  });

  revalidatePath(`/g/${args.guildId}/verification`);
  revalidatePath(`/g/${args.guildId}/verification/${args.panelId}`);

  if (isErr(renderResult)) {
    // 'NOT_FOUND' / 'CONFLICT' are the panel-state cases the user is
    // about to fix (e.g. set-correct missing). Surface them as warnings
    // not failures — the DB write succeeded.
    return ok({
      value: { panelId: args.panelId },
      discordSyncFailed: true,
      discordSyncMessage: renderResult.error.message,
    });
  }

  return ok({
    value: { panelId: args.panelId },
    discordSyncFailed: false,
  });
}

export async function deleteVerificationPanel(args: {
  readonly guildId: string;
  readonly panelId: string;
}): Promise<VerificationActionResult<{ panelId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const deleteResult = await callBot<{ deleted: boolean; panelId: string }>({
    path: `/internal/verifications/${args.panelId}`,
    method: 'DELETE',
  });

  revalidatePath(`/g/${args.guildId}/verification`);

  if (isErr(deleteResult)) {
    return err({ code: deleteResult.error.code, message: deleteResult.error.message });
  }
  return ok({
    value: { panelId: deleteResult.value.panelId },
    discordSyncFailed: false,
  });
}

export async function repostVerificationPanel(args: {
  readonly guildId: string;
  readonly panelId: string;
}): Promise<VerificationActionResult<{ panelId: string; messageId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const result = await callBot<{ messageId: string; previousMessageId: string }>({
    path: `/internal/verifications/${args.panelId}/repost`,
    method: 'POST',
    body: {},
  });
  revalidatePath(`/g/${args.guildId}/verification/${args.panelId}`);
  if (isErr(result)) {
    return ok({
      value: { panelId: args.panelId, messageId: '' },
      discordSyncFailed: true,
      discordSyncMessage: result.error.message,
    });
  }
  return ok({
    value: { panelId: args.panelId, messageId: result.value.messageId },
    discordSyncFailed: false,
  });
}

export async function retrySyncVerificationPanel(args: {
  readonly guildId: string;
  readonly panelId: string;
}): Promise<VerificationActionResult<{ panelId: string; messageId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const renderResult = await callBot<{ messageId: string; recreated: boolean }>({
    path: `/internal/verifications/${args.panelId}/render`,
    method: 'POST',
    body: {},
  });
  revalidatePath(`/g/${args.guildId}/verification/${args.panelId}`);
  if (isErr(renderResult)) {
    return ok({
      value: { panelId: args.panelId, messageId: '' },
      discordSyncFailed: true,
      discordSyncMessage: renderResult.error.message,
    });
  }
  return ok({
    value: { panelId: args.panelId, messageId: renderResult.value.messageId },
    discordSyncFailed: false,
  });
}

interface SetCorrectArgs {
  readonly guildId: string;
  readonly panelId: string;
  readonly optionId: string;
}

/**
 * Mark which option grants the role. Validates option belongs to panel.
 */
export async function setCorrectVerificationOption(
  args: SetCorrectArgs,
): Promise<VerificationActionResult<{ panelId: string; optionId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const [option] = await dbDrizzle
    .select()
    .from(schema.verificationOption)
    .where(eq(schema.verificationOption.id, args.optionId))
    .limit(1);
  if (option === undefined || option.panelId !== args.panelId) {
    return err({
      code: 'NOT_FOUND',
      message: 'Option does not belong to this verification panel.',
    });
  }

  await dbDrizzle
    .update(schema.verificationPanel)
    .set({ correctOptionId: args.optionId })
    .where(eq(schema.verificationPanel.id, args.panelId));

  revalidatePath(`/g/${args.guildId}/verification/${args.panelId}`);

  return ok({
    value: { panelId: args.panelId, optionId: args.optionId },
    discordSyncFailed: false,
  });
}
