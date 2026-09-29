import { useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, RotateCcw, SearchX, Store } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import { campaignService, KOL_CATEGORIES, MARKETPLACE_SORTS, PLATFORMS } from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { ALL, FilterSelect, triggerActive, triggerBase } from '../filters/FilterSelect';
import { SortSelect } from '../filters/SortSelect';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { fieldIcon } from '../shared/fieldIcons';
import { useLiveQuery } from '../shared/useLiveQuery';
import { CampaignDetailSheet } from './CampaignDetailSheet';
import { MarketplaceCampaignCard, MarketplaceCampaignCardSkeleton } from './MarketplaceCampaignCard';
import {
  BUDGET_RANGES,
  hasMarketplaceFilters,
  MARKETPLACE_DETAIL_PARAM,
  marketplaceFilterCount,
  mergeMarketplaceParams,
  parseMarketplaceParams,
  platformName,
  toMarketplaceFilters,
  withParam,
  type MarketplaceQuery,
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

/**
 * /san-chien-dich — campaigns open for applications. Any KOL/MCN can browse; only approved profiles apply.
 * `?chien-dich=<id>` opens the detail sheet.
 */
export function MarketplacePage() {
  const access = useSupplierAccess();
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => parseMarketplaceParams(new URLSearchParams(paramsKey), KOL_CATEGORIES), [paramsKey]);
  const filtersKey = JSON.stringify(toMarketplaceFilters(query));
  const q = useLiveQuery(() => campaignService.listMarketplace(JSON.parse(filtersKey)), [filtersKey]);
  const detailId = params.get(MARKETPLACE_DETAIL_PARAM);

  const write = useCallback(
    (next: MarketplaceQuery) => setParams((prev) => mergeMarketplaceParams(prev, next), { replace: true }),
    [setParams],
  );
  const change = (patch: Partial<MarketplaceQuery>) => write({ ...query, ...patch });
  const clear = () => write({ sort: query.sort });
  const openDetail = (id: string | null) => setParams((prev) => withParam(prev, MARKETPLACE_DETAIL_PARAM, id));

  const chips: FilterChip[] = [];
  if (query.category) chips.push({ key: 'category', label: query.category, remove: () => change({ category: undefined }) });
  if (query.platform) chips.push({ key: 'platform', label: platformName(query.platform), remove: () => change({ platform: undefined }) });
  if (query.budget)
    chips.push({
      key: 'budget',
      label: BUDGET_RANGES.find((b) => b.key === query.budget)!.label,
      remove: () => change({ budget: undefined }),
    });

  const list = q.data;
  const now = Date.now();
  let body: ReactNode;
  if (q.loading && !list) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải chiến dịch">
        {[0, 1, 2].map((i) => (
          <MarketplaceCampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (q.error && !list) {
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
  } else if (list && list.length === 0) {
    const filtered = hasMarketplaceFilters(query);
    body = (
      <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
        <div className={cn('flex size-12 items-center justify-center rounded-full', filtered ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
          {filtered ? <SearchX className="size-6" aria-hidden /> : <Store className="size-6" aria-hidden />}
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
  } else if (list) {
    body = (
      <ul className="flex flex-col gap-3" aria-label="Chiến dịch đang nhận đề xuất">
        {list.map((c) => (
          <li key={c.id}>
            <MarketplaceCampaignCard campaign={c} now={now} onOpen={() => openDetail(c.id)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      {!access.loading && !access.approved && <SupplierGate ownerType={access.ownerType} status={access.status} />}

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

      {list && list.length > 0 && (
        <p className="text-sm font-medium text-foreground" aria-live="polite">
          {list.length} chiến dịch đang nhận đề xuất
        </p>
      )}

      {body}

      <CampaignDetailSheet campaignId={detailId} onClose={() => openDetail(null)} access={access} />
    </div>
  );
}
