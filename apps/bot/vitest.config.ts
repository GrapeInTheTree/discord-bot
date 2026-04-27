import { defineConfig } from 'vitest/config';

const RUN_INTEGRATION = process.env['RUN_INTEGRATION'] === '1';

// Single config, two execution modes:
// - default: unit only (fakeDb + fakeGateway), runs in <1s.
// - RUN_INTEGRATION=1: includes tests/integration/* (testcontainers pg 16),
//   default `test` script keeps fast feedback.
//
// Vitest's individual integration test files use `describe.runIf(...)` so
// they self-skip when run accidentally without the flag — defensive in
// case someone runs vitest directly.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: RUN_INTEGRATION
      ? ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'src/**/*.test.ts']
      : ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // testcontainers pull + migrate + 4 lifecycle scenarios takes ~30s on
    // a cold cache. Generous timeout when integration is enabled.
    testTimeout: RUN_INTEGRATION ? 60_000 : 5_000,
    hookTimeout: RUN_INTEGRATION ? 60_000 : 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/container.ts',
        'src/i18n/**',
        'src/commands/**',
        'src/listeners/**',
        'src/interactions/**',
        'src/preconditions/**',
        'src/services/ports/**',
        'src/services/index.ts',
        'src/healthcheck/**',
        'src/lib/logger.ts',
      ],
      thresholds: {
        lines: 85,
        branches: 75,
        functions: 85,
        statements: 85,
      },
    },
  },
});
