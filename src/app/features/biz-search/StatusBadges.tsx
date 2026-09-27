import { ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import type { BadgeState, KolListingStatus } from '../../services';
import { formatDate } from './format';

/** Verification badge of one channel. */
export function ChannelBadge({ badge, expiresAt }: { badge: BadgeState; expiresAt: string }) {
  if (badge === 'VERIFIED') {
    return (
      <Badge className="gap-1 whitespace-nowrap">
        <ShieldCheck className="size-3" aria-hidden />
        Đã xác thực · đến {formatDate(expiresAt)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
      Hết hạn dấu
    </Badge>
  );
}

const LISTING: Record<KolListingStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  VISIBLE: { label: 'Đã xác thực', variant: 'default' },
  BADGE_EXPIRED: { label: 'Hết hạn dấu', variant: 'outline' },
  INACTIVE: { label: 'Ngừng hoạt động', variant: 'secondary' },
  UNAVAILABLE: { label: 'Không còn hiển thị', variant: 'outline' },
};

/** Overall status of a KOL (saved lists, profile header). */
export function ListingStatusBadge({ status }: { status: KolListingStatus }) {
  const s = LISTING[status];
  return (
    <Badge variant={s.variant} className={s.variant === 'outline' ? 'whitespace-nowrap text-muted-foreground' : 'whitespace-nowrap'}>
      {s.label}
    </Badge>
  );
}
