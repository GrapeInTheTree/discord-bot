/** Format an ISO timestamp as a relative-time string ("3 minutes ago"). */
export function relativeTime(iso: string | Date, now: Date = new Date()): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${String(diffSec)} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${String(diffMin)} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${String(diffHour)} hour${diffHour === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${String(diffDay)} day${diffDay === 1 ? '' : 's'} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${String(diffMonth)} month${diffMonth === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

/**
 * Discord guild icon URL. Returns null when the guild has no icon — caller
 * should render a fallback (initial letter / placeholder).
 */
export function guildIconUrl(guildId: string, iconHash: string | null): string | null {
  if (iconHash === null) return null;
  // Animated icons start with `a_`. Use webp for static, gif for animated —
  // Discord serves both at the same path.
  const ext = iconHash.startsWith('a_') ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=128`;
}
