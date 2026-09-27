import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Bookmark, BookmarkCheck, Eye, Flag } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import {
  channelDirectoryService,
  KOL_CATEGORIES,
  KOL_REGIONS,
  KOL_SCALES,
  PLATFORMS,
  type ChannelDirectoryItem,
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
import { CHANNEL_PARAM, useChannelParam } from '../channels/ChannelDetailSheet';
import {
  ChannelCountLine,
  ChannelList,
  ChannelListEmpty,
  ChannelListError,
  ChannelListSkeleton,
  ClearFiltersButton,
} from '../channels/ChannelListStates';
import { ChannelRow, ROW_MENU_ITEM } from '../channels/ChannelRow';
import { KolAvatar } from '../biz-search/KolCard';
import { useBrandKolSheet } from '../shared/BrandKolSheet';
import { brandLockedView } from '../shared/BrandLocked';
import { ReportViolationDialog, type ReportTarget } from '../violations/ReportViolationDialog';
import { BrandChannelSheet } from './BrandChannelSheet';

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

/** Owner line under the channel link: avatar, KOL name, KOL ID. */
function OwnerLine({ item }: { item: ChannelDirectoryItem }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <KolAvatar name={item.displayName} src={item.avatar} className="size-6 text-[10px]" />
      <span className="truncate text-sm font-medium text-foreground">{item.displayName}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{item.kolId}</span>
    </span>
  );
}

/**
 * /danh-sach-kenh — every verified channel (one row per channel) for Brand/Agency accounts. Same
 * row, filters and states as the owner's "Quản lý kênh", but read-only; a row opens "Chi tiết kênh"
 * (`?kenh=`), from which "Xem hồ sơ KOL" opens the KOL sheet (`?kol=`).
 */
export function ChannelDirectoryPage() {
  const [query, setQuery] = useState<ChannelDirectoryQuery>({ sort: 'followers', page: 1 });
  const [result, setResult] = useState<ChannelDirectoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  const latest = useRef(createLatestOnly()).current;
  const kol = useBrandKolSheet();
  const [report, setReport] = useState<ReportTarget | null>(null);
  const channel = useChannelParam();
  const [, setSearchParams] = useSearchParams();
  // Channel sheet → KOL sheet in one history entry, so Back returns to the channel.
  const openKolFromChannel = (kolId: string) =>
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.delete(CHANNEL_PARAM);
      sp.set('kol', kolId);
      return sp;
    });

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

      <ChannelCountLine count={result?.total} extra={result && result.total > 0 ? `Hiển thị ${from}–${to}` : undefined} />

      {error ? (
        <ChannelListError message={errText(error)} onRetry={() => setReload((n) => n + 1)} />
      ) : loading && !result ? (
        <ChannelListSkeleton count={6} />
      ) : result && result.items.length === 0 ? (
        <ChannelListEmpty
          title="Không tìm thấy kênh phù hợp"
          description="Thử bỏ bớt bộ lọc hoặc đổi từ khoá."
          action={active ? <ClearFiltersButton onClear={onClear} /> : undefined}
        />
      ) : result ? (
        <ChannelList label="Danh sách kênh đã xác thực" busy={loading} page={result.page} pageCount={result.pageCount} onPage={onPage}>
          {result.items.map((c) => {
            const saved = kol.savedIds.has(c.kolId);
            return (
              <li key={c.channelId}>
                <ChannelRow
                  platform={c.platform}
                  handle={c.handle}
                  url={c.url}
                  verifiedUntil={c.badgeExpiresAt}
                  subline={<OwnerLine item={c} />}
                  fields={c.fields}
                  region={c.region}
                  followers={c.followers}
                  onOpen={() => channel.openChannel(c.channelId)}
                  menu={
                    <>
                      <DropdownMenuItem className={ROW_MENU_ITEM} onSelect={() => channel.openChannel(c.channelId)}>
                        <Eye aria-hidden />
                        Xem chi tiết kênh
                      </DropdownMenuItem>
                      <DropdownMenuItem className={ROW_MENU_ITEM} onSelect={() => kol.openSave(c.kolId, c.displayName)}>
                        {saved ? <BookmarkCheck className="text-primary" aria-hidden /> : <Bookmark aria-hidden />}
                        Lưu KOL vào danh sách
                        {saved && <span className="ml-auto text-xs text-muted-foreground">Đã lưu</span>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={ROW_MENU_ITEM}
                        variant="destructive"
                        onSelect={() => setReport({ channelId: c.channelId, handle: c.handle, platform: c.platform })}
                      >
                        <Flag aria-hidden />
                        Báo cáo vi phạm
                      </DropdownMenuItem>
                    </>
                  }
                />
              </li>
            );
          })}
        </ChannelList>
      ) : null}

      <BrandChannelSheet
        channelId={channel.channelId}
        onClose={channel.closeChannel}
        saved={(id) => kol.savedIds.has(id)}
        onOpenKol={openKolFromChannel}
        onSave={kol.openSave}
        onReport={(d) => setReport({ channelId: d.channelId, handle: d.handle, platform: d.platform })}
      />
      {kol.elements}
      <ReportViolationDialog target={report} onOpenChange={(o) => !o && setReport(null)} />
    </div>
  );
}
