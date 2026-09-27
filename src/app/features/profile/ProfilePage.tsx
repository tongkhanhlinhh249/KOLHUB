import { useCallback } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { AlertCircle, RotateCcw } from 'lucide-react';
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
import { ProfileHeader } from './ProfileHeader';
import { isProfileSection, profilePath, type ProfileSection } from './primaryAction';

/**
 * /ho-so-kol and /ho-so-mcn: send to the first section, translating legacy ?tab=… links
 * (and ?them=1 for the channels page) to the matching sub-route.
 */
export function ProfileIndexRedirect({ ownerType }: { ownerType: OwnerType }) {
  const [params] = useSearchParams();
  const raw = params.get('tab');
  const section: ProfileSection = isProfileSection(raw) ? raw : 'lien-he';
  return <Navigate to={profilePath(ownerType, section, { openAddChannel: params.get('them') === '1' })} replace />;
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải hồ sơ">
      <Skeleton className="h-32 w-full rounded-lg md:h-48" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/** Shared KOL/MCN profile section page (sidebar item): header (SCR-03) + one section. */
export function ProfilePage({ ownerType, section }: { ownerType: OwnerType; section: ProfileSection }) {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const [params, setParams] = useSearchParams();

  const q = useLiveQuery(
    async () => {
      const [view, ekyc, channels] = await Promise.all([
        profileService.getProfile(accountId),
        ownerType === 'KOL' ? ekycService.getState(accountId) : Promise.resolve(undefined),
        channelService.list(accountId),
      ]);
      return { view, ekyc, channels };
    },
    [accountId, ownerType],
  );

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
      {q.loading && !q.data ? (
        <PageSkeleton />
      ) : q.error || !q.data ? (
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
          <ProfileHeader
            view={q.data.view}
            ekyc={q.data.ekyc}
            hasNeedsFixChannel={q.data.channels.some((c) => c.status === 'NEEDS_FIX')}
          />
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
