'use server';

import { and, dbDrizzle, eq, schema } from '@hearth/database';
import { err, isErr, ok } from '@hearth/shared';
import {
  type VerificationOptionEdit,
  VerificationOptionEditSchema,
  type VerificationOptionInput,
  VerificationOptionInputSchema,
} from '@hearth/verification-core';
import { revalidatePath } from 'next/cache';

import type { VerificationActionResult } from './verification.js';

import { authorizeGuild } from '@/lib/server-auth';

const MAX_OPTIONS_PER_PANEL = 5;

export type { VerificationActionResult };

interface AddOptionArgs {
  readonly guildId: string;
  readonly panelId: string;
  readonly input: VerificationOptionInput;
}

/**
 * Add a button to a verification panel. Enforces:
 *  - the panel exists in the user's guild
 *  - 5-button per-panel limit (Discord action row)
 *  - unique label + position within the panel
 *
 * Discord re-render is NOT triggered here — operators usually add several
 * options then set-correct then repost. Re-rendering after each option
 * would just show stale "no correct option" embeds.
 */
export async function addVerificationOption(
  args: AddOptionArgs,
): Promise<VerificationActionResult<{ optionId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const parsed = VerificationOptionInputSchema.safeParse(args.input);
  if (!parsed.success) {
    return err({ code: 'VALIDATION_ERROR', message: parsed.error.message });
  }

  const panel = await dbDrizzle.query.verificationPanel.findFirst({
    where: eq(schema.verificationPanel.id, args.panelId),
    with: { options: true },
  });
  if (panel === undefined || panel.guildId !== args.guildId) {
    return err({ code: 'NOT_FOUND', message: 'Verification panel not found.' });
  }
  if (panel.options.length >= MAX_OPTIONS_PER_PANEL) {
    return err({
      code: 'CONFLICT',
      message: 'A verification panel can have at most 5 options.',
    });
  }
  if (panel.options.some((o) => o.label === parsed.data.label)) {
    return err({
      code: 'CONFLICT',
      message: 'An option with this label already exists on this panel.',
    });
  }
  if (panel.options.some((o) => o.position === parsed.data.position)) {
    return err({
      code: 'CONFLICT',
      message: 'An option already exists at this button position.',
    });
  }

  const [created] = await dbDrizzle
    .insert(schema.verificationOption)
    .values({
      panelId: args.panelId,
      label: parsed.data.label,
      emoji: parsed.data.emoji,
      buttonStyle: parsed.data.buttonStyle,
      position: parsed.data.position,
    })
    .returning();
  if (created === undefined) {
    return err({ code: 'INTERNAL_ERROR', message: 'Failed to insert option.' });
  }

  revalidatePath(`/g/${args.guildId}/verification/${args.panelId}`);

  return ok({
    value: { optionId: created.id },
    discordSyncFailed: false,
  });
}

interface UpdateOptionArgs {
  readonly guildId: string;
  readonly panelId: string;
  readonly optionId: string;
  readonly input: VerificationOptionEdit;
}

export async function updateVerificationOption(
  args: UpdateOptionArgs,
): Promise<VerificationActionResult<{ optionId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const parsed = VerificationOptionEditSchema.safeParse(args.input);
  if (!parsed.success) {
    return err({ code: 'VALIDATION_ERROR', message: parsed.error.message });
  }

  const [existing] = await dbDrizzle
    .select()
    .from(schema.verificationOption)
    .where(eq(schema.verificationOption.id, args.optionId))
    .limit(1);
  if (existing === undefined || existing.panelId !== args.panelId) {
    return err({ code: 'NOT_FOUND', message: 'Option not found on this panel.' });
  }

  // Sibling collision checks — only the columns the operator is changing.
  if (parsed.data.label !== undefined && parsed.data.label !== existing.label) {
    const dup = await dbDrizzle.query.verificationOption.findFirst({
      where: and(
        eq(schema.verificationOption.panelId, args.panelId),
        eq(schema.verificationOption.label, parsed.data.label),
      ),
    });
    if (dup !== undefined && dup.id !== args.optionId) {
      return err({
        code: 'CONFLICT',
        message: 'An option with this label already exists on this panel.',
      });
    }
  }
  if (parsed.data.position !== undefined && parsed.data.position !== existing.position) {
    const dup = await dbDrizzle.query.verificationOption.findFirst({
      where: and(
        eq(schema.verificationOption.panelId, args.panelId),
        eq(schema.verificationOption.position, parsed.data.position),
      ),
    });
    if (dup !== undefined && dup.id !== args.optionId) {
      return err({
        code: 'CONFLICT',
        message: 'An option already exists at this button position.',
      });
    }
  }

  const updates: Partial<typeof schema.verificationOption.$inferInsert> = {};
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;
  if (parsed.data.emoji !== undefined) updates.emoji = parsed.data.emoji;
  if (parsed.data.buttonStyle !== undefined) updates.buttonStyle = parsed.data.buttonStyle;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;

  if (Object.keys(updates).length > 0) {
    await dbDrizzle
      .update(schema.verificationOption)
      .set(updates)
      .where(eq(schema.verificationOption.id, args.optionId));
  }

  revalidatePath(`/g/${args.guildId}/verification/${args.panelId}`);

  return ok({
    value: { optionId: args.optionId },
    discordSyncFailed: false,
  });
}

interface RemoveOptionArgs {
  readonly guildId: string;
  readonly panelId: string;
  readonly optionId: string;
}

/**
 * Remove an option. Rejects when the option is the panel's current
 * correct one — operator must set-correct on a different option first.
 */
export async function removeVerificationOption(
  args: RemoveOptionArgs,
): Promise<VerificationActionResult<{ removedId: string }>> {
  const auth = await authorizeGuild(args.guildId);
  if (isErr(auth)) return err(auth.error);

  const [panel] = await dbDrizzle
    .select()
    .from(schema.verificationPanel)
    .where(eq(schema.verificationPanel.id, args.panelId))
    .limit(1);
  if (panel === undefined || panel.guildId !== args.guildId) {
    return err({ code: 'NOT_FOUND', message: 'Verification panel not found.' });
  }
  if (panel.correctOptionId === args.optionId) {
    return err({
      code: 'CONFLICT',
      message: 'Set a different correct option before removing the current one.',
    });
  }

  await dbDrizzle
    .delete(schema.verificationOption)
    .where(eq(schema.verificationOption.id, args.optionId));

  revalidatePath(`/g/${args.guildId}/verification/${args.panelId}`);

  return ok({
    value: { removedId: args.optionId },
    discordSyncFailed: false,
  });
}
