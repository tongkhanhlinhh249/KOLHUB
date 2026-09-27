// URL state and pure list logic of the MCN "Quản lý KOL" page.
import { mcnKolTabOf, normalizeText, type KolCategory, type McnKolRow, type McnKolTab } from '../../services';

export type McnKolSort = 'newest' | 'followers' | 'name';

export interface McnKolQuery {
  tab: McnKolTab;
  keyword?: string;
  category?: KolCategory;
  sort: McnKolSort;
}

export const MCN_KOL_TABS: { key: McnKolTab; label: string }[] = [
  { key: 'ACTIVE', label: 'Đang quản lý' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'CLOSED', label: 'Đã kết thúc' },
];

export const MCN_KOL_SORT_OPTIONS: { key: McnKolSort; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'followers', label: 'Nhiều người theo dõi' },
  { key: 'name', label: 'Tên A → Z' },
];

const TAB_PARAM: Record<McnKolTab, string> = { ACTIVE: 'dang-quan-ly', PENDING: 'cho-xac-nhan', CLOSED: 'da-ket-thuc' };
const SORTS: McnKolSort[] = ['newest', 'followers', 'name'];

/** ?tab=cho-xac-nhan&q=…&linh-vuc=…&sap-xep=followers (unknown values fall back to defaults). */
export function parseMcnKolParams(p: URLSearchParams, categories: readonly string[]): McnKolQuery {
  const tabRaw = p.get('tab');
  const tab = (Object.keys(TAB_PARAM) as McnKolTab[]).find((k) => TAB_PARAM[k] === tabRaw) ?? 'ACTIVE';
  const sortRaw = p.get('sap-xep') as McnKolSort | null;
  const q: McnKolQuery = { tab, sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : 'newest' };
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
  set('tab', q.tab === 'ACTIVE' ? undefined : TAB_PARAM[q.tab]);
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

/** Tab counts after keyword/category filters. */
export function countMcnKolTabs(rows: McnKolRow[], q: McnKolQuery): Record<McnKolTab, number> {
  const out: Record<McnKolTab, number> = { ACTIVE: 0, PENDING: 0, CLOSED: 0 };
  for (const r of rows) if (matches(r, q)) out[mcnKolTabOf(r.status)]++;
  return out;
}

/** "Mới nhất" = latest event of the row (ended / answered / invited). */
const lastEvent = (r: McnKolRow) => r.endedAt ?? r.respondedAt ?? r.invitedAt;

export function applyMcnKolQuery(rows: McnKolRow[], q: McnKolQuery): McnKolRow[] {
  const shown = rows.filter((r) => mcnKolTabOf(r.status) === q.tab && matches(r, q));
  const cmp: Record<McnKolSort, (a: McnKolRow, b: McnKolRow) => number> = {
    newest: (a, b) => lastEvent(b) - lastEvent(a),
    followers: (a, b) => b.totalFollowers - a.totalFollowers,
    name: (a, b) => a.displayName.localeCompare(b.displayName, 'vi'),
  };
  return [...shown].sort((a, b) => cmp[q.sort](a, b) || a.kolId.localeCompare(b.kolId));
}

/** Link to the MCN channel list filtered by this KOL (the filter itself arrives in phase 2). */
export const assignedChannelsPath = (kolId: string) => `/ho-so-mcn/kenh?kol=${encodeURIComponent(kolId)}`;
