import { dbDrizzle, eq, schema } from '@hearth/database';
import { notFound, redirect } from 'next/navigation';

import { Topbar } from '@/components/layout/topbar';
import { Card, CardContent } from '@/components/ui/card';
import { VerificationOptionForm } from '@/components/verification/verification-option-form';
import { auth } from '@/lib/auth';

interface NewOptionPageProps {
  readonly params: Promise<{ readonly guildId: string; readonly panelId: string }>;
}

export default async function NewOptionPage({
  params,
}: NewOptionPageProps): Promise<React.JSX.Element> {
  const session = await auth();
  if (session === null) redirect('/login');
  const { guildId, panelId } = await params;

  const panel = await dbDrizzle.query.verificationPanel.findFirst({
    where: eq(schema.verificationPanel.id, panelId),
    with: { options: { columns: { id: true, position: true } } },
  });
  if (panel === undefined || panel.guildId !== guildId) notFound();

  if (panel.options.length >= 5) {
    return (
      <>
        <Topbar
          username={session.user.username}
          avatarUrl={null}
          title="Option limit reached"
          description="Verification panels can hold at most 5 options."
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                Remove an option from this panel before adding another.
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const avatarUrl =
    session.user.avatarHash !== null
      ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatarHash}.webp?size=128`
      : null;

  return (
    <>
      <Topbar
        username={session.user.username}
        avatarUrl={avatarUrl}
        title="Add verification option"
        description={`Add a button to ${panel.embedTitle}.`}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <VerificationOptionForm guildId={guildId} panelId={panelId} />
      </main>
    </>
  );
}
