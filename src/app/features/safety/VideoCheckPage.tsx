import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Check, CheckCircle2, FileVideo, Loader2, RotateCcw, Send, Upload } from 'lucide-react';
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
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router';
import { APPS_PATH } from '../../auth/roles';
import { kolSafetyReportService, MAX_VIDEO_SEC, safetyService, validateVideo, type SafetyVideo } from '../../services';
import { useLiveQuery } from '../shared/useLiveQuery';
import { SafetyVideoCard, VERDICT_UI, VIDEO_GRID, VideoGridSkeleton, ViolationBox } from './SafetyParts';
import { readVideoFile } from './videoFile';

/** Time the mock "scan" takes before its result is shown. */
const SCAN_MS = 2000;

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

/** /kiem-duyet/video — upload a video, get a mock compliance verdict, then post it (SAFE/GRAY only). */
/**
 * "Quét trước khi đăng": KOL/MCN need KOL Safety switched on and the "Bảo vệ" plan (checks a draft before posting
 * so a new post does not suspend the channel's Khiên An toàn). Other accounts reach the tool as before.
 */
export function VideoCheckPage() {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const creator = account?.type === 'KOL' || account?.type === 'MCN';
  const settings = useLiveQuery(() => (creator ? kolSafetyReportService.getSettings(accountId) : Promise.resolve(null)), [creator, accountId]);
  if (creator && !settings.data) return <VideoGridSkeleton />;
  const s = settings.data;
  if (s && (!s.enabled || !s.plan.prePublishScan)) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Alert>
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription className="space-y-2">
            <p>
              {!s.enabled
                ? 'KOL Safety đang tắt. Bật trong mục Ứng dụng để quét nội dung.'
                : 'Quét trước khi đăng có trong gói Bảo vệ của KOL Safety: kiểm tra bản nháp trước khi đăng để không mất Khiên An toàn.'}
            </p>
            <Link to={APPS_PATH} className="text-sm font-medium text-primary hover:underline">
              {!s.enabled ? 'Mở Ứng dụng' : 'Xem gói Bảo vệ'}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return <VideoCheckContent accountId={accountId} />;
}

function VideoCheckContent({ accountId }: { accountId: string }) {
  const q = useLiveQuery(
    async () => {
      const [videos, stats] = await Promise.all([safetyService.listVideos(accountId), safetyService.stats(accountId)]);
      return { videos, stats };
    },
    [accountId],
  );
  const videos = q.data?.videos;
  const [toDelete, setToDelete] = useState<SafetyVideo | null>(null);

  // Finish every PROCESSING video ~2 s after upload (also after a reload mid-scan).
  const scheduled = useRef(new Set<string>());
  useEffect(() => {
    for (const v of videos ?? []) {
      if (v.status !== 'PROCESSING' || scheduled.current.has(v.id)) continue;
      scheduled.current.add(v.id);
      const wait = Math.max(0, v.uploadedAt + SCAN_MS - Date.now());
      setTimeout(() => {
        safetyService.runScan(v.id).then(
          (done) => {
            const verdict = done.result?.verdict;
            if (verdict) toast.message(`Đã kiểm tra xong “${done.fileName}”`, { description: `Kết quả: ${VERDICT_UI[verdict].label}` });
          },
          () => scheduled.current.delete(v.id),
        );
      }, wait);
    }
  }, [videos]);

  const deleteVideo = async (v: SafetyVideo) => {
    try {
      await safetyService.deleteVideo(v.id);
      toast.success('Đã xoá video');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  let body: ReactNode;
  if (q.loading && !q.data) {
    body = <VideoGridSkeleton />;
  } else if (q.error && !q.data) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="space-y-2">
          <p>Không tải được danh sách video.</p>
          <Button type="button" size="sm" variant="outline" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (!videos || videos.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileVideo className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Chưa có video nào</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tải video lên ở trên để kiểm tra vi phạm trước khi đăng. Kết quả có sau vài giây.
        </p>
      </div>
    );
  } else {
    body = (
      <ul className={VIDEO_GRID} aria-label="Video của bạn">
        {videos.map((v) => (
          <li key={v.id}>
            <SafetyVideoCard
              name={v.fileName}
              thumbnail={v.thumbnail}
              durationSec={v.durationSec}
              processing={v.status === 'PROCESSING'}
              result={v.result}
              onDelete={v.status === 'DONE' ? () => setToDelete(v) : undefined}
              footer={<VideoFooter video={v} />}
            />
          </li>
        ))}
      </ul>
    );
  }

  const stats = q.data?.stats;
  return (
    <div className="@container mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <div className="grid grid-cols-3 gap-2 @md:gap-4" aria-label="Thống kê kiểm tra video" role="group">
        <StatCard label="Đã kiểm tra" value={stats?.checked} icon={<CheckCircle2 className="size-4 text-chart-4" aria-hidden />} />
        <StatCard
          label="Cần xử lý"
          value={stats?.needsAction}
          valueClass="text-destructive"
          icon={<AlertTriangle className="size-4 text-destructive" aria-hidden />}
        />
        <StatCard
          label="Đang xử lý"
          value={stats?.processing}
          icon={
            <Loader2
              className={cn('size-4 text-primary', stats?.processing ? 'animate-spin motion-reduce:animate-none' : '')}
              aria-hidden
            />
          }
        />
      </div>

      <UploadZone accountId={accountId} />

      <section className="space-y-3" aria-labelledby="safety-videos-title">
        <h2 id="safety-videos-title" className="text-base font-semibold text-foreground">
          Video của bạn{videos ? ` (${videos.length})` : ''}
        </h2>
        {body}
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá video “{toDelete?.fileName}”?</AlertDialogTitle>
            <AlertDialogDescription>Kết quả kiểm tra của video này cũng bị xoá.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => toDelete && void deleteVideo(toDelete)}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, icon, valueClass }: { label: string; value?: number; icon: ReactNode; valueClass?: string }) {
  return (
    <Card className="gap-1 px-3 py-3 @md:px-5 @md:py-4">
      <div className="flex items-center gap-1.5">
        <span className="hidden @md:inline-flex">{icon}</span>
        <p className="truncate text-xs text-muted-foreground @md:text-sm">{label}</p>
      </div>
      {value === undefined ? (
        <Skeleton className="h-8 w-10" />
      ) : (
        <p className={cn('text-2xl font-semibold tabular-nums text-foreground @md:text-3xl', valueClass)}>{value}</p>
      )}
    </Card>
  );
}

/** VIOLATION → red box; SAFE/GRAY → "Đăng ngay" (becomes "Đã đăng"). */
function VideoFooter({ video }: { video: SafetyVideo }) {
  const [busy, setBusy] = useState(false);
  if (!video.result) return null;
  if (video.result.verdict === 'VIOLATION') return <ViolationBox />;
  if (video.publishedAt) {
    return (
      <Button type="button" variant="secondary" className="h-11 w-full md:h-9" disabled>
        <Check aria-hidden />
        Đã đăng
      </Button>
    );
  }
  const publish = async () => {
    setBusy(true);
    try {
      await safetyService.markPublished(video.id);
      toast.success('Đã đăng video', { description: video.fileName });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" className="h-11 w-full md:h-9" onClick={() => void publish()} disabled={busy}>
      {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />}
      Đăng ngay
    </Button>
  );
}

/** ~2 Mbps estimate when the browser cannot read the duration (codec not supported). */
function estimateDuration(sizeBytes: number): number {
  return Math.min(MAX_VIDEO_SEC, Math.max(5, Math.round(sizeBytes / 250_000)));
}

function UploadZone({ accountId }: { accountId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File | undefined) => {
    if (!file || busy) return;
    setError(null);
    try {
      // Type/size first, so a wrong file is rejected before it is decoded.
      validateVideo({ fileName: file.name, sizeBytes: file.size, durationSec: 0 });
    } catch (e) {
      setError(errText(e));
      return;
    }
    setBusy(true);
    try {
      const info = await readVideoFile(file);
      const durationSec = info.durationSec ?? estimateDuration(file.size);
      await safetyService.uploadVideo(accountId, {
        fileName: file.name,
        sizeBytes: file.size,
        durationSec,
        thumbnail: info.thumbnail,
      });
      toast.success('Đã tải video lên', { description: 'Đang kiểm tra, kết quả có sau vài giây.' });
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handle(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors @md:py-8',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
          error && !dragging && 'border-destructive/50',
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            <span className="hidden @md:inline">Kéo thả video vào đây hoặc bấm nút bên dưới</span>
            <span className="@md:hidden">Chọn video từ máy của bạn</span>
          </p>
          <p id="safety-upload-hint" className="text-xs text-muted-foreground">
            MP4, MOV hoặc WebM · tối đa 500 MB · tối đa 10 phút
          </p>
        </div>
        <Button type="button" className="h-11 md:h-9" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Upload aria-hidden />}
          {busy ? 'Đang tải lên…' : 'Tải video lên để kiểm tra'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Chọn video để kiểm tra"
          aria-describedby="safety-upload-hint"
          placeholder="Chọn video MP4, MOV hoặc WebM"
          onChange={(e) => void handle(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
