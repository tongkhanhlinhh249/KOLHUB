import { useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Camera, Check, Clock, Info, Loader2, Lock, ScanFace, ShieldAlert, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useIsMobile } from '../../components/ui/use-mobile';
import { cn } from '../../components/ui/utils';
import { useAuth } from '../../auth/AuthContext';
import {
  ekycService,
  errorMessage,
  KolhubError,
  type EkycView,
  type ErrorCode,
  type IdentityView,
  type OcrData,
  type ProfileView,
  type StoredFile,
} from '../../services';
import { SubmitCallout } from '../profile/SubmitCallout';
import { toStoredFile } from '../shared/files';
import { EKYC_TIPS } from './ekycCopy';

const STEPS = ['Chụp ảnh CCCD', 'Quay video', 'Hoàn tất'];

interface StepError {
  code: ErrorCode;
  message: string;
  attemptsLeft?: number;
}

function toStepError(e: unknown): StepError | null {
  if (e instanceof KolhubError) return { code: e.code, message: e.message, attemptsLeft: e.meta?.attemptsLeft };
  return null;
}

function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Các bước xác thực">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                done && 'border-transparent bg-chart-4 text-white',
                active && 'border-primary bg-primary text-primary-foreground',
                !done && !active && 'border-border text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : n}
            </span>
            <span className={cn('truncate text-xs md:text-sm', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function IdentityCard({ identity }: { identity: IdentityView | OcrData }) {
  const rows: [string, string][] = [
    ['Họ tên', identity.fullName],
    ['Ngày sinh', identity.dob],
    ['Số CCCD', identity.idNoMasked],
    ['Ngày cấp', identity.issueDate],
  ];
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground">Thông tin từ CCCD</p>
      <dl className="grid grid-cols-2 gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-sm break-words text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Thông tin định danh đã khoá, chỉ thay đổi bằng xác thực lại.
      </p>
    </div>
  );
}

function ErrorAlert({ error, children }: { error: StepError; children?: ReactNode }) {
  const tips = EKYC_TIPS[error.code];
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>Xác thực chưa thành công</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{error.message}</p>
        {tips && (
          <ul className="list-disc space-y-0.5 pl-4 text-foreground">
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        {children}
      </AlertDescription>
    </Alert>
  );
}

/** Hidden file input behind a large button (capture opens the camera on phones). */
function CaptureButton({
  label,
  accept,
  capture,
  icon,
  onFile,
  disabled,
  preview,
}: {
  label: string;
  accept: string;
  capture: 'environment' | 'user';
  icon: ReactNode;
  onFile(f: File): void;
  disabled?: boolean;
  preview?: StoredFile;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <input
        ref={ref}
        type="file"
        accept={accept}
        capture={capture}
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="flex aspect-[1.6] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 p-2 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {preview?.thumbnail ? (
          <img src={preview.thumbnail} alt={label} className="size-full rounded object-cover" />
        ) : (
          <>
            {icon}
            <span className="font-medium text-foreground">{label}</span>
            {preview && <span className="break-all text-xs">{preview.name}</span>}
          </>
        )}
      </button>
    </div>
  );
}

function IdCardStep({ accountId, onError }: { accountId: string; onError(e: StepError | null): void }) {
  const [front, setFront] = useState<StoredFile>();
  const [back, setBack] = useState<StoredFile>();
  const [busy, setBusy] = useState(false);

  const read = (set: (f: StoredFile) => void) => async (f: File) => set(await toStoredFile(f));

  const submit = async () => {
    if (!front || !back) return;
    setBusy(true);
    onError(null);
    try {
      await ekycService.submitIdCard(accountId, { front, back });
      toast.success('Đã đọc thông tin CCCD');
    } catch (e) {
      const err = toStepError(e);
      if (err) onError(err);
      else toast.error('Chưa thể thực hiện bước này.');
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        Đang đọc thông tin CCCD…
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Chụp rõ 2 mặt CCCD gắn chip, đủ 4 góc, không bị lóa.</p>
      <div className="grid grid-cols-2 gap-3">
        <CaptureButton label="Mặt trước" accept="image/*" capture="environment" icon={<Camera className="size-6" aria-hidden />} onFile={(f) => void read(setFront)(f)} preview={front} />
        <CaptureButton label="Mặt sau" accept="image/*" capture="environment" icon={<Camera className="size-6" aria-hidden />} onFile={(f) => void read(setBack)(f)} preview={back} />
      </div>
      <Button type="button" className="h-11 w-full" disabled={!front || !back} onClick={() => void submit()}>
        Tiếp tục
      </Button>
    </div>
  );
}

function FaceStep({ accountId, onError, onDone }: { accountId: string; onError(e: StepError | null): void; onDone(): void }) {
  const [busy, setBusy] = useState(false);

  const submit = async (file: File) => {
    setBusy(true);
    onError(null);
    try {
      await ekycService.submitFaceVideo(accountId, { name: file.name, type: file.type, size: file.size });
      toast.success('Xác thực danh tính thành công');
      onDone();
    } catch (e) {
      const err = toStepError(e);
      if (err) onError(err);
      else toast.error('Chưa thể thực hiện bước này.');
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        Đang đối chiếu khuôn mặt…
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex gap-2"><ScanFace className="size-4 shrink-0 text-primary" aria-hidden />Nhìn thẳng camera, bỏ kính và khẩu trang.</li>
        <li className="flex gap-2"><ScanFace className="size-4 shrink-0 text-primary" aria-hidden />Quay ở nơi đủ sáng.</li>
        <li className="flex gap-2"><ScanFace className="size-4 shrink-0 text-primary" aria-hidden />Quay đầu chậm sang trái rồi sang phải.</li>
      </ul>
      <CaptureButton label="Quay video khuôn mặt" accept="video/*" capture="user" icon={<Video className="size-6" aria-hidden />} onFile={(f) => void submit(f)} />
    </div>
  );
}

interface EkycStepperProps {
  accountId: string;
  view: ProfileView;
  ekyc: EkycView;
}

/** "Xác thực danh tính" (SCR-05): CCCD → face video → done (submit happens on "Tổng quan hồ sơ"). */
export function EkycStepper({ accountId, view, ekyc }: EkycStepperProps) {
  const isMobile = useIsMobile();
  const { logout } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<StepError | null>(null);
  const [busy, setBusy] = useState(false);
  const { profile } = view;
  const submitted = profile.status === 'SUBMITTED' || profile.status === 'APPROVED' || profile.status === 'REJECTED';
  const current = ekyc.status === 'PASSED' ? 3 : ekyc.status === 'OCR_PASSED' ? 2 : 1;
  const mismatch = ekyc.status === 'NOT_STARTED' && ekyc.draft?.nameMismatch;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      setError(null);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  };

  const shell = (body: ReactNode) => (
    <Card className="gap-4 py-4 md:py-5">
      <CardHeader className="px-4 md:px-6">
        <CardTitle className="text-base">Xác thực danh tính</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">{body}</CardContent>
    </Card>
  );

  // Locked after 5 failed attempts in 24h (BR-13).
  if (ekyc.lockedUntil) {
    return shell(
      <Alert variant="destructive">
        <Clock className="size-4" aria-hidden />
        <AlertTitle>Tạm khoá xác thực</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>{errorMessage('KOLHUB-4108', { lockedUntil: ekyc.lockedUntil })}</p>
          <p>Mở lại lúc {format(ekyc.lockedUntil, 'HH:mm dd/MM/yyyy')}.</p>
          <p className="font-medium text-foreground">Liên hệ hỗ trợ</p>
        </AlertDescription>
      </Alert>,
    );
  }

  if (submitted) {
    return shell(
      <>
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Check className="size-4 text-chart-4" aria-hidden />
          Đã gửi hồ sơ ngày {profile.submittedAt ? format(profile.submittedAt, 'dd/MM/yyyy') : '—'}
        </p>
        {ekyc.identity && <IdentityCard identity={ekyc.identity} />}
      </>,
    );
  }

  if (ekyc.status === 'MANUAL_REVIEW' || ekyc.status === 'REPORTED') {
    return shell(
      <Alert>
        <Info className="size-4 text-primary" aria-hidden />
        <AlertDescription>
          {ekyc.status === 'MANUAL_REVIEW'
            ? 'Yêu cầu xem xét họ tên đang chờ xử lý'
            : 'Báo cáo mạo danh đã được ghi nhận, chúng tôi sẽ liên hệ bạn.'}
        </AlertDescription>
      </Alert>,
    );
  }

  const errorBox = error && (
    <ErrorAlert error={error}>
      {error.attemptsLeft !== undefined && <p className="font-medium">Còn {error.attemptsLeft} lần thử</p>}
      {error.code === 'KOLHUB-4104' && (
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => void logout('/dang-nhap')}>
            Đăng nhập tài khoản đó
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={busy}
            onClick={() => void run(() => ekycService.reportImpersonation(accountId), 'Đã gửi báo cáo mạo danh')}
          >
            <ShieldAlert aria-hidden />
            Báo cáo bị mạo danh
          </Button>
        </div>
      )}
    </ErrorAlert>
  );

  const mismatchBox = mismatch && ekyc.draft && (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>{errorMessage('KOLHUB-4103')}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-foreground">
          Hồ sơ: <span className="font-medium">{ekyc.draft.profileName || 'Chưa đặt tên'}</span> · CCCD:{' '}
          <span className="font-medium">{ekyc.draft.fullName}</span>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="h-11 md:h-9"
            disabled={busy}
            onClick={() => void run(() => ekycService.resolveNameMismatch(accountId, 'update-profile'), 'Đã cập nhật họ tên theo giấy tờ')}
          >
            Cập nhật hồ sơ theo giấy tờ
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={busy}
            onClick={() => void run(() => ekycService.resolveNameMismatch(accountId, 'request-review'), 'Đã gửi yêu cầu xem xét')}
          >
            Gửi yêu cầu xem xét
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  const stepBody =
    current === 1 ? (
      <IdCardStep accountId={accountId} onError={setError} />
    ) : (
      <FaceStep accountId={accountId} onError={setError} onDone={() => setDialogOpen(false)} />
    );

  if (current === 3) {
    return shell(
      <>
        <StepBar current={3} />
        {ekyc.identity && <IdentityCard identity={ekyc.identity} />}
        <SubmitCallout ownerType="KOL" resubmit={profile.status === 'NEEDS_FIX'} />
      </>,
    );
  }

  return shell(
    <>
      <StepBar current={current} />
      {mismatchBox}
      {!isMobile && errorBox}
      {!mismatch &&
        (isMobile ? (
          <>
            {errorBox}
            <Button type="button" className="h-11 w-full" onClick={() => setDialogOpen(true)}>
              {current === 1 && !error ? 'Bắt đầu' : 'Tiếp tục xác thực'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="flex h-dvh w-screen max-w-none flex-col overflow-y-auto rounded-none md:h-auto md:max-w-lg md:rounded-lg">
                <DialogHeader className="text-left">
                  <DialogTitle>{STEPS[current - 1]}</DialogTitle>
                  <DialogDescription>Bước {current}/3 — xác thực danh tính bằng CCCD gắn chip.</DialogDescription>
                </DialogHeader>
                <StepBar current={current} />
                {errorBox}
                {stepBody}
              </DialogContent>
            </Dialog>
          </>
        ) : (
          stepBody
        ))}
      {current === 2 && ekyc.draft && !isMobile && (
        <p className="text-xs text-muted-foreground">
          Đã đọc CCCD: {ekyc.draft.fullName} · {ekyc.draft.idNoMasked}
        </p>
      )}
    </>,
  );
}
