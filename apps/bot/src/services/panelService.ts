import { type DbClient, type Panel, type PanelTicketType } from '@discord-bot/database';
import type { ValidationError } from '@discord-bot/shared';
import { err, NotFoundError, ok, type Result } from '@discord-bot/shared';

import type { Branding } from '../config/branding.js';
import { format, i18n } from '../i18n/index.js';

import type { DiscordGateway, PanelMessagePayload } from './ports/discordGateway.js';

export type PanelType = 'support' | 'offer';

export interface UpsertPanelInput {
  readonly guildId: string;
  readonly channelId: string;
  readonly type: PanelType;
  readonly activeCategoryId: string;
  readonly supportRoleIds: readonly string[];
  readonly pingRoleIds: readonly string[];
  readonly perUserLimit: number;
  /** Optional welcome-message override; null falls back to i18n default. */
  readonly welcomeMessageOverride?: string;
  /** For cross-ref in the support panel description. */
  readonly otherPanelChannelId?: string;
}

export interface UpsertPanelResult {
  readonly panel: Panel;
  readonly ticketType: PanelTicketType;
  readonly messageId: string;
  readonly created: boolean;
}

/**
 * Panel = a public message with an "Open ticket" button. One panel per
 * channel per type (Fannie pattern). Idempotent: re-running upsertPanel
 * with the same (guildId, channelId) edits the existing message instead
 * of creating duplicates.
 */
export class PanelService {
  public constructor(
    private readonly db: DbClient,
    private readonly gateway: DiscordGateway,
    private readonly branding: Branding,
  ) {}

  public async upsertPanel(
    input: UpsertPanelInput,
  ): Promise<Result<UpsertPanelResult, ValidationError>> {
    const payload = this.buildPanelPayload(input);
    const existing = await this.db.panel.findFirst({
      where: { guildId: input.guildId, channelId: input.channelId },
      include: { ticketTypes: true },
    });

    if (existing !== null) {
      // Try to edit the live message first. If Discord 404s (message was
      // deleted out-of-band), fall through to recreate.
      try {
        await this.gateway.editPanelMessage(existing.channelId, existing.messageId, payload);
        const ticketType = await this.upsertTicketType(existing.id, input);
        return ok({
          panel: existing,
          ticketType,
          messageId: existing.messageId,
          created: false,
        });
      } catch {
        // Fall through to send + replace.
      }
    }

    const { messageId } = await this.gateway.sendPanelMessage(input.channelId, payload);
    const panel =
      existing ??
      (await this.db.panel.create({
        data: {
          guildId: input.guildId,
          channelId: input.channelId,
          messageId,
          embedTitle: this.embedTitle(input.type),
          embedDescription: this.embedDescription(input),
        },
      }));

    if (existing !== null) {
      await this.db.panel.update({
        where: { id: existing.id },
        data: {
          messageId,
          embedTitle: this.embedTitle(input.type),
          embedDescription: this.embedDescription(input),
        },
      });
    }

    const ticketType = await this.upsertTicketType(panel.id, input);

    return ok({ panel, ticketType, messageId, created: existing === null });
  }

  public async getPanelTypeForOpen(
    panelId: string,
    typeId: string,
  ): Promise<Result<{ panel: Panel; type: PanelTicketType }, NotFoundError>> {
    const panel = await this.db.panel.findUnique({
      where: { id: panelId },
      include: { ticketTypes: true },
    });
    if (panel === null) return err(new NotFoundError(`Panel ${panelId} not found`));
    const type = panel.ticketTypes.find((t) => t.id === typeId);
    if (type === undefined) {
      return err(new NotFoundError(`PanelTicketType ${typeId} not found on panel ${panelId}`));
    }
    return ok({ panel, type });
  }

  public async listPanels(guildId: string): Promise<Panel[]> {
    return await this.db.panel.findMany({ where: { guildId }, orderBy: { createdAt: 'asc' } });
  }

  // ─────────────────────────── private ───────────────────────────

  private async upsertTicketType(
    panelId: string,
    input: UpsertPanelInput,
  ): Promise<PanelTicketType> {
    const existingType = await this.db.panelTicketType.findFirst({
      where: { panelId, name: input.type },
    });
    const data = {
      panelId,
      name: input.type,
      emoji: input.type === 'support' ? '📨' : '🤝',
      buttonStyle: 'success' as const,
      buttonLabel: 'Open ticket',
      buttonOrder: 0,
      activeCategoryId: input.activeCategoryId,
      supportRoleIds: [...input.supportRoleIds],
      pingRoleIds: [...input.pingRoleIds],
      perUserLimit: input.perUserLimit,
      welcomeMessage: input.welcomeMessageOverride ?? null,
    };
    if (existingType === null) {
      return await this.db.panelTicketType.create({ data });
    }
    return await this.db.panelTicketType.update({ where: { id: existingType.id }, data });
  }

  private buildPanelPayload(input: UpsertPanelInput): PanelMessagePayload {
    return {
      content: undefined,
      embeds: [
        {
          title: this.embedTitle(input.type),
          description: this.embedDescription(input),
          color: this.branding.color,
        },
      ],
      // Components are wired in PR-3 (admin command sends with the actual button);
      // this service only persists Panel + TicketType + the embed body.
      components: [],
    };
  }

  private embedTitle(type: PanelType): string {
    return type === 'support' ? 'Support' : 'Offer';
  }

  private embedDescription(input: UpsertPanelInput): string {
    const base =
      input.type === 'support'
        ? i18n.tickets.panel.embedDescriptionSupport
        : i18n.tickets.panel.embedDescriptionOffer;
    if (input.otherPanelChannelId === undefined) return base;
    return format(base, { offerChannel: `<#${input.otherPanelChannelId}>` });
  }
}
