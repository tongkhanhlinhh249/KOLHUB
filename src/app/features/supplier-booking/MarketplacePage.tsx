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
  mergeMarketplaceParams,
  parseMarketplaceParams,
  parseMarketplaceTab,
  platformName,
  toMarketplaceFilters,
  withParam,
  type MarketplaceQuery,
  type MarketplaceTab,
} from './supplierBooking';
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
  'tat-ca': (n) => `${n} chiến dịch đang nhận đề xuất`,
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

/**
 * /san-chien-dich — campaigns open for applications. Any KOL/MCN can browse and save; only approved profiles apply.
 * Tabs `?tab=` (Tất cả · Đã lưu · Đã ứng tuyển), filters in the URL (default sort "Phù hợp nhất"),
 * `?chien-dich=<id>` opens the detail sheet.
 */
export function MarketplacePage() {
  const access = useSupplierAccess();
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => parseMarketplaceParams(new URLSearchParams(paramsKey), KOL_CATEGORIES), [paramsKey]);
  const tab = parseMarketplaceTab(params);
  const filtersKey = JSON.stringify(toMarketplaceFilters(query));
  const q = useLiveQuery(() => loadTab(tab, JSON.parse(filtersKey)), [tab, filtersKey]);
  // Unfiltered counts for the tab badges.
  const counts = useLiveQuery(
    async () => ({ saved: (await campaignService.listSaved()).length, applied: (await campaignService.listApplied()).length }),
    [],
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
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải chiến dịch">
        {[0, 1, 2].map((i) => (
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
      <ul className="flex flex-col gap-3" aria-label="Đề xuất đã gửi">
        {data.list.map((a) => (
          <li key={a.booking.id}>
            <AppliedCampaignCard item={a} now={now} />
          </li>
        ))}
      </ul>
    );
  } else if (data) {
    body = (
      <ul className="flex flex-col gap-3" aria-label={tab === 'da-luu' ? 'Chiến dịch đã lưu' : 'Chiến dịch đang nhận đề xuất'}>
        {data.list.map((c) => (
          <li key={c.id}>
            <MarketplaceCampaignCard campaign={c} now={now} onOpen={() => openDetail(c.id)} />
          </li>
        ))}
      </ul>
    );
  }

  const tabCount = (t: MarketplaceTab) => (t === 'da-luu' ? counts.data?.saved : t === 'da-ung-tuyen' ? counts.data?.applied : undefined);

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      {!access.loading && !access.approved && <SupplierGate ownerType={access.ownerType} status={access.status} />}

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

      <FilterBar
        keyword={query.keyword}
        onKeywordChange={(keyword) => change({ keyword })}
        searchPlaceholder="Tìm tên chiến dịch, nhãn hàng, brief"
        searchLabel="Tìm chiến dịch theo tên, nhãn hàng hoặc brief"
        renderFilters={(triggerClass) => (
          <>
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
        filterGridClass="grid-cols-3"
        inlineFilterClass="@4xl:w-40"
        renderSort={(className) => (
          <SortSelect value={query.sort} options={MARKETPLACE_SORTS} onChange={(sort) => change({ sort })} className={className} />
        )}
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

      <CampaignDetailSheet campaignId={detailId} onClose={() => openDetail(null)} access={access} />
    </div>
  );
}
