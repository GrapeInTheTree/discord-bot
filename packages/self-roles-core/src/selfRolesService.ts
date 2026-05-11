import type { DbDrizzle, SelfRolesEvent, SelfRolesOption, SelfRolesPanel } from '@hearth/database';
import type {
  AppError,
  ConflictError,
  NotFoundError,
  Result,
  ValidationError,
} from '@hearth/shared';
import type { Branding, SelfRolesGateway } from '@hearth/tickets-core';

import {
  type SelfRolesCreateResult,
  type SelfRolesOptionEditInput,
  type SelfRolesOptionInput,
  type SelfRolesPanelEditInput,
  type SelfRolesPanelInput,
  type SelfRolesPanelWithOptions,
  type SelfRolesReactionResult,
} from './operations/_shared.js';
import { SelfRolesOptionOperations } from './operations/optionOperations.js';
import { SelfRolesPanelOperations } from './operations/panelOperations.js';
import { SelfRolesReactionOperations } from './operations/reactionOperations.js';

// Public facade. Composes three single-responsibility operation
// classes (panel, option, reaction). Callers — bot container,
// dashboard server actions, internal-api routes — keep the existing
// flat method names so this is a pure internal refactor, not an API
// change.
//
// Why split:
//   - The previous 660-line class mixed four concerns (panel CRUD,
//     option CRUD, reaction handling, audit reads). Each grew its
//     own private helpers (findPanel, findOption, rerenderPanel,
//     lookupPanelAndOption, recordEvent) that had to be ordered by
//     dependency in one file.
//   - Splitting moves each concern's private helpers next to its
//     public surface. Reading panel logic no longer means scrolling
//     past reaction handlers.
//   - Each operation class is independently mockable for future
//     tests that want to assert across boundaries.
//
// Why a facade rather than three separate services in the public API:
//   - Every bot listener, internal-api route, and dashboard action
//     already imports `services.selfRoles.X`. Renaming N callers
//     across two apps is churn with no observable benefit. The
//     facade keeps them stable.

export type {
  SelfRolesCreateResult,
  SelfRolesOptionEditInput,
  SelfRolesOptionInput,
  SelfRolesPanelEditInput,
  SelfRolesPanelInput,
  SelfRolesPanelWithOptions,
  SelfRolesReactionResult,
};

export class SelfRolesService {
  private readonly panelOps: SelfRolesPanelOperations;
  private readonly optionOps: SelfRolesOptionOperations;
  private readonly reactionOps: SelfRolesReactionOperations;

  public constructor(db: DbDrizzle, gateway: SelfRolesGateway, branding: Branding) {
    this.panelOps = new SelfRolesPanelOperations(db, gateway, branding);
    this.optionOps = new SelfRolesOptionOperations(db, gateway);
    this.reactionOps = new SelfRolesReactionOperations(db, gateway);
  }

  // ─── panel surface ──────────────────────────────────────────────

  public createPanel(
    input: SelfRolesPanelInput,
  ): Promise<Result<SelfRolesCreateResult, ConflictError | ValidationError>> {
    return this.panelOps.createPanel(input);
  }

  public editPanel(
    panelId: string,
    input: SelfRolesPanelEditInput,
  ): Promise<Result<SelfRolesPanel, NotFoundError>> {
    return this.panelOps.editPanel(panelId, input);
  }

  public listPanels(guildId: string): Promise<SelfRolesPanelWithOptions[]> {
    return this.panelOps.listPanels(guildId);
  }

  public getPanel(panelId: string): Promise<Result<SelfRolesPanelWithOptions, NotFoundError>> {
    return this.panelOps.getPanel(panelId);
  }

  public renderPanel(
    panelId: string,
  ): Promise<Result<{ messageId: string; recreated: boolean }, NotFoundError>> {
    return this.panelOps.renderPanel(panelId);
  }

  public repostPanel(
    panelId: string,
  ): Promise<Result<{ messageId: string; previousMessageId: string }, NotFoundError>> {
    return this.panelOps.repostPanel(panelId);
  }

  public deletePanel(panelId: string): Promise<Result<{ panelId: string }, NotFoundError>> {
    return this.panelOps.deletePanel(panelId);
  }

  // ─── option surface ─────────────────────────────────────────────

  public addOption(
    panelId: string,
    input: SelfRolesOptionInput,
  ): Promise<Result<SelfRolesOption, ConflictError | NotFoundError | ValidationError>> {
    return this.optionOps.addOption(panelId, input);
  }

  public editOption(
    optionId: string,
    input: SelfRolesOptionEditInput,
  ): Promise<Result<SelfRolesOption, ConflictError | NotFoundError | ValidationError>> {
    return this.optionOps.editOption(optionId, input);
  }

  public removeOption(optionId: string): Promise<Result<{ removedId: string }, NotFoundError>> {
    return this.optionOps.removeOption(optionId);
  }

  public getOptionHolders(optionId: string): Promise<readonly string[]> {
    return this.optionOps.getOptionHolders(optionId);
  }

  public revokeRoleFromOptionHolders(
    optionId: string,
  ): Promise<Result<{ revokedCount: number }, NotFoundError>> {
    return this.optionOps.revokeRoleFromOptionHolders(optionId);
  }

  // ─── reaction + audit surface ───────────────────────────────────

  public handleReactionAdd(input: {
    readonly messageId: string;
    readonly emoji: string;
    readonly userId: string;
    readonly guildId: string;
  }): Promise<Result<SelfRolesReactionResult, AppError>> {
    return this.reactionOps.handleReactionAdd(input);
  }

  public handleReactionRemove(input: {
    readonly messageId: string;
    readonly emoji: string;
    readonly userId: string;
    readonly guildId: string;
  }): Promise<Result<SelfRolesReactionResult, AppError>> {
    return this.reactionOps.handleReactionRemove(input);
  }

  public listEvents(panelId: string, limit?: number): Promise<SelfRolesEvent[]> {
    return this.reactionOps.listEvents(panelId, limit);
  }

  public countEvents(panelId: string): Promise<number> {
    return this.reactionOps.countEvents(panelId);
  }
}
