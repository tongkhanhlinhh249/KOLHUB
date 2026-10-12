import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  ANSWER_MAX,
  BOOKING_NOTE_MAX,
  bookingService,
  campaignService,
  isValidPhone,
  SHIPPING_ADDRESS_MAX,
  VN_PROVINCES,
  type ApplyInput,
  type BookingView,
  type MarketplaceCampaign,
  type SupplierType,
} from '../../services';
import { rewardText } from '../shared/recruitView';
import { PLATFORM_LABEL } from '../shared/StatusBadges';
import { ItemsEditor, useProposalSources } from './ItemsEditor';
import { errText } from './parts';
import { initialRows, rowsFromItems, rowsValid, toProposalItems, validateRows, type ItemDraft, type ItemErrors } from './proposalItems';
import { deliverablesSummary } from './supplierBooking';

/**
 * "Ứng tuyển" a marketplace campaign: proposal lines (MCN: managed KOL + channel assigned to that KOL;
 * KOL: own verified channels) and a note → campaignService.apply. No price: the campaign's fixed group rewards apply.
 * "Tuyển nhiều KOL": no price (fixed reward). Survey answers, every term ticked and — when the campaign gives a
 * product — the shipping address + phone are required.
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
  const [note, setNote] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState<string[]>([]);
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }
    setNote(editing?.note ?? '');
    const app = editing?.application;
    setAnswers(Object.fromEntries((app?.answers ?? []).map((a) => [a.questionId, a.answer])));
    setTerms(app ? campaign.terms.map((t) => t.id) : []);
    setProvince(app?.shipping?.province ?? '');
    setAddress(app?.shipping?.address ?? '');
    setPhone(app?.shipping?.phone ?? '');
    setTried(false);
    setError(null);
  }, [open, editing, campaign.terms]);

  // Seed the rows once the supplier's channels are known (edit: the application's current items).
  useEffect(() => {
    if (!open || seeded.current || sources.loading) return;
    seeded.current = true;
    setRows(editing ? rowsFromItems(editing.items) : initialRows(supplierType, campaign.deliverables, sources.channelsFor()));
  }, [open, sources, supplierType, campaign.deliverables, editing]);

  const errors: ItemErrors[] | undefined = tried ? validateRows(rows, supplierType) : undefined;
  const hasOptions =
    supplierType === 'MCN' ? sources.kols.some((k) => sources.channelsFor(k.kolAccountId).length > 0) : sources.channelsFor().length > 0;
  const recruit = campaign.type === 'OPEN_RECRUITMENT' && !!campaign.recruitment;
  const needsShipping = recruit && !!campaign.recruitment?.reward.product;
  const answerError = (qid: string, required: boolean) => (tried && required && !(answers[qid] ?? '').trim() ? 'Vui lòng trả lời câu hỏi này' : null);
  const termsError = tried && campaign.terms.some((t) => !terms.includes(t.id)) ? 'Cần đồng ý tất cả điều khoản để ứng tuyển' : null;
  const shipErrors = {
    province: tried && needsShipping && !province ? 'Chọn tỉnh/thành' : null,
    address: tried && needsShipping && address.trim().length < 5 ? 'Nhập địa chỉ nhận hàng (số nhà, đường, phường/xã)' : null,
    phone: tried && needsShipping && !isValidPhone(phone) ? 'Số điện thoại di động không hợp lệ (VD: 0912 345 678)' : null,
  };
  const formOk =
    campaign.survey.every((q) => !q.required || (answers[q.id] ?? '').trim()) &&
    campaign.terms.every((t) => terms.includes(t.id)) &&
    (!needsShipping || (!!province && address.trim().length >= 5 && isValidPhone(phone)));
  let n = 2;
  const step = () => n++;

  const submit = async () => {
    setTried(true);
    setError(null);
    if (rows.length === 0 || !rowsValid(validateRows(rows, supplierType)) || !formOk) return;
    setBusy(true);
    try {
      const proposal: ApplyInput = {
        items: toProposalItems(rows, supplierType),
        ...(note.trim() ? { note: note.trim() } : {}),
        answers,
        acceptedTerms: terms,
        ...(needsShipping ? { shipping: { province, address, phone } } : {}),
      };
      const booking = editing ? await bookingService.updateApplication(editing.id, proposal) : await campaignService.apply(campaign.id, proposal);
      if (editing) toast.success('Đã cập nhật đề xuất', { description: `${campaign.name} — Nhãn hàng sẽ thấy đề xuất mới.` });
      else
        toast.success(recruit ? 'Đã ứng tuyển' : 'Đã gửi đề xuất ứng tuyển', {
          description: recruit ? `${campaign.name} — Nhãn hàng chọn KOL trong giai đoạn Chọn lọc.` : `${campaign.name} — chờ Nhãn hàng phản hồi.`,
        });
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

          {recruit ? (
            <p className="rounded-[8px] bg-primary/5 p-3 text-sm text-foreground">
              Phần thưởng cố định mỗi KOL: <span className="font-semibold">{rewardText(campaign.recruitment!.reward)}</span>. Bạn không cần báo giá.
            </p>
          ) : (
            <div className="space-y-1 rounded-[8px] bg-primary/5 p-3 text-sm text-foreground">
              <p className="font-medium">Thù lao cố định theo nhóm đầu việc</p>
              <ul className="space-y-0.5">
                {campaign.groups.map((g) => (
                  <li key={g.platform} className="tabular-nums">
                    {PLATFORM_LABEL[g.platform]}: <span className="font-semibold">{rewardText(g.reward)}</span> mỗi kênh
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Mỗi kênh trong một nhóm là một booking. Bạn không cần báo giá; Nhãn hàng duyệt hoặc từ chối đơn.</p>
            </div>
          )}

          {campaign.survey.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{step()}. Câu hỏi của Nhãn hàng</h3>
              {campaign.survey.map((q) => {
                const err = answerError(q.id, q.required);
                return (
                  <div key={q.id} className="space-y-1.5">
                    <Label htmlFor={`${id}-q-${q.id}`}>
                      {q.text}
                      {q.required ? <span className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> (không bắt buộc)</span>}
                    </Label>
                    <Textarea
                      id={`${id}-q-${q.id}`}
                      rows={2}
                      maxLength={ANSWER_MAX}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      aria-invalid={!!err}
                      aria-describedby={err ? `${id}-q-${q.id}-err` : undefined}
                    />
                    {err && (
                      <p id={`${id}-q-${q.id}-err`} className="text-xs text-destructive">
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {needsShipping && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{step()}. Địa chỉ nhận sản phẩm</h3>
              <p className="text-xs text-muted-foreground">Nhãn hàng dùng địa chỉ này để gửi {campaign.recruitment!.reward.product!.name} nếu bạn được chọn.</p>
              <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-prov`}>Tỉnh/thành</Label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger id={`${id}-prov`} className="h-11 w-full bg-card md:h-9" aria-invalid={!!shipErrors.province}>
                      <SelectValue placeholder="Chọn tỉnh/thành" />
                    </SelectTrigger>
                    <SelectContent>
                      {VN_PROVINCES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shipErrors.province && <p className="text-xs text-destructive">{shipErrors.province}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-phone`}>Số điện thoại nhận hàng</Label>
                  <Input
                    id={`${id}-phone`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912 345 678"
                    className="h-11 bg-card md:h-9"
                    aria-invalid={!!shipErrors.phone}
                  />
                  {shipErrors.phone && <p className="text-xs text-destructive">{shipErrors.phone}</p>}
                </div>
                <div className="space-y-1.5 @md:col-span-2">
                  <Label htmlFor={`${id}-addr`}>Địa chỉ</Label>
                  <Input
                    id={`${id}-addr`}
                    autoComplete="street-address"
                    maxLength={SHIPPING_ADDRESS_MAX}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã"
                    className="h-11 bg-card md:h-9"
                    aria-invalid={!!shipErrors.address}
                  />
                  {shipErrors.address && <p className="text-xs text-destructive">{shipErrors.address}</p>}
                </div>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{`${step()}. Lời nhắn`}</h3>
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

          {campaign.terms.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{step()}. Điều khoản</h3>
              <ul className="space-y-2">
                {campaign.terms.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5">
                    <Checkbox
                      id={`${id}-t-${t.id}`}
                      checked={terms.includes(t.id)}
                      onCheckedChange={(v) => setTerms((x) => (v === true ? [...new Set([...x, t.id])] : x.filter((y) => y !== t.id)))}
                      className="mt-0.5"
                      aria-invalid={!!termsError && !terms.includes(t.id)}
                    />
                    <Label htmlFor={`${id}-t-${t.id}`} className="text-sm leading-snug font-normal">
                      {t.text}
                    </Label>
                  </li>
                ))}
              </ul>
              {termsError && <p className="text-xs text-destructive">{termsError}</p>}
            </section>
          )}
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
            {editing ? 'Lưu thay đổi' : recruit ? 'Gửi ứng tuyển' : 'Gửi đề xuất'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
