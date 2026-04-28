import Link from 'next/link';

import { Brand } from '@/components/layout/brand';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

export default function NotFound(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <Brand href="/" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.permissions.forbiddenTitle}</h1>
        <p className="text-sm text-[color:var(--color-fg-muted)]">{t.permissions.forbiddenBody}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href="/select-guild">Choose a different server</Link>
      </Button>
    </main>
  );
}
