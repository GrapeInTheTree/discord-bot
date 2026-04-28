import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/**
 * Auth gate for every page under the (authenticated) route group. The
 * middleware also enforces this — RSC layouts run after middleware, so
 * this is belt-and-suspenders. Either redirects to /login or renders
 * children unchanged (no extra chrome at this level — guild-scoped
 * chrome lives in /g/[guildId]/layout).
 */
export default async function AuthenticatedLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth();
  if (session === null) redirect('/login');
  return <>{children}</>;
}
