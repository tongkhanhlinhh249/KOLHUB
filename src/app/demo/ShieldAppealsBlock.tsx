import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { kolSafetyReportService, SHIELD_WINDOW, type ShieldAppealItem } from '../services';
import { PlatformIcon } from '../features/biz-search/PlatformIcon';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { ReasonDialog } from '../features/violations/ReasonDialog';
import { DemoPanelSection } from './DemoPanelSection';

type Decision = { item: ShieldAppealItem; accept: boolean };

/** Demo Panel › Admin: pending "Khiên An toàn" appeals, decided by the KOLHUB operations team. */
export function ShieldAppealsBlock() {
  const q = useLiveQuery(() => kolSafetyReportService.listShieldAppeals(), []);
  const [decision, setDecision] = useState<Decision | null>(null);
  const items = q.data ?? [];

  const decide = async (note: string) => {
    if (!decision) return;
    try {
      await kolSafetyReportService.decideShieldAppeal(decision.item.accountId, decision.item.channelId, decision.accept, note);
      toast.success(decision.accept ? 'Đã chấp nhận khiếu nại — khiên được cấp lại' : 'Đã từ chối khiếu nại');
      setDecision(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không xử lý được khiếu nại.');
    }
  };

  return (
    <DemoPanelSection title="Khiếu nại Khiên An toàn" description="Đội vận hành KOLHUB xét khi KOL/MCN cho rằng KOL Safety nhận nhầm." count={items.length}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Không có khiếu nại đang chờ.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={`${it.accountId}-${it.channelId}`} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">
                <PlatformIcon platform={it.platform} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    @{it.handle} · {it.ownerName}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {SHIELD_WINDOW} nội dung gần nhất: {it.window.violation} vi phạm · {it.window.gray} cần xem lại
                  </p>
                </div>
              </div>
              <p className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-foreground">“{it.appeal.note}”</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="h-11 md:h-8" onClick={() => setDecision({ item: it, accept: true })}>
                  Chấp nhận
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-11 md:h-8" onClick={() => setDecision({ item: it, accept: false })}>
                  Từ chối
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ReasonDialog
        open={decision !== null}
        onOpenChange={(o) => !o && setDecision(null)}
        title={decision?.accept ? 'Chấp nhận khiếu nại' : 'Từ chối khiếu nại'}
        description={decision?.accept ? 'Khiên An toàn của kênh được cấp lại.' : 'Khiên giữ nguyên trạng thái; hạn xử lý tiếp tục.'}
        label="Ghi chú cho KOL/MCN"
        placeholder={decision?.accept ? 'VD: Đã xem lại, video là cảnh nấu ăn' : 'VD: Video có từ ngữ tục tĩu ở giây 12'}
        confirmLabel={decision?.accept ? 'Chấp nhận' : 'Từ chối'}
        minLength={0}
        maxLength={500}
        destructive={decision ? !decision.accept : false}
        onConfirm={decide}
      />
    </DemoPanelSection>
  );
}
