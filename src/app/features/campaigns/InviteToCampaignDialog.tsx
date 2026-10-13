import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Loader2, Megaphone, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { campaignService, CAMPAIGN_STATUS_LABEL, type CampaignView, type InviteResult } from '../../services';
import { errText } from './CampaignParts';
import { campaignPath, CAMPAIGN_CREATE_PATH, INVITABLE_STATUSES, inviteSummary } from './campaignView';
import { deliverableOption, InviteOptionsFields, InviteResultView } from './InviteKolsDialog';

export interface InviteTarget {
  kolId: string;
  name: string;
}

/**
 * "Mời vào chiến dịch" from a KOL (profile sheet, search row/card, saved list row or bulk selection):
 * choose an OPEN ("Đang tuyển") campaign, deliverable (fixed group reward) and note → inviteKols.
 */
export function InviteToCampaignDialog({ targets, onOpenChange }: { targets: InviteTarget[] | null; onOpenChange(open: boolean): void }) {
  const id = useId();
  const navigate = useNavigate();
  const open = !!targets && targets.length > 0;
  const [campaigns, setCampaigns] = useState<CampaignView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string>('');
  const [deliverable, setDeliverable] = useState('0');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCampaigns(null);
    setLoadError(null);
    setError(null);
    setResult(null);
    setNote('');
    setDeliverable('0');
    campaignService
      .listMine({ status: INVITABLE_STATUSES })
      .then((all) => {
        if (!alive) return;
        // "Tuyển nhiều KOL" campaigns take applications on the Sàn only (no private invites).
        const list = all.filter((c) => c.type !== 'OPEN_RECRUITMENT');
        setCampaigns(list);
        setCampaignId((cur) => (list.some((c) => c.id === cur) ? cur : list[0]?.id ?? ''));
      })
      .catch((e) => alive && setLoadError(errText(e)));
    return () => {
      alive = false;
    };
  }, [open]);

  const campaign = campaigns?.find((c) => c.id === campaignId);
  const names = new Map((targets ?? []).map((t) => [t.kolId, t.name]));
  const who = targets?.length === 1 ? targets[0].name : `${targets?.length ?? 0} KOL`;

  const submit = async () => {
    if (!campaign || !targets) return;
    setBusy(true);
    setError(null);
    try {
      const r = await campaignService.inviteKols(
        campaign.id,
        targets.map((t) => t.kolId),
        { note, deliverable: deliverableOption(campaign.deliverables, deliverable) },
      );
      setResult(r);
      if (r.skipped.length === 0) toast.success(inviteSummary(r), { description: campaign.name });
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-4 pr-12 text-left md:p-5">
          <DialogTitle>{result ? 'Kết quả mời' : 'Mời vào chiến dịch'}</DialogTitle>
          <DialogDescription className="truncate">{who}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
          {result && targets ? (
            <InviteResultView result={result} kolIds={targets.map((t) => t.kolId)} names={names} />
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !campaigns ? (
            <div className="space-y-3" aria-busy="true" aria-label="Đang tải chiến dịch">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Megaphone className="size-6" aria-hidden />
              </div>
              <p className="font-semibold text-foreground">Chưa có chiến dịch để mời</p>
              <p className="max-w-xs text-sm text-muted-foreground">Chỉ mời được vào chiến dịch đang tuyển (đã được Admin duyệt). Tạo và gửi đăng chiến dịch rồi quay lại mời KOL.</p>
              <Link to={CAMPAIGN_CREATE_PATH} className={buttonVariants({ className: 'h-11' })} onClick={() => onOpenChange(false)}>
                <Plus aria-hidden />
                Tạo chiến dịch
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-c`}>Chiến dịch</Label>
                <Select
                  value={campaignId}
                  onValueChange={(v) => {
                    setCampaignId(v);
                    setDeliverable('0');
                    setError(null);
                  }}
                >
                  <SelectTrigger id={`${id}-c`} className="h-11 w-full bg-card md:h-10">
                    <SelectValue placeholder="Chọn chiến dịch" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="truncate">{c.name}</span>
                        <span className="text-muted-foreground"> · {CAMPAIGN_STATUS_LABEL[c.status]}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {campaign && (
                <InviteOptionsFields
                  deliverables={campaign.deliverables}
                  groups={campaign.groups ?? []}
                  deliverable={deliverable}
                  onDeliverable={setDeliverable}
                  note={note}
                  onNote={setNote}
                />
              )}
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border p-4 md:p-5">
          {result && campaign ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11 md:h-9"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`${campaignPath(campaign.id)}?tab=ung-vien`);
                }}
              >
                Xem chiến dịch
              </Button>
              <Button type="button" className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
                Xong
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => onOpenChange(false)}>
                Huỷ
              </Button>
              {campaigns && campaigns.length > 0 && (
                <Button type="button" className="h-11 md:h-9" disabled={busy || !campaign} onClick={() => void submit()}>
                  {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                  Gửi lời mời
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
