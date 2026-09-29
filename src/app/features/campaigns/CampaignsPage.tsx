import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CalendarDays, ChevronRight, FileSearch, Megaphone, Plus, Wallet } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { bookingService, campaignService, type BrandBookingCounts, type CampaignView } from '../../services';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect } from '../filters/FilterSelect';
import { SortSelect } from '../filters/SortSelect';
import { brandLockedView } from '../shared/BrandLocked';
import { CampaignCover } from '../shared/CampaignCover';
import { useLiveQuery } from '../shared/useLiveQuery';
import { CampaignStatusBadge, EmptyBlock, LoadError, PlatformIcons, TodoMarker, VisibilityLabel } from './CampaignParts';
import {
  applyCampaignQuery,
  campaignPath,
  CAMPAIGN_SORTS,
  CAMPAIGNS_PATH,
  CAMPAIGN_TABS,
  countCampaignTabs,
  formatDateRange,
  formatVnd,
  hasCampaignFilters,
  parseCampaignListParams,
  pendingByCampaign,
  toCampaignListParams,
  VISIBILITY_OPTIONS,
  type CampaignListQuery,
  type CampaignTab,
} from './campaignView';

/** "3 đề xuất mới · 1 nội dung chờ duyệt · 1 chờ thanh toán" strip above the list. */
function TodoStrip({ counts }: { counts: BrandBookingCounts }) {
  const parts = [
    counts.awaitingBrand ? `${counts.awaitingBrand} booking chờ bạn trả lời` : null,
    counts.pendingReviews ? `${counts.pendingReviews} nội dung chờ duyệt` : null,
    counts.toPay ? `${counts.toPay} booking chờ thanh toán` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[8px] border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">
      <TodoMarker className="bg-transparent px-0" />
      <span className="text-foreground">{parts.join(' · ')}</span>
    </div>
  );
}

function CampaignRow({ c, pending }: { c: CampaignView; pending: number }) {
  const accepted = c.stats.inProgress + c.stats.completed;
  return (
    <Link
      to={campaignPath(c.id)}
      className="group block rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${c.name} — xem chi tiết`}
    >
      <Card className="@container gap-0 p-4 transition-colors group-hover:border-primary/40">
        <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-3 @xl:items-center @xl:gap-4">
            <CampaignCover
              cover={c.cover}
              className="hidden aspect-video w-24 shrink-0 rounded-[6px] @md:block @xl:w-32"
              iconClassName="size-5"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="min-w-0 truncate font-semibold text-foreground group-hover:text-primary">{c.name}</h3>
                <CampaignStatusBadge status={c.status} />
                <VisibilityLabel visibility={c.visibility} />
              </div>
              {c.objective && <p className="line-clamp-1 text-sm text-muted-foreground">{c.objective}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="tabular-nums">{formatDateRange(c.startDate, c.endDate)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="tabular-nums">{c.budget > 0 ? formatVnd(c.budget) : 'Chưa nhập ngân sách'}</span>
                </span>
                <PlatformIcons platforms={c.platforms} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 @3xl:border-0 @3xl:pt-0">
            <dl className="flex items-center gap-5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Booking</dt>
                <dd className="font-semibold text-foreground tabular-nums">{c.stats.total}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Đã chốt</dt>
                <dd className="font-semibold text-foreground tabular-nums">{accepted}</dd>
              </div>
            </dl>
            {pending > 0 && <TodoMarker label={`${pending} booking`} />}
            <ChevronRight className="ml-auto hidden size-5 text-muted-foreground @3xl:block" aria-hidden />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function RowsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải chiến dịch">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="gap-2 p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ))}
    </div>
  );
}

/** /chien-dich — the brand's campaigns: status tabs, search, visibility filter, per-campaign booking stats. */
export function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseCampaignListParams(searchParams);
  const q = useLiveQuery(
    () => Promise.all([campaignService.listMine(), bookingService.listForBrand(), bookingService.brandCounts()]),
    [],
  );
  const [campaigns, bookings, counts] = q.data ?? [];

  const write = (next: CampaignListQuery) => setSearchParams(toCampaignListParams(next), { replace: true });
  const change = (patch: Partial<CampaignListQuery>) => write({ ...query, ...patch });
  const clear = () => write({ tab: query.tab, sort: query.sort });

  const tabCounts = useMemo(() => countCampaignTabs(campaigns ?? [], query), [campaigns, query]);
  const rows = useMemo(() => applyCampaignQuery(campaigns ?? [], query), [campaigns, query]);
  const pending = useMemo(() => pendingByCampaign(bookings ?? []), [bookings]);

  if (q.error && !q.data) {
    const locked = brandLockedView(q.error);
    if (locked) return locked;
  }

  const createLink = (
    <Link to={`${CAMPAIGNS_PATH}/tao`} className={buttonVariants({ className: 'h-11 md:h-10' })}>
      <Plus aria-hidden />
      Tạo chiến dịch
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tạo chiến dịch, mời KOL/MCN hoặc đăng lên Sàn chiến dịch để nhận đề xuất.</p>
        {createLink}
      </div>

      {counts && <TodoStrip counts={counts} />}

      <FilterBar
        keyword={query.keyword}
        onKeywordChange={(keyword) => change({ keyword })}
        searchPlaceholder="Tìm tên chiến dịch, mục tiêu, brief"
        searchLabel="Tìm chiến dịch theo tên, mục tiêu hoặc brief"
        renderFilters={(cls) => (
          <FilterSelect
            label="Hiển thị"
            allLabel="Tất cả hiển thị"
            value={query.visibility}
            options={VISIBILITY_OPTIONS}
            onChange={(visibility) => change({ visibility })}
            className={cls}
          />
        )}
        filterGridClass="grid-cols-3"
        inlineFilterClass="@4xl:w-44"
        renderSort={(className) => (
          <SortSelect value={query.sort ?? 'updated'} options={CAMPAIGN_SORTS} onChange={(sort) => change({ sort })} className={className} />
        )}
        sortClass="@4xl:w-56"
        filterCount={query.visibility ? 1 : 0}
        active={hasCampaignFilters(query)}
        chips={
          query.visibility
            ? [{ key: 'vis', label: VISIBILITY_OPTIONS.find((v) => v.key === query.visibility)!.label, remove: () => change({ visibility: undefined }) }]
            : []
        }
        onClear={clear}
      />

      <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs value={query.tab} onValueChange={(t) => change({ tab: t as CampaignTab })}>
          <TabsList className="h-auto" aria-label="Lọc theo trạng thái">
            {CAMPAIGN_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="h-11 md:h-8">
                {t.label} ({campaigns ? tabCounts[t.key] : '–'})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {q.loading && !q.data ? (
        <RowsSkeleton />
      ) : q.error && !q.data ? (
        <LoadError message="Không tải được danh sách chiến dịch." onRetry={q.reload} />
      ) : campaigns && campaigns.length === 0 ? (
        <Card className="p-0">
          <EmptyBlock
            icon={<Megaphone className="size-6" aria-hidden />}
            title="Chưa có chiến dịch nào"
            text="Tạo chiến dịch đầu tiên, rồi mời KOL từ danh sách đã lưu hoặc đăng lên Sàn chiến dịch để KOL/MCN ứng tuyển."
          >
            {createLink}
          </EmptyBlock>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyBlock icon={<FileSearch className="size-6" aria-hidden />} title="Không có chiến dịch phù hợp" text="Thử chọn trạng thái khác hoặc bỏ bớt bộ lọc.">
          <Button type="button" variant="outline" className="h-11" onClick={() => write({ tab: 'all', sort: query.sort })}>
            Xoá bộ lọc
          </Button>
        </EmptyBlock>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Danh sách chiến dịch">
          {rows.map((c) => (
            <li key={c.id}>
              <CampaignRow c={c} pending={pending[c.id] ?? 0} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
