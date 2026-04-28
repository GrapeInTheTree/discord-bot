import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiError, ApiErrorCode } from './types.js';
import { STATUS_FOR_CODE } from './types.js';

/**
 * Send a JSON response. Handlers return primitive values; the server adapter
 * stringifies + sets Content-Type. Keeps each route handler from repeating
 * the boilerplate.
 */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(payload)),
  });
  res.end(payload);
}

export function sendError(
  res: ServerResponse,
  code: ApiErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): void {
  const body: ApiError =
    details === undefined ? { error: code, message } : { error: code, message, details };
  sendJson(res, STATUS_FOR_CODE[code], body);
}

/**
 * Read the request body (up to 1 MB) and JSON-parse it. Returns null when the
 * body is empty (POST {} convention). Throws SyntaxError on malformed JSON;
 * the server adapter catches that and returns 422.
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  const limit = 1_000_000; // 1 MB
  for await (const chunk of req as AsyncIterable<Buffer>) {
    bytes += chunk.length;
    if (bytes > limit) {
      throw new Error('request body exceeds 1 MB');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf-8');
  if (text.trim() === '') return null;
  return JSON.parse(text);
}
