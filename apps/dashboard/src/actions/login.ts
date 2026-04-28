'use server';

import { signIn } from '@/lib/auth';

/**
 * Server Action triggered by the "Sign in with Discord" button. Wraps
 * NextAuth's `signIn` so the client component (the login button) doesn't
 * need to import the auth module — which would pull NEXTAUTH_SECRET
 * validation into the client bundle (Next.js would error, this is just
 * an extra defensive boundary).
 */
export async function signInWithDiscord(callbackUrl: string | undefined): Promise<void> {
  await signIn('discord', { redirectTo: callbackUrl ?? '/select-guild' });
}
