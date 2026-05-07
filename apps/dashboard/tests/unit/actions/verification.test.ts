import { eq, schema } from '@hearth/database';
import { ok } from '@hearth/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupTestDb, type DashboardTestDb } from '../../helpers/testDb.js';

import {
  createVerificationPanel,
  deleteVerificationPanel,
  repostVerificationPanel,
  setCorrectVerificationOption,
  updateVerificationPanel,
} from '@/actions/verification';

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

describe('createVerificationPanel', () => {
  let testDb: DashboardTestDb;
  beforeEach(async () => {
    testDb = await setupTestDb();
    authMock.authorizeGuild.mockResolvedValue(ok({ userId: 'u1', username: 'tester' }));
  });
  afterEach(async () => {
    await testDb.close();
    vi.clearAllMocks();
  });

  it('inserts a panel row with placeholder messageId', async () => {
    const result = await createVerificationPanel({
      guildId,
      input: {
        guildId,
        channelId,
        embedTitle: 'Verify here',
        embedDescription: 'Click correct.',
        roleId,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = await testDb.db
      .select()
      .from(schema.verificationPanel)
      .where(eq(schema.verificationPanel.id, result.value.value.panelId));
    expect(rows[0]?.guildId).toBe(guildId);
    expect(rows[0]?.messageId).toBe('pending');
  });

  it('rejects unauthorized callers without writing to the DB', async () => {
    authMock.authorizeGuild.mockResolvedValue({
      ok: false,
      error: { code: 'PERMISSION_ERROR', message: 'forbidden' },
    });
    const result = await createVerificationPanel({
      guildId,
      input: { guildId, channelId, roleId, embedTitle: 'X', embedDescription: 'Y' },
    });
    expect(result.ok).toBe(false);
    const rows = await testDb.db
      .select()
      .from(schema.verificationPanel)
      .where(eq(schema.verificationPanel.guildId, guildId));
    expect(rows).toHaveLength(0);
  });

  it('rejects when guildId in form does not match URL', async () => {
    const result = await createVerificationPanel({
      guildId,
      input: {
        guildId: '999999999999999999',
        channelId,
        roleId,
        embedTitle: 'X',
        embedDescription: 'Y',
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('updateVerificationPanel', () => {
  let testDb: DashboardTestDb;
  let panelId: string;
  beforeEach(async () => {
    testDb = await setupTestDb();
    panelId = await seedPanel(testDb);
    authMock.authorizeGuild.mockResolvedValue(ok({ userId: 'u1', username: 'tester' }));
    botClientMock.callBot.mockResolvedValue(ok({ messageId: 'm1', recreated: true }));
  });
  afterEach(async () => {
    await testDb.close();
    vi.clearAllMocks();
  });

  it('updates only the fields provided and triggers a render call', async () => {
    const result = await updateVerificationPanel({
      guildId,
      panelId,
      channelId: undefined,
      embedTitle: 'New title',
      embedDescription: undefined,
      roleId: undefined,
    });
    expect(result.ok).toBe(true);
    const [row] = await testDb.db
      .select()
      .from(schema.verificationPanel)
      .where(eq(schema.verificationPanel.id, panelId));
    expect(row?.embedTitle).toBe('New title');
    expect(row?.embedDescription).toBe('Click the right one.');
    expect(botClientMock.callBot).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `/internal/verifications/${panelId}/render`,
        method: 'POST',
      }),
    );
  });

  it('flags discordSyncFailed when the bot returns an error', async () => {
    botClientMock.callBot.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'correct option not set' },
    });
    const result = await updateVerificationPanel({
      guildId,
      panelId,
      channelId: undefined,
      embedTitle: 'Updated',
      embedDescription: undefined,
      roleId: undefined,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.discordSyncFailed).toBe(true);
  });
});

describe('deleteVerificationPanel', () => {
  let testDb: DashboardTestDb;
  beforeEach(async () => {
    testDb = await setupTestDb();
    authMock.authorizeGuild.mockResolvedValue(ok({ userId: 'u1', username: 'tester' }));
  });
  afterEach(async () => {
    await testDb.close();
    vi.clearAllMocks();
  });

  it('returns ok when the bot deletes the panel', async () => {
    const panelId = await seedPanel(testDb);
    botClientMock.callBot.mockResolvedValue(ok({ deleted: true, panelId }));
    const result = await deleteVerificationPanel({ guildId, panelId });
    expect(result.ok).toBe(true);
    expect(botClientMock.callBot).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `/internal/verifications/${panelId}`,
        method: 'DELETE',
      }),
    );
  });

  it('propagates NotFoundError from the bot', async () => {
    botClientMock.callBot.mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'panel gone' },
    });
    const result = await deleteVerificationPanel({ guildId, panelId: 'missing' });
    expect(result.ok).toBe(false);
  });
});

describe('repostVerificationPanel', () => {
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

  it('reports success with the new messageId from the bot', async () => {
    botClientMock.callBot.mockResolvedValue(
      ok({ messageId: 'new-m', previousMessageId: 'pending' }),
    );
    const result = await repostVerificationPanel({ guildId, panelId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.value.messageId).toBe('new-m');
  });

  it('flags discordSyncFailed when the bot is unreachable', async () => {
    botClientMock.callBot.mockResolvedValue({
      ok: false,
      error: { code: 'DISCORD_API_ERROR', message: 'bot down' },
    });
    const result = await repostVerificationPanel({ guildId, panelId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.discordSyncFailed).toBe(true);
  });
});

describe('setCorrectVerificationOption', () => {
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

  it('updates correctOptionId on the panel when option belongs to it', async () => {
    const [option] = await testDb.db
      .insert(schema.verificationOption)
      .values({
        panelId,
        label: 'Apple',
        emoji: '🍎',
        buttonStyle: 'primary',
        position: 0,
      })
      .returning();
    if (option === undefined) throw new Error('seed');
    const result = await setCorrectVerificationOption({
      guildId,
      panelId,
      optionId: option.id,
    });
    expect(result.ok).toBe(true);
    const [row] = await testDb.db
      .select()
      .from(schema.verificationPanel)
      .where(eq(schema.verificationPanel.id, panelId));
    expect(row?.correctOptionId).toBe(option.id);
  });

  it('rejects when option is not on the given panel', async () => {
    const result = await setCorrectVerificationOption({
      guildId,
      panelId,
      optionId: 'non-existent',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });
});
