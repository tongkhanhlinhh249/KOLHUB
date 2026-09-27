import { useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

/**
 * Text dialog for "Đã khắc phục" (note), "Khiếu nại" (reason ≥ minLength) and the Admin decisions.
 * `onConfirm` throws on failure; the error is shown under the field and the dialog stays open.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  minLength = 1,
  maxLength = 500,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  minLength?: number;
  maxLength?: number;
  destructive?: boolean;
  onConfirm(text: string): Promise<void>;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setError(null);
    }
  }, [open]);

  const len = text.trim().length;
  const tooShort = len < minLength;

  const submit = async () => {
    if (tooShort) {
      setError(minLength > 1 ? `Cần tối thiểu ${minLength} ký tự.` : 'Vui lòng nhập nội dung.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(text.trim());
      onOpenChange(false);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={id}>{label}</Label>
          <Textarea
            id={id}
            value={text}
            maxLength={maxLength}
            rows={4}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={`${id}-hint`}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
          />
          <div id={`${id}-hint`} className="flex justify-between gap-3 text-xs">
            <span className={error ? 'text-destructive' : 'text-muted-foreground'} role={error ? 'alert' : undefined}>
              {error ?? (minLength > 1 ? `Tối thiểu ${minLength} ký tự.` : '')}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {len}/{maxLength}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            className="h-11 md:h-9"
            disabled={busy || tooShort}
            onClick={() => void submit()}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
