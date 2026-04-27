import { resolveColor, type ColorResolvable } from 'discord.js';

import { env } from './env.js';

export interface Branding {
  readonly name: string;
  readonly color: number;
  readonly iconUrl: string | undefined;
  readonly footerText: string | undefined;
  readonly supportUrl: string | undefined;
  readonly locale: 'en' | 'ko';
}

/**
 * Frozen branding object derived from env. Single source of truth — every
 * embed/message that needs branding must reference this object, never the
 * env directly.
 */
export const branding: Branding = Object.freeze({
  name: env.BOT_NAME,
  color: resolveColor(env.BOT_BRAND_COLOR as ColorResolvable),
  iconUrl: env.BOT_ICON_URL,
  footerText: env.BOT_FOOTER_TEXT,
  supportUrl: env.BOT_SUPPORT_URL,
  locale: env.BOT_LOCALE,
});
