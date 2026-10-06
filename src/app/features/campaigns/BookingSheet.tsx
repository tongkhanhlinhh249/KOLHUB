import { useId, useRef, useState, type ReactNode } from 'react';
import { FileText, Gift, Loader2, Paperclip, Star, Trash2, Upload, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { BOOKING_NOTE_MAX, bookingService, PRE_ACCEPT_STATUSES, type BookingItemView, type BookingView } from '../../services';
import { formatFollowers } from '../biz-search/format';
import { KolAvatar } from '../biz-search/KolCard';
import { FieldBadges } from '../biz-search/KolMedia';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { formatFileSize, toStoredFile } from '../shared/files';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ApplicationDetailsBlock } from '../shared/RecruitParts';
import { NegotiationButtons, type BookingActionsApi } from './BookingActions';
import { BookingStatusBadge, deliverableTypeLabel, errText, LoadError, SupplierTypeBadge, TodoMarker } from './CampaignParts';
import { DraftCard, PostCard } from './ContentParts';
import {
  actorLabel,
  bookingPriceText,
  brandTodoLabel,
  expiryText,
  formatDayMs,
  formatDayTime,
  formatPrice,
  formatVnd,
  historyLabel,
  needsBrandAction,
} from './campaignView';

function Block({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/** One KOL of the booking: public profile summary + channel + what to produce. */
export function BookingItemRow({ item, onOpenKol }: { item: BookingItemView; onOpenKol?(kolId: string): void }) {
  const kol = item.kol;
  return (
    <li className="flex items-start gap-3 rounded-[8px] border border-border p-3">
      <KolAvatar name={item.displayName} src={kol?.avatar} className="size-10" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          {kol && onOpenKol ? (
            <button
              type="button"
              onClick={() => onOpenKol(item.kolId)}
              className="truncate rounded-sm text-left text-sm font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.displayName}
            </button>
          ) : (
            <span className="truncate text-sm font-semibold text-foreground">{item.displayName}</span>
          )}
          <span className="text-xs text-muted-foreground">{item.kolId}</span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <PlatformIcon platform={item.platform} className="size-3.5" />
            {item.quantity} {deliverableTypeLabel(item.deliverableType)}
          </span>
          <span aria-hidden>·</span>
          {item.channel ? (
            <span className="min-w-0 truncate">
              Kênh {item.channel.handle.startsWith('@') ? item.channel.handle : `@${item.channel.handle}`} · {formatFollowers(item.channel.followers)} theo dõi
            </span>
          ) : (
            <span className="text-chart-5">Chưa chọn kênh</span>
          )}
        </p>
        {kol && kol.fields.length > 0 && <FieldBadges fields={kol.fields} size="sm" />}
        {!kol && <p className="text-xs text-muted-foreground">Hồ sơ KOL không còn hiển thị công khai.</p>}
      </div>
      {kol && onOpenKol && (
        <Button type="button" variant="outline" size="sm" className="h-11 shrink-0 md:h-8" onClick={() => onOpenKol(item.kolId)}>
          Xem hồ sơ
        </Button>
      )}
    </li>
  );
}

function ContractBlock({ booking }: { booking: BookingView }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const can = booking.allowedActions.includes('ATTACH_CONTRACT');
  const set = async (file: File | null) => {
    setBusy(true);
    try {
      await bookingService.setContractFile(booking.id, file ? await toStoredFile(file) : null);
      toast.success(file ? 'Đã đính kèm hợp đồng' : 'Đã gỡ tệp hợp đồng');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  if (!booking.contractFile && !can) return null;
  return (
    <Block title="Hợp đồng">
      {booking.contractFile ? (
        <div className="flex items-center gap-3 rounded-[8px] border border-border p-3">
          <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{booking.contractFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(booking.contractFile.size)} · chỉ lưu thông tin tệp</p>
          </div>
          {can && (
            <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 md:size-9" disabled={busy} aria-label="Gỡ tệp hợp đồng" onClick={() => void set(null)}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
      ) : (
        <Muted>Chưa có tệp hợp đồng. Không bắt buộc — KOL Hub không ký hợp đồng điện tử.</Muted>
      )}
      {can && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void set(f);
            }}
          />
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : booking.contractFile ? <Upload aria-hidden /> : <Paperclip aria-hidden />}
            {booking.contractFile ? 'Thay tệp' : 'Đính kèm hợp đồng'}
          </Button>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG hoặc DOCX, tối đa 10 MB.</p>
        </>
      )}
    </Block>
  );
}

function Stars({ value, onChange, readOnly }: { value: number; onChange?(n: number): void; readOnly?: boolean }) {
  if (readOnly) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} trên 5 sao`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn('size-4', n <= value ? 'fill-chart-5 text-chart-5' : 'text-muted-foreground/40')} aria-hidden />
        ))}
      </span>
    );
  }
  return (
    <div role="radiogroup" aria-label="Số sao" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao`}
          onClick={() => onChange?.(n)}
          className="flex size-11 items-center justify-center rounded-[8px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-9"
        >
          <Star className={cn('size-6', n <= value ? 'fill-chart-5 text-chart-5' : 'text-muted-foreground/50')} aria-hidden />
        </button>
      ))}
    </div>
  );
}

function RatingBlock({ booking }: { booking: BookingView }) {
  const id = useId();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  if (booking.myRating) {
    return (
      <Block title="Đánh giá của bạn">
        <div className="space-y-1 rounded-[8px] border border-border p-3">
          <Stars value={booking.myRating.stars} readOnly />
          {booking.myRating.comment && <p className="text-sm whitespace-pre-line text-foreground">{booking.myRating.comment}</p>}
          <p className="text-xs text-muted-foreground">Chỉ lưu nội bộ, nhà cung cấp không thấy đánh giá này.</p>
        </div>
      </Block>
    );
  }
  if (!booking.allowedActions.includes('RATE')) return null;
  const submit = async () => {
    setBusy(true);
    try {
      await bookingService.rate(booking.id, stars, comment);
      toast.success('Đã lưu đánh giá');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Block title={`Đánh giá ${booking.supplier.name}`}>
      <div className="space-y-3 rounded-[8px] border border-border p-3">
        <Stars value={stars} onChange={setStars} />
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-c`}>
            Nhận xét <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          </Label>
          <Textarea id={`${id}-c`} rows={3} maxLength={BOOKING_NOTE_MAX} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Đánh giá chỉ lưu nội bộ.</p>
          <Button type="button" className="h-11 md:h-9" disabled={busy || stars === 0} onClick={() => void submit()}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Gửi đánh giá
          </Button>
        </div>
      </div>
    </Block>
  );
}

/** "Tuyển nhiều KOL": pick / do not pick this applicant (during "Chọn lọc"; "Không chọn" also during "Ứng tuyển"). */
function RecruitDecision({ booking }: { booking: BookingView }) {
  const [busy, setBusy] = useState<'select' | 'decline' | null>(null);
  const can = (a: BookingView['allowedActions'][number]) => booking.allowedActions.includes(a);
  if (!can('SELECT') && !can('DECLINE')) return null;
  const run = async (kind: 'select' | 'decline') => {
    setBusy(kind);
    try {
      if (kind === 'select') await bookingService.select(booking.id);
      else await bookingService.decline(booking.id);
      toast.success(kind === 'select' ? `Đã chọn ${booking.supplier.name}` : `${booking.supplier.name}: Không được chọn`);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {can('SELECT') && (
        <Button type="button" className="h-11 md:h-9" disabled={busy !== null} onClick={() => void run('select')}>
          {busy === 'select' ? <Loader2 className="animate-spin" aria-hidden /> : <UserCheck aria-hidden />}
          Chọn ứng viên
        </Button>
      )}
      {can('DECLINE') && (
        <Button type="button" variant="ghost" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9" disabled={busy !== null} onClick={() => void run('decline')}>
          {busy === 'decline' ? <Loader2 className="animate-spin" aria-hidden /> : <UserX aria-hidden />}
          Không chọn
        </Button>
      )}
    </div>
  );
}

/** Product reward shipping (record only): "Đã gửi sản phẩm" by the brand, "Đã nhận" by the supplier. */
function ProductBlock({ booking }: { booking: BookingView }) {
  const [busy, setBusy] = useState(false);
  const product = booking.reward?.product;
  if (!product) return null;
  const { sentAt, receivedAt } = booking.shipment ?? {};
  const ship = booking.application?.shipping;
  const mark = async () => {
    setBusy(true);
    try {
      await bookingService.markProductSent(booking.id);
      toast.success('Đã ghi nhận gửi sản phẩm', { description: `${booking.supplier.name} sẽ xác nhận khi nhận được.` });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Block title="Sản phẩm tặng">
      <div className="space-y-2 rounded-[8px] border border-border p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Gift className="size-4 text-primary" aria-hidden />
          {product.name} <span className="font-normal text-muted-foreground tabular-nums">· {formatVnd(product.value)}</span>
        </p>
        {ship && (
          <p className="text-xs text-muted-foreground">
            Giao tới: {ship.address}, {ship.province} · SĐT {ship.phone}
          </p>
        )}
        <ul className="space-y-1 text-sm">
          <li className={sentAt ? 'text-foreground' : 'text-muted-foreground'}>{sentAt ? `Đã gửi sản phẩm · ${formatDayTime(sentAt)}` : 'Chưa gửi sản phẩm'}</li>
          <li className={receivedAt ? 'text-foreground' : 'text-muted-foreground'}>
            {receivedAt ? `KOL/MCN đã nhận · ${formatDayTime(receivedAt)}` : 'KOL/MCN chưa xác nhận đã nhận'}
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">Chỉ ghi nhận, KOL Hub không vận chuyển hàng.</p>
        {booking.allowedActions.includes('MARK_PRODUCT_SENT') && (
          <Button type="button" className="h-11 md:h-9" disabled={busy} onClick={() => void mark()}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Đã gửi sản phẩm
          </Button>
        )}
      </div>
    </Block>
  );
}

function PaymentBlock({ booking, actions }: { booking: BookingView; actions: BookingActionsApi }) {
  const { brandMarkedAt, supplierConfirmedAt } = booking.payment;
  const relevant = ['VERIFIED', 'COMPLETED'].includes(booking.status) || brandMarkedAt;
  if (!relevant) return null;
  if (booking.price === 0) {
    return (
      <Block title="Hoàn tất">
        <div className="space-y-2 rounded-[8px] border border-border p-3 text-sm">
          <p className="text-foreground">
            {brandMarkedAt ? `Bạn đã xác nhận hoàn tất lúc ${formatDayTime(brandMarkedAt)}.` : 'Phần thưởng chỉ gồm sản phẩm, không có khoản thanh toán. Xác nhận khi mọi việc đã xong.'}
          </p>
          {booking.allowedActions.includes('MARK_PAID') && (
            <Button type="button" className="h-11 md:h-9" onClick={() => actions.markPaid(booking)}>
              Xác nhận hoàn tất
            </Button>
          )}
        </div>
      </Block>
    );
  }
  return (
    <Block title="Thanh toán">
      <div className="space-y-2 rounded-[8px] border border-border p-3 text-sm">
        <p className="text-foreground">
          {supplierConfirmedAt
            ? `Nhà cung cấp đã xác nhận nhận tiền lúc ${formatDayTime(supplierConfirmedAt)}.`
            : brandMarkedAt
              ? `Bạn đã đánh dấu thanh toán lúc ${formatDayTime(brandMarkedAt)}. Chờ nhà cung cấp xác nhận.`
              : 'Mọi bài đăng đã được xác minh. Thanh toán cho nhà cung cấp rồi đánh dấu tại đây.'}
        </p>
        <p className="text-xs text-muted-foreground">KOL Hub chỉ ghi nhận thanh toán, không giữ tiền.</p>
        {booking.allowedActions.includes('MARK_PAID') && (
          <Button type="button" className="h-11 md:h-9" onClick={() => actions.markPaid(booking)}>
            Đánh dấu đã thanh toán
          </Button>
        )}
      </div>
    </Block>
  );
}

function Timeline({ booking }: { booking: BookingView }) {
  return (
    <Block title="Lịch sử">
      <ol>
        {[...booking.history].reverse().map((e, i, arr) => (
          <li key={`${e.at}-${e.action}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
            {i < arr.length - 1 && <span className="absolute top-3 bottom-0 left-[5px] w-px bg-border" aria-hidden />}
            <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/50')} aria-hidden />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {historyLabel(e.action)}
                {e.price !== undefined && e.price > 0 && ['INVITED', 'APPLIED', 'COUNTERED', 'ACCEPTED', 'ITEMS_ADDED'].includes(e.action) && (
                  <span className="font-normal text-muted-foreground"> · {formatPrice(e.price)}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {actorLabel(e.by, booking.supplier.name)} · {formatDayTime(e.at)}
              </p>
              {e.note && <p className="text-sm break-words whitespace-pre-line text-foreground/80">{e.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

function SheetSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Đang tải booking">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

/**
 * Booking detail for the brand (URL-synced by the caller with ?booking=). Every button comes from
 * `allowedActions`; the view is live, so it refreshes after each action.
 */
export function BookingSheet({
  bookingId,
  onOpenChange,
  onOpenKol,
  actions,
}: {
  bookingId: string | null;
  onOpenChange(open: boolean): void;
  onOpenKol(kolId: string): void;
  actions: BookingActionsApi;
}) {
  const q = useLiveQuery(() => (bookingId ? bookingService.get(bookingId) : Promise.resolve(null)), [bookingId]);
  const b = q.data && q.data.id === bookingId ? q.data : null;
  const now = Date.now();

  const pre = b ? PRE_ACCEPT_STATUSES.includes(b.status) : false;
  const drafts = b ? b.contents.filter((c) => c.kind === 'DRAFT').sort((x, y) => y.submittedAt - x.submittedAt) : [];
  const posts = b ? b.contents.filter((c) => c.kind === 'POST') : [];
  const itemOf = (id?: string) => (id && b ? b.items.find((i) => i.id === id) : undefined);
  const missingChannel = b ? b.items.some((i) => !i.channelId) : false;
  const inContentPhase = b ? !pre && !['DECLINED', 'EXPIRED'].includes(b.status) && (b.campaign.draftReview || b.contents.some((c) => c.kind === 'DRAFT')) : false;
  const recruit = b ? b.origin === 'APPLICATION' && b.campaign.type === 'OPEN_RECRUITMENT' : false;

  return (
    <Sheet open={bookingId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {!b ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>Chi tiết booking</SheetTitle>
              <SheetDescription>Đang tải</SheetDescription>
            </SheetHeader>
            {q.error ? (
              <div className="p-4 pt-12">
                <LoadError message={errText(q.error)} onRetry={q.reload} />
              </div>
            ) : (
              <SheetSkeleton />
            )}
          </>
        ) : (
          <>
            <SheetHeader className="gap-2 border-b border-border p-4 pr-12 text-left">
              <div className="flex items-start gap-3">
                <KolAvatar name={b.supplier.name} src={b.supplier.avatar} className="size-11" />
                <div className="min-w-0 flex-1 space-y-1">
                  <SheetTitle className="text-base leading-snug break-words">{b.supplier.name}</SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <SupplierTypeBadge type={b.supplierType} />
                    {b.supplier.code && <span>{b.supplier.code}</span>}
                    <span aria-hidden>·</span>
                    <span>{b.origin === 'INVITE' ? 'Lời mời' : recruit ? 'Ứng tuyển (Tuyển nhiều KOL)' : 'Đề xuất từ Sàn'}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">Tạo {formatDayMs(b.createdAt)}</span>
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BookingStatusBadge status={b.status} />
                {needsBrandAction(b) && <TodoMarker label={brandTodoLabel(b)} />}
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
              <Block title={recruit ? 'Phần thưởng và chọn lọc' : 'Giá và thương lượng'}>
                <div className="space-y-3 rounded-[8px] border border-border p-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{recruit ? 'Phần thưởng cố định' : `Tổng giá (${b.items.length} KOL)`}</p>
                      <p className="text-lg font-semibold text-foreground tabular-nums">{recruit ? bookingPriceText(b) : formatPrice(b.price)}</p>
                    </div>
                    {pre && (
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{recruit ? 'Chờ bạn chọn' : b.awaiting === 'BRAND' ? 'Chờ bạn trả lời' : `Chờ ${b.supplier.name} trả lời`}</p>
                        {b.expiresAt && <p className="tabular-nums">{recruit ? `Hạn chọn lọc ${formatDayMs(b.expiresAt)}` : expiryText(b.expiresAt, now)}</p>}
                      </div>
                    )}
                  </div>
                  {b.note && (
                    <p className="rounded-[8px] bg-muted/60 p-2.5 text-sm whitespace-pre-line text-foreground">
                      <span className="block text-xs text-muted-foreground">Ghi chú mới nhất</span>
                      {b.note}
                    </p>
                  )}
                  {pre && b.awaiting === 'BRAND' && missingChannel && (
                    <p className="text-xs text-chart-5">Một số KOL chưa có kênh đăng: nhà cung cấp cần chọn kênh trước khi chốt.</p>
                  )}
                  {recruit ? <RecruitDecision booking={b} /> : <NegotiationButtons booking={b} actions={actions} />}
                </div>
              </Block>

              {b.application && (
                <Block title="Thông tin ứng tuyển">
                  <ApplicationDetailsBlock details={b.application} />
                </Block>
              )}

              <Block title={`KOL (${b.items.length})`}>
                <ul className="space-y-2">
                  {b.items.map((it) => (
                    <BookingItemRow key={it.id} item={it} onOpenKol={onOpenKol} />
                  ))}
                </ul>
              </Block>

              {inContentPhase && (
                <Block title={`Nội dung nháp (${drafts.length})`}>
                  {drafts.length === 0 ? (
                    <Muted>Nhà cung cấp chưa gửi nội dung nháp.</Muted>
                  ) : (
                    <div className="space-y-2">
                      {drafts.map((d) => (
                        <DraftCard key={d.id} booking={b} draft={d} item={itemOf(d.itemId)} actions={actions} />
                      ))}
                    </div>
                  )}
                </Block>
              )}

              {(posts.length > 0 || ['CONTENT_APPROVED', 'PUBLISHED', 'VERIFIED', 'COMPLETED'].includes(b.status)) && (
                <Block title={`Bài đăng (${posts.length})`}>
                  {posts.length === 0 ? (
                    <Muted>Chưa có bài đăng. Nhà cung cấp gửi link sau khi đăng, hệ thống xác minh ngay.</Muted>
                  ) : (
                    <div className="space-y-2">
                      {posts.map((p) => (
                        <PostCard key={p.id} post={p} item={itemOf(p.itemId)} />
                      ))}
                    </div>
                  )}
                </Block>
              )}

              <ProductBlock booking={b} />
              <PaymentBlock booking={b} actions={actions} />
              <ContractBlock booking={b} />
              <RatingBlock booking={b} />
              <Timeline booking={b} />
            </div>

            {b.allowedActions.includes('CANCEL') && (
              <SheetFooter className="flex-row justify-end border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9"
                  onClick={() => actions.cancel(b)}
                >
                  {pre ? (b.origin === 'INVITE' ? 'Rút lời mời' : 'Huỷ thương lượng') : 'Huỷ booking'}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
