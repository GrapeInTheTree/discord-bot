// Vitest setup — set env stubs at TOP LEVEL (not in beforeAll) so they're in
// place before any test file's imports trigger env.ts module-load side effects.
//
// Tests that exercise loadEnv() directly should pass a custom env object
// rather than rely on these defaults.

process.env['DISCORD_TOKEN'] ??= 'x'.repeat(60);
process.env['DISCORD_APP_ID'] ??= '123456789012345678';
process.env['BOT_NAME'] ??= 'TestBot';
process.env['DATABASE_URL'] ??= 'postgresql://test:test@localhost:5432/test';
process.env['NODE_ENV'] ??= 'test';
