// Pure helpers shared by the list pages that offer "Bảng / Thẻ" views (no React here, unit-tested).

/** "Bảng" (table) or "Thẻ" (3-column cards). */
export type ListView = 'table' | 'cards';

/** ?xem=bang | ?xem=the */
export const VIEW_PARAM = 'xem';
const VIEW_VALUE: Record<ListView, string> = { table: 'bang', cards: 'the' };

/** Viewport from which the table is the default view (Tailwind `lg`). */
export const TABLE_DEFAULT_QUERY = '(min-width: 1024px)';

/** The URL value wins; without one (or an unknown one) → table on desktop, cards on smaller screens. */
export function parseListView(value: string | null | undefined, isDesktop: boolean): ListView {
  if (value === VIEW_VALUE.table) return 'table';
  if (value === VIEW_VALUE.cards) return 'cards';
  return isDesktop ? 'table' : 'cards';
}

export const listViewValue = (v: ListView) => VIEW_VALUE[v];

/** Copy of `prev` with ?xem= set to the chosen view (always written, so the choice survives a resize). */
export function withListView(prev: URLSearchParams, v: ListView): URLSearchParams {
  const sp = new URLSearchParams(prev);
  sp.set(VIEW_PARAM, VIEW_VALUE[v]);
  return sp;
}

export type AriaSort = 'ascending' | 'descending' | 'none';

/**
 * aria-sort of a sortable column: its own direction when the list is sorted by it, 'none' otherwise.
 * `columns` maps each column to the list sort it applies and the direction that sort reads in.
 */
export function ariaSortOf<C extends string, S extends string>(
  columns: Record<C, { sort: S; dir: Exclude<AriaSort, 'none'> }>,
  column: C,
  current: S,
): AriaSort {
  const c = columns[column];
  return c.sort === current ? c.dir : 'none';
}

/** Header checkbox state for the visible rows. */
export function selectionState(selected: ReadonlySet<string>, ids: readonly string[]): 'none' | 'some' | 'all' {
  const n = ids.filter((id) => selected.has(id)).length;
  if (n === 0) return 'none';
  return n === ids.length ? 'all' : 'some';
}

/** Header checkbox click: select every visible row, or clear them when all are already selected. */
export function toggleAllSelection(selected: ReadonlySet<string>, ids: readonly string[]): Set<string> {
  const next = new Set(selected);
  if (selectionState(selected, ids) === 'all') ids.forEach((id) => next.delete(id));
  else ids.forEach((id) => next.add(id));
  return next;
}

export function toggleSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
