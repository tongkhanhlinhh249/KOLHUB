import { useSearchParams } from 'react-router';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../auth/AuthContext';
import { channelService, ekycService, profileService, type OwnerType } from '../../services';
import { ChannelsTab } from '../channels/ChannelsTab';
import { KolIdentityTab } from '../kol-profile/KolIdentityTab';
import { McnIdentityTab } from '../mcn-profile/McnIdentityTab';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ContactTab } from './ContactTab';
import { ProfileHeader } from './ProfileHeader';
import type { ProfileTab } from './primaryAction';

const TABS: { value: ProfileTab; label: string; short: string }[] = [
  { value: 'lien-he', label: 'Thông tin liên hệ', short: 'Liên hệ' },
  { value: 'dinh-danh', label: 'Thông tin định danh', short: 'Định danh' },
  { value: 'kenh', label: 'Quản lý kênh', short: 'Kênh' },
];

const isTab = (v: string | null): v is ProfileTab => TABS.some((t) => t.value === v);

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
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/** Shared KOL/MCN profile page: header (SCR-03) + 3 tabs driven by ?tab=. */
export function ProfilePage({ ownerType }: { ownerType: OwnerType }) {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: ProfileTab = isTab(raw) ? raw : 'lien-he';

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

  const setTab = (t: ProfileTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

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
            onNavigate={setTab}
          />
          <Tabs value={tab} onValueChange={(v) => isTab(v) && setTab(v)}>
            <TabsList className="grid h-11 w-full grid-cols-3 md:inline-flex md:h-10 md:w-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="h-9 md:h-8">
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="lien-he" className="mt-4">
              <ContactTab view={q.data.view} />
            </TabsContent>
            <TabsContent value="dinh-danh" className="mt-4">
              {q.data.view.profile.ownerType === 'KOL' && q.data.ekyc ? (
                <KolIdentityTab accountId={accountId} view={q.data.view} ekyc={q.data.ekyc} />
              ) : (
                <McnIdentityTab accountId={accountId} view={q.data.view} />
              )}
            </TabsContent>
            <TabsContent value="kenh" className="mt-4">
              <ChannelsTab accountId={accountId} profileStatus={q.data.view.profile.status} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
