import { useEffect, useId, useState } from 'react';
import { CheckCheck, Inbox, Loader2, MessageCircleQuestion, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { campaignService, phaseOfTimeline, QA_ANSWER_MAX, type BookingView, type CampaignQAView, type CampaignView } from '../../services';
import { KolAvatar } from '../biz-search/KolCard';
import { ApplicationDetailsBlock, PhaseBadge, RecruitTimeline } from '../shared/RecruitParts';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ConfirmAction } from './BookingActions';
import { BookingItemRow } from './BookingSheet';
import { BookingStatusBadge, EmptyBlock, errText, SupplierTypeBadge } from './CampaignParts';
import { formatDayMs, formatDayTime, formatIsoDay } from './campaignView';

/** Picked = ACCEPTED or later (not cancelled); waiting = APPLIED; the rest = not picked / withdrawn. */
function groups(bookings: BookingView[]) {
  const apps = bookings.filter((b) => b.origin === 'APPLICATION');
  const waiting = apps.filter((b) => b.status === 'APPLIED').sort((a, b) => a.createdAt - b.createdAt);
  const picked = apps.filter((b) => !['APPLIED', 'NEGOTIATING', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(b.status) || (b.status === 'CANCELLED' && !!b.acceptedAt));
  const rejected = apps.filter((b) => b.status === 'DECLINED' || b.status === 'EXPIRED');
  const withdrawn = apps.filter((b) => b.status === 'CANCELLED' && !b.acceptedAt);
  return { waiting, picked, rejected, withdrawn };
}

/**
 * "Ứng tuyển" of a "Tuyển nhiều KOL" campaign: slots, phase, then the applicants with their answers and shipping
 * address. During "Chọn lọc" the brand ticks applicants and picks ("Chọn") or rejects ("Không chọn") them in bulk,
 * within the free slots; "Chốt danh sách" turns everyone left into "Không được chọn".
 */
export function SelectionTab({
  campaign: c,
  bookings,
  onOpen,
  onOpenKol,
}: {
  campaign: CampaignView;
  bookings: BookingView[];
  onOpen(id: string): void;
  onOpenKol(kolId: string): void;
}) {
  const r = c.recruitment!;
  const now = Date.now();
  const phase = phaseOfTimeline(r.timeline, now);
  const { waiting, picked, rejected, withdrawn } = groups(bookings);
  const [ticked, setTicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<'pick' | 'reject' | null>(null);
  const [confirm, setConfirm] = useState<'finalize' | null>(null);
  const free = Math.max(0, r.slots - picked.length);
  // EP-02 §13 tuyển liên tục: chọn được ngay khi có đơn (Ứng tuyển) và trong Chọn lọc.
  const canPick = phase === 'APPLY' || phase === 'SELECT';
  const canReject = phase === 'APPLY' || phase === 'SELECT';
  const tickedHere = ticked.filter((id) => waiting.some((b) => b.id === id));
  const allTicked = waiting.length > 0 && tickedHere.length === waiting.length;

  useEffect(() => {
    // Drop ticks of applicants that are no longer waiting (picked elsewhere, withdrawn…).
    setTicked((t) => t.filter((id) => waiting.some((b) => b.id === id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting.map((b) => b.id).join(',')]);

  const run = async (kind: 'pick' | 'reject') => {
    setBusy(kind);
    try {
      const res =
        kind === 'pick' ? await campaignService.selectApplicants(c.id, tickedHere) : await campaignService.rejectApplicants(c.id, tickedHere);
      setTicked([]);
      toast.success(kind === 'pick' ? `Đã chọn ${res.bookings.length} KOL/MCN` : `Đã đánh dấu ${res.bookings.length} ứng viên không được chọn`, {
        description: `Đã chọn ${res.selected}/${res.slots} suất.`,
      });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const hint =
    phase === 'UPCOMING' || phase === 'APPLY'
      ? `Đang nhận ứng tuyển đến hết ${formatIsoDay(r.timeline.applyEnd)}. Bạn có thể chọn KOL ngay khi có đơn phù hợp (tối đa ${r.slots} KOL), không cần chờ giai đoạn Chọn lọc (${formatIsoDay(r.timeline.selectStart)} – ${formatIsoDay(r.timeline.selectEnd)}).`
      : phase === 'SELECT'
        ? `Chọn tối đa ${r.slots} KOL/MCN trước hết ngày ${formatIsoDay(r.timeline.selectEnd)}. Người được chọn nhận phần thưởng cố định và bắt đầu ngay, không cần thương lượng. Ứng viên chưa được chọn khi hết giai đoạn sẽ là “Không được chọn”.`
        : 'Giai đoạn Chọn lọc đã kết thúc. Theo dõi KOL đã chọn ở tab Hợp tác.';

  return (
    <div className="@container space-y-4">
      <Card className="gap-4 p-4 md:p-5">
        <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <PhaseBadge campaign={{ type: 'OPEN_RECRUITMENT', phase, recruitment: r }} now={now} />
              <span className="text-sm font-semibold text-foreground tabular-nums">
                Đã chọn {picked.length}/{r.slots} suất
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                · {waiting.length} chờ chọn · còn {free} suất
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={r.slots} aria-valuenow={picked.length} aria-label="Số suất đã chọn">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (picked.length / Math.max(1, r.slots)) * 100)}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{hint}</p>
          </div>
          <RecruitTimeline timeline={r.timeline} phase={phase} />
        </div>
      </Card>

      {waiting.length > 0 && (canPick || canReject) && (
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-[8px] border border-border bg-background/95 p-2 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex min-h-11 items-center gap-2 md:min-h-9">
            <Checkbox
              id="chon-tat-ca"
              checked={allTicked ? true : tickedHere.length > 0 ? 'indeterminate' : false}
              onCheckedChange={(v) => setTicked(v === true ? waiting.map((b) => b.id) : [])}
              aria-label="Chọn tất cả ứng viên đang chờ"
            />
            <Label htmlFor="chon-tat-ca" className="text-sm font-normal">
              {tickedHere.length ? `Đã đánh dấu ${tickedHere.length}` : 'Đánh dấu tất cả'}
            </Label>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {canReject && (
              <Button type="button" variant="outline" className="h-11 md:h-9" disabled={!tickedHere.length || busy !== null} onClick={() => void run('reject')}>
                {busy === 'reject' ? <Loader2 className="animate-spin" aria-hidden /> : <UserX aria-hidden />}
                Không chọn{tickedHere.length ? ` (${tickedHere.length})` : ''}
              </Button>
            )}
            {canPick && (
              <Button
                type="button"
                className="h-11 md:h-9"
                disabled={!tickedHere.length || tickedHere.length > free || busy !== null}
                onClick={() => void run('pick')}
                title={tickedHere.length > free ? `Chỉ còn ${free} suất` : undefined}
              >
                {busy === 'pick' ? <Loader2 className="animate-spin" aria-hidden /> : <UserCheck aria-hidden />}
                Chọn{tickedHere.length ? ` (${tickedHere.length})` : ''}
              </Button>
            )}
          </div>
          {canPick && tickedHere.length > free && (
            <p className="w-full text-xs text-destructive" role="alert">
              Bạn đánh dấu {tickedHere.length} người nhưng chỉ còn {free} suất.
            </p>
          )}
        </div>
      )}

      {waiting.length === 0 ? (
        <Card className="p-0">
          <EmptyBlock
            icon={<Inbox className="size-6" aria-hidden />}
            title="Không có ứng viên chờ chọn"
            text={phase === 'APPLY' || phase === 'UPCOMING' ? 'KOL/MCN ứng tuyển trên Sàn chiến dịch sẽ hiện ở đây.' : 'Mọi ứng viên đã được xử lý.'}
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Ứng viên chờ chọn">
          {waiting.map((b) => {
            const on = tickedHere.includes(b.id);
            return (
              <li key={b.id}>
                <Card className={cn('gap-3 p-4 transition-colors', on && 'border-primary/60 bg-primary/[0.03]')}>
                  <div className="flex items-start gap-3">
                    {(canPick || canReject) && (
                      <Checkbox
                        checked={on}
                        onCheckedChange={(v) => setTicked((t) => (v === true ? [...t, b.id] : t.filter((x) => x !== b.id)))}
                        aria-label={`Đánh dấu ${b.supplier.name}`}
                        className="mt-3"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <KolAvatar name={b.supplier.name} src={b.supplier.avatar} className="size-10" />
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold text-foreground">{b.supplier.name}</span>
                              <SupplierTypeBadge type={b.supplierType} />
                            </p>
                            <p className="text-xs text-muted-foreground">Ứng tuyển {formatDayMs(b.createdAt)}</p>
                          </div>
                        </div>
                        <Button type="button" variant="link" className="h-11 px-0 md:h-9" onClick={() => onOpen(b.id)}>
                          Xem chi tiết
                        </Button>
                      </div>
                      <ul className="space-y-2">
                        {b.items.map((it) => (
                          <BookingItemRow key={it.id} item={it} onOpenKol={onOpenKol} />
                        ))}
                      </ul>
                      {b.note && <p className="text-sm whitespace-pre-line text-foreground/85">“{b.note}”</p>}
                      {b.application && <ApplicationDetailsBlock details={b.application} />}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {canPick && waiting.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" className="h-11 md:h-9" onClick={() => setConfirm('finalize')}>
            <CheckCheck aria-hidden />
            Chốt danh sách
          </Button>
        </div>
      )}

      {(picked.length > 0 || rejected.length > 0 || withdrawn.length > 0) && (
        <Card className="gap-3 p-4">
          <h3 className="text-sm font-semibold text-foreground">Đã xử lý</h3>
          <ul className="divide-y divide-border">
            {[...picked, ...rejected, ...withdrawn].map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <button type="button" className="flex min-w-0 items-center gap-2 text-left hover:text-primary" onClick={() => onOpen(b.id)}>
                  <KolAvatar name={b.supplier.name} src={b.supplier.avatar} className="size-8" />
                  <span className="truncate text-sm font-medium">{b.supplier.name}</span>
                </button>
                <span className="flex items-center gap-2">
                  {picked.includes(b) && <span className="text-xs font-medium text-chart-4">Đã chọn</span>}
                  {rejected.includes(b) && <span className="text-xs text-muted-foreground">Không được chọn</span>}
                  {withdrawn.includes(b) && <span className="text-xs text-muted-foreground">Đã rút</span>}
                  <BookingStatusBadge status={b.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {confirm && (
        <ConfirmAction
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Chốt danh sách chọn lọc?"
          description={`${waiting.length} ứng viên chưa được chọn sẽ chuyển sang “Không được chọn”. Bạn đã chọn ${picked.length}/${r.slots} suất.`}
          confirmLabel="Chốt danh sách"
          onConfirm={async () => {
            const res = await campaignService.finalizeSelection(c.id);
            toast.success('Đã chốt danh sách', { description: `${res.bookings.length} ứng viên không được chọn.` });
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hỏi đáp (brand)
// ---------------------------------------------------------------------------

function AnswerForm({ q }: { q: CampaignQAView }) {
  const id = useId();
  const [text, setText] = useState(q.answer ?? '');
  const [editing, setEditing] = useState(!q.answer);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await campaignService.answerQuestion(q.id, text);
      toast.success(q.answer ? 'Đã cập nhật câu trả lời' : 'Đã trả lời, câu hỏi hiển thị công khai trên Sàn');
      setEditing(false);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };
  if (!editing) {
    return (
      <div className="space-y-1 rounded-[8px] bg-primary/5 p-3">
        <p className="text-xs text-muted-foreground">Bạn trả lời{q.answeredAt ? ` · ${formatDayTime(q.answeredAt)}` : ''}</p>
        <p className="text-sm whitespace-pre-line text-foreground">{q.answer ?? text}</p>
        <Button type="button" variant="link" className="h-11 px-0 md:h-auto" onClick={() => setEditing(true)}>
          Sửa câu trả lời
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-a`} className="sr-only">
        Câu trả lời
      </Label>
      <Textarea id={`${id}-a`} rows={3} maxLength={QA_ANSWER_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="Câu trả lời sẽ hiển thị công khai cho mọi người trên Sàn." />
      <div className="flex justify-end gap-2">
        {q.answer && (
          <Button type="button" variant="ghost" className="h-11 md:h-9" onClick={() => setEditing(false)} disabled={busy}>
            Huỷ
          </Button>
        )}
        <Button type="button" className="h-11 md:h-9" disabled={busy || !text.trim()} onClick={() => void submit()}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {q.answer ? 'Lưu' : 'Trả lời'}
        </Button>
      </div>
    </div>
  );
}

/** "Hỏi đáp": questions of KOL/MCN on the Sàn; unanswered first. Answers become public on the Sàn. */
export function QATab({ campaignId }: { campaignId: string }) {
  const q = useLiveQuery(() => campaignService.listQuestions(campaignId), [campaignId]);
  const list = q.data ?? [];
  if (q.loading && !q.data) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (list.length === 0) {
    return (
      <Card className="p-0">
        <EmptyBlock
          icon={<MessageCircleQuestion className="size-6" aria-hidden />}
          title="Chưa có câu hỏi"
          text="KOL/MCN đã đăng nhập có thể đặt câu hỏi trên trang chiến dịch ở Sàn. Câu bạn trả lời sẽ hiển thị công khai."
        />
      </Card>
    );
  }
  const open = list.filter((x) => !x.answer).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {list.length} câu hỏi{open ? ` · ${open} chưa trả lời` : ''}. Câu trả lời hiển thị công khai trên Sàn chiến dịch, kể cả với khách chưa đăng nhập.
      </p>
      <ul className="flex flex-col gap-3" aria-label="Hỏi đáp">
        {list.map((x) => (
          <li key={x.id}>
            <Card className={cn('gap-3 p-4', !x.answer && 'border-primary/40')}>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {x.askerName} hỏi · {formatDayTime(x.createdAt)}
                  {!x.answer && <span className="ml-2 font-medium text-primary">Chưa trả lời</span>}
                </p>
                <p className="text-sm font-medium whitespace-pre-line text-foreground">{x.question}</p>
              </div>
              <AnswerForm q={x} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
