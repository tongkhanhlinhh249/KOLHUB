// Mock social listening: follower counts and latest videos of a verified channel.
import { creators } from '../../data/creators';
import type { LatestVideo, Platform } from '../bizTypes';
import type { Channel } from '../profile-types';

const DAY = 86_400_000;
const LISTENED: readonly Platform[] = ['facebook', 'youtube', 'tiktok'];

/** Every distinct content image of creators.ts, used as sample video thumbnails. */
export const IMAGE_POOL: string[] = [...new Set(creators.flatMap((c) => c.contentImages as string[]))];

export const VIDEO_TITLES = [
  'Hậu trường buổi quay mới nhất',
  'Chia sẻ kinh nghiệm thực tế',
  'Review chân thật',
  'Một ngày của mình',
  'Hỏi đáp cùng người theo dõi',
  'Thử thách tuần này',
];

/** Video link of the n-th video of a channel (`channel` without protocol). */
export function videoUrl(platform: Platform, channel: string, n: number): string {
  const base = channel.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (platform === 'youtube') return `https://youtube.com/watch?v=${base.replace(/[^a-z0-9]/gi, '')}${n}`;
  if (platform === 'tiktok') return `https://${base}/video/${n}`;
  return `https://${base}/videos/${n}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/**
 * Stats "pulled" from the platform for a verified channel: deterministic from the URL (stable
 * followers + 2–6 newest-first videos from the sample image pool). Only FB / YouTube / TikTok (BR-20).
 */
export function syncChannelStats(channel: Pick<Channel, 'platform' | 'url'>, now: number): Channel['stats'] {
  if (!LISTENED.includes(channel.platform)) return undefined;
  const key = channel.url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^(www|m)\./, '').replace(/\/+$/, '');
  const h = hash(key);
  const count = 2 + ((h >>> 8) % 5);
  const latestVideos: LatestVideo[] = Array.from({ length: count }, (_, n) => ({
    platform: channel.platform,
    thumbnail: IMAGE_POOL[(h + n * 7) % IMAGE_POOL.length],
    url: videoUrl(channel.platform, key, n + 1),
    title: VIDEO_TITLES[(h + n) % VIDEO_TITLES.length],
    publishedAt: new Date(now - (n * 3 + 1 + (h % 3)) * DAY).toISOString(),
  }));
  return { followers: 10_000 + (h % 1_990_001), latestVideos, syncedAt: now };
}

/**
 * Channel totals "pulled" with the stats, derived at read time (not stored) so no DB change is
 * needed: deterministic from the URL, scaled on followers. `views` ≈ 40–400 × followers,
 * `videoCount` 60–1 500.
 */
export function channelTotals(url: string, followers: number): { views: number; videoCount: number } {
  const key = url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^(www|m)\./, '').replace(/\/+$/, '');
  const h = hash(`totals:${key}`);
  const videoCount = 60 + (h % 1_441);
  const perFollower = 40 + ((h >>> 11) % 361);
  return { views: Math.max(0, Math.round(followers)) * perFollower, videoCount };
}
