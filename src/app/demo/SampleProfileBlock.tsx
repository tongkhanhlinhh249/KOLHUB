import { useState } from 'react';
import { Loader2, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { demoService, profileService } from '../services';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { DemoPanelSection } from './DemoPanelSection';

/**
 * Demo Panel block "Hồ sơ mẫu" (signed-in KOL / MCN): one click fills every required and recommended item
 * of a DRAFT / NEEDS_FIX profile. It never submits — the presenter still ticks the pledges and presses
 * "Gửi xét duyệt", then approves it in "Giả lập Admin".
 */
export function SampleProfileBlock() {
  const { account } = useAuth();
  const owner = account && (account.type === 'KOL' || account.type === 'MCN') ? account : null;
  const q = useLiveQuery(() => (owner ? profileService.getProfile(owner.id) : Promise.resolve(null)), [owner?.id]);
  const [busy, setBusy] = useState(false);
  if (!owner) return null;

  const status = q.data?.profile.status;
  const editable = status === 'DRAFT' || status === 'NEEDS_FIX';

  const fill = async () => {
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
      title="Hồ sơ mẫu"
      description={
        owner.type === 'KOL'
          ? 'Điền liên hệ, nhân sự, eKYC thành công và 2 kênh mẫu kèm ảnh. Không tự gửi hồ sơ.'
          : 'Điền định danh tổ chức, GCN, liên hệ, nhân sự, 2 kênh mẫu và gán 1 kênh cho KOL. Không tự gửi hồ sơ.'
      }
    >
      <Button type="button" className="h-11 w-full" disabled={!editable || busy} onClick={() => void fill()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <WandSparkles aria-hidden />}
        Điền nhanh hồ sơ mẫu
      </Button>
      <p className="text-xs text-muted-foreground">
        {editable || !q.data
          ? 'Sau đó tick 3 cam đoan, bấm “Gửi xét duyệt” rồi duyệt ở mục Giả lập Admin.'
          : 'Chỉ dùng được khi hồ sơ đang soạn hoặc cần bổ sung.'}
      </p>
    </DemoPanelSection>
  );
}
