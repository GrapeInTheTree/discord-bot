import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Unit tests for pure helpers (auth-permissions, botClient, env validation,
// format utilities). Component-level tests are out of scope for the MVP —
// the dashboard's UX is verified end-to-end by Playwright (PR-8).
//
// Coverage thresholds match apps/bot (85/75/85/85).
//
// `css: false` and `postcss: false` keep Vitest's Vite layer from trying to
// load Tailwind v4's PostCSS plugin (which expects the Next.js loader env).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Disable Vite's CSS pipeline entirely — vitest never serves CSS to a
  // browser, but it tries to load postcss.config.mjs which is shaped for
  // Tailwind v4 (a Next.js loader plugin, not a vanilla PostCSS plugin).
  css: { postcss: { plugins: [] } },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 5_000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/lib/**/*.ts', 'src/actions/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/lib/auth.ts', 'src/lib/env.ts', 'src/lib/publicEnv.ts'],
      thresholds: {
        lines: 85,
        branches: 75,
        functions: 85,
        statements: 85,
      },
    },
  },
});
