// Pure helpers of "Bài đã đăng": platform / time filters (URL state), totals and the public subset.
import { PLATFORMS, type Platform, type PortfolioPost, type PostMetrics } from '../../services';

const DAY = 86_400_000;

export type PeriodKey = 'tat-ca' | '30-ngay' | '90-ngay' | '12-thang';
export const PERIODS: { key: PeriodKey; label: string; days?: number }[] = [
  { key: 'tat-ca', label: 'Mọi thời gian' },
  { key: '30-ngay', label: '30 ngày qua', days: 30 },
  { key: '90-ngay', label: '90 ngày qua', days: 90 },
  { key: '12-thang', label: '12 tháng qua', days: 365 },
];

export interface PortfolioQuery {
  platform?: Platform;
  period: PeriodKey;
}

const PLATFORM_KEYS = PLATFORMS.map((p) => p.key);
const PERIOD_KEYS = PERIODS.map((p) => p.key);

/** ?nen-tang=tiktok&thoi-gian=90-ngay (unknown values → defaults). */
export function parsePortfolioParams(p: URLSearchParams): PortfolioQuery {
  const pf = p.get('nen-tang') as Platform | null;
  const per = p.get('thoi-gian') as PeriodKey | null;
  return {
    ...(pf && PLATFORM_KEYS.includes(pf) ? { platform: pf } : {}),
    period: per && PERIOD_KEYS.includes(per) ? per : 'tat-ca',
  };
}

export function filterPosts<T extends Pick<PortfolioPost, 'platform' | 'verifiedAt'>>(posts: T[], q: PortfolioQuery, now: number): T[] {
  const days = PERIODS.find((p) => p.key === q.period)?.days;
  const since = days ? now - days * DAY : -Infinity;
  return posts.filter((p) => (!q.platform || p.platform === q.platform) && p.verifiedAt >= since);
}

/** Platforms that have at least one post (for the filter chips), in PLATFORMS order. */
export function platformsOf(posts: Pick<PortfolioPost, 'platform'>[]): Platform[] {
  const set = new Set(posts.map((p) => p.platform));
  return PLATFORM_KEYS.filter((k) => set.has(k));
}

export interface PortfolioTotals {
  posts: number;
  views: number;
  /** likes + comments + shares. */
  engagements: number;
  /** engagements / views × 100, 2 decimals (0 without views). */
  engagementRate: number;
  /** Posts shown on the public profile. */
  visible: number;
}

export function portfolioTotals(posts: { metrics: PostMetrics; visible?: boolean }[]): PortfolioTotals {
  let views = 0;
  let engagements = 0;
  let visible = 0;
  for (const p of posts) {
    views += p.metrics.views;
    engagements += p.metrics.likes + p.metrics.comments + p.metrics.shares;
    if (p.visible !== false) visible++;
  }
  return { posts: posts.length, views, engagements, engagementRate: views ? Math.round((engagements / views) * 10_000) / 100 : 0, visible };
}

/** What brands see: only posts with "Hiện trên hồ sơ" on. */
export const visiblePosts = <T extends Pick<PortfolioPost, 'visible'>>(posts: T[]): T[] => posts.filter((p) => p.visible);

/** 1234567 → "1,2M"; 12345 → "12,3K"; 950 → "950". */
export function compactNumber(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v >= 1_000_000) return `${String(Math.round(v / 100_000) / 10).replace('.', ',')}M`;
  if (v >= 1_000) return `${String(Math.round(v / 100) / 10).replace('.', ',')}K`;
  return String(v);
}
