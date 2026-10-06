import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { BOOKING_NOTE_MAX, bookingService, PRE_ACCEPT_STATUSES, type BookingView, type ContentSubmission } from '../../services';
import { ReasonDialog } from '../violations/ReasonDialog';
import { errText } from './CampaignParts';
import { formatPrice, formatVnd, formatVndInput, parseVndInput } from './campaignView';

/** VND input with thousands grouping and a ₫ suffix. */
export function PriceInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  placeholder = 'VD: 15.000.000',
}: {
  id: string;
  value: string;
  onChange(v: string): void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(formatVndInput(e.target.value))}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-11 pr-10 tabular-nums md:h-10"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden>
        ₫
      </span>
    </div>
  );
}

/** "Báo giá mới": new total price + optional note. */
function CounterDialog({ booking, onOpenChange }: { booking: BookingView | null; onOpenChange(open: boolean): void }) {
  const id = useId();
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking) {
      setPrice(booking.price > 0 ? formatVndInput(String(booking.price)) : '');
      setNote('');
      setError(null);
    }
  }, [booking]);

  const submit = async () => {
    if (!booking) return;
    const n = parseVndInput(price);
    if (!n) return setError('Nhập giá lớn hơn 0.');
    setBusy(true);
    try {
      await bookingService.counter(booking.id, n, note);
      toast.success('Đã gửi báo giá mới', { description: `${formatVnd(n)} · chờ ${booking.supplier.name} trả lời.` });
      onOpenChange(false);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo giá mới</DialogTitle>
          <DialogDescription>
            Giá hiện tại: {booking ? formatPrice(booking.price) : ''}. Đây là tổng giá cho cả booking ({booking?.items.length ?? 0} KOL).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-price`}>Tổng giá đề nghị (VND)</Label>
            <PriceInput
              id={`${id}-price`}
              value={price}
              onChange={(v) => {
                setPrice(v);
                setError(null);
              }}
              invalid={!!error}
              describedBy={error ? `${id}-err` : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-note`}>
              Ghi chú <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
            </Label>
            <Textarea id={`${id}-note`} value={note} rows={3} maxLength={BOOKING_NOTE_MAX} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && (
            <p id={`${id}-err`} className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="button" className="h-11 md:h-9" disabled={busy} onClick={() => void submit()}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Gửi báo giá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Throw to keep the dialog open; the error is shown as a toast. */
  onConfirm(): Promise<void>;
  destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 md:h-9" disabled={busy}>
            Huỷ
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: destructive ? 'destructive' : 'default', className: 'h-11 md:h-9' })}
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              setBusy(true);
              onConfirm()
                .then(() => onOpenChange(false))
                .catch((err) => toast.error(errText(err)))
                .finally(() => setBusy(false));
            }}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type Pending =
  | { kind: 'accept'; booking: BookingView }
  | { kind: 'decline'; booking: BookingView }
  | { kind: 'cancel'; booking: BookingView }
  | { kind: 'changes'; booking: BookingView; draft: ContentSubmission }
  | { kind: 'paid'; booking: BookingView };

/**
 * Brand-side booking actions with their dialogs (accept / counter / decline / cancel, content review,
 * mark paid). Callers only show a trigger when the action is in `booking.allowedActions`.
 * Render `elements` once; data refreshes by itself (live queries).
 */
export function useBookingActions() {
  const [counterFor, setCounterFor] = useState<BookingView | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const close = () => setPending(null);

  const approve = useCallback(async (b: BookingView, draft: ContentSubmission) => {
    setApproving(draft.id);
    try {
      const next = await bookingService.reviewContent(b.id, draft.id, 'APPROVE');
      toast.success('Đã duyệt nội dung', {
        description: next.status === 'CONTENT_APPROVED' ? 'Nhà cung cấp có thể đăng bài và gửi link.' : draft.title,
      });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setApproving(null);
    }
  }, []);

  const p = pending;
  const started = p?.kind === 'cancel' && !PRE_ACCEPT_STATUSES.includes(p.booking.status);
  const withdrawLabel = p?.kind === 'cancel' && p.booking.origin === 'APPLICATION' ? 'Huỷ thương lượng' : 'Rút lời mời';

  const elements = (
    <>
      <CounterDialog booking={counterFor} onOpenChange={(o) => !o && setCounterFor(null)} />
      <ConfirmAction
        open={p?.kind === 'accept'}
        onOpenChange={(o) => !o && close()}
        title="Chốt booking?"
        description={
          p?.kind === 'accept' ? (
            <>
              Chốt với <strong className="text-foreground">{p.booking.supplier.name}</strong> giá{' '}
              <strong className="text-foreground">{formatPrice(p.booking.price)}</strong> cho {p.booking.items.length} KOL. Sau khi chốt, nhà
              cung cấp bắt đầu sản xuất nội dung.
            </>
          ) : null
        }
        confirmLabel="Chốt booking"
        onConfirm={async () => {
          if (p?.kind !== 'accept') return;
          await bookingService.accept(p.booking.id);
          toast.success('Đã chốt booking', { description: `${p.booking.supplier.name} có thể bắt đầu sản xuất nội dung.` });
        }}
      />
      <ConfirmAction
        open={p?.kind === 'paid'}
        onOpenChange={(o) => !o && close()}
        title={p?.kind === 'paid' && p.booking.price === 0 ? 'Xác nhận hoàn tất?' : 'Đánh dấu đã thanh toán?'}
        description={
          p?.kind === 'paid' ? (
            p.booking.price === 0 ? (
              <>Phần thưởng chỉ gồm sản phẩm nên không có khoản thanh toán. Booking với {p.booking.supplier.name} chuyển sang Hoàn tất.</>
            ) : (
              <>
                Ghi nhận bạn đã thanh toán <strong className="text-foreground">{formatPrice(p.booking.price)}</strong> cho{' '}
                {p.booking.supplier.name}. KOL Hub không giữ tiền: booking hoàn tất khi nhà cung cấp xác nhận đã nhận.
              </>
            )
          ) : null
        }
        confirmLabel={p?.kind === 'paid' && p.booking.price === 0 ? 'Hoàn tất' : 'Đã thanh toán'}
        onConfirm={async () => {
          if (p?.kind !== 'paid') return;
          const done = await bookingService.markPaid(p.booking.id);
          if (done.status === 'COMPLETED') toast.success('Booking đã hoàn tất');
          else toast.success('Đã ghi nhận thanh toán', { description: 'Chờ nhà cung cấp xác nhận đã nhận.' });
        }}
      />
      <ReasonDialog
        open={p?.kind === 'decline'}
        onOpenChange={(o) => !o && close()}
        title="Từ chối booking?"
        description={p?.kind === 'decline' ? `${p.booking.supplier.name} sẽ nhận được lý do (nếu có).` : undefined}
        label="Lý do (không bắt buộc)"
        placeholder="VD: Ngân sách không phù hợp"
        confirmLabel="Từ chối"
        minLength={0}
        maxLength={BOOKING_NOTE_MAX}
        destructive
        onConfirm={async (text) => {
          if (p?.kind !== 'decline') return;
          await bookingService.decline(p.booking.id, text);
          toast.success('Đã từ chối booking');
        }}
      />
      <ReasonDialog
        open={p?.kind === 'cancel'}
        onOpenChange={(o) => !o && close()}
        title={started ? 'Huỷ booking đã chốt?' : `${withdrawLabel}?`}
        description={
          started
            ? 'Booking đã chốt chỉ huỷ được khi có lý do. Nhà cung cấp sẽ thấy lý do này.'
            : 'Booking sẽ kết thúc, nhà cung cấp không trả lời được nữa.'
        }
        label={started ? 'Lý do huỷ' : 'Lý do (không bắt buộc)'}
        placeholder="VD: Thay đổi kế hoạch truyền thông"
        confirmLabel={started ? 'Huỷ booking' : withdrawLabel}
        minLength={started ? 1 : 0}
        maxLength={BOOKING_NOTE_MAX}
        destructive
        onConfirm={async (text) => {
          if (p?.kind !== 'cancel') return;
          await bookingService.cancel(p.booking.id, text);
          toast.success(started ? 'Đã huỷ booking' : withdrawLabel === 'Rút lời mời' ? 'Đã rút lời mời' : 'Đã huỷ thương lượng');
        }}
      />
      <ReasonDialog
        open={p?.kind === 'changes'}
        onOpenChange={(o) => !o && close()}
        title="Yêu cầu chỉnh sửa"
        description={p?.kind === 'changes' ? `Nội dung: ${p.draft.title}` : undefined}
        label="Góp ý chỉnh sửa"
        placeholder="Nêu rõ điểm cần sửa để KOL làm lại nhanh hơn"
        confirmLabel="Gửi yêu cầu"
        maxLength={BOOKING_NOTE_MAX}
        onConfirm={async (text) => {
          if (p?.kind !== 'changes') return;
          await bookingService.reviewContent(p.booking.id, p.draft.id, 'REQUEST_CHANGES', text);
          toast.success('Đã gửi yêu cầu chỉnh sửa');
        }}
      />
    </>
  );

  return {
    accept: (booking: BookingView) => setPending({ kind: 'accept', booking }),
    counter: (booking: BookingView) => setCounterFor(booking),
    decline: (booking: BookingView) => setPending({ kind: 'decline', booking }),
    cancel: (booking: BookingView) => setPending({ kind: 'cancel', booking }),
    markPaid: (booking: BookingView) => setPending({ kind: 'paid', booking }),
    requestChanges: (booking: BookingView, draft: ContentSubmission) => setPending({ kind: 'changes', booking, draft }),
    approve,
    approving,
    elements,
  };
}

export type BookingActionsApi = ReturnType<typeof useBookingActions>;

/** Accept / Counter / Decline buttons (only those allowed), for the negotiation block and proposal cards. */
export function NegotiationButtons({ booking, actions, className }: { booking: BookingView; actions: BookingActionsApi; className?: string }) {
  const can = (a: BookingView['allowedActions'][number]) => booking.allowedActions.includes(a);
  if (!can('ACCEPT') && !can('COUNTER') && !can('DECLINE')) return null;
  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      {can('ACCEPT') && (
        <Button type="button" className="h-11 md:h-9" disabled={booking.price <= 0} onClick={() => actions.accept(booking)}>
          {booking.status === 'APPLIED' ? 'Chấp nhận đề xuất' : 'Chấp nhận giá'}
        </Button>
      )}
      {can('COUNTER') && (
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => actions.counter(booking)}>
          Báo giá khác
        </Button>
      )}
      {can('DECLINE') && (
        <Button type="button" variant="ghost" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9" onClick={() => actions.decline(booking)}>
          Từ chối
        </Button>
      )}
    </div>
  );
}
