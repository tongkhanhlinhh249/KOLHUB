import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, X } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonVariants } from '../../components/ui/button';
import { RETURN_PARAM, safeCampaignReturn } from './marketplaceView';

/** The Sàn campaign the user left to fix their profile / channels; kept for the tab while they move between pages. */
const STORE_KEY = 'kolhub.returnCampaign';

function readStored(): string | null {
  try {
    return safeCampaignReturn(sessionStorage.getItem(STORE_KEY));
  } catch {
    return null;
  }
}

/** Forget the way back (after applying, or when dismissed). */
export function clearReturnCampaign(): void {
  try {
    sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* storage unavailable: nothing kept */
  }
}

/**
 * "← Quay lại chiến dịch" on the profile / channel pages opened from a Sàn CTA ("Hoàn thiện hồ sơ", "Thêm kênh để ứng
 * tuyển", "Gia hạn kênh"…; Công bố lên sàn §8: giữ đường quay lại). Shown with a valid ?quay-lai=/san/<id>, and kept for
 * the browser tab so it survives moving between profile sections. `message` explains what to do before going back.
 */
export function ReturnToCampaign({ message = 'Xong việc với kênh? Quay lại chiến dịch để ứng tuyển.' }: { message?: string }) {
  const [params] = useSearchParams();
  const fromUrl = safeCampaignReturn(params.get(RETURN_PARAM));
  const [hidden, setHidden] = useState(false);
  if (fromUrl) {
    try {
      sessionStorage.setItem(STORE_KEY, fromUrl);
    } catch {
      /* storage unavailable: the banner still shows while the param is in the URL */
    }
  }
  const to = fromUrl ?? readStored();
  if (!to || hidden) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-primary/30 bg-primary/5 px-3 py-2">
      <p className="min-w-0 flex-1 text-sm text-foreground">{message}</p>
      <div className="flex items-center gap-1">
        <Link to={to} className={buttonVariants({ variant: 'outline', className: 'h-11 bg-card md:h-8' })}>
          <ArrowLeft aria-hidden />
          Quay lại chiến dịch
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 text-muted-foreground md:size-8"
          aria-label="Ẩn lời nhắc quay lại chiến dịch"
          onClick={() => {
            clearReturnCampaign();
            setHidden(true);
          }}
        >
          <X aria-hidden />
        </Button>
      </div>
    </div>
  );
}
