// Search / filter / sort inside one saved list (client side; a list holds at most a few hundred KOLs).
// State lives in the URL next to `ds` (selected list) and `kol` (profile sheet).
import { normalizeText, type SavedListRow } from '../../services';

export type BadgeFilter = 'tat-ca' | 'con-hieu-luc' | 'het-han' | 'ngung-hoat-dong';
export type ListSort = 'moi-luu' | 'nguoi-theo-doi' | 'ten';

export interface ListView {
  q: string;
  status: BadgeFilter;
  /** "Lĩnh vực hoạt động" name, '' = all. */
  field: string;
  sort: ListSort;
}

export const DEFAULT_VIEW: ListView = { q: '', status: 'tat-ca', field: '', sort: 'moi-luu' };

export const BADGE_FILTERS: { key: Exclude<BadgeFilter, 'tat-ca'>; label: string }[] = [
  { key: 'con-hieu-luc', label: 'Còn hiệu lực' },
  { key: 'het-han', label: 'Hết hạn' },
  { key: 'ngung-hoat-dong', label: 'Ngừng hoạt động' },
];

export const LIST_SORTS: { key: ListSort; label: string }[] = [
  { key: 'moi-luu', label: 'Mới lưu nhất' },
  { key: 'nguoi-theo-doi', label: 'Người theo dõi cao nhất' },
  { key: 'ten', label: 'Tên A–Z' },
];

/** URL keys of the view (Vietnamese slugs, like the other Brand pages). */
export const VIEW_PARAMS = { q: 'q', status: 'trangThai', field: 'linhVuc', sort: 'sapXep' } as const;

const isBadgeFilter = (v: string | null): v is BadgeFilter => v === 'tat-ca' || BADGE_FILTERS.some((f) => f.key === v);
const isSort = (v: string | null): v is ListSort => LIST_SORTS.some((s) => s.key === v);

export function parseListView(sp: URLSearchParams): ListView {
  const status = sp.get(VIEW_PARAMS.status);
  const sort = sp.get(VIEW_PARAMS.sort);
  return {
    q: sp.get(VIEW_PARAMS.q) ?? '',
    status: isBadgeFilter(status) ? status : DEFAULT_VIEW.status,
    field: (sp.get(VIEW_PARAMS.field) ?? '').trim(),
    sort: isSort(sort) ? sort : DEFAULT_VIEW.sort,
  };
}

/** Returns a copy of `sp` with `patch` applied; default values are removed so URLs stay short. */
export function writeListView(sp: URLSearchParams, patch: Partial<ListView>): URLSearchParams {
  const out = new URLSearchParams(sp);
  for (const key of Object.keys(patch) as (keyof ListView)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    if (value === DEFAULT_VIEW[key] || (key === 'q' && !value.trim())) out.delete(VIEW_PARAMS[key]);
    else out.set(VIEW_PARAMS[key], value);
  }
  return out;
}

/** The keys to drop when the selected list changes or "Xoá bộ lọc" is pressed (sort is kept). */
export function clearFilters(sp: URLSearchParams): URLSearchParams {
  return writeListView(sp, { q: '', status: DEFAULT_VIEW.status, field: '' });
}

export function hasActiveView(v: ListView): boolean {
  return !!v.q.trim() || v.status !== 'tat-ca' || !!v.field;
}

function matchesStatus(r: SavedListRow, f: BadgeFilter): boolean {
  switch (f) {
    case 'tat-ca':
      return true;
    case 'con-hieu-luc':
      return r.status === 'VISIBLE';
    case 'het-han':
      return r.status === 'BADGE_EXPIRED';
    case 'ngung-hoat-dong':
      return r.status === 'INACTIVE' || r.status === 'UNAVAILABLE';
  }
}

const collator = new Intl.Collator('vi', { sensitivity: 'base' });
const time = (iso: string) => Date.parse(iso) || 0;

export function applyListView(rows: SavedListRow[], v: ListView): SavedListRow[] {
  const kw = normalizeText(v.q).replace(/^@/, '').trim();
  const out = rows.filter((r) => {
    if (!matchesStatus(r, v.status)) return false;
    if (v.field && !r.fields.some((f) => f.name === v.field)) return false;
    if (kw) {
      const hay = normalizeText([r.displayName, r.handle ?? '', r.kolId].join(' '));
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
  const newest = (a: SavedListRow, b: SavedListRow) => time(b.addedAt) - time(a.addedAt);
  const cmp: Record<ListSort, (a: SavedListRow, b: SavedListRow) => number> = {
    'moi-luu': newest,
    'nguoi-theo-doi': (a, b) => b.totalFollowers - a.totalFollowers || newest(a, b),
    ten: (a, b) => collator.compare(a.displayName, b.displayName) || newest(a, b),
  };
  return out.sort(cmp[v.sort]);
}

/** Distinct field names present in the list, for the "Lĩnh vực" filter. */
export function fieldOptions(rows: SavedListRow[]): string[] {
  const names = new Set<string>();
  for (const r of rows) for (const f of r.fields) names.add(f.name);
  return [...names].sort(collator.compare);
}

export interface ListSummary {
  verified: number;
  expired: number;
  /** INACTIVE + UNAVAILABLE. */
  inactive: number;
  totalFollowers: number;
}

export function summarizeRows(rows: SavedListRow[]): ListSummary {
  const s: ListSummary = { verified: 0, expired: 0, inactive: 0, totalFollowers: 0 };
  for (const r of rows) {
    if (r.status === 'VISIBLE') s.verified += 1;
    else if (r.status === 'BADGE_EXPIRED') s.expired += 1;
    else s.inactive += 1;
    s.totalFollowers += r.totalFollowers;
  }
  return s;
}
