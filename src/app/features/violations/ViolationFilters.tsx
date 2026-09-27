import { PLATFORMS, VIOLATION_CATEGORIES, VIOLATION_SEVERITIES, type ViolationCategory, type ViolationSeverity } from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect, type FilterOption } from '../filters/FilterSelect';
import { PlatformSelect } from '../filters/PlatformSelect';
import { SortSelect } from '../filters/SortSelect';
import { severityLabel } from './ViolationParts';
import { activeFilterCount, hasActiveFilters, type ViolationQuery, type ViolationSort } from './violationQuery';

const SORT_OPTIONS: FilterOption<ViolationSort>[] = [
  { key: 'newest', label: 'Mới phát hiện nhất' },
  { key: 'oldest', label: 'Cũ nhất' },
];

function chipsOf(q: ViolationQuery, onChange: (p: Partial<ViolationQuery>) => void): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const p of PLATFORMS.filter((x) => q.platforms?.includes(x.key))) {
    chips.push({ key: `p-${p.key}`, label: p.label, remove: () => onChange({ platforms: (q.platforms ?? []).filter((k) => k !== p.key) }) });
  }
  if (q.severity) chips.push({ key: 'severity', label: severityLabel(q.severity), remove: () => onChange({ severity: undefined }) });
  if (q.category) chips.push({ key: 'category', label: q.category, remove: () => onChange({ category: undefined }) });
  return chips;
}

/** Search · Nền tảng · Mức độ · Loại vi phạm · Sắp xếp (same FilterBar layout rules as the KOL search). */
export function ViolationFilters({
  query,
  onChange,
  onClear,
  searchPlaceholder,
  searchLabel,
}: {
  query: ViolationQuery;
  onChange(patch: Partial<ViolationQuery>): void;
  onClear(): void;
  searchPlaceholder: string;
  searchLabel: string;
}) {
  const filters = (cls?: string) => (
    <>
      <PlatformSelect value={query.platforms ?? []} onChange={(platforms) => onChange({ platforms })} className={cls} />
      <FilterSelect<ViolationSeverity>
        label="Mức độ"
        allLabel="Tất cả mức độ"
        value={query.severity}
        options={VIOLATION_SEVERITIES.map((s) => ({ key: s.key, label: s.label }))}
        onChange={(severity) => onChange({ severity })}
        className={cls}
      />
      <FilterSelect<ViolationCategory>
        label="Loại vi phạm"
        allLabel="Tất cả loại vi phạm"
        value={query.category}
        options={VIOLATION_CATEGORIES.map((c) => ({ key: c, label: c }))}
        onChange={(category) => onChange({ category })}
        className={cls}
      />
    </>
  );
  return (
    <FilterBar
      keyword={query.keyword}
      onKeywordChange={(keyword) => onChange({ keyword })}
      searchPlaceholder={searchPlaceholder}
      searchLabel={searchLabel}
      renderFilters={filters}
      filterGridClass="grid-cols-3"
      inlineFilterClass="@4xl:w-40"
      renderSort={(className) => (
        <SortSelect value={query.sort ?? 'newest'} options={SORT_OPTIONS} onChange={(sort) => onChange({ sort })} className={className} />
      )}
      filterCount={activeFilterCount(query)}
      active={hasActiveFilters(query)}
      chips={chipsOf(query, onChange)}
      onClear={onClear}
    />
  );
}
