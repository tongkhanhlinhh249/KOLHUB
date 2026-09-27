import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, ScanSearch, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { useAuth } from '../../auth/AuthContext';
import {
  isMonitorPlatform,
  MONITOR_PLATFORM_LABEL,
  safetyService,
  type ChannelHealth,
  type MonitorPlatform,
} from '../../services';
import { formatDate } from '../biz-search/format';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ExternalChannelLink, lastScanText, MonitorAvatar, monitorPath, monitorStatsLine, VerifiedChannelBadge } from './MonitorParts';
import { SafetyVideoCard, VERDICT_UI, VIDEO_GRID, VideoGridSkeleton, ViolationBox } from './SafetyParts';

const HEALTH_UI: Record<ChannelHealth['label'], { stroke: string; pill: string }> = {
  Tốt: { stroke: 'stroke-chart-4', pill: 'bg-chart-4/15' },
  'Cần chú ý': { stroke: 'stroke-chart-5', pill: 'bg-chart-5/20' },
  'Rủi ro': { stroke: 'stroke-destructive', pill: 'bg-destructive/10' },
};

/** /kiem-duyet/:platform/:monitorId — channel health and scanned videos. */
export function ChannelMonitorDetail() {
  const { platform, monitorId = '' } = useParams();
  if (!isMonitorPlatform(platform)) return <Navigate to="/kiem-duyet/video" replace />;
  return <Detail key={monitorId} platform={platform} monitorId={monitorId} />;
}

function BackLink({ platform }: { platform: MonitorPlatform }) {
  return (
    <Link
      to={monitorPath(platform)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Kiểm duyệt kênh {MONITOR_PLATFORM_LABEL[platform]}
    </Link>
  );
}

function Detail({ platform, monitorId }: { platform: MonitorPlatform; monitorId: string }) {
  const { account } = useAuth();
  const q = useLiveQuery(() => safetyService.getMonitor(monitorId), [monitorId]);
  const [scanning, setScanning] = useState(false);
  const m = q.data;
  const owned = !!m && m.accountId === account?.id && m.platform === platform;

  const scan = async () => {
    if (!m || scanning) return;
    setScanning(true);
    try {
      const r = await safetyService.scan(m.id);
      toast.success('Đã quét xong', { description: `${r.scannedVideos.length} video · sức khoẻ ${r.health?.score ?? 0}/100` });
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setScanning(false);
    }
  };

  if (q.loading && !m) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Đang tải kênh">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    );
  }

  if (!m || !owned) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <BackLink platform={platform} />
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-6" aria-hidden />
          </div>
          <p className="font-semibold text-foreground">Không tìm thấy kênh</p>
          <p className="text-sm text-muted-foreground">Kênh có thể đã bị xoá khỏi danh sách kiểm duyệt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <BackLink platform={platform} />

      <Card className="gap-0 p-4 @xl:p-5">
        <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 @xl:gap-4">
            <MonitorAvatar monitor={m} className="size-14 @xl:size-16" />
            <div className="min-w-0 space-y-0.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
                <h2 className="min-w-0 truncate text-lg font-semibold text-foreground">{m.displayName}</h2>
                <ExternalChannelLink monitor={m} />
                {m.verified && <VerifiedChannelBadge />}
              </div>
              <p className="truncate text-sm text-muted-foreground">@{m.handle}</p>
              <p className="text-xs text-muted-foreground">{monitorStatsLine(m)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3 @2xl:shrink-0 @2xl:border-t-0 @2xl:pt-0">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {scanning ? 'Đang quét…' : lastScanText(m.lastScanAt)}
            </p>
            <Button type="button" className="h-11 md:h-9" onClick={() => void scan()} disabled={scanning}>
              {scanning ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <ScanSearch aria-hidden />}
              {scanning ? 'Đang quét…' : 'Quét ngay'}
            </Button>
          </div>
        </div>
      </Card>

      {m.health ? (
        <HealthCard health={m.health} dimmed={scanning} />
      ) : (
        !scanning && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ScanSearch className="size-6" aria-hidden />
            </div>
            <p className="font-semibold text-foreground">Kênh chưa được quét</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Bấm “Quét ngay” để kiểm tra các video gần đây và xem điểm sức khoẻ của kênh.
            </p>
            <Button type="button" className="h-11 md:h-9" onClick={() => void scan()}>
              <ScanSearch aria-hidden />
              Quét ngay
            </Button>
          </div>
        )
      )}

      {(scanning || m.scannedVideos.length > 0) && (
        <section className="space-y-3" aria-labelledby="scanned-title">
          <h3 id="scanned-title" className="text-base font-semibold text-foreground">
            Video đã quét{!scanning ? ` (${m.scannedVideos.length})` : ''}
          </h3>
          {scanning ? (
            <VideoGridSkeleton count={4} />
          ) : (
            <ul className={VIDEO_GRID} aria-label="Video đã quét">
              {m.scannedVideos.map((v) => (
                <li key={v.id}>
                  <SafetyVideoCard
                    name={v.title}
                    thumbnail={v.thumbnail}
                    durationSec={v.durationSec}
                    result={v}
                    meta={`Đăng ${formatDate(new Date(v.publishedAt).toISOString())}`}
                    footer={v.verdict === 'VIOLATION' ? <ViolationBox>Vi phạm — nên gỡ hoặc sửa</ViolationBox> : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function HealthCard({ health, dimmed }: { health: ChannelHealth; dimmed?: boolean }) {
  const ui = HEALTH_UI[health.label];
  const r = 42;
  const c = 2 * Math.PI * r;
  const counts: { key: keyof ChannelHealth['counts']; verdict: 'VIOLATION' | 'GRAY' | 'SAFE' }[] = [
    { key: 'violation', verdict: 'VIOLATION' },
    { key: 'gray', verdict: 'GRAY' },
    { key: 'safe', verdict: 'SAFE' },
  ];
  return (
    <Card className={cn('gap-0 p-4 transition-opacity @xl:p-5', dimmed && 'opacity-50')} aria-busy={dimmed || undefined}>
      <div className="flex flex-col items-center gap-5 @xl:flex-row @xl:gap-8">
        <div className="flex items-center gap-4">
          <div className="relative size-28 shrink-0" role="img" aria-label={`Sức khoẻ kênh ${health.score} trên 100, ${health.label}`}>
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
                strokeDashoffset={c * (1 - health.score / 100)}
                className={cn(ui.stroke, 'transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none')}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{health.score}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Sức khoẻ kênh</p>
            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-sm font-semibold text-foreground', ui.pill)}>
              {health.label}
            </span>
          </div>
        </div>
        <ul className="grid w-full grid-cols-3 gap-2 @xl:flex-1" aria-label="Số video theo kết luận">
          {counts.map(({ key, verdict }) => {
            const v = VERDICT_UI[verdict];
            return (
              <li key={key} className="rounded-lg border border-border px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn('size-2 shrink-0 rounded-full', v.dot)} aria-hidden />
                  {v.label}
                </p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{health.counts[key]}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
