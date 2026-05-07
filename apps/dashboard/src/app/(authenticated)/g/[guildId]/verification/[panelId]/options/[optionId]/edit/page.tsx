import { dbDrizzle, eq, schema } from '@hearth/database';
import { notFound, redirect } from 'next/navigation';

import { Topbar } from '@/components/layout/topbar';
import { VerificationOptionForm } from '@/components/verification/verification-option-form';
import { auth } from '@/lib/auth';

interface EditOptionPageProps {
  readonly params: Promise<{
    readonly guildId: string;
    readonly panelId: string;
    readonly optionId: string;
  }>;
}

export default async function EditOptionPage({
  params,
}: EditOptionPageProps): Promise<React.JSX.Element> {
  const session = await auth();
  if (session === null) redirect('/login');
  const { guildId, panelId, optionId } = await params;

  const [option] = await dbDrizzle
    .select()
    .from(schema.verificationOption)
    .where(eq(schema.verificationOption.id, optionId))
    .limit(1);
  if (option === undefined || option.panelId !== panelId) notFound();

  const [panel] = await dbDrizzle
    .select()
    .from(schema.verificationPanel)
    .where(eq(schema.verificationPanel.id, panelId))
    .limit(1);
  if (panel === undefined || panel.guildId !== guildId) notFound();

  const avatarUrl =
    session.user.avatarHash !== null
      ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatarHash}.webp?size=128`
      : null;

  return (
    <>
      <Topbar
        username={session.user.username}
        avatarUrl={avatarUrl}
        title="Edit verification option"
        description={panel.embedTitle}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <VerificationOptionForm
          guildId={guildId}
          panelId={panelId}
          initial={{
            optionId: option.id,
            label: option.label,
            emoji: option.emoji,
            buttonStyle: option.buttonStyle as 'primary' | 'secondary' | 'success' | 'danger',
            position: option.position,
          }}
        />
      </main>
    </>
  );
}
