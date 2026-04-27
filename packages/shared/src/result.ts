/**
 * Lightweight Result type for service layer. Avoids exception-based control flow
 * for expected failures (e.g., already-open ticket) while keeping unexpected
 * errors thrown.
 *
 * Usage:
 *   const result = await ticketService.openTicket(...);
 *   if (!result.ok) {
 *     return interaction.reply({ content: errorMessage(result.error), ephemeral: true });
 *   }
 *   const ticket = result.value;
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is { readonly ok: true; readonly value: T } {
  return r.ok;
}

export function isErr<T, E>(r: Result<T, E>): r is { readonly ok: false; readonly error: E } {
  return !r.ok;
}

export function map<T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r;
}

export function mapErr<T, E, F>(r: Result<T, E>, fn: (e: E) => F): Result<T, F> {
  return r.ok ? r : err(fn(r.error));
}

export async function fromPromise<T>(p: Promise<T>): Promise<Result<T, unknown>> {
  try {
    return ok(await p);
  } catch (e) {
    return err(e);
  }
}
