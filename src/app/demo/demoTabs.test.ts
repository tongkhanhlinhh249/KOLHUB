import { expect, test } from 'vitest';
import type { DemoStep } from '../services';
import { COLLAPSED_SECTIONS, orderSteps, profileActions, roleOfAccount, sectionsFor, showsEkyc, stepLabel } from './demoTabs';

test('vai trò của tài khoản demo', () => {
  expect(roleOfAccount('biz-new')).toBe('biz');
  expect(roleOfAccount('biz-verified')).toBe('biz');
  expect(roleOfAccount('kol-new')).toBe('kol');
  expect(roleOfAccount('mcn-verified')).toBe('mcn');
  expect(roleOfAccount('guest')).toBe('guest');
  expect(roleOfAccount(undefined)).toBe('guest');
});

test('mỗi vai trò chỉ thấy phần của mình; Admin và Hệ thống luôn thu gọn ở cuối', () => {
  expect(sectionsFor('biz')).toEqual(['campaign']);
  expect(sectionsFor('kol')).toEqual(['profile', 'safety', 'campaign']);
  expect(sectionsFor('mcn')).toEqual(['profile', 'safety', 'campaign']);
  expect(sectionsFor('guest')).toEqual(['hint']);
  expect(COLLAPSED_SECTIONS.map((s) => s.label)).toEqual(['Admin', 'Hệ thống']);
  expect(showsEkyc('kol')).toBe(true);
  expect(showsEkyc('mcn')).toBe(false);
});

test('hồ sơ chỉ có nút sang trạng thái kế tiếp', () => {
  expect(profileActions('DRAFT', true)).toEqual(['fill', 'submit']);
  expect(profileActions('NEEDS_FIX', true)).toEqual(['fill', 'submit']);
  expect(profileActions('SUBMITTED', true)).toEqual(['approve', 'requestFix', 'reject']);
  expect(profileActions('APPROVED', false)).toEqual(['useFresh']);
  expect(profileActions('APPROVED', true)).toEqual([]);
  expect(profileActions(undefined, true)).toEqual([]);
});

const s = (key: DemoStep['key'], actor: DemoStep['actor']) => ({ key, actor, label: key }) as DemoStep;

test('nút bước gọi bằng động từ ngắn', () => {
  const ctx = { status: 'NEGOTIATING' as const, price: 1_000_000, recruit: false };
  expect(stepLabel(s('SUPPLIER_ACCEPT', 'SUPPLIER'), ctx)).toBe('Chấp nhận');
  expect(stepLabel(s('SUPPLIER_COUNTER', 'SUPPLIER'), ctx)).toBe('Trả giá');
  expect(stepLabel(s('SUPPLIER_COUNTER', 'SUPPLIER'), { ...ctx, price: 0 })).toBe('Báo giá');
  expect(stepLabel(s('BRAND_ACCEPT', 'BRAND'), ctx)).toBe('Chốt giá');
  expect(stepLabel(s('MARK_PAID', 'BRAND'), ctx)).toBe('Đánh dấu đã trả');
  expect(stepLabel(s('DECLINE', 'BRAND'), { ...ctx, status: 'APPLIED', recruit: true })).toBe('Loại');
  expect(stepLabel(s('DECLINE', 'SUPPLIER'), ctx)).toBe('Từ chối');
  expect(stepLabel(s('PRODUCT_RECEIVED', 'SUPPLIER'), ctx)).toBe('Đã nhận hàng');
});

test('bước của vai trò hiện trước, rồi bên kia (có hậu tố), rồi hệ thống', () => {
  const steps = { primary: s('SUPPLIER_ACCEPT', 'SUPPLIER'), secondary: [s('DECLINE', 'SUPPLIER'), s('BRAND_COUNTER', 'BRAND'), s('EXPIRE', 'SYSTEM')] };
  const sup = orderSteps(steps, 'SUPPLIER');
  expect(sup.map((x) => x.step.key)).toEqual(['SUPPLIER_ACCEPT', 'DECLINE', 'BRAND_COUNTER', 'EXPIRE']);
  expect(sup.map((x) => x.primary)).toEqual([true, false, false, false]);
  expect(sup.map((x) => x.other)).toEqual([undefined, undefined, 'BRAND', undefined]);
  const brand = orderSteps(steps, 'BRAND');
  expect(brand.map((x) => x.step.key)).toEqual(['BRAND_COUNTER', 'SUPPLIER_ACCEPT', 'DECLINE', 'EXPIRE']);
  expect(brand[1]).toMatchObject({ primary: true, other: 'SUPPLIER' });
  expect(orderSteps({ secondary: [] }, 'BRAND')).toEqual([]);
});
