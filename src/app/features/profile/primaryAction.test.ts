import { expect, test } from 'vitest';
import { primaryAction, type PrimaryActionInput } from './primaryAction';

const base: PrimaryActionInput = { ownerType: 'KOL', status: 'DRAFT', ekycStatus: 'NOT_STARTED', eligible: false, hasNeedsFixChannel: false };

test.each<[string, Partial<PrimaryActionInput>, ReturnType<typeof primaryAction>]>([
  ['KOL DRAFT chưa eKYC', {}, { label: 'Xác thực danh tính', tab: 'dinh-danh', disabled: false }],
  ['MCN DRAFT chưa đủ', { ownerType: 'MCN', ekycStatus: undefined }, { label: 'Xác thực tổ chức', tab: 'dinh-danh', disabled: false }],
  ['KOL DRAFT eKYC xong, chưa đủ', { ekycStatus: 'PASSED' }, { label: 'Hoàn thiện hồ sơ', tab: 'dinh-danh', disabled: false }],
  ['DRAFT đủ điều kiện', { ekycStatus: 'PASSED', eligible: true }, { label: 'Gửi xét duyệt', tab: 'dinh-danh', disabled: false }],
  ['SUBMITTED', { status: 'SUBMITTED', ekycStatus: 'PASSED', eligible: true }, { label: 'Đang xét duyệt', tab: null, disabled: true }],
  ['NEEDS_FIX có kênh cần bổ sung', { status: 'NEEDS_FIX', hasNeedsFixChannel: true }, { label: 'Xem yêu cầu bổ sung', tab: 'kenh', disabled: false }],
  ['NEEDS_FIX không có kênh', { status: 'NEEDS_FIX' }, { label: 'Xem yêu cầu bổ sung', tab: 'dinh-danh', disabled: false }],
  ['APPROVED', { status: 'APPROVED', ekycStatus: 'PASSED' }, { label: 'Thêm kênh', tab: 'kenh', disabled: false }],
  ['REJECTED', { status: 'REJECTED' }, null],
])('%s', (_name, patch, expected) => expect(primaryAction({ ...base, ...patch })).toEqual(expected));

test('MCN DRAFT đủ điều kiện → Gửi xét duyệt', () =>
  expect(primaryAction({ ...base, ownerType: 'MCN', ekycStatus: undefined, eligible: true })).toEqual({
    label: 'Gửi xét duyệt',
    tab: 'dinh-danh',
    disabled: false,
  }));
