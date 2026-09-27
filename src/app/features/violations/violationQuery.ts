// Client-side filtering of a violation list (the lists are small; the service returns everything visible).
import { normalizeText } from '../../services';
import type { Platform, ViolationCategory, ViolationSeverity, ViolationSource, ViolationStatus } from '../../services';

/** Fields shared by the owner/Admin record and the Brand projection. */
export interface ViolationRowBase {
  id: string;
  kolId?: string;
  kolName?: string;
  platform: Platform;
  channelHandle: string;
  channelUrl: string;
  contentTitle: string;
  contentUrl?: string;
  thumbnail?: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  source: ViolationSource;
  detectedAt: number;
  status: ViolationStatus;
}

export type ViolationSort = 'newest' | 'oldest';
export type StatusTab = ViolationStatus | 'all';

export interface ViolationQuery {
  keyword?: string;
  platforms?: Platform[];
  severity?: ViolationSeverity;
  category?: ViolationCategory;
  status?: StatusTab;
  sort?: ViolationSort;
}

/** Keyword + filters (status excluded, so tab counts stay meaningful). */
export function matchesFilters(v: ViolationRowBase, q: ViolationQuery): boolean {
  if (q.platforms?.length && !q.platforms.includes(v.platform)) return false;
  if (q.severity && v.severity !== q.severity) return false;
  if (q.category && v.category !== q.category) return false;
  const kw = normalizeText(q.keyword ?? '').replace(/^@/, '');
  if (kw) {
    const hay = normalizeText([v.contentTitle, v.channelHandle, v.channelUrl, v.kolName ?? '', v.kolId ?? ''].join(' '));
    if (!hay.includes(kw)) return false;
  }
  return true;
}

export function applyViolationQuery<T extends ViolationRowBase>(list: T[], q: ViolationQuery): T[] {
  const status = q.status ?? 'all';
  const out = list.filter((v) => matchesFilters(v, q) && (status === 'all' || v.status === status));
  const dir = q.sort === 'oldest' ? 1 : -1;
  return out.sort((a, b) => dir * (a.detectedAt - b.detectedAt) || (a.id < b.id ? -1 : 1));
}

export function activeFilterCount(q: ViolationQuery): number {
  return (q.platforms?.length ? 1 : 0) + (q.severity ? 1 : 0) + (q.category ? 1 : 0);
}

export function hasActiveFilters(q: ViolationQuery): boolean {
  return activeFilterCount(q) > 0 || !!q.keyword?.trim();
}
