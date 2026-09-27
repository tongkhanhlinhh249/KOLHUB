import {
  KOL_CATEGORIES,
  KOL_REGIONS,
  KOL_SCALES,
  type ApprovedKolSummary,
  type BadgeState,
  type DirectoryChannel,
  type DirectoryKol,
  type KolCategory,
  type KolListingStatus,
  type KolRegion,
  type KolScale,
} from '../bizTypes';
import type { DemoState } from './db';

/** Accent-, case- and whitespace-insensitive form used for keyword matching. */
export function normalizeText(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Channel link without protocol, www./m., query, hash or trailing slash. */
export function normalizeUrl(s: string): string {
  return normalizeText(s)
    .replace(/^https?:\/\//, '')
    .replace(/^(www|m)\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

export function isLinkKeyword(kw: string): boolean {
  return /[./@]/.test(kw);
}

export function channelBadge(ch: DirectoryChannel, now: number): BadgeState | null {
  if (ch.status === 'EXPIRED') return 'EXPIRED';
  if (ch.status !== 'VERIFIED') return null;
  if (!ch.badgeExpiresAt || Date.parse(ch.badgeExpiresAt) <= now) return 'EXPIRED';
  return 'VERIFIED';
}

export function isSearchableChannel(ch: DirectoryChannel, now: number): boolean {
  return channelBadge(ch, now) === 'VERIFIED' && ch.active;
}

export function searchableChannels(k: DirectoryKol, now: number): DirectoryChannel[] {
  return k.channels.filter((c) => isSearchableChannel(c, now));
}

export function totalFollowers(k: DirectoryKol, now: number): number {
  return searchableChannels(k, now).reduce((sum, c) => sum + c.followers, 0);
}

export function scaleOf(followers: number): KolScale {
  const band = KOL_SCALES.find((s) => followers >= s.min && followers < s.max);
  return band ? band.key : 'nano';
}

export function listingStatus(k: DirectoryKol, now: number): Exclude<KolListingStatus, 'UNAVAILABLE'> {
  if (searchableChannels(k, now).length > 0) return 'VISIBLE';
  if (k.channels.some((c) => channelBadge(c, now) === 'VERIFIED')) return 'INACTIVE';
  return 'BADGE_EXPIRED';
}

function handleFromUrl(url: string): string {
  const path = normalizeUrl(url).split('/').slice(1).filter(Boolean);
  const last = path[path.length - 1] ?? '';
  return last.replace(/^@/, '');
}

/** Map a KOL approved in phase 2 to a directory entry (no collab email, no private data). */
export function fromApprovedSummary(s: ApprovedKolSummary): DirectoryKol {
  const nickname = s.channels[0] ? handleFromUrl(s.channels[0].url) : '';
  const category = (KOL_CATEGORIES as readonly string[]).includes(s.category ?? '')
    ? (s.category as KolCategory)
    : undefined;
  const region = (KOL_REGIONS as readonly string[]).includes(s.region ?? '') ? (s.region as KolRegion) : undefined;
  return {
    kolId: s.kolId,
    displayName: s.displayName,
    nickname,
    ...(s.avatar ? { avatar: s.avatar } : {}),
    bio: '',
    ...(category ? { category } : {}),
    ...(region ? { region } : {}),
    collabEmail: null,
    verifiedAt: s.verifiedAt,
    channels: s.channels.map((c, i) => {
      const handle = handleFromUrl(c.url);
      return {
        id: `${s.kolId}-${c.platform}-${i}`,
        platform: c.platform,
        url: normalizeUrl(c.url),
        handle: handle ? '@' + handle : '',
        followers: c.followers ?? 0,
        status: 'VERIFIED' as const,
        active: true,
        badgeExpiresAt: c.badgeExpiresAt,
        verifiedAt: s.verifiedAt,
      };
    }),
  };
}

/**
 * The single read point of the KOL directory for every phase-3 service.
 * `extra` entries (e.g. phase-2 approved KOLs) are appended unless their kolId is already in the seed directory.
 */
export function readDirectory(state: DemoState, extra: DirectoryKol[] = []): DirectoryKol[] {
  const base = state.directory ?? [];
  if (extra.length === 0) return base;
  const ids = new Set(base.map((k) => k.kolId));
  const seen = new Set<string>();
  const added = extra.filter((k) => {
    if (ids.has(k.kolId) || seen.has(k.kolId)) return false;
    seen.add(k.kolId);
    return true;
  });
  return [...base, ...added];
}
