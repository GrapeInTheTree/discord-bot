import { and, asc, type DbDrizzle, eq, schema, type SelfRolesPanel } from '@hearth/database';
import {
  ConflictError,
  err,
  NotFoundError,
  ok,
  type Result,
  type ValidationError,
} from '@hearth/shared';
import type { Branding, SelfRolesGateway } from '@hearth/tickets-core';

import { selfRoles as i18n } from '../i18n/index.js';
import { buildSelfRolesPayload } from '../lib/selfRolesBuilder.js';

import {
  PLACEHOLDER_MESSAGE_ID,
  type SelfRolesCreateResult,
  type SelfRolesPanelEditInput,
  type SelfRolesPanelInput,
  type SelfRolesPanelWithOptions,
  sortOptions,
} from './_shared.js';

// Panel-shaped operations: CRUD + render + repost + delete. Owns the
// rerenderPanel helper that bridges DB state to Discord (sendSelfRoles
// + syncBotReactions). Renders are best-effort on the reaction-sync
// step so a single unknown emoji doesn't drop the whole panel back to
// "pending."

export class SelfRolesPanelOperations {
  public constructor(
    private readonly db: DbDrizzle,
    private readonly gateway: SelfRolesGateway,
    private readonly branding: Branding,
  ) {}

  /**
   * Create a new self-roles panel with no options. Operator must add
   * options + render before reactions become useful. Two panels can
   * coexist in the same channel only after the first one has been
   * published with a real messageId — the (guildId, channelId,
   * messageId) unique index would otherwise reject the second
   * placeholder.
   */
  public async createPanel(
    input: SelfRolesPanelInput,
  ): Promise<Result<SelfRolesCreateResult, ConflictError | ValidationError>> {
    const embedTitle = input.embedTitle ?? i18n.panel.defaultEmbedTitle;
    const embedDescription = input.embedDescription ?? i18n.panel.defaultEmbedDescription;

    const placeholderInUse = await this.db.query.selfRolesPanel.findFirst({
      where: and(
        eq(schema.selfRolesPanel.guildId, input.guildId),
        eq(schema.selfRolesPanel.channelId, input.channelId),
        eq(schema.selfRolesPanel.messageId, PLACEHOLDER_MESSAGE_ID),
      ),
    });
    if (placeholderInUse !== undefined) {
      return err(
        new ConflictError(
          'A self-roles panel is already pending publish on this channel. Repost or delete it first.',
        ),
      );
    }

    const [created] = await this.db
      .insert(schema.selfRolesPanel)
      .values({
        guildId: input.guildId,
        channelId: input.channelId,
        messageId: PLACEHOLDER_MESSAGE_ID,
        embedTitle,
        embedDescription,
      })
      .returning();
    if (created === undefined) {
      throw new Error('Failed to insert SelfRolesPanel row');
    }
    return ok({ panel: created, created: true });
  }

  public async editPanel(
    panelId: string,
    input: SelfRolesPanelEditInput,
  ): Promise<Result<SelfRolesPanel, NotFoundError>> {
    const existing = await this.findPanel(panelId);
    if (existing === undefined) {
      return err(new NotFoundError(i18n.errors.panelNotFound));
    }
    const updates: Partial<typeof schema.selfRolesPanel.$inferInsert> = {};
    if (input.channelId !== undefined) updates.channelId = input.channelId;
    if (input.embedTitle !== undefined) updates.embedTitle = input.embedTitle;
    if (input.embedDescription !== undefined) updates.embedDescription = input.embedDescription;
    if (Object.keys(updates).length === 0) return ok(existing);
    const [updated] = await this.db
      .update(schema.selfRolesPanel)
      .set(updates)
      .where(eq(schema.selfRolesPanel.id, panelId))
      .returning();
    if (updated === undefined) {
      return err(new NotFoundError(i18n.errors.panelNotFound));
    }
    return ok(updated);
  }

  public async listPanels(guildId: string): Promise<SelfRolesPanelWithOptions[]> {
    const rows = await this.db.query.selfRolesPanel.findMany({
      where: eq(schema.selfRolesPanel.guildId, guildId),
      with: { options: true },
      orderBy: [asc(schema.selfRolesPanel.createdAt)],
    });
    return rows.map((r) => ({ ...r, options: sortOptions(r.options) }));
  }

  public async getPanel(
    panelId: string,
  ): Promise<Result<SelfRolesPanelWithOptions, NotFoundError>> {
    const row = await this.db.query.selfRolesPanel.findFirst({
      where: eq(schema.selfRolesPanel.id, panelId),
      with: { options: true },
    });
    if (row === undefined) return err(new NotFoundError(i18n.errors.panelNotFound));
    return ok({ ...row, options: sortOptions(row.options) });
  }

  /**
   * Re-render the panel's Discord message from current DB state and
   * synchronise the bot's pre-added reactions. Idempotent — the
   * dashboard internal-API hook calls this after every CRUD
   * mutation. If the live message has been deleted, the edit path
   * falls through to send + sync.
   */
  public async renderPanel(
    panelId: string,
  ): Promise<Result<{ messageId: string; recreated: boolean }, NotFoundError>> {
    const panelResult = await this.getPanel(panelId);
    if (!panelResult.ok) return panelResult;
    const result = await this.rerenderPanel(panelResult.value);
    return ok(result);
  }

  /**
   * Drop the existing message and post a fresh one with the same DB
   * state. Reactions are re-seeded. Existing role grants on users
   * stay intact — removing the old message doesn't revoke roles
   * already in place.
   */
  public async repostPanel(
    panelId: string,
  ): Promise<Result<{ messageId: string; previousMessageId: string }, NotFoundError>> {
    const panelResult = await this.getPanel(panelId);
    if (!panelResult.ok) return panelResult;
    const panel = panelResult.value;
    const previousMessageId = panel.messageId;
    if (previousMessageId !== PLACEHOLDER_MESSAGE_ID) {
      await this.gateway.deleteSelfRolesMessage(panel.channelId, previousMessageId);
    }
    const payload = buildSelfRolesPayload(panel, panel.options, this.branding);
    const { messageId } = await this.gateway.sendSelfRolesMessage(panel.channelId, payload);
    await this.db
      .update(schema.selfRolesPanel)
      .set({ messageId })
      .where(eq(schema.selfRolesPanel.id, panel.id));
    if (payload.reactions.length > 0) {
      await this.gateway
        .syncBotReactions(panel.channelId, messageId, payload.reactions)
        .catch(() => undefined);
    }
    return ok({ messageId, previousMessageId });
  }

  /**
   * Hard-delete a panel: blank-out the live message (so any in-flight
   * reaction has nothing to bind to), delete it, and remove the DB
   * row. Cascades to SelfRolesOption + SelfRolesEvent via FK.
   */
  public async deletePanel(panelId: string): Promise<Result<{ panelId: string }, NotFoundError>> {
    const panel = await this.findPanel(panelId);
    if (panel === undefined) return err(new NotFoundError(i18n.errors.panelNotFound));
    if (panel.messageId !== PLACEHOLDER_MESSAGE_ID) {
      await this.gateway
        .editSelfRolesMessage(panel.channelId, panel.messageId, {
          content: undefined,
          embeds: [],
          components: [],
        })
        .catch(() => undefined);
      await this.gateway
        .deleteSelfRolesMessage(panel.channelId, panel.messageId)
        .catch(() => undefined);
    }
    await this.db.delete(schema.selfRolesPanel).where(eq(schema.selfRolesPanel.id, panelId));
    return ok({ panelId });
  }

  // ─────────────────────────── private ───────────────────────────

  private async findPanel(panelId: string): Promise<SelfRolesPanel | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.selfRolesPanel)
      .where(eq(schema.selfRolesPanel.id, panelId))
      .limit(1);
    return row;
  }

  private async rerenderPanel(
    panel: SelfRolesPanelWithOptions,
  ): Promise<{ messageId: string; recreated: boolean }> {
    const payload = buildSelfRolesPayload(panel, panel.options, this.branding);
    if (panel.messageId === PLACEHOLDER_MESSAGE_ID) {
      const { messageId } = await this.gateway.sendSelfRolesMessage(panel.channelId, payload);
      await this.db
        .update(schema.selfRolesPanel)
        .set({ messageId })
        .where(eq(schema.selfRolesPanel.id, panel.id));
      if (payload.reactions.length > 0) {
        await this.gateway
          .syncBotReactions(panel.channelId, messageId, payload.reactions)
          .catch(() => undefined);
      }
      return { messageId, recreated: true };
    }
    try {
      await this.gateway.editSelfRolesMessage(panel.channelId, panel.messageId, payload);
      // Reconcile the reaction strip with the current option set:
      // syncBotReactions adds missing emojis and strips bot's own
      // orphans from removed options. User reactions are never
      // touched. Empty panels go through this path too — sync becomes
      // a pure "remove all bot reactions" sweep.
      await this.gateway
        .syncBotReactions(panel.channelId, panel.messageId, payload.reactions)
        .catch(() => undefined);
      return { messageId: panel.messageId, recreated: false };
    } catch {
      // Live message gone — recreate.
      const { messageId } = await this.gateway.sendSelfRolesMessage(panel.channelId, payload);
      await this.db
        .update(schema.selfRolesPanel)
        .set({ messageId })
        .where(eq(schema.selfRolesPanel.id, panel.id));
      if (payload.reactions.length > 0) {
        await this.gateway
          .syncBotReactions(panel.channelId, messageId, payload.reactions)
          .catch(() => undefined);
      }
      return { messageId, recreated: true };
    }
  }
}
