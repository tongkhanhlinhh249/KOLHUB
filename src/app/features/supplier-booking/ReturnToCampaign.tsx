import { Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '../../components/ui/button';
import { RETURN_PARAM, safeCampaignReturn } from './marketplaceView';

/**
 * "← Quay lại chiến dịch" on the channel pages opened from a Sàn CTA ("Thêm kênh để ứng tuyển", "Xác thực kênh", …;
 * Công bố lên sàn §8: giữ đường quay lại). Renders nothing without a valid ?quay-lai=/san/<id>.
 */
export function ReturnToCampaign() {
  const [params] = useSearchParams();
  const to = safeCampaignReturn(params.get(RETURN_PARAM));
  if (!to) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-primary/30 bg-primary/5 px-3 py-2">
      <p className="text-sm text-foreground">Xong việc với kênh? Quay lại chiến dịch để ứng tuyển.</p>
      <Link to={to} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-8' })}>
        <ArrowLeft aria-hidden />
        Quay lại chiến dịch
      </Link>
    </div>
  );
}
