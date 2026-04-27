import { branding } from '../config/branding.js';

import { common as enCommon } from './en/common.js';
import { tickets as enTickets } from './en/tickets.js';

const dictionaries = {
  en: { common: enCommon, tickets: enTickets },
  // ko: { common: koCommon, tickets: koTickets },  // TODO: add when ko strings exist
} as const;

type Dictionary = typeof dictionaries.en;

export const i18n: Dictionary = dictionaries[branding.locale === 'ko' ? 'en' : branding.locale];

/**
 * Substitute `{var}` placeholders in a template string.
 * Unknown keys are left untouched (visible as `{key}`) for easy detection.
 */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value !== undefined ? String(value) : match;
  });
}
