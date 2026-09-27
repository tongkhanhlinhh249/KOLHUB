import { useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  detectPlatform,
  KolhubError,
  REPORT_NOTE_MAX,
  REPORT_NOTE_MIN,
  VIOLATION_CATEGORIES,
  violationService,
  type Platform,
  type ViolationCategory,
  type ViolationSeverity,
} from '../../services';
import { platformLabel } from '../biz-search/PlatformIcon';

export interface ReportTarget {
  channelId: string;
  /** Without "@". */
  handle: string;
  platform: Platform;
}

type Field = 'category' | 'contentUrl' | 'note';
type Errors = Partial<Record<Field | 'form', string>>;

/** Light → severe, as read left to right. */
const SEVERITY_OPTIONS: { key: ViolationSeverity; label: string }[] = [
  { key: 'low', label: 'Nhẹ' },
  { key: 'medium', label: 'Trung bình' },
  { key: 'high', label: 'Nghiêm trọng' },
];

const FIELD_OF_CODE: Partial<Record<string, Field>> = {
  'KOLHUB-4609': 'note',
  'KOLHUB-4610': 'contentUrl',
  'KOLHUB-4612': 'category',
};

/**
 * "Báo cáo vi phạm" for a Brand/Agency: category, severity, optional content link (same platform
 * as the channel) and a 20–1000 character description. Sends a PENDING_REVIEW report to Admin.
 */
export function ReportViolationDialog({ target, onOpenChange }: { target: ReportTarget | null; onOpenChange(open: boolean): void }) {
  const id = useId();
  const open = target !== null;
  const [category, setCategory] = useState<ViolationCategory | ''>('');
  const [severity, setSeverity] = useState<ViolationSeverity>('medium');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory('');
      setSeverity('medium');
      setUrl('');
      setNote('');
      setErrors({});
    }
  }, [open, target?.channelId]);

  const len = note.trim().length;
  const label = target ? platformLabel(target.platform) : '';

  const validate = (): Errors => {
    const e: Errors = {};
    if (!category) e.category = 'Vui lòng chọn loại vi phạm.';
    const u = url.trim();
    if (u && target && detectPlatform(u) !== target.platform) e.contentUrl = `Link phải là nội dung trên ${label} của kênh này.`;
    if (len < REPORT_NOTE_MIN) e.note = `Mô tả cần tối thiểu ${REPORT_NOTE_MIN} ký tự.`;
    else if (len > REPORT_NOTE_MAX) e.note = `Mô tả tối đa ${REPORT_NOTE_MAX} ký tự.`;
    return e;
  };

  const clear = (f: Field) => errors[f] && setErrors((prev) => ({ ...prev, [f]: undefined, form: undefined }));

  const submit = async () => {
    if (!target) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await violationService.reportByBrand({
        channelId: target.channelId,
        category: category as ViolationCategory,
        severity,
        note: note.trim(),
        ...(url.trim() ? { contentUrl: url.trim() } : {}),
      });
      toast.success('Đã gửi báo cáo. Admin sẽ xác minh trong 1–2 ngày làm việc.');
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      const field = err instanceof KolhubError ? FIELD_OF_CODE[err.code] : undefined;
      setErrors(field ? { [field]: msg } : { form: msg });
    } finally {
      setBusy(false);
    }
  };

  const errId = (f: Field) => `${id}-${f}-error`;
  const errorLine = (f: Field) =>
    errors[f] ? (
      <p id={errId(f)} className="text-xs text-destructive" role="alert">
        {errors[f]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Báo cáo vi phạm</DialogTitle>
          <DialogDescription>
            Kênh @{target?.handle} · {label}
          </DialogDescription>
        </DialogHeader>

        <form
          id={`${id}-form`}
          className="space-y-4"
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-category`}>
              Loại vi phạm <span className="text-destructive">*</span>
            </Label>
            <Select
              value={category || undefined}
              onValueChange={(v) => {
                setCategory(v as ViolationCategory);
                clear('category');
              }}
            >
              <SelectTrigger
                id={`${id}-category`}
                aria-required
                aria-invalid={errors.category ? true : undefined}
                aria-describedby={errors.category ? errId('category') : undefined}
                className={cn('h-11 w-full md:h-10', errors.category && 'border-destructive')}
              >
                <SelectValue placeholder="Chọn loại vi phạm" />
              </SelectTrigger>
              <SelectContent>
                {VIOLATION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorLine('category')}
          </div>

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-medium text-foreground">Mức độ</legend>
            <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as ViolationSeverity)} className="grid-cols-3 gap-2">
              {SEVERITY_OPTIONS.map((o) => (
                <Label
                  key={o.key}
                  htmlFor={`${id}-sev-${o.key}`}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-normal md:min-h-10',
                    severity === o.key && 'border-primary bg-primary/5',
                  )}
                >
                  <RadioGroupItem id={`${id}-sev-${o.key}`} value={o.key} />
                  {o.label}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-url`}>Link nội dung (không bắt buộc)</Label>
            <Input
              id={`${id}-url`}
              type="url"
              inputMode="url"
              value={url}
              placeholder="https://…"
              className="h-11 md:h-10"
              aria-invalid={errors.contentUrl ? true : undefined}
              aria-describedby={errors.contentUrl ? errId('contentUrl') : `${id}-url-hint`}
              onChange={(e) => {
                setUrl(e.target.value);
                clear('contentUrl');
              }}
            />
            {errors.contentUrl ? (
              errorLine('contentUrl')
            ) : (
              <p id={`${id}-url-hint`} className="text-xs text-muted-foreground">
                Link video/bài đăng trên {label} của kênh này.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-note`}>
              Mô tả <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`${id}-note`}
              value={note}
              rows={4}
              maxLength={REPORT_NOTE_MAX}
              placeholder="Mô tả vi phạm bạn thấy, thời điểm trong video nếu có…"
              aria-required
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={`${id}-note-hint`}
              onChange={(e) => {
                setNote(e.target.value);
                clear('note');
              }}
            />
            <div id={`${id}-note-hint`} className="flex justify-between gap-3 text-xs">
              <span className={errors.note ? 'text-destructive' : 'text-muted-foreground'} role={errors.note ? 'alert' : undefined}>
                {errors.note ?? `Tối thiểu ${REPORT_NOTE_MIN} ký tự.`}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {len}/{REPORT_NOTE_MAX}
              </span>
            </div>
          </div>

          {errors.form && (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form={`${id}-form`} variant="destructive" className="h-11 md:h-9" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Gửi báo cáo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
