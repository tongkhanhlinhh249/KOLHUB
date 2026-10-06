import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Link, useSearchParams } from 'react-router';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  Download,
  ExternalLink,
  Eye,
  Info,
  Lightbulb,
  Loader2,
  MonitorPlay,
  RotateCcw,
  ScanSearch,
  Search,
  SearchX,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { Switch } from '../../components/ui/switch';
import { cn } from '../../components/ui/utils';
import { useAuth } from '../../auth/AuthContext';
import { APPS_PATH } from '../../auth/roles';
import {
  CATEGORY_LABEL,
  CONTENT_CATEGORIES,
  filterContents,
  formatTimestamp,
  healthLabel,
  kolSafetyReportService,
  REPORT_VERDICT_LABEL,
  reportCsv,
  SEVERITY_LABEL,
  summarizeReport,
  type ChannelReport,
  type ContentCategory,
  type ContentSort,
  type IssueSeverity,
  type KolSafetyChannel,
  type ReportSummary,
  type SafetyVerdict,
  type ScannedContent,
} from '../../services';
import { SAFETY_TOOL_URL } from '../apps/safetyTool';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { formatCompactVi, formatFollowers } from '../biz-search/format';
import { useLiveQuery } from '../shared/useLiveQuery';
import { VERDICT_UI } from './SafetyParts';

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
const day = (t: number) => format(t, 'dd/MM/yyyy');

const SEVERITY_ICON: Record<IssueSeverity, { icon: typeof Info; className: string }> = {
  violation: { icon: XCircle, className: 'text-destructive' },
  warning: { icon: AlertTriangle, className: 'text-chart-5' },
  note: { icon: Info, className: 'text-muted-foreground' },
};

const HEALTH_STROKE: Record<ReturnType<typeof healthLabel>, { stroke: string; pill: string }> = {
  Tốt: { stroke: 'stroke-chart-4', pill: 'bg-chart-4/15' },
  'Cần chú ý': { stroke: 'stroke-chart-5', pill: 'bg-chart-5/20' },
  'Rủi ro': { stroke: 'stroke-destructive', pill: 'bg-destructive/10' },
};

const VERDICTS: SafetyVerdict[] = ['SAFE', 'GRAY', 'VIOLATION'];

const SORT_LABEL: Record<ContentSort, string> = {
  date_desc: 'Mới nhất',
  date_asc: 'Cũ nhất',
  score_asc: 'Điểm thấp nhất',
  score_desc: 'Điểm cao nhất',
};

const channelLabel = (c: KolSafetyChannel) => `@${c.handle}`;

/** /kiem-duyet/kol-safety — "KOL Safety – Tổng hợp kênh": demo summary of a channel's 30 latest scanned contents. */
export function KolSafetyReportPage() {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const isMcn = account?.type === 'MCN';
  const [params, setParams] = useSearchParams();
  const channelsQ = useLiveQuery(() => kolSafetyReportService.listChannels(accountId), [accountId]);
  const channels = channelsQ.data;
  const selectedId = params.get('kenh');
  const channel = channels?.find((c) => c.id === selectedId) ?? channels?.[0];

  const selectChannel = (id: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set('kenh', id);
        return next;
      },
      { replace: true },
    );

  let body: ReactNode;
  if (channelsQ.loading && !channels) {
    body = <PageSkeleton />;
  } else if (channelsQ.error && !channels) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="space-y-2">
          <p>Không tải được danh sách kênh.</p>
          <Button type="button" size="sm" variant="outline" onClick={channelsQ.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (!channels || channels.length === 0 || !channel) {
    body = <NoChannels manageHref={isMcn ? '/ho-so-mcn/kenh' : '/ho-so-kol/kenh'} />;
  } else {
    body = <ChannelReportView key={channel.id} accountId={accountId} channels={channels} channel={channel} onSelect={selectChannel} />;
  }

  return (
    <div className="@container mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={APPS_PATH}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[8px] text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-9"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Ứng dụng
        </Link>
        <a
          href={SAFETY_TOOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[8px] text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-9"
        >
          Mở công cụ đầy đủ
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(mở tab mới)</span>
        </a>
      </div>
      {body}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        Dữ liệu demo, mô phỏng kết quả của công cụ AI Video Analysis.
      </p>
    </div>
  );
}

function NoChannels({ manageHref }: { manageHref: string }) {
  return (
    <Card className="items-center gap-3 px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MonitorPlay className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-foreground">Kết nối kênh để quét</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Thêm kênh TikTok, YouTube hoặc Facebook trong Quản lý kênh, KOL Safety sẽ tổng hợp 30 nội dung gần nhất của kênh.
      </p>
      <Link to={manageHref} className={cn(buttonVariants(), 'h-11 rounded-[8px] md:h-9')}>
        Đi tới Quản lý kênh
      </Link>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải báo cáo">
      <Skeleton className="h-11 w-full max-w-sm rounded-[8px]" />
      <div className="grid gap-3 @3xl:grid-cols-3">
        <Skeleton className="h-36 rounded-[8px]" />
        <Skeleton className="h-36 rounded-[8px]" />
        <Skeleton className="h-36 rounded-[8px]" />
      </div>
      <Skeleton className="h-60 rounded-[8px]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel picker
// ---------------------------------------------------------------------------

function ChannelPicker({
  channels,
  value,
  onChange,
}: {
  channels: KolSafetyChannel[];
  value: string;
  onChange(id: string): void;
}) {
  const groups = useMemo(() => {
    const out: { label?: string; items: KolSafetyChannel[] }[] = [];
    for (const c of channels) {
      const last = out.at(-1);
      if (last && last.label === c.group) last.items.push(c);
      else out.push({ label: c.group, items: [c] });
    }
    return out;
  }, [channels]);
  const item = (c: KolSafetyChannel) => (
    <SelectItem key={c.id} value={c.id}>
      <span className="flex min-w-0 items-center gap-2">
        <PlatformIcon platform={c.platform} />
        <span className="truncate font-medium">{channelLabel(c)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatFollowers(c.followers)} follower</span>
      </span>
    </SelectItem>
  );
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span id="kol-safety-channel" className="text-xs font-medium text-muted-foreground">
        Kênh
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Chọn kênh" className="h-11 w-full min-w-0 rounded-[8px] bg-card @xl:w-80 md:h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groups.map((g, i) =>
            g.label ? (
              <SelectGroup key={`${g.label}-${i}`}>
                <SelectLabel>{g.label}</SelectLabel>
                {g.items.map(item)}
              </SelectGroup>
            ) : (
              g.items.map(item)
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function downloadCsv(report: ChannelReport, channel: KolSafetyChannel) {
  const blob = new Blob([reportCsv(report.items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kol-safety-${channel.handle.replace(/[^\w.-]+/g, '_')}-${format(report.scannedAt, 'yyyyMMdd')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ChannelReportView({
  accountId,
  channels,
  channel,
  onSelect,
}: {
  accountId: string;
  channels: KolSafetyChannel[];
  channel: KolSafetyChannel;
  onSelect(id: string): void;
}) {
  const q = useLiveQuery(() => kolSafetyReportService.getReport(accountId, channel.id), [accountId, channel.id]);
  const report = q.data;
  const summary = useMemo(() => (report ? summarizeReport(report.items) : undefined), [report]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [category, setCategory] = useState<ContentCategory | 'ALL'>('ALL');
  const listRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const rescan = async () => {
    if (scanning) return;
    setScanning(true);
    setProgress(5);
    timer.current = setInterval(() => setProgress((p) => Math.min(90, p + 7)), 120);
    try {
      const r = await kolSafetyReportService.rescan(accountId, channel.id);
      setProgress(100);
      const s = summarizeReport(r.items);
      const newest = r.items[0];
      toast.success('Đã quét xong', {
        description: `Thêm "${newest.title}" (${REPORT_VERDICT_LABEL[newest.verdict]}) · điểm kênh ${s.score}/100`,
      });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setScanning(false);
      setProgress(0);
    }
  };

  const toggleShare = async (shared: boolean) => {
    setSharing(true);
    try {
      await kolSafetyReportService.setShared(accountId, channel.id, shared);
      toast.success(shared ? 'Đã bật chia sẻ báo cáo cho Nhãn hàng (demo)' : 'Đã tắt chia sẻ báo cáo');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setSharing(false);
    }
  };

  const pickCategory = (c: ContentCategory) => {
    setCategory(c);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toolbar = (
    <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:justify-between">
      <ChannelPicker channels={channels} value={channel.id} onChange={onSelect} />
      <div className="grid grid-cols-2 gap-2 @3xl:flex">
        <Button type="button" className="h-11 rounded-[8px] md:h-9" onClick={() => void rescan()} disabled={scanning || !report}>
          {scanning ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <ScanSearch aria-hidden />}
          {scanning ? 'Đang quét…' : 'Quét lại'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-[8px] bg-card md:h-9"
          onClick={() => report && downloadCsv(report, channel)}
          disabled={!report}
        >
          <Download aria-hidden />
          Xuất báo cáo
        </Button>
      </div>
    </div>
  );

  if (q.loading && !report) {
    return (
      <>
        {toolbar}
        <PageSkeleton />
      </>
    );
  }
  if (!report || !summary) {
    return (
      <>
        {toolbar}
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription className="space-y-2">
            <p>{q.error ? errText(q.error) : 'Không tải được báo cáo.'}</p>
            <Button type="button" size="sm" variant="outline" onClick={q.reload}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      {toolbar}
      {scanning && (
        <div className="space-y-1.5 rounded-[8px] border border-primary/30 bg-primary/5 p-3" role="status" aria-live="polite">
          <p className="text-sm font-medium text-foreground">Đang quét nội dung mới của kênh… {progress}%</p>
          <Progress value={progress} aria-label="Tiến độ quét" />
        </div>
      )}
      <div className={cn('space-y-4 transition-opacity', scanning && 'opacity-60')} aria-busy={scanning || undefined}>
        <SummaryRow channel={channel} report={report} summary={summary} sharing={sharing} onShare={(v) => void toggleShare(v)} />
        <div className="grid gap-4 @4xl:grid-cols-2">
          <CategoryCard totals={summary.categoryTotals} onPick={pickCategory} />
          <div className="grid gap-4">
            <TrendCard summary={summary} />
            <RecommendationsCard items={summary.recommendations} />
          </div>
        </div>
        <ContentList sectionRef={listRef} items={report.items} category={category} onCategory={setCategory} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const label = healthLabel(score);
  const ui = HEALTH_STROKE[label];
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0" role="img" aria-label={`Điểm an toàn kênh ${score} trên 100, ${label}`}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            className={cn(ui.stroke, 'transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none')}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="text-2xl font-semibold text-foreground tabular-nums">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm text-muted-foreground">Điểm an toàn kênh</p>
        <span className={cn('inline-flex rounded-full px-2.5 py-1 text-sm font-semibold text-foreground', ui.pill)}>{label}</span>
      </div>
    </div>
  );
}

function SummaryRow({
  channel,
  report,
  summary,
  sharing,
  onShare,
}: {
  channel: KolSafetyChannel;
  report: ChannelReport;
  summary: ReportSummary;
  sharing: boolean;
  onShare(v: boolean): void;
}) {
  const counts: { verdict: SafetyVerdict; n: number }[] = [
    { verdict: 'SAFE', n: summary.counts.safe },
    { verdict: 'GRAY', n: summary.counts.gray },
    { verdict: 'VIOLATION', n: summary.counts.violation },
  ];
  return (
    <div className="grid gap-3 @3xl:grid-cols-[auto_1fr_1fr]">
      <Card className="justify-center gap-3 rounded-[8px] p-4">
        <ScoreRing score={summary.score} />
      </Card>
      <Card className="gap-3 rounded-[8px] p-4">
        <p className="text-sm text-muted-foreground">
          {report.items.length} nội dung gần nhất của{' '}
          <span className="inline-flex items-center gap-1 align-middle font-medium text-foreground">
            <PlatformIcon platform={channel.platform} />
            {channelLabel(channel)}
          </span>
        </p>
        <ul className="grid grid-cols-3 gap-2" aria-label="Số nội dung theo kết luận">
          {counts.map(({ verdict, n }) => (
            <li key={verdict} className="rounded-[8px] border border-border px-2.5 py-2">
              <p className="flex items-start gap-1.5 text-xs leading-tight text-muted-foreground">
                <span className={cn('mt-[3px] size-2 shrink-0 rounded-full', VERDICT_UI[verdict].dot)} aria-hidden />
                <span className="min-w-0">{REPORT_VERDICT_LABEL[verdict]}</span>
              </p>
              <p className="text-xl font-semibold text-foreground tabular-nums">{n}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="gap-2 rounded-[8px] p-4 text-sm">
        <p className="flex items-start gap-2 text-muted-foreground">
          <CalendarRange className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Nội dung đăng từ{' '}
            <span className="font-medium text-foreground">
              {summary.from ? day(summary.from) : '—'} đến {summary.to ? day(summary.to) : '—'}
            </span>
          </span>
        </p>
        <p className="flex items-start gap-2 text-muted-foreground">
          <ScanSearch className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Lần quét #{report.scanNo} · {format(report.scannedAt, 'HH:mm dd/MM/yyyy')}
          </span>
        </p>
        <label className="mt-auto flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-border pt-2">
          <span className="min-w-0">
            <span className="block font-medium text-foreground">Chia sẻ cho Nhãn hàng</span>
            <span className="block text-xs text-muted-foreground">
              {report.shared && report.sharedAt ? `Đã bật lúc ${format(report.sharedAt, 'HH:mm dd/MM')} (demo)` : 'Chỉ ghi nhận lựa chọn (demo)'}
            </span>
          </span>
          <Switch aria-label="Chia sẻ cho Nhãn hàng" checked={report.shared} disabled={sharing} onCheckedChange={onShare} />
        </label>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakdown
// ---------------------------------------------------------------------------

function CategoryCard({ totals, onPick }: { totals: Record<ContentCategory, number>; onPick(c: ContentCategory): void }) {
  const rows = [...CONTENT_CATEGORIES].sort((a, b) => totals[b] - totals[a]);
  const max = Math.max(1, ...rows.map((c) => totals[c]));
  const total = rows.reduce((s, c) => s + totals[c], 0);
  return (
    <Card className="gap-3 rounded-[8px] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Vấn đề theo danh mục</h2>
        <span className="text-xs text-muted-foreground">{total} phát hiện</span>
      </div>
      <ul className="space-y-1" aria-label="Số phát hiện theo danh mục">
        {rows.map((c) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => onPick(c)}
              disabled={totals[c] === 0}
              className="group grid w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-x-3 gap-y-1 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent @md:grid-cols-[13.5rem_minmax(0,1fr)_2rem]"
            >
              <span className={cn('truncate text-sm', totals[c] ? 'text-foreground' : 'text-muted-foreground')}>{CATEGORY_LABEL[c]}</span>
              <span className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-muted @md:col-span-1 @md:row-start-1 @md:col-start-2">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(totals[c] / max) * 100}%` }} />
              </span>
              <span className="text-right text-sm font-semibold text-foreground tabular-nums @md:col-start-3">{totals[c]}</span>
              {totals[c] > 0 && <span className="sr-only">— lọc danh sách theo danh mục này</span>}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const DOT_FILL: Record<SafetyVerdict, string> = {
  SAFE: 'fill-chart-4',
  GRAY: 'fill-chart-5',
  VIOLATION: 'fill-destructive',
};

function TrendCard({ summary }: { summary: ReportSummary }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = summary.trend;
  const W = 320;
  const H = 120;
  const pad = { l: 24, r: 8, t: 8, b: 8 };
  const x = (i: number) => pad.l + (pts.length > 1 ? (i / (pts.length - 1)) * (W - pad.l - pad.r) : 0);
  const y = (s: number) => pad.t + (1 - s / 100) * (H - pad.t - pad.b);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const h = hover !== null ? pts[hover] : null;
  return (
    <Card className="gap-2 rounded-[8px] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Điểm theo thời gian</h2>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {h ? `${day(h.publishedAt)} · ${h.score}đ` : `${pts.length} nội dung, cũ → mới`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-32 w-full"
        role="img"
        aria-label={`Điểm an toàn của ${pts.length} nội dung theo thời gian, từ ${pts[0]?.score ?? 0} đến ${pts.at(-1)?.score ?? 0}`}
        onMouseLeave={() => setHover(null)}
      >
        {[100, 80, 50, 0].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth="1" strokeDasharray={v === 80 || v === 50 ? '3 3' : undefined} />
            <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
              {v}
            </text>
          </g>
        ))}
        <path d={path} fill="none" className="stroke-foreground/60" strokeWidth="2" strokeLinejoin="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="stroke-muted-foreground" strokeWidth="1" />}
        {pts.map((p, i) => {
          const v = p.score >= 80 ? 'SAFE' : p.score >= 50 ? 'GRAY' : 'VIOLATION';
          return (
            <g key={p.id}>
              <circle cx={x(i)} cy={y(p.score)} r={hover === i ? 5 : 3.5} className={cn(DOT_FILL[v], 'stroke-card')} strokeWidth="1.5" />
              <rect
                x={x(i) - 5}
                y={0}
                width={10}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                aria-hidden
              />
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Chú thích">
        {VERDICTS.map((v) => (
          <li key={v} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', VERDICT_UI[v].dot)} aria-hidden />
            {REPORT_VERDICT_LABEL[v]}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecommendationsCard({ items }: { items: string[] }) {
  return (
    <Card className="gap-3 rounded-[8px] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Lightbulb className="size-4 text-primary" aria-hidden />
        Khuyến nghị
      </h2>
      <ol className="space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-foreground">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Content list
// ---------------------------------------------------------------------------

function VerdictBadge({ verdict, score }: { verdict: SafetyVerdict; score: number }) {
  const ui = VERDICT_UI[verdict];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
        <span className={cn('size-2 rounded-full', ui.dot)} aria-hidden />
        {REPORT_VERDICT_LABEL[verdict]}
      </span>
      <span className={cn('rounded-[6px] px-1.5 py-0.5 text-xs font-semibold tabular-nums', ui.chip)} aria-label={`Điểm ${score} trên 100`}>
        {score}đ
      </span>
    </span>
  );
}

function ContentList({
  sectionRef,
  items,
  category,
  onCategory,
}: {
  sectionRef: Ref<HTMLElement>;
  items: ScannedContent[];
  category: ContentCategory | 'ALL';
  onCategory(c: ContentCategory | 'ALL'): void;
}) {
  const [verdict, setVerdict] = useState<SafetyVerdict | 'ALL'>('ALL');
  const [sort, setSort] = useState<ContentSort>('date_desc');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = useMemo(() => filterContents(items, { verdict, category, sort, query }), [items, verdict, category, sort, query]);
  const open = items.find((i) => i.id === openId) ?? null;
  const filtered = verdict !== 'ALL' || category !== 'ALL' || query.trim() !== '';

  return (
    <section ref={sectionRef} aria-labelledby="kol-safety-list" className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kol-safety-list" className="text-base font-semibold text-foreground">
          Nội dung đã quét
        </h2>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          Hiển thị {shown.length}/{items.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-[minmax(0,1fr)_10rem_13rem_10rem]">
        <div className="relative col-span-2 @3xl:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc lý do"
            aria-label="Tìm nội dung"
            className="h-11 rounded-[8px] bg-card pl-9 md:h-10"
          />
        </div>
        <Select value={verdict} onValueChange={(v) => setVerdict(v as SafetyVerdict | 'ALL')}>
          <SelectTrigger aria-label="Lọc theo kết luận" className="h-11 w-full min-w-0 rounded-[8px] bg-card md:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Mọi kết luận</SelectItem>
            {VERDICTS.map((v) => (
              <SelectItem key={v} value={v}>
                {REPORT_VERDICT_LABEL[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => onCategory(v as ContentCategory | 'ALL')}>
          <SelectTrigger aria-label="Lọc theo danh mục" className="h-11 w-full min-w-0 rounded-[8px] bg-card md:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Mọi danh mục</SelectItem>
            {CONTENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as ContentSort)}>
          <SelectTrigger aria-label="Sắp xếp" className="col-span-2 h-11 w-full min-w-0 rounded-[8px] bg-card @3xl:col-span-1 md:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as ContentSort[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[8px] border border-dashed border-border bg-card px-4 py-10 text-center">
          <SearchX className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">Không có nội dung phù hợp</p>
          {filtered && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[8px]"
              onClick={() => {
                setVerdict('ALL');
                onCategory('ALL');
                setQuery('');
              }}
            >
              Xoá bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Danh sách nội dung">
          {shown.map((it) => (
            <li key={it.id}>
              <ContentRow item={it} onOpen={() => setOpenId(it.id)} />
            </li>
          ))}
        </ul>
      )}
      <ContentSheet item={open} onClose={() => setOpenId(null)} />
    </section>
  );
}

function ContentRow({ item, onOpen }: { item: ScannedContent; onOpen(): void }) {
  const shownFindings = item.findings.slice(0, 2);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="flex w-full gap-3 rounded-[8px] border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="relative h-fit w-24 shrink-0 overflow-hidden rounded-[6px] bg-muted @xl:w-32">
        <img src={item.thumbnail} alt="" loading="lazy" decoding="async" className="aspect-video size-full object-cover" />
        <span className="absolute right-1 bottom-1 rounded-[4px] bg-black/65 px-1 text-[10px] font-medium text-white tabular-nums">
          {formatTimestamp(item.durationSec)}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-col gap-1.5 @2xl:flex-row @2xl:items-start @2xl:justify-between">
          <span className="min-w-0">
            <span className="line-clamp-2 text-sm font-medium break-words text-foreground">{item.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{day(item.publishedAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3" aria-hidden />
                {formatCompactVi(item.views)} lượt xem
              </span>
            </span>
          </span>
          <VerdictBadge verdict={item.verdict} score={item.score} />
        </span>
        {shownFindings.length > 0 ? (
          <span className="flex flex-col gap-1">
            {shownFindings.map((f, i) => {
              const s = SEVERITY_ICON[f.severity];
              return (
                <span key={i} className="flex min-w-0 items-start gap-1.5 text-xs">
                  <s.icon className={cn('mt-px size-3.5 shrink-0', s.className)} aria-hidden />
                  <span className="min-w-0 text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">{formatTimestamp(f.atSec)}</span> ·{' '}
                    <span className="font-medium text-foreground">{CATEGORY_LABEL[f.category]}</span> — {f.reason}
                  </span>
                </span>
              );
            })}
            {item.findings.length > shownFindings.length && (
              <span className="text-xs text-muted-foreground">+{item.findings.length - shownFindings.length} phát hiện khác</span>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Không phát hiện vấn đề</span>
        )}
      </span>
    </button>
  );
}

function ContentSheet({ item, onClose }: { item: ScannedContent | null; onClose(): void }) {
  // Keep the last item while the sheet animates closed.
  const last = useRef<ScannedContent | null>(null);
  if (item) last.current = item;
  const it = item ?? last.current;
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        {it && (
          <>
            <SheetHeader className="pr-8 text-left">
              <SheetTitle className="text-base break-words">{it.title}</SheetTitle>
              <SheetDescription>
                Đăng {day(it.publishedAt)} · {formatCompactVi(it.views)} lượt xem · {formatTimestamp(it.durationSec)}
              </SheetDescription>
            </SheetHeader>
            <img src={it.thumbnail} alt={`Ảnh nội dung ${it.title}`} className="aspect-video w-full rounded-[8px] bg-muted object-cover" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <VerdictBadge verdict={it.verdict} score={it.score} />
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-9"
              >
                Xem bài đăng
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(mở tab mới)</span>
              </a>
            </div>
            <h3 className="text-sm font-semibold text-foreground">Phát hiện ({it.findings.length})</h3>
            {it.findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không phát hiện vấn đề nào trong nội dung này.</p>
            ) : (
              <ol className="flex flex-col gap-3" aria-label="Danh sách phát hiện">
                {it.findings.map((f, i) => {
                  const s = SEVERITY_ICON[f.severity];
                  return (
                    <li key={i} className="space-y-2 rounded-[8px] border border-border p-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="rounded-[4px] bg-muted px-1.5 py-0.5 font-semibold text-foreground tabular-nums">
                          {formatTimestamp(f.atSec)}
                        </span>
                        <span className="font-medium text-foreground">{CATEGORY_LABEL[f.category]}</span>
                        <span className={cn('inline-flex items-center gap-1 font-medium', s.className)}>
                          <s.icon className="size-3.5" aria-hidden />
                          {SEVERITY_LABEL[f.severity]}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{f.reason}</p>
                      <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground italic">{f.excerpt}</blockquote>
                      <p className="flex gap-1.5 text-sm text-foreground">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span>{f.recommendation}</span>
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
