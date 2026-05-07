import { count, eq, schema } from '@hearth/database';
import { ok } from '@hearth/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupTestDb, type DashboardTestDb } from '../../helpers/testDb.js';

import {
  addVerificationOption,
  removeVerificationOption,
  updateVerificationOption,
} from '@/actions/verification-options';

const botClientMock = vi.hoisted(() => ({ callBot: vi.fn() }));
vi.mock('@/lib/botClient', () => botClientMock);

const authMock = vi.hoisted(() => ({ authorizeGuild: vi.fn() }));
vi.mock('@/lib/server-auth', () => authMock);

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const guildId = '111111111111111111';
const channelId = '222222222222222222';
const roleId = '333333333333333333';

async function seedPanel(testDb: DashboardTestDb): Promise<string> {
  const [panel] = await testDb.db
    .insert(schema.verificationPanel)
    .values({
      guildId,
      channelId,
      messageId: 'pending',
      embedTitle: 'Verify',
      embedDescription: 'Click the right one.',
      roleId,
    })
    .returning();
  if (panel === undefined) throw new Error('seed failed');
  return panel.id;
}

async function seedOption(
  testDb: DashboardTestDb,
  panelId: string,
  overrides: Partial<{ label: string; position: number }> = {},
): Promise<string> {
  const [opt] = await testDb.db
    .insert(schema.verificationOption)
    .values({
      panelId,
      label: overrides.label ?? `Opt-${String(overrides.position ?? 0)}`,
      emoji: '🍎',
      buttonStyle: 'primary',
      position: overrides.position ?? 0,
    })
    .returning();
  if (opt === undefined) throw new Error('seed option failed');
  return opt.id;
}

describe('addVerificationOption', () => {
  let testDb: DashboardTestDb;
  let panelId: string;
  beforeEach(async () => {
    testDb = await setupTestDb();
    panelId = await seedPanel(testDb);
    authMock.authorizeGuild.mockResolvedValue(ok({ userId: 'u1', username: 'tester' }));
  });
  afterEach(async () => {
    await testDb.close();
    vi.clearAllMocks();
  });

  it('inserts an option', async () => {
    const result = await addVerificationOption({
      guildId,
      panelId,
      input: { label: 'Apple', emoji: '🍎', buttonStyle: 'primary', position: 0 },
    });
    expect(result.ok).toBe(true);
    const [row] = await testDb.db.select({ value: count() }).from(schema.verificationOption);
    expect(row?.value).toBe(1);
  });

  it('rejects duplicate label on the same panel', async () => {
    await seedOption(testDb, panelId, { label: 'Apple', position: 0 });
    const result = await addVerificationOption({
      guildId,
      panelId,
      input: { label: 'Apple', emoji: '🍌', buttonStyle: 'primary', position: 1 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
  });

  it('rejects duplicate position on the same panel', async () => {
    await seedOption(testDb, panelId, { position: 0 });
    const result = await addVerificationOption({
      guildId,
      panelId,
      input: { label: 'Banana', emoji: '🍌', buttonStyle: 'primary', position: 0 },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a 6th option', async () => {
    for (let i = 0; i < 5; i++) {
      await seedOption(testDb, panelId, { label: `o${String(i)}`, position: i });
    }
    const result = await addVerificationOption({
      guildId,
      panelId,
      input: { label: 'Sixth', emoji: '6️⃣', buttonStyle: 'primary', position: 0 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
  });

  it('returns NotFoundError when the panel belongs to a different guild', async () => {
    const result = await addVerificationOption({
      guildId: '999999999999999999',
      panelId,
      input: { label: 'X', emoji: '🍎', buttonStyle: 'primary', position: 0 },
    });
    expect(result.ok).toBe(false);
  });
});

describe('updateVerificationOption', () => {
  let testDb: DashboardTestDb;
  let panelId: string;
  let optionAId: string;
  let optionBId: string;
  beforeEach(async () => {
    testDb = await setupTestDb();
    panelId = await seedPanel(testDb);
    optionAId = await seedOption(testDb, panelId, { label: 'A', position: 0 });
    optionBId = await seedOption(testDb, panelId, { label: 'B', position: 1 });
    authMock.authorizeGuild.mockResolvedValue(ok({ userId: 'u1', username: 'tester' }));
  });
  afterEach(async () => {
    await testDb.close();
    vi.clearAllMocks();
  });

  it('updates label in place', async () => {
    const result = await updateVerificationOption({
      guildId,
      panelId,
      optionId: optionAId,
      input: { label: 'Apple' },
    });
    expect(result.ok).toBe(true);
    const [row] = await testDb.db
      .select()
      .from(schema.verificationOption)
      .where(eq(schema.verificationOption.id, optionAId));
    expect(row?.label).toBe('Apple');
  });

  it('rejects label collision with another option on the same panel', async () => {
    const result = await updateVerificationOption({
      guildId,
      panelId,
      optionId: optionAId,
      input: { label: 'B' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
  });

  it('rejects position collision', async () => {
    const result = await updateVerificationOption({
      guildId,
      panelId,
      optionId: optionAId,
      input: { position: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it('returns NotFound when option belongs to another panel', async () => {
    const result = await updateVerificationOption({
      guildId,
      panelId: 'other-panel',
      optionId: optionBId,
      input: { label: 'New' },
    });
    expect(result.ok).toBe(false);
  });
});

describe('removeVerificationOption', () => {
  let testDb: DashboardTestDb;
  let panelId: string;
  let optionAId: string;
  let optionBId: string;
  beforeEach(async () => {
    testDb = await setupTestDb();
    panelId = await seedPanel(testDb);
    optionAId = await seedOption(testDb, panelId, { label: 'A', position: 0 });
    optionBId = await seedOption(testDb, panelId, { label: 'B', position: 1 });
    authMock.authorizeGuild.mockResolvedValue(ok({ userId: 'u1', username: 'tester' }));
  });
  afterEach(async () => {
    await testDb.close();
    vi.clearAllMocks();
  });

  it('removes a non-correct option', async () => {
    const result = await removeVerificationOption({
      guildId,
      panelId,
      optionId: optionBId,
    });
    expect(result.ok).toBe(true);
    const [row] = await testDb.db.select({ value: count() }).from(schema.verificationOption);
    expect(row?.value).toBe(1);
  });

  it('rejects removal of the panel current correct option', async () => {
    await testDb.db
      .update(schema.verificationPanel)
      .set({ correctOptionId: optionAId })
      .where(eq(schema.verificationPanel.id, panelId));
    const result = await removeVerificationOption({
      guildId,
      panelId,
      optionId: optionAId,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
  });
});
