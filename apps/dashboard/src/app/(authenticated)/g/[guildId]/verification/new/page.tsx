import { redirect } from 'next/navigation';

import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { VerificationPanelForm } from '@/components/verification/verification-panel-form';
import { auth } from '@/lib/auth';
import { callBot } from '@/lib/botClient';
import type { GuildResources } from '@/types/bot';

interface NewVerificationPageProps {
  readonly params: Promise<{ readonly guildId: string }>;
}

export default async function NewVerificationPage({
  params,
}: NewVerificationPageProps): Promise<React.JSX.Element> {
  const session = await auth();
  if (session === null) redirect('/login');
  const { guildId } = await params;

  const resources = await callBot<GuildResources>({
    path: `/internal/guilds/${guildId}/resources`,
  });

  const avatarUrl =
    session.user.avatarHash !== null
      ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatarHash}.webp?size=128`
      : null;

  return (
    <>
      <Topbar
        username={session.user.username}
        avatarUrl={avatarUrl}
        title="New verification panel"
        description="Pick a channel + role; embed copy comes next, then options."
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        {!resources.ok ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                Couldn&rsquo;t load this server&rsquo;s channels and roles — the bot may be offline.
                Please try again.
              </p>
            </CardContent>
          </Card>
        ) : (
          <VerificationPanelForm
            guildId={guildId}
            channels={resources.value.channels}
            roles={resources.value.roles.filter((r) => !r.managed)}
          />
        )}
      </main>
    </>
  );
}
