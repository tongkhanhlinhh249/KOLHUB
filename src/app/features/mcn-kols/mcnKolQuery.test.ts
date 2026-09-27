import { expect, test } from 'vitest';
import type { McnKolRow } from '../../services';
import {
  applyMcnKolQuery,
  assignedChannelsPath,
  countMcnKolTabs,
  mergeMcnKolParams,
  parseMcnKolParams,
  type McnKolQuery,
} from './mcnKolQuery';

const CATS = ['Lifestyle', 'Làm đẹp'];

const row = (over: Partial<McnKolRow>): McnKolRow => ({
  linkId: over.kolId ?? 'x',
  kolAccountId: 'acc',
  kolId: 'KOL-2026-0001',
  displayName: 'A',
  totalFollowers: 0,
  assignedChannelCount: 0,
  status: 'ACTIVE',
  invitedAt: 0,
  ...over,
});

const rows: McnKolRow[] = [
  row({ kolId: 'KOL-2026-0011', displayName: 'An Nhiên Review', category: 'Lifestyle', totalFollowers: 10, respondedAt: 5 }),
  row({ kolId: 'KOL-2026-0012', displayName: 'Bảo Ngọc Beauty', category: 'Làm đẹp', totalFollowers: 30, respondedAt: 9 }),
  row({ kolId: 'KOL-2026-0001', displayName: 'Khánh Vy', status: 'PENDING', invitedAt: 3 }),
  row({ kolId: 'KOL-2026-0020', displayName: 'Đức Anh', status: 'DECLINED', respondedAt: 1 }),
  row({ kolId: 'KOL-2026-0021', displayName: 'Gia Huy', status: 'ENDED', endedAt: 7 }),
];

const q = (over: Partial<McnKolQuery> = {}): McnKolQuery => ({ tab: 'ACTIVE', sort: 'newest', ...over });

test('parse / merge URL: mặc định Đang quản lý + Mới nhất, giá trị lạ bị bỏ', () => {
  expect(parseMcnKolParams(new URLSearchParams(''), CATS)).toEqual({ tab: 'ACTIVE', sort: 'newest' });
  expect(parseMcnKolParams(new URLSearchParams('tab=da-ket-thuc&q=%20vy%20&linh-vuc=Lifestyle&sap-xep=name'), CATS)).toEqual({
    tab: 'CLOSED',
    keyword: 'vy',
    category: 'Lifestyle',
    sort: 'name',
  });
  expect(parseMcnKolParams(new URLSearchParams('tab=abc&linh-vuc=Khác&sap-xep=zzz'), CATS)).toEqual({ tab: 'ACTIVE', sort: 'newest' });
  const merged = mergeMcnKolParams(new URLSearchParams('khac=1&q=cu'), q({ tab: 'PENDING', sort: 'followers' }));
  expect(merged.toString()).toBe('khac=1&tab=cho-xac-nhan&sap-xep=followers');
});

test('lọc theo tab: Đã kết thúc gồm cả Đã từ chối', () => {
  expect(applyMcnKolQuery(rows, q({ tab: 'CLOSED' })).map((r) => r.kolId)).toEqual(['KOL-2026-0021', 'KOL-2026-0020']);
  expect(applyMcnKolQuery(rows, q({ tab: 'PENDING' })).map((r) => r.kolId)).toEqual(['KOL-2026-0001']);
});

test('tìm theo tên không dấu hoặc KOL ID; đếm tab theo bộ lọc', () => {
  expect(applyMcnKolQuery(rows, q({ keyword: 'bao ngoc' })).map((r) => r.kolId)).toEqual(['KOL-2026-0012']);
  expect(applyMcnKolQuery(rows, q({ keyword: '0011' })).map((r) => r.kolId)).toEqual(['KOL-2026-0011']);
  expect(countMcnKolTabs(rows, q())).toEqual({ ACTIVE: 2, PENDING: 1, CLOSED: 2 });
  expect(countMcnKolTabs(rows, q({ category: 'Làm đẹp' }))).toEqual({ ACTIVE: 1, PENDING: 0, CLOSED: 0 });
});

test('sắp xếp: mới nhất, nhiều follower, tên', () => {
  expect(applyMcnKolQuery(rows, q()).map((r) => r.kolId)).toEqual(['KOL-2026-0012', 'KOL-2026-0011']);
  expect(applyMcnKolQuery(rows, q({ sort: 'followers' }))[0].kolId).toBe('KOL-2026-0012');
  expect(applyMcnKolQuery(rows, q({ sort: 'name' }))[0].displayName).toBe('An Nhiên Review');
});

test('link kênh được gán', () => expect(assignedChannelsPath('KOL-2026-0011')).toBe('/ho-so-mcn/kenh?kol=KOL-2026-0011'));
