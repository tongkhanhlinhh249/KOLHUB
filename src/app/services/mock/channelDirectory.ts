// Brand "Danh sách kênh": every searchable channel (BR-54) with its owner KOL's public info (BR-58).
import type { LatestVideo } from '../bizTypes';
import {
  CHANNEL_PAGE_SIZE,
  type ChannelDirectoryDetail,
  type ChannelDirectoryItem,
  type ChannelDirectoryQuery,
  type ChannelDirectoryResult,
} from '../channel-directory-types';
import type { Channel } from '../profile-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import { channelContent } from './socialListening';
import { PROFILE_VIDEO_LIMIT } from '../bizTypes';
import { isLinkKeyword, isSearchableChannel, normalizeText, normalizeUrl, publicKolOf, scaleOf, type PublicKol } from './directory';

export interface ChannelDirectoryDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

const displayUrl = (url: string) =>
  url.trim().replace(/^https?:\/\//i, '').replace(/^(www|m)\./i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');

function newestVideo(c: Channel): LatestVideo | undefined {
  const at = (v: LatestVideo) => (v.publishedAt ? Date.parse(v.publishedAt) : 0);
  const list = (c.stats?.latestVideos ?? []).filter((v) => v.platform === c.platform && v.thumbnail);
  if (!list.length) return undefined;
  const v = list.reduce((best, x) => (at(x) > at(best) ? x : best));
  const out: LatestVideo = { platform: v.platform, thumbnail: v.thumbnail };
  if (v.url) out.url = v.url;
  if (v.title) out.title = v.title;
  if (v.publishedAt) out.publishedAt = v.publishedAt;
  return out;
}

/** One directory row, built field by field from the channel and its owner's public projection. */
function itemOf(c: Channel, k: PublicKol): ChannelDirectoryItem {
  const followers = c.stats?.followers ?? 0;
  const item: ChannelDirectoryItem = {
    channelId: c.id,
    platform: c.platform,
    handle: (c.handle || displayUrl(c.url).split('/')[1] || '').replace(/^@/, ''),
    url: displayUrl(c.url),
    followers,
    scale: scaleOf(followers),
    verifiedAt: new Date(c.verifiedAt ?? c.updatedAt).toISOString(),
    badgeExpiresAt: new Date(c.badgeExpiresAt!).toISOString(),
    kolId: k.kolId,
    displayName: k.displayName,
    fields: k.fields.map((f) => ({ ...f })),
  };
  const video = newestVideo(c);
  if (video) item.latestVideo = video;
  if (k.avatar) item.avatar = k.avatar;
  if (k.category) item.category = k.category;
  if (k.region) item.region = k.region;
  return item;
}

/** One row per searchable KOL channel, built field by field from the public projection. */
export function listDirectoryChannels(state: DemoState, now: number): ChannelDirectoryItem[] {
  const kols = new Map<string, PublicKol>();
  for (const p of state.kolProfiles) {
    const k = publicKolOf(p, state.channels, now);
    if (k) kols.set(p.accountId, k);
  }
  const out: ChannelDirectoryItem[] = [];
  for (const c of state.channels) {
    if (c.ownerType !== 'KOL' || !isSearchableChannel(c, now)) continue;
    const k = kols.get(c.ownerId);
    if (k) out.push(itemOf(c, k));
  }
  return out;
}

/** "Chi tiết kênh" of one searchable KOL channel (BR-54), public fields only (BR-58); null otherwise. */
export function findDirectoryChannel(state: DemoState, channelId: string, now: number): ChannelDirectoryDetail | null {
  const c = state.channels.find((x) => x.id === channelId);
  if (!c || c.ownerType !== 'KOL' || !isSearchableChannel(c, now)) return null;
  const profile = state.kolProfiles.find((p) => p.accountId === c.ownerId);
  const k = profile ? publicKolOf(profile, state.channels, now) : null;
  if (!k) return null;
  const item = itemOf(c, k);
  const pub = k.channels.find((pc) => pc.platform === c.platform && pc.url === item.url);
  return {
    ...item,
    views: pub?.views ?? 0,
    videoCount: pub?.videoCount ?? 0,
    likes: pub?.likes ?? 0,
    latestVideos: channelContent(c, PROFILE_VIDEO_LIMIT),
  };
}

function matchesKeyword(item: ChannelDirectoryItem, kw: string): boolean {
  if (!kw) return true;
  if (isLinkKeyword(kw) && !kw.startsWith('@')) {
    const needle = normalizeUrl(kw);
    return !!needle && normalizeUrl(item.url).includes(needle);
  }
  const bare = kw.replace(/^@/, '');
  return [item.handle, item.displayName, item.kolId, item.url].some((s) => normalizeText(s).includes(bare));
}

/** Mock channel list for Brand/Agency accounts (KOLHUB-4016 otherwise). */
export function createChannelDirectoryService(deps: ChannelDirectoryDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  async function list(q: ChannelDirectoryQuery = {}): Promise<ChannelDirectoryResult> {
    await wait();
    const state = db.read();
    currentBizAccount(state);
    const kw = normalizeText(q.keyword ?? '');
    const rows = listDirectoryChannels(state, now()).filter(
      (c) =>
        (!q.platforms?.length || q.platforms.includes(c.platform)) &&
        (!q.category || c.category === q.category) &&
        (!q.region || c.region === q.region) &&
        (!q.scale || c.scale === q.scale) &&
        matchesKeyword(c, kw),
    );

    const sort = q.sort ?? 'followers';
    const byId = (a: ChannelDirectoryItem, b: ChannelDirectoryItem) => (a.channelId < b.channelId ? -1 : a.channelId > b.channelId ? 1 : 0);
    rows.sort((a, b) => {
      if (sort === 'newest') return Date.parse(b.verifiedAt) - Date.parse(a.verifiedAt) || byId(a, b);
      if (sort === 'expiring') return Date.parse(a.badgeExpiresAt) - Date.parse(b.badgeExpiresAt) || byId(a, b);
      return b.followers - a.followers || byId(a, b);
    });

    const total = rows.length;
    const pageCount = Math.max(1, Math.ceil(total / CHANNEL_PAGE_SIZE));
    const raw = q.page;
    let page = typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 ? raw : 1;
    if (page > pageCount) page = pageCount;
    const start = (page - 1) * CHANNEL_PAGE_SIZE;
    return { items: rows.slice(start, start + CHANNEL_PAGE_SIZE), total, page, pageCount, pageSize: CHANNEL_PAGE_SIZE };
  }

  /** "Chi tiết kênh" for Brand/Agency (KOLHUB-4016 otherwise); KOLHUB-4406 when the channel is not listed. */
  async function getChannel(channelId: string): Promise<ChannelDirectoryDetail> {
    await wait();
    const state = db.read();
    currentBizAccount(state);
    const d = findDirectoryChannel(state, channelId, now());
    if (!d) throw new KolhubError('KOLHUB-4406');
    return d;
  }

  return { list, getChannel };
}

export type ChannelDirectoryService = ReturnType<typeof createChannelDirectoryService>;
