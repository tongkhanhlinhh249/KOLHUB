import { expect, test } from 'vitest';
import {
  checklistLink,
  infoPath,
  isProfileAnchor,
  legacySectionPath,
  milestoneBadge,
  primaryAction,
  PROFILE_SECTIONS,
  profilePath,
  type PrimaryActionInput,
} from './primaryAction';

const base: PrimaryActionInput = { ownerType: 'KOL', status: 'DRAFT', firstMissing: 'ekyc', hasNeedsFixChannel: false };

test.each<[string, Partial<PrimaryActionInput>, ReturnType<typeof primaryAction>]>([
  ['KOL DRAFT chưa eKYC', {}, { label: 'Xác thực danh tính', to: '/ho-so-kol/thong-tin#dinh-danh', disabled: false }],
  ['MCN DRAFT thiếu định danh tổ chức', { ownerType: 'MCN', firstMissing: 'org' }, { label: 'Xác thực tổ chức', to: '/ho-so-mcn/thong-tin#dinh-danh', disabled: false }],
  ['MCN DRAFT thiếu GCN', { ownerType: 'MCN', firstMissing: 'gcn' }, { label: 'Xác thực tổ chức', to: '/ho-so-mcn/thong-tin#dinh-danh', disabled: false }],
  ['DRAFT thiếu liên hệ', { firstMissing: 'contact' }, { label: 'Bổ sung liên hệ', to: '/ho-so-kol/thong-tin#lien-he', disabled: false }],
  ['DRAFT thiếu nhân sự', { firstMissing: 'staff' }, { label: 'Bổ sung nhân sự', to: '/ho-so-kol/thong-tin#nhan-su', disabled: false }],
  ['DRAFT thiếu kênh', { firstMissing: 'channel' }, { label: 'Thêm kênh', to: '/ho-so-kol/kenh?them=1', disabled: false }],
  ['DRAFT đủ điều kiện', { firstMissing: undefined }, { label: 'Gửi xét duyệt', to: '/ho-so-kol/tong-quan', disabled: false }],
  ['SUBMITTED', { status: 'SUBMITTED', firstMissing: undefined }, { label: 'Đang xét duyệt', to: null, disabled: true }],
  ['NEEDS_FIX có kênh cần bổ sung', { status: 'NEEDS_FIX', hasNeedsFixChannel: true }, { label: 'Xem yêu cầu bổ sung', to: '/ho-so-kol/kenh', disabled: false }],
  ['NEEDS_FIX không có kênh', { status: 'NEEDS_FIX' }, { label: 'Xem yêu cầu bổ sung', to: '/ho-so-kol/thong-tin#dinh-danh', disabled: false }],
  ['APPROVED', { status: 'APPROVED', firstMissing: undefined }, { label: 'Thêm kênh', to: '/ho-so-kol/kenh?them=1', disabled: false }],
  ['MCN APPROVED', { ownerType: 'MCN', firstMissing: undefined, status: 'APPROVED' }, { label: 'Thêm kênh', to: '/ho-so-mcn/kenh?them=1', disabled: false }],
  ['REJECTED', { status: 'REJECTED' }, null],
])('%s', (_name, patch, expected) => expect(primaryAction({ ...base, ...patch })).toEqual(expected));

test('MCN DRAFT đủ điều kiện → Gửi xét duyệt', () =>
  expect(primaryAction({ ...base, ownerType: 'MCN', firstMissing: undefined })).toEqual({
    label: 'Gửi xét duyệt',
    to: '/ho-so-mcn/tong-quan',
    disabled: false,
  }));

test('profilePath chỉ thêm ?them=1 cho trang kênh, #mục cho Thông tin hồ sơ', () => {
  expect(profilePath('KOL', 'thong-tin')).toBe('/ho-so-kol/thong-tin');
  expect(profilePath('MCN', 'tong-quan')).toBe('/ho-so-mcn/tong-quan');
  expect(profilePath('MCN', 'kenh', { openAddChannel: true })).toBe('/ho-so-mcn/kenh?them=1');
  expect(profilePath('KOL', 'thong-tin', { openAddChannel: true })).toBe('/ho-so-kol/thong-tin');
  expect(profilePath('KOL', 'kenh', { anchor: 'lien-he' })).toBe('/ho-so-kol/kenh');
  expect(infoPath('MCN', 'nhan-su')).toBe('/ho-so-mcn/thong-tin#nhan-su');
});

test('Thông tin hồ sơ gộp định danh + liên hệ: thứ tự mục và neo', () => {
  expect(PROFILE_SECTIONS).toEqual(['tong-quan', 'thong-tin', 'kenh']);
  for (const a of ['dinh-danh', 'lien-he', 'nhan-su']) expect(isProfileAnchor(a)).toBe(true);
  for (const a of ['kenh', '', null, undefined]) expect(isProfileAnchor(a)).toBe(false);
});

test('legacySectionPath: ?tab= và trang cũ dẫn tới mục tương ứng', () => {
  expect(legacySectionPath('KOL', 'lien-he')).toBe('/ho-so-kol/thong-tin#lien-he');
  expect(legacySectionPath('MCN', 'dinh-danh')).toBe('/ho-so-mcn/thong-tin#dinh-danh');
  expect(legacySectionPath('KOL', 'thong-tin')).toBe('/ho-so-kol/thong-tin');
  expect(legacySectionPath('MCN', 'kenh', { openAddChannel: true })).toBe('/ho-so-mcn/kenh?them=1');
  expect(legacySectionPath('KOL', 'khac')).toBe('/ho-so-kol/tong-quan');
  expect(legacySectionPath('KOL', null)).toBe('/ho-so-kol/tong-quan');
});

test('milestoneBadge: nhãn ngắn và trang con tương ứng', () => {
  const kol = (['contact', 'staff', 'identity', 'channel', 'submitted'] as const).map((k) => milestoneBadge('KOL', k));
  expect(kol).toEqual([
    { label: 'Liên hệ', to: '/ho-so-kol/thong-tin#lien-he' },
    { label: 'Nhân sự', to: '/ho-so-kol/thong-tin#nhan-su' },
    { label: 'eKYC', to: '/ho-so-kol/thong-tin#dinh-danh' },
    { label: 'Kênh & ảnh', to: '/ho-so-kol/kenh' },
    { label: 'Gửi xét duyệt', to: '/ho-so-kol/tong-quan' },
  ]);
  expect(milestoneBadge('MCN', 'identity')).toEqual({ label: 'GCN ĐKDN', to: '/ho-so-mcn/thong-tin#dinh-danh' });
});

test('checklistLink: điều kiện chưa đạt dẫn tới trang cần sửa', () => {
  expect(checklistLink('KOL', 'ekyc')).toBe('/ho-so-kol/thong-tin#dinh-danh');
  expect(checklistLink('MCN', 'gcn')).toBe('/ho-so-mcn/thong-tin#dinh-danh');
  expect(checklistLink('MCN', 'org')).toBe('/ho-so-mcn/thong-tin#dinh-danh');
  expect(checklistLink('KOL', 'contact')).toBe('/ho-so-kol/thong-tin#lien-he');
  expect(checklistLink('KOL', 'staff')).toBe('/ho-so-kol/thong-tin#nhan-su');
  expect(checklistLink('MCN', 'channel')).toBe('/ho-so-mcn/kenh');
  expect(checklistLink('MCN', 'kols')).toBe('/ho-so-mcn/kol');
  expect(checklistLink('KOL', 'pledges')).toBeUndefined();
});
