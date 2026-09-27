import {
  KOL_CATEGORIES,
  KOL_REGIONS,
  KOL_SCALES,
  PLATFORMS,
  type KolCategory,
  type KolRegion,
  type KolScale,
  type KolSearchQuery,
  type Platform,
  type SearchSort,
} from '../../services';

const SORTS: SearchSort[] = ['relevance', 'followers', 'newest'];

/** Result layout: full-width list rows (default) or grid of cards. */
export type SearchView = 'grid' | 'list';
const VIEWS: SearchView[] = ['list', 'grid'];

/** Page state kept in the URL: the service query plus the result layout (`view` is never sent to the service). */
export interface SearchPageQuery extends KolSearchQuery {
  view?: SearchView;
}

/** URL keys used by the search page. */
export const SEARCH_KEYS = ['q', 'linhVuc', 'khuVuc', 'quyMo', 'nenTang', 'sapXep', 'trang', 'view'] as const;

function oneOf<T extends string>(v: string | null, list: readonly T[]): T | undefined {
  return v !== null && (list as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** URL → query. Unknown values are dropped; missing sort → relevance; missing/bad page → 1; missing/unknown view → list. */
export function parseSearchParams(sp: URLSearchParams): SearchPageQuery {
  const q: SearchPageQuery = {};
  const keyword = sp.get('q');
  if (keyword && keyword.trim()) q.keyword = keyword;
  const category = oneOf<KolCategory>(sp.get('linhVuc'), KOL_CATEGORIES);
  if (category) q.category = category;
  const region = oneOf<KolRegion>(sp.get('khuVuc'), KOL_REGIONS);
  if (region) q.region = region;
  const scale = oneOf<KolScale>(
    sp.get('quyMo'),
    KOL_SCALES.map((s) => s.key),
  );
  if (scale) q.scale = scale;
  const platformKeys = PLATFORMS.map((p) => p.key);
  const platforms = (sp.get('nenTang') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s, i, arr): s is Platform => (platformKeys as string[]).includes(s) && arr.indexOf(s) === i);
  if (platforms.length > 0) q.platforms = platforms;
  q.sort = oneOf<SearchSort>(sp.get('sapXep'), SORTS) ?? 'relevance';
  const rawPage = sp.get('trang');
  const page = rawPage !== null && /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;
  q.page = Number.isInteger(page) && page >= 1 ? page : 1;
  q.view = oneOf<SearchView>(sp.get('view'), VIEWS) ?? 'list';
  return q;
}

/** Query → URL params, leaving out defaults (relevance, page 1, list view, empty values). */
export function toSearchParams(q: SearchPageQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.keyword && q.keyword.trim()) sp.set('q', q.keyword);
  if (q.category) sp.set('linhVuc', q.category);
  if (q.region) sp.set('khuVuc', q.region);
  if (q.scale) sp.set('quyMo', q.scale);
  if (q.platforms && q.platforms.length > 0) sp.set('nenTang', q.platforms.join(','));
  if (q.sort && q.sort !== 'relevance') sp.set('sapXep', q.sort);
  if (q.page && q.page > 1) sp.set('trang', String(q.page));
  if (q.view === 'grid') sp.set('view', 'grid');
  return sp;
}

/** The part of the page query the search service needs (drops `view`). */
export function toServiceQuery(q: SearchPageQuery): KolSearchQuery {
  const { view: _view, ...rest } = q;
  return rest;
}

/**
 * Apply a change; any change other than the page itself goes back to page 1.
 * Changing only the view keeps the page and filters.
 */
export function applyQueryPatch<Q extends SearchPageQuery>(q: Q, patch: Partial<SearchPageQuery>): Q {
  const next: Q = { ...q, ...patch };
  const keys = Object.keys(patch);
  const viewOnly = keys.length > 0 && keys.every((k) => k === 'view');
  if (!('page' in patch) && !viewOnly) next.page = 1;
  return next;
}

/** Keyword or any filter set (sort does not count). */
export function hasActiveFilters(q: KolSearchQuery): boolean {
  return !!(
    (q.keyword && q.keyword.trim()) ||
    q.category ||
    q.region ||
    q.scale ||
    (q.platforms && q.platforms.length > 0)
  );
}

/** Number of filters (not keyword, not sort) — shown on the mobile "Bộ lọc" button. */
export function activeFilterCount(q: KolSearchQuery): number {
  return [q.category, q.region, q.scale].filter(Boolean).length + (q.platforms?.length ? 1 : 0);
}
