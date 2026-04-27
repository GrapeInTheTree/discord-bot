import { defineConfig, env } from 'prisma/config';

// Prisma 7 moved datasource configuration out of schema.prisma so that the
// connection URL is no longer baked into generator artifacts. Migrations and
// `prisma generate` read this file; runtime client uses a driver adapter
// (see src/client.ts).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
