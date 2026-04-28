import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/**
 * Marketing-style root. If the user is signed in, send them straight to
 * the guild picker; otherwise to the login page. Keeps the URL surface
 * minimal — there's no separate landing copy until we add public marketing
 * content.
 */
export default async function RootPage(): Promise<never> {
  const session = await auth();
  if (session === null) {
    redirect('/login');
  }
  redirect('/select-guild');
}
