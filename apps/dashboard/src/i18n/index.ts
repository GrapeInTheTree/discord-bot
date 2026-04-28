import { en, type Bundle } from './en';

// Single English bundle today. KO + others land as additional files +
// a runtime locale switch driven by BOT_LOCALE / per-user preference.

export const t: Bundle = en;
export type { Bundle };
