// Self-roles domain logic — services, builder, schemas, i18n.
// Imported by both apps/bot (reaction listeners + slash) and
// apps/dashboard (Server Actions). Reuses the DiscordGateway port from
// @hearth/tickets-core (single seam for the bot's Discord integration).
// Never imports the discord.js runtime; uses discord-api-types only for
// JSON shapes.

export {
  SelfRolesService,
  type SelfRolesCreateResult,
  type SelfRolesOptionEditInput,
  type SelfRolesOptionInput,
  type SelfRolesPanelEditInput,
  type SelfRolesPanelInput,
  type SelfRolesPanelWithOptions,
  type SelfRolesReactionResult,
} from './selfRolesService.js';

export { buildSelfRolesPayload, type SelfRolesPayload } from './lib/selfRolesBuilder.js';

export {
  MAX_OPTIONS_PER_PANEL,
  SelfRolesOptionEditSchema,
  SelfRolesOptionInputSchema,
  SelfRolesPanelEditSchema,
  SelfRolesPanelInputSchema,
  type SelfRolesOptionEdit,
  type SelfRolesOptionInput as SelfRolesOptionInputType,
  type SelfRolesPanelEdit,
  type SelfRolesPanelInput as SelfRolesPanelInputType,
} from './schemas.js';

export { selfRoles, type SelfRolesBundle } from './i18n/index.js';
