import type { PanelTicketType } from '@discord-bot/database';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { encode } from './customId.js';

// Panel message components: one button per active PanelTicketType, the
// customId encodes (panelId, typeId) so the panel-open handler can route
// directly without a per-deployment lookup table.
//
// Discord allows up to 5 buttons per ActionRow and up to 5 rows per
// message. We chunk types across rows respecting the 5-per-row limit;
// an operator with 25+ types should split them across multiple panels.

const MAX_BUTTONS_PER_ROW = 5;
const MAX_ROWS_PER_MESSAGE = 5;

const STYLE_MAP: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

export type PanelComponentRow = ReturnType<ActionRowBuilder<ButtonBuilder>['toJSON']>;

/**
 * Render the panel's button rows. Empty `types` yields zero rows — the
 * panel embed displays without any buttons (operator's signal to add
 * types via /panel ticket-type add).
 *
 * Throws if the operator configured more types than fit (5 rows × 5).
 * That's a hard Discord limit, not something we want to silently truncate.
 */
export function buildPanelComponents(types: readonly PanelTicketType[]): PanelComponentRow[] {
  if (types.length === 0) return [];
  const ordered = [...types].sort(byButtonOrder);
  const maxButtons = MAX_BUTTONS_PER_ROW * MAX_ROWS_PER_MESSAGE;
  if (ordered.length > maxButtons) {
    throw new Error(
      `Panel has ${String(ordered.length)} ticket types but Discord allows at most ${String(maxButtons)} buttons per message`,
    );
  }

  const rows: PanelComponentRow[] = [];
  for (let i = 0; i < ordered.length; i += MAX_BUTTONS_PER_ROW) {
    const slice = ordered.slice(i, i + MAX_BUTTONS_PER_ROW);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...slice.map((t) => buildButton(t)),
    );
    rows.push(row.toJSON());
  }
  return rows;
}

function buildButton(type: PanelTicketType): ButtonBuilder {
  const builder = new ButtonBuilder()
    .setCustomId(encode('panel:open', { panelId: type.panelId, typeId: type.id }))
    .setLabel(type.buttonLabel ?? type.name)
    .setStyle(STYLE_MAP[type.buttonStyle] ?? ButtonStyle.Success);
  if (type.emoji !== '') {
    builder.setEmoji(type.emoji);
  }
  return builder;
}

function byButtonOrder(a: PanelTicketType, b: PanelTicketType): number {
  if (a.buttonOrder !== b.buttonOrder) return a.buttonOrder - b.buttonOrder;
  // Stable secondary sort by name to make tests deterministic.
  return a.name.localeCompare(b.name);
}
