// Discord guild permission helpers. The dashboard never inspects member
// roles inside Discord — it relies on the OAuth `guilds` payload's
// `permissions` field (a bigint serialized as a decimal string). Manage
// Guild is the gate for every dashboard mutation.

// Discord ManageGuild permission bit (= 1 << 5). Stable API constant —
// see https://discord.com/developers/docs/topics/permissions.
export const MANAGE_GUILD_BIT = 1n << 5n;

/**
 * Decode the Discord OAuth `permissions` field (decimal string) into a bigint.
 * Returns 0n for malformed/empty inputs so the caller's bit check fails closed.
 */
export function decodePermissions(raw: unknown): bigint {
  if (typeof raw !== 'string' || raw === '') return 0n;
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

/**
 * True when the bitfield includes Manage Guild. Accepts either the raw
 * decimal-string from the OAuth payload (handled via `decodePermissions`)
 * or a pre-parsed bigint.
 */
export function hasManageGuild(permissions: bigint | string): boolean {
  const bits = typeof permissions === 'bigint' ? permissions : decodePermissions(permissions);
  return (bits & MANAGE_GUILD_BIT) === MANAGE_GUILD_BIT;
}

/**
 * Filter a list of OAuth `guilds` entries down to those where the user holds
 * Manage Guild. Defensive against missing/malformed `permissions` strings.
 */
export interface OAuthGuild {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly permissions: string;
}

export function manageableGuilds(guilds: readonly OAuthGuild[]): OAuthGuild[] {
  return guilds.filter((g) => hasManageGuild(g.permissions));
}
