// Vitest setup. Mirrors apps/bot/tests/setup.ts — env stubs at top level so
// any module-load side effects in src/lib/env.ts see them. Tests that
// exercise the env loader directly should pass an explicit source object.

process.env['DATABASE_URL'] ??= 'postgresql://test:test@localhost:5432/test';
process.env['DISCORD_CLIENT_ID'] ??= '123456789012345678';
process.env['DISCORD_CLIENT_SECRET'] ??= 'x'.repeat(40);
process.env['NEXTAUTH_URL'] ??= 'http://localhost:3200';
process.env['NEXTAUTH_SECRET'] ??= 'a'.repeat(32);
process.env['BOT_INTERNAL_URL'] ??= 'http://localhost:3100';
process.env['INTERNAL_API_TOKEN'] ??= 'b'.repeat(64);
process.env['BOT_NAME'] ??= 'TestBot';
process.env['NODE_ENV'] ??= 'test';
