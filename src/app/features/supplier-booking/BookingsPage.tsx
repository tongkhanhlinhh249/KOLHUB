import { useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Building2, Handshake, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import { bookingService, type BookingView } from '../../services';
import { MARKETPLACE_PATH } from '../../auth/roles';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { useLiveQuery } from '../shared/useLiveQuery';
import { BookingDetailSheet } from './BookingDetailSheet';
import { BookingStatusBadge, CountdownText, KolAvatarStack, NeedsYouMarker, OriginBadge } from './parts';
import {
  BOOKING_DETAIL_PARAM,
  BOOKING_TABS,
  countByTab,
  defaultBookingTab,
  expiryCountdown,
  formatDateTime,
  needsSupplier,
  parseBookingTab,
  priceText,
  tabOf,
  withParam,
  type BookingTab,
} from './supplierBooking';
import { SupplierGate, useSupplierAccess } from './useSupplierAccess';

const EMPTY: Record<BookingTab, string> = {
  'can-xu-ly': 'Không có lời mời hay đề xuất giá nào đang chờ bạn.',
  'dang-trao-doi': 'Không có đề xuất nào đang chờ Nhãn hàng phản hồi.',
  'dang-thuc-hien': 'Chưa có booking nào đang sản xuất hoặc đăng bài.',
  'cho-thanh-toan': 'Không có booking nào đang chờ thanh toán.',
  'hoan-tat': 'Chưa có booking nào hoàn tất.',
  'da-dong': 'Không có booking nào bị từ chối, huỷ hoặc hết hạn.',
};

function BookingRow({ booking: b, now, onOpen }: { booking: BookingView; now: number; onOpen(): void }) {
  const needs = needsSupplier(b);
  const platforms = [...new Set(b.items.map((i) => i.channel?.platform ?? i.platform))];
  const pre = ['SENT', 'APPLIED', 'NEGOTIATING'].includes(b.status);
  const kols = new Set(b.items.map((i) => i.kolAccountId)).size;
  return (
    <Card className={cn('relative gap-3 p-4 transition-colors hover:border-primary/40 md:p-5', needs && 'border-primary/40')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate font-medium text-foreground">{b.campaign.brand.company}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {needs && <NeedsYouMarker />}
          <OriginBadge origin={b.origin} />
          <BookingStatusBadge booking={b} />
        </div>
      </div>
      <h2 className="text-base leading-snug font-semibold break-words text-foreground">
        <button
          type="button"
          onClick={onOpen}
          className="text-left after:absolute after:inset-0 after:rounded-[8px] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {b.campaign.name}
        </button>
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-3">
          <KolAvatarStack items={b.items} />
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="text-foreground">
              {kols} KOL · {b.items.length} hạng mục
            </p>
            <p className="flex items-center gap-1">
              {platforms.map((p) => (
                <PlatformIcon key={p} platform={p} className="size-4" />
              ))}
              {b.items.some((i) => !i.channelId) && <span className="text-destructive">Thiếu kênh</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p className={cn('text-sm font-semibold tabular-nums', b.price > 0 ? 'text-foreground' : 'text-muted-foreground')}>{priceText(b.price)}</p>
          {pre && b.expiresAt !== undefined ? (
            <CountdownText countdown={expiryCountdown(b.expiresAt, now)} prefix="Hạn phản hồi" />
          ) : (
            <p className="text-xs text-muted-foreground">Cập nhật {formatDateTime(b.updatedAt)}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

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
 * `?tab=` selects the stage, `?booking=<id>` opens the detail sheet.
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
  const rows = useMemo(() => (all ?? []).filter((b) => tabOf(b) === tab), [all, tab]);
  const now = Date.now();

  const setTab = (t: string) => setParams((prev) => withParam(prev, 'tab', t), { replace: true });
  const openDetail = (id: string | null) => setParams((prev) => withParam(prev, BOOKING_DETAIL_PARAM, id));

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
    body = <p className="rounded-[8px] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{EMPTY[tab]}</p>;
  } else {
    body = (
      <ul className="flex flex-col gap-3" aria-label={BOOKING_TABS.find((t) => t.key === tab)?.label}>
        {rows.map((b) => (
          <li key={b.id}>
            <BookingRow booking={b} now={now} onOpen={() => openDetail(b.id)} />
          </li>
        ))}
      </ul>
    );
  }

  const needsCount = (all ?? []).filter(needsSupplier).length;

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      {all && all.length > 0 && (
        <>
          <div className="-mx-4 min-w-0 overflow-x-auto px-4 md:mx-0 md:px-0">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto" aria-label="Giai đoạn chiến dịch">
                {BOOKING_TABS.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className="h-11 gap-1.5 md:h-8">
                    {t.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-xs tabular-nums',
                        t.key === 'can-xu-ly' && counts[t.key] > 0 ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-muted-foreground',
                      )}
                    >
                      {counts[t.key]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {all.length} chiến dịch
            {needsCount > 0 && (
              <>
                {' · '}
                <span className="font-medium text-primary">{needsCount} cần bạn xử lý</span>
              </>
            )}
          </p>
        </>
      )}

      {body}

      <BookingDetailSheet bookingId={detailId} onClose={() => openDetail(null)} accountId={access.accountId} />
    </div>
  );
}
