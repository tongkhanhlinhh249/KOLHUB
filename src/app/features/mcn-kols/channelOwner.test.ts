import { expect, test } from 'vitest';
import type { McnKolRow } from '../../services';
import { filterByOwner, ownerOf, ownerOptions, parseOwnerParam, withOwnerParam } from './channelOwner';

const kol = (n: number, name: string): McnKolRow => ({
  kolAccountId: `acc-${n}`,
  kolId: `KOL-2026-00${n}`,
  displayName: name,
  totalFollowers: 0,
  assignedChannelCount: 0,
  channels: [],
});

const kols = [kol(11, 'Bảo Ngọc'), kol(12, 'An Nhiên')];
const chans = [
  { id: 'a', assignedKolAccountId: 'acc-11' },
  { id: 'b', assignedKolAccountId: 'acc-11' },
  { id: 'c', assignedKolAccountId: 'acc-12' },
  { id: 'd' },
  // Assignment to a KOL missing from the rows (e.g. profile gone) counts as Kênh riêng MCN.
  { id: 'e', assignedKolAccountId: 'acc-13' },
];

test('parseOwnerParam: rieng, KOL ID (hoa hoá), còn lại = tất cả', () => {
  expect(parseOwnerParam('rieng')).toBe('rieng');
  expect(parseOwnerParam(' kol-2026-0011 ')).toBe('KOL-2026-0011');
  expect(parseOwnerParam('abc')).toBeUndefined();
  expect(parseOwnerParam(null)).toBeUndefined();
});

test('withOwnerParam giữ các tham số khác', () => {
  expect(withOwnerParam(new URLSearchParams('trangThai=verified'), 'rieng').toString()).toBe('trangThai=verified&kol=rieng');
  expect(withOwnerParam(new URLSearchParams('kol=rieng&kenh=x'), undefined).toString()).toBe('kenh=x');
});

test('ownerOf / filterByOwner', () => {
  expect(ownerOf(chans[0], kols)?.displayName).toBe('Bảo Ngọc');
  expect(ownerOf(chans[4], kols)).toBeNull();
  expect(filterByOwner(chans, undefined, kols)).toHaveLength(5);
  expect(filterByOwner(chans, 'rieng', kols).map((c) => c.id)).toEqual(['d', 'e']);
  expect(filterByOwner(chans, 'KOL-2026-0011', kols).map((c) => c.id)).toEqual(['a', 'b']);
  expect(filterByOwner(chans, 'KOL-2026-0013', kols)).toEqual([]);
});

test('ownerOptions: Kênh riêng MCN trước, KOL đang quản lý theo tên, kèm số kênh', () => {
  expect(ownerOptions(chans, kols)).toEqual([
    { key: 'rieng', label: 'Kênh riêng MCN (2)' },
    { key: 'KOL-2026-0012', label: 'An Nhiên (1)' },
    { key: 'KOL-2026-0011', label: 'Bảo Ngọc (2)' },
  ]);
});
