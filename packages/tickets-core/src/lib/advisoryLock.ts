import { type DbClient, Prisma } from '@hearth/database';
import { ConflictError, InternalError } from '@hearth/shared';

// Postgres lock_timeout uses milliseconds. When acquisition fails, Postgres
// raises SQLSTATE 55P03 ("lock_not_available"). We catch that specifically
// and surface a ConflictError so the caller can map it to a user-friendly
// "you're already opening a ticket" reply. Any other Prisma error is wrapped
// in InternalError to make the failure mode obvious in logs.

const LOCK_NOT_AVAILABLE_SQLSTATE = '55P03';

export interface AdvisoryLockOptions {
  /** Lock key — see lib/lockKeys.ts for canonical generators. */
  readonly key: bigint;
  /** Acquisition timeout in milliseconds. */
  readonly timeoutMs: number;
}

/**
 * Run `fn` inside a Postgres transaction holding `pg_advisory_xact_lock(key)`.
 * The lock is automatically released when the transaction commits or rolls
 * back, so callers don't manage release manually. `lock_timeout` ensures
 * a stuck holder doesn't pile up waiters indefinitely.
 *
 * Pass-through: the inner function receives the transaction client (`tx`)
 * — all DB writes inside `fn` MUST use `tx` so they participate in the
 * same transaction and are protected by the lock.
 */
export async function withAdvisoryLock<T>(
  db: DbClient,
  options: AdvisoryLockOptions,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await db.$transaction(
      async (tx) => {
        // SET LOCAL applies only to this transaction. A literal interpolation
        // is necessary because Postgres parses lock_timeout as a parser-level
        // setting (parameters not allowed). The value is a number we control,
        // so this is safe from injection.
        const timeoutLiteral = Math.max(0, Math.floor(options.timeoutMs));
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = ${String(timeoutLiteral)}`);
        // pg_advisory_xact_lock accepts a single bigint; Prisma serializes
        // ${key} as a parameterized bigint argument.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${options.key})`;
        return await fn(tx);
      },
      {
        // Prisma's defaults (maxWait 2s, timeout 5s) are tight for a
        // production VM where Postgres + bot share a small instance and a
        // ticket-open path does several DB queries plus an advisory-lock
        // acquisition. Crossing the 5s ceiling makes Prisma drop the
        // transaction id and raise P2028 (Transaction not found) on the
        // very next $executeRaw — exactly the error pattern observed
        // during VM smoke testing. 15s is generous for the bounded work
        // here (one lock + a handful of SELECTs / INSERTs); we don't
        // want this to ever be the user-visible timeout, just a safety
        // ceiling well past worst-case latency.
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  } catch (err) {
    if (isPostgresError(err, LOCK_NOT_AVAILABLE_SQLSTATE)) {
      throw new ConflictError('Could not acquire lock — operation already in progress', err);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Re-throw P2002 etc. so the caller can branch on them.
      throw err;
    }
    if (err instanceof ConflictError) {
      throw err;
    }
    throw new InternalError('Unexpected error inside advisory-locked transaction', err);
  }
}

function isPostgresError(err: unknown, sqlstate: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  return (err as { code?: unknown }).code === sqlstate;
}
