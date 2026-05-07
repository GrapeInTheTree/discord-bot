import { asc, dbDrizzle, eq, schema } from '@hearth/database';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';

interface VerificationListPageProps {
  readonly params: Promise<{ readonly guildId: string }>;
}

export default async function VerificationListPage({
  params,
}: VerificationListPageProps): Promise<React.JSX.Element> {
  const session = await auth();
  if (session === null) redirect('/login');

  const { guildId } = await params;
  // Pull each panel with its options (count + correct marker driven by id-only
  // join to keep the payload tight). Audit events would clutter the list view.
  const panels = await dbDrizzle.query.verificationPanel.findMany({
    where: eq(schema.verificationPanel.guildId, guildId),
    orderBy: asc(schema.verificationPanel.createdAt),
    with: {
      options: { columns: { id: true, label: true } },
    },
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
        title="Verification"
        description="Click-to-verify panels — one role granted on the correct emoji."
        action={
          <Button asChild>
            <Link href={`/g/${guildId}/verification/new`}>New panel</Link>
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        {panels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-base font-medium">No verification panels yet</p>
              <p className="max-w-sm text-sm text-[color:var(--color-fg-muted)]">
                Create a panel, add up to five emoji buttons, set the correct one, and repost it to
                your channel. Members click the correct button to receive their role.
              </p>
              <Button asChild>
                <Link href={`/g/${guildId}/verification/new`}>Create your first panel</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {panels.map((p) => {
              const correctLabel =
                p.correctOptionId === null
                  ? null
                  : (p.options.find((o) => o.id === p.correctOptionId)?.label ?? null);
              return (
                <li key={p.id}>
                  <Link href={`/g/${guildId}/verification/${p.id}`}>
                    <Card className="transition-colors hover:bg-[color:var(--color-bg-subtle)]">
                      <CardHeader>
                        <CardTitle className="text-base">{p.embedTitle}</CardTitle>
                        <CardDescription>
                          <code className="font-mono text-xs">#{p.channelId}</code> · role{' '}
                          <code className="font-mono text-xs">{p.roleId}</code> · {p.options.length}{' '}
                          option{p.options.length === 1 ? '' : 's'}
                          {correctLabel === null ? (
                            <span className="ml-2 inline-flex items-center rounded-[var(--radius-sm)] bg-[color:var(--color-bg-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[color:var(--color-fg-muted)]">
                              No correct option
                            </span>
                          ) : (
                            <span className="ml-2 text-[color:var(--color-fg-muted)]">
                              · correct: {correctLabel}
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
