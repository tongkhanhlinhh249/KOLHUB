import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { campaignService, CAMPAIGN_STATUS_LABEL, CAMPAIGN_TYPE_LABEL, reviewVersionOf, type CampaignView } from '../services';
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
      // Công bố lên sàn §4.1: decide on the version shown here (refused if the brand withdrew / resubmitted meanwhile).
      const v = await campaignService.approveReview(c.id, reviewVersionOf(c));
      if (c.pendingRevision) toast.success('Đã duyệt bản sửa: nội dung mới đã công khai');
      else if (v.status === 'OPEN') toast.success(v.visibility === 'MARKETPLACE' ? 'Đã duyệt: chiến dịch tự công bố lên Sàn và Đang tuyển' : 'Đã duyệt: chiến dịch Đang tuyển (riêng tư)');
      else toast.warning('Hạn ứng tuyển đã qua: chiến dịch chuyển Cần bổ sung để Nhãn hàng cập nhật');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const decide = async (note: string) => {
    if (!decision) return;
    await campaignService.decideReview(decision.c.id, decision.outcome, note, reviewVersionOf(decision.c));
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

/**
 * Demo Panel › Admin: ẩn/gỡ khỏi Sàn và khôi phục (Công bố lên sàn §12.3). Hiding needs a reason, stops new applications
 * and keeps applications / bookings; restoring never reopens a campaign that closed, expired or completed meanwhile.
 */
export function MarketplaceModerationBlock() {
  const q = useLiveQuery(() => campaignService.listPublishedForModeration(), []);
  const [hiding, setHiding] = useState<CampaignView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const items = q.data ?? [];
  const hidden = items.filter((c) => c.hiddenAt !== undefined).length;

  const restore = async (c: CampaignView) => {
    setBusy(c.id);
    try {
      const v = await campaignService.restoreToMarketplace(c.id);
      toast.success(v.status === 'OPEN' ? 'Đã hiển thị lại: chiến dịch quay lại Sàn nếu còn hạn' : `Đã hiển thị lại trang công khai (${CAMPAIGN_STATUS_LABEL[v.status]}, không mở lại tuyển)`);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DemoPanelSection title="Ẩn/gỡ khỏi Sàn" description="Admin ẩn chiến dịch vi phạm khỏi Sàn (cần lý do) và khôi phục. Đơn và hợp tác đã có được giữ." count={hidden || undefined}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có chiến dịch công khai trên Sàn.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => {
            const isHidden = c.hiddenAt !== undefined;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CAMPAIGN_STATUS_LABEL[c.status]}
                    {isHidden ? ` · Đang ẩn: ${c.hiddenReason}` : ''}
                  </p>
                </div>
                {isHidden ? (
                  <Button type="button" size="sm" variant="outline" className="h-11 md:h-8" disabled={busy === c.id} onClick={() => void restore(c)}>
                    Hiển thị lại
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="h-11 text-destructive hover:text-destructive md:h-8" onClick={() => setHiding(c)}>
                    Ẩn khỏi Sàn
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ReasonDialog
        open={hiding !== null}
        onOpenChange={(o) => !o && setHiding(null)}
        title="Ẩn chiến dịch khỏi Sàn"
        description="Chiến dịch rời Sàn và ngừng nhận đơn mới; đơn và hợp tác đã có được giữ. Lý do được gửi cho Nhãn hàng (trong ứng dụng và email)."
        label="Lý do"
        placeholder="VD: Nội dung chiến dịch quảng bá sản phẩm chưa được cấp phép"
        confirmLabel="Ẩn khỏi Sàn"
        maxLength={1000}
        destructive
        onConfirm={async (note) => {
          if (!hiding) return;
          await campaignService.hideFromMarketplace(hiding.id, note);
          toast.success('Đã ẩn chiến dịch khỏi Sàn');
        }}
      />
    </DemoPanelSection>
  );
}
