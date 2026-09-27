import {
  PROFILE_VIDEO_LIMIT,
  SEARCH_PAGE_SIZE,
  SEARCH_VIDEO_LIMIT,
  type KolPublicProfile,
  type KolSearchItem,
  type KolSearchQuery,
  type KolSearchResult,
} from '../bizTypes';
import { KolhubError } from '../types';
import type { Db } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import { findPublicKol, isLinkKeyword, isSearchableChannel, normalizeText, normalizeUrl, toPublicKol, type PublicKol } from './directory';

export interface SearchServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
}

/** Relevance score of one KOL for a normalised keyword; null = no match. */
function score(k: PublicKol, kw: string, urls: string[]): number | null {
  if (!kw) return 0;
  if (isLinkKeyword(kw)) {
    const needle = normalizeUrl(kw);
    if (!needle) return null;
    return urls.some((u) => normalizeUrl(u).includes(needle)) ? 80 : null;
  }
  const id = normalizeText(k.kolId);
  const name = normalizeText(k.displayName);
  const nick = normalizeText(k.nickname);
  let best: number | null = null;
  const take = (ok: boolean, s: number) => {
    if (ok && (best === null || s > best)) best = s;
  };
  take(id === kw, 100);
  take(id.includes(kw), 70);
  take(name.startsWith(kw), 60);
  take(nick.startsWith(kw), 50);
  take(name.includes(kw), 40);
  take(nick.includes(kw), 30);
  return best;
}

function toItem(k: PublicKol): KolSearchItem {
  const item: KolSearchItem = {
    kolId: k.kolId,
    displayName: k.displayName,
    nickname: k.nickname,
    bio: k.bio,
    totalFollowers: k.totalFollowers,
    scale: k.scale,
    platforms: [...k.platforms],
    channels: k.searchChannels.map((c) => ({ ...c })),
    fields: k.fields.map((f) => ({ ...f })),
    latestVideos: k.latestVideos.filter((v) => k.platforms.includes(v.platform)).slice(0, SEARCH_VIDEO_LIMIT),
    verifiedAt: k.verifiedAt,
  };
  if (k.avatar) item.avatar = k.avatar;
  if (k.category) item.category = k.category;
  if (k.region) item.region = k.region;
  return item;
}

function toProfile(k: PublicKol): KolPublicProfile {
  const profile: KolPublicProfile = {
    kolId: k.kolId,
    displayName: k.displayName,
    nickname: k.nickname,
    bio: k.bio,
    collabEmail: k.collabEmail,
    totalFollowers: k.totalFollowers,
    scale: k.scale,
    listingStatus: k.listingStatus,
    verifiedAt: k.verifiedAt,
    channels: k.channels.map((c) => ({ ...c, latestVideos: c.latestVideos.map((v) => ({ ...v })) })),
    fields: k.fields.map((f) => ({ ...f })),
    latestVideos: k.latestVideos.slice(0, PROFILE_VIDEO_LIMIT),
  };
  if (k.avatar) profile.avatar = k.avatar;
  if (k.category) profile.category = k.category;
  if (k.region) profile.region = k.region;
  return profile;
}

/** Mock KOL search for Brand/Agency accounts (FR-15, BR-53..57). */
export function createSearchService(deps: SearchServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  async function search(q: KolSearchQuery): Promise<KolSearchResult> {
    await wait();
    const state = db.read();
    currentBizAccount(state);
    const t = now();
    const kw = normalizeText(q.keyword ?? '');
    const sort = q.sort ?? 'relevance';

    const scored: { k: PublicKol; score: number; followers: number }[] = [];
    for (const p of state.kolProfiles) {
      const k = toPublicKol(p, state.channels, t);
      if (!k) continue;
      if (q.category && k.category !== q.category) continue;
      if (q.region && k.region !== q.region) continue;
      if (q.scale && k.scale !== q.scale) continue;
      if (q.platforms && q.platforms.length > 0 && !q.platforms.some((pl) => k.platforms.includes(pl))) continue;
      const urls = state.channels.filter((c) => c.ownerId === p.accountId && isSearchableChannel(c, t)).map((c) => c.url);
      const s = score(k, kw, urls);
      if (s === null) continue;
      scored.push({ k, score: s, followers: k.totalFollowers });
    }

    const byId = (a: { k: PublicKol }, b: { k: PublicKol }) => (a.k.kolId < b.k.kolId ? -1 : a.k.kolId > b.k.kolId ? 1 : 0);
    scored.sort((a, b) => {
      if (sort === 'newest') {
        const d = Date.parse(b.k.verifiedAt) - Date.parse(a.k.verifiedAt);
        return d || byId(a, b);
      }
      if (sort === 'relevance' && b.score !== a.score) return b.score - a.score;
      return b.followers - a.followers || byId(a, b);
    });

    const total = scored.length;
    const pageCount = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
    const raw = q.page;
    let page = typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 ? raw : 1;
    if (page > pageCount) page = pageCount;
    const start = (page - 1) * SEARCH_PAGE_SIZE;

    return {
      items: scored.slice(start, start + SEARCH_PAGE_SIZE).map((x) => toItem(x.k)),
      total,
      page,
      pageCount,
      pageSize: SEARCH_PAGE_SIZE,
    };
  }

  /** Public profile, built field by field from a whitelist so private data can never leak (BR-58). */
  async function getKolPublicProfile(kolId: string): Promise<KolPublicProfile> {
    await wait();
    const state = db.read();
    currentBizAccount(state);
    const k = findPublicKol(state, kolId, now());
    if (!k) throw new KolhubError('KOLHUB-4404');
    return toProfile(k);
  }

  return { search, getKolPublicProfile };
}

export type SearchService = ReturnType<typeof createSearchService>;
