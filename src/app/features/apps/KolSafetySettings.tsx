import { useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { cn } from '../../components/ui/utils';
import { KOL_SAFETY_PLANS, kolSafetyReportService, SHIELD_MAX_GRAY, SHIELD_WINDOW, type KolSafetyPlanKey, type KolSafetySettingsView } from '../../services';
import { errText } from '../campaigns/CampaignParts';

/**
 * KOL/MCN "Ứng dụng › KOL Safety": app switch (off hides scanning, Khiên An toàn actions and stops sharing scores
 * with brands; shields already granted stay public) and the plan ("Miễn phí" / "Bảo vệ", demo switch, no payment).
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
  const choose = async (plan: KolSafetyPlanKey) => {
    setBusy(plan);
    try {
      await kolSafetyReportService.setPlan(accountId, plan);
      toast.success(`Đã chuyển sang gói ${KOL_SAFETY_PLANS.find((p) => p.key === plan)?.name}`, { description: 'Demo: chưa thanh toán thật.' });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="kol-safety-settings" className="space-y-4 rounded-[8px] border border-border bg-card p-4">
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

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Gói KOL Safety</h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {KOL_SAFETY_PLANS.map((p) => {
            const current = settings.plan.key === p.key;
            return (
              <li key={p.key} className={cn('flex flex-col gap-3 rounded-[8px] border p-3', current ? 'border-primary bg-primary/5' : 'border-border')}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{p.price}</span>
                </div>
                <ul className="flex-1 space-y-1 text-sm text-foreground/90">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                {current ? (
                  <p className="text-xs font-medium text-primary">Gói đang dùng</p>
                ) : (
                  <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy !== null} onClick={() => void choose(p.key)}>
                    {busy === p.key && <Loader2 className="animate-spin" aria-hidden />}
                    Dùng gói {p.name}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">Xin Khiên An toàn và khiếu nại luôn miễn phí. Giá gói Bảo vệ sẽ công bố sau (demo chuyển gói không thanh toán).</p>
      </div>
    </section>
  );
}
