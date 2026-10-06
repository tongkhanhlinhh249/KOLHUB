import { useCallback, useMemo, type ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router';
import { AlertCircle, RotateCcw, SearchX, Store } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import {
  campaignService,
  KOL_CATEGORIES,
  MARKETPLACE_SORTS,
  PLATFORMS,
  type KolCategory,
} from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { ALL, FilterSelect, triggerActive, triggerBase } from '../filters/FilterSelect';
import { SortSelect } from '../filters/SortSelect';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { fieldIcon } from '../shared/fieldIcons';
import { useLiveQuery } from '../shared/useLiveQuery';
import { MarketplaceCampaignCard, MarketplaceCampaignCardSkeleton } from './MarketplaceCampaignCard';
import { SanBanners, SanCategoryRow } from './SanPromoRow';
import { legacySanTabRedirect } from '../creator/interest';
import {
  BUDGET_RANGES,
  hasMarketplaceFilters,
  legacyMarketplaceRedirect,
  marketplaceCampaignPath,
  marketplaceFilterCount,
  marketplaceViewerOf,
  mergeMarketplaceParams,
  parseMarketplaceParams,
  platformName,
  toMarketplaceFilters,
  TYPE_FILTERS,
  type MarketplaceBackState,
  type MarketplaceQuery,
  type MarketplaceViewer,
} from './supplierBooking';
import { useAuth } from '../../auth/AuthContext';
import { SupplierGate, useSupplierAccess } from './useSupplierAccess';

/** FilterSelect variant whose options carry an icon (field icons, platform logos). */
function IconFilterSelect<T extends string>({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  value: T | undefined;
  options: { key: T; label: string; icon: ReactNode }[];
  onChange(v: T | undefined): void;
  className?: string;
}) {
  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))}>
      <SelectTrigger aria-label={label} className={cn(triggerBase, value && triggerActive, className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            <span className="flex items-center gap-2">
              {o.icon}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const CATEGORY_OPTIONS = KOL_CATEGORIES.map((c) => {
  const Icon = fieldIcon(c);
  return { key: c, label: c, icon: <Icon className="size-4 text-muted-foreground" aria-hidden /> };
});
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ key: p.key, label: p.label, icon: <PlatformIcon platform={p.key} /> }));

const INTRO: Record<MarketplaceViewer, string> = {
  guest: 'Chiến dịch Nhãn hàng đang tìm KOL/MCN. Xem brief, ngân sách và hạng mục; đăng nhập để ứng tuyển.',
  supplier: 'Chiến dịch Nhãn hàng đang tìm KOL/MCN, xếp theo mức phù hợp với bạn. Chiến dịch đã lưu và đã ứng tuyển nằm ở mục Chiến dịch yêu thích.',
  brand: 'Xem các chiến dịch đang nhận đề xuất trên Sàn. Chiến dịch của bạn được đánh dấu "Của bạn".',
};

/** Card grid: 1 column on phones, 2 from 672 px of content (tablets), 3 from 1024 px. Items stretch to the row height. */
const GRID = 'grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3';

/** Sorts without "Phù hợp nhất" (no match score for guests / Brands). */
const PUBLIC_SORTS = MARKETPLACE_SORTS.filter((s) => s.key !== 'match');

/**
 * /san — the public Sàn chiến dịch (inside MarketplaceLayout; the keyword box lives in its header).
 * Promo banners + category icon row on top, then one list. KOL/MCN: default sort "Phù hợp nhất", save, apply
 * (approved only). Guest / Brand: read-only, default sort "Mới nhất". Cards link to the campaign page /san/<id>
 * (MarketplaceCampaignPage); old links /san?chien-dich=<id> redirect there. The old tabs (?tab=da-luu | da-ung-tuyen)
 * moved to "Chiến dịch yêu thích" (/chien-dich-da-luu) and redirect there (brands: the tab is ignored).
 */
export function MarketplacePage() {
  const { search } = useLocation();
  const { role } = useAuth();
  const legacy = legacyMarketplaceRedirect(search);
  if (legacy) return <Navigate to={legacy.to} state={{ from: legacy.from } satisfies MarketplaceBackState} replace />;
  const oldTab = marketplaceViewerOf(role) === 'brand' ? null : legacySanTabRedirect(search);
  if (oldTab) return <Navigate to={oldTab} replace />;
  return <MarketplaceList />;
}

function MarketplaceList() {
  const { role } = useAuth();
  const { pathname, search } = useLocation();
  // Router state of the card links: "← Sàn chiến dịch" on the campaign page returns to this exact list.
  const backState: MarketplaceBackState = { from: pathname + search };
  const viewer = marketplaceViewerOf(role);
  const supplier = viewer === 'supplier';
  const access = useSupplierAccess(supplier);
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const parsed = useMemo(() => parseMarketplaceParams(new URLSearchParams(paramsKey), KOL_CATEGORIES), [paramsKey]);
  const query = useMemo<MarketplaceQuery>(
    () => (!supplier && parsed.sort === 'match' ? { ...parsed, sort: 'newest' } : parsed),
    [parsed, supplier],
  );
  const filtersKey = JSON.stringify(toMarketplaceFilters(query));
  // `role` in the deps: reload when the demo switches account while staying on the Sàn.
  const q = useLiveQuery(() => campaignService.listMarketplace(JSON.parse(filtersKey)), [filtersKey, role]);
  // Unfiltered count for the guide banner.
  const total = useLiveQuery(async () => (await campaignService.listMarketplace()).length, [role]);

  const write = useCallback(
    (next: MarketplaceQuery) => setParams((prev) => mergeMarketplaceParams(prev, next), { replace: true }),
    [setParams],
  );
  const change = (patch: Partial<MarketplaceQuery>) => write({ ...query, ...patch });
  const clear = () => write({ sort: query.sort });

  const chips: FilterChip[] = [];
  if (query.keyword) chips.push({ key: 'keyword', label: `“${query.keyword}”`, remove: () => change({ keyword: undefined }) });
  if (query.type) chips.push({ key: 'type', label: TYPE_FILTERS.find((t) => t.key === query.type)!.label, remove: () => change({ type: undefined }) });
  if (query.category) chips.push({ key: 'category', label: query.category, remove: () => change({ category: undefined }) });
  if (query.platform) chips.push({ key: 'platform', label: platformName(query.platform), remove: () => change({ platform: undefined }) });
  if (query.budget)
    chips.push({
      key: 'budget',
      label: BUDGET_RANGES.find((b) => b.key === query.budget)!.label,
      remove: () => change({ budget: undefined }),
    });

  const data = q.data ? { list: q.data } : undefined;
  const now = Date.now();
  let body: ReactNode;
  if (!data && !q.error) {
    body = (
      <div className={GRID} aria-busy="true" aria-label="Đang tải chiến dịch">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <MarketplaceCampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (q.error && !data) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được Sàn chiến dịch.</span>
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (data && data.list.length === 0) {
    const filtered = hasMarketplaceFilters(query);
    const Icon = filtered ? SearchX : Store;
    body = (
      <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
        <div className={cn('flex size-12 items-center justify-center rounded-full', filtered ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
          <Icon className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">{filtered ? 'Không có chiến dịch phù hợp' : 'Chưa có chiến dịch nào đang nhận đề xuất'}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {filtered ? 'Thử đổi từ khoá hoặc bỏ bớt bộ lọc.' : 'Khi Nhãn hàng đăng chiến dịch lên Sàn, chiến dịch sẽ xuất hiện ở đây.'}
        </p>
        {filtered && (
          <Button type="button" variant="outline" className="h-11" onClick={clear}>
            Xoá bộ lọc
          </Button>
        )}
      </div>
    );
  } else if (data) {
    body = (
      <ul className={GRID} aria-label="Chiến dịch đang nhận đề xuất">
        {data.list.map((c) => (
          <li key={c.id} className="min-w-0 [&>*]:h-full">
            <MarketplaceCampaignCard campaign={c} now={now} to={marketplaceCampaignPath(c.id)} linkState={backState} viewer={viewer} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container w-full space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">Chiến dịch đang tìm KOL</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{INTRO[viewer]}</p>
      </div>

      {supplier && !access.loading && !access.approved && <SupplierGate ownerType={access.ownerType} status={access.status} />}

      <SanBanners viewer={viewer} ownerType={access.ownerType} openCount={total.data} />
      <SanCategoryRow viewer={viewer} ownerType={access.ownerType} active={query.category} onPick={(category: KolCategory | undefined) => change({ category })} />

      <FilterBar
        keyword={query.keyword}
        onKeywordChange={(keyword) => change({ keyword })}
        searchPlaceholder="Tìm tên chiến dịch, nhãn hàng, brief"
        searchLabel="Tìm chiến dịch theo tên, nhãn hàng hoặc brief"
        renderFilters={(triggerClass) => (
          <>
            <FilterSelect
              label="Loại chiến dịch"
              allLabel="Mọi loại chiến dịch"
              value={query.type}
              options={TYPE_FILTERS.map((t) => ({ key: t.key, label: t.label }))}
              onChange={(type) => change({ type })}
              className={triggerClass}
            />
            <IconFilterSelect
              label="Lĩnh vực"
              allLabel="Tất cả lĩnh vực"
              value={query.category}
              options={CATEGORY_OPTIONS}
              onChange={(category) => change({ category })}
              className={triggerClass}
            />
            <IconFilterSelect
              label="Nền tảng"
              allLabel="Tất cả nền tảng"
              value={query.platform}
              options={PLATFORM_OPTIONS}
              onChange={(platform) => change({ platform })}
              className={triggerClass}
            />
            <FilterSelect
              label="Ngân sách"
              allLabel="Mọi ngân sách"
              value={query.budget}
              options={BUDGET_RANGES.map((b) => ({ key: b.key, label: b.label }))}
              onChange={(budget) => change({ budget })}
              className={triggerClass}
            />
          </>
        )}
        filterGridClass="grid-cols-2"
        inlineFilterClass="@4xl:w-44"
        renderSort={(className) => (
          <SortSelect
            value={query.sort}
            options={supplier ? MARKETPLACE_SORTS : PUBLIC_SORTS}
            onChange={(sort) => change({ sort })}
            className={className}
          />
        )}
        hideSearch
        sortClass="@4xl:w-60"
        filterCount={marketplaceFilterCount(query)}
        active={hasMarketplaceFilters(query)}
        chips={chips}
        onClear={clear}
      />

      {data && data.list.length > 0 && (
        <p className="text-sm font-medium text-foreground" aria-live="polite">
          {data.list.length} chiến dịch trên Sàn
          {query.sort === 'match' && <span className="font-normal text-muted-foreground"> · xếp theo mức phù hợp với bạn</span>}
        </p>
      )}

      {body}
    </div>
  );
}
