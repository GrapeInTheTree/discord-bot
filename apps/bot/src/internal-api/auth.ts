import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

/**
 * Constant-time comparison of the request's bearer token against the configured
 * `INTERNAL_API_TOKEN`. Returns:
 *  - 'ok'           when the header is present and matches.
 *  - 'unauthorized' when missing/malformed/mismatched.
 *  - 'misconfigured' when the bot has no token set (operator must configure
 *                    INTERNAL_API_TOKEN before exposing the dashboard).
 *
 * timingSafeEqual avoids leaking token length/prefix via response timing —
 * critical for a shared-secret model where guesses are cheap.
 */
export type AuthResult = 'ok' | 'unauthorized' | 'misconfigured';

export function checkBearer(req: IncomingMessage, configuredToken: string | undefined): AuthResult {
  if (configuredToken === undefined) {
    return 'misconfigured';
  }
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return 'unauthorized';
  }
  const presented = header.slice('Bearer '.length).trim();
  const expected = Buffer.from(configuredToken, 'utf-8');
  const provided = Buffer.from(presented, 'utf-8');
  // Different-length buffers → not equal. timingSafeEqual throws on length
  // mismatch, so guard explicitly.
  if (provided.length !== expected.length) return 'unauthorized';
  return timingSafeEqual(provided, expected) ? 'ok' : 'unauthorized';
}
