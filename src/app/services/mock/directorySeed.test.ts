import { expect, test } from 'vitest';
import { KOL_CATEGORIES, KOL_REGIONS } from '../bizTypes';
import { listingStatus, searchableChannels } from './directory';
import { parseFollowers, seedDirectory, seedSavedLists } from './directorySeed';
import { seedState } from './seed';

const NOW = Date.UTC(2026, 8, 27, 3);
const dir = seedDirectory(NOW);
const byId = (id: string) => dir.find((k) => k.kolId === id)!;

test('40 KOL, KOL ID duy nhất KOL-2026-0001..0040', () => {
  expect(dir).toHaveLength(40);
  expect(new Set(dir.map((k) => k.kolId)).size).toBe(40);
  expect(dir[0].kolId).toBe('KOL-2026-0001');
  expect(dir[39].kolId).toBe('KOL-2026-0040');
});

test('35 KOL tìm được; 0036–0037 INACTIVE; 0038–0040 BADGE_EXPIRED', () => {
  expect(dir.filter((k) => listingStatus(k, NOW) === 'VISIBLE')).toHaveLength(35);
  expect(['KOL-2026-0036', 'KOL-2026-0037'].map((id) => listingStatus(byId(id), NOW))).toEqual(['INACTIVE', 'INACTIVE']);
  expect(['KOL-2026-0038', 'KOL-2026-0039', 'KOL-2026-0040'].map((id) => listingStatus(byId(id), NOW))).toEqual([
    'BADGE_EXPIRED',
    'BADGE_EXPIRED',
    'BADGE_EXPIRED',
  ]);
});

test('0040 hết hạn theo ngày dù status vẫn VERIFIED', () =>
  expect(byId('KOL-2026-0040').channels.every((c) => c.status === 'VERIFIED')).toBe(true));

test('0002 kênh Facebook EXPIRED; 0003 kênh TikTok ngừng hoạt động', () => {
  expect(byId('KOL-2026-0002').channels.find((c) => c.platform === 'facebook')?.status).toBe('EXPIRED');
  expect(byId('KOL-2026-0003').channels.find((c) => c.platform === 'tiktok')?.active).toBe(false);
});

test('ngày xác thực của 35 KOL tìm được khác nhau', () =>
  expect(new Set(dir.slice(0, 35).map((k) => k.verifiedAt)).size).toBe(35));

test('không có Instagram; mọi KOL có email hợp tác, lĩnh vực, khu vực, dữ liệu private', () => {
  expect(dir.every((k) => k.channels.every((c) => ['facebook', 'youtube', 'tiktok'].includes(c.platform)))).toBe(true);
  expect(dir.every((k) => k.channels.length > 0)).toBe(true);
  expect(dir.every((k) => !!k.collabEmail && k.collabEmail.endsWith('@kolhub-demo.vn'))).toBe(true);
  expect(dir.every((k) => (KOL_CATEGORIES as readonly string[]).includes(k.category!))).toBe(true);
  expect(dir.every((k) => (KOL_REGIONS as readonly string[]).includes(k.region!))).toBe(true);
  expect(dir.every((k) => !!k.private?.phone)).toBe(true);
});

test('KOL-2026-0001 là Khánh Vy lấy từ creators.ts, followers YouTube = 1 200 000', () => {
  const k = byId('KOL-2026-0001');
  expect(k.displayName).toBe('Khánh Vy');
  expect(k.channels.find((c) => c.platform === 'youtube')?.followers).toBe(1_200_000);
  expect(k.private?.bookingPrice).toBe('120,000,000 VNĐ');
});

test('KOL tự tạo: nickname không dấu, bio, không avatar', () => {
  const k = byId('KOL-2026-0011');
  expect(k).toMatchObject({ displayName: 'An Nhiên Review', nickname: 'annhienreview', bio: 'Lifestyle · Hà Nội' });
  expect(k.avatar).toBeUndefined();
  expect(k.channels).toMatchObject([{ platform: 'tiktok', url: 'tiktok.com/@annhienreview', followers: 4_500 }]);
});

test('parseFollowers', () => {
  expect(parseFollowers('1.2M')).toBe(1_200_000);
  expect(parseFollowers('890K')).toBe(890_000);
});

test('seedSavedLists: 2 danh sách của brand@vinamilk-demo.vn', () => {
  const lists = seedSavedLists(seedState().accounts, NOW);
  expect(lists.map((l) => [l.name, l.items.map((i) => i.kolId)])).toEqual([
    ['Chiến dịch Tết 2027', ['KOL-2026-0001', 'KOL-2026-0005', 'KOL-2026-0038']],
    ['KOL ẩm thực', ['KOL-2026-0005', 'KOL-2026-0036']],
  ]);
  expect(lists.every((l) => l.accountId === 'acc-biz-demo')).toBe(true);
  expect(lists[0].items[0].note).toBe('Ưu tiên liên hệ tháng 11');
});

test('lĩnh vực hoạt động: 1–3 mục, mục đầu = category, medal gold/silver/none, không trùng', () => {
  for (const k of dir) {
    expect(k.fields.length).toBeGreaterThanOrEqual(1);
    expect(k.fields.length).toBeLessThanOrEqual(3);
    expect(k.fields[0].name).toBe(k.category);
    for (const f of k.fields) expect(['gold', 'silver', 'none']).toContain(f.medal);
    expect(new Set(k.fields.map((f) => f.name.toLowerCase())).size).toBe(k.fields.length);
  }
  // creators.ts: "Du Lịch"/gold, "Văn Hóa"/silver, "Phượt"/bronze → none
  expect(byId('KOL-2026-0003').fields).toEqual([
    { name: 'Du lịch', medal: 'gold' },
    { name: 'Văn Hóa', medal: 'silver' },
    { name: 'Phượt', medal: 'none' },
  ]);
  expect(new Set(dir.map((k) => k.fields.length))).toEqual(new Set([1, 2, 3]));
});

test('video mới nhất: chỉ FB/YT/TikTok của kênh đã xác thực + đang hoạt động; mới nhất trước', () => {
  const t = NOW;
  for (const k of dir) {
    const ok = new Set(searchableChannels(k, t).map((c) => c.platform));
    for (const v of k.latestVideos) {
      expect(['facebook', 'youtube', 'tiktok']).toContain(v.platform);
      expect(ok.has(v.platform)).toBe(true);
      expect(v.thumbnail).toMatch(/^https:\/\//);
    }
    const dates = k.latestVideos.map((v) => Date.parse(v.publishedAt!));
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    expect(k.latestVideos.length).toBeLessThanOrEqual(6);
  }
  expect(JSON.stringify(dir.map((k) => k.latestVideos))).not.toMatch(/instagram/i);
  // Khánh Vy: ảnh nội dung lấy từ creators.ts
  expect(byId('KOL-2026-0001').latestVideos[0].thumbnail).toContain('photo-1758521540376');
  // 0003 có TikTok ngừng hoạt động → không có video TikTok
  expect(byId('KOL-2026-0003').latestVideos.some((v) => v.platform === 'tiktok')).toBe(false);
  // Có KOL chưa có video (ô "Chưa có video") và KOL mất dấu không có video
  expect(dir.slice(0, 35).some((k) => k.latestVideos.length === 0)).toBe(true);
  expect(byId('KOL-2026-0038').latestVideos).toEqual([]);
  expect(dir.some((k) => k.latestVideos.length >= 4)).toBe(true);
});
