import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/client/client.js';

// Prisma 7 requires an explicit driver adapter. The DATABASE_URL is read
// from the host process. The eager pattern would instantiate at module
// load — but Next.js's `next build` evaluates this module while
// collecting page metadata, before any runtime env is in place. So we
// lazy-init through a Proxy: the module exports a stable `db` reference
// that builds the real PrismaClient on first member access.
//
// The first method call (e.g. `db.ticket.findUnique(...)`) still throws
// loudly when DATABASE_URL is missing — only module load is safe.

const globalForPrisma = globalThis as unknown as { __discordBotDb: PrismaClient | undefined };

function createClient(): PrismaClient {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL must be set before instantiating the Prisma client');
  }
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
  if (process.env['NODE_ENV'] !== 'production') {
    globalForPrisma.__discordBotDb = client;
  }
  return client;
}

function resolveClient(): PrismaClient {
  return globalForPrisma.__discordBotDb ?? createClient();
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveClient(), prop, receiver) as unknown;
  },
  has(_target, prop) {
    return Reflect.has(resolveClient(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(resolveClient());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(resolveClient(), prop);
  },
});

export type DbClient = typeof db;
