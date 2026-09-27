import { describe, expect, test } from 'vitest';
import type { SavedListRow } from '../../services';
import {
  applyListView,
  DEFAULT_VIEW,
  fieldOptions,
  hasActiveView,
  parseListView,
  summarizeRows,
  writeListView,
} from './listView';

const row = (over: Partial<SavedListRow> & { kolId: string }): SavedListRow => ({
  displayName: over.kolId,
  fields: [],
  platforms: [],
  channels: [],
  totalFollowers: 0,
  status: 'VISIBLE',
  note: '',
  addedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const ROWS: SavedListRow[] = [
  row({
    kolId: 'KOL-0001',
    displayName: 'Châu Bùi',
    handle: 'chaubui',
    fields: [
      { name: 'Thời trang', medal: 'gold' },
      { name: 'Làm đẹp', medal: 'none' },
    ],
    totalFollowers: 4_200_000,
    addedAt: '2026-09-03T00:00:00.000Z',
  }),
  row({
    kolId: 'KOL-0002',
    displayName: 'Đạt Villa',
    handle: 'datvilla',
    fields: [{ name: 'Âm nhạc', medal: 'none' }],
    totalFollowers: 9_000_000,
    status: 'BADGE_EXPIRED',
    addedAt: '2026-09-01T00:00:00.000Z',
  }),
  row({ kolId: 'KOL-0003', displayName: 'An Nhiên', fields: [{ name: 'Làm đẹp', medal: 'silver' }], status: 'INACTIVE', addedAt: '2026-09-02T00:00:00.000Z' }),
  row({ kolId: 'KOL-0004', status: 'UNAVAILABLE', addedAt: '2026-08-01T00:00:00.000Z' }),
];

const ids = (rows: SavedListRow[]) => rows.map((r) => r.kolId);

describe('parseListView / writeListView', () => {
  test('mặc định khi không có tham số', () => expect(parseListView(new URLSearchParams())).toEqual(DEFAULT_VIEW));

  test('đọc tham số hợp lệ, bỏ qua giá trị lạ', () => {
    expect(parseListView(new URLSearchParams('q=chau&trangThai=het-han&linhVuc=L%C3%A0m+%C4%91%E1%BA%B9p&sapXep=ten'))).toEqual({
      q: 'chau',
      status: 'het-han',
      field: 'Làm đẹp',
      sort: 'ten',
    });
    expect(parseListView(new URLSearchParams('trangThai=abc&sapXep=xyz&linhVuc=%20'))).toEqual(DEFAULT_VIEW);
  });

  test('ghi: giữ tham số khác (ds, kol), xoá giá trị mặc định', () => {
    const sp = writeListView(new URLSearchParams('ds=l1&kol=K&q=x&sapXep=ten'), { q: '', sort: 'moi-luu', status: 'con-hieu-luc' });
    expect(sp.toString()).toBe('ds=l1&kol=K&trangThai=con-hieu-luc');
  });

  test('vòng tròn parse ∘ write', () => {
    const v = { q: 'đạt', status: 'ngung-hoat-dong', field: 'Âm nhạc', sort: 'nguoi-theo-doi' } as const;
    expect(parseListView(writeListView(new URLSearchParams(), v))).toEqual(v);
  });
});

describe('applyListView', () => {
  test('mặc định: mới lưu nhất trước', () => expect(ids(applyListView(ROWS, DEFAULT_VIEW))).toEqual(['KOL-0001', 'KOL-0003', 'KOL-0002', 'KOL-0004']));

  test('tìm không dấu theo tên, @handle, KOL ID', () => {
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, q: 'chau bui' }))).toEqual(['KOL-0001']);
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, q: '@datvilla' }))).toEqual(['KOL-0002']);
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, q: 'kol-0003' }))).toEqual(['KOL-0003']);
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, q: 'dat' }))).toEqual(['KOL-0002']);
  });

  test('trạng thái dấu: ngừng hoạt động gồm cả KOL không còn hiển thị', () => {
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, status: 'con-hieu-luc' }))).toEqual(['KOL-0001']);
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, status: 'het-han' }))).toEqual(['KOL-0002']);
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, status: 'ngung-hoat-dong' }))).toEqual(['KOL-0003', 'KOL-0004']);
  });

  test('lĩnh vực', () => expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, field: 'Làm đẹp' }))).toEqual(['KOL-0001', 'KOL-0003']));

  test('sắp xếp theo người theo dõi, theo tên A–Z (tiếng Việt)', () => {
    expect(ids(applyListView(ROWS, { ...DEFAULT_VIEW, sort: 'nguoi-theo-doi' }))).toEqual(['KOL-0002', 'KOL-0001', 'KOL-0003', 'KOL-0004']);
    expect(applyListView(ROWS.slice(0, 3), { ...DEFAULT_VIEW, sort: 'ten' }).map((r) => r.displayName)).toEqual(['An Nhiên', 'Châu Bùi', 'Đạt Villa']);
  });

  test('không đổi mảng gốc', () => {
    const copy = [...ROWS];
    applyListView(ROWS, { ...DEFAULT_VIEW, sort: 'ten' });
    expect(ROWS).toEqual(copy);
  });
});

test('fieldOptions: duy nhất, sắp theo tiếng Việt', () => expect(fieldOptions(ROWS)).toEqual(['Âm nhạc', 'Làm đẹp', 'Thời trang']));

test('summarizeRows', () =>
  expect(summarizeRows(ROWS)).toEqual({ verified: 1, expired: 1, inactive: 2, totalFollowers: 13_200_000 }));

test('hasActiveView: sắp xếp không tính là lọc', () => {
  expect(hasActiveView({ ...DEFAULT_VIEW, sort: 'ten' })).toBe(false);
  expect(hasActiveView({ ...DEFAULT_VIEW, q: '  ' })).toBe(false);
  expect(hasActiveView({ ...DEFAULT_VIEW, field: 'Làm đẹp' })).toBe(true);
});
