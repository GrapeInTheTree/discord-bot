import { redirect } from 'next/navigation';

import { LoginButton } from '@/components/auth/login-button';
import { Brand } from '@/components/layout/brand';
import { branding } from '@/config/branding';
import { t } from '@/i18n';
import { auth } from '@/lib/auth';

interface LoginPageProps {
  readonly searchParams: Promise<{ readonly callbackUrl?: string }>;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const session = await auth();
  const params = await searchParams;
  if (session !== null) {
    redirect(params.callbackUrl ?? '/select-guild');
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <Brand href="/" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to {branding.name}</h1>
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Sign in with Discord to manage your servers&rsquo; ticket panels.
          </p>
        </div>
        <LoginButton callbackUrl={params.callbackUrl} label={t.app.signIn} />
      </div>
    </main>
  );
}
