import { useState } from 'react';
import { ArrowRightLeft, Loader2, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { DEMO_ACCOUNTS, demoService, profileService } from '../services';
import { ProfileStatusBadge } from '../features/shared/StatusBadges';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { DemoPanelSection } from './DemoPanelSection';
import { EkycScenarioPicker } from './EkycScenarioPicker';
import { sampleProfileAccess, showsEkyc } from './demoTabs';
import { useRoleSwitch } from './RoleSwitcher';

/**
 * "Hồ sơ" of the KOL / MCN tab: "Điền nhanh hồ sơ mẫu" for the new sample profile (fills every required and
 * recommended item of a DRAFT / NEEDS_FIX profile, never submits) and, for KOL, the eKYC result picker.
 * On another account it offers to switch to the new sample profile instead.
 */
export function SampleProfileBlock({ tab, onDone }: { tab: 'kol' | 'mcn'; onDone(): void }) {
  const { account } = useAuth();
  const { current, busy: switching, switchTo } = useRoleSwitch(onDone);
  const access = sampleProfileAccess(tab, current?.key);
  const owner = access?.kind === 'use' && account ? account : null;
  const q = useLiveQuery(() => (owner ? profileService.getProfile(owner.id) : Promise.resolve(null)), [owner?.id]);
  const [busy, setBusy] = useState(false);
  if (!access) return null;

  const status = q.data?.profile.status;
  const editable = status === 'DRAFT' || status === 'NEEDS_FIX';

  const fill = async () => {
    if (!owner) return;
    setBusy(true);
    try {
      await demoService.fillSampleProfile(owner.id);
      toast.success('Đã điền hồ sơ mẫu');
    } catch {
      toast.error('Không thể điền hồ sơ mẫu ở trạng thái hiện tại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DemoPanelSection
      title="Hồ sơ mới"
      description={
        tab === 'kol' ? 'Điền liên hệ, nhân sự, eKYC thành công và 2 kênh mẫu. Không tự gửi.' : 'Điền định danh, GCN, liên hệ, nhân sự, 2 kênh mẫu. Không tự gửi.'
      }
    >
      {access.kind === 'use' ? (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Trạng thái: {status ? <ProfileStatusBadge status={status} /> : <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          </div>
          {(editable || !q.data) && (
            <Button type="button" className="h-11 w-full md:h-9" disabled={!editable || busy} onClick={() => void fill()}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <WandSparkles aria-hidden />}
              Điền nhanh hồ sơ mẫu
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {editable || !q.data
              ? 'Sau đó tick 3 cam đoan, bấm “Gửi xét duyệt” rồi duyệt ở tab Admin.'
              : status === 'SUBMITTED'
                ? 'Hồ sơ đang chờ duyệt: duyệt ở tab Admin.'
                : 'Điền nhanh chỉ dùng khi hồ sơ đang soạn hoặc cần bổ sung.'}
          </p>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full justify-start whitespace-normal text-left md:min-h-9"
          disabled={switching !== null}
          onClick={() => void switchTo(access.to)}
        >
          {switching ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowRightLeft aria-hidden />}
          Chuyển sang {DEMO_ACCOUNTS.find((d) => d.key === access.to)?.label} để dùng
        </Button>
      )}
      {showsEkyc(tab) && <EkycScenarioPicker />}
    </DemoPanelSection>
  );
}
