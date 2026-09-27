import { expect, test } from 'vitest';
import { activeFilterCount, applyQueryPatch, hasActiveFilters, parseSearchParams, toSearchParams } from './searchParams';

test('parse đủ khoá', () =>
  expect(
    parseSearchParams(new URLSearchParams('q=chau&linhVuc=Du%20l%E1%BB%8Bch&nenTang=tiktok,youtube&sapXep=newest&trang=2')),
  ).toEqual({ keyword: 'chau', category: 'Du lịch', platforms: ['tiktok', 'youtube'], sort: 'newest', page: 2 }));

test('giá trị lạ bị bỏ', () =>
  expect(parseSearchParams(new URLSearchParams('nenTang=instagram,tiktok&quyMo=huge&trang=abc&sapXep=x&khuVuc=Paris'))).toEqual({
    platforms: ['tiktok'],
    sort: 'relevance',
    page: 1,
  }));

test('trang 0 / âm / thập phân → 1', () => {
  for (const t of ['0', '-2', '1.5']) expect(parseSearchParams(new URLSearchParams(`trang=${t}`)).page).toBe(1);
});

test('toSearchParams bỏ giá trị mặc định; round-trip', () => {
  expect(toSearchParams({ sort: 'relevance', page: 1, platforms: [] }).toString()).toBe('');
  const q = { keyword: 'chau', region: 'Hà Nội', scale: 'micro', platforms: ['facebook'], sort: 'followers', page: 3 } as const;
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
