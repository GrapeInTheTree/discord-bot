import type { InferSelectModel } from 'drizzle-orm';

import type * as schema from './schema/index.js';

// Drizzle row types via InferSelectModel. Mirror what Prisma's generator
// used to emit so service code that imports `type Ticket` etc. continues
// working unchanged. Once Prisma is removed (PR-6), this becomes the only
// source.

export type GuildConfig = InferSelectModel<typeof schema.guildConfig>;
export type Panel = InferSelectModel<typeof schema.panel>;
export type PanelTicketType = InferSelectModel<typeof schema.panelTicketType>;
export type Ticket = InferSelectModel<typeof schema.ticket>;
export type TicketEvent = InferSelectModel<typeof schema.ticketEvent>;
export type VerificationPanel = InferSelectModel<typeof schema.verificationPanel>;
export type VerificationOption = InferSelectModel<typeof schema.verificationOption>;
export type VerificationEvent = InferSelectModel<typeof schema.verificationEvent>;
export type SelfRolesPanel = InferSelectModel<typeof schema.selfRolesPanel>;
export type SelfRolesOption = InferSelectModel<typeof schema.selfRolesOption>;
export type SelfRolesEvent = InferSelectModel<typeof schema.selfRolesEvent>;

// TicketEvent.metadata holds an arbitrary JSON object (column is `jsonb`,
// nullable). Existing prod rows mix shapes per event type — opened events
// carry `{channelId, number}`, deleted events carry a richer snapshot, etc.
// Stricter typing (e.g. a discriminated union with `kind` tag) would
// require a data migration we're not doing here. Service writes are
// reviewed at the call site; dashboard readers handle missing fields
// defensively.
export type TicketEventMetadata = Record<string, unknown>;

// TicketStatus — value object + type union, mirroring Prisma's generated
// enum surface so existing call sites (`TicketStatus.open`) keep working.
// Sourced from the schema's pgEnum values to keep DB and TS in lockstep.
export const TicketStatus = {
  open: 'open',
  claimed: 'claimed',
  closed: 'closed',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

// Outcome of a single button click on a verification panel. Stored as text
// in VerificationEvent.outcome; centralised here so service code, the bot
// interaction handler, and the dashboard all reach for the same constants.
export const VerificationOutcome = {
  success: 'success',
  wrongAnswer: 'wrong_answer',
  alreadyVerified: 'already_verified',
  roleAssignFailed: 'role_assign_failed',
} as const;
export type VerificationOutcome = (typeof VerificationOutcome)[keyof typeof VerificationOutcome];

// Audit action recorded on every self-roles reaction event. Stored as text
// in SelfRolesEvent.action so adding a new action (e.g. 'rate_limited')
// later doesn't require a schema migration.
//   granted — reaction added, role assigned
//   revoked — reaction removed, role removed
//   noop    — Discord rejected the role op (perms / hierarchy / unknown
//             emoji); no role change. The user keeps whatever state they
//             had before — we never half-apply.
export const SelfRolesAction = {
  granted: 'granted',
  revoked: 'revoked',
  noop: 'noop',
} as const;
export type SelfRolesAction = (typeof SelfRolesAction)[keyof typeof SelfRolesAction];
