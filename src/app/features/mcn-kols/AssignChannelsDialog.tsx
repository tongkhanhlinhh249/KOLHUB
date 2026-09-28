import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { cn } from '../../components/ui/utils';
import { mcnKolService, type Channel, type KolPickItem } from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { channelName } from '../channels/ChannelParts';
import { OWN_CHANNELS_LABEL } from './channelOwner';
import { KolPicker } from './KolPicker';

export interface AssignChannelsDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  mcnAccountId: string;
  /** Channels that can be picked (the MCN's channels; one channel for the per-row action). */
  channels: Channel[];
  /** Name of the KOL currently holding a channel (from `listKols`). */
  ownerName(kolAccountId: string): string | undefined;
  initialKol?: KolPickItem | null;
  initialChannelIds?: string[];
}

/**
 * "Gán kênh cho KOL": 1) pick one approved KOL, 2) tick the MCN channels to give them. Channels held by
 * another KOL are moved; channels already held by the chosen KOL show as such and cannot be unticked here.
 */
export function AssignChannelsDialog({
  open,
  onOpenChange,
  mcnAccountId,
  channels,
  ownerName,
  initialKol = null,
  initialChannelIds = [],
}: AssignChannelsDialogProps) {
  const [kol, setKol] = useState<KolPickItem | null>(initialKol);
  const [picked, setPicked] = useState<Set<string>>(new Set(initialChannelIds));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialKey = `${initialKol?.kolAccountId ?? ''}|${initialChannelIds.join(',')}`;

  useEffect(() => {
    if (!open) return;
    setKol(initialKol);
    setPicked(new Set(initialChannelIds));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialKey]);

  const heldByKol = (c: Channel) => !!kol && c.assignedKolAccountId === kol.kolAccountId;
  const toAssign = useMemo(() => channels.filter((c) => picked.has(c.id) && !heldByKol(c)), [channels, picked, kol]);
  const ownIds = channels.filter((c) => !c.assignedKolAccountId).map((c) => c.id);
  const allOwnPicked = ownIds.length > 0 && ownIds.every((id) => picked.has(id));
  const single = channels.length === 1;

  const toggle = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const pickAllOwn = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ownIds) {
        if (allOwnPicked) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const save = async () => {
    if (!kol || toAssign.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { assigned } = await mcnKolService.assignChannels(mcnAccountId, toAssign.map((c) => c.id), kol.kolAccountId);
      toast.success(`Đã gán ${assigned} kênh cho ${kol.displayName}`);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const ownerText = (c: Channel) => {
    if (heldByKol(c)) return 'Đã gán cho KOL này';
    if (!c.assignedKolAccountId) return OWN_CHANNELS_LABEL;
    return `Đang gán: ${ownerName(c.assignedKolAccountId) ?? 'KOL khác'} — sẽ chuyển sang KOL mới`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[90dvh] max-w-[calc(100%-2rem)] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gán kênh cho KOL</DialogTitle>
          <DialogDescription>
            Chọn một KOL đã được duyệt rồi chọn kênh của MCN giao cho KOL đó. Kênh vẫn thuộc MCN; mỗi kênh chỉ gán cho một KOL.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">1. Chọn KOL</h3>
            <KolPicker value={kol} onChange={setKol} />
          </section>

          <section className="space-y-2">
            <div className="flex min-h-11 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{single ? '2. Kênh' : '2. Chọn kênh'}</h3>
              {!single && ownIds.length > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-11 md:h-8" onClick={pickAllOwn}>
                  {allOwnPicked ? 'Bỏ chọn kênh riêng' : `Chọn tất cả kênh riêng (${ownIds.length})`}
                </Button>
              )}
            </div>
            {channels.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                MCN chưa có kênh nào. Thêm kênh ở Quản lý kênh trước.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Kênh của MCN">
                {channels.map((c) => {
                  const held = heldByKol(c);
                  const moving = !held && !!c.assignedKolAccountId;
                  return (
                    <li key={c.id}>
                      <label className={cn('flex min-h-14 items-center gap-3 px-3 py-2', held ? 'opacity-70' : 'cursor-pointer hover:bg-accent/40')}>
                        <Checkbox
                          checked={held || picked.has(c.id)}
                          disabled={held || single}
                          onCheckedChange={(v) => toggle(c.id, v === true)}
                          aria-label={`Chọn kênh ${channelName(c.handle, c.url)}`}
                        />
                        <PlatformIcon platform={c.platform} className="size-6 rounded-md" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{channelName(c.handle, c.url)}</span>
                          <span className={cn('block truncate text-xs', moving ? 'text-foreground' : 'text-muted-foreground')}>
                            {ownerText(c)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onOpenChange(false)} disabled={busy}>
            Huỷ
          </Button>
          <Button type="button" className="h-11 md:h-9" onClick={() => void save()} disabled={busy || !kol || toAssign.length === 0}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {toAssign.length > 0 ? `Gán ${toAssign.length} kênh` : 'Gán kênh'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
