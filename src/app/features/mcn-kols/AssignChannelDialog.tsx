import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { cn } from '../../components/ui/utils';
import { MCN_KOLS_PATH } from '../../auth/roles';
import type { McnKolRow } from '../../services';
import { OWN_CHANNELS, OWN_CHANNELS_LABEL } from './channelOwner';
import { KolAvatar } from './McnKolRow';

const OPTION =
  'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5';

/** Pick the ACTIVE linked KOL an MCN channel belongs to, or keep it as "Kênh riêng MCN". */
export function AssignChannelDialog({
  open,
  onOpenChange,
  channelName,
  kols,
  currentKolAccountId,
  onSave,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  channelName: string;
  /** ACTIVE linked KOLs of the MCN. */
  kols: McnKolRow[];
  currentKolAccountId?: string;
  /** null = Kênh riêng MCN. Throw to keep the dialog open. */
  onSave(kolAccountId: string | null): Promise<void>;
}) {
  const initial = currentKolAccountId ?? OWN_CHANNELS;
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initial);
      setError(null);
    }
  }, [open, initial]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(value === OWN_CHANNELS ? null : value);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...kols].sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[90dvh] max-w-[calc(100%-2rem)] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gán kênh cho KOL</DialogTitle>
          <DialogDescription>
            Chọn KOL đang do MCN quản lý phụ trách kênh <span className="font-medium text-foreground">{channelName}</span>. Kênh vẫn thuộc MCN.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={value} onValueChange={setValue} className="-mx-1 min-h-0 overflow-y-auto px-1" aria-label="Chủ sở hữu kênh">
          <label className={OPTION}>
            <RadioGroupItem value={OWN_CHANNELS} />
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{OWN_CHANNELS_LABEL}</span>
              <span className="block text-xs text-muted-foreground">Không gán cho KOL nào</span>
            </span>
          </label>
          {sorted.map((k) => (
            <label key={k.kolAccountId} className={OPTION}>
              <RadioGroupItem value={k.kolAccountId} />
              <KolAvatar name={k.displayName} src={k.avatar} className="size-9" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{k.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {k.kolId} · {k.assignedChannelCount} kênh MCN
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>

        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">
            MCN chưa quản lý KOL nào.{' '}
            <Link to={MCN_KOLS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
              Mời KOL
            </Link>{' '}
            để gán kênh.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onOpenChange(false)} disabled={busy}>
            Huỷ
          </Button>
          <Button type="button" className={cn('h-11 md:h-9')} onClick={() => void save()} disabled={busy || value === initial}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
