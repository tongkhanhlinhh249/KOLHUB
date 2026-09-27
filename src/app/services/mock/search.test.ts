import { describe, expect, test } from 'vitest';
import type { KolSearchResult } from '../bizTypes';
import { createSearchService } from './search';
import { createDb } from './db';
import { seedState } from './seed';
import { bizState, fixtureDirectory, makeVideo, NOW } from './testing/bizFixtures';

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
      'bio',
      'category',
      'channels',
      'displayName',
      'fields',
      'kolId',
      'latestVideos',
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
    expect(f.channels).toEqual([{ platform: 'facebook', followers: 20_000, badge: 'VERIFIED' }]);
    // Video on the inactive TikTok channel is dropped.
    expect(f.latestVideos.map((v) => v.platform)).toEqual(['facebook']);
  });

  test('lĩnh vực hoạt động: 1–3 mục, mục đầu = category, medal hợp lệ', async () => {
    const r = await svc.search({});
    for (const it of r.items) {
      expect(it.fields.length).toBeGreaterThanOrEqual(1);
      expect(it.fields.length).toBeLessThanOrEqual(3);
      expect(it.fields[0].name).toBe(it.category);
      for (const f of it.fields) expect(['gold', 'silver', 'none']).toContain(f.medal);
    }
    const a = r.items.find((i) => i.kolId === 'KOL-T-0001')!;
    expect(a.fields).toEqual([
      { name: 'Thời trang', medal: 'gold' },
      { name: 'Làm đẹp', medal: 'silver' },
      { name: 'Lifestyle', medal: 'none' },
    ]);
  });

  test('BR-20: video mới nhất tối đa 2, chỉ nền tảng tìm được, không Instagram', async () => {
    const r = await svc.search({});
    for (const it of r.items) {
      expect(it.latestVideos.length).toBeLessThanOrEqual(2);
      for (const v of it.latestVideos) expect(it.platforms).toContain(v.platform);
    }
    const a = r.items.find((i) => i.kolId === 'KOL-T-0001')!;
    expect(a.latestVideos.map((v) => v.title)).toEqual(['Video 2', 'Video 4']);
    expect(Object.keys(a.latestVideos[0]).sort()).toEqual(['platform', 'publishedAt', 'thumbnail', 'title', 'url']);
    expect(JSON.stringify(r.items)).not.toMatch(/instagram/i);
    expect(r.items.find((i) => i.kolId === 'KOL-T-0002')!.latestVideos).toEqual([]);
  });

  test('BR-58: kết quả có bio + kênh theo nền tảng, không lộ dữ liệu private', async () => {
    const a = (await svc.search({ keyword: 'KOL-T-0001' })).items[0];
    expect(a.bio).toBe('Giới thiệu');
    expect(a.channels).toEqual([
      { platform: 'tiktok', followers: 3_200_000, badge: 'VERIFIED' },
      { platform: 'facebook', followers: 1_000_000, badge: 'VERIFIED' },
    ]);
    for (const c of a.channels) expect(Object.keys(c).sort()).toEqual(['badge', 'followers', 'platform']);
    expect(a.channels.reduce((s, c) => s + c.followers, 0)).toBe(a.totalFollowers);
    const json = JSON.stringify((await svc.search({})).items);
    for (const v of ['0909000001', 'Đường Bí Mật', '0010******01', '99,000,000', 'private', 'violations', 'bookingPrice'])
      expect(json).not.toContain(v);
  });

  test.each(['kol', null] as const)('BR-53: phiên %s → 4016', async (session) => {
    const s = createSearchService({ db: bizState({ session }), now: () => NOW, delay: false });
    await expect(s.search({})).rejects.toMatchObject({ code: 'KOLHUB-4016' });
  });
});

describe('getKolPublicProfile', () => {
  test('BR-58: chỉ có trường công khai, không lộ dữ liệu private', async () => {
    const p = await svc.getKolPublicProfile('KOL-T-0001');
    expect(Object.keys(p).sort()).toEqual([
      'bio',
      'category',
      'channels',
      'collabEmail',
      'displayName',
      'fields',
      'kolId',
      'latestVideos',
      'listingStatus',
      'nickname',
      'region',
      'scale',
      'totalFollowers',
      'verifiedAt',
    ]);
    const json = JSON.stringify(p);
    for (const v of ['0909000001', 'Đường Bí Mật', '0010******01', '99,000,000']) expect(json).not.toContain(v);
    for (const c of p.channels) {
      expect(Object.keys(c).sort()).toEqual([
        'badge',
        'badgeExpiresAt',
        'followers',
        'handle',
        'latestVideos',
        'platform',
        'url',
        'videoCount',
        'views',
      ]);
      for (const v of c.latestVideos) expect(Object.keys(v).sort()).toEqual(['platform', 'publishedAt', 'thumbnail', 'title', 'url']);
    }
    expect(p).toMatchObject({ totalFollowers: 4_200_000, scale: 'mega', listingStatus: 'VISIBLE' });
    for (const v of p.latestVideos) expect(Object.keys(v).sort()).toEqual(['platform', 'publishedAt', 'thumbnail', 'title', 'url']);
  });

  test('hồ sơ: lĩnh vực có huy chương; video tối đa 6, chỉ kênh công khai, không Instagram (BR-20)', async () => {
    const p = await svc.getKolPublicProfile('KOL-T-0001');
    expect(p.fields.map((f) => f.medal)).toEqual(['gold', 'silver', 'none']);
    expect(p.latestVideos.map((v) => [v.platform, v.title])).toEqual([
      ['tiktok', 'Video 2'],
      ['facebook', 'Video 4'],
      ['tiktok', 'Video 5'],
    ]);
    expect(JSON.stringify(p)).not.toMatch(/instagram/i);
    expect((await svc.getKolPublicProfile('KOL-T-0006')).latestVideos.map((v) => v.platform)).toEqual(['facebook']);
    expect((await svc.getKolPublicProfile('KOL-T-0002')).fields).toEqual([{ name: 'Du lịch', medal: 'none' }]);
  });

  test('kênh: video mới nhất theo từng kênh, lượt xem + số video xác định theo URL', async () => {
    const p = await svc.getKolPublicProfile('KOL-T-0001');
    const byPlatform = Object.fromEntries(p.channels.map((c) => [c.platform, c]));
    expect(byPlatform.tiktok.latestVideos.map((v) => v.title)).toEqual(['Video 2', 'Video 5']);
    expect(byPlatform.facebook.latestVideos.map((v) => v.title)).toEqual(['Video 4']);
    for (const c of p.channels) {
      expect(c.latestVideos.every((v) => v.platform === c.platform)).toBe(true);
      expect(c.views).toBeGreaterThanOrEqual(c.followers);
      expect(c.videoCount).toBeGreaterThan(0);
    }
    const again = await svc.getKolPublicProfile('KOL-T-0001');
    expect(again.channels.map((c) => [c.views, c.videoCount])).toEqual(p.channels.map((c) => [c.views, c.videoCount]));
    expect((await svc.getKolPublicProfile('KOL-T-0002')).channels[0].latestVideos).toEqual([]);
  });

  test('hồ sơ: tối đa 6 video, tối đa 3 lĩnh vực dù dữ liệu gốc nhiều hơn', async () => {
    const many = fixtureDirectory();
    const k = many.find((x) => x.kolId === 'KOL-T-0002')!;
    k.latestVideos = Array.from({ length: 9 }, (_, n) => makeVideo('youtube', n + 1));
    k.fields = ['A', 'B', 'C', 'D'].map((name) => ({ name, medal: 'none' as const }));
    const s = createSearchService({ db: bizState({ kols: many }), now: () => NOW, delay: false });
    const p = await s.getKolPublicProfile('KOL-T-0002');
    expect(p.latestVideos).toHaveLength(6);
    expect(p.fields).toHaveLength(3);
    expect((await s.search({ keyword: 'KOL-T-0002' })).items[0].latestVideos).toHaveLength(2);
  });

  test('kênh: bỏ kênh INACTIVE và kênh chưa từng có dấu; kênh hết hạn theo ngày hiện EXPIRED', async () => {
    expect((await svc.getKolPublicProfile('KOL-T-0006')).channels.map((c) => c.platform)).toEqual(['facebook']);
    expect((await svc.getKolPublicProfile('KOL-T-0004')).channels).toMatchObject([{ platform: 'tiktok', badge: 'EXPIRED' }]);
  });

  test('KOL mất dấu / ngừng hoạt động vẫn mở được hồ sơ, kèm listingStatus', async () => {
    expect((await svc.getKolPublicProfile('KOL-T-0004')).listingStatus).toBe('BADGE_EXPIRED');
    expect((await svc.getKolPublicProfile('KOL-T-0005')).listingStatus).toBe('INACTIVE');
  });

  test.each(['KOL-T-9999', 'KOL-T-0007'])('%s (không tồn tại / chưa từng có dấu) → 4404', async (id) =>
    await expect(svc.getKolPublicProfile(id)).rejects.toMatchObject({ code: 'KOLHUB-4404' }));

  test('phiên KOL → 4016', async () => {
    const s = createSearchService({ db: bizState({ session: 'kol' }), now: () => NOW, delay: false });
    await expect(s.getKolPublicProfile('KOL-T-0001')).rejects.toMatchObject({ code: 'KOLHUB-4016' });
  });
});

describe('dữ liệu mẫu v2 (KOL đăng ký thật)', () => {
  test('35 KOL mẫu tìm được; Khánh Vy có bio, lĩnh vực, video; hồ sơ KOL mất dấu vẫn mở được', async () => {
    const db = createDb(null, seedState);
    db.update((s) => {
      s.sessionAccountId = 'acc-biz-demo';
    });
    const s = createSearchService({ db, now: Date.now, delay: false });
    expect((await s.search({})).total).toBe(35);
    const vy = (await s.search({ keyword: 'khanh vy' })).items[0];
    expect(vy).toMatchObject({ kolId: 'KOL-2026-0001', displayName: 'Khánh Vy', category: 'Giáo dục' });
    expect(vy.bio).toContain('MC VTV');
    expect(vy.fields.map((f) => f.name)).toEqual(['Giáo dục', 'MC', 'Tiếng Anh']);
    expect(vy.latestVideos).toHaveLength(2);
    expect((await s.getKolPublicProfile('KOL-2026-0038')).listingStatus).toBe('BADGE_EXPIRED');
    const json = JSON.stringify(await s.getKolPublicProfile('KOL-2026-0001'));
    for (const v of ['0909000001', 'Đường Demo', '*******', 'khanhvy@demo.kolhub.vn']) expect(json).not.toContain(v);
  });
});
