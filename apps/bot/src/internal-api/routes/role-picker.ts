import type { ServerResponse } from 'node:http';

import { DiscordApiError, NotFoundError, ValidationError } from '@hearth/shared';

import { sendError, sendJson } from '../json.js';
import type { InternalApiContext } from '../types.js';

/**
 * POST /internal/role-picker/:panelId/render
 *
 * Idempotent re-render of a role-picker panel. Dashboard Server Actions
 * hit this after mutating the panel or its options. Returns
 * ValidationError (422) when the panel has zero options — Discord
 * rejects empty StringSelectMenu components, so we catch before the
 * round-trip.
 */
export async function handleRolePickerRender(
  ctx: InternalApiContext,
  panelId: string,
  res: ServerResponse,
): Promise<void> {
  try {
    const result = await ctx.rolePicker.renderPanel(panelId);
    if (!result.ok) {
      const code =
        result.error instanceof ValidationError
          ? 'validation'
          : result.error instanceof NotFoundError
            ? 'not_found'
            : 'internal';
      sendError(res, code, result.error.message);
      return;
    }
    sendJson(res, 200, result.value);
  } catch (e) {
    if (e instanceof DiscordApiError) {
      sendError(res, 'discord_unavailable', e.message);
      return;
    }
    throw e;
  }
}

/**
 * POST /internal/role-picker/:panelId/repost
 *
 * Drop the existing message (best-effort) and post a fresh one. Existing
 * role grants on members stay — role-picker doesn't auto-revoke on
 * repost. Same ValidationError path as render for empty panels.
 */
export async function handleRolePickerRepost(
  ctx: InternalApiContext,
  panelId: string,
  res: ServerResponse,
): Promise<void> {
  try {
    const result = await ctx.rolePicker.repostPanel(panelId);
    if (!result.ok) {
      const code =
        result.error instanceof ValidationError
          ? 'validation'
          : result.error instanceof NotFoundError
            ? 'not_found'
            : 'internal';
      sendError(res, code, result.error.message);
      return;
    }
    sendJson(res, 200, result.value);
  } catch (e) {
    if (e instanceof DiscordApiError) {
      sendError(res, 'discord_unavailable', e.message);
      return;
    }
    throw e;
  }
}

/**
 * DELETE /internal/role-picker/:panelId
 *
 * Remove the Discord message (best-effort) + DB row. Cascades to
 * options and events via FK. Existing role grants on users stay — clean
 * those up via the per-option revoke-holders route before delete if
 * desired.
 */
export async function handleRolePickerDelete(
  ctx: InternalApiContext,
  panelId: string,
  res: ServerResponse,
): Promise<void> {
  try {
    const result = await ctx.rolePicker.deletePanel(panelId);
    if (!result.ok) {
      const code = result.error instanceof NotFoundError ? 'not_found' : 'internal';
      sendError(res, code, result.error.message);
      return;
    }
    sendJson(res, 200, { deleted: true, panelId: result.value.panelId });
  } catch (e) {
    if (e instanceof DiscordApiError) {
      sendError(res, 'discord_unavailable', e.message);
      return;
    }
    throw e;
  }
}

/**
 * POST /internal/role-picker/:panelId/options/:optionId/revoke-holders
 *
 * Best-effort revoke of the option's role from every audit-log-derived
 * holder. Dashboard "Remove option" modal calls this when the operator
 * opts into role cleanup. The option row is not deleted here — the
 * dashboard runs its own DELETE afterwards.
 */
export async function handleRolePickerRevokeHolders(
  ctx: InternalApiContext,
  _panelId: string,
  optionId: string,
  res: ServerResponse,
): Promise<void> {
  try {
    const result = await ctx.rolePicker.revokeRoleFromOptionHolders(optionId);
    if (!result.ok) {
      const code = result.error instanceof NotFoundError ? 'not_found' : 'internal';
      sendError(res, code, result.error.message);
      return;
    }
    sendJson(res, 200, result.value);
  } catch (e) {
    if (e instanceof DiscordApiError) {
      sendError(res, 'discord_unavailable', e.message);
      return;
    }
    throw e;
  }
}
