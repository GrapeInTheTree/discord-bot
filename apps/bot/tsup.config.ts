import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  splitting: false,
  external: ['@prisma/client', 'discord.js'],
  // Sapphire loads pieces from filesystem at runtime; bundle entry only.
  noExternal: [/^@discord-bot\//],
});
