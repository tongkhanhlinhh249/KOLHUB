import { useCallback, useEffect } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { AlertCircle, AlertTriangle, ChevronRight, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../auth/AuthContext';
import { channelService, ekycService, mcnKolService, profileService, type McnKolRow, type OwnerType } from '../../services';
import { ChannelsTab } from '../channels/ChannelsTab';
import { KolIdentityTab } from '../kol-profile/KolIdentityTab';
import { McnIdentityTab } from '../mcn-profile/McnIdentityTab';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ContactTab } from './ContactTab';
import { ProfileOverview } from './ProfileOverview';
import { ProfileInfoNav, ProfileInfoSection } from './ProfileInfoSections';
import { ReturnToCampaign } from '../supplier-booking/ReturnToCampaign';
import { infoPath, isProfileAnchor, legacySectionPath, profilePath, type ProfileAnchor, type ProfileSection } from './primaryAction';

/**
 * /ho-so-kol and /ho-so-mcn: send to "Tổng quan hồ sơ" (tong-quan), translating legacy ?tab=… links
 * (and ?them=1 for the channels page) to the matching sub-route (lien-he/dinh-danh → "Thông tin hồ sơ").
 */
export function ProfileIndexRedirect({ ownerType }: { ownerType: OwnerType }) {
  const [params] = useSearchParams();
  return <Navigate to={legacySectionPath(ownerType, params.get('tab'), { openAddChannel: params.get('them') === '1' })} replace />;
}

/** Old /lien-he and /dinh-danh routes (merged into "Thông tin hồ sơ"): land on their block. */
export function LegacySectionRedirect({ ownerType, anchor }: { ownerType: OwnerType; anchor: ProfileAnchor }) {
  return <Navigate to={infoPath(ownerType, anchor)} replace />;
}

/**
 * Scroll to the #block of "Thông tin hồ sơ" once the page content is rendered and on every hash link
 * (react-router does not scroll to hashes by itself). `location.key` re-runs it for a repeated link.
 */
function useScrollToHash(ready: boolean) {
  const { hash, key } = useLocation();
  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!ready || !isProfileAnchor(id)) return;
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [hash, key, ready]);
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

/** Slim pointer on section pages while the review asked for fixes; details live on "Tổng quan hồ sơ". */
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
 * Shared KOL/MCN profile section page (sidebar item). "Tổng quan hồ sơ" (tong-quan) shows the header
 * (SCR-03), submit and review status; the other sections start directly with their content.
 */
export function ProfilePage({ ownerType, section }: { ownerType: OwnerType; section: ProfileSection }) {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const [params, setParams] = useSearchParams();
  const isOverview = section === 'tong-quan';
  const isInfo = section === 'thong-tin';

  // Profile (+ KOL eKYC state) for every section; channels (+ MCN: KOLs holding its channels) only for
  // the overview (the channels / KOL pages load their own lists). The page instance is reused across
  // sections, so `withChannels` tells whether the data in hand already has them. Live: edits on any tab
  // (or the Admin simulator) refresh the overview.
  const q = useLiveQuery(
    async () => {
      const [view, ekyc, channels, kols] = await Promise.all([
        profileService.getProfile(accountId),
        ownerType === 'KOL' ? ekycService.getState(accountId) : Promise.resolve(undefined),
        isOverview ? channelService.list(accountId) : Promise.resolve([]),
        isOverview && ownerType === 'MCN' ? mcnKolService.listKols(accountId) : Promise.resolve([] as McnKolRow[]),
      ]);
      return { view, ekyc, channels, kols, withChannels: isOverview };
    },
    [accountId, ownerType, isOverview],
  );
  const ready = !!q.data && (!isOverview || q.data.withChannels);
  useScrollToHash(isInfo && ready);

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

  // Same width as the other wide pages (Danh sách kênh, Chiến dịch) so no space is wasted on either side.
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
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
          {isOverview && <ProfileOverview view={q.data.view} ekyc={q.data.ekyc} channels={q.data.channels} kols={q.data.kols} />}
          {!isOverview && q.data.view.profile.status === 'NEEDS_FIX' && <NeedsFixNotice ownerType={q.data.view.profile.ownerType} />}
          <div>
            {isInfo && (
              <div className="space-y-4">
                <ProfileInfoNav ownerType={q.data.view.profile.ownerType} />
                <ProfileInfoSection id="dinh-danh" label={q.data.view.profile.ownerType === 'KOL' ? 'Xác thực danh tính' : 'Xác thực tổ chức'}>
                  {q.data.view.profile.ownerType === 'KOL' && q.data.ekyc ? (
                    <KolIdentityTab accountId={accountId} view={q.data.view} ekyc={q.data.ekyc} />
                  ) : (
                    <McnIdentityTab accountId={accountId} view={q.data.view} />
                  )}
                </ProfileInfoSection>
                <ContactTab view={q.data.view} />
              </div>
            )}
            {section === 'kenh' && <ReturnToCampaign />}
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
