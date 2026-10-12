import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { campaignService, CAMPAIGN_TYPE_LABEL, type CampaignView } from '../services';
import { errText } from '../features/campaigns/CampaignParts';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { ReasonDialog } from '../features/violations/ReasonDialog';
import { DemoPanelSection } from './DemoPanelSection';

type Decision = { c: CampaignView; outcome: 'NEEDS_FIX' | 'REJECTED' };

const FIELD_LABEL: Record<string, string> = { name: 'tên', cover: 'ảnh', objective: 'mô tả giới thiệu' };

/**
 * Demo Panel › Admin: kiểm duyệt trước đăng (EP-02 §6.3) — campaigns sent for review and edits of OPEN campaigns.
 * Duyệt · Cần bổ sung · Không được duyệt (the last two need a reason). An edit is applied or dropped.
 */
export function CampaignReviewBlock() {
  const q = useLiveQuery(() => campaignService.listReviewQueue(), []);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const items = q.data ?? [];

  const approve = async (c: CampaignView) => {
    setBusy(c.id);
    try {
      const v = await campaignService.approveReview(c.id);
      if (c.pendingRevision) toast.success('Đã duyệt bản sửa: nội dung mới đã công khai');
      else if (v.status === 'OPEN') toast.success('Đã duyệt: chiến dịch Đang tuyển và lên Sàn');
      else toast.warning('Hạn ứng tuyển đã qua: chiến dịch chuyển Cần bổ sung để Nhãn hàng cập nhật');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const decide = async (note: string) => {
    if (!decision) return;
    await campaignService.decideReview(decision.c.id, decision.outcome, note);
    toast.success(decision.c.pendingRevision ? 'Đã từ chối bản sửa' : decision.outcome === 'NEEDS_FIX' ? 'Đã yêu cầu bổ sung' : 'Đã từ chối đăng');
  };

  return (
    <DemoPanelSection title="Duyệt chiến dịch" description="Admin kiểm duyệt trước khi chiến dịch lên Sàn, và duyệt bản sửa của chiến dịch đang tuyển." count={items.length}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Không có chiến dịch chờ duyệt.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => {
            const revision = c.pendingRevision;
            const fields = revision ? Object.keys(revision.patch).map((k) => FIELD_LABEL[k] ?? k) : [];
            return (
              <li key={c.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.brand.company} · {CAMPAIGN_TYPE_LABEL[c.type ?? 'BOOKING']} ·{' '}
                    {revision ? `Bản sửa: ${fields.join(', ')}${revision.pausesApplications ? ' (đang tạm ngừng nhận đơn)' : ''}` : 'Gửi đăng lần đầu / gửi lại'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="h-11 md:h-8" disabled={busy === c.id} onClick={() => void approve(c)}>
                    Duyệt
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-11 md:h-8" disabled={busy === c.id} onClick={() => setDecision({ c, outcome: 'NEEDS_FIX' })}>
                    {revision ? 'Từ chối bản sửa' : 'Cần bổ sung'}
                  </Button>
                  {!revision && (
                    <Button type="button" size="sm" variant="outline" className="h-11 md:h-8" disabled={busy === c.id} onClick={() => setDecision({ c, outcome: 'REJECTED' })}>
                      Không được duyệt
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ReasonDialog
        open={decision !== null}
        onOpenChange={(o) => !o && setDecision(null)}
        title={decision?.c.pendingRevision ? 'Từ chối bản sửa' : decision?.outcome === 'NEEDS_FIX' ? 'Yêu cầu bổ sung' : 'Không duyệt đăng'}
        description="Lý do được gửi cho Nhãn hàng và hiện ở trang chiến dịch."
        label="Lý do"
        placeholder="VD: Thiếu căn cứ đại diện thương hiệu; brief chưa nêu yêu cầu nội dung bắt buộc"
        confirmLabel="Gửi"
        maxLength={1000}
        destructive={decision?.outcome === 'REJECTED'}
        onConfirm={decide}
      />
    </DemoPanelSection>
  );
}
