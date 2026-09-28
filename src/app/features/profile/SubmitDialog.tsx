import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import type { ProfileView } from '../../services';
import { KOL_PLEDGES, MCN_PLEDGES } from '../kol-profile/ekycCopy';
import type { OverviewSection } from './overviewSections';
import { SubmitPanel } from './SubmitPanel';

/**
 * "Gửi hồ sơ xét duyệt" modal, opened from the cover's "Gửi xét duyệt": missing required items (with a jump to
 * the first incomplete card), the 3 pledges and the real submit button. Closes itself once sent.
 */
export function SubmitDialog({
  open,
  onOpenChange,
  view,
  sections,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  view: ProfileView;
  sections: OverviewSection[];
}) {
  const { profile } = view;
  const resubmit = profile.status === 'NEEDS_FIX';

  /** Close first so the page can scroll to the card behind the modal. */
  const goToSection = (anchorId: string) => {
    onOpenChange(false);
    window.setTimeout(() => {
      const el = document.getElementById(anchorId);
      if (!el) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      el.focus({ preventScroll: true });
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{resubmit ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ xét duyệt'}</DialogTitle>
          <DialogDescription>
            {resubmit
              ? 'Cập nhật theo yêu cầu bổ sung, tick đủ cam đoan rồi gửi lại hồ sơ.'
              : 'Hoàn thiện đủ các mục bắt buộc của hồ sơ và tick 3 cam đoan để gửi xét duyệt.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <SubmitPanel
            key={profile.status}
            ownerType={profile.ownerType}
            accountId={profile.accountId}
            sections={sections}
            pledges={profile.ownerType === 'KOL' ? KOL_PLEDGES : MCN_PLEDGES}
            resubmit={resubmit}
            onGoToSection={goToSection}
            onSubmitted={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
