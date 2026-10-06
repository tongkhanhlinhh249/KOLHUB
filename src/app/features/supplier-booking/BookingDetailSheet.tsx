import { useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, FileText, Gift, Loader2, RotateCcw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button, buttonVariants } from '../../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { CampaignCover } from '../shared/CampaignCover';
import { BOOKING_NOTE_MAX, bookingService, KolhubError, type BookingView } from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { formatFollowers } from '../biz-search/format';
import { channelName, ChannelLink } from '../channels/ChannelParts';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ApplicationDetailsBlock, RecruitStageStepper, RecruitTimeline, WorkflowNote } from '../shared/RecruitParts';
import { recruitStage, rewardText } from '../shared/recruitView';
import { ReasonDialog } from '../violations/ReasonDialog';
import { AssignItemsDialog, CounterDialog, DraftDialog, PostDialog, RateDialog } from './BookingDialogs';
import { DraftCard, PostCard } from './ContentParts';
import {
  BookingStatusBadge,
  CountdownText,
  errText,
  Fact,
  KolAvatar,
  LongText,
  NeedsYouMarker,
  OriginBadge,
  PlatformIcons,
  SheetSection,
} from './parts';
import {
  deliverableLabel,
  deliverablesSummary,
  eventLabel,
  expiryCountdown,
  formatDateTime,
  formatDay,
  formatDayRange,
  formatVnd,
  isRecruitBooking,
  needsSupplier,
  nextStepText,
  priceText,
  supplierTimeline,
} from './supplierBooking';

type DialogKey = 'accept' | 'counter' | 'decline' | 'cancel' | 'assign' | 'draft' | 'post' | 'paid' | 'rate' | 'received' | null;

/**
 * Supplier booking detail (?booking=): campaign summary (no budget), items with KOL/channel, contents with
 * KOL Safety results and brand feedback, payment, rating and history; actions from `allowedActions`.
 */
export function BookingDetailSheet({ bookingId, onClose, accountId }: { bookingId: string | null; onClose(): void; accountId: string }) {
  const q = useLiveQuery(() => (bookingId ? bookingService.get(bookingId) : Promise.resolve(null)), [bookingId]);
  const b = q.data && q.data.id === bookingId ? q.data : null;
  const notFound = q.error instanceof KolhubError && q.error.code === 'KOLHUB-4804';

  return (
    <Sheet open={bookingId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{b ? `Booking ${b.campaign.name}` : 'Chi tiết booking'}</SheetTitle>
          <SheetDescription>Thông tin chiến dịch, hạng mục, nội dung và lịch sử booking.</SheetDescription>
        </SheetHeader>

        {q.loading && !b && (
          <div className="space-y-4 p-4 pt-12 sm:p-6" aria-busy="true" aria-label="Đang tải booking">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {q.error && !b && !q.loading ? (
          <div className="p-4 pt-12 sm:p-6">
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden />
              <AlertDescription className="space-y-3">
                <p>{errText(q.error)}</p>
                {!notFound && (
                  <Button type="button" variant="outline" className="h-11 md:h-8" onClick={q.reload}>
                    <RotateCcw aria-hidden />
                    Thử lại
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {b && <BookingDetail booking={b} accountId={accountId} />}
      </SheetContent>
    </Sheet>
  );
}

function BookingDetail({ booking: b, accountId }: { booking: BookingView; accountId: string }) {
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const can = (a: BookingView['allowedActions'][number]) => b.allowedActions.includes(a);
  const missingChannel = b.items.some((i) => !i.channelId);
  const preAccept = ['SENT', 'APPLIED', 'NEGOTIATING'].includes(b.status);
  const next = nextStepText(b);
  const needs = needsSupplier(b);
  const recruit = isRecruitBooking(b);
  const reward = b.reward ?? b.campaign.recruitment?.reward;
  const drafts = b.contents.filter((c) => c.kind === 'DRAFT').sort((x, y) => y.submittedAt - x.submittedAt);
  const posts = b.contents.filter((c) => c.kind === 'POST').sort((x, y) => y.submittedAt - x.submittedAt);
  const itemOf = (id?: string) => (id ? b.items.find((i) => i.id === id) : undefined);
  const close = (o: boolean) => !o && setDialog(null);

  const simple = async (fn: () => Promise<BookingView>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setDialog(null);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  // --- footer actions ---
  const primary: ReactNode[] = [];
  const secondary: ReactNode[] = [];
  const danger: ReactNode[] = [];
  const btn = 'h-11 flex-1 sm:flex-none md:h-9';
  if (can('CONFIRM_PRODUCT_RECEIVED')) {
    primary.push(
      <Button key="received" type="button" variant={can('SUBMIT_POST') || can('SUBMIT_DRAFT') ? 'outline' : 'default'} className={btn} onClick={() => setDialog('received')}>
        <Gift aria-hidden />
        Đã nhận sản phẩm
      </Button>,
    );
  }
  if (can('ASSIGN_ITEMS')) {
    (missingChannel ? primary : secondary).push(
      <Button key="assign" type="button" variant={missingChannel ? 'default' : 'outline'} className={btn} onClick={() => setDialog('assign')}>
        {b.supplierType === 'MCN' ? 'Giao KOL/kênh' : 'Chọn kênh đăng'}
      </Button>,
    );
  }
  if (can('COUNTER')) {
    secondary.push(
      <Button key="counter" type="button" variant={b.price <= 0 ? 'default' : 'outline'} className={btn} onClick={() => setDialog('counter')}>
        {b.price <= 0 ? 'Báo giá' : 'Trả giá'}
      </Button>,
    );
  }
  if (can('ACCEPT')) {
    primary.push(
      <Button key="accept" type="button" className={btn} disabled={b.price <= 0 || missingChannel} onClick={() => setDialog('accept')}>
        Chấp nhận
      </Button>,
    );
  }
  if (can('SUBMIT_DRAFT')) {
    const again = b.status === 'CONTENT_REVIEW';
    (again ? secondary : primary).push(
      <Button key="draft" type="button" variant={again ? 'outline' : 'default'} className={btn} onClick={() => setDialog('draft')}>
        {again ? 'Nộp thêm bản nháp' : b.status === 'IN_PRODUCTION' ? 'Nộp lại bản nháp' : 'Nộp bản nháp'}
      </Button>,
    );
  }
  if (can('SUBMIT_POST')) {
    primary.push(
      <Button key="post" type="button" className={btn} onClick={() => setDialog('post')}>
        {b.campaign.draftReview ? 'Gửi link bài đăng' : 'Đăng bài & gửi link'}
      </Button>,
    );
  }
  if (can('CONFIRM_PAID')) {
    primary.push(
      <Button key="paid" type="button" className={btn} onClick={() => setDialog('paid')}>
        Xác nhận đã nhận tiền
      </Button>,
    );
  }
  if (can('RATE')) {
    secondary.push(
      <Button key="rate" type="button" variant="outline" className={btn} onClick={() => setDialog('rate')}>
        <Star aria-hidden />
        Đánh giá Nhãn hàng
      </Button>,
    );
  }
  if (can('DECLINE')) {
    danger.push(
      <Button key="decline" type="button" variant="ghost" className={cn(btn, 'text-destructive hover:text-destructive')} onClick={() => setDialog('decline')}>
        Từ chối
      </Button>,
    );
  }
  if (can('CANCEL')) {
    danger.push(
      <Button key="cancel" type="button" variant="ghost" className={cn(btn, 'text-destructive hover:text-destructive')} onClick={() => setDialog('cancel')}>
        {preAccept ? (recruit ? 'Rút ứng tuyển' : b.origin === 'APPLICATION' ? 'Rút đề xuất' : 'Huỷ thương lượng') : 'Huỷ booking'}
      </Button>,
    );
  }
  const hasActions = primary.length + secondary.length + danger.length > 0;

  return (
    <>
      <div className="@container min-h-0 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="space-y-3 border-b border-border bg-muted/50 px-4 pt-12 pb-5 sm:px-6 sm:pt-6">
          <p className="flex items-center gap-1.5 pr-8 text-sm text-muted-foreground">
            <Building2 className="size-4 shrink-0" aria-hidden />
            <span className="truncate font-medium text-foreground">{b.campaign.brand.company}</span>
            {b.campaign.brand.contactName && <span className="truncate">· {b.campaign.brand.contactName}</span>}
          </p>
          <div className="flex items-start gap-3 pr-8">
            <CampaignCover cover={b.campaign.cover} className="aspect-video w-24 shrink-0 rounded-[6px] @lg:w-32" iconClassName="size-5" />
            <h2 className="min-w-0 text-lg font-semibold break-words text-foreground sm:text-xl">{b.campaign.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge booking={b} />
            <OriginBadge origin={b.origin} />
            {recruit && <span className="text-xs font-medium text-primary">Tuyển nhiều KOL</span>}
            {needs && <NeedsYouMarker />}
          </div>
          {recruit && <RecruitStageStepper stage={recruitStage(b)} className="max-w-md pt-1" />}
          <dl className="grid grid-cols-2 gap-4 pt-1 @lg:grid-cols-3">
            {recruit && reward ? (
              <Fact label="Phần thưởng">
                <span className="text-sm font-semibold text-primary">{rewardText(reward)}</span>
              </Fact>
            ) : (
              <Fact label="Giá booking">
                <span className={cn('text-base font-semibold tabular-nums', b.price > 0 ? 'text-primary' : 'text-muted-foreground')}>{priceText(b.price)}</span>
              </Fact>
            )}
            <Fact label="Thời gian chiến dịch">{formatDayRange(b.campaign.startDate, b.campaign.endDate) || '—'}</Fact>
            {recruit && preAccept && b.expiresAt !== undefined && (
              <Fact label="Có kết quả trước">
                <span className="tabular-nums">{formatDateTime(b.expiresAt)}</span>
              </Fact>
            )}
            {!recruit && preAccept && b.expiresAt !== undefined && (
              <Fact label="Hạn phản hồi">
                <span className="flex flex-col gap-0.5">
                  {formatDateTime(b.expiresAt)}
                  <CountdownText countdown={expiryCountdown(b.expiresAt, now)} />
                </span>
              </Fact>
            )}
          </dl>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          {next && (
            <Alert className={needs ? 'border-primary/40 bg-primary/5' : undefined}>
              {missingChannel && preAccept ? <AlertTriangle className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
              <AlertTitle>{needs ? 'Việc cần làm' : 'Trạng thái'}</AlertTitle>
              <AlertDescription>{next}</AlertDescription>
            </Alert>
          )}

          {b.application && (
            <SheetSection title="Thông tin ứng tuyển của bạn">
              <ApplicationDetailsBlock details={b.application} />
            </SheetSection>
          )}

          {b.reward?.product && (
            <SheetSection title="Sản phẩm tặng">
              <div className="space-y-2 rounded-[8px] border border-border p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Gift className="size-4 text-primary" aria-hidden />
                  {b.reward.product.name}
                  <span className="font-normal text-muted-foreground tabular-nums">· trị giá {formatVnd(b.reward.product.value)}</span>
                </p>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', b.shipment?.sentAt ? 'text-chart-4' : 'text-muted-foreground/40')} aria-hidden />
                    {b.shipment?.sentAt ? `Nhãn hàng đã gửi sản phẩm · ${formatDateTime(b.shipment.sentAt)}` : 'Chờ Nhãn hàng gửi sản phẩm'}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', b.shipment?.receivedAt ? 'text-chart-4' : 'text-muted-foreground/40')} aria-hidden />
                    {b.shipment?.receivedAt ? `Bạn đã nhận sản phẩm · ${formatDateTime(b.shipment.receivedAt)}` : 'Bạn xác nhận khi nhận được sản phẩm'}
                  </li>
                </ul>
              </div>
            </SheetSection>
          )}

          {b.note && (
            <SheetSection title={b.origin === 'INVITE' ? 'Lời nhắn' : 'Lời nhắn trong đề xuất'}>
              <p className="rounded-[8px] bg-muted/60 p-3 text-sm break-words whitespace-pre-line text-foreground">{b.note}</p>
            </SheetSection>
          )}

          <SheetSection title={`Hạng mục (${b.items.length})`}>
            <ul className="divide-y divide-border rounded-[8px] border border-border">
              {b.items.map((i) => {
                const posted = posts.some((p) => p.itemId === i.id);
                return (
                  <li key={i.id} className="flex flex-col gap-2 p-3 @md:flex-row @md:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <KolAvatar name={i.displayName} src={i.kol?.avatar} className="size-10" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{i.displayName}</p>
                        <p className="text-xs text-muted-foreground">{i.kolId}</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5 pl-[3.25rem] @md:pl-0">
                      {i.channel ? (
                        <>
                          <p className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                            <PlatformIcon platform={i.channel.platform} className="size-5 rounded-md" />
                            <span className="truncate">{channelName(i.channel.handle, i.channel.url)}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatFollowers(i.channel.followers)}</span>
                          </p>
                          <ChannelLink url={i.channel.url} />
                        </>
                      ) : (
                        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                          <PlatformIcon platform={i.platform} className="size-5 rounded-md" />
                          Chưa có kênh đăng
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pl-[3.25rem] text-sm @md:justify-end @md:pl-0">
                      <span className="font-medium text-foreground">
                        {deliverableLabel(i.deliverableType)} × {i.quantity}
                      </span>
                      {posted && <CheckCircle2 className="size-4 text-chart-4" aria-label="Đã có bài đăng xác minh" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </SheetSection>

          {drafts.length > 0 && (
            <SheetSection title="Bản nháp">
              <ul className="space-y-3">
                {drafts.map((d, idx) => (
                  <DraftCard key={d.id} draft={d} item={itemOf(d.itemId)} round={drafts.length - idx} />
                ))}
              </ul>
            </SheetSection>
          )}

          {posts.length > 0 && (
            <SheetSection title="Bài đăng">
              <ul className="space-y-3">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} item={itemOf(p.itemId)} />
                ))}
              </ul>
            </SheetSection>
          )}

          {b.price > 0 && (b.payment.brandMarkedAt || b.status === 'VERIFIED' || b.status === 'COMPLETED') && (
            <SheetSection title="Thanh toán">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', b.payment.brandMarkedAt ? 'text-chart-4' : 'text-muted-foreground/40')} aria-hidden />
                  <span>
                    {b.payment.brandMarkedAt
                      ? `Nhãn hàng đánh dấu đã thanh toán ${formatVnd(b.price)} · ${formatDateTime(b.payment.brandMarkedAt)}`
                      : 'Chờ Nhãn hàng thanh toán (ngoài hệ thống, chỉ ghi nhận)'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', b.payment.supplierConfirmedAt ? 'text-chart-4' : 'text-muted-foreground/40')} aria-hidden />
                  <span>
                    {b.payment.supplierConfirmedAt ? `Bạn xác nhận đã nhận tiền · ${formatDateTime(b.payment.supplierConfirmedAt)}` : 'Bạn xác nhận đã nhận tiền'}
                  </span>
                </li>
              </ul>
            </SheetSection>
          )}

          {b.myRating && (
            <SheetSection title="Đánh giá của bạn">
              <div className="space-y-1 rounded-[8px] border border-border p-3">
                <p className="flex items-center gap-0.5" aria-label={`${b.myRating.stars} trên 5 sao`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={cn('size-4', n <= b.myRating!.stars ? 'fill-primary text-primary' : 'text-muted-foreground')} aria-hidden />
                  ))}
                </p>
                {b.myRating.comment && <p className="text-sm break-words text-foreground">{b.myRating.comment}</p>}
                <p className="text-xs text-muted-foreground">Chỉ lưu nội bộ · {formatDateTime(b.myRating.at)}</p>
              </div>
            </SheetSection>
          )}

          {b.contractFile && (
            <SheetSection title="Hợp đồng">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <span className="truncate">{b.contractFile.name}</span>
              </p>
            </SheetSection>
          )}

          <SheetSection title="Chiến dịch">
            <div className="space-y-4 rounded-[8px] border border-border p-4">
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Nền tảng">
                  <PlatformIcons platforms={b.campaign.platforms} withLabel />
                </Fact>
                <Fact label="Hạn ứng tuyển">{b.campaign.applyDeadline ? formatDay(b.campaign.applyDeadline) : 'Không giới hạn'}</Fact>
                <Fact label="Hạng mục chiến dịch" className="col-span-2">
                  {deliverablesSummary(b.campaign.deliverables) || '—'}
                </Fact>
              </dl>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Mục tiêu</p>
                <LongText text={b.campaign.objective} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Brief</p>
                <LongText text={b.campaign.brief} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Quy định nội dung</p>
                <LongText text={b.campaign.contentRules} />
              </div>
              <WorkflowNote draftReview={b.campaign.draftReview} />
              {b.campaign.recruitment && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Lịch trình</p>
                  <RecruitTimeline timeline={b.campaign.recruitment.timeline} phase={b.campaign.phase} />
                </div>
              )}
            </div>
          </SheetSection>

          <SheetSection title="Lịch sử">
            <ol className="relative space-y-4 border-l border-border pl-5">
              {supplierTimeline(b.history).map((e, i) => (
                <li key={i} className="relative">
                  <span
                    className={cn(
                      'absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ring-4 ring-background',
                      e.by === 'SUPPLIER' ? 'bg-primary' : e.by === 'BRAND' ? 'bg-foreground/60' : 'bg-chart-4',
                    )}
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-foreground">
                    {eventLabel(e)}
                    {e.price !== undefined && e.price > 0 && <span className="font-semibold text-primary"> · {formatVnd(e.price)}</span>}
                  </p>
                  {e.note && <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{e.note}</p>}
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
                </li>
              ))}
            </ol>
          </SheetSection>
        </div>
      </div>

      {hasActions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
          {danger}
          <div className="hidden flex-1 sm:block" />
          {secondary}
          {primary}
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog open={dialog === 'accept'} onOpenChange={(o) => !busy && close(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chấp nhận booking với giá {formatVnd(b.price)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking sẽ được chốt với {b.items.length} hạng mục. Sau khi chốt, bạn bắt đầu sản xuất và nộp bản nháp cho Nhãn hàng duyệt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9" disabled={busy}>
              Đóng
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ className: 'h-11 md:h-9' })}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void simple(() => bookingService.accept(b.id), 'Đã chốt booking');
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Chấp nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === 'received'} onOpenChange={(o) => !busy && close(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đã nhận sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>
              {b.reward?.product?.name ?? 'Sản phẩm'} — chỉ xác nhận khi bạn đã nhận được hàng. Nhãn hàng sẽ thấy xác nhận này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9" disabled={busy}>
              Đóng
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ className: 'h-11 md:h-9' })}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void simple(() => bookingService.confirmProductReceived(b.id), 'Đã xác nhận nhận sản phẩm');
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Đã nhận sản phẩm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === 'paid'} onOpenChange={(o) => !busy && close(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đã nhận {formatVnd(b.price)}?</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xác nhận khi tiền đã về tài khoản. Booking sẽ chuyển sang Hoàn tất.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9" disabled={busy}>
              Đóng
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ className: 'h-11 md:h-9' })}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void simple(() => bookingService.confirmPaid(b.id), 'Booking đã hoàn tất');
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Đã nhận tiền
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReasonDialog
        open={dialog === 'decline'}
        onOpenChange={close}
        title={b.status === 'SENT' ? 'Từ chối lời mời' : 'Từ chối'}
        description="Booking sẽ đóng lại. Nhãn hàng thấy lý do bạn nhập."
        label="Lý do (không bắt buộc)"
        placeholder="Lịch kín, không phù hợp lĩnh vực, giá chưa phù hợp…"
        confirmLabel="Từ chối"
        minLength={0}
        maxLength={BOOKING_NOTE_MAX}
        destructive
        onConfirm={async (text) => {
          await bookingService.decline(b.id, text || undefined);
          toast.success('Đã từ chối');
        }}
      />

      <ReasonDialog
        open={dialog === 'cancel'}
        onOpenChange={close}
        title={preAccept ? (recruit ? 'Rút ứng tuyển' : b.origin === 'APPLICATION' ? 'Rút đề xuất ứng tuyển' : 'Huỷ thương lượng') : 'Huỷ booking'}
        description={
          preAccept
            ? 'Booking sẽ đóng lại và Nhãn hàng không thể chấp nhận nữa.'
            : 'Booking đã chốt — cần nêu lý do. Nhãn hàng thấy lý do này.'
        }
        label={preAccept ? 'Lý do (không bắt buộc)' : 'Lý do huỷ'}
        placeholder="Nêu ngắn gọn lý do…"
        confirmLabel={preAccept ? 'Rút lại' : 'Huỷ booking'}
        minLength={preAccept ? 0 : 1}
        maxLength={BOOKING_NOTE_MAX}
        destructive
        onConfirm={async (text) => {
          await bookingService.cancel(b.id, text || undefined);
          toast.success(preAccept ? 'Đã rút lại' : 'Đã huỷ booking');
        }}
      />

      <CounterDialog open={dialog === 'counter'} onOpenChange={close} booking={b} />
      <AssignItemsDialog open={dialog === 'assign'} onOpenChange={close} booking={b} accountId={accountId} />
      <DraftDialog open={dialog === 'draft'} onOpenChange={close} booking={b} />
      <PostDialog open={dialog === 'post'} onOpenChange={close} booking={b} />
      <RateDialog open={dialog === 'rate'} onOpenChange={close} booking={b} />
    </>
  );
}
