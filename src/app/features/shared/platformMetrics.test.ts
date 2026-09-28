import { expect, test } from 'vitest';
import { platformMetrics } from './platformMetrics';

const t = { followers: 18_000_000, views: 29_400_000_000, videoCount: 342, likes: 591_400_000 };
const keys = (p: Parameters<typeof platformMetrics>[0]) => platformMetrics(p, t).map((m) => [m.label, m.value]);

test('Facebook: người theo dõi + bài viết', () => {
  expect(keys('facebook')).toEqual([['Người theo dõi', 18_000_000], ['Bài viết', 342]]);
});

test('YouTube: người đăng ký + lượt xem kênh + video', () => {
  expect(keys('youtube')).toEqual([['Người đăng ký', 18_000_000], ['Lượt xem kênh', 29_400_000_000], ['Video', 342]]);
});

test('TikTok: người theo dõi + lượt thích + video', () => {
  expect(keys('tiktok')).toEqual([['Người theo dõi', 18_000_000], ['Lượt thích', 591_400_000], ['Video', 342]]);
});

test('chưa đồng bộ: giá trị undefined', () => {
  expect(platformMetrics('tiktok', {}).map((m) => m.value)).toEqual([undefined, undefined, undefined]);
});
