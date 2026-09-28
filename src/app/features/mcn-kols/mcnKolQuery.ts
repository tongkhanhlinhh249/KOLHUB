// URL state and pure list logic of the MCN "Quản lý KOL" page.
import { normalizeText, type KolCategory, type McnKolRow } from '../../services';

export type McnKolSort = 'newest' | 'channels' | 'followers' | 'name';

export interface McnKolQuery {
  keyword?: string;
  category?: KolCategory;
  sort: McnKolSort;
}

export const MCN_KOL_SORT_OPTIONS: { key: McnKolSort; label: string }[] = [
  { key: 'newest', label: 'Gán gần nhất' },
  { key: 'channels', label: 'Nhiều kênh nhất' },
  { key: 'followers', label: 'Nhiều người theo dõi' },
  { key: 'name', label: 'Tên A → Z' },
];

const SORTS: McnKolSort[] = MCN_KOL_SORT_OPTIONS.map((o) => o.key);

/** ?q=…&linh-vuc=…&sap-xep=channels (unknown values fall back to defaults). */
export function parseMcnKolParams(p: URLSearchParams, categories: readonly string[]): McnKolQuery {
  const sortRaw = p.get('sap-xep') as McnKolSort | null;
  const q: McnKolQuery = { sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : 'newest' };
  const kw = p.get('q')?.trim();
  if (kw) q.keyword = kw;
  const cat = p.get('linh-vuc');
  if (cat && categories.includes(cat)) q.category = cat as KolCategory;
  return q;
}

/** Write the query into `prev`, keeping unrelated params. */
export function mergeMcnKolParams(prev: URLSearchParams, q: McnKolQuery): URLSearchParams {
  const next = new URLSearchParams(prev);
  const set = (k: string, v: string | undefined) => (v ? next.set(k, v) : next.delete(k));
  set('q', q.keyword?.trim() || undefined);
  set('linh-vuc', q.category);
  set('sap-xep', q.sort === 'newest' ? undefined : q.sort);
  return next;
}

export const hasMcnKolFilters = (q: McnKolQuery) => !!q.keyword || !!q.category;

function matches(r: McnKolRow, q: McnKolQuery): boolean {
  if (q.category && r.category !== q.category) return false;
  if (q.keyword) {
    const kw = normalizeText(q.keyword);
    if (!normalizeText(r.displayName).includes(kw) && !normalizeText(r.kolId).includes(kw)) return false;
  }
  return true;
}

export function applyMcnKolQuery(rows: McnKolRow[], q: McnKolQuery): McnKolRow[] {
  const cmp: Record<McnKolSort, (a: McnKolRow, b: McnKolRow) => number> = {
    newest: (a, b) => (b.lastAssignedAt ?? 0) - (a.lastAssignedAt ?? 0),
    channels: (a, b) => b.assignedChannelCount - a.assignedChannelCount,
    followers: (a, b) => b.totalFollowers - a.totalFollowers,
    name: (a, b) => a.displayName.localeCompare(b.displayName, 'vi'),
  };
  return rows.filter((r) => matches(r, q)).sort((a, b) => cmp[q.sort](a, b) || a.kolId.localeCompare(b.kolId));
}

/** Link to the MCN channel list filtered by this KOL. */
export const assignedChannelsPath = (kolId: string) => `/ho-so-mcn/kenh?kol=${encodeURIComponent(kolId)}`;
