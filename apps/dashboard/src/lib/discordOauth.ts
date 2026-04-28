import type { OAuthGuild } from './auth-permissions';

// `auth.ts`'s session callback can't easily fetch the user's guilds — Discord
// requires a separate REST call with the access token. We make that call
// on demand from server components, with a short cache (60s) to dampen
// repeated dashboard navigations.
//
// Per Discord docs the endpoint is GET /users/@me/guilds; rate limit is
// shared across all calls for the same access token. A cold dashboard
// page load should incur ~1 call total per session.

interface RawGuild {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly permissions: string;
}

const CACHE_MS = 60_000;
const cache = new Map<string, { fetchedAt: number; guilds: OAuthGuild[] }>();

export async function fetchUserGuilds(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<OAuthGuild[]> {
  const t = now();
  const cached = cache.get(accessToken);
  if (cached !== undefined && t - cached.fetchedAt < CACHE_MS) {
    return cached.guilds;
  }

  const response = await fetchImpl('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    // Don't blow up the dashboard — an empty list shows the empty state
    // (which links to the bot invite). Token refresh is Phase 2.x.
    return [];
  }
  const raw = (await response.json()) as RawGuild[];
  const guilds: OAuthGuild[] = raw.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    permissions: g.permissions,
  }));
  cache.set(accessToken, { fetchedAt: t, guilds });
  return guilds;
}

/** Test helper. Resets the in-memory cache between tests. */
export function _resetGuildCache(): void {
  cache.clear();
}
