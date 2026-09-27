import { expect, test } from 'vitest';
import { KOL_CATEGORIES, KOL_REGIONS } from '../bizTypes';
import { listingStatus } from './directory';
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
