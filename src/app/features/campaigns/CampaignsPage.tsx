import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AlertCircle, FileSearch, Megaphone, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { bookingService, campaignService } from '../../services';
import { SearchPagination } from '../biz-search/SearchPagination';
import { FilterSelect } from '../filters/FilterSelect';
import { KeywordSearch } from '../filters/KeywordSearch';
import { brandLockedView } from '../shared/BrandLocked';
import { SortMenuButton } from '../shared/DataTable';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ConfirmAction } from './BookingActions';
import { CampaignTypeDialog } from './CampaignTypeDialog';
import { ReasonDialog } from '../violations/ReasonDialog';
import { EmptyBlock, errText, LoadError } from './CampaignParts';
import { CampaignListCard } from './CampaignListCard';
import { groupBookings, type CampaignBulkKind } from './CampaignListViews';
import {
  applyCampaignQuery,
  CAMPAIGN_GROUPS,
  CAMPAIGN_LIST_SORTS,
  CAMPAIGN_TABS,
  CAMPAIGN_TYPE_OPTIONS,
  campaignTodos,
  countCampaignGroups,
  hasCampaignFilters,
  parseCampaignListParams,
  toCampaignListParams,
  VISIBILITY_OPTIONS,
  type CampaignGroup,
  type CampaignListQuery,
} from './campaignView';

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

const BULK_COPY: Record<CampaignBulkKind, { title: (n: number) => string; text: string; label: string; done: string; verb: string }> = {
  close: {
    title: (n) => (n > 1 ? `Đóng tuyển ${n} chiến dịch?` : 'Đóng tuyển?'),
    text: 'Đóng tuyển sẽ ngừng nhận đơn mới. Các đơn đã gửi và hợp tác đã xác nhận vẫn được giữ.',
    label: 'Đóng tuyển',
    done: 'Đã đóng tuyển',
    verb: 'đóng tuyển',
  },
  cancel: {
    title: (n) => (n > 1 ? `Huỷ ${n} chiến dịch?` : 'Huỷ chiến dịch?'),
    text: 'Chiến dịch chuyển sang Đã huỷ và không mở lại được. Lời mời, đơn chưa chốt bị huỷ kèm lý do. Còn hợp tác đang thực hiện thì chưa huỷ được.',
    label: 'Huỷ chiến dịch',
    done: 'Đã huỷ',
    verb: 'huỷ',
  },
};

/** Campaigns per page (table and cards). */
const CAMPAIGN_PAGE_SIZE = 10;

/** Navigation groups as one tablist that always fits (no horizontal scroll, §3.1). */
function GroupTabs({ value, counts, onChange }: { value: CampaignGroup; counts?: Record<CampaignGroup, number>; onChange(g: CampaignGroup): void }) {
  return (
    <div role="tablist" aria-label="Nhóm chiến dịch" className="grid grid-cols-2 gap-1 rounded-[8px] bg-muted p-1 @xl:inline-grid @xl:grid-cols-4">
      {CAMPAIGN_GROUPS.map((g) => {
        const active = g.key === value;
        return (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(g.key)}
            className={cn(
              'flex h-11 items-center justify-center gap-1.5 rounded-[6px] px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9',
              active ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {g.label}
            {counts && <span className={cn('text-xs tabular-nums', active ? 'text-primary' : 'text-muted-foreground')}>{counts[g.key]}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * /chien-dich — "Quản lý chiến dịch" (UI/UX tối ưu): four navigation groups (Tất cả · Chuẩn bị · Đang hoạt động · Đã
 * kết thúc), a "Cần xử lý" filter, "Bộ lọc" (detailed status, type, visibility) and two sorts; each campaign is a
 * horizontal card answering: which campaign, where it stands, how many KOL, what to do next. Paginated, never scrolls
 * sideways. Params: ?nhom=, ?can-xu-ly=1, ?trang-thai=, ?loai=, ?hien-thi=, ?q=, ?sap-xep=han-tuyen.
 */
export function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseCampaignListParams(searchParams);
  const q = useLiveQuery(() => Promise.all([campaignService.listMine(), bookingService.listForBrand()]), []);
  const [campaigns, bookings] = q.data ?? [];
  const [bulk, setBulk] = useState<{ kind: CampaignBulkKind; ids: string[] } | null>(null);
  // "Tạo chiến dịch" asks for the campaign type first, then opens the form.
  const [typeDialog, setTypeDialog] = useState(false);
  const now = Date.now();

  const write = (next: CampaignListQuery) => setSearchParams(toCampaignListParams(next), { replace: true });
  const change = (patch: Partial<CampaignListQuery>) => write({ ...query, ...patch });

  const byCampaign = useMemo(() => groupBookings(bookings ?? []), [bookings]);
  // Campaigns with something for the brand to do ("Cần xử lý").
  const todoIds = useMemo(
    () => new Set((campaigns ?? []).filter((c) => campaignTodos(c, byCampaign[c.id] ?? []).length > 0).map((c) => c.id)),
    [campaigns, byCampaign],
  );
  const groupCounts = useMemo(() => countCampaignGroups(campaigns ?? [], query, todoIds), [campaigns, query, todoIds]);
  const allRows = useMemo(() => applyCampaignQuery(campaigns ?? [], query, todoIds), [campaigns, query, todoIds]);
  const todoCount = useMemo(
    () => applyCampaignQuery(campaigns ?? [], { ...query, todo: false }, todoIds).filter((c) => todoIds.has(c.id)).length,
    [campaigns, query, todoIds],
  );
  // US-09 / §10: phân trang (back to page 1 whenever the filters change).
  const [page, setPage] = useState(1);
  const queryKey = JSON.stringify(query);
  useEffect(() => setPage(1), [queryKey]);
  const pageCount = Math.max(1, Math.ceil(allRows.length / CAMPAIGN_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = useMemo(() => allRows.slice((currentPage - 1) * CAMPAIGN_PAGE_SIZE, currentPage * CAMPAIGN_PAGE_SIZE), [allRows, currentPage]);

  if (q.error && !q.data) {
    const locked = brandLockedView(q.error);
    if (locked) return locked;
  }

  const runBulk = async (reason?: string) => {
    if (!bulk) return;
    const copy = BULK_COPY[bulk.kind];
    const results = await Promise.allSettled(bulk.ids.map((id) => (bulk.kind === 'close' ? campaignService.closeRecruitment(id) : campaignService.cancel(id, reason))));
    const done = bulk.ids.filter((_, i) => results[i].status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (done.length) toast.success(`${copy.done} ${done.length} chiến dịch`);
    if (failed.length) toast.error(`${failed.length} chiến dịch không ${copy.verb} được`, { description: errText(failed[0].reason) });
  };

  const createLink = (
    <Button type="button" className="h-11 md:h-10" onClick={() => setTypeDialog(true)}>
      <Plus aria-hidden />
      Tạo chiến dịch
    </Button>
  );
  const filterCount = (query.tab !== 'all' ? 1 : 0) + (query.type ? 1 : 0) + (query.visibility ? 1 : 0);

  return (
    <div className="@container mx-auto w-full max-w-6xl min-w-0 space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <KeywordSearch
          keyword={query.keyword}
          onKeywordChange={(keyword) => change({ keyword })}
          placeholder="Tìm tên chiến dịch"
          label="Tìm tên chiến dịch"
          className="order-1 w-full @xl:w-auto @xl:min-w-56 @xl:flex-1"
        />
        <div className="order-2 flex w-full flex-wrap items-center gap-2 @xl:w-auto">
          <Button
            type="button"
            variant="outline"
            aria-pressed={!!query.todo}
            onClick={() => change({ todo: !query.todo || undefined })}
            className={cn('h-11 bg-card md:h-10', query.todo && 'border-primary bg-primary/10 text-primary hover:bg-primary/15')}
          >
            <AlertCircle aria-hidden />
            Cần xử lý
            {campaigns && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{todoCount}</span>}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className={cn('h-11 bg-card md:h-10', filterCount > 0 && 'border-primary text-primary')}>
                <SlidersHorizontal aria-hidden />
                Bộ lọc
                {filterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{filterCount}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
                <FilterSelect
                  label="Trạng thái"
                  allLabel="Mọi trạng thái"
                  value={query.tab === 'all' ? undefined : query.tab}
                  options={CAMPAIGN_TABS.filter((t) => t.key !== 'all').map((t) => ({ key: t.key as Exclude<typeof t.key, 'all'>, label: t.label }))}
                  onChange={(tab) => change({ tab: tab ?? 'all' })}
                  className="h-10 w-full"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Loại booking</p>
                <FilterSelect label="Loại booking" allLabel="Mọi loại" value={query.type} options={CAMPAIGN_TYPE_OPTIONS} onChange={(type) => change({ type })} className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Hiển thị</p>
                <FilterSelect label="Hiển thị" allLabel="Mọi hiển thị" value={query.visibility} options={VISIBILITY_OPTIONS} onChange={(visibility) => change({ visibility })} className="h-10 w-full" />
              </div>
              {filterCount > 0 && (
                <Button type="button" variant="ghost" className="h-10 w-full" onClick={() => change({ tab: 'all', type: undefined, visibility: undefined })}>
                  Xoá bộ lọc
                </Button>
              )}
            </PopoverContent>
          </Popover>
          <SortMenuButton value={query.sort ?? 'updated'} options={CAMPAIGN_LIST_SORTS} onChange={(sort) => change({ sort })} className="h-11 md:h-10" />
          <div className="ml-auto">{createLink}</div>
        </div>
      </div>

      <GroupTabs value={query.group ?? 'all'} counts={campaigns ? groupCounts : undefined} onChange={(g) => change({ group: g === 'all' ? undefined : g })} />

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
      ) : allRows.length === 0 ? (
        <EmptyBlock
          icon={<FileSearch className="size-6" aria-hidden />}
          title={query.todo ? 'Không có chiến dịch cần xử lý' : 'Không có chiến dịch phù hợp'}
          text={query.todo ? 'Mọi việc đã được xử lý.' : 'Thử chọn nhóm khác hoặc bỏ bớt bộ lọc.'}
        >
          {hasCampaignFilters(query) && (
            <Button type="button" variant="outline" className="h-11" onClick={() => write({ tab: 'all', group: query.group, sort: query.sort })}>
              Xoá bộ lọc
            </Button>
          )}
        </EmptyBlock>
      ) : (
        <ul className="space-y-3" aria-label="Danh sách chiến dịch">
          {rows.map((c) => (
            <li key={c.id}>
              <CampaignListCard c={c} bookings={byCampaign[c.id] ?? []} now={now} onAction={(kind, ids) => setBulk({ kind, ids })} />
            </li>
          ))}
        </ul>
      )}
      {allRows.length > 0 && (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums">
            {(currentPage - 1) * CAMPAIGN_PAGE_SIZE + 1}–{Math.min(currentPage * CAMPAIGN_PAGE_SIZE, allRows.length)} / {allRows.length} chiến dịch
          </p>
          <SearchPagination page={currentPage} pageCount={pageCount} onPage={setPage} />
        </div>
      )}

      {bulk?.kind === 'close' && (
        <ConfirmAction
          open
          onOpenChange={(o) => !o && setBulk(null)}
          title={BULK_COPY.close.title(bulk.ids.length)}
          description={BULK_COPY.close.text}
          confirmLabel={BULK_COPY.close.label}
          onConfirm={() => runBulk()}
        />
      )}
      {/* EP-02 §6.5: huỷ phải có lý do. */}
      <ReasonDialog
        open={bulk?.kind === 'cancel'}
        onOpenChange={(o) => !o && setBulk(null)}
        title={BULK_COPY.cancel.title(bulk?.ids.length ?? 1)}
        description={BULK_COPY.cancel.text}
        label="Lý do huỷ"
        placeholder="VD: Nhãn hàng dừng chương trình khuyến mãi"
        confirmLabel={BULK_COPY.cancel.label}
        maxLength={1000}
        destructive
        onConfirm={async (reason) => {
          await runBulk(reason);
          setBulk(null);
        }}
      />
      <CampaignTypeDialog open={typeDialog} onOpenChange={setTypeDialog} />
    </div>
  );
}
