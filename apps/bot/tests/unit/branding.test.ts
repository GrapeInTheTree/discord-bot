import { describe, expect, it } from 'vitest';

import { branding } from '../../src/config/branding.js';

describe('branding', () => {
  it('exposes resolved color as integer', () => {
    expect(typeof branding.color).toBe('number');
    expect(branding.color).toBeGreaterThan(0);
  });

  it('reflects BOT_NAME from setup env', () => {
    expect(branding.name).toBe('TestBot');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(branding)).toBe(true);
  });
});
