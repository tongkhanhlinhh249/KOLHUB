import { useCallback } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { AlertCircle, AlertTriangle, ChevronRight, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../auth/AuthContext';
import { channelService, ekycService, profileService, type OwnerType } from '../../services';
import { ChannelsTab } from '../channels/ChannelsTab';
import { KolIdentityTab } from '../kol-profile/KolIdentityTab';
import { McnIdentityTab } from '../mcn-profile/McnIdentityTab';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ContactTab } from './ContactTab';
import { ProfileOverview } from './ProfileOverview';
import { DEFAULT_PROFILE_SECTION, isProfileSection, profilePath, type ProfileSection } from './primaryAction';

/**
 * /ho-so-kol and /ho-so-mcn: send to "Gửi hồ sơ xác thực" (tong-quan), translating legacy ?tab=… links
 * (and ?them=1 for the channels page) to the matching sub-route.
 */
export function ProfileIndexRedirect({ ownerType }: { ownerType: OwnerType }) {
  const [params] = useSearchParams();
  const raw = params.get('tab');
  const section: ProfileSection = isProfileSection(raw) ? raw : DEFAULT_PROFILE_SECTION;
  return <Navigate to={profilePath(ownerType, section, { openAddChannel: params.get('them') === '1' })} replace />;
}

function PageSkeleton({ withHeader }: { withHeader: boolean }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải hồ sơ">
      {withHeader && (
        <>
          <Skeleton className="h-32 w-full rounded-lg md:h-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </>
      )}
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/** Slim pointer on section pages while the review asked for fixes; details live on "Gửi hồ sơ xác thực". */
function NeedsFixNotice({ ownerType }: { ownerType: OwnerType }) {
  return (
    <Alert className="border-chart-5/50 bg-chart-5/10">
      <AlertTriangle className="size-4 text-chart-5" aria-hidden />
      <AlertDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-foreground">
        <span>Hồ sơ cần bổ sung theo yêu cầu xét duyệt.</span>
        <Link
          to={profilePath(ownerType, 'tong-quan')}
          className="inline-flex items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Xem yêu cầu và gửi lại
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Shared KOL/MCN profile section page (sidebar item). "Gửi hồ sơ xác thực" (tong-quan) shows the header
 * (SCR-03), submit and review status; the other sections start directly with their content.
 */
export function ProfilePage({ ownerType, section }: { ownerType: OwnerType; section: ProfileSection }) {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const [params, setParams] = useSearchParams();
  const isOverview = section === 'tong-quan';

  // Profile (+ KOL eKYC state) for every section; channels only for the overview (the channels page
  // loads its own list). The page instance is reused across sections, so `withChannels` tells whether
  // the data in hand already has them.
  const q = useLiveQuery(
    async () => {
      const [view, ekyc, channels] = await Promise.all([
        profileService.getProfile(accountId),
        ownerType === 'KOL' ? ekycService.getState(accountId) : Promise.resolve(undefined),
        isOverview ? channelService.list(accountId) : Promise.resolve([]),
      ]);
      return { view, ekyc, channels, withChannels: isOverview };
    },
    [accountId, ownerType, isOverview],
  );
  const ready = !!q.data && (!isOverview || q.data.withChannels);

  // ?them=1 asks the channels page to open its add sheet once (header "Thêm kênh").
  const openAddChannel = section === 'kenh' && params.get('them') === '1';

  const consumeOpenAddChannel = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('them');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      {q.loading && !ready ? (
        <PageSkeleton withHeader={isOverview} />
      ) : q.error || !q.data || !ready ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Không tải được hồ sơ</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Đã có lỗi xảy ra. Vui lòng thử lại.</p>
            <Button type="button" variant="outline" size="sm" onClick={q.reload}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {isOverview && <ProfileOverview view={q.data.view} ekyc={q.data.ekyc} channels={q.data.channels} />}
          {!isOverview && q.data.view.profile.status === 'NEEDS_FIX' && <NeedsFixNotice ownerType={q.data.view.profile.ownerType} />}
          <div>
            {section === 'lien-he' && <ContactTab view={q.data.view} />}
            {section === 'dinh-danh' &&
              (q.data.view.profile.ownerType === 'KOL' && q.data.ekyc ? (
                <KolIdentityTab accountId={accountId} view={q.data.view} ekyc={q.data.ekyc} />
              ) : (
                <McnIdentityTab accountId={accountId} view={q.data.view} />
              ))}
            {section === 'kenh' && (
              <ChannelsTab
                accountId={accountId}
                profileStatus={q.data.view.profile.status}
                fields={q.data.view.profile.contact.fields}
                region={q.data.view.profile.contact.province || undefined}
                openAddRequest={openAddChannel}
                onOpenAddConsumed={consumeOpenAddChannel}
                filterMode={q.data.view.profile.ownerType === 'MCN' ? 'status' : 'full'}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
