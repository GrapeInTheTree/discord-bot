import { PrismaClient } from '@prisma/client';

// Avoid duplicate clients across hot reloads in dev.
const globalForPrisma = globalThis as unknown as { __discordBotDb: PrismaClient | undefined };

export const db: PrismaClient =
  globalForPrisma.__discordBotDb ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__discordBotDb = db;
}

export type DbClient = typeof db;
