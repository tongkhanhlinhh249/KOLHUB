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

export interface DirectoryChannel {
  id: string;
  platform: Platform;
  url: string;
  handle: string;
  followers: number;
  status: ChannelStatus;
  active: boolean;
  /** ISO date */
  badgeExpiresAt: string | null;
  /** ISO date */
  verifiedAt: string | null;
}

/** Data a Brand must never see (BR-58). Kept in the directory only to prove it is filtered out. */
export interface KolPrivateData {
  phone: string;
  address: string;
  zalo: string;
  idNoMasked: string;
  violations: number;
  bookingPrice: string;
}

export interface DirectoryKol {
  kolId: string;
  displayName: string;
  nickname: string;
  avatar?: string;
  bio: string;
  category?: KolCategory;
  region?: KolRegion;
  collabEmail: string | null;
  /** ISO date */
  verifiedAt: string;
  channels: DirectoryChannel[];
  private?: KolPrivateData;
}

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
}

// --- Saved lists (Task 4) ---

export interface SavedListSummary {
  id: string;
  name: string;
  count: number;
  updatedAt: string;
}

export interface SavedListRow {
  kolId: string;
  displayName: string;
  avatar?: string;
  category?: KolCategory;
  platforms: Platform[];
  status: KolListingStatus;
  note: string;
  addedAt: string;
}

export interface SavedListDetail {
  id: string;
  name: string;
  rows: SavedListRow[];
}

export interface ListMembership {
  listId: string;
  name: string;
  count: number;
  checked: boolean;
}
