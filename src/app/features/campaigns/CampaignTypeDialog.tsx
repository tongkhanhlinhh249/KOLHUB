import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Handshake, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { CAMPAIGN_TYPES, type CampaignType } from '../../services';
import { CAMPAIGN_CREATE_PATH } from './campaignView';

/** `?loai=` value of /chien-dich/tao for each type. */
export const TYPE_PARAM: Record<CampaignType, string> = { BOOKING: 'booking', OPEN_RECRUITMENT: 'tuyen-nhieu' };

export function typeFromParam(v: string | null): CampaignType | undefined {
  return (Object.keys(TYPE_PARAM) as CampaignType[]).find((k) => TYPE_PARAM[k] === v);
}

export const campaignCreatePath = (type: CampaignType) => `${CAMPAIGN_CREATE_PATH}?loai=${TYPE_PARAM[type]}`;

const ICON: Record<CampaignType, ReactNode> = {
  BOOKING: <Handshake className="size-5" aria-hidden />,
  OPEN_RECRUITMENT: <Users className="size-5" aria-hidden />,
};

/** What tells the two options apart: how many KOL the brand ends up working with (shown in bold). */
const DESCRIPTION: Record<CampaignType, ReactNode> = {
  BOOKING: (
    <>
      Mời và nhận ứng tuyển từ nhiều KOL, chọn <strong className="font-semibold text-foreground">1 KOL</strong> phù hợp để hợp tác.
    </>
  ),
  OPEN_RECRUITMENT: (
    <>
      Mời và nhận ứng tuyển từ nhiều KOL, chọn <strong className="font-semibold text-foreground">nhiều KOL</strong> phù hợp để hợp tác.
    </>
  ),
};

/**
 * "Tạo chiến dịch" step 1: pick the campaign type, then open the form with `?loai=`. The form only shows a
 * compact radio to switch afterwards. `onPick` replaces navigation (e.g. the form choosing for itself).
 */
export function CampaignTypeDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  onPick?(type: CampaignType): void;
}) {
  const navigate = useNavigate();
  const pick = (t: CampaignType) => {
    onOpenChange(false);
    if (onPick) onPick(t);
    else navigate(campaignCreatePath(t));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>Tạo chiến dịch</DialogTitle>
          <DialogDescription>Bạn muốn hợp tác với bao nhiêu KOL? Có thể đổi lựa chọn khi chiến dịch còn ở bản nháp.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CAMPAIGN_TYPES.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => pick(t.key)}
                className="group flex h-full w-full flex-col gap-2 rounded-[8px] border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{ICON[t.key]}</span>
                  <span className="flex-1 font-semibold text-foreground">{t.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="text-sm text-muted-foreground">{DESCRIPTION[t.key]}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
