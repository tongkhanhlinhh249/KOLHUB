import { expect, test } from 'vitest';
import type { DemoStep } from '../services';
import { DEMO_LINK_GROUPS } from './demoLinks';
import { DEMO_TABS, defaultTab, groupSteps, restoreTab, sampleProfileAccess, showsEkyc, TAB_BLOCKS } from './demoTabs';

test('tab mặc định theo vai trò; Khách mở tab KOL', () => {
  expect(defaultTab('biz-new')).toBe('biz');
  expect(defaultTab('biz-verified')).toBe('biz');
  expect(defaultTab('kol-new')).toBe('kol');
  expect(defaultTab('kol-verified')).toBe('kol');
  expect(defaultTab('mcn-verified')).toBe('mcn');
  expect(defaultTab('guest')).toBe('kol');
  expect(defaultTab(undefined)).toBe('kol');
});

test('nhớ lựa chọn tay trong cùng vai trò, đổi vai trò thì về mặc định', () => {
  expect(restoreTab({ tab: 'admin', role: 'kol' }, 'kol-verified')).toBe('admin');
  expect(restoreTab({ tab: 'admin', role: 'kol' }, 'kol-new')).toBe('admin');
  expect(restoreTab({ tab: 'admin', role: 'kol' }, 'biz-verified')).toBe('biz');
  expect(restoreTab({ tab: 'nope', role: 'kol' }, 'kol-new')).toBe('kol');
  expect(restoreTab(null, 'mcn-new')).toBe('mcn');
  expect(restoreTab('rác', 'guest')).toBe('kol');
});

test('mỗi tab chỉ có khối của nó; công cụ hệ thống không lặp ở tab vai trò', () => {
  expect(DEMO_TABS.map((t) => t.label)).toEqual(['Nhãn hàng', 'KOL', 'MCN', 'Admin', 'Hệ thống']);
  expect(TAB_BLOCKS.biz).toEqual(['links', 'campaign']);
  for (const t of ['kol', 'mcn'] as const) expect(TAB_BLOCKS[t]).toEqual(['links', 'profile', 'campaign']);
  expect(TAB_BLOCKS.admin).toEqual(['admin', 'violations', 'funnel']);
  expect(TAB_BLOCKS.system).toEqual(['data', 'external', 'assumptions']);
  const all = Object.values(TAB_BLOCKS).flat();
  for (const b of ['admin', 'violations', 'funnel', 'data', 'external', 'assumptions']) expect(all.filter((x) => x === b)).toHaveLength(1);
  // Each role tab has its own quick links.
  expect(DEMO_LINK_GROUPS.map((g) => g.tab).sort()).toEqual(['biz', 'kol', 'mcn']);
});

test('Hồ sơ mẫu chỉ cho hồ sơ mới đúng vai trò, còn lại đề nghị chuyển tài khoản; eKYC chỉ ở KOL', () => {
  expect(sampleProfileAccess('kol', 'kol-new')).toEqual({ kind: 'use' });
  expect(sampleProfileAccess('kol', 'kol-verified')).toEqual({ kind: 'switch', to: 'kol-new' });
  expect(sampleProfileAccess('kol', 'guest')).toEqual({ kind: 'switch', to: 'kol-new' });
  expect(sampleProfileAccess('mcn', 'mcn-new')).toEqual({ kind: 'use' });
  expect(sampleProfileAccess('mcn', 'kol-new')).toEqual({ kind: 'switch', to: 'mcn-new' });
  expect(sampleProfileAccess('biz', 'biz-new')).toBeNull();
  expect(showsEkyc('kol')).toBe(true);
  expect(showsEkyc('mcn')).toBe(false);
});

test('thao tác chia theo bên, bên của tab hiện trước', () => {
  const s = (key: string, actor: DemoStep['actor']) => ({ key, actor, label: key }) as DemoStep;
  const steps = { primary: s('SUPPLIER_ACCEPT', 'SUPPLIER'), secondary: [s('DECLINE', 'SUPPLIER'), s('BRAND_X', 'BRAND'), s('EXPIRE', 'SYSTEM')] };
  expect(groupSteps(steps, 'BRAND').map((g) => g.side)).toEqual(['BRAND', 'SUPPLIER', 'SYSTEM']);
  const sup = groupSteps(steps, 'SUPPLIER');
  expect(sup.map((g) => g.side)).toEqual(['SUPPLIER', 'BRAND', 'SYSTEM']);
  expect(sup[0].primary?.key).toBe('SUPPLIER_ACCEPT');
  expect(sup[0].secondary.map((x) => x.key)).toEqual(['DECLINE']);
  expect(groupSteps({ secondary: [] }, 'BRAND')).toEqual([]);
});
