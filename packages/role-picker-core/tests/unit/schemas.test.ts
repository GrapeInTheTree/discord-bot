import { describe, expect, it } from 'vitest';

import { RolePickerOptionInputSchema } from '../../src/schemas.js';

// The emoji field is the input-layer guard that stops a value Discord
// would reject (and which 50035s the whole StringSelectMenu) before it
// ever reaches the DB. The old `.{1,32}` pattern let a concatenated
// double flag and arbitrary text through; these cases pin the tighter
// `\p{RGI_Emoji}` boundary.

const base = { label: 'Korean', roleId: '123456789012345678', position: 0 };

describe('RolePickerOptionInputSchema.emoji', () => {
  it.each(['🇰🇷', '😀', '👨‍👩‍👧', '<:pepe:1234567890123456789>', '<a:spin:1234567890123456789>'])(
    'accepts a single emoji / custom emoji: %s',
    (emoji) => {
      expect(RolePickerOptionInputSchema.safeParse({ ...base, emoji }).success).toBe(true);
    },
  );

  it.each(['🇧🇷🇵🇹', '🇰🇷🇯🇵', 'Korean', ':flag_kr:', '🇰🇷 '])(
    'rejects a non-single-emoji value: %s',
    (emoji) => {
      const r = RolePickerOptionInputSchema.safeParse({ ...base, emoji });
      expect(r.success).toBe(false);
    },
  );

  it('treats an empty string as no emoji (optional)', () => {
    const r = RolePickerOptionInputSchema.safeParse({ ...base, emoji: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.emoji).toBeUndefined();
  });
});
