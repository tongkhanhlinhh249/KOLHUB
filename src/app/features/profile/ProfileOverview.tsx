import { useMemo } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import type { Channel, EkycView, McnKolRow, ProfileView } from '../../services';
import { KOL_PLEDGES, MCN_PLEDGES } from '../kol-profile/ekycCopy';
import { ReviewStatusBox } from '../review-status/ReviewStatusBox';
import { OverviewGrid } from './OverviewGrid';
import { overviewSections, type OverviewSection } from './overviewSections';
import { ProfileHeader } from './ProfileHeader';
import { profilePath } from './primaryAction';
import { SubmitPanel } from './SubmitPanel';
import { SUBMIT_ANCHOR } from './submitAnchor';

const NO_KOLS: McnKolRow[] = [];
const linkClass = 'inline-flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline';

/**
 * Submit card: missing items (from the overview sections) + pledges + "Gửi xét duyệt" while the profile can
 * be (re)submitted, else a short summary.
 */
function SubmitCard({ view, sections }: { view: ProfileView; sections: OverviewSection[] }) {
  const { profile } = view;
  const canSubmit = profile.status === 'DRAFT' || profile.status === 'NEEDS_FIX';
  const resubmit = profile.status === 'NEEDS_FIX';

  return (
    <Card id={SUBMIT_ANCHOR} className="scroll-mt-20 gap-4 py-4 md:py-5">
      <CardHeader className="px-4 md:px-6">
        <CardTitle className="text-base">{resubmit ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ xét duyệt'}</CardTitle>
        {canSubmit && (
          <CardDescription>
            {resubmit
              ? 'Cập nhật theo yêu cầu bổ sung, tick đủ cam đoan rồi gửi lại hồ sơ.'
              : 'Hoàn thiện đủ các mục ở Tổng quan hồ sơ và tick 3 cam đoan để gửi hồ sơ xét duyệt.'}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        {canSubmit ? (
          <SubmitPanel
            key={profile.status}
            ownerType={profile.ownerType}
            accountId={profile.accountId}
            sections={sections}
            pledges={profile.ownerType === 'KOL' ? KOL_PLEDGES : MCN_PLEDGES}
            resubmit={resubmit}
          />
        ) : (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-chart-4" aria-hidden />
              Đã gửi hồ sơ{profile.submittedAt ? ` ngày ${format(profile.submittedAt, 'dd/MM/yyyy')}` : ''}
            </p>
            {profile.status === 'SUBMITTED' && (
              <p className="text-muted-foreground">Bạn không cần thao tác thêm. Kết quả sẽ hiển thị ở mục Trạng thái xét duyệt.</p>
            )}
            {profile.status === 'APPROVED' && (
              <p className="text-muted-foreground">
                Hồ sơ đã được xác thực. Bạn có thể tiếp tục thêm kênh.{' '}
                <Link to={profilePath(profile.ownerType, 'kenh', { openAddChannel: true })} className={linkClass}>
                  Thêm kênh
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </p>
            )}
            {profile.status === 'REJECTED' && (
              <p className="text-muted-foreground">Hồ sơ không được duyệt. Xem lý do ở mục Trạng thái xét duyệt.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * "Gửi hồ sơ xác thực" (/ho-so-kol|mcn/tong-quan): profile header (SCR-03), "Tổng quan hồ sơ" (one card per
 * tab with its submit requirements), then the submit card and "Trạng thái xét duyệt" side by side on wide
 * containers. The card that needs the user's attention comes first (submit while it can be sent, review
 * status afterwards). Overview cards and the submit button share the same checklist items.
 */
export function ProfileOverview({
  view,
  ekyc,
  channels,
  kols = NO_KOLS,
}: {
  view: ProfileView;
  ekyc?: EkycView;
  channels: Channel[];
  /** MCN only: KOLs holding its channels. */
  kols?: McnKolRow[];
}) {
  const canSubmit = view.profile.status === 'DRAFT' || view.profile.status === 'NEEDS_FIX';
  const sections = useMemo(() => overviewSections({ view, ekyc, channels, kols }), [view, ekyc, channels, kols]);
  const submit = <SubmitCard view={view} sections={sections} />;
  const status = <ReviewStatusBox profile={view.profile} channels={channels} />;

  return (
    <div className="@container space-y-4">
      <ProfileHeader view={view} ekyc={ekyc} hasNeedsFixChannel={channels.some((c) => c.status === 'NEEDS_FIX')} />
      <OverviewGrid ownerType={view.profile.ownerType} sections={sections} status={view.profile.status} channels={channels} kols={kols} />
      <div className="grid items-start gap-4 @3xl:grid-cols-[3fr_2fr]">
        {canSubmit ? (
          <>
            {submit}
            {status}
          </>
        ) : (
          <>
            {status}
            {submit}
          </>
        )}
      </div>
    </div>
  );
}
