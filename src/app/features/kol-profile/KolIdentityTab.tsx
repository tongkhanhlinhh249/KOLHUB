import type { EkycView, ProfileView } from '../../services';
import { ReviewStatusBox } from '../review-status/ReviewStatusBox';
import { EkycStepper } from './EkycStepper';

/** SCR-05 — KOL identity tab: eKYC stepper + submit (Box 1) and review status (Box 2). */
export function KolIdentityTab({ accountId, view, ekyc }: { accountId: string; view: ProfileView; ekyc: EkycView }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
      <EkycStepper accountId={accountId} view={view} ekyc={ekyc} />
      <ReviewStatusBox profile={view.profile} />
    </div>
  );
}
