// KOL directory = one public projection of registered KOL profiles (BR-54 searchable, BR-58 whitelist).
import {
  FIELD_LIMIT,
  PROFILE_VIDEO_LIMIT,
  KOL_CATEGORIES,
  KOL_REGIONS,
  KOL_SCALES,
  PLATFORMS,
  type ActivityField,
  type BadgeState,
  type KolCategory,
  type KolListingStatus,
  type KolRegion,
  type KolScale,
  type KolSearchChannel,
  type LatestVideo,
  type Platform,
  type PublicChannel,
} from '../bizTypes';
import type { Channel, KolProfile } from '../profile-types';
import type { KolSafetyReportState } from '../kol-safety-report-types';
import { publicShieldOf } from './contentShield';
import type { DemoState } from './db';
import { channelTotals } from './socialListening';

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

export function scaleOf(followers: number): KolScale {
  const band = KOL_SCALES.find((s) => followers >= s.min && followers < s.max);
  return band ? band.key : 'nano';
}

/** Public badge of a channel: VERIFIED (unexpired), EXPIRED (by status or date), null = never badged / in review. */
export function channelBadge(ch: Pick<Channel, 'status' | 'badgeExpiresAt'>, now: number): BadgeState | null {
  if (ch.status === 'EXPIRED') return 'EXPIRED';
  if (ch.status !== 'VERIFIED') return null;
  if (ch.badgeExpiresAt === undefined || ch.badgeExpiresAt <= now) return 'EXPIRED';
  return 'VERIFIED';
}

/** BR-54: verified, unexpired and active. */
export function isSearchableChannel(ch: Channel, now: number): boolean {
  return channelBadge(ch, now) === 'VERIFIED' && ch.active;
}

export function listingStatus(channels: Channel[], now: number): Exclude<KolListingStatus, 'UNAVAILABLE'> {
  if (channels.some((c) => isSearchableChannel(c, now))) return 'VISIBLE';
  if (channels.some((c) => channelBadge(c, now) === 'VERIFIED')) return 'INACTIVE';
  return 'BADGE_EXPIRED';
}

/** Everything a Brand may see about a KOL (BR-58 whitelist). Built only by `publicKolOf`. */
export interface PublicKol {
  kolId: string;
  displayName: string;
  nickname: string;
  avatar?: string;
  bio: string;
  category?: KolCategory;
  region?: KolRegion;
  collabEmail: string | null;
  /** ISO date the profile was approved. */
  verifiedAt: string;
  listingStatus: Exclude<KolListingStatus, 'UNAVAILABLE'>;
  /** 0–3 "Lĩnh vực hoạt động". */
  fields: ActivityField[];
  /** Active channels that have (or had) a badge — the public profile list. */
  channels: PublicChannel[];
  /** Only the channels that make the KOL searchable (BR-54). */
  searchChannels: KolSearchChannel[];
  /** Platforms of `searchChannels`, first-seen order. */
  platforms: Platform[];
  /** Sum of followers of `searchChannels`. */
  totalFollowers: number;
  scale: KolScale;
  /** Videos of the public channels (never Instagram, BR-20), newest first. */
  latestVideos: LatestVideo[];
}

const KNOWN_PLATFORMS = new Set<string>(PLATFORMS.map((p) => p.key));
const emptyToNull = (s: string | undefined) => (s && s.trim() ? s.trim() : null);

/** Channel URL as shown to brands: no protocol / www. / trailing slash (the UI prefixes https://). */
function displayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/^(www|m)\./i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
}

function publicFields(profile: KolProfile, category: KolCategory | undefined): ActivityField[] {
  const src = profile.contact.fields?.length ? profile.contact.fields : category ? [{ name: category, medal: 'none' as const }] : [];
  return src.slice(0, FIELD_LIMIT).map((f) => ({
    name: f.name,
    medal: f.medal === 'gold' || f.medal === 'silver' ? f.medal : 'none',
  }));
}

function publicVideos(channels: Channel[]): LatestVideo[] {
  const out: LatestVideo[] = [];
  for (const c of channels) {
    for (const v of c.stats?.latestVideos ?? []) {
      if (!KNOWN_PLATFORMS.has(v.platform) || v.platform !== c.platform || !v.thumbnail) continue;
      const video: LatestVideo = { platform: v.platform, thumbnail: v.thumbnail };
      if (v.url) video.url = v.url;
      if (v.title) video.title = v.title;
      if (v.publishedAt) video.publishedAt = v.publishedAt;
      out.push(video);
    }
  }
  const at = (v: LatestVideo) => (v.publishedAt ? Date.parse(v.publishedAt) : 0);
  return out.map((v, i) => ({ v, i })).sort((a, b) => at(b.v) - at(a.v) || a.i - b.i).map((x) => x.v);
}

/**
 * Public projection of any approved KOL that has ever had a badged channel, whatever its listing
 * status (the public profile and saved lists still open for BADGE_EXPIRED / INACTIVE KOLs, BR-62).
 * `channels` may be all channels of the state; only the profile owner's are used.
 */
/** Shield of a channel as brands see it, from the KOL Safety states (any owner). */
export function shieldOfChannel(reports: KolSafetyReportState[] | undefined, channelId: string, now: number) {
  return publicShieldOf(reports?.find((r) => r.channelId === channelId && r.shield)?.shield, now);
}

export function publicKolOf(profile: KolProfile, channels: Channel[], now: number, reports?: KolSafetyReportState[]): PublicKol | null {
  if (profile.status !== 'APPROVED' || !profile.kolId) return null;
  const own = channels.filter((c) => c.ownerId === profile.accountId && c.ownerType === 'KOL');
  if (!own.some((c) => c.status === 'VERIFIED' || c.status === 'EXPIRED')) return null;

  const shown = own.filter((c) => c.active && channelBadge(c, now) !== null);
  const searchable = own.filter((c) => isSearchableChannel(c, now));
  const followersOf = (c: Channel) => c.stats?.followers ?? 0;
  const platforms: Platform[] = [];
  for (const c of searchable) if (!platforms.includes(c.platform)) platforms.push(c.platform);
  const totalFollowers = searchable.reduce((sum, c) => sum + followersOf(c), 0);

  const { contact } = profile;
  const category = (KOL_CATEGORIES as readonly string[]).includes(contact.category) ? (contact.category as KolCategory) : undefined;
  const region = (KOL_REGIONS as readonly string[]).includes(contact.province) ? (contact.province as KolRegion) : undefined;
  const handleSrc = shown.find((c) => c.handle) ?? own.find((c) => c.handle);

  const kol: PublicKol = {
    kolId: profile.kolId,
    displayName: contact.displayName,
    nickname: (handleSrc?.handle ?? '').replace(/^@/, ''),
    bio: contact.bio ?? '',
    collabEmail: emptyToNull(contact.email),
    verifiedAt: new Date(profile.approvedAt ?? profile.decidedAt ?? now).toISOString(),
    listingStatus: listingStatus(own, now),
    fields: publicFields(profile, category),
    channels: shown.map((c) => ({
      platform: c.platform,
      url: displayUrl(c.url),
      handle: c.handle,
      followers: followersOf(c),
      ...channelTotals(c.url, followersOf(c)),
      latestVideos: publicVideos([c]).slice(0, PROFILE_VIDEO_LIMIT),
      badge: channelBadge(c, now)!,
      badgeExpiresAt: c.badgeExpiresAt !== undefined ? new Date(c.badgeExpiresAt).toISOString() : '',
      ...(shieldOfChannel(reports, c.id, now) ? { contentShield: shieldOfChannel(reports, c.id, now) } : {}),
    })),
    searchChannels: searchable.map((c) => ({ platform: c.platform, followers: followersOf(c), badge: 'VERIFIED' as const })),
    platforms,
    totalFollowers,
    scale: scaleOf(totalFollowers),
    latestVideos: publicVideos(shown),
  };
  if (profile.avatar?.thumbnail) kol.avatar = profile.avatar.thumbnail;
  if (category) kol.category = category;
  if (region) kol.region = region;
  return kol;
}

/** The single search projection: null unless the KOL is searchable (BR-54: ≥ 1 channel verified + active + unexpired). */
export function toPublicKol(profile: KolProfile, channels: Channel[], now: number, reports?: KolSafetyReportState[]): PublicKol | null {
  const kol = publicKolOf(profile, channels, now, reports);
  return kol && kol.listingStatus === 'VISIBLE' ? kol : null;
}

/** Public projections of every approved KOL in the state (any listing status). */
export function listPublicKols(state: DemoState, now: number): PublicKol[] {
  const out: PublicKol[] = [];
  for (const p of state.kolProfiles) {
    const k = publicKolOf(p, state.channels, now, state.kolSafetyReports);
    if (k) out.push(k);
  }
  return out;
}

export function findPublicKol(state: DemoState, kolId: string, now: number): PublicKol | null {
  const p = state.kolProfiles.find((x) => x.kolId === kolId);
  return p ? publicKolOf(p, state.channels, now, state.kolSafetyReports) : null;
}
