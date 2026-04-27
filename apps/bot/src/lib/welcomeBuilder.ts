import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type EmbedData } from 'discord.js';

import { branding } from '../config/branding.js';
import { format, i18n } from '../i18n/index.js';

import { encode } from './customId.js';

// Welcome message state machine.
//
// open    → Claim(primary) ✅, Close(secondary) ✅, Reopen(disabled), Delete(danger) ✅
// claimed → Claim(disabled, label "Claimed by {user}"), Close ✅, Reopen(disabled), Delete ✅
// closed  → Claim(disabled), Close(disabled), Reopen(success) ✅, Delete(danger) ✅
//
// The buttons are stateless — every customId encodes only `ticketId`, so the
// bot reads current state from the DB on every click. This means redeploys
// and crashes never leave a stale button.

export type WelcomeButtonState = 'open' | 'claimed' | 'closed';

export interface WelcomeMessageInput {
  readonly state: WelcomeButtonState;
  readonly ticketId: string;
  readonly claimedByDisplay?: string;
  /**
   * Override copy for the welcome body. Falls back to i18n.tickets.welcome.default.
   * Lets a PanelTicketType.welcomeMessage customize per-type without code changes.
   */
  readonly bodyOverride?: string;
}

export interface WelcomeMessagePayload {
  readonly content: string | undefined;
  readonly embeds: EmbedData[];
  readonly components: ReturnType<typeof buildButtons>;
}

export function buildWelcomeMessage(input: WelcomeMessageInput): WelcomeMessagePayload {
  const body = input.bodyOverride ?? i18n.tickets.welcome.default;
  return {
    content: undefined,
    embeds: [
      {
        description: body,
        color: branding.color,
        ...(branding.footerText !== undefined ? { footer: { text: branding.footerText } } : {}),
      },
    ],
    components: buildButtons(input),
  };
}

function buildButtons(
  input: WelcomeMessageInput,
): ReturnType<ActionRowBuilder<ButtonBuilder>['toJSON']>[] {
  const claim = new ButtonBuilder()
    .setCustomId(encode('ticket:claim', { ticketId: input.ticketId }))
    .setLabel(claimLabel(input))
    .setStyle(input.state === 'open' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    .setDisabled(input.state !== 'open');

  const close = new ButtonBuilder()
    .setCustomId(encode('ticket:close', { ticketId: input.ticketId }))
    .setLabel(i18n.tickets.buttons.close)
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(input.state === 'closed');

  const reopen = new ButtonBuilder()
    .setCustomId(encode('ticket:reopen', { ticketId: input.ticketId }))
    .setLabel(i18n.tickets.buttons.reopen)
    .setEmoji('🔓')
    .setStyle(ButtonStyle.Success)
    .setDisabled(input.state !== 'closed');

  const del = new ButtonBuilder()
    .setCustomId(encode('ticket:delete', { ticketId: input.ticketId }))
    .setLabel(i18n.tickets.buttons.delete)
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claim, close, reopen, del);
  return [row.toJSON()];
}

function claimLabel(input: WelcomeMessageInput): string {
  if (input.state === 'claimed' && input.claimedByDisplay !== undefined) {
    return format(i18n.tickets.buttons.claimedBy, { user: input.claimedByDisplay });
  }
  return i18n.tickets.buttons.claim;
}
