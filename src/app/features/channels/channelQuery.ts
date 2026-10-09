// URL-synced state of the "Quản lý kênh" page (KOL/MCN) + pure filter/sort over the owner's channels.
import { canRenew, channelBadge, normalizeText, normalizeUrl, PLATFORMS, type Channel, type Platform } from '../../services';

export type ChannelStatusFilter = 'safety' | 'pending' | 'needs_fix' | 'verified' | 'expiring' | 'expired';
export type ChannelActiveFilter = 'on' | 'off';
export type ChannelSort = 'updated' | 'followers' | 'expiry';
export const CHANNEL_STATUS_OPTIONS: { key: ChannelStatusFilter; label: string }[] = [
  { key: 'safety', label: 'Chờ KOL Safety' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'needs_fix', label: 'Cần bổ sung' },
  { key: 'verified', label: 'Đã xác thực' },
  { key: 'expiring', label: 'Sắp hết hạn' },
  { key: 'expired', label: 'Hết hạn dấu' },
];

export const CHANNEL_ACTIVE_OPTIONS: { key: ChannelActiveFilter; label: string }[] = [
  { key: 'on', label: 'Đang hoạt động' },
  { key: 'off', label: 'Đã tắt' },
];

export const CHANNEL_SORT_OPTIONS: { key: ChannelSort; label: string }[] = [
  { key: 'updated', label: 'Mới cập nhật' },
  { key: 'followers', label: 'Người theo dõi cao nhất' },
  { key: 'expiry', label: 'Hạn dấu gần nhất' },
];

export interface ChannelQuery {
  keyword?: string;
  status?: ChannelStatusFilter;
  platforms?: Platform[];
  active?: ChannelActiveFilter;
  sort?: ChannelSort;
}

/** URL keys owned by the channels page (`view` is kept only so stale links get cleaned); anything else (e.g. `them=1`) is left alone. */
export const CHANNEL_KEYS = ['q', 'trangThai', 'nenTang', 'hoatDong', 'sapXep', 'view'] as const;

function oneOf<T extends string>(v: string | null, list: readonly T[]): T | undefined {
  return v !== null && (list as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** URL → query. Unknown values are dropped; missing/unknown sort → updated. */
export function parseChannelParams(sp: URLSearchParams): ChannelQuery {
  const q: ChannelQuery = {};
  const keyword = sp.get('q');
  if (keyword && keyword.trim()) q.keyword = keyword;
  const status = oneOf(
    sp.get('trangThai'),
    CHANNEL_STATUS_OPTIONS.map((o) => o.key),
  );
  if (status) q.status = status;
  const platformKeys = PLATFORMS.map((p) => p.key);
  const platforms = (sp.get('nenTang') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s, i, arr): s is Platform => (platformKeys as string[]).includes(s) && arr.indexOf(s) === i);
  if (platforms.length > 0) q.platforms = platforms;
  const active = oneOf(
    sp.get('hoatDong'),
    CHANNEL_ACTIVE_OPTIONS.map((o) => o.key),
  );
  if (active) q.active = active;
  q.sort =
    oneOf(
      sp.get('sapXep'),
      CHANNEL_SORT_OPTIONS.map((o) => o.key),
    ) ?? 'updated';
  return q;
}

/** Query → URL params, leaving out defaults (updated sort, empty values). */
export function toChannelParams(q: ChannelQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.keyword && q.keyword.trim()) sp.set('q', q.keyword);
  if (q.status) sp.set('trangThai', q.status);
  if (q.platforms && q.platforms.length > 0) sp.set('nenTang', q.platforms.join(','));
  if (q.active) sp.set('hoatDong', q.active);
  if (q.sort && q.sort !== 'updated') sp.set('sapXep', q.sort);
  return sp;
}

/** Write `q` over `prev`, keeping params the page does not own (e.g. `them=1`). */
export function mergeChannelParams(prev: URLSearchParams, q: ChannelQuery): URLSearchParams {
  const next = new URLSearchParams();
  prev.forEach((v, k) => {
    if (!(CHANNEL_KEYS as readonly string[]).includes(k)) next.append(k, v);
  });
  toChannelParams(q).forEach((v, k) => next.set(k, v));
  return next;
}

export function applyChannelPatch(q: ChannelQuery, patch: Partial<ChannelQuery>): ChannelQuery {
  return { ...q, ...patch };
}

/** Clearing keeps the sort. */
export function clearChannelFilters(q: ChannelQuery): ChannelQuery {
  return { sort: q.sort };
}

/** Keyword or any filter set (sort does not count). */
export function hasChannelFilters(q: ChannelQuery): boolean {
  return !!((q.keyword && q.keyword.trim()) || q.status || q.active || (q.platforms && q.platforms.length > 0));
}

/** Filters set (not keyword) — badge on the mobile "Bộ lọc" button. */
export function channelFilterCount(q: ChannelQuery): number {
  return [q.status, q.active].filter(Boolean).length + (q.platforms?.length ? 1 : 0);
}

/**
 * Which status bucket a channel is in; a VERIFIED channel past its badge date counts as expired, and one
 * with ≤ 14 days left (renewal window) as "Sắp hết hạn".
 */
export function channelStatusOf(ch: Channel, now: number): ChannelStatusFilter {
  switch (ch.status) {
    case 'SAFETY_PENDING':
      return 'safety';
    case 'PENDING_REVIEW':
      return 'pending';
    case 'NEEDS_FIX':
      return 'needs_fix';
    default:
      if (channelBadge(ch, now) !== 'VERIFIED') return 'expired';
      return canRenew(ch, now) ? 'expiring' : 'verified';
  }
}

/** Channel counts per status option (the "Tất cả" count is `channels.length`). */
export function countByStatus(channels: Channel[], now: number): Record<ChannelStatusFilter, number> {
  const counts: Record<ChannelStatusFilter, number> = { safety: 0, pending: 0, needs_fix: 0, verified: 0, expiring: 0, expired: 0 };
  for (const c of channels) counts[channelStatusOf(c, now)] += 1;
  return counts;
}

const stripAt = (s: string) => s.replace(/^@+/, '');

/** Accent/case-insensitive match on handle (with or without "@") or channel link. */
export function matchesKeyword(ch: Channel, keyword: string | undefined): boolean {
  const kw = normalizeText(keyword ?? '');
  if (!kw) return true;
  if (stripAt(normalizeText(ch.handle)).includes(stripAt(kw))) return true;
  const url = normalizeUrl(kw);
  return url !== '' && normalizeUrl(ch.url).includes(url);
}

/** Apply keyword + filters (not sort). */
export function filterChannels(channels: Channel[], q: ChannelQuery, now: number): Channel[] {
  return channels.filter(
    (c) =>
      matchesKeyword(c, q.keyword) &&
      (!q.status || channelStatusOf(c, now) === q.status) &&
      (!q.platforms || q.platforms.length === 0 || q.platforms.includes(c.platform)) &&
      (!q.active || (q.active === 'on') === c.active),
  );
}

/**
 * Stable sort (new array):
 * - updated: newest `updatedAt` first;
 * - followers: most followers first, channels without stats last;
 * - expiry: soonest `badgeExpiresAt` first, channels without a badge date last.
 * Ties fall back to newest update.
 */
export function sortChannels(channels: Channel[], sort: ChannelSort = 'updated'): Channel[] {
  const byUpdated = (a: Channel, b: Channel) => b.updatedAt - a.updatedAt;
  const cmp: Record<ChannelSort, (a: Channel, b: Channel) => number> = {
    updated: byUpdated,
    followers: (a, b) => (b.stats?.followers ?? -1) - (a.stats?.followers ?? -1) || byUpdated(a, b),
    expiry: (a, b) => {
      const ea = a.badgeExpiresAt;
      const eb = b.badgeExpiresAt;
      if (ea === undefined || eb === undefined) return (ea === undefined ? 1 : 0) - (eb === undefined ? 1 : 0) || byUpdated(a, b);
      return ea - eb || byUpdated(a, b);
    },
  };
  return [...channels].sort(cmp[sort]);
}

// --- MCN "status" mode: only the old approval-status tabs, same `trangThai` URL key as the KOL filter bar ---

export type ChannelStatusTabKey = 'all' | ChannelStatusFilter;

export interface ChannelStatusTab {
  key: ChannelStatusTabKey;
  label: string;
  count: number;
}

/** "Tất cả" + every status option with its count, always all of them (the old tabs never hid a 0). */
export function channelStatusTabs(channels: Channel[], now: number): ChannelStatusTab[] {
  const counts = countByStatus(channels, now);
  return [
    { key: 'all', label: 'Tất cả', count: channels.length },
    ...CHANNEL_STATUS_OPTIONS.map((o) => ({ key: o.key, label: o.label, count: counts[o.key] })),
  ];
}

/** Keep only the status of a parsed query (keyword, platforms, active and sort are ignored). */
export function statusOnlyQuery(q: ChannelQuery): ChannelQuery {
  return q.status ? { status: q.status } : {};
}

/** Tab key → query: 'all' (or an unknown key) clears the status. */
export function statusTabQuery(key: string): ChannelQuery {
  const status = oneOf(
    key,
    CHANNEL_STATUS_OPTIONS.map((o) => o.key),
  );
  return status ? { status } : {};
}
