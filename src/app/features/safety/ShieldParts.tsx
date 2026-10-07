import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, ShieldOff, ShieldQuestion } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  kolSafetyReportService,
  SHIELD_APPEAL_MAX,
  SHIELD_MAX_GRAY,
  SHIELD_STATUS_LABEL,
  SHIELD_SUSPEND_DAYS,
  SHIELD_WINDOW,
  type ChannelReport,
  type PublicShield,
  type ShieldStatus,
} from '../../services';
import { errText } from '../campaigns/CampaignParts';
import { ToneBadge, type Tone } from '../shared/StatusBadges';

const TONE: Record<ShieldStatus, Tone> = {
  NONE: 'neutral',
  ACTIVE: 'success',
  FAILED: 'warning',
  SUSPENDED: 'warning',
  APPEALED: 'info',
  REVOKED: 'error',
};

const day = (ms: number) => new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Owner-side status chip of the "Khiên An toàn nội dung". */
export function ShieldStatusBadge({ status, className }: { status: ShieldStatus; className?: string }) {
  return (
    <ToneBadge tone={TONE[status]} className={className}>
      {SHIELD_STATUS_LABEL[status]}
    </ToneBadge>
  );
}

/** What brands see next to a channel: "Khiên An toàn" (green) or "Khiên tạm treo" (amber). */
export function PublicShieldBadge({ shield, className }: { shield?: PublicShield; className?: string }) {
  if (!shield) return null;
  const active = shield === 'ACTIVE';
  const Icon = active ? ShieldCheck : ShieldAlert;
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 text-[11px] font-medium whitespace-nowrap',
        active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        className,
      )}
      title={active ? 'Đạt Khiên An toàn nội dung (KOL Safety)' : 'Khiên An toàn đang tạm treo: có nội dung mới đang được xử lý'}
    >
      <Icon className="size-3" aria-hidden />
      {active ? 'Khiên An toàn' : 'Khiên tạm treo'}
    </span>
  );
}

const STATUS_ICON: Record<ShieldStatus, typeof ShieldCheck> = {
  NONE: ShieldQuestion,
  ACTIVE: ShieldCheck,
  FAILED: ShieldAlert,
  SUSPENDED: ShieldAlert,
  APPEALED: ShieldQuestion,
  REVOKED: ShieldOff,
};

/**
 * "Khiên An toàn nội dung" block of the KOL Safety report: status, the 10-content window, reasons, and the
 * actions allowed now — "Xin Khiên An toàn", "Đã gỡ bài" on flagged contents, "Khiếu nại" (reviewed by KOLHUB ops).
 */
export function ShieldPanel({ accountId, report }: { accountId: string; report: ChannelReport }) {
  const sh = report.shield;
  const [busy, setBusy] = useState<string | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [note, setNote] = useState('');
  const Icon = STATUS_ICON[sh.status];
  const titleOf = (id: string) => report.items.find((i) => i.id === id);

  const run = async (key: string, fn: () => Promise<ChannelReport>, ok: (r: ChannelReport) => string) => {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(ok(r));
      return true;
    } catch (e) {
      toast.error(errText(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const request = () =>
    run('request', () => kolSafetyReportService.requestShield(accountId, report.channelId), (r) =>
      r.shield.status === 'ACTIVE' ? 'Kênh đã đạt Khiên An toàn' : 'Kênh chưa đạt Khiên An toàn — xem lý do bên dưới',
    );
  const remove = (id: string) =>
    run(`rm-${id}`, () => kolSafetyReportService.markRemoved(accountId, report.channelId, id), (r) =>
      r.shield.status === 'ACTIVE' ? 'Đã ghi nhận gỡ bài — khiên đã đạt lại' : 'Đã ghi nhận gỡ bài',
    );
  const appeal = async () => {
    const ok = await run('appeal', () => kolSafetyReportService.appealShield(accountId, report.channelId, note), () => 'Đã gửi khiếu nại cho đội vận hành KOLHUB');
    if (ok) {
      setAppealOpen(false);
      setNote('');
    }
  };

  const daysLeft = sh.deadline !== undefined ? Math.max(0, Math.ceil((sh.deadline - Date.now()) / 86_400_000)) : 0;

  return (
    <section aria-labelledby="shield-title" className="space-y-3 rounded-[8px] border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className={cn('size-5 shrink-0', sh.status === 'ACTIVE' ? 'text-emerald-600' : sh.status === 'REVOKED' ? 'text-destructive' : 'text-muted-foreground')} aria-hidden />
        <h2 id="shield-title" className="text-sm font-semibold text-foreground">
          Khiên An toàn nội dung
        </h2>
        <ShieldStatusBadge status={sh.status} />
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {SHIELD_WINDOW} nội dung gần nhất: {sh.window.safe} an toàn · {sh.window.gray} cần xem lại · {sh.window.violation} vi phạm
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {sh.status === 'NONE' &&
          `Xét ${SHIELD_WINDOW} nội dung gần nhất: không có Vi phạm, tối đa ${SHIELD_MAX_GRAY} Cần xem lại. Khiên hiện cho Nhãn hàng trên kênh và là một tiêu chí của Badge Xác thực Kol.gov.vn.`}
        {sh.status === 'ACTIVE' && `Đạt từ ${sh.grantedAt ? day(sh.grantedAt) : '—'}. Mỗi lần quét có nội dung mới, khiên được xét lại.`}
        {sh.status === 'FAILED' && 'Chưa đạt. Gỡ bài không đạt hoặc quét lại khi có bài mới — khiên tự cấp khi đạt. Nếu AI nhận nhầm, hãy khiếu nại.'}
        {sh.status === 'SUSPENDED' &&
          `Tạm treo vì nội dung mới không đạt. Còn ${daysLeft} ngày (đến ${sh.deadline ? day(sh.deadline) : '—'}) để gỡ bài hoặc khiếu nại; quá hạn khiên bị thu hồi.`}
        {sh.status === 'APPEALED' && `Đội vận hành KOLHUB đang xét khiếu nại gửi ngày ${sh.appeal ? day(sh.appeal.at) : '—'}. Hạn xử lý tạm dừng trong lúc xét.`}
        {sh.status === 'REVOKED' && `Đã thu hồi do quá ${SHIELD_SUSPEND_DAYS} ngày không xử lý. Xin lại khi ${SHIELD_WINDOW} nội dung gần nhất đạt.`}
      </p>
      {!sh.channelVerified && (sh.status === 'NONE' || sh.status === 'REVOKED') && (
        <p className="text-xs text-amber-800">Kênh cần có dấu xác thực trước khi xin Khiên An toàn.</p>
      )}
      {sh.reasons.length > 0 && sh.status !== 'ACTIVE' && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-foreground">
          {sh.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {sh.appeal?.status === 'REJECTED' && (
        <p className="rounded-[6px] bg-muted/60 px-3 py-2 text-xs text-foreground">
          Khiếu nại ngày {day(sh.appeal.at)} bị từ chối{sh.appeal.decisionNote ? `: ${sh.appeal.decisionNote}` : '.'}
        </p>
      )}

      {sh.canMarkRemoved && (
        <ul className="divide-y divide-border rounded-[6px] border border-border" aria-label="Nội dung chưa đạt trong cửa sổ xét">
          {sh.window.flaggedIds.map((id) => {
            const it = titleOf(id);
            return (
              <li key={id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className={cn('size-2 shrink-0 rounded-full', it?.verdict === 'VIOLATION' ? 'bg-destructive' : 'bg-amber-500')} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-foreground">{it?.title ?? id}</span>
                <span className="text-xs text-muted-foreground">{it?.verdict === 'VIOLATION' ? 'Vi phạm' : 'Cần xem lại'}</span>
                <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" disabled={busy !== null} onClick={() => void remove(id)}>
                  {busy === `rm-${id}` && <Loader2 className="animate-spin" aria-hidden />}
                  Đã gỡ bài
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {(sh.canRequest || sh.canAppeal) && (
        <div className="flex flex-wrap gap-2">
          {sh.canRequest && (
            <Button type="button" className="h-11 md:h-9" disabled={busy !== null} onClick={() => void request()}>
              {busy === 'request' ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
              {sh.status === 'REVOKED' ? 'Xin lại Khiên An toàn' : 'Xin Khiên An toàn'}
            </Button>
          )}
          {sh.canAppeal && (
            <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy !== null} onClick={() => setAppealOpen(true)}>
              Khiếu nại
            </Button>
          )}
        </div>
      )}

      <Dialog open={appealOpen} onOpenChange={setAppealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Khiếu nại kết quả KOL Safety</DialogTitle>
            <DialogDescription>Đội vận hành KOLHUB xem lại các nội dung bị đánh dấu và trả lời trong mục này. Miễn phí.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={SHIELD_APPEAL_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Video số 3 là cảnh nấu ăn, AI nhận nhầm dao bếp là vũ khí."
            aria-label="Lý do khiếu nại"
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setAppealOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" className="h-11 md:h-9" disabled={busy !== null || !note.trim()} onClick={() => void appeal()}>
              {busy === 'appeal' && <Loader2 className="animate-spin" aria-hidden />}
              Gửi khiếu nại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
