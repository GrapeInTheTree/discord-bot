import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env.js';

const validBase = {
  DISCORD_TOKEN: 'x'.repeat(60),
  DISCORD_APP_ID: '123456789012345678',
  BOT_NAME: 'Fannie',
  DATABASE_URL: 'postgresql://bot:bot@localhost:5432/db',
  NODE_ENV: 'test',
};

describe('loadEnv', () => {
  it('parses a valid env', () => {
    const env = loadEnv(validBase);
    expect(env.BOT_NAME).toBe('Fannie');
    expect(env.BOT_BRAND_COLOR).toBe('#5865F2'); // default
    expect(env.BOT_LOCALE).toBe('en');
    expect(env.PORT).toBe(3000);
  });

  it('rejects short discord token', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadEnv({ ...validBase, DISCORD_TOKEN: 'short' });
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
    errorSpy.mockRestore();
  });

  it('rejects non-snowflake app id', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadEnv({ ...validBase, DISCORD_APP_ID: 'not-a-snowflake' });
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
    errorSpy.mockRestore();
  });

  it('rejects malformed brand color', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadEnv({ ...validBase, BOT_BRAND_COLOR: 'red' });
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
    errorSpy.mockRestore();
  });

  it('coerces PORT from string', () => {
    const env = loadEnv({ ...validBase, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });
});
