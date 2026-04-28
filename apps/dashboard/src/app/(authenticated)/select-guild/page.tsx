import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Brand } from '@/components/layout/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { branding } from '@/config/branding';
import { t } from '@/i18n';
import { auth } from '@/lib/auth';
import { manageableGuilds } from '@/lib/auth-permissions';
import { callBot } from '@/lib/botClient';
import { fetchUserGuilds } from '@/lib/discordOauth';
import { env } from '@/lib/env';
import { guildIconUrl } from '@/lib/format';

interface BotGuildSummary {
  readonly id: string;
  readonly name: string;
  readonly iconHash: string | null;
}

export default async function SelectGuildPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (session === null) redirect('/login');

  const userGuilds =
    session.discordAccessToken !== '' ? await fetchUserGuilds(session.discordAccessToken) : [];
  const userManageable = manageableGuilds(userGuilds);

  // Ask the bot which of these guilds it's also in.
  const ids = userManageable.map((g) => g.id).join(',');
  const botResponse =
    ids === ''
      ? { ok: true as const, value: [] as BotGuildSummary[] }
      : await callBot<BotGuildSummary[]>({
          path: `/internal/guilds/list?ids=${encodeURIComponent(ids)}`,
        });
  const botGuildSet = new Set(botResponse.ok ? botResponse.value.map((g) => g.id) : []);

  const present = userManageable.filter((g) => botGuildSet.has(g.id));
  const absent = userManageable.filter((g) => !botGuildSet.has(g.id));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <Brand href="/select-guild" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.guildPicker.title}</h1>
        <p className="text-sm text-[color:var(--color-fg-muted)]">{t.guildPicker.description}</p>
      </div>

      {present.length === 0 && absent.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">{t.guildPicker.empty}</p>
          </CardContent>
        </Card>
      ) : null}

      {present.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {present.map((g) => (
            <li key={g.id}>
              <Link
                href={`/g/${g.id}`}
                className="flex items-center gap-4 rounded-[var(--radius-lg)] border bg-[color:var(--color-bg)] p-4 transition-colors hover:bg-[color:var(--color-bg-subtle)]"
              >
                {guildIconUrl(g.id, g.icon) !== null ? (
                  <img
                    src={guildIconUrl(g.id, g.icon) ?? ''}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-[var(--radius)]"
                  />
                ) : (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--color-bg-subtle)',
                      color: 'var(--color-fg)',
                    }}
                    aria-hidden="true"
                  >
                    {g.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="font-medium">{g.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {absent.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Servers without {branding.name}</CardTitle>
            <CardDescription>Invite the bot to manage tickets in these servers.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {absent.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-4 rounded-[var(--radius)] border p-3"
              >
                <span className="text-sm">{g.name}</span>
                <Button asChild variant="secondary" size="sm">
                  <a
                    href={`https://discord.com/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&permissions=8&scope=bot+applications.commands&guild_id=${g.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.guildPicker.inviteCta}
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
