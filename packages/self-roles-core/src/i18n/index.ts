import { selfRoles as enSelfRoles, type SelfRolesBundle } from './en.js';

export type { SelfRolesBundle };

/**
 * The current self-roles-domain copy bundle. Single English locale today;
 * pass a different bundle to services via constructor to localize. Mirrors
 * @hearth/tickets-core/i18n shape.
 */
export const selfRoles: SelfRolesBundle = enSelfRoles;
