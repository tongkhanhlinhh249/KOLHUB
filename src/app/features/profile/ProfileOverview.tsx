import { useMemo, useState } from 'react';
import type { Channel, EkycView, McnKolRow, ProfileView } from '../../services';
import { ReviewStatusBox } from '../review-status/ReviewStatusBox';
import { OverviewGrid } from './OverviewGrid';
import { overviewSections } from './overviewSections';
import { ProfileHeader } from './ProfileHeader';
import { ServiceBanner } from './ServiceBanner';
import { SubmitDialog } from './SubmitDialog';
import { CampaignWorkspace, SavedCampaignsStrip } from '../creator/CampaignWorkspace';

const NO_KOLS: McnKolRow[] = [];
/**
 * "Tổng quan hồ sơ" (/ho-so-kol|mcn/tong-quan): cover + one card per tab (2/3), service banner + "Trạng thái
 * xét duyệt" (1/3). The cover's "Gửi xét duyệt" opens the submit modal; overview cards and the submit button
 * share the same checklist items.
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
  const [submitOpen, setSubmitOpen] = useState(false);
  // Campaign workspace only once the profile is approved (KOL: with a KOL ID), like /chien-dich-cua-toi.
  const p = view.profile;
  const approved = p.status === 'APPROVED' && (p.ownerType === 'MCN' || !!(p as { kolId?: string }).kolId);
  const sections = useMemo(() => overviewSections({ view, ekyc, channels, kols }), [view, ekyc, channels, kols]);

  // 2/3 left: cover + one card per tab; 1/3 right: service banner + review status. Submitting happens in a modal.
  return (
    <div className="@container">
      <div className="grid items-start gap-4 @5xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @5xl:gap-6">
        <div className="min-w-0 space-y-4">
          <ProfileHeader view={view} onSubmit={() => setSubmitOpen(true)} />
          {approved && <CampaignWorkspace accountId={p.accountId} />}
          <OverviewGrid
            ownerType={view.profile.ownerType}
            sections={sections}
            status={view.profile.status}
            channels={channels}
            kols={kols}
          />
        </div>
        <aside className="min-w-0 space-y-4" aria-label="Dịch vụ và trạng thái xét duyệt">
          {approved && <SavedCampaignsStrip accountId={p.accountId} />}
          <ServiceBanner />
          <ReviewStatusBox profile={view.profile} channels={channels} />
        </aside>
      </div>
      <SubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} view={view} sections={sections} />
    </div>
  );
}
