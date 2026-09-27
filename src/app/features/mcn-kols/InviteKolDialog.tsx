import { useEffect, useId, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { cn } from '../../components/ui/utils';
import { errorMessage, type McnKolRow } from '../../services';

interface InviteKolDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Throw to keep the dialog open; the message is shown under the field (KOLHUB-4701..4706). */
  onInvite(target: string): Promise<McnKolRow>;
}

/** "Mời KOL": KOL ID or the KOL's login email. The KOL accepts or declines from their profile. */
export function InviteKolDialog({ open, onOpenChange, onInvite }: InviteKolDialogProps) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  useEffect(() => {
    if (open) {
      setTarget('');
      setError(null);
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target.trim()) {
      setError(errorMessage('KOLHUB-4702'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onInvite(target);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Mời KOL</DialogTitle>
            <DialogDescription>
              Chỉ mời được KOL đã được duyệt hồ sơ. KOL sẽ thấy lời mời trong hồ sơ của mình và chọn Chấp nhận hoặc Từ chối.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={id}>KOL ID hoặc email đăng nhập của KOL</Label>
            <Input
              id={id}
              autoFocus
              autoComplete="off"
              placeholder="Ví dụ: KOL-2026-0020 hoặc ten@email.vn"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className={cn('h-11 md:h-10', error && 'border-destructive')}
            />
            {error && (
              <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onOpenChange(false)} disabled={busy}>
              Huỷ
            </Button>
            <Button type="submit" className="h-11 md:h-9" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Gửi lời mời
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
