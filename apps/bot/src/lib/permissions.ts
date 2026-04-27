import { PermissionError } from '@discord-bot/shared';
import { PermissionFlagsBits } from 'discord.js';

/**
 * Check whether a permission bitfield grants the ManageGuild permission.
 * Pure bigint math — accepts the raw bitfield from `interaction.memberPermissions`
 * via `.bitfield` so this function stays free of discord.js types and is unit-testable.
 */
export function hasManageGuild(bits: bigint): boolean {
  return (bits & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild;
}

/**
 * Check whether the actor is on at least one configured support role. We use
 * Set lookup so a user with many roles doesn't trigger O(n*m) scans.
 */
export function isSupportStaff(
  actorRoleIds: readonly string[],
  supportRoleIds: readonly string[],
): boolean {
  if (supportRoleIds.length === 0) return false;
  const supportSet = new Set(supportRoleIds);
  return actorRoleIds.some((r) => supportSet.has(r));
}

/**
 * Throwing variant of hasManageGuild — surfaces a user-facing PermissionError
 * which the global interaction-error listener maps to the i18n notAdmin reply.
 */
export function assertManageGuild(bits: bigint): void {
  if (!hasManageGuild(bits)) {
    throw new PermissionError('Action requires Manage Guild permission');
  }
}

/**
 * Throwing variant of isSupportStaff.
 */
export function assertSupportStaff(
  actorRoleIds: readonly string[],
  supportRoleIds: readonly string[],
): void {
  if (!isSupportStaff(actorRoleIds, supportRoleIds)) {
    throw new PermissionError('Action requires support staff role');
  }
}
