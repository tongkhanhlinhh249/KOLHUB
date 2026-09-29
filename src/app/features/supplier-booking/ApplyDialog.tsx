import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { BOOKING_NOTE_MAX, bookingService, campaignService, type BookingView, type MarketplaceCampaign, type SupplierType } from '../../services';
import { ItemsEditor, useProposalSources } from './ItemsEditor';
import { errText } from './parts';
import { initialRows, rowsFromItems, rowsValid, toProposalItems, validateRows, type ItemDraft, type ItemErrors } from './proposalItems';
import { deliverablesSummary, formatVnd, formatVndInput, parseVndInput } from './supplierBooking';

/**
 * "Ứng tuyển" a marketplace campaign: proposal lines (MCN: managed KOL + channel assigned to that KOL;
 * KOL: own verified channels), total price and a note → campaignService.apply.
 * With `editing` (an APPLIED application): prefilled "Sửa đề xuất" → bookingService.updateApplication.
 */
export function ApplyDialog({
  open,
  onOpenChange,
  campaign,
  accountId,
  supplierType,
  onApplied,
  editing,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  campaign: MarketplaceCampaign;
  accountId: string;
  supplierType: SupplierType;
  onApplied(booking: BookingView): void;
  editing?: BookingView | null;
}) {
  const id = useId();
  const sources = useProposalSources(accountId, supplierType, campaign.platforms, open);
  const [rows, setRows] = useState<ItemDraft[]>([]);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }
    setPrice(editing ? formatVndInput(String(editing.price)) : '');
    setNote(editing?.note ?? '');
    setTried(false);
    setError(null);
  }, [open, editing]);

  // Seed the rows once the supplier's channels are known (edit: the application's current items).
  useEffect(() => {
    if (!open || seeded.current || sources.loading) return;
    seeded.current = true;
    setRows(editing ? rowsFromItems(editing.items) : initialRows(supplierType, campaign.deliverables, sources.channelsFor()));
  }, [open, sources, supplierType, campaign.deliverables, editing]);

  const errors: ItemErrors[] | undefined = tried ? validateRows(rows, supplierType) : undefined;
  const priceValue = parseVndInput(price);
  const hasOptions =
    supplierType === 'MCN' ? sources.kols.some((k) => sources.channelsFor(k.kolAccountId).length > 0) : sources.channelsFor().length > 0;
  const priceError = tried && priceValue <= 0 ? 'Nhập tổng giá đề xuất (VND), lớn hơn 0' : null;

  const submit = async () => {
    setTried(true);
    setError(null);
    if (rows.length === 0 || !rowsValid(validateRows(rows, supplierType)) || priceValue <= 0) return;
    setBusy(true);
    try {
      const proposal = {
        items: toProposalItems(rows, supplierType),
        price: priceValue,
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const booking = editing ? await bookingService.updateApplication(editing.id, proposal) : await campaignService.apply(campaign.id, proposal);
      if (editing) toast.success('Đã cập nhật đề xuất', { description: `${campaign.name} — Nhãn hàng sẽ thấy đề xuất mới.` });
      else toast.success('Đã gửi đề xuất ứng tuyển', { description: `${campaign.name} — chờ Nhãn hàng phản hồi.` });
      onApplied(booking);
      onOpenChange(false);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[90dvh] max-w-[calc(100%-2rem)] flex-col gap-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa đề xuất ứng tuyển' : 'Ứng tuyển chiến dịch'}</DialogTitle>
          <DialogDescription className="break-words">
            {campaign.name} · {campaign.brand.company}
          </DialogDescription>
        </DialogHeader>

        <div className="@container -mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{supplierType === 'MCN' ? '1. KOL và kênh đăng' : '1. Kênh đăng và nội dung'}</h3>
            <p className="text-xs text-muted-foreground">Nhãn hàng yêu cầu: {deliverablesSummary(campaign.deliverables)}</p>
            <ItemsEditor
              supplierType={supplierType}
              sources={sources}
              platforms={campaign.platforms}
              rows={rows}
              errors={errors}
              onChange={setRows}
              idPrefix={`${id}-item`}
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">2. Giá và lời nhắn</h3>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-price`}>Tổng giá đề xuất (VND)</Label>
              <div className="relative">
                <Input
                  id={`${id}-price`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ví dụ: 25.000.000"
                  value={price}
                  onChange={(e) => setPrice(formatVndInput(e.target.value))}
                  className="h-11 bg-card pr-8 md:h-9"
                  aria-invalid={!!priceError}
                  aria-describedby={`${id}-price-hint`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
              </div>
              <p id={`${id}-price-hint`} className={priceError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                {priceError ?? `Giá cho toàn bộ hạng mục. Ngân sách chiến dịch: ${formatVnd(campaign.budget)}.`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-note`}>Lời nhắn cho Nhãn hàng (không bắt buộc)</Label>
              <Textarea
                id={`${id}-note`}
                rows={3}
                maxLength={BOOKING_NOTE_MAX}
                value={note}
                placeholder="Giới thiệu ngắn về KOL, ý tưởng nội dung, thời gian đăng dự kiến…"
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                {note.trim().length}/{BOOKING_NOTE_MAX}
              </p>
            </div>
          </section>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="button" className="h-11 md:h-9" disabled={busy || sources.loading || !hasOptions || rows.length === 0} onClick={() => void submit()}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {editing ? 'Lưu thay đổi' : 'Gửi đề xuất'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
