// Brand "Danh sách kênh": one row per searchable channel (BR-54), public fields only (BR-58).
import type { ActivityField, KolCategory, KolRegion, KolScale, KolVideo, LatestVideo, Platform } from './bizTypes';

/** followers = most followers first · newest = most recently verified · expiring = badge expires soonest. */
export type ChannelDirectorySort = 'followers' | 'newest' | 'expiring';
export const CHANNEL_PAGE_SIZE = 20;

export interface ChannelDirectoryQuery {
  /** @handle, channel link, KOL name or KOL ID (accent-insensitive). */
  keyword?: string;
  platforms?: Platform[];
  category?: KolCategory;
  region?: KolRegion;
  /** Band of the channel's own follower count. */
  scale?: KolScale;
  sort?: ChannelDirectorySort;
  page?: number;
}

export interface ChannelDirectoryItem {
  channelId: string;
  platform: Platform;
  /** Without "@". */
  handle: string;
  /** Link without protocol (the UI prefixes https://). */
  url: string;
  followers: number;
  scale: KolScale;
  /** ISO date the badge was granted. */
  verifiedAt: string;
  /** ISO date the badge expires. */
  badgeExpiresAt: string;
  /** "Khiên An toàn nội dung" (KOL Safety): ACTIVE / SUSPENDED; absent = none. */
  contentShield?: 'ACTIVE' | 'SUSPENDED';
  latestVideo?: LatestVideo;
  // Owner KOL (public fields only)
  kolId: string;
  displayName: string;
  avatar?: string;
  category?: KolCategory;
  region?: KolRegion;
  fields: ActivityField[];
}

export interface ChannelDirectoryResult {
  items: ChannelDirectoryItem[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: typeof CHANNEL_PAGE_SIZE;
}

/** "Chi tiết kênh": the row plus the channel's own totals and newest videos (public projection only). */
export interface ChannelDirectoryDetail extends ChannelDirectoryItem {
  /** Total views of the channel (mock social listening). */
  views: number;
  /** Number of videos on the channel (mock social listening). */
  videoCount: number;
  /** Total likes of the channel (mock social listening; shown for TikTok). */
  likes: number;
  /** 0–6 newest videos of this channel, newest first. */
  latestVideos: KolVideo[];
}
