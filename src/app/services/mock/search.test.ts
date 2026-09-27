import { describe, expect, test } from 'vitest';
import type { KolSearchResult } from '../bizTypes';
import { createSearchService } from './search';
import { bizState, NOW } from './testing/bizFixtures';

const svc = createSearchService({ db: bizState(), now: () => NOW, delay: false });
const ids = (r: KolSearchResult) => r.items.map((i) => i.kolId);

describe('search', () => {
  test('BR-54: chỉ KOL có kênh VERIFIED còn hạn và ACTIVE; tổng 29', async () => {
    const r = await svc.search({});
    expect(r.total).toBe(29);
    expect(ids(r)).not.toEqual(expect.arrayContaining(['KOL-T-0004']));
    for (const id of ['KOL-T-0004', 'KOL-T-0005', 'KOL-T-0007']) expect((await svc.search({ keyword: id })).total).toBe(0);
  });

  test('20/trang: trang 1 có 20, trang 2 có 9', async () => {
    const p1 = await svc.search({ page: 1 });
    expect(p1).toMatchObject({ pageSize: 20, pageCount: 2, page: 1 });
    expect(p1.items).toHaveLength(20);
    expect((await svc.search({ page: 2 })).items).toHaveLength(9);
  });

  test.each([
    [9, 2],
    [0, 1],
    [-3, 1],
    [NaN, 1],
    [1.5, 1],
  ])('page %s kẹp về %s', async (p, want) => expect((await svc.search({ page: p })).page).toBe(want));

  test('không có kết quả → page 1, pageCount 1, items rỗng', async () =>
    expect(await svc.search({ keyword: 'zzz', page: 3 })).toMatchObject({ total: 0, page: 1, pageCount: 1, items: [] }));

  test('từ khoá không dấu, hoa thường, thừa khoảng trắng', async () =>
    expect(ids(await svc.search({ keyword: '  CHAU   bui ' }))[0]).toBe('KOL-T-0001'));

  test('từ khoá chỉ có khoảng trắng = không lọc', async () => expect((await svc.search({ keyword: '   ' })).total).toBe(29));

  test('liên quan: tên bắt đầu bằng từ khoá xếp trước tên chứa từ khoá', async () =>
    expect(ids(await svc.search({ keyword: 'chau' }))).toEqual(['KOL-T-0001', 'KOL-T-0003']));

  test('KOL ID khớp chính xác', async () =>
    expect(ids(await svc.search({ keyword: 'kol-t-0002' }))).toEqual(['KOL-T-0002']));

  test('dán nguyên link kênh có https, www, query, / cuối', async () =>
    expect(ids(await svc.search({ keyword: 'https://www.tiktok.com/@chaubui/?lang=vi' }))).toEqual(['KOL-T-0001']));

  test('link của kênh INACTIVE không tìm ra KOL', async () =>
    expect((await svc.search({ keyword: 'tiktok.com/@kenhtron' })).total).toBe(0));

  test('lọc lĩnh vực / khu vực', async () => {
    expect(ids(await svc.search({ category: 'Du lịch' }))).toEqual(['KOL-T-0002']);
    expect(ids(await svc.search({ region: 'Hà Nội' }))).toEqual(['KOL-T-0003']);
  });

  test('lọc quy mô theo tổng người theo dõi của kênh tìm được', async () => {
    expect(ids(await svc.search({ scale: 'mega' }))).toEqual(['KOL-T-0001', 'KOL-T-0002']);
    expect((await svc.search({ scale: 'micro' })).total).toBe(27); // C, F(20 000), 25 filler
  });

  test('chip nền tảng: OR giữa các chip, chỉ tính kênh tìm được', async () => {
    expect(ids(await svc.search({ platforms: ['tiktok'] }))).toEqual(['KOL-T-0001']);
    expect((await svc.search({ platforms: ['tiktok', 'youtube'] })).total).toBe(27); // A, B, 25 filler
  });

  test('sắp xếp: followers → A trước; newest → B trước; relevance không từ khoá = followers', async () => {
    expect(ids(await svc.search({ sort: 'followers' })).slice(0, 2)).toEqual(['KOL-T-0001', 'KOL-T-0002']);
    expect(ids(await svc.search({ sort: 'newest' }))[0]).toBe('KOL-T-0002');
    expect(ids(await svc.search({}))).toEqual(ids(await svc.search({ sort: 'followers' })));
  });

  test('kết quả chỉ có trường công khai; platforms bỏ kênh không tìm được', async () => {
    const f = (await svc.search({ keyword: 'kenh tron' })).items[0];
    expect(Object.keys(f).sort()).toEqual([
      'category',
      'displayName',
      'kolId',
      'nickname',
      'platforms',
      'region',
      'scale',
      'totalFollowers',
      'verifiedAt',
    ]);
    expect(f).not.toHaveProperty('private');
    expect(f.platforms).toEqual(['facebook']);
    expect(f.totalFollowers).toBe(20_000);
  });

  test.each(['kol', null] as const)('BR-53: phiên %s → 4016', async (session) => {
    const s = createSearchService({ db: bizState({ session }), now: () => NOW, delay: false });
    await expect(s.search({})).rejects.toMatchObject({ code: 'KOLHUB-4016' });
  });
});
