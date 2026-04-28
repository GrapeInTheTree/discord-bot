import type { AppError } from './errors.js';

/**
 * Plain JSON-serializable error shape returned by Next.js Server Actions.
 *
 * **Why a plain object instead of the AppError class?** React Server
 * Components flight serialization treats `Error` instances specially: in
 * production builds the message is redacted and the value comes through
 * the wire as a `$Z` placeholder which React re-throws on access. That
 * defeats `Result<T, AppError>` — the form's `if (!result.ok) toast.error(
 * result.error.message)` ends up reading "An error occurred in the Server
 * Components render" instead of the user-facing copy we authored.
 *
 * Action authors construct AppError subclasses internally for the type
 * benefits, then call `toActionError(e)` at every `err(...)` site to flatten
 * to this shape before crossing the action boundary. Forms continue to
 * read `result.error.message` (and now optionally `.code` for branching).
 */
export interface ActionError {
  readonly code: string;
  readonly message: string;
}

export function toActionError(e: AppError | ActionError): ActionError {
  return { code: e.code, message: e.message };
}
