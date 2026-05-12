import { RolePickerAction, schema } from '@hearth/database';
import { RolePickerService } from '@hearth/role-picker-core';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FakeDiscordGateway } from '../../../../packages/role-picker-core/tests/helpers/fakeGateway.js';
import { branding } from '../../src/config/branding.js';
import { type IntegrationDb, startIntegrationDb } from '../helpers/testDb.js';

const SHOULD_RUN = process.env['RUN_INTEGRATION'] === '1';

const GUILD_ID = 'g-rolepicker-int';
const CHANNEL_ID = 'c-rolepicker-int';
const ROLE_EN = 'r-en-rp-int';
const ROLE_KR = 'r-ko-rp-int';
const ROLE_JP = 'r-jp-rp-int';
const USER_A = 'u-rolepicker-A';
const USER_B = 'u-rolepicker-B';

describe.runIf(SHOULD_RUN)('integration: role-picker lifecycle (real Postgres)', () => {
  let env: IntegrationDb;
  let gateway: FakeDiscordGateway;
  let service: RolePickerService;
  let panelId: string;
  let optionEnId: string;
  let optionKrId: string;
  let optionJpId: string;

  beforeAll(async () => {
    env = await startIntegrationDb();
    gateway = new FakeDiscordGateway();
    service = new RolePickerService(env.db, gateway, branding);

    const created = await service.createPanel({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      embedTitle: 'Languages',
      embedDescription: 'Pick the language you want.',
    });
    if (!created.ok) throw created.error;
    panelId = created.value.panel.id;

    const en = await service.addOption(panelId, {
      label: 'English',
      emoji: '🇺🇸',
      roleId: ROLE_EN,
      position: 0,
    });
    const kr = await service.addOption(panelId, {
      label: 'Korean',
      emoji: '🇰🇷',
      roleId: ROLE_KR,
      position: 1,
    });
    const jp = await service.addOption(panelId, {
      label: 'Japanese',
      emoji: '🇯🇵',
      roleId: ROLE_JP,
      position: 2,
    });
    if (!en.ok || !kr.ok || !jp.ok) throw new Error('seed');
    optionEnId = en.value.id;
    optionKrId = kr.value.id;
    optionJpId = jp.value.id;

    const rendered = await service.renderPanel(panelId);
    if (!rendered.ok) throw rendered.error;
    gateway.reset();
  });

  afterAll(async () => {
    await env.close();
  });

  it('grants on first selection and emits a granted audit row', async () => {
    const res = await service.handleSelection({
      panelId,
      userId: USER_A,
      selectedValues: [optionKrId],
    });
    if (!res.ok) throw res.error;
    expect(res.value.grantedCount).toBe(1);
    expect(res.value.revokedCount).toBe(0);
    expect(gateway.callsOf('assignRoleToMember')).toHaveLength(1);

    const events = await env.db
      .select()
      .from(schema.rolePickerEvent)
      .where(eq(schema.rolePickerEvent.panelId, panelId));
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe(RolePickerAction.granted);
  });

  it('swaps roles atomically on re-selection', async () => {
    const before = gateway.calls.length;
    const res = await service.handleSelection({
      panelId,
      userId: USER_A,
      selectedValues: [optionEnId],
    });
    if (!res.ok) throw res.error;
    expect(res.value.grantedCount).toBe(1);
    expect(res.value.revokedCount).toBe(1);
    expect(gateway.calls.length).toBeGreaterThan(before);
  });

  it('is a no-op when user re-submits the same selection', async () => {
    gateway.reset();
    const res = await service.handleSelection({
      panelId,
      userId: USER_A,
      selectedValues: [optionEnId],
    });
    if (!res.ok) throw res.error;
    expect(res.value.grantedCount).toBe(0);
    expect(res.value.revokedCount).toBe(0);
    expect(gateway.callsOf('assignRoleToMember')).toHaveLength(0);
  });

  it('isolates state across users — B is independent of A', async () => {
    gateway.reset();
    const res = await service.handleSelection({
      panelId,
      userId: USER_B,
      selectedValues: [optionJpId],
    });
    if (!res.ok) throw res.error;
    expect(res.value.grantedCount).toBe(1);
    expect(gateway.callsOf('assignRoleToMember')).toHaveLength(1);
  });

  it('deletePanel cascades to options and events', async () => {
    const result = await service.deletePanel(panelId);
    expect(result.ok).toBe(true);

    const options = await env.db
      .select()
      .from(schema.rolePickerOption)
      .where(eq(schema.rolePickerOption.panelId, panelId));
    expect(options).toHaveLength(0);

    const events = await env.db
      .select()
      .from(schema.rolePickerEvent)
      .where(eq(schema.rolePickerEvent.panelId, panelId));
    expect(events).toHaveLength(0);
  });
});
