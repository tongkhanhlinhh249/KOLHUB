import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Building2, ChevronRight, Loader2, MessageSquareQuote, RotateCcw, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import { bookingService, portfolioService, type BookingView, type SupplierRatingRow } from '../../services';
import { SUPPLIER_CAMPAIGNS_PATH } from '../../auth/roles';
import { useLiveQuery } from '../shared/useLiveQuery';
import { SupplierGate, useSupplierAccess } from '../supplier-booking/useSupplierAccess';
import { bookingDetailPath, formatDateTime, withParam } from '../supplier-booking/supplierBooking';
import { errText } from '../supplier-booking/parts';
import { RateDialog } from '../supplier-booking/BookingDialogs';
import { formatAverage, parseRatingsTab, pendingRatings, RATINGS_TABS, ratingsOf, ratingSummary, type RatingEntry, type RatingsTab, type RatingSummary } from './ratingsView';

const day = (ms: number) => formatDateTime(ms).slice(0, 10);

function Stars({ stars, className }: { stars: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${stars}/5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn('size-4', className, i <= stars ? 'fill-chart-5 text-chart-5' : 'text-muted-foreground/40')} aria-hidden />
      ))}
    </span>
  );
}

function SummaryCard({ summary, tab }: { summary: RatingSummary; tab: RatingsTab }) {
  const who = tab === 'nhan-hang' ? 'Nhãn hàng đánh giá bạn' : 'Bạn đánh giá Nhãn hàng';
  return (
    <Card className="gap-4 p-4 md:p-5" aria-label={`Tóm tắt: ${who}`}>
      <div className="grid gap-4 @xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] @xl:items-center">
        <div className="flex items-center gap-4 @xl:flex-col @xl:items-start @xl:gap-1">
          <p className="text-4xl font-bold text-foreground tabular-nums">{formatAverage(summary)}</p>
          <div className="min-w-0 space-y-1">
            <Stars stars={Math.round(summary.average)} />
            <p className="text-sm text-muted-foreground">
              {summary.count} đánh giá · {summary.fiveStarPercent}% 5★
            </p>
          </div>
        </div>
        <ul className="space-y-1.5" aria-label="Phân bố số sao">
          {summary.distribution.map((d) => (
            <li key={d.stars} className="flex items-center gap-2 text-sm">
              <span className="w-8 shrink-0 text-muted-foreground tabular-nums">{d.stars}★</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className="block h-full rounded-full bg-chart-5" style={{ width: `${d.percent}%` }} />
              </span>
              <span className="w-14 shrink-0 text-right text-muted-foreground tabular-nums">
                <span className="sr-only">{d.stars} sao: </span>
                {d.count} · {d.percent}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Meta({ row, showKol }: { row: SupplierRatingRow; showKol: boolean }) {
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
      <Building2 className="size-3.5 shrink-0" aria-hidden />
      <span className="font-medium text-foreground">{row.brandCompany}</span>
      <span aria-hidden>·</span>
      <Link to={bookingDetailPath(row.bookingId)} className="min-w-0 break-words text-primary underline-offset-4 hover:underline">
        {row.campaignName}
      </Link>
      {showKol && row.kolNames.length > 0 && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5 shrink-0" aria-hidden />
            KOL {row.kolNames.join(', ')}
          </span>
        </>
      )}
    </p>
  );
}

function RatingCard({ entry: { row, rating }, showKol }: { entry: RatingEntry; showKol: boolean }) {
  return (
    <Card className="gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stars stars={rating.stars} />
        <time className="text-xs text-muted-foreground tabular-nums" dateTime={new Date(rating.at).toISOString()}>
          {day(rating.at)}
        </time>
      </div>
      {rating.comment ? (
        <p className="text-sm break-words text-foreground">“{rating.comment}”</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">Không có nhận xét</p>
      )}
      <Meta row={row} showKol={showKol} />
    </Card>
  );
}

function PendingList({ rows, showKol, onRate, opening }: { rows: SupplierRatingRow[]; showKol: boolean; onRate(id: string): void; opening: string | null }) {
  return (
    <section aria-labelledby="cho-danh-gia" className="space-y-2 rounded-[8px] border border-primary/30 bg-primary/5 p-4">
      <div>
        <h2 id="cho-danh-gia" className="text-base font-semibold text-foreground">
          Chờ bạn đánh giá <span className="text-muted-foreground tabular-nums">({rows.length})</span>
        </h2>
        <p className="text-sm text-muted-foreground">Booking đã hoàn tất mà bạn chưa đánh giá Nhãn hàng. Đánh giá chỉ lưu nội bộ, Nhãn hàng không xem được.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.bookingId} className="flex flex-wrap items-center gap-3 rounded-[8px] border border-border bg-card p-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <Meta row={r} showKol={showKol} />
              <p className="text-xs text-muted-foreground">Hoàn tất {day(r.completedAt)}</p>
            </div>
            <Button type="button" size="sm" className="h-11 md:h-8" onClick={() => onRate(r.bookingId)} disabled={opening !== null}>
              {opening === r.bookingId ? <Loader2 className="animate-spin" aria-hidden /> : <Star aria-hidden />}
              Đánh giá
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const EMPTY: Record<RatingsTab, { title: string; text: string }> = {
  'nhan-hang': {
    title: 'Chưa có đánh giá từ Nhãn hàng',
    text: 'Khi một booking hoàn tất, Nhãn hàng có thể đánh giá bạn. Đánh giá sẽ hiện ở đây kèm chiến dịch và nhận xét.',
  },
  'cua-ban': {
    title: 'Bạn chưa đánh giá Nhãn hàng nào',
    text: 'Sau khi booking hoàn tất, bạn có thể đánh giá Nhãn hàng (chỉ lưu nội bộ). Các đánh giá bạn đã gửi sẽ hiện ở đây.',
  },
};

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquareQuote className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      <Link to={SUPPLIER_CAMPAIGNS_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
        Chiến dịch của tôi
        <ChevronRight aria-hidden />
      </Link>
    </div>
  );
}

/**
 * /danh-gia — "Đánh giá" of the signed-in KOL / MCN (completed bookings): "Chờ bạn đánh giá" (opens the existing
 * rating dialog), then tabs "Nhãn hàng đánh giá bạn" / "Bạn đánh giá" (?tab=cua-ban) with a summary (average, count,
 * 5→1 distribution, share of 5★) and one card per rating. MCN: KOL names on each rating.
 */
export function RatingsPage() {
  const access = useSupplierAccess();
  const [params, setParams] = useSearchParams();
  const q = useLiveQuery(() => (access.approved ? portfolioService.listRatings() : Promise.resolve(null)), [access.approved, access.accountId]);
  const tab = parseRatingsTab(params);
  const rows = q.data ?? undefined;
  const entries = useMemo(() => ratingsOf(rows ?? [], tab), [rows, tab]);
  const summary = useMemo(() => ratingSummary(entries.map((e) => e.rating)), [entries]);
  const pending = useMemo(() => pendingRatings(rows ?? []), [rows]);
  const showKol = access.ownerType === 'MCN';
  const [opening, setOpening] = useState<string | null>(null);
  const [rateBooking, setRateBooking] = useState<BookingView | null>(null);

  const setTab = (t: string) => setParams((prev) => withParam(prev, 'tab', t === 'cua-ban' ? 'cua-ban' : null), { replace: true });
  const openRate = async (id: string) => {
    setOpening(id);
    try {
      setRateBooking(await bookingService.get(id));
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setOpening(null);
    }
  };

  if (access.loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3 p-4 md:p-6" aria-busy="true">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!access.approved) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
        <SupplierGate ownerType={access.ownerType} status={access.status} />
        <Empty title="Đánh giá sẽ xuất hiện ở đây" text="Sau khi hồ sơ được duyệt và bạn hoàn tất booking với Nhãn hàng, hai bên có thể đánh giá nhau tại trang này." />
      </div>
    );
  }

  let body: ReactNode;
  if (q.loading && !rows) {
    body = (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải đánh giá">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (q.error && !rows) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được đánh giá.</span>
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (entries.length === 0) {
    body = <Empty {...EMPTY[tab]} />;
  } else {
    body = (
      <>
        <SummaryCard summary={summary} tab={tab} />
        <ul className="grid gap-3 @2xl:grid-cols-2" aria-label={RATINGS_TABS.find((t) => t.key === tab)!.label}>
          {entries.map((e) => (
            <li key={e.row.bookingId} className="min-w-0">
              <RatingCard entry={e} showKol={showKol} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      {pending.length > 0 && <PendingList rows={pending} showKol={showKol} onRate={(id) => void openRate(id)} opening={opening} />}

      <div className="-mx-4 min-w-0 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto" aria-label="Đánh giá">
            {RATINGS_TABS.map((t) => {
              const n = rows ? ratingsOf(rows, t.key).length : undefined;
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

      {body}

      {rateBooking && <RateDialog open onOpenChange={(o) => !o && setRateBooking(null)} booking={rateBooking} />}
    </div>
  );
}
