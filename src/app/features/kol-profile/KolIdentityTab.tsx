import type { EkycView, ProfileView } from '../../services';
import { EkycStepper } from './EkycStepper';

/**
 * SCR-05 — KOL identity page: eKYC stepper. Submit and "Trạng thái xét duyệt" live on
 * "Tổng quan hồ sơ" (tong-quan).
 */
export function KolIdentityTab({ accountId, view, ekyc }: { accountId: string; view: ProfileView; ekyc: EkycView }) {
  return <EkycStepper accountId={accountId} view={view} ekyc={ekyc} />;
}
