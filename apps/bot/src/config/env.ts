import { z } from 'zod';

import { SnowflakeSchema } from '../lib/snowflake.js';

// Comma-separated snowflake list with empty-string-coercion. Because dotenv
// reads "" as empty string (not undefined), we treat empty list explicitly.
const SnowflakeCsvSchema = z
  .string()
  .default('')
  .transform((raw, ctx) => {
    if (raw === '') return [] as string[];
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    for (const id of ids) {
      const parsed = SnowflakeSchema.safeParse(id);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid snowflake "${id}" in CSV list`,
        });
        return z.NEVER;
      }
    }
    return ids;
  });

const EnvSchema = z.object({
  // Discord — required
  DISCORD_TOKEN: z.string().min(50, 'Discord token looks invalid (too short)'),
  DISCORD_APP_ID: SnowflakeSchema,
  DISCORD_DEV_GUILD_ID: SnowflakeSchema.optional(),

  // Branding
  BOT_NAME: z.string().min(1).max(32),
  BOT_BRAND_COLOR: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'BOT_BRAND_COLOR must be hex like #RRGGBB')
    .default('#5865F2'),
  BOT_ICON_URL: z.string().url().optional(),
  BOT_FOOTER_TEXT: z.string().max(2048).optional(),
  BOT_SUPPORT_URL: z.string().url().optional(),
  BOT_LOCALE: z.enum(['en', 'ko']).default('en'),

  // DB
  DATABASE_URL: z.string().url(),

  // Tickets — all optional so a fresh deploy can boot before /setup is run.
  // Services validate presence at use-time and throw ValidationError pointing
  // at the missing key, so the bot's failure mode is "command fails ephemerally"
  // rather than "process crashes on boot".
  TICKET_SUPPORT_PANEL_CHANNEL_ID: SnowflakeSchema.optional(),
  TICKET_OFFER_PANEL_CHANNEL_ID: SnowflakeSchema.optional(),
  TICKET_ACTIVE_CATEGORY_ID: SnowflakeSchema.optional(),
  TICKET_ARCHIVE_CATEGORY_ID: SnowflakeSchema.optional(),
  TICKET_SUPPORT_ROLE_IDS: SnowflakeCsvSchema,
  TICKET_SUPPORT_MENTION_ROLE_IDS: SnowflakeCsvSchema,
  TICKET_OFFER_MENTION_ROLE_IDS: SnowflakeCsvSchema,
  BOT_LOG_CHANNEL_ID: SnowflakeSchema.optional(),

  // Observability
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  SENTRY_DSN: z.string().url().optional(),

  // Server
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse and validate the entire process.env. Exits the process on failure
 * so the bot never runs with a broken config.
 *
 * Empty-string values (`KEY=`) are treated as unset so that `.default()`
 * and `.optional()` modifiers work as expected with .env files. CSV-typed
 * keys preserve empty-string semantics inside SnowflakeCsvSchema (empty
 * → empty array) so an explicit `KEY=` doesn't produce `["",""]`.
 *
 * Critically: only key names are printed on failure — never values — to
 * avoid leaking partial secrets through CI/log forwarders.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // CSV keys must keep empty-string sentinel so SnowflakeCsvSchema returns [].
  // All other keys: empty string → undefined so optional()/default() kick in.
  const csvKeys = new Set([
    'TICKET_SUPPORT_ROLE_IDS',
    'TICKET_SUPPORT_MENTION_ROLE_IDS',
    'TICKET_OFFER_MENTION_ROLE_IDS',
  ]);
  const cleaned: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [k, v === '' && !csvKeys.has(k) ? undefined : v]),
  );
  const parsed = EnvSchema.safeParse(cleaned);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    console.error(`❌ Invalid environment:\n${issues}\n`);
    console.error('See apps/bot/.env.example for the full list of variables.');
    process.exit(1);
  }

  return parsed.data;
}

export const env: Env = loadEnv();
