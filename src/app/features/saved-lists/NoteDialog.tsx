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
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { NOTE_MAX } from '../../services';

interface NoteDialogProps {
  open: boolean;
  kolName: string;
  initialNote: string;
  /** Throw to keep the dialog open; the message is shown under the field (4405). */
  onSubmit(note: string): Promise<void>;
  onOpenChange(open: boolean): void;
}

export function NoteDialog({ open, kolName, initialNote, onSubmit, onOpenChange }: NoteDialogProps) {
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  useEffect(() => {
    if (open) {
      setNote(initialNote);
      setError(null);
    }
  }, [open, initialNote]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(note);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const length = [...note.trim()].length;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Ghi chú cho {kolName}</DialogTitle>
            <DialogDescription>Ghi chú chỉ bạn thấy, riêng cho danh sách này.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={id}>Ghi chú</Label>
              <span className={cn('text-xs', length > NOTE_MAX ? 'text-destructive' : 'text-muted-foreground')}>
                {length}/{NOTE_MAX}
              </span>
            </div>
            <Textarea
              id={id}
              autoFocus
              rows={5}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className={cn(error && 'border-destructive')}
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
              Lưu ghi chú
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
