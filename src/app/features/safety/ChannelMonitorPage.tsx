import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { AlertCircle, ChevronRight, Link2, Loader2, RotateCcw, Trash2, Tv } from 'lucide-react';
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
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../auth/AuthContext';
import {
  isMonitorPlatform,
  MONITOR_PLATFORM_LABEL,
  safetyService,
  type MonitorPlatform,
  type MonitorView,
} from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ExternalChannelLink, lastScanText, MonitorAvatar, monitorPath, monitorStatsLine, VerifiedChannelBadge } from './MonitorParts';

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

/** /kiem-duyet/:platform — connect channels of one platform and open them to scan. */
export function ChannelMonitorPage() {
  const { platform } = useParams();
  if (!isMonitorPlatform(platform)) return <Navigate to="/kiem-duyet/video" replace />;
  // Keyed so the form and list reset when switching platform.
  return <MonitorList key={platform} platform={platform} />;
}

function MonitorList({ platform }: { platform: MonitorPlatform }) {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const label = MONITOR_PLATFORM_LABEL[platform];
  const q = useLiveQuery(() => safetyService.listMonitors(accountId, platform), [accountId, platform]);
  const monitors = q.data;

  let body: ReactNode;
  if (q.loading && !monitors) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải kênh">
        {[0, 1, 2].map((i) => (
          <MonitorRowSkeleton key={i} />
        ))}
      </div>
    );
  } else if (q.error && !monitors) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="space-y-2">
          <p>Không tải được danh sách kênh.</p>
          <Button type="button" size="sm" variant="outline" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (!monitors || monitors.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Tv className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Chưa kết nối kênh {label} nào</p>
        <p className="max-w-sm text-sm text-muted-foreground">Nhập @username hoặc link kênh ở trên để bắt đầu kiểm duyệt.</p>
      </div>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3" aria-label={`Kênh ${label} đã kết nối`}>
        {monitors.map((m) => (
          <li key={m.id}>
            <MonitorRow monitor={m} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex items-start gap-3">
        <PlatformIcon platform={platform} className="mt-0.5 size-8 rounded-lg" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Kiểm duyệt kênh {label}</h2>
          <p className="text-sm text-muted-foreground">Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.</p>
        </div>
      </div>

      <ConnectForm accountId={accountId} platform={platform} />

      <section className="space-y-3" aria-labelledby="monitor-list-title">
        <h3 id="monitor-list-title" className="text-base font-semibold text-foreground">
          Kênh đã kết nối{monitors ? ` (${monitors.length})` : ''}
        </h3>
        {body}
      </section>
    </div>
  );
}

function ConnectForm({ accountId, platform }: { accountId: string; platform: MonitorPlatform }) {
  const label = MONITOR_PLATFORM_LABEL[platform];
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const m = await safetyService.connect(accountId, platform, value);
      setValue('');
      toast.success(`Đã kết nối kênh @${m.handle}`, { description: 'Bấm vào kênh để bắt đầu quét.' });
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-3 p-4 @xl:p-5">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2 @xl:flex-row @xl:items-start" noValidate>
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="monitor-input" className="sr-only">
            @username hoặc link kênh {label}
          </label>
          <Input
            id="monitor-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder={`@username hoặc link kênh ${label} (vd: tenkenh)`}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'monitor-input-error' : undefined}
            className="h-11 md:h-9"
          />
          {error && (
            <p id="monitor-input-error" role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </div>
        <Button type="submit" className="h-11 md:h-9" disabled={busy}>
          {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Link2 aria-hidden />}
          Kết nối kênh
        </Button>
      </form>
    </Card>
  );
}

function MonitorRow({ monitor }: { monitor: MonitorView }) {
  const [confirm, setConfirm] = useState(false);
  const to = monitorPath(monitor.platform, monitor.id);

  const remove = async () => {
    try {
      await safetyService.remove(monitor.id);
      toast.success(`Đã xoá kênh @${monitor.handle}`);
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <Card className="gap-0 p-4 @xl:p-5">
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link to={to} tabIndex={-1} aria-hidden className="shrink-0">
            <MonitorAvatar monitor={monitor} className="@xl:size-14" />
          </Link>
          <div className="min-w-0 space-y-0.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
              <Link
                to={to}
                className="min-w-0 truncate rounded-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {monitor.displayName}
              </Link>
              <ExternalChannelLink monitor={monitor} />
              {monitor.verified && <VerifiedChannelBadge />}
            </div>
            <p className="truncate text-sm text-muted-foreground">@{monitor.handle}</p>
            <p className="text-xs text-muted-foreground">{monitorStatsLine(monitor)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 @2xl:shrink-0 @2xl:justify-end @2xl:border-t-0 @2xl:pt-0">
          <p className="text-sm text-muted-foreground">{lastScanText(monitor.lastScanAt)}</p>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" className="h-11 px-3 text-primary md:h-9">
              <Link to={to} aria-label={`Xem kênh @${monitor.handle}`}>
                Xem kênh
                <ChevronRight aria-hidden />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground hover:text-destructive md:size-9"
              aria-label={`Xoá kênh @${monitor.handle}`}
              onClick={() => setConfirm(true)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá kênh @{monitor.handle}?</AlertDialogTitle>
            <AlertDialogDescription>
              Kênh sẽ không còn được kiểm duyệt và kết quả quét sẽ bị xoá. Bạn có thể kết nối lại sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => void remove()}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function MonitorRowSkeleton() {
  return (
    <Card className="gap-0 p-4 @xl:p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full @xl:size-14" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </Card>
  );
}
