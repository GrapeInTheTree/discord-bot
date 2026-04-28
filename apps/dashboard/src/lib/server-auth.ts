import { type ActionError, type Result, err, ok } from '@hearth/shared';
import { redirect } from 'next/navigation';

import { auth } from './auth';
import { hasManageGuild } from './auth-permissions';
import { fetchUserGuilds } from './discordOauth';

/**
 * Server Action / RSC guard. Verifies the user is signed in, in the
 * target guild, and holds Manage Guild. Returns a plain `ActionError`
 * (not an Error class instance) so callers can pass the failure
 * straight through `err(auth.error)` without React's flight serializer
 * redacting the message to a `$Z` placeholder in production builds.
 *
 * `redirect()` is for navigation cases (RSC pages); Server Actions
 * should branch on the Result so the form's banner surfaces the
 * permission error rather than a hard navigation.
 */
export async function authorizeGuild(
  guildId: string,
): Promise<Result<{ userId: string; username: string }, ActionError>> {
  const session = await auth();
  if (session === null) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/g/${guildId}`)}`);
  }
  const accessToken = session.discordAccessToken;
  if (accessToken === '') {
    return err({
      code: 'PERMISSION_ERROR',
      message: 'Discord session is missing the access token; sign in again',
    });
  }
  const guilds = await fetchUserGuilds(accessToken);
  const guild = guilds.find((g) => g.id === guildId);
  if (guild === undefined) {
    return err({
      code: 'PERMISSION_ERROR',
      message: `You are not a member of guild ${guildId}`,
    });
  }
  if (!hasManageGuild(guild.permissions)) {
    return err({
      code: 'PERMISSION_ERROR',
      message: 'Manage Guild permission required',
    });
  }
  return ok({ userId: session.user.discordId, username: session.user.username });
}
