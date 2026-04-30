import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { type DbDrizzle, schema } from '@hearth/database';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

/**
 * Probe whether Docker is reachable so integration tests can self-skip on
 * developer machines without docker running. CI containers always have
 * docker, so this returns true there.
 */
export function isDockerAvailable(): boolean {
  const result = spawnSync('docker', ['info'], { encoding: 'utf-8', stdio: 'pipe' });
  return result.status === 0;
}

// Spins a real Postgres 16 container, applies the canonical Drizzle
// migration (`packages/database/drizzle/0000_init.sql`), and returns a
// Drizzle client wired through `pg.Pool`. Validates schema, indexes,
// partial unique index, FK enforcement, and JSONB type parsers
// end-to-end against production-equivalent Postgres — things the
// pglite-based unit tests cover semantically but not at the wire level.

export interface IntegrationDb {
  readonly db: DbDrizzle;
  readonly databaseUrl: string;
  readonly container: StartedPostgreSqlContainer;
  close(): Promise<void>;
}

const POSTGRES_IMAGE = 'postgres:16-alpine';

const MIGRATION_PATH = resolve(
  import.meta.dirname,
  '../../../../packages/database/drizzle/0000_init.sql',
);

let cachedSql: string | undefined;

function loadInitSql(): string {
  if (cachedSql !== undefined) return cachedSql;
  const raw = readFileSync(MIGRATION_PATH, 'utf-8');
  // drizzle-kit emits `--> statement-breakpoint` between DDL statements.
  // pg's query handles a multi-statement string fine, but the markers
  // confuse the parser, so strip them.
  cachedSql = raw.replace(/--> statement-breakpoint\n?/g, '');
  return cachedSql;
}

export async function startIntegrationDb(): Promise<IntegrationDb> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('hearth_test')
    .withUsername('hearth')
    .withPassword('hearth')
    .start();

  const databaseUrl = container.getConnectionUri();

  const pool = new Pool({ connectionString: databaseUrl });
  // Apply the canonical schema. PR-4 wraps this in a `runMigrations`
  // helper that's also called from bot boot; for now the test inlines
  // the read+exec.
  await pool.query(loadInitSql());

  const drizzleClient = drizzle(pool, { schema });
  // Smoke-test the connection so test failures surface here rather than
  // mid-test.
  await pool.query('SELECT 1');

  return {
    db: drizzleClient as unknown as DbDrizzle,
    databaseUrl,
    container,
    async close() {
      await pool.end();
      await container.stop();
    },
  };
}
