import { useState, type ReactNode } from 'react';
import { AlertTriangle, Ban, Info, Loader2, Trash2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { cn } from '../../components/ui/utils';
import { issueSummary, type IssueSeverity, type SafetyIssue, type SafetyVerdict, type ScanResult } from '../../services';

// The kit has no success/warning tokens: chart-4 (green) and chart-5 (amber) stand in for them.
export const VERDICT_UI: Record<SafetyVerdict, { label: string; dot: string; chip: string; text: string }> = {
  VIOLATION: { label: 'Vi phạm', dot: 'bg-destructive', chip: 'bg-destructive text-white', text: 'text-destructive' },
  GRAY: { label: 'Vùng xám', dot: 'bg-chart-5', chip: 'bg-chart-5 text-foreground', text: 'text-chart-5' },
  SAFE: { label: 'An toàn', dot: 'bg-chart-4', chip: 'bg-chart-4 text-white', text: 'text-chart-4' },
};

const SEVERITY_UI: Record<IssueSeverity, { label: string; icon: typeof Info; className: string }> = {
  violation: { label: 'Vi phạm', icon: XCircle, className: 'text-destructive' },
  warning: { label: 'Cảnh báo', icon: AlertTriangle, className: 'text-chart-5' },
  note: { label: 'Lưu ý', icon: Info, className: 'text-muted-foreground' },
};

/** 58 → "0:58", 754 → "12:34". */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const OVERLAY_PILL = 'inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm';

export function VerdictPill({ verdict, processing }: { verdict?: SafetyVerdict; processing?: boolean }) {
  if (processing || !verdict) {
    return (
      <span className={OVERLAY_PILL}>
        <Loader2 className="size-3 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
        Đang kiểm tra…
      </span>
    );
  }
  const ui = VERDICT_UI[verdict];
  return (
    <span className={OVERLAY_PILL}>
      <span className={cn('size-2 rounded-full', ui.dot)} aria-hidden />
      {ui.label}
    </span>
  );
}

export function ScoreChip({ result }: { result: ScanResult }) {
  return (
    <span
      className={cn('rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm', VERDICT_UI[result.verdict].chip)}
      aria-label={`Điểm an toàn ${result.score} trên 100`}
    >
      {result.score}đ
    </span>
  );
}

/** Side sheet listing a scan's issues, most severe first. */
export function IssuesSheet({
  open,
  onOpenChange,
  name,
  result,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  name: string;
  result: ScanResult;
}) {
  const order: IssueSeverity[] = ['violation', 'warning', 'note'];
  const issues = [...result.issues].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const ui = VERDICT_UI[result.verdict];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-base">Kết quả kiểm tra</SheetTitle>
          <SheetDescription className="break-words">{name}</SheetDescription>
        </SheetHeader>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            <span className={cn('size-2 rounded-full', ui.dot)} aria-hidden />
            {ui.label}
          </span>
          <ScoreChip result={result} />
        </div>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không phát hiện vấn đề nào.</p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Danh sách vấn đề">
            {issues.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

function IssueRow({ issue }: { issue: SafetyIssue }) {
  const s = SEVERITY_UI[issue.severity];
  return (
    <li className="flex gap-3 rounded-lg border border-border p-3">
      <s.icon className={cn('mt-0.5 size-4 shrink-0', s.className)} aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">
          <span className="sr-only">{s.label}: </span>
          {issue.title}
        </p>
        <p className="text-sm text-muted-foreground">{issue.detail}</p>
        {issue.atSec !== undefined && <p className="text-xs text-muted-foreground">Tại {formatClock(issue.atSec)}</p>}
      </div>
    </li>
  );
}

/** Pill under the name: "1 lưu ý" / "3 vấn đề"; opens the issue sheet. */
function IssuesButton({ name, result }: { name: string; result: ScanResult }) {
  const [open, setOpen] = useState(false);
  const summary = issueSummary(result.issues);
  const hasProblems = result.issues.some((i) => i.severity !== 'note');
  if (!summary) {
    return <span className="inline-flex h-7 items-center text-xs text-muted-foreground">Không có vấn đề</span>;
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          hasProblems ? 'bg-destructive/10 text-foreground hover:bg-destructive/15' : 'bg-muted text-foreground hover:bg-muted/70',
        )}
      >
        {hasProblems ? (
          <AlertTriangle className="size-3.5 text-destructive" aria-hidden />
        ) : (
          <Info className="size-3.5 text-muted-foreground" aria-hidden />
        )}
        {summary}
        <span className="sr-only">— xem chi tiết</span>
      </button>
      <IssuesSheet open={open} onOpenChange={setOpen} name={name} result={result} />
    </>
  );
}

/** Soft red box shown instead of the post button on a violating video. */
export function ViolationBox({ children = 'Vi phạm — không đăng' }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 text-sm font-medium text-foreground">
      <Ban className="size-4 text-destructive" aria-hidden />
      {children}
    </div>
  );
}

interface SafetyVideoCardProps {
  name: string;
  thumbnail: string;
  durationSec: number;
  processing?: boolean;
  result?: ScanResult;
  /** Line under the name (e.g. publish date). */
  meta?: ReactNode;
  footer?: ReactNode;
  onDelete?(): void;
}

/** 9:16-ish video card: verdict pill, score and duration over the thumbnail; issues pill; optional footer. */
export function SafetyVideoCard({ name, thumbnail, durationSec, processing, result, meta, footer, onDelete }: SafetyVideoCardProps) {
  const busy = processing || !result;
  return (
    <Card className="h-full gap-0 overflow-hidden py-0" aria-busy={busy || undefined}>
      <div className="relative aspect-[9/13] overflow-hidden bg-muted">
        {busy ? (
          <>
            <img src={thumbnail} alt="" className="size-full object-cover opacity-40 blur-[2px]" />
            <Skeleton className="absolute inset-0 rounded-none bg-muted/40" />
          </>
        ) : (
          <img src={thumbnail} alt={`Ảnh video ${name}`} loading="lazy" decoding="async" className="size-full object-cover" />
        )}
        <div className="absolute top-2 left-2">
          <VerdictPill verdict={result?.verdict} processing={busy} />
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Xoá video ${name}`}
            className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-background/95 text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
        {result && !busy && (
          <div className="absolute bottom-2 left-2">
            <ScoreChip result={result} />
          </div>
        )}
        <span className="absolute right-2 bottom-2 rounded-md bg-black/65 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
          <span className="sr-only">Thời lượng </span>
          {formatClock(durationSec)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 min-h-10 text-sm font-medium break-words text-foreground" title={name}>
          {name}
        </p>
        {meta && <div className="-mt-1 text-xs text-muted-foreground">{meta}</div>}
        {busy ? (
          <div className="space-y-2" aria-hidden>
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            <div>
              <IssuesButton name={name} result={result!} />
            </div>
            {footer && <div className="mt-auto pt-1">{footer}</div>}
          </>
        )}
      </div>
    </Card>
  );
}

/** Card grid by container width: 1 → 2 → 3 → 4 columns. */
export const VIDEO_GRID = 'grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4';

export function VideoGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={VIDEO_GRID} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="gap-0 overflow-hidden py-0">
          <Skeleton className="aspect-[9/13] rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
