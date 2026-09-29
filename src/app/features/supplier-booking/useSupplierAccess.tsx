import { Link } from 'react-router';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { buttonVariants } from '../../components/ui/button';
import { useAuth } from '../../auth/AuthContext';
import { profileService, type OwnerType, type ProfileStatus } from '../../services';
import { useLiveQuery } from '../shared/useLiveQuery';
import { profilePath } from '../profile/primaryAction';

export interface SupplierAccess {
  accountId: string;
  ownerType: OwnerType;
  /** undefined while loading. */
  status?: ProfileStatus;
  /** APPROVED (KOL: with a KOL ID) — may apply and act on bookings. */
  approved: boolean;
  loading: boolean;
}

/** Signed-in KOL / MCN and whether its profile lets it apply and handle bookings (spec §2, 4806). */
export function useSupplierAccess(): SupplierAccess {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const ownerType: OwnerType = account?.type === 'MCN' ? 'MCN' : 'KOL';
  const q = useLiveQuery(() => profileService.getProfile(accountId), [accountId]);
  const profile = q.data?.profile;
  const approved = profile?.status === 'APPROVED' && (ownerType === 'MCN' || !!(profile as { kolId?: string }).kolId);
  return { accountId, ownerType, status: profile?.status, approved, loading: q.loading && !q.data };
}

const GATE: Record<Exclude<ProfileStatus, 'APPROVED'>, { title: string; text: string }> = {
  DRAFT: {
    title: 'Hoàn thiện hồ sơ để hợp tác với Nhãn hàng',
    text: 'Hồ sơ của bạn chưa được gửi xét duyệt. Bạn vẫn xem được Sàn chiến dịch; ứng tuyển và nhận booking khi hồ sơ đã được duyệt.',
  },
  SUBMITTED: {
    title: 'Hồ sơ đang được xét duyệt',
    text: 'Bạn vẫn xem được Sàn chiến dịch. Sau khi hồ sơ được duyệt, bạn có thể ứng tuyển và nhận lời mời từ Nhãn hàng.',
  },
  NEEDS_FIX: {
    title: 'Hồ sơ cần bổ sung',
    text: 'Bổ sung theo yêu cầu và gửi lại hồ sơ. Khi hồ sơ được duyệt, bạn có thể ứng tuyển và nhận booking.',
  },
  REJECTED: {
    title: 'Hồ sơ không được duyệt',
    text: 'Chỉ KOL/MCN có hồ sơ đã duyệt mới ứng tuyển và nhận booking. Xem lý do và hướng dẫn ở Tổng quan hồ sơ.',
  },
};

/** Friendly notice for suppliers whose profile is not approved, linking to "Tổng quan hồ sơ". */
export function SupplierGate({ ownerType, status, compact }: { ownerType: OwnerType; status?: ProfileStatus; compact?: boolean }) {
  if (!status || status === 'APPROVED') return null;
  const g = GATE[status];
  return (
    <Alert>
      <Info className="size-4" aria-hidden />
      <AlertTitle>{g.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{g.text}</p>
        {!compact && (
          <Link to={profilePath(ownerType, 'tong-quan')} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
            Tổng quan hồ sơ
          </Link>
        )}
        {compact && (
          <Link to={profilePath(ownerType, 'tong-quan')} className="font-medium text-primary underline-offset-4 hover:underline">
            Xem Tổng quan hồ sơ
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}
