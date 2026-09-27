import {
  SEARCH_PAGE_SIZE,
  type DirectoryKol,
  type KolSearchItem,
  type KolSearchQuery,
  type KolSearchResult,
  type Platform,
} from '../bizTypes';
import type { Db } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import {
  isLinkKeyword,
  listingStatus,
  normalizeText,
  normalizeUrl,
  readDirectory,
  scaleOf,
  searchableChannels,
  totalFollowers,
} from './directory';

export interface SearchServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
}

function uniquePlatforms(k: DirectoryKol, now: number): Platform[] {
  const out: Platform[] = [];
  for (const c of searchableChannels(k, now)) if (!out.includes(c.platform)) out.push(c.platform);
  return out;
}

/** Relevance score of one KOL for a normalised keyword; null = no match. */
function score(k: DirectoryKol, kw: string, now: number): number | null {
  if (!kw) return 0;
  if (isLinkKeyword(kw)) {
    const needle = normalizeUrl(kw);
    if (!needle) return null;
    return searchableChannels(k, now).some((c) => normalizeUrl(c.url).includes(needle)) ? 80 : null;
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

function toItem(k: DirectoryKol, now: number): KolSearchItem {
  const followers = totalFollowers(k, now);
  const item: KolSearchItem = {
    kolId: k.kolId,
    displayName: k.displayName,
    nickname: k.nickname,
    totalFollowers: followers,
    scale: scaleOf(followers),
    platforms: uniquePlatforms(k, now),
    verifiedAt: k.verifiedAt,
  };
  if (k.avatar) item.avatar = k.avatar;
  if (k.category) item.category = k.category;
  if (k.region) item.region = k.region;
  return item;
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

    const scored: { k: DirectoryKol; score: number; followers: number }[] = [];
    for (const k of readDirectory(state)) {
      if (listingStatus(k, t) !== 'VISIBLE') continue;
      if (q.category && k.category !== q.category) continue;
      if (q.region && k.region !== q.region) continue;
      const followers = totalFollowers(k, t);
      if (q.scale && scaleOf(followers) !== q.scale) continue;
      if (q.platforms && q.platforms.length > 0) {
        const own = uniquePlatforms(k, t);
        if (!q.platforms.some((p) => own.includes(p))) continue;
      }
      const s = score(k, kw, t);
      if (s === null) continue;
      scored.push({ k, score: s, followers });
    }

    const byId = (a: { k: DirectoryKol }, b: { k: DirectoryKol }) => (a.k.kolId < b.k.kolId ? -1 : a.k.kolId > b.k.kolId ? 1 : 0);
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
      items: scored.slice(start, start + SEARCH_PAGE_SIZE).map((x) => toItem(x.k, t)),
      total,
      page,
      pageCount,
      pageSize: SEARCH_PAGE_SIZE,
    };
  }

  return { search };
}

export type SearchService = ReturnType<typeof createSearchService>;
