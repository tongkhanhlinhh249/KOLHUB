import { expect, test } from 'vitest';
import type { McnKolRow } from '../../services';
import { applyMcnKolQuery, assignedChannelsPath, mergeMcnKolParams, parseMcnKolParams, type McnKolQuery } from './mcnKolQuery';

const CATS = ['Lifestyle', 'Làm đẹp'];

const row = (over: Partial<McnKolRow>): McnKolRow => ({
  kolAccountId: 'acc',
  kolId: 'KOL-2026-0001',
  displayName: 'A',
  totalFollowers: 0,
  assignedChannelCount: 1,
  channels: [],
  ...over,
});

const rows: McnKolRow[] = [
  row({ kolId: 'KOL-2026-0011', displayName: 'An Nhiên Review', category: 'Lifestyle', totalFollowers: 10, assignedChannelCount: 2, lastAssignedAt: 5 }),
  row({ kolId: 'KOL-2026-0012', displayName: 'Bảo Ngọc Beauty', category: 'Làm đẹp', totalFollowers: 30, lastAssignedAt: 9 }),
  row({ kolId: 'KOL-2026-0020', displayName: 'Đức Anh', totalFollowers: 5, lastAssignedAt: 1 }),
];

const q = (over: Partial<McnKolQuery> = {}): McnKolQuery => ({ sort: 'newest', ...over });

test('parse / merge URL: mặc định Gán gần nhất, giá trị lạ bị bỏ', () => {
  expect(parseMcnKolParams(new URLSearchParams(''), CATS)).toEqual({ sort: 'newest' });
  expect(parseMcnKolParams(new URLSearchParams('q=%20vy%20&linh-vuc=Lifestyle&sap-xep=channels'), CATS)).toEqual({
    keyword: 'vy',
    category: 'Lifestyle',
    sort: 'channels',
  });
  expect(parseMcnKolParams(new URLSearchParams('linh-vuc=Khác&sap-xep=zzz'), CATS)).toEqual({ sort: 'newest' });
  expect(mergeMcnKolParams(new URLSearchParams('khac=1&q=cu'), q({ sort: 'followers' })).toString()).toBe('khac=1&sap-xep=followers');
});

test('tìm theo tên không dấu hoặc KOL ID; lọc lĩnh vực', () => {
  expect(applyMcnKolQuery(rows, q({ keyword: 'bao ngoc' })).map((r) => r.kolId)).toEqual(['KOL-2026-0012']);
  expect(applyMcnKolQuery(rows, q({ keyword: '0011' })).map((r) => r.kolId)).toEqual(['KOL-2026-0011']);
  expect(applyMcnKolQuery(rows, q({ category: 'Làm đẹp' })).map((r) => r.kolId)).toEqual(['KOL-2026-0012']);
});

test('sắp xếp: gán gần nhất, nhiều kênh, nhiều follower, tên', () => {
  expect(applyMcnKolQuery(rows, q()).map((r) => r.kolId)).toEqual(['KOL-2026-0012', 'KOL-2026-0011', 'KOL-2026-0020']);
  expect(applyMcnKolQuery(rows, q({ sort: 'channels' }))[0].kolId).toBe('KOL-2026-0011');
  expect(applyMcnKolQuery(rows, q({ sort: 'followers' }))[0].kolId).toBe('KOL-2026-0012');
  expect(applyMcnKolQuery(rows, q({ sort: 'name' }))[0].displayName).toBe('An Nhiên Review');
});

test('link kênh được gán', () => expect(assignedChannelsPath('KOL-2026-0011')).toBe('/ho-so-mcn/kenh?kol=KOL-2026-0011'));
