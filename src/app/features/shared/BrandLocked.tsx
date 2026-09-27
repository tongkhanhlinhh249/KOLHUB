import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { KolhubError } from '../../services';

/** Full-page notice for KOLHUB-4016 (not a verified Brand/Agency account); null for any other error. */
export function brandLockedView(error: unknown): ReactElement | null {
  if (!(error instanceof KolhubError) || error.code !== 'KOLHUB-4016') return null;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-6" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button asChild className="h-11">
        <Link to="/dang-ky?loai=biz">Đăng ký tài khoản Nhãn hàng</Link>
      </Button>
    </div>
  );
}
