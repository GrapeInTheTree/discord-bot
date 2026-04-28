import type { ServerResponse } from 'node:http';

import { sendJson } from '../json.js';
import type { InternalApiContext } from '../types.js';

/**
 * GET /healthz — Docker readiness probe. No auth, no body.
 *
 * 200 `{ ready: true }` when the Discord gateway is OPEN; 503 otherwise.
 * `Cache-Control: no-store` so probe orchestrators always see fresh state.
 */
export function handleHealthz(ctx: InternalApiContext, res: ServerResponse): void {
  const ready = ctx.isReady();
  // sendJson handles Content-Type; add no-store explicitly.
  res.setHeader('Cache-Control', 'no-store');
  sendJson(res, ready ? 200 : 503, { ready });
}
