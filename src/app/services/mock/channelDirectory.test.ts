import { describe, expect, test } from 'vitest';
import type { ChannelDirectoryResult } from '../channel-directory-types';
import { createChannelDirectoryService } from './channelDirectory';
import { createDb } from './db';
import { createSearchService } from './search';
import { seedState } from './seed';
import { bizState, NOW, switchSession } from './testing/bizFixtures';
import { KolhubError } from '../types';

const db = bizState();
const svc = createChannelDirectoryService({ db, now: () => NOW, delay: false });
const urls = (r: ChannelDirectoryResult) => r.items.map((i) => i.url);

async function all(q = {}) {
  const first = await svc.list(q);
  const items = [...first.items];
  for (let p = 2; p <= first.pageCount; p++) items.push(...(await svc.list({ ...q, page: p })).items);
  return items;
}

describe('channelDirectory (fixture)', () => {
  test('BR-54: mỗi kênh tìm được là một dòng; khớp tổng số kênh của kết quả tìm KOL', async () => {
    const search = createSearchService({ db, now: () => NOW, delay: false });
    const s1 = await search.search({});
    let kolChannels = 0;
    for (let p = 1; p <= s1.pageCount; p++) for (const k of (await search.search({ page: p })).items) kolChannels += k.channels.length;
    const rows = await all();
    expect(rows).toHaveLength(kolChannels);
    expect(new Set(rows.map((r) => r.channelId)).size).toBe(rows.length);
    const u = rows.map((r) => r.url);
    expect(u).toEqual(expect.arrayContaining(['tiktok.com/@chaubui', 'facebook.com/chaubui', 'facebook.com/kenhtron']));
    // expired by date, inactive, pending channels never show
    for (const bad of ['tiktok.com/@hethan', 'youtube.com/@tathd', 'tiktok.com/@kenhtron']) expect(u).not.toContain(bad);
  });

  test('chỉ Nhãn hàng: khách / KOL → 4016', async () => {
    const d = bizState({ session: null });
    const s = createChannelDirectoryService({ db: d, now: () => NOW, delay: false });
    await expect(s.list()).rejects.toMatchObject({ code: 'KOLHUB-4016' });
    switchSession(d, 'kol');
    await expect(s.list()).rejects.toBeInstanceOf(KolhubError);
  });

  test('BR-58: chỉ trường công khai (không SĐT, địa chỉ, Zalo, CCCD, vi phạm)', async () => {
    const r = await svc.list({ keyword: 'chaubui' });
    const json = JSON.stringify(r);
    for (const secret of ['0909000001', 'Bí Mật', '0010******01', 'phone', 'zalo', 'address', 'idNo', 'violation', 'ownerId', 'staff']) {
      expect(json).not.toContain(secret);
    }
    expect(Object.keys(r.items[0]).sort()).toEqual(
      expect.arrayContaining(['channelId', 'platform', 'handle', 'url', 'followers', 'badgeExpiresAt', 'kolId', 'displayName', 'fields']),
    );
  });

  test('từ khoá: @handle, link có https/www/query, tên KOL không dấu, KOL ID', async () => {
    expect(urls(await svc.list({ keyword: '@chaubui' })).sort()).toEqual(['facebook.com/chaubui', 'tiktok.com/@chaubui']);
    expect(urls(await svc.list({ keyword: 'https://www.tiktok.com/@chaubui/?lang=vi' }))).toEqual(['tiktok.com/@chaubui']);
    expect(urls(await svc.list({ keyword: '  CHAU bui ' })).length).toBe(2);
    expect(urls(await svc.list({ keyword: 'kol-t-0002' }))).toEqual(['youtube.com/@chanlaca']);
    expect((await svc.list({ keyword: 'zzz', page: 4 })).total).toBe(0);
  });

  test('lọc nền tảng (nhiều), lĩnh vực, khu vực, quy mô theo người theo dõi của kênh', async () => {
    const yt = await all({ platforms: ['youtube'] });
    expect(yt.every((r) => r.platform === 'youtube')).toBe(true);
    const ytfb = await all({ platforms: ['youtube', 'facebook'] });
    expect(ytfb.every((r) => r.platform !== 'tiktok')).toBe(true);
    expect(ytfb.length).toBeGreaterThan(yt.length);
    expect(urls(await svc.list({ category: 'Du lịch' }))).toEqual(['youtube.com/@chanlaca']);
    expect((await all({ region: 'Hà Nội' })).every((r) => r.region === 'Hà Nội')).toBe(true);
    // Châu Bùi: TikTok 3.2M is mega, Facebook 1M is mega, so both; 50K Bếp Nhà Chau is micro
    expect(urls(await svc.list({ scale: 'micro', keyword: 'bepnhachau' }))).toEqual(['facebook.com/bepnhachau']);
    expect((await all({ scale: 'mega' })).every((r) => r.followers >= 1_000_000)).toBe(true);
  });

  test('sắp xếp: người theo dõi (mặc định), mới xác thực, sắp hết hạn dấu', async () => {
    const f = await all();
    for (let i = 1; i < f.length; i++) expect(f[i - 1].followers).toBeGreaterThanOrEqual(f[i].followers);
    expect(f[0].url).toBe('tiktok.com/@chaubui');
    const n = await all({ sort: 'newest' });
    for (let i = 1; i < n.length; i++) expect(Date.parse(n[i - 1].verifiedAt)).toBeGreaterThanOrEqual(Date.parse(n[i].verifiedAt));
    const e = await all({ sort: 'expiring' });
    for (let i = 1; i < e.length; i++) expect(Date.parse(e[i - 1].badgeExpiresAt)).toBeLessThanOrEqual(Date.parse(e[i].badgeExpiresAt));
  });

  test('20/trang, kẹp trang', async () => {
    const p1 = await svc.list();
    expect(p1.pageSize).toBe(20);
    expect(p1.items.length).toBe(Math.min(20, p1.total));
    expect((await svc.list({ page: 999 })).page).toBe(p1.pageCount);
    expect((await svc.list({ page: -1 })).page).toBe(1);
  });
});

describe('channelDirectory (seed)', () => {
  test('Khánh Vy có đủ kênh đã xác thực; kênh MCN và kênh hết hạn/tắt không hiện', async () => {
    const d = createDb(null, seedState);
    d.update((s) => {
      s.sessionAccountId = 'acc-biz-demo';
    });
    const s = createChannelDirectoryService({ db: d, now: Date.now, delay: false });
    const r = await s.list({ keyword: 'KOL-2026-0001' });
    expect(r.total).toBeGreaterThanOrEqual(3);
    expect(r.items.every((i) => i.displayName === 'Khánh Vy' && i.badgeExpiresAt)).toBe(true);
    expect(r.items.some((i) => i.latestVideo?.thumbnail)).toBe(true);
    expect((await s.list({ keyword: 'minhthu.bepnha' })).total).toBe(0);
    expect((await s.list({ keyword: 'KOL-2026-0038' })).total).toBe(0);
    // KOL-2026-0002's Facebook is EXPIRED, 0003's TikTok is inactive
    expect((await s.list({ keyword: 'KOL-2026-0002' })).items.some((i) => i.platform === 'facebook')).toBe(false);
    expect((await s.list({ keyword: 'KOL-2026-0003' })).items.some((i) => i.platform === 'tiktok')).toBe(false);
  });
});
