import { describe, expect, it } from 'vitest';

import {
  MANAGE_GUILD_BIT,
  decodePermissions,
  hasManageGuild,
  manageableGuilds,
  type OAuthGuild,
} from '@/lib/auth-permissions';

describe('decodePermissions', () => {
  it('parses a numeric string into a bigint', () => {
    expect(decodePermissions('32')).toBe(32n);
    expect(decodePermissions('0')).toBe(0n);
  });

  it('returns 0n for non-string inputs', () => {
    expect(decodePermissions(undefined)).toBe(0n);
    expect(decodePermissions(null)).toBe(0n);
    expect(decodePermissions(32)).toBe(0n);
  });

  it('returns 0n for empty / malformed strings', () => {
    expect(decodePermissions('')).toBe(0n);
    expect(decodePermissions('not a number')).toBe(0n);
  });
});

describe('hasManageGuild', () => {
  it('true when only the Manage Guild bit is set', () => {
    expect(hasManageGuild(MANAGE_GUILD_BIT)).toBe(true);
  });

  it('true when Manage Guild + other bits are set', () => {
    expect(hasManageGuild(MANAGE_GUILD_BIT | (1n << 4n))).toBe(true);
  });

  it('false when bit absent', () => {
    expect(hasManageGuild(0n)).toBe(false);
    expect(hasManageGuild(1n << 4n)).toBe(false);
  });

  it('accepts decimal-string permissions', () => {
    expect(hasManageGuild('32')).toBe(true);
    expect(hasManageGuild('16')).toBe(false);
    expect(hasManageGuild('not a number')).toBe(false);
  });
});

describe('manageableGuilds', () => {
  const sample = (id: string, perms: string): OAuthGuild => ({
    id,
    name: `g-${id}`,
    icon: null,
    permissions: perms,
  });

  it('keeps only guilds where the user has Manage Guild', () => {
    const result = manageableGuilds([
      sample('1', '32'), // manage guild
      sample('2', '16'), // manage channels only
      sample('3', '8'), // admin (includes mg) — wait, actually 8 is administrator bit. We test the explicit bit only, so 8 alone fails MG check. The full Discord rule says administrator implies all perms but we're literal here.
      sample('4', '40'), // 32 | 8
    ]);
    expect(result.map((g) => g.id)).toEqual(['1', '4']);
  });

  it('returns empty when none manageable', () => {
    expect(manageableGuilds([sample('1', '0')])).toEqual([]);
  });
});
