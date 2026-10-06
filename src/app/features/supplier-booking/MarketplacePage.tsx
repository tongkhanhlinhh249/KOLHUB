import { useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, Bookmark, RotateCcw, SearchX, Send, Store } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import {
  campaignService,
  KOL_CATEGORIES,
  MARKETPLACE_SORTS,
  PLATFORMS,
  type AppliedCampaign,
  type MarketplaceCampaign,
  type MarketplaceFilters,
} from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { ALL, FilterSelect, triggerActive, triggerBase } from '../filters/FilterSelect';
import { SortSelect } from '../filters/SortSelect';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { fieldIcon } from '../shared/fieldIcons';
import { useLiveQuery } from '../shared/useLiveQuery';
import { CampaignDetailSheet } from './CampaignDetailSheet';
import { AppliedCampaignCard, MarketplaceCampaignCard, MarketplaceCampaignCardSkeleton } from './MarketplaceCampaignCard';
import {
  BUDGET_RANGES,
  hasMarketplaceFilters,
  MARKETPLACE_DETAIL_PARAM,
  MARKETPLACE_TABS,
  marketplaceFilterCount,
  marketplaceTabParam,
  marketplaceViewerOf,
  mergeMarketplaceParams,
  parseMarketplaceParams,
  parseMarketplaceTab,
  platformName,
  toMarketplaceFilters,
  TYPE_FILTERS,
  withParam,
  type MarketplaceQuery,
  type MarketplaceTab,
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

type TabData = { tab: 'tat-ca' | 'da-luu'; list: MarketplaceCampaign[] } | { tab: 'da-ung-tuyen'; list: AppliedCampaign[] };

async function loadTab(tab: MarketplaceTab, filters: MarketplaceFilters): Promise<TabData> {
  if (tab === 'da-ung-tuyen') return { tab, list: await campaignService.listApplied(filters) };
  if (tab === 'da-luu') return { tab, list: await campaignService.listSaved(filters) };
  return { tab, list: await campaignService.listMarketplace(filters) };
}

const COUNT_TEXT: Record<MarketplaceTab, (n: number) => string> = {
  'tat-ca': (n) => `${n} chiến dịch trên Sàn`,
  'da-luu': (n) => `${n} chiến dịch đã lưu`,
  'da-ung-tuyen': (n) => `${n} đề xuất đã gửi`,
};

const EMPTY: Record<MarketplaceTab, { icon: typeof Store; title: string; text: string }> = {
  'tat-ca': {
    icon: Store,
    title: 'Chưa có chiến dịch nào đang nhận đề xuất',
    text: 'Khi Nhãn hàng đăng chiến dịch lên Sàn, chiến dịch sẽ xuất hiện ở đây.',
  },
  'da-luu': {
    icon: Bookmark,
    title: 'Chưa lưu chiến dịch nào',
    text: 'Bấm biểu tượng lưu trên thẻ chiến dịch để xem lại và ứng tuyển sau. Chiến dịch hết hạn nhận đề xuất sẽ tự rời khỏi danh sách.',
  },
  'da-ung-tuyen': {
    icon: Send,
    title: 'Bạn chưa ứng tuyển chiến dịch nào',
    text: 'Đề xuất bạn gửi cho Nhãn hàng sẽ hiện ở đây kèm trạng thái phản hồi.',
  },
};

const INTRO: Record<MarketplaceViewer, string> = {
  guest: 'Chiến dịch Nhãn hàng đang tìm KOL/MCN. Xem brief, ngân sách và hạng mục; đăng nhập để ứng tuyển.',
  supplier: 'Chiến dịch Nhãn hàng đang tìm KOL/MCN, xếp theo mức phù hợp với bạn. Lưu lại hoặc gửi đề xuất ứng tuyển.',
  brand: 'Xem các chiến dịch đang nhận đề xuất trên Sàn. Chiến dịch của bạn được đánh dấu "Của bạn".',
};

/** Card grid: 1 column on phones, 2 from 672 px of content (tablets), 3 from 1024 px. Items stretch to the row height. */
const GRID = 'grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3';

/** Sorts without "Phù hợp nhất" (no match score for guests / Brands). */
const PUBLIC_SORTS = MARKETPLACE_SORTS.filter((s) => s.key !== 'match');

/**
 * /san — the public Sàn chiến dịch (inside MarketplaceLayout; the keyword box lives in its header).
 * KOL/MCN: tabs `?tab=` (Tất cả · Đã lưu · Đã ứng tuyển), default sort "Phù hợp nhất", save, apply (approved only).
 * Guest / Brand: "Tất cả" only, read-only, default sort "Mới nhất". `?chien-dich=<id>` opens the detail sheet.
 */
export function MarketplacePage() {
  const { role } = useAuth();
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
  const tab: MarketplaceTab = supplier ? parseMarketplaceTab(params) : 'tat-ca';
  const filtersKey = JSON.stringify(toMarketplaceFilters(query));
  // `role` in the deps: reload when the demo switches account while staying on the Sàn.
  const q = useLiveQuery(() => loadTab(tab, JSON.parse(filtersKey)), [tab, filtersKey, role]);
  // Unfiltered counts for the tab badges (KOL/MCN only).
  const counts = useLiveQuery(
    async () =>
      supplier ? { saved: (await campaignService.listSaved()).length, applied: (await campaignService.listApplied()).length } : null,
    [supplier, role],
  );
  const detailId = params.get(MARKETPLACE_DETAIL_PARAM);

  const write = useCallback(
    (next: MarketplaceQuery) => setParams((prev) => mergeMarketplaceParams(prev, next), { replace: true }),
    [setParams],
  );
  const change = (patch: Partial<MarketplaceQuery>) => write({ ...query, ...patch });
  const clear = () => write({ sort: query.sort });
  const openDetail = (id: string | null) => setParams((prev) => withParam(prev, MARKETPLACE_DETAIL_PARAM, id));
  const setTab = (t: string) => setParams((prev) => withParam(prev, 'tab', marketplaceTabParam(t as MarketplaceTab)), { replace: true });

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

  // Data of another tab (kept while the new tab loads) is not shown.
  const data = q.data && q.data.tab === tab ? q.data : undefined;
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
    const empty = EMPTY[tab];
    const Icon = filtered ? SearchX : empty.icon;
    body = (
      <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
        <div className={cn('flex size-12 items-center justify-center rounded-full', filtered ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
          <Icon className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">{filtered ? 'Không có chiến dịch phù hợp' : empty.title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{filtered ? 'Thử đổi từ khoá hoặc bỏ bớt bộ lọc.' : empty.text}</p>
        {filtered ? (
          <Button type="button" variant="outline" className="h-11" onClick={clear}>
            Xoá bộ lọc
          </Button>
        ) : (
          tab !== 'tat-ca' && (
            <Button type="button" variant="outline" className="h-11" onClick={() => setTab('tat-ca')}>
              Xem chiến dịch phù hợp
            </Button>
          )
        )}
      </div>
    );
  } else if (data?.tab === 'da-ung-tuyen') {
    body = (
      <ul className={GRID} aria-label="Đề xuất đã gửi">
        {data.list.map((a) => (
          <li key={a.booking.id} className="min-w-0 [&>*]:h-full">
            <AppliedCampaignCard item={a} now={now} />
          </li>
        ))}
      </ul>
    );
  } else if (data) {
    body = (
      <ul className={GRID} aria-label={tab === 'da-luu' ? 'Chiến dịch đã lưu' : 'Chiến dịch đang nhận đề xuất'}>
        {data.list.map((c) => (
          <li key={c.id} className="min-w-0 [&>*]:h-full">
            <MarketplaceCampaignCard campaign={c} now={now} onOpen={() => openDetail(c.id)} viewer={viewer} />
          </li>
        ))}
      </ul>
    );
  }

  const tabCount = (t: MarketplaceTab) => (t === 'da-luu' ? counts.data?.saved : t === 'da-ung-tuyen' ? counts.data?.applied : undefined);

  return (
    <div className="@container w-full space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">Chiến dịch đang tìm KOL</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{INTRO[viewer]}</p>
      </div>

      {supplier && !access.loading && !access.approved && <SupplierGate ownerType={access.ownerType} status={access.status} />}

      {supplier && (
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto" aria-label="Danh sách chiến dịch">
              {MARKETPLACE_TABS.map((t) => {
                const n = tabCount(t.key);
                return (
                  <TabsTrigger key={t.key} value={t.key} className="h-11 gap-1.5 md:h-8">
                    {t.label}
                    {n !== undefined && <span className="rounded-full bg-background/70 px-1.5 text-xs text-muted-foreground tabular-nums">{n}</span>}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      )}

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
          {COUNT_TEXT[tab](data.list.length)}
          {tab !== 'da-ung-tuyen' && query.sort === 'match' && <span className="font-normal text-muted-foreground"> · xếp theo mức phù hợp với bạn</span>}
        </p>
      )}

      {body}

      <CampaignDetailSheet campaignId={detailId} onClose={() => openDetail(null)} access={access} viewer={viewer} />
    </div>
  );
}
