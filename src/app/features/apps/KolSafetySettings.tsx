import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../../components/ui/switch';
import { kolSafetyReportService, SHIELD_MAX_GRAY, SHIELD_WINDOW, type KolSafetySettingsView } from '../../services';
import { errText } from '../campaigns/CampaignParts';

/**
 * KOL/MCN "Ứng dụng › KOL Safety": app switch (off hides scanning, Khiên An toàn actions and stops sharing scores
 * with brands; shields already granted stay public).
 */
export function KolSafetySettingsCard({ accountId, settings }: { accountId: string; settings: KolSafetySettingsView }) {
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (enabled: boolean) => {
    setBusy('switch');
    try {
      await kolSafetyReportService.setEnabled(accountId, enabled);
      toast.success(enabled ? 'Đã bật KOL Safety' : 'Đã tắt KOL Safety', {
        description: enabled ? 'Tính năng quét nội dung và Khiên An toàn đã hiện lại.' : 'Đã ẩn tính năng quét và ngừng chia sẻ điểm chi tiết cho Nhãn hàng.',
      });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="kol-safety-settings" className="rounded-[8px] border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-emerald-500 text-white">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 id="kol-safety-settings" className="text-base font-semibold text-foreground">
            KOL Safety
          </h2>
          <p className="text-sm text-muted-foreground">
            {settings.enabled
              ? `Đang bật: quét nội dung, chấm điểm và xin Khiên An toàn (${SHIELD_WINDOW} nội dung gần nhất, không Vi phạm, tối đa ${SHIELD_MAX_GRAY} Cần xem lại).`
              : 'Đang tắt: tính năng quét và điểm KOL Safety bị ẩn, không chia sẻ điểm cho Nhãn hàng. Khiên đã có vẫn hiện.'}
          </p>
        </div>
        <Switch checked={settings.enabled} disabled={busy !== null} onCheckedChange={(x) => void toggle(x)} aria-label="Bật KOL Safety" className="mt-1 shrink-0" />
      </div>
    </section>
  );
}
