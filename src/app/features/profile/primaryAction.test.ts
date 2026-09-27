import { expect, test } from 'vitest';
import { primaryAction, profilePath, type PrimaryActionInput } from './primaryAction';

const base: PrimaryActionInput = { ownerType: 'KOL', status: 'DRAFT', ekycStatus: 'NOT_STARTED', eligible: false, hasNeedsFixChannel: false };

test.each<[string, Partial<PrimaryActionInput>, ReturnType<typeof primaryAction>]>([
  ['KOL DRAFT chưa eKYC', {}, { label: 'Xác thực danh tính', to: '/ho-so-kol/dinh-danh', disabled: false }],
  ['MCN DRAFT chưa đủ', { ownerType: 'MCN', ekycStatus: undefined }, { label: 'Xác thực tổ chức', to: '/ho-so-mcn/dinh-danh', disabled: false }],
  ['KOL DRAFT eKYC xong, chưa đủ', { ekycStatus: 'PASSED' }, { label: 'Hoàn thiện hồ sơ', to: '/ho-so-kol/dinh-danh', disabled: false }],
  ['DRAFT đủ điều kiện', { ekycStatus: 'PASSED', eligible: true }, { label: 'Gửi xét duyệt', to: '/ho-so-kol/dinh-danh', disabled: false }],
  ['SUBMITTED', { status: 'SUBMITTED', ekycStatus: 'PASSED', eligible: true }, { label: 'Đang xét duyệt', to: null, disabled: true }],
  ['NEEDS_FIX có kênh cần bổ sung', { status: 'NEEDS_FIX', hasNeedsFixChannel: true }, { label: 'Xem yêu cầu bổ sung', to: '/ho-so-kol/kenh', disabled: false }],
  ['NEEDS_FIX không có kênh', { status: 'NEEDS_FIX' }, { label: 'Xem yêu cầu bổ sung', to: '/ho-so-kol/dinh-danh', disabled: false }],
  ['APPROVED', { status: 'APPROVED', ekycStatus: 'PASSED' }, { label: 'Thêm kênh', to: '/ho-so-kol/kenh?them=1', disabled: false }],
  ['MCN APPROVED', { ownerType: 'MCN', ekycStatus: undefined, status: 'APPROVED' }, { label: 'Thêm kênh', to: '/ho-so-mcn/kenh?them=1', disabled: false }],
  ['REJECTED', { status: 'REJECTED' }, null],
])('%s', (_name, patch, expected) => expect(primaryAction({ ...base, ...patch })).toEqual(expected));

test('MCN DRAFT đủ điều kiện → Gửi xét duyệt', () =>
  expect(primaryAction({ ...base, ownerType: 'MCN', ekycStatus: undefined, eligible: true })).toEqual({
    label: 'Gửi xét duyệt',
    to: '/ho-so-mcn/dinh-danh',
    disabled: false,
  }));

test('profilePath chỉ thêm ?them=1 cho trang kênh', () => {
  expect(profilePath('KOL', 'lien-he')).toBe('/ho-so-kol/lien-he');
  expect(profilePath('MCN', 'kenh', { openAddChannel: true })).toBe('/ho-so-mcn/kenh?them=1');
  expect(profilePath('KOL', 'dinh-danh', { openAddChannel: true })).toBe('/ho-so-kol/dinh-danh');
});
