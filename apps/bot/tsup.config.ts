import { defineConfig } from 'tsup';

export default defineConfig({
  // Multi-entry: every src/**/*.ts becomes its own dist/**/*.js.
  // Required because Sapphire scans dist/{commands,listeners,interactions,...}/
  // for piece files at runtime — bundling everything into a single file would
  // hide pieces from the loader.
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: false,
  splitting: false,
  external: [
    '@prisma/client',
    'discord.js',
    '@sapphire/framework',
    '@sapphire/pieces',
    '@sapphire/plugin-logger',
    '@sapphire/utilities',
    'zod',
  ],
  // Workspace packages bundled (pnpm symlinks them locally; safe to inline).
  noExternal: [/^@discord-bot\//],
});
