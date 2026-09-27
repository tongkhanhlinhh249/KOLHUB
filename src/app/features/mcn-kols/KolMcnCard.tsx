import { useState } from 'react';
import { format } from 'date-fns';
import { Building2, Check, Loader2, LogOut, X } from 'lucide-react';
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
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { mcnKolService, type McnSummary } from '../../services';
import { useLiveQuery } from '../shared/useLiveQuery';
import { KolAvatar } from './McnKolRow';

const day = (ms: number) => format(ms, 'dd/MM/yyyy');
const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

function McnLine({ mcn, sub }: { mcn: McnSummary; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <KolAvatar name={mcn.name} src={mcn.avatar} className="size-11" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{mcn.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {mcn.mcnId && <span className="font-mono text-xs">{mcn.mcnId} · </span>}
          {sub}
        </p>
      </div>
    </div>
  );
}

/**
 * "MCN quản lý" on the KOL profile: pending invites (Chấp nhận / Từ chối) or the current MCN (Rời MCN).
 * Renders nothing when the KOL has neither.
 */
export function KolMcnCard({ accountId }: { accountId: string }) {
  const q = useLiveQuery(async () => {
    const [current, invites] = await Promise.all([mcnKolService.currentMcn(accountId), mcnKolService.listInvites(accountId)]);
    return { current, invites };
  }, [accountId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const data = q.data;
  if (!data || (!data.current && data.invites.length === 0)) return null;
  const { current, invites } = data;

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card role="region" className="gap-3 p-4 md:p-5" aria-labelledby="kol-mcn-title">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" aria-hidden />
        <h2 id="kol-mcn-title" className="font-semibold text-foreground">
          MCN quản lý
        </h2>
      </div>

      {current && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <McnLine
            mcn={current}
            sub={`Quản lý từ ${day(current.since)}${current.assignedChannelCount > 0 ? ` · ${current.assignedChannelCount} kênh MCN gán cho bạn` : ''}`}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 md:h-9"
            disabled={busy !== null}
            onClick={() => setConfirmLeave(true)}
          >
            <LogOut aria-hidden />
            Rời MCN
          </Button>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Lời mời tham gia MCN">
          {invites.map((inv) => (
            <li key={inv.linkId} className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center">
              <McnLine mcn={inv} sub={`Mời bạn tham gia ngày ${day(inv.invitedAt)}`} />
              {current ? (
                <p className="text-xs text-muted-foreground sm:max-w-48">Rời MCN hiện tại để chấp nhận lời mời này.</p>
              ) : null}
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 md:h-9"
                  disabled={busy !== null}
                  onClick={() => void run(`d-${inv.linkId}`, () => mcnKolService.decline(accountId, inv.linkId), `Đã từ chối lời mời của ${inv.name}`)}
                >
                  {busy === `d-${inv.linkId}` ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />}
                  Từ chối
                </Button>
                <Button
                  type="button"
                  className="h-11 flex-1 md:h-9"
                  disabled={busy !== null || !!current}
                  onClick={() =>
                    void run(`a-${inv.linkId}`, () => mcnKolService.accept(accountId, inv.linkId), `Bạn đã tham gia ${inv.name}`)
                  }
                >
                  {busy === `a-${inv.linkId}` ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                  Chấp nhận
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời {current?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ không còn thuộc quản lý của MCN này. Các kênh MCN đã gán cho bạn sẽ trở về MCN. Kênh của riêng bạn không bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">Ở lại</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive', className: 'h-11 md:h-9' })}
              onClick={() => current && void run('leave', () => mcnKolService.leave(accountId, current.linkId), `Bạn đã rời ${current.name}`)}
            >
              Rời MCN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
