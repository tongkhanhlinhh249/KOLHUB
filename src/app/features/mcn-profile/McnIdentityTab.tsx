import { useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Check, FileText, Info, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { cn } from '../../components/ui/utils';
import {
  KolhubError,
  profileService,
  validateGcnFile,
  type McnProfile,
  type OrgChange,
  type OrgIdentity,
  type ProfileView,
  type StoredFile,
} from '../../services';
import { Field, type FieldErrors } from '../form/Field';
import { SubmitCallout } from '../profile/SubmitCallout';
import { formatFileSize, toStoredFile } from '../shared/files';

type OrgKey = keyof OrgIdentity;

const ORG_LABELS: Record<OrgKey, string> = {
  orgName: 'Tên tổ chức',
  regNo: 'Mã số doanh nghiệp',
  regDate: 'Ngày cấp',
  regBy: 'Nơi cấp',
  legalRep: 'Người đại diện theo pháp luật',
};
const ORG_KEYS = Object.keys(ORG_LABELS) as OrgKey[];
const ORG_PLACEHOLDERS: Record<OrgKey, string> = {
  orgName: 'Tên theo Giấy chứng nhận ĐKDN',
  regNo: '0312345678',
  regDate: '',
  regBy: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
  legalRep: 'Họ tên người đại diện',
};
const STEPS = ['Thông tin tổ chức', 'Giấy chứng nhận ĐKDN', 'Xem lại'];

const complete = (o: OrgIdentity) => ORG_KEYS.every((k) => o[k].trim() !== '');

function formatDate(v: string): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return d ? `${d[3]}/${d[2]}/${d[1]}` : v;
}

function errorText(e: unknown): string {
  if (e instanceof Error && e.message === 'IDENTITY_LOCKED') return 'Hồ sơ không được duyệt nên không thể sửa định danh.';
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Các bước xác thực tổ chức">
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

function OrgFields({ values, errors, onChange }: { values: OrgIdentity; errors: FieldErrors; onChange(v: OrgIdentity): void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ORG_KEYS.map((k) => (
        <div key={k} className={k === 'orgName' || k === 'legalRep' ? 'md:col-span-2' : undefined}>
          <Field
            label={`${ORG_LABELS[k]} *`}
            placeholder={ORG_PLACEHOLDERS[k] || undefined}
            type={k === 'regDate' ? 'date' : 'text'}
            inputMode={k === 'regNo' ? 'numeric' : undefined}
            value={values[k]}
            error={errors[k]}
            onChange={(e) => onChange({ ...values, [k]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

function OrgTable({ org, gcn }: { org: OrgIdentity; gcn?: StoredFile }) {
  return (
    <dl className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
      {ORG_KEYS.map((k) => (
        <div key={k} className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">{ORG_LABELS[k]}</dt>
          <dd className="text-sm break-words text-foreground">{k === 'regDate' ? formatDate(org[k]) : org[k] || '—'}</dd>
        </div>
      ))}
      <div className="space-y-0.5">
        <dt className="text-xs text-muted-foreground">Giấy chứng nhận ĐKDN</dt>
        <dd className="text-sm break-all text-foreground">{gcn ? gcn.name : '—'}</dd>
      </div>
    </dl>
  );
}

function GcnPicker({ file, onPicked, busy }: { file?: StoredFile; onPicked(f: File): void; busy: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Đủ trang, thấy rõ số và ngày cấp. JPG/PNG/PDF ≤ 10 MB</p>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="sr-only"
        aria-label="Tải Giấy chứng nhận ĐKDN"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPicked(f);
          e.target.value = '';
        }}
      />
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          {file.thumbnail ? (
            <img src={file.thumbnail} alt="Giấy chứng nhận ĐKDN" className="size-14 rounded object-cover" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded bg-muted text-muted-foreground">
              <FileText className="size-6" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
        </div>
      )}
      <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
        {file ? 'Đổi file' : 'Chọn file'}
      </Button>
    </div>
  );
}

function orgErrors(values: OrgIdentity): FieldErrors {
  const errs: FieldErrors = {};
  for (const k of ORG_KEYS) if (!values[k].trim()) errs[k] = `Vui lòng nhập ${ORG_LABELS[k]}`;
  return errs;
}

/** Steps 1–3 while the profile is editable (DRAFT / NEEDS_FIX). */
function EditableFlow({ profile }: { profile: McnProfile }) {
  const initial = !complete(profile.org) ? 1 : !profile.gcnFile ? 2 : 3;
  const [step, setStep] = useState(initial);
  const [values, setValues] = useState<OrgIdentity>(() => ({ ...profile.org }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [gcnError, setGcnError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const saved = ORG_KEYS.every((k) => values[k].trim() === profile.org[k]);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    const errs = orgErrors(values);
    setErrors(errs);
    if (Object.keys(errs).length) return false;
    setSaving(true);
    try {
      await profileService.updateOrgIdentity(profile.accountId, values);
      toast.success('Đã lưu thông tin tổ chức');
      return true;
    } catch (err) {
      if (err instanceof KolhubError && err.code === 'KOLHUB-4303') setErrors({ regNo: err.message });
      else toast.error(errorText(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setGcnError(null);
    setUploading(true);
    try {
      validateGcnFile({ name: file.name, type: file.type, size: file.size });
      await profileService.uploadGcn(profile.accountId, await toStoredFile(file));
      toast.success('Đã tải Giấy chứng nhận ĐKDN');
    } catch (err) {
      setGcnError(errorText(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <StepBar current={step} />
      {step === 1 && (
        <form onSubmit={(e) => void save(e)} className="space-y-4" noValidate>
          <OrgFields values={values} errors={errors} onChange={setValues} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" variant="outline" className="h-11 md:h-9" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              Lưu
            </Button>
            <Button type="button" className="h-11 md:h-9" disabled={saving || !complete(values) || !saved} onClick={() => setStep(2)}>
              Tiếp tục
            </Button>
          </div>
          {complete(values) && !saved && <p className="text-xs text-muted-foreground">Lưu thông tin trước khi tiếp tục.</p>}
        </form>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <GcnPicker file={profile.gcnFile} busy={uploading} onPicked={(f) => void upload(f)} />
          {gcnError && <p className="text-xs text-destructive">{gcnError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setStep(1)}>
              Quay lại
            </Button>
            <Button type="button" className="h-11 md:h-9" disabled={!profile.gcnFile || uploading} onClick={() => setStep(3)}>
              Tiếp tục
            </Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <OrgTable org={profile.org} gcn={profile.gcnFile} />
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => setStep(1)}>
            Sửa thông tin tổ chức
          </Button>
          <SubmitCallout ownerType="MCN" resubmit={profile.status === 'NEEDS_FIX'} />
        </div>
      )}
    </>
  );
}

function ChangeDialog({ profile, pending, onOpenChange }: { profile: McnProfile; pending?: OrgChange; onOpenChange(o: boolean): void }) {
  const [values, setValues] = useState<OrgIdentity>(() => ({ ...(pending?.org ?? profile.org) }));
  const [file, setFile] = useState<StoredFile | undefined>(pending?.gcnFile ?? profile.gcnFile);
  const [newFile, setNewFile] = useState<StoredFile | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [gcnError, setGcnError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pick = async (f: File) => {
    setGcnError(null);
    try {
      validateGcnFile({ name: f.name, type: f.type, size: f.size });
      const stored = await toStoredFile(f);
      setFile(stored);
      setNewFile(stored);
    } catch (err) {
      setGcnError(errorText(err));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = orgErrors(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (newFile) await profileService.uploadGcn(profile.accountId, newFile);
      await profileService.updateOrgIdentity(profile.accountId, values);
      toast.info('Đã gửi thay đổi, thông tin hiện tại giữ nguyên tới khi được duyệt');
      onOpenChange(false);
    } catch (err) {
      if (err instanceof KolhubError && err.code === 'KOLHUB-4303') setErrors({ regNo: err.message });
      else toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Đề nghị thay đổi thông tin tổ chức</DialogTitle>
        <DialogDescription>Thông tin hiện tại giữ nguyên cho tới khi thay đổi được duyệt.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <OrgFields values={values} errors={errors} onChange={setValues} />
        <GcnPicker file={file} busy={false} onPicked={(f) => void pick(f)} />
        {gcnError && <p className="text-xs text-destructive">{gcnError}</p>}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" className="h-11 md:h-9" disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Gửi thay đổi
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PendingAlert({ profile, pending }: { profile: McnProfile; pending: OrgChange }) {
  const diffs = ORG_KEYS.filter((k) => pending.org[k] !== profile.org[k]).map((k) => ({
    label: ORG_LABELS[k],
    from: k === 'regDate' ? formatDate(profile.org[k]) : profile.org[k],
    to: k === 'regDate' ? formatDate(pending.org[k]) : pending.org[k],
  }));
  if (pending.gcnFile && pending.gcnFile.name !== profile.gcnFile?.name) {
    diffs.push({ label: 'Giấy chứng nhận ĐKDN', from: profile.gcnFile?.name ?? '—', to: pending.gcnFile.name });
  }
  return (
    <Alert className="border-chart-5/50 bg-chart-5/10">
      <Info className="size-4 text-chart-5" aria-hidden />
      <AlertTitle>Có thay đổi đang chờ duyệt</AlertTitle>
      <AlertDescription>
        <ul className="space-y-1 text-sm">
          {diffs.map((d) => (
            <li key={d.label} className="break-words">
              <span className="text-muted-foreground">{d.label}:</span> {d.from || '—'} → <span className="font-medium">{d.to || '—'}</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * SCR-07 — MCN organisation identity: 5 fields + GCN, change requests after submission. Submit and
 * "Trạng thái xét duyệt" live on "Tổng quan hồ sơ" (tong-quan).
 */
export function McnIdentityTab({ accountId, view }: { accountId: string; view: ProfileView }) {
  const profile = view.profile as McnProfile;
  const [dialog, setDialog] = useState(false);
  const pendingReq = view.pendingChanges.find((c) => c.field === 'orgIdentity');
  const pending = pendingReq && typeof pendingReq.newValue !== 'string' ? pendingReq.newValue : undefined;
  const editable = profile.status === 'DRAFT' || profile.status === 'NEEDS_FIX';
  const canRequestChange = profile.status === 'SUBMITTED' || profile.status === 'APPROVED';

  return (
    <div data-account={accountId}>
      <Card className="gap-4 py-4 md:py-5">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-base">Xác thực tổ chức</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 md:px-6">
          {editable ? (
            <EditableFlow key={profile.status} profile={profile} />
          ) : (
            <>
              {profile.submittedAt && (
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="size-4 text-chart-4" aria-hidden />
                  Đã gửi hồ sơ ngày {format(profile.submittedAt, 'dd/MM/yyyy')}
                </p>
              )}
              {pending && <PendingAlert profile={profile} pending={pending} />}
              <OrgTable org={profile.org} gcn={profile.gcnFile} />
              {canRequestChange && (
                <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setDialog(true)}>
                  Đề nghị thay đổi
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialog} onOpenChange={setDialog}>
        {dialog && <ChangeDialog profile={profile} pending={pending} onOpenChange={setDialog} />}
      </Dialog>
    </div>
  );
}
