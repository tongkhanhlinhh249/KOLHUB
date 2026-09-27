// Phase 3 (Brand/Agency) types and constants: KOL directory, search, public profile, saved lists.

export type Platform = 'facebook' | 'youtube' | 'tiktok';

export const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
];

export const KOL_CATEGORIES = [
  'Giáo dục',
  'Lifestyle',
  'Du lịch',
  'Ẩm thực',
  'Làm đẹp',
  'Thời trang',
  'Công nghệ',
  'Gaming',
  'Thể thao',
  'Giải trí',
  'Gia đình',
  'Tài chính',
  'Khác',
] as const;
export type KolCategory = (typeof KOL_CATEGORIES)[number];

export const KOL_REGIONS = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'] as const;
export type KolRegion = (typeof KOL_REGIONS)[number];

export type KolScale = 'nano' | 'micro' | 'mid' | 'macro' | 'mega';

/** Follower bands: `min` inclusive, `max` exclusive. */
export const KOL_SCALES: { key: KolScale; label: string; min: number; max: number }[] = [
  { key: 'nano', label: 'Nano (< 10K)', min: 0, max: 10_000 },
  { key: 'micro', label: 'Micro (10K–100K)', min: 10_000, max: 100_000 },
  { key: 'mid', label: 'Mid (100K–500K)', min: 100_000, max: 500_000 },
  { key: 'macro', label: 'Macro (500K–1M)', min: 500_000, max: 1_000_000 },
  { key: 'mega', label: 'Mega (≥ 1M)', min: 1_000_000, max: Infinity },
];

export type ChannelStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'NEEDS_FIX' | 'EXPIRED';

export type FieldMedal = 'gold' | 'silver' | 'none';

/**
 * One "Lĩnh vực hoạt động" of a KOL (stored on `KolProfile.contact.fields`). The first field is the
 * primary one and always equals `contact.category` (used by filters). Names a KOL declares come from
 * KOL_CATEGORIES; seed/Admin data may add free-text sub-fields (e.g. "MC", "Tiếng Anh"), so `name` is
 * typed `string`. Medals are only set by seed data / Admin; self-declared fields are `none`.
 */
export interface ActivityField {
  name: string;
  medal: FieldMedal;
}
/** @deprecated alias kept for the UI; same shape as ActivityField. */
export type KolField = ActivityField;

/** A recent video of a channel, only ever on Facebook / YouTube / TikTok (BR-20). */
export interface LatestVideo {
  platform: Platform;
  thumbnail: string;
  url?: string;
  title?: string;
  /** ISO date */
  publishedAt?: string;
}
/** @deprecated alias kept for the UI; same shape as LatestVideo. */
export type KolVideo = LatestVideo;

/** Max "Video mới nhất" shown per KOL in a search result (list row). */
export const SEARCH_VIDEO_LIMIT = 2;
/** Max "Video mới nhất" shown on the public profile. */
export const PROFILE_VIDEO_LIMIT = 6;
/** Max "Lĩnh vực hoạt động" per KOL. */
export const FIELD_LIMIT = 3;

export type BadgeState = 'VERIFIED' | 'EXPIRED';
export type KolListingStatus = 'VISIBLE' | 'BADGE_EXPIRED' | 'INACTIVE' | 'UNAVAILABLE';

export interface SavedListItem {
  kolId: string;
  note: string;
  addedAt: string;
}

export interface SavedList {
  id: string;
  accountId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: SavedListItem[];
}


// --- Search (Task 2) ---

export type SearchSort = 'relevance' | 'followers' | 'newest';
export const SEARCH_PAGE_SIZE = 20;

export interface KolSearchQuery {
  keyword?: string;
  category?: KolCategory;
  region?: KolRegion;
  scale?: KolScale;
  platforms?: Platform[];
  sort?: SearchSort;
  page?: number;
}

/** One searchable channel of a search result (verified, active, unexpired). Public data only. */
export interface KolSearchChannel {
  platform: Platform;
  followers: number;
  badge: BadgeState;
}

export interface KolSearchItem {
  kolId: string;
  displayName: string;
  nickname: string;
  avatar?: string;
  bio: string;
  category?: KolCategory;
  region?: KolRegion;
  totalFollowers: number;
  scale: KolScale;
  platforms: Platform[];
  /** Only the channels that make the KOL searchable. */
  channels: KolSearchChannel[];
  /** 0–3 "Lĩnh vực hoạt động". */
  fields: KolField[];
  /** 0–2 newest videos, only on the KOL's searchable platforms. */
  latestVideos: KolVideo[];
  verifiedAt: string;
}

export interface KolSearchResult {
  items: KolSearchItem[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: 20;
}

// --- Public profile (Task 3) ---

export interface PublicChannel {
  platform: Platform;
  url: string;
  handle: string;
  followers: number;
  /** Total views of the channel (mock social listening, derived from the URL). */
  views: number;
  /** Number of videos on the channel (mock social listening, derived from the URL). */
  videoCount: number;
  /** 0–6 newest videos of this channel, newest first. */
  latestVideos: KolVideo[];
  /** Badge status of the channel. */
  badge: BadgeState;
  badgeExpiresAt: string;
}

export interface KolPublicProfile {
  kolId: string;
  displayName: string;
  nickname: string;
  avatar?: string;
  bio: string;
  category?: KolCategory;
  region?: KolRegion;
  collabEmail: string | null;
  totalFollowers: number;
  scale: KolScale;
  listingStatus: Exclude<KolListingStatus, 'UNAVAILABLE'>;
  verifiedAt: string;
  channels: PublicChannel[];
  /** 0–3 "Lĩnh vực hoạt động". */
  fields: KolField[];
  /** 0–6 newest videos, only on the KOL's public (active, badged) platforms. */
  latestVideos: KolVideo[];
}

// --- Saved lists (Task 4) ---

export interface SavedListSummary {
  id: string;
  name: string;
  count: number;
  updatedAt: string;
}

/** One public channel of a saved KOL (active, badge valid or expired — BR-62). */
export interface SavedListRowChannel {
  platform: Platform;
  followers: number;
}

export interface SavedListRow {
  kolId: string;
  displayName: string;
  /** Public nickname without "@". */
  handle?: string;
  avatar?: string;
  category?: KolCategory;
  /** 0–3 "Lĩnh vực hoạt động". */
  fields: KolField[];
  platforms: Platform[];
  /** Public channels (also those whose badge expired), in profile order. */
  channels: SavedListRowChannel[];
  /** Sum of `channels` followers. */
  totalFollowers: number;
  status: KolListingStatus;
  note: string;
  addedAt: string;
}

export interface SavedListDetail {
  id: string;
  name: string;
  updatedAt: string;
  rows: SavedListRow[];
}

export interface ListMembership {
  listId: string;
  name: string;
  count: number;
  checked: boolean;
}
