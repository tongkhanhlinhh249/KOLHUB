import { describe, expect, test } from 'vitest';
import {
  activeFilterCount,
  applyQueryPatch,
  hasActiveFilters,
  parseSearchParams,
  SEARCH_KEYS,
  toSearchParams,
  toServiceQuery,
} from './searchParams';

test('parse đủ khoá', () =>
  expect(
    parseSearchParams(new URLSearchParams('q=chau&linhVuc=Du%20l%E1%BB%8Bch&nenTang=tiktok,youtube&sapXep=newest&trang=2')),
  ).toEqual({ keyword: 'chau', category: 'Du lịch', platforms: ['tiktok', 'youtube'], sort: 'newest', page: 2, view: 'grid' }));

test('giá trị lạ bị bỏ', () =>
  expect(parseSearchParams(new URLSearchParams('nenTang=instagram,tiktok&quyMo=huge&trang=abc&sapXep=x&khuVuc=Paris'))).toEqual({
    platforms: ['tiktok'],
    sort: 'relevance',
    page: 1,
    view: 'grid',
  }));

test('trang 0 / âm / thập phân → 1', () => {
  for (const t of ['0', '-2', '1.5']) expect(parseSearchParams(new URLSearchParams(`trang=${t}`)).page).toBe(1);
});

test('toSearchParams bỏ giá trị mặc định; round-trip', () => {
  expect(toSearchParams({ sort: 'relevance', page: 1, platforms: [] }).toString()).toBe('');
  const q = { keyword: 'chau', region: 'Hà Nội', scale: 'micro', platforms: ['facebook'], sort: 'followers', page: 3, view: 'grid' } as const;
  expect(parseSearchParams(toSearchParams(q))).toEqual(q);
});

test('đổi bộ lọc → về trang 1; đổi trang giữ trang', () => {
  expect(applyQueryPatch({ page: 3, sort: 'relevance' }, { region: 'Hà Nội' }).page).toBe(1);
  expect(applyQueryPatch({ page: 3, sort: 'relevance' }, { sort: 'newest' }).page).toBe(1);
  expect(applyQueryPatch({ page: 1, sort: 'relevance' }, { page: 2 }).page).toBe(2);
});

test('hasActiveFilters: sắp xếp không tính', () => {
  expect(hasActiveFilters({ sort: 'newest', page: 2 })).toBe(false);
  expect(hasActiveFilters({ keyword: '  ' })).toBe(false);
  expect(hasActiveFilters({ keyword: 'a' })).toBe(true);
  expect(hasActiveFilters({ platforms: ['tiktok'] })).toBe(true);
  expect(activeFilterCount({ keyword: 'a', region: 'Hà Nội', platforms: ['tiktok', 'youtube'] })).toBe(2);
});

describe('view (Lưới / Danh sách)', () => {
  test('SEARCH_KEYS có view', () => expect(SEARCH_KEYS).toContain('view'));

  test('mặc định / giá trị lạ → grid', () => {
    expect(parseSearchParams(new URLSearchParams('')).view).toBe('grid');
    for (const v of ['table', 'LIST', '', 'grid']) expect(parseSearchParams(new URLSearchParams(`view=${v}`)).view).toBe('grid');
  });

  test('view=list được đọc và ghi lại; grid bỏ khỏi URL', () => {
    expect(parseSearchParams(new URLSearchParams('view=list')).view).toBe('list');
    expect(toSearchParams({ view: 'list' }).toString()).toBe('view=list');
    expect(toSearchParams({ view: 'grid', page: 1 }).toString()).toBe('');
    const q = { keyword: 'chau', platforms: ['tiktok'], sort: 'newest', page: 2, view: 'list' } as const;
    expect(parseSearchParams(toSearchParams(q))).toEqual(q);
  });

  test('đổi view giữ trang và bộ lọc', () => {
    const q = { keyword: 'chau', region: 'Hà Nội', sort: 'followers', page: 3, view: 'grid' } as const;
    expect(applyQueryPatch(q, { view: 'list' })).toEqual({ ...q, view: 'list' });
    expect(toSearchParams(applyQueryPatch(q, { view: 'list' })).get('trang')).toBe('3');
  });

  test('đổi bộ lọc giữ view, về trang 1', () =>
    expect(applyQueryPatch({ page: 3, view: 'list' }, { region: 'Hà Nội' })).toMatchObject({ page: 1, view: 'list' }));

  test('toServiceQuery bỏ view', () =>
    expect(toServiceQuery({ keyword: 'a', page: 2, view: 'list' })).toEqual({ keyword: 'a', page: 2 }));
});
