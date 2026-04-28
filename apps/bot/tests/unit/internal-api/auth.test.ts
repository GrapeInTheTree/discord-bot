import type { IncomingMessage } from 'node:http';

import { describe, expect, it } from 'vitest';

import { checkBearer } from '../../../src/internal-api/auth.js';

function reqWith(headers: Record<string, string | undefined>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe('checkBearer', () => {
  it('returns "misconfigured" when no token is set on the bot', () => {
    expect(checkBearer(reqWith({}), undefined)).toBe('misconfigured');
  });

  it('returns "ok" on exact bearer match', () => {
    const token = 'a'.repeat(64);
    expect(checkBearer(reqWith({ authorization: `Bearer ${token}` }), token)).toBe('ok');
  });

  it('returns "unauthorized" when no Authorization header', () => {
    expect(checkBearer(reqWith({}), 'a'.repeat(64))).toBe('unauthorized');
  });

  it('returns "unauthorized" when scheme is not Bearer', () => {
    expect(checkBearer(reqWith({ authorization: `Basic ${'a'.repeat(64)}` }), 'a'.repeat(64))).toBe(
      'unauthorized',
    );
  });

  it('returns "unauthorized" on mismatched token of equal length', () => {
    const correct = 'a'.repeat(64);
    const wrong = 'b'.repeat(64);
    expect(checkBearer(reqWith({ authorization: `Bearer ${wrong}` }), correct)).toBe(
      'unauthorized',
    );
  });

  it('returns "unauthorized" on mismatched length (no timingSafeEqual throw)', () => {
    const correct = 'a'.repeat(64);
    const shorter = 'a'.repeat(32);
    expect(checkBearer(reqWith({ authorization: `Bearer ${shorter}` }), correct)).toBe(
      'unauthorized',
    );
  });

  it('trims whitespace after the scheme', () => {
    const token = 'a'.repeat(64);
    expect(checkBearer(reqWith({ authorization: `Bearer   ${token}   ` }), token)).toBe('ok');
  });
});
