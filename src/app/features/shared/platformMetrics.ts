import type { Platform } from '../../services';

export interface ChannelMetricInput {
  followers?: number;
  views?: number;
  videoCount?: number;
  likes?: number;
}

export interface ChannelMetric {
  key: 'followers' | 'views' | 'likes' | 'videoCount';
  label: string;
  /** undefined = not synced yet. */
  value: number | undefined;
}

/**
 * The totals each platform reports, in display order: Facebook = followers + posts, YouTube =
 * subscribers + channel views + videos, TikTok = followers + likes + videos.
 */
export function platformMetrics(platform: Platform, t: ChannelMetricInput): ChannelMetric[] {
  switch (platform) {
    case 'youtube':
      return [
        { key: 'followers', label: 'Người đăng ký', value: t.followers },
        { key: 'views', label: 'Lượt xem kênh', value: t.views },
        { key: 'videoCount', label: 'Video', value: t.videoCount },
      ];
    case 'tiktok':
      return [
        { key: 'followers', label: 'Người theo dõi', value: t.followers },
        { key: 'likes', label: 'Lượt thích', value: t.likes },
        { key: 'videoCount', label: 'Video', value: t.videoCount },
      ];
    default:
      return [
        { key: 'followers', label: 'Người theo dõi', value: t.followers },
        { key: 'videoCount', label: 'Bài viết', value: t.videoCount },
      ];
  }
}
