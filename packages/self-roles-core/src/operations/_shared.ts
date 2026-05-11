// Shared constants + types used by the three operation classes
// (panel, option, reaction) that make up SelfRolesService. Lives in
// _shared because the operation files are siblings — keeping the
// types here avoids any one of them becoming the de-facto base.

import type { SelfRolesAction, SelfRolesOption, SelfRolesPanel } from '@hearth/database';

export const PLACEHOLDER_MESSAGE_ID = 'pending';
export const MAX_OPTIONS_PER_PANEL = 20;

export interface SelfRolesPanelInput {
  readonly guildId: string;
  readonly channelId: string;
  /** Operator-supplied embed title; falls back to i18n default. */
  readonly embedTitle?: string;
  /** Operator-supplied embed description; falls back to i18n default. */
  readonly embedDescription?: string;
}

export interface SelfRolesPanelEditInput {
  readonly channelId?: string;
  readonly embedTitle?: string;
  readonly embedDescription?: string;
}

export interface SelfRolesOptionInput {
  readonly label: string;
  readonly emoji: string;
  readonly roleId: string;
  readonly position: number;
}

export interface SelfRolesOptionEditInput {
  readonly label?: string;
  readonly emoji?: string;
  readonly roleId?: string;
  readonly position?: number;
}

export interface SelfRolesPanelWithOptions extends SelfRolesPanel {
  readonly options: SelfRolesOption[];
}

export interface SelfRolesCreateResult {
  readonly panel: SelfRolesPanel;
  readonly created: boolean;
}

/** Outcome of a single reaction event. 'noop' covers anything that left
 *  the user's role state unchanged — Discord rejected the role op, or
 *  the reaction targeted a message/emoji the bot doesn't track. */
export interface SelfRolesReactionResult {
  readonly action: SelfRolesAction;
  readonly roleId?: string;
}

export function sortOptions(options: readonly SelfRolesOption[]): SelfRolesOption[] {
  return [...options].sort((a, b) => a.position - b.position);
}
