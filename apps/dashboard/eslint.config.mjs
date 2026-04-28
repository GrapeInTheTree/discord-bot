import baseConfig from '../../packages/eslint-config/index.js';

// Dashboard-only override: enable React + JSX a11y rules on top of the
// shared monorepo config. We deliberately don't pull in eslint-config-next
// — it's heavy and most of its value (Core Web Vitals lint rules) duplicates
// the strict TypeScript rules we already enforce, plus we use the App Router
// (no _app.tsx etc).
//
// Files marked 'use client' get the same rules as RSC files; we don't split
// configs by directive because the strict React rules apply to both.

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // RSC + Server Actions: console is fine on the server side. Pages run
      // in both contexts; let the runtime decide. Browser-side console is
      // still discouraged but we don't fail builds on it.
      'no-console': 'off',
      // shadcn primitives use React's `ElementRef` ahead of the migration to
      // `ComponentRef<T>`. The behavior is identical; suppress the deprecation
      // until shadcn upstream rolls out the rename.
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  {
    // Generated Next.js files
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
