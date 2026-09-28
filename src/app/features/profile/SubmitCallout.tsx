import { Link } from 'react-router';
import { ArrowRight, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { OwnerType } from '../../services';
import { profilePath } from './primaryAction';

/** End of the identity steps: points to "Tổng quan hồ sơ", where the checklist, pledges and submit live. */
export function SubmitCallout({ ownerType, resubmit }: { ownerType: OwnerType; resubmit: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
      <div className="flex min-w-0 items-start gap-2">
        <Send className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-foreground">
          {resubmit
            ? 'Đã cập nhật xong? Gửi lại hồ sơ tại trang Tổng quan hồ sơ.'
            : 'Bước tiếp theo: kiểm tra điều kiện, cam đoan và gửi hồ sơ xét duyệt.'}
        </p>
      </div>
      <Button asChild className="h-11 w-full shrink-0 sm:w-auto md:h-9">
        <Link to={profilePath(ownerType, 'tong-quan')}>
          Đến Tổng quan hồ sơ
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
