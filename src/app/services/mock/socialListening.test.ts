import { expect, test } from 'vitest';
import { channelTotals, IMAGE_POOL, syncChannelStats } from './socialListening';

const NOW = Date.UTC(2026, 8, 27, 3);
const ch = (platform: 'facebook' | 'youtube' | 'tiktok', url: string) => ({ platform, url });

test('xác định theo URL: cùng URL → cùng người theo dõi và video', () => {
  const a = syncChannelStats(ch('tiktok', 'https://tiktok.com/@maianh'), NOW)!;
  const b = syncChannelStats(ch('tiktok', 'https://tiktok.com/@maianh'), NOW)!;
  expect(a).toEqual(b);
  expect(a.syncedAt).toBe(NOW);
  expect(a.followers).toBeGreaterThanOrEqual(10_000);
  const other = syncChannelStats(ch('tiktok', 'https://tiktok.com/@khac'), NOW)!;
  expect(other.followers).not.toBe(a.followers);
});

test('2–6 video trên đúng nền tảng của kênh, ảnh từ kho ảnh mẫu, mới nhất trước', () => {
  const seen = new Set<number>();
  for (let i = 0; i < 40; i++) {
    const s = syncChannelStats(ch('youtube', `youtube.com/@kenh${i}`), NOW)!;
    seen.add(s.latestVideos.length);
    expect(s.latestVideos.length).toBeGreaterThanOrEqual(2);
    expect(s.latestVideos.length).toBeLessThanOrEqual(6);
    for (const v of s.latestVideos) {
      expect(v.platform).toBe('youtube');
      expect(IMAGE_POOL).toContain(v.thumbnail);
      expect(v.url).toMatch(/^https:\/\//);
    }
    const dates = s.latestVideos.map((v) => Date.parse(v.publishedAt!));
    expect([...dates].sort((x, y) => y - x)).toEqual(dates);
    expect(Math.max(...dates)).toBeLessThan(NOW);
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('chỉ Facebook / YouTube / TikTok (BR-20)', () => {
  expect(syncChannelStats({ platform: 'instagram' as never, url: 'instagram.com/x' }, NOW)).toBeUndefined();
  expect(syncChannelStats(ch('facebook', 'facebook.com/x'), NOW)?.latestVideos[0].platform).toBe('facebook');
});

test('channelTotals: xác định theo URL, lượt xem theo người theo dõi', () => {
  const a = channelTotals('https://www.youtube.com/@kenh/', 100_000);
  expect(channelTotals('youtube.com/@kenh', 100_000)).toEqual(a);
  expect(a.views).toBeGreaterThanOrEqual(100_000 * 40);
  expect(a.views).toBeLessThanOrEqual(100_000 * 400);
  expect(a.videoCount).toBeGreaterThanOrEqual(60);
  expect(a.videoCount).toBeLessThanOrEqual(1_500);
  expect(Number.isInteger(a.views)).toBe(true);
  expect(channelTotals('youtube.com/@kenh', 0).views).toBe(0);
  const counts = new Set(Array.from({ length: 20 }, (_, i) => channelTotals(`tiktok.com/@k${i}`, 1_000).videoCount));
  expect(counts.size).toBeGreaterThan(1);
});
