import {
  KOL_CATEGORIES,
  KOL_REGIONS,
  KOL_SCALES,
  PLATFORMS,
  type KolCategory,
  type KolRegion,
  type KolScale,
  type KolSearchQuery,
  type SearchSort,
} from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect, type FilterOption } from '../filters/FilterSelect';
import { PlatformSelect } from '../filters/PlatformSelect';
import { SortSelect } from '../filters/SortSelect';
import { activeFilterCount, hasActiveFilters } from './searchParams';

const SORT_OPTIONS: FilterOption<SearchSort>[] = [
  { key: 'relevance', label: 'Liên quan' },
  { key: 'followers', label: 'Người theo dõi cao nhất' },
  { key: 'newest', label: 'Mới xác thực' },
];

interface SearchFiltersProps {
  query: KolSearchQuery;
  onChange(patch: Partial<KolSearchQuery>): void;
  onClear(): void;
}

function chipsOf(query: KolSearchQuery, onChange: SearchFiltersProps['onChange']): FilterChip[] {
  const chips: FilterChip[] = [];
  if (query.category) chips.push({ key: 'category', label: query.category, remove: () => onChange({ category: undefined }) });
  if (query.region) chips.push({ key: 'region', label: query.region, remove: () => onChange({ region: undefined }) });
  if (query.scale) {
    const s = KOL_SCALES.find((x) => x.key === query.scale);
    chips.push({ key: 'scale', label: s?.label ?? query.scale, remove: () => onChange({ scale: undefined }) });
  }
  for (const p of PLATFORMS.filter((x) => query.platforms?.includes(x.key))) {
    chips.push({
      key: `platform-${p.key}`,
      label: p.label,
      remove: () => onChange({ platforms: (query.platforms ?? []).filter((k) => k !== p.key) }),
    });
  }
  return chips;
}

/** SCR-09 filter bar (layout rules in FilterBar). No "thuộc MCN" filter (BR-55). */
export function SearchFilters({ query, onChange, onClear }: SearchFiltersProps) {
  const sort = query.sort ?? 'relevance';

  const filters = (triggerClass?: string) => (
    <>
      <FilterSelect<KolCategory>
        label="Lĩnh vực"
        allLabel="Tất cả lĩnh vực"
        value={query.category}
        options={KOL_CATEGORIES.map((c) => ({ key: c, label: c }))}
        onChange={(category) => onChange({ category })}
        className={triggerClass}
      />
      <FilterSelect<KolRegion>
        label="Khu vực"
        allLabel="Tất cả khu vực"
        value={query.region}
        options={KOL_REGIONS.map((r) => ({ key: r, label: r }))}
        onChange={(region) => onChange({ region })}
        className={triggerClass}
      />
      <FilterSelect<KolScale>
        label="Quy mô"
        allLabel="Tất cả quy mô"
        value={query.scale}
        options={KOL_SCALES.map((s) => ({ key: s.key, label: s.label }))}
        onChange={(scale) => onChange({ scale })}
        className={triggerClass}
      />
      <PlatformSelect
        label="Nền tảng có dấu"
        title="Nền tảng có dấu xác thực"
        value={query.platforms ?? []}
        onChange={(platforms) => onChange({ platforms })}
        className={triggerClass}
      />
    </>
  );

  return (
    <FilterBar
      keyword={query.keyword}
      onKeywordChange={(keyword) => onChange({ keyword })}
      searchPlaceholder="Tìm tên, nghệ danh, KOL ID, link kênh"
      searchLabel="Tìm KOL theo tên, nghệ danh, KOL ID hoặc link kênh"
      renderFilters={filters}
      filterGridClass="grid-cols-4"
      inlineFilterClass="@4xl:w-32"
      renderSort={(className) => (
        <SortSelect value={sort} options={SORT_OPTIONS} onChange={(s) => onChange({ sort: s })} className={className} />
      )}
      filterCount={activeFilterCount(query)}
      active={hasActiveFilters(query)}
      chips={chipsOf(query, onChange)}
      onClear={onClear}
      sheetDescription="Chỉ hiện KOL có kênh đã xác thực còn hiệu lực."
    />
  );
}
