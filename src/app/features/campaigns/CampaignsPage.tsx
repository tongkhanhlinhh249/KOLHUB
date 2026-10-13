import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Ban, BellDot, FileSearch, Lock, Megaphone, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { bookingService, campaignService, type BrandBookingCounts } from '../../services';
import { SearchPagination } from '../biz-search/SearchPagination';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect } from '../filters/FilterSelect';
import { brandLockedView } from '../shared/BrandLocked';
import { BulkBar, InfoBar, SortMenuButton, useMediaQuery, ViewToggle } from '../shared/DataTable';
import { StepTabs } from '../shared/StepTabs';
import { listViewValue, parseListView, TABLE_DEFAULT_QUERY, VIEW_PARAM, type ListView } from '../shared/tableView';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ConfirmAction } from './BookingActions';
import { CampaignTypeDialog } from './CampaignTypeDialog';
import { ReasonDialog } from '../violations/ReasonDialog';
import { EmptyBlock, errText, LoadError } from './CampaignParts';
import { CampaignCardGrid, CampaignTable, groupBookings, type CampaignBulkKind } from './CampaignListViews';
import {
  applyCampaignQuery,
  campaignActions,
  CAMPAIGN_SORTS,
  CAMPAIGN_TABS,
  CAMPAIGN_TYPE_OPTIONS,
  countCampaignTabs,
  countCampaignTypes,
  hasCampaignFilters,
  parseCampaignListParams,
  pendingByCampaign,
  toCampaignListParams,
  VISIBILITY_OPTIONS,
  type CampaignListQuery,
} from './campaignView';

/** "Cần bạn xử lý" — soft grey info bar above the list (styled like the reference table's notice). */
function TodoStrip({ counts }: { counts: BrandBookingCounts }) {
  const parts = [
    counts.awaitingBrand ? `${counts.awaitingBrand} booking chờ bạn trả lời` : null,
    counts.pendingReviews ? `${counts.pendingReviews} nội dung chờ duyệt` : null,
    counts.toPay ? `${counts.toPay} booking chờ thanh toán` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <InfoBar icon={<BellDot className="size-4 text-primary" aria-hidden />}>
      <span className="font-medium">Cần bạn xử lý:</span> <span className="text-muted-foreground">{parts.join(' · ')}</span>
    </InfoBar>
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

/**
 * /chien-dich — the brand's campaigns in two views (?xem=bang | the; default: table from `lg`, cards below):
 * "Bảng" (sortable columns, row selection with Đóng / Huỷ, expandable rows) and "Thẻ" (a 3-column card grid).
 * Both share the status step bar (Tất cả · Nháp > Chờ duyệt > … > Đang tuyển > Đã đóng tuyển > Hoàn tất · Đã huỷ), search, type (with counts),
 * visibility and sort.
 */
export function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseCampaignListParams(searchParams);
  const isDesktop = useMediaQuery(TABLE_DEFAULT_QUERY);
  const viewParam = searchParams.get(VIEW_PARAM);
  const view = parseListView(viewParam, isDesktop);
  const table = view === 'table';
  const q = useLiveQuery(
    () => Promise.all([campaignService.listMine(), bookingService.listForBrand(), bookingService.brandCounts()]),
    [],
  );
  const [campaigns, bookings, counts] = q.data ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ kind: CampaignBulkKind; ids: string[] } | null>(null);
  // "Tạo chiến dịch" asks for the campaign type first, then opens the form.
  const [typeDialog, setTypeDialog] = useState(false);

  // The list params are rebuilt from the query, so ?xem= is carried over explicitly.
  const write = (next: CampaignListQuery, v: string | null = viewParam) => {
    const sp = toCampaignListParams(next);
    if (v) sp.set(VIEW_PARAM, v);
    setSearchParams(sp, { replace: true });
  };
  const change = (patch: Partial<CampaignListQuery>) => write({ ...query, ...patch });
  const clear = () => write({ tab: query.tab, sort: query.sort });
  const setView = (v: ListView) => write(query, listViewValue(v));

  const tabCounts = useMemo(() => countCampaignTabs(campaigns ?? [], query), [campaigns, query]);
  const typeCounts = useMemo(() => countCampaignTypes(campaigns ?? [], query), [campaigns, query]);
  const allRows = useMemo(() => applyCampaignQuery(campaigns ?? [], query), [campaigns, query]);
  // US-09 / §10: phân trang (back to page 1 whenever the filters change).
  const [page, setPage] = useState(1);
  const queryKey = JSON.stringify(query);
  useEffect(() => setPage(1), [queryKey]);
  const pageCount = Math.max(1, Math.ceil(allRows.length / CAMPAIGN_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = useMemo(() => allRows.slice((currentPage - 1) * CAMPAIGN_PAGE_SIZE, currentPage * CAMPAIGN_PAGE_SIZE), [allRows, currentPage]);
  const pending = useMemo(() => pendingByCampaign(bookings ?? []), [bookings]);
  const byCampaign = useMemo(() => groupBookings(bookings ?? []), [bookings]);

  const selectedRows = table ? rows.filter((r) => selected.has(r.id)) : [];
  const closable = selectedRows.filter((c) => campaignActions(c.status, c.type).closeRecruitment).map((c) => c.id);
  const cancellable = selectedRows.filter((c) => campaignActions(c.status, c.type).cancel).map((c) => c.id);

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
    setSelected((prev) => {
      const next = new Set(prev);
      done.forEach((id) => next.delete(id));
      return next;
    });
  };

  const createLink = (
    <Button type="button" className="h-11 md:h-10" onClick={() => setTypeDialog(true)}>
      <Plus aria-hidden />
      Tạo chiến dịch
    </Button>
  );

  const chips = [
    ...(query.type ? [{ key: 'type', label: CAMPAIGN_TYPE_OPTIONS.find((t) => t.key === query.type)!.label, remove: () => change({ type: undefined }) }] : []),
    ...(query.visibility
      ? [{ key: 'vis', label: VISIBILITY_OPTIONS.find((v) => v.key === query.visibility)!.label, remove: () => change({ visibility: undefined }) }]
      : []),
  ];

  return (
    <div className="@container mx-auto w-full max-w-[1600px] min-w-0 space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tạo chiến dịch, mời KOL/MCN hoặc đăng lên Sàn chiến dịch để nhận đề xuất.</p>
        {createLink}
      </div>

      <FilterBar
        keyword={query.keyword}
        onKeywordChange={(keyword) => change({ keyword })}
        searchPlaceholder="Tìm tên chiến dịch, mục tiêu, brief"
        searchLabel="Tìm chiến dịch theo tên, mục tiêu hoặc brief"
        renderFilters={(cls) => (
          <>
            <FilterSelect
              label="Loại chiến dịch"
              allLabel={`Tất cả loại (${campaigns ? typeCounts.all : '–'})`}
              value={query.type}
              options={CAMPAIGN_TYPE_OPTIONS.map((t) => ({ key: t.key, label: `${t.label} (${campaigns ? typeCounts[t.key] : '–'})` }))}
              onChange={(type) => change({ type })}
              className={cls}
            />
            <FilterSelect
              label="Hiển thị"
              allLabel="Tất cả hiển thị"
              value={query.visibility}
              options={VISIBILITY_OPTIONS}
              onChange={(visibility) => change({ visibility })}
              className={cls}
            />
          </>
        )}
        filterGridClass="grid-cols-2"
        inlineFilterClass="@4xl:w-52"
        renderSort={(className) => (
          <SortMenuButton value={query.sort ?? 'updated'} options={CAMPAIGN_SORTS} onChange={(sort) => change({ sort })} className={className} />
        )}
        sortClass="w-auto @4xl:w-auto"
        filterCount={(query.type ? 1 : 0) + (query.visibility ? 1 : 0)}
        active={hasCampaignFilters(query)}
        chips={chips}
        onClear={clear}
      />

      {counts && <TodoStrip counts={counts} />}

      <StepTabs
        label="Lọc theo trạng thái"
        value={query.tab}
        onChange={(t) => change({ tab: t })}
        items={CAMPAIGN_TABS.map((t) => ({
          key: t.key,
          label: t.label,
          count: campaigns ? tabCounts[t.key] : undefined,
          kind: t.key === 'all' ? 'start' : t.key === 'CANCELLED' ? 'end' : 'step',
        }))}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {campaigns ? `${allRows.length} chiến dịch` : ''}
        </p>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {table && (
        <BulkBar count={selectedRows.length} onClear={() => setSelected(new Set())}>
          {closable.length > 0 && (
            <Button type="button" variant="outline" size="sm" className="h-11 bg-card md:h-8" onClick={() => setBulk({ kind: 'close', ids: closable })}>
              <Lock aria-hidden />
              Đóng tuyển ({closable.length})
            </Button>
          )}
          {cancellable.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive md:h-8"
              onClick={() => setBulk({ kind: 'cancel', ids: cancellable })}
            >
              <Ban aria-hidden />
              Huỷ chiến dịch ({cancellable.length})
            </Button>
          )}
        </BulkBar>
      )}

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
        <EmptyBlock icon={<FileSearch className="size-6" aria-hidden />} title="Không có chiến dịch phù hợp" text="Thử chọn trạng thái khác hoặc bỏ bớt bộ lọc.">
          <Button type="button" variant="outline" className="h-11" onClick={() => write({ tab: 'all', sort: query.sort })}>
            Xoá bộ lọc
          </Button>
        </EmptyBlock>
      ) : table ? (
        <CampaignTable
          rows={rows}
          pending={pending}
          bookingsByCampaign={byCampaign}
          sort={query.sort ?? 'updated'}
          onSort={(sort) => change({ sort })}
          selected={selected}
          onSelectedChange={setSelected}
          onAction={(kind, ids) => setBulk({ kind, ids })}
        />
      ) : (
        <CampaignCardGrid rows={rows} pending={pending} bookingsByCampaign={byCampaign} onAction={(kind, ids) => setBulk({ kind, ids })} />
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
      {/* EP-02 §6.5: huỷ phải có lý do (one reason for the whole selection). */}
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
