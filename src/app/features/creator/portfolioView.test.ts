import { describe, expect, test } from 'vitest';
import { compactNumber, filterPosts, parsePortfolioParams, platformsOf, portfolioTotals, visiblePosts } from './portfolioView';
import type { Platform } from '../../services';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 6, 10).getTime();
const post = (id: string, platform: Platform, daysAgo: number, views: number, visible = true) => ({
  id,
  platform,
  verifiedAt: NOW - daysAgo * DAY,
  visible,
  metrics: { views, likes: views / 10, comments: views / 100, shares: views / 100, engagementRate: 12 },
});

describe('Bài đã đăng — lọc và tổng', () => {
  const posts = [post('a', 'tiktok', 5, 10_000), post('b', 'youtube', 45, 20_000, false), post('c', 'tiktok', 200, 30_000), post('d', 'facebook', 400, 1_000)];

  test('đọc tham số URL (giá trị lạ → mặc định)', () => {
    expect(parsePortfolioParams(new URLSearchParams('nen-tang=tiktok&thoi-gian=90-ngay'))).toEqual({ platform: 'tiktok', period: '90-ngay' });
    expect(parsePortfolioParams(new URLSearchParams('nen-tang=myspace&thoi-gian=1-nam'))).toEqual({ period: 'tat-ca' });
  });

  test('lọc theo nền tảng và thời gian', () => {
    expect(filterPosts(posts, { period: 'tat-ca' }, NOW).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filterPosts(posts, { platform: 'tiktok', period: 'tat-ca' }, NOW).map((p) => p.id)).toEqual(['a', 'c']);
    expect(filterPosts(posts, { period: '30-ngay' }, NOW).map((p) => p.id)).toEqual(['a']);
    expect(filterPosts(posts, { period: '90-ngay' }, NOW).map((p) => p.id)).toEqual(['a', 'b']);
    expect(filterPosts(posts, { platform: 'tiktok', period: '12-thang' }, NOW).map((p) => p.id)).toEqual(['a', 'c']);
    expect(platformsOf(posts)).toEqual(['facebook', 'youtube', 'tiktok']);
    expect(platformsOf([posts[0]])).toEqual(['tiktok']);
  });

  test('tổng: số bài, lượt xem, tương tác, tỉ lệ tương tác, số bài đang hiện', () => {
    const t = portfolioTotals(posts.slice(0, 2));
    expect(t).toEqual({ posts: 2, views: 30_000, engagements: 3_600, engagementRate: 12, visible: 1 });
    expect(portfolioTotals([])).toEqual({ posts: 0, views: 0, engagements: 0, engagementRate: 0, visible: 0 });
  });

  test('Nhãn hàng chỉ thấy bài đang bật "Hiện trên hồ sơ"', () => {
    expect(visiblePosts(posts).map((p) => p.id)).toEqual(['a', 'c', 'd']);
  });

  test('số gọn', () => {
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(12_345)).toBe('12,3K');
    expect(compactNumber(1_234_567)).toBe('1,2M');
  });
});
