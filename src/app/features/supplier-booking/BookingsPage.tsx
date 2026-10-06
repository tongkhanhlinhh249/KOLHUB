import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Filter, Handshake, RotateCcw, X } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { bookingService } from '../../services';
import { MARKETPLACE_PATH } from '../../auth/roles';
import { useLiveQuery } from '../shared/useLiveQuery';
import { BulkBar, useMediaQuery, ViewToggle } from '../shared/DataTable';
import { StepTabs } from '../shared/StepTabs';
import { parseListView, TABLE_DEFAULT_QUERY, VIEW_PARAM, withListView } from '../shared/tableView';
import { BookingDetailSheet } from './BookingDetailSheet';
import { BookingCardGrid, BookingTable } from './BookingListViews';
import {
  BOOKING_DETAIL_PARAM,
  BOOKING_TABS,
  countByTab,
  defaultBookingTab,
  needsSupplier,
  parseBookingTab,
  parseSupplierSort,
  sortSupplierBookings,
  supplierSortValue,
  tabOf,
  withParam,
  type BookingTab,
} from './supplierBooking';
import { SupplierGate, useSupplierAccess } from './useSupplierAccess';
import { PIPELINE_STAGES, parseStageParam, stageOf, STAGE_PARAM } from '../creator/workspace';

const EMPTY: Record<BookingTab, string> = {
  'can-xu-ly': 'Không có lời mời hay đề xuất giá nào đang chờ bạn.',
  'dang-trao-doi': 'Không có đề xuất nào đang chờ Nhãn hàng phản hồi.',
  'dang-thuc-hien': 'Chưa có booking nào đang sản xuất hoặc đăng bài.',
  'cho-thanh-toan': 'Không có booking nào đang chờ thanh toán.',
  'hoan-tat': 'Chưa có booking nào hoàn tất.',
  'da-dong': 'Không có booking nào bị từ chối, huỷ hoặc hết hạn.',
};

function BookingRowSkeleton() {
  return (
    <Card className="gap-3 p-4 md:p-5" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-5 w-2/3" />
      <div className="flex justify-between border-t border-border pt-3">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-24" />
      </div>
    </Card>
  );
}

/**
 * /chien-dich-cua-toi ("Chiến dịch", was /booking) — invites and applications of the signed-in MCN / KOL grouped by stage tabs;
 * `?tab=` selects the stage, `?booking=<id>` opens the detail sheet. `?giai-doan=` (from the pipeline on "Tổng quan hồ sơ")
 * filters across tabs by pipeline stage until a tab is picked or the filter is cleared.
 */
export function BookingsPage() {
  const access = useSupplierAccess();
  const [params, setParams] = useSearchParams();
  const detailId = params.get(BOOKING_DETAIL_PARAM);
  const q = useLiveQuery(() => (access.approved ? bookingService.listForSupplier() : Promise.resolve(null)), [access.approved, access.accountId]);
  const all = q.data ?? undefined;
  // No ?tab=: the linked booking's stage, else "Cần xử lý" when it has items, else the first non-empty stage.
  const tab = params.has('tab') ? parseBookingTab(params) : defaultBookingTab(all ?? [], detailId);
  const counts = useMemo(() => countByTab(all ?? []), [all]);
  const stage = parseStageParam(params);
  const stageLabel = PIPELINE_STAGES.find((s) => s.key === stage)?.label;
  const sort = parseSupplierSort(params);
  const rows = useMemo(
    () => sortSupplierBookings((all ?? []).filter((b) => (stage ? stageOf(b) === stage : tabOf(b) === tab)), sort),
    [all, tab, stage, sort],
  );
  const now = Date.now();
  const isDesktop = useMediaQuery(TABLE_DEFAULT_QUERY);
  const view = parseListView(params.get(VIEW_PARAM), isDesktop);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = view === 'table' ? rows.filter((b) => selected.has(b.id)).length : 0;
  const listLabel = stageLabel ?? BOOKING_TABS.find((t) => t.key === tab)?.label ?? 'Chiến dịch';

  const setTab = (t: string) => setParams((prev) => withParam(withParam(prev, STAGE_PARAM, null), 'tab', t), { replace: true });
  const clearStage = () => setParams((prev) => withParam(prev, STAGE_PARAM, null), { replace: true });
  const openDetail = (id: string | null) => setParams((prev) => withParam(prev, BOOKING_DETAIL_PARAM, id));
  const setSort = (s: typeof sort) => setParams((prev) => withParam(prev, 'sap-xep', supplierSortValue(s)), { replace: true });

  if (access.loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3 p-4 md:p-6" aria-busy="true">
        <BookingRowSkeleton />
        <BookingRowSkeleton />
      </div>
    );
  }

  if (!access.approved) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <SupplierGate ownerType={access.ownerType} status={access.status} />
        <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Handshake className="size-6" aria-hidden />
          </div>
          <p className="font-semibold text-foreground">Chiến dịch của bạn sẽ xuất hiện ở đây</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Lời mời từ Nhãn hàng và đề xuất bạn gửi từ Sàn chiến dịch được quản lý tại trang này sau khi hồ sơ được duyệt.
          </p>
          <Link to={MARKETPLACE_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
            Xem Sàn chiến dịch
          </Link>
        </div>
      </div>
    );
  }

  let body: ReactNode;
  if (q.loading && !all) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải chiến dịch">
        {[0, 1, 2].map((i) => (
          <BookingRowSkeleton key={i} />
        ))}
      </div>
    );
  } else if (q.error && !all) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được danh sách chiến dịch.</span>
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (all && all.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Handshake className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Chưa có chiến dịch nào</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Ứng tuyển chiến dịch trên Sàn chiến dịch hoặc chờ lời mời từ Nhãn hàng. Mọi trao đổi giá, nội dung và thanh toán được theo dõi tại đây.
        </p>
        <Link to={MARKETPLACE_PATH} className={buttonVariants({ className: 'h-11 md:h-9' })}>
          Xem Sàn chiến dịch
        </Link>
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <p className="rounded-[8px] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {stageLabel ? `Không có chiến dịch nào ở giai đoạn "${stageLabel}".` : EMPTY[tab]}
      </p>
    );
  } else {
    body =
      view === 'table' ? (
        <BookingTable
          rows={rows}
          now={now}
          sort={sort}
          onSort={setSort}
          selected={selected}
          onSelectedChange={setSelected}
          onOpen={openDetail}
          label={`Bảng chiến dịch: ${listLabel}`}
        />
      ) : (
        <BookingCardGrid rows={rows} now={now} onOpen={openDetail} label={listLabel} />
      );
  }

  const needsCount = (all ?? []).filter(needsSupplier).length;

  return (
    <div className="@container mx-auto w-full max-w-[1600px] min-w-0 space-y-4 p-4 md:p-6">
      {all && all.length > 0 && (
        <>
          <StepTabs
            label="Giai đoạn chiến dịch"
            value={stage ? null : tab}
            onChange={setTab}
            items={BOOKING_TABS.map((t) => ({
              key: t.key,
              label: t.label,
              count: counts[t.key],
              kind: t.key === 'can-xu-ly' ? 'start' : t.key === 'da-dong' ? 'end' : 'step',
            }))}
          />
          {stageLabel && (
            <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <Filter className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="text-foreground">
                Giai đoạn: <span className="font-semibold">{stageLabel}</span> · {rows.length} chiến dịch
              </span>
              <Button type="button" variant="ghost" size="sm" className="ml-auto h-11 md:h-8" onClick={clearStage}>
                <X aria-hidden />
                Bỏ lọc
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {all.length} chiến dịch
              {needsCount > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-primary">{needsCount} cần bạn xử lý</span>
                </>
              )}
            </p>
            <ViewToggle value={view} onChange={(v) => setParams((prev) => withListView(prev, v), { replace: true })} />
          </div>
          {view === 'table' && <BulkBar count={selectedCount} onClear={() => setSelected(new Set())} />}
        </>
      )}

      {body}

      <BookingDetailSheet bookingId={detailId} onClose={() => openDetail(null)} accountId={access.accountId} />
    </div>
  );
}
