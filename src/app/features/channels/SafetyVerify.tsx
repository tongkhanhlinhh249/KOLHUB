// Xác thực kênh qua KOL Safety (docs/nghiep-vu/xac-thuc-kenh-kol-safety.md, mục 3 và 5): callout trên
// từng dòng kênh + sheet "Xác thực trên KOL Safety". Prototype giả lập phần KOL Safety ngay trong sheet
// (mở tab mới sẽ làm hai tab ghi đè dữ liệu demo của nhau).
import { useEffect, useId, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useIsMobile } from '../../components/ui/use-mobile';
import { cn } from '../../components/ui/utils';
import {
  canRenew,
  daysLeft,
  KolhubError,
  SAFETY_CONTENT_LABEL,
  SAFETY_SCAN_SECONDS,
  SAFETY_SNAPSHOT_DAYS,
  SAFETY_TYPE_LABEL,
  safetyProgress,
  safetyVerificationService,
  type Channel,
  type SafetyItem,
} from '../../services';
import { SAFETY_TOOL_URL } from '../apps/safetyTool';
import { PLATFORM_LABEL, ToneBadge } from '../shared/StatusBadges';
import { channelName } from './ChannelParts';

/** Câu cam đoan bắt buộc trước khi xác thực / gia hạn (BR-40). */
export const SAFETY_PLEDGE =
  'Tôi hiểu KOL Safety chỉ kiểm tra 3 phút đầu của mỗi video. Tôi chịu trách nhiệm về toàn bộ nội dung trên kênh, kể cả phần không được kiểm tra.';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function errorText(err: unknown): string {
  if (err instanceof KolhubError) return err.message;
  return 'Có lỗi xảy ra, vui lòng thử lại.';
}

/** Kênh cần hành động KOL Safety: chưa xác thực, hoặc trong cửa sổ gia hạn / đã hết hạn. */
function needsSafetyAction(c: Channel, now: number): boolean {
  return c.status === 'SAFETY_PENDING' || ((c.status === 'VERIFIED' || c.status === 'EXPIRED') && canRenew(c, now));
}

/** Trạng thái KOL Safety của kênh, cùng kiểu nhãn với trạng thái duyệt ("Chờ duyệt"…) dưới tên kênh. */
export function SafetyStatusBadge({ channel, now }: { channel: Channel; now: number }) {
  if (!needsSafetyAction(channel, now)) {
    const at = channel.safetyPassedAt ?? channel.verifiedAt;
    return (
      <span title={at ? `Đạt KOL Safety ngày ${format(at, 'dd/MM/yyyy')}` : undefined}>
        <ToneBadge tone="success">Đã xác thực KOL Safety</ToneBadge>
      </span>
    );
  }
  const p = safetyProgress(channel, now);
  const left = daysLeft(channel, now);
  const text =
    p.purpose === 'RENEW'
      ? left === undefined
        ? 'KOL Safety hết hạn'
        : `KOL Safety còn ${left} ngày`
      : p.phase === 'IN_PROGRESS'
        ? `KOL Safety ${p.passed}/${p.required} đạt`
        : 'Chưa xác thực KOL Safety';
  return <ToneBadge tone={p.purpose === 'RENEW' && left === undefined ? 'error' : 'warning'}>{text}</ToneBadge>;
}

/** Nút trên dòng kênh khi cần làm gì với KOL Safety: Xác thực / Tiến độ (đang quét trên KOL Safety) / Gia hạn (mở sheet). */
export function SafetyActionButton({ channel, now, onOpen }: { channel: Channel; now: number; onOpen(): void }) {
  if (!needsSafetyAction(channel, now)) return null;
  const p = safetyProgress(channel, now);
  return (
    <Button type="button" size="sm" className="h-11 shrink-0 md:h-8" onClick={onOpen}>
      <ShieldCheck aria-hidden />
      {p.purpose === 'RENEW' ? 'Gia hạn' : p.phase === 'IN_PROGRESS' ? 'Tiến độ' : 'Xác thực'}
      <span className="sr-only"> KOL Safety cho kênh {channelName(channel.handle, channel.url)}</span>
    </Button>
  );
}

/** One locked item with the result KOL Safety reported (read-only: scanning happens on KOL Safety). */
function ItemRow({ item }: { item: SafetyItem }) {
  const long = item.durationSec !== undefined && item.durationSec > SAFETY_SCAN_SECONDS;
  return (
    <li className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-foreground" title={item.title}>
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {SAFETY_TYPE_LABEL[item.type]} · {format(item.postedAt, 'dd/MM/yyyy')}
            {item.durationSec !== undefined && (
              <>
                {' '}
                · {mmss(item.durationSec)}
                {long && ` · quét 0:00–${mmss(SAFETY_SCAN_SECONDS)}`}
              </>
            )}
            {item.scans > 1 && ` · đã quét ${item.scans} lần`}
          </p>
        </div>
        {item.verdict === 'PASS' && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground">
            <CheckCircle2 className="size-4 text-chart-4" aria-hidden />
            Đạt
          </span>
        )}
        {item.verdict === 'FAIL' && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-destructive">
            <XCircle className="size-4" aria-hidden />
            Không đạt
          </span>
        )}
        {!item.verdict && <span className="shrink-0 text-xs font-medium text-muted-foreground">Chưa quét</span>}
      </div>
      {item.verdict === 'FAIL' && item.reason && (
        <p className="rounded-md bg-destructive/5 p-2 text-xs text-foreground">
          <span className="font-medium">KOL Safety:</span> {item.reason}
        </p>
      )}
    </li>
  );
}

/** Sheet "Xác thực trên KOL Safety": quy tắc + cam đoan → danh sách N nội dung đã chốt và kết quả từng nội dung. */
export function SafetyVerifySheet({
  channel,
  accountId,
  onOpenChange,
}: {
  /** Kênh đang mở; undefined = đóng. */
  channel?: Channel;
  accountId: string;
  onOpenChange(open: boolean): void;
}) {
  const isMobile = useIsMobile();
  const consentId = useId();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Giữ kênh cuối cùng để nội dung không biến mất trong lúc sheet đóng.
  const [shown, setShown] = useState<Channel | undefined>(channel);
  useEffect(() => {
    if (channel) setShown(channel);
  }, [channel]);
  useEffect(() => {
    setConsent(false);
    setError(null);
  }, [channel?.id]);

  const c = channel ?? shown;
  const now = Date.now();
  const p = c ? safetyProgress(c, now) : undefined;
  const safety = c?.safety;
  // Vừa đạt N/N trong sheet này: hiện kết quả thay vì quay lại bước cam đoan.
  const justPassed = !!safety?.passedAt && now - safety.passedAt < 10 * 60_000 && p?.phase !== 'IN_PROGRESS';
  // After a first verification passes the channel is PENDING_REVIEW, so take the purpose from the finished run.
  const purpose = justPassed && safety ? safety.purpose : p?.purpose;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof KolhubError) setError(err.message);
      else toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  // Opens the KOL Safety tool in a new tab (from the click, so it is not blocked) and locks the N items here.
  const start = () => {
    if (!c) return;
    window.open(SAFETY_TOOL_URL, '_blank', 'noopener,noreferrer');
    void run(() => safetyVerificationService.start(accountId, c.id, consent));
  };
  // EC-08: ask KOL Safety again for the latest result (the scan itself happens on KOL Safety).
  const refresh = () =>
    c &&
    run(async () => {
      await safetyVerificationService.refresh(accountId, c.id);
      toast.success('Đã cập nhật kết quả từ KOL Safety');
    });

  let body: ReactNode = null;
  if (c && p && justPassed && safety) {
    body = (
      <div className="space-y-4 p-4">
        <Alert>
          <CheckCircle2 className="size-4 text-chart-4" aria-hidden />
          <AlertDescription>
            {safety.purpose === 'VERIFY'
              ? `Đủ ${safety.required}/${safety.required} nội dung đạt KOL Safety. Kênh đã chuyển sang Chờ duyệt — KOL Hub sẽ duyệt chủ sở hữu kênh (link và ảnh quản lý) rồi gửi kết quả qua email/SMS.`
              : `Đã gia hạn xác thực kênh, hiệu lực đến ${c.badgeExpiresAt ? format(c.badgeExpiresAt, 'dd/MM/yyyy') : '—'}. Không cần Admin duyệt lại.`}
          </AlertDescription>
        </Alert>
        <Button type="button" className="h-11 w-full md:h-9" onClick={() => onOpenChange(false)}>
          Xong
        </Button>
      </div>
    );
  } else if (c && p && p.phase === 'IN_PROGRESS' && safety) {
    const pending = safety.items.filter((i) => i.verdict !== 'PASS').length;
    const unscanned = safety.items.filter((i) => !i.verdict).length;
    body = (
      <>
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">
              {p.passed}/{p.required} nội dung đạt
            </span>
            <span className="text-xs text-muted-foreground">
              {p.failed > 0 && <span className="text-destructive">{p.failed} không đạt · </span>}
              {unscanned} chưa quét
            </span>
          </div>
          <Progress value={(p.passed / p.required) * 100} className="h-2" aria-label={`${p.passed}/${p.required} nội dung đạt`} />
          <p className="text-xs text-muted-foreground">
            Danh sách chốt lúc {format(safety.snapshotAt, 'HH:mm dd/MM/yyyy')}, giữ đến {format(p.snapshotExpiresAt!, 'dd/MM/yyyy')}. Nội
            dung đăng sau thời điểm chốt không làm đổi danh sách. Việc quét làm trên KOL Safety (mỗi lần quét trừ token
            ở đó); KOL Hub tự cập nhật kết quả.
          </p>
          {p.failed > 0 && (
            <p className="text-xs text-foreground">{p.failed} nội dung không đạt: gỡ hoặc chỉnh trên nền tảng rồi quét lại trên KOL Safety.</p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="h-11 flex-1 md:h-9" asChild>
              <a href={SAFETY_TOOL_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                Quét {pending} nội dung trên KOL Safety
                <span className="sr-only"> (mở tab mới)</span>
              </a>
            </Button>
            <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={refresh}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
              Làm mới
            </Button>
          </div>
        </div>
        <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4" aria-label="Nội dung được xét">
          {safety.items.map((i) => (
            <ItemRow key={i.id} item={i} />
          ))}
        </ol>
      </>
    );
  } else if (c && p) {
    body = (
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <div className="space-y-2 rounded-lg bg-muted/60 p-3">
          <p className="font-medium text-foreground">Quy tắc {PLATFORM_LABEL[c.platform]}</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/90">
            <li>
              Xét <strong>{p.required} {SAFETY_CONTENT_LABEL[c.platform]} gần nhất</strong>, cả {p.required} phải đạt. Bạn không tự chọn nội dung.
            </li>
            <li>Mỗi video chỉ quét 3 phút đầu. Phần từ phút thứ 4 KOL Safety không kiểm tra.</li>
            <li>Quét lại không giới hạn; mỗi lần quét trừ token trên KOL Safety.</li>
            <li>Danh sách nội dung được chốt khi mở KOL Safety và giữ {SAFETY_SNAPSHOT_DAYS} ngày.</li>
            {p.purpose === 'RENEW' ? (
              <li>Đạt đủ thì dấu được gia hạn thêm 3 tháng, không cần Admin duyệt lại.</li>
            ) : (
              <li>Đạt đủ thì kênh chuyển Chờ duyệt để KOL Hub duyệt chủ sở hữu, sau đó nhận dấu xác thực 3 tháng.</li>
            )}
          </ul>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border p-3">
          <Checkbox id={consentId} checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <Label htmlFor={consentId} className="text-sm leading-relaxed font-normal">
            {SAFETY_PLEDGE}
          </Label>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="button" className="h-11 w-full md:h-9" disabled={!consent || busy} onClick={start}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ExternalLink aria-hidden />}
          Mở KOL Safety để quét
        </Button>
        <p className="text-xs text-muted-foreground">Việc quét làm trên KOL Safety. Quét xong, kết quả từng nội dung tự cập nhật về đây.</p>
      </div>
    );
  }

  return (
    <Sheet open={!!channel} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('flex flex-col gap-0 p-0', isMobile ? 'max-h-[90dvh]' : 'w-full sm:max-w-lg')}
      >
        <SheetHeader className="border-b border-border p-4 pr-12 text-left">
          <SheetTitle>{purpose === 'RENEW' ? 'Gia hạn xác thực kênh' : 'Xác thực trên KOL Safety'}</SheetTitle>
          <SheetDescription>
            {c ? `${PLATFORM_LABEL[c.platform]} · ${channelName(c.handle, c.url)}` : ''}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">{body}</div>
      </SheetContent>
    </Sheet>
  );
}
