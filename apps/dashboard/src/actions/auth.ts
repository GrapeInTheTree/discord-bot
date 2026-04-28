'use server';

import { signOut as nextAuthSignOut } from '@/lib/auth';

/**
 * Server Action triggered by the Sign-out button in the user menu. Wraps
 * NextAuth's `signOut` so the client component doesn't need to import
 * the auth module directly (which pulls in env validation).
 */
export async function signOutAction(): Promise<void> {
  await nextAuthSignOut({ redirectTo: '/login' });
}
