import { useEffect, useRef, useState } from 'react';
import { RotateCcw, SearchX } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import {
  channelDirectoryService,
  KOL_CATEGORIES,
  KOL_REGIONS,
  KOL_SCALES,
  PLATFORMS,
  type ChannelDirectoryQuery,
  type ChannelDirectoryResult,
  type ChannelDirectorySort,
  type KolCategory,
  type KolRegion,
  type KolScale,
} from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect, type FilterOption } from '../filters/FilterSelect';
import { PlatformSelect } from '../filters/PlatformSelect';
import { SortSelect } from '../filters/SortSelect';
import { createLatestOnly } from '../biz-search/latestOnly';
import { SearchPagination } from '../biz-search/SearchPagination';
import { useBrandKolSheet } from '../shared/BrandKolSheet';
import { brandLockedView } from '../shared/BrandLocked';
import { ChannelDirectoryRow, ChannelDirectoryRowSkeleton } from './ChannelDirectoryRow';

const SORT_OPTIONS: FilterOption<ChannelDirectorySort>[] = [
  { key: 'followers', label: 'Người theo dõi cao nhất' },
  { key: 'newest', label: 'Mới xác thực' },
  { key: 'expiring', label: 'Sắp hết hạn dấu' },
];

const filterCount = (q: ChannelDirectoryQuery) =>
  (q.platforms?.length ? 1 : 0) + (q.category ? 1 : 0) + (q.region ? 1 : 0) + (q.scale ? 1 : 0);

function chipsOf(q: ChannelDirectoryQuery, onChange: (p: Partial<ChannelDirectoryQuery>) => void): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const p of PLATFORMS.filter((x) => q.platforms?.includes(x.key))) {
    chips.push({ key: `p-${p.key}`, label: p.label, remove: () => onChange({ platforms: (q.platforms ?? []).filter((k) => k !== p.key) }) });
  }
  if (q.category) chips.push({ key: 'category', label: q.category, remove: () => onChange({ category: undefined }) });
  if (q.region) chips.push({ key: 'region', label: q.region, remove: () => onChange({ region: undefined }) });
  if (q.scale) {
    const s = KOL_SCALES.find((x) => x.key === q.scale);
    chips.push({ key: 'scale', label: s?.label ?? q.scale, remove: () => onChange({ scale: undefined }) });
  }
  return chips;
}

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

/** /danh-sach-kenh — every verified channel (one row per channel) for Brand/Agency accounts. */
export function ChannelDirectoryPage() {
  const [query, setQuery] = useState<ChannelDirectoryQuery>({ sort: 'followers', page: 1 });
  const [result, setResult] = useState<ChannelDirectoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  const latest = useRef(createLatestOnly()).current;
  const kol = useBrandKolSheet();

  useEffect(() => {
    setLoading(true);
    latest(channelDirectoryService.list(query))
      .then((r) => {
        if (r.stale) return;
        setResult(r.value);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, [query, reload, latest]);

  // Any filter change goes back to page 1.
  const onChange = (patch: Partial<ChannelDirectoryQuery>) => setQuery((prev) => ({ ...prev, ...patch, page: 'page' in patch ? patch.page : 1 }));
  const onClear = () => setQuery((prev) => ({ sort: prev.sort, page: 1 }));
  const onPage = (page: number) => {
    onChange({ page });
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const active = filterCount(query) > 0 || !!query.keyword?.trim();

  const locked = brandLockedView(error);
  if (locked) return locked;

  const filters = (cls?: string) => (
    <>
      <PlatformSelect value={query.platforms ?? []} onChange={(platforms) => onChange({ platforms })} className={cls} />
      <FilterSelect<KolCategory>
        label="Lĩnh vực"
        allLabel="Tất cả lĩnh vực"
        value={query.category}
        options={KOL_CATEGORIES.map((c) => ({ key: c, label: c }))}
        onChange={(category) => onChange({ category })}
        className={cls}
      />
      <FilterSelect<KolRegion>
        label="Khu vực"
        allLabel="Tất cả khu vực"
        value={query.region}
        options={KOL_REGIONS.map((r) => ({ key: r, label: r }))}
        onChange={(region) => onChange({ region })}
        className={cls}
      />
      <FilterSelect<KolScale>
        label="Quy mô kênh"
        allLabel="Tất cả quy mô"
        value={query.scale}
        options={KOL_SCALES.map((s) => ({ key: s.key, label: s.label }))}
        onChange={(scale) => onChange({ scale })}
        className={cls}
      />
    </>
  );

  const from = result && result.total > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = result ? Math.min(result.total, result.page * result.pageSize) : 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
      <FilterBar
        keyword={query.keyword}
        onKeywordChange={(keyword) => onChange({ keyword })}
        searchPlaceholder="Tìm @kênh, link kênh, tên KOL, KOL ID"
        searchLabel="Tìm kênh theo tên kênh, link kênh, tên KOL hoặc KOL ID"
        renderFilters={filters}
        filterGridClass="grid-cols-4"
        inlineFilterClass="@4xl:w-32"
        renderSort={(className) => (
          <SortSelect value={query.sort ?? 'followers'} options={SORT_OPTIONS} onChange={(sort) => onChange({ sort })} className={className} />
        )}
        filterCount={filterCount(query)}
        active={active}
        chips={chipsOf(query, onChange)}
        onClear={onClear}
        sheetDescription="Chỉ hiện kênh có dấu xác thực còn hiệu lực."
      />

      <div className="flex min-h-11 flex-wrap items-baseline gap-x-4 gap-y-1 text-sm" aria-live="polite">
        {result && (
          <>
            <p className="font-medium text-foreground">{result.total} kênh</p>
            {result.total > 0 && (
              <p className="text-muted-foreground">
                Hiển thị {from}–{to}
              </p>
            )}
          </>
        )}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{errText(error)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setReload((n) => n + 1)}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading && !result ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải">
          {Array.from({ length: 6 }, (_, i) => (
            <ChannelDirectoryRowSkeleton key={i} />
          ))}
        </div>
      ) : result && result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-6" aria-hidden />
          </div>
          <p className="font-semibold text-foreground">Không tìm thấy kênh phù hợp</p>
          <p className="text-sm text-muted-foreground">Thử bỏ bớt bộ lọc hoặc đổi từ khoá.</p>
          {active && (
            <Button type="button" variant="outline" className="h-11" onClick={onClear}>
              Xoá bộ lọc
            </Button>
          )}
        </div>
      ) : result ? (
        <>
          <ul className={`flex flex-col gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-label="Danh sách kênh đã xác thực">
            {result.items.map((c) => (
              <li key={c.channelId}>
                <ChannelDirectoryRow
                  item={c}
                  saved={kol.savedIds.has(c.kolId)}
                  onOpenKol={() => kol.openKol(c.kolId)}
                  onSave={() => kol.openSave(c.kolId, c.displayName)}
                />
              </li>
            ))}
          </ul>
          <SearchPagination page={result.page} pageCount={result.pageCount} onPage={onPage} />
        </>
      ) : null}

      {kol.elements}
    </div>
  );
}
