// Client-safe env. Next.js only inlines values prefixed with NEXT_PUBLIC_,
// which we don't currently use — branding is read server-side and passed
// down via props/server components. Stub kept for symmetry with the
// server env module so future client-needed values have an obvious home.

export const publicEnv = {
  /** Set to true when running in a browser. Useful for log gating. */
  isClient: typeof window !== 'undefined',
} as const;
