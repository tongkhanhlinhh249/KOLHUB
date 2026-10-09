import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronRight, Handshake, Users } from 'lucide-react';
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

/** Two or three points that tell the types apart at a glance. */
const POINTS: Record<CampaignType, string[]> = {
  BOOKING: ['Mời KOL hoặc nhận đề xuất trên Sàn', 'Thương lượng giá từng booking', 'Phù hợp chiến dịch ít KOL, brief riêng'],
  OPEN_RECRUITMENT: ['Phần thưởng cố định cho mỗi KOL', 'Tuyển N suất, lịch 4 giai đoạn', 'KOL/MCN ứng tuyển không cần báo giá'],
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
          <DialogDescription>Chọn cách bạn làm việc với KOL/MCN. Bạn vẫn đổi được loại trong lúc soạn chiến dịch.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CAMPAIGN_TYPES.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => pick(t.key)}
                className="group flex h-full w-full flex-col gap-3 rounded-[8px] border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{ICON[t.key]}</span>
                  <span className="flex-1 font-semibold text-foreground">{t.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="text-sm text-muted-foreground">{t.description}</span>
                <span className="mt-auto space-y-1.5 border-t border-border pt-3">
                  {POINTS[t.key].map((p) => (
                    <span key={p} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-chart-4" aria-hidden />
                      {p}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
