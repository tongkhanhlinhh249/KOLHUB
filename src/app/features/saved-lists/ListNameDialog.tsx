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
import { LIST_NAME_MAX, normalizeListName } from '../../services';

interface ListNameDialogProps {
  open: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
  /** Throw to keep the dialog open; the error message is shown under the field (4401/4402). */
  onSubmit(name: string): Promise<void>;
  onOpenChange(open: boolean): void;
}

export function ListNameDialog({ open, mode, initialName = '', onSubmit, onOpenChange }: ListNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const length = [...normalizeListName(name)].length;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Tạo danh sách' : 'Đổi tên danh sách'}</DialogTitle>
            <DialogDescription>Tên danh sách từ 1 đến {LIST_NAME_MAX} ký tự, không trùng với danh sách khác của bạn.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={id}>Tên danh sách</Label>
              <span className={cn('text-xs', length > LIST_NAME_MAX ? 'text-destructive' : 'text-muted-foreground')}>
                {length}/{LIST_NAME_MAX}
              </span>
            </div>
            <Input
              id={id}
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className={cn('h-11 md:h-10', error && 'border-destructive')}
            />
            {error && (
              <p id={`${id}-error`} className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={busy}>
              Huỷ
            </Button>
            <Button type="submit" className="h-11" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {mode === 'create' ? 'Tạo' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
