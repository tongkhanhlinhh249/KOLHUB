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
  ).toEqual({ keyword: 'chau', category: 'Du lịch', platforms: ['tiktok', 'youtube'], sort: 'newest', page: 2, view: 'list' }));

test('giá trị lạ bị bỏ', () =>
  expect(parseSearchParams(new URLSearchParams('nenTang=twitter,tiktok&quyMo=huge&trang=abc&sapXep=x&khuVuc=Paris'))).toEqual({
    platforms: ['tiktok'],
    sort: 'relevance',
    page: 1,
    view: 'list',
  }));

test('trang 0 / âm / thập phân → 1', () => {
  for (const t of ['0', '-2', '1.5']) expect(parseSearchParams(new URLSearchParams(`trang=${t}`)).page).toBe(1);
});

test('toSearchParams bỏ giá trị mặc định; round-trip', () => {
  expect(toSearchParams({ sort: 'relevance', page: 1, platforms: [] }).toString()).toBe('');
  const q = { keyword: 'chau', region: 'Hà Nội', scale: 'micro', platforms: ['facebook'], sort: 'followers', page: 3, view: 'list' } as const;
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

describe('view (Danh sách / Lưới)', () => {
  test('SEARCH_KEYS có view', () => expect(SEARCH_KEYS).toContain('view'));

  test('mặc định / giá trị lạ → list', () => {
    expect(parseSearchParams(new URLSearchParams('')).view).toBe('list');
    for (const v of ['table', 'GRID', '', 'list']) expect(parseSearchParams(new URLSearchParams(`view=${v}`)).view).toBe('list');
  });

  test('view=grid được đọc và ghi lại; list (mặc định) bỏ khỏi URL', () => {
    expect(parseSearchParams(new URLSearchParams('view=grid')).view).toBe('grid');
    expect(toSearchParams({ view: 'grid' }).toString()).toBe('view=grid');
    expect(toSearchParams({ view: 'list', page: 1 }).toString()).toBe('');
    const q = { keyword: 'chau', platforms: ['tiktok'], sort: 'newest', page: 2, view: 'grid' } as const;
    expect(parseSearchParams(toSearchParams(q))).toEqual(q);
  });

  test('link cũ ?view=list vẫn mở dạng danh sách', () => {
    expect(parseSearchParams(new URLSearchParams('view=list&trang=2'))).toMatchObject({ view: 'list', page: 2 });
    expect(toSearchParams(parseSearchParams(new URLSearchParams('view=list'))).toString()).toBe('');
  });

  test('đổi view giữ trang và bộ lọc', () => {
    const q = { keyword: 'chau', region: 'Hà Nội', sort: 'followers', page: 3, view: 'list' } as const;
    expect(applyQueryPatch(q, { view: 'grid' })).toEqual({ ...q, view: 'grid' });
    expect(toSearchParams(applyQueryPatch(q, { view: 'grid' })).get('trang')).toBe('3');
  });

  test('đổi bộ lọc giữ view, về trang 1', () =>
    expect(applyQueryPatch({ page: 3, view: 'grid' }, { region: 'Hà Nội' })).toMatchObject({ page: 1, view: 'grid' }));

  test('toServiceQuery bỏ view', () =>
    expect(toServiceQuery({ keyword: 'a', page: 2, view: 'grid' })).toEqual({ keyword: 'a', page: 2 }));
});
