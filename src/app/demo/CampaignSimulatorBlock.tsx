import { useState } from 'react';
import { ArrowRight, ChevronRight, FastForward, Loader2, RotateCcw, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Switch } from '../components/ui/switch';
import { CAMPAIGN_STATUS_LABEL, demoCampaignService, RECRUIT_PHASE_LABEL, type DemoBookingRow, type DemoCampaignOption, type DemoStep } from '../services';
import { BookingStatusBadge, SupplierTypeBadge } from '../features/campaigns/CampaignParts';
import { formatPrice } from '../features/campaigns/campaignView';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { DemoPanelSection } from './DemoPanelSection';
import { actorName, brandCampaignLink, supplierBookingLink } from './campaignSimulator';
import { useDemoOpen } from './useDemoOpen';

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Không thực hiện được bước này.');

/**
 * "Quản lý chiến dịch": drive a campaign's bookings step by step on behalf of either side, without switching
 * accounts. Steps run through the real booking service (same rules, KOL Safety scan on drafts); every open screen
 * reloads on its own because the demo store is observable.
 */
export function CampaignSimulatorBlock({ onDone }: { onDone(): void }) {
  const campaigns = useLiveQuery(() => demoCampaignService.listCampaigns(), []);
  const [picked, setPicked] = useState<string | null>(null);
  const list = campaigns.data ?? [];
  const campaignId = picked && list.some((c) => c.id === picked) ? picked : list[0]?.id;
  const campaign = list.find((c) => c.id === campaignId);
  const bookings = useLiveQuery(() => (campaignId ? demoCampaignService.listBookings(campaignId) : Promise.resolve([])), [campaignId]);
  const { open, busy: opening } = useDemoOpen(onDone);
  const [running, setRunning] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const locked = running !== null || opening !== null || resetting;

  const run = async (row: DemoBookingRow, step: DemoStep) => {
    setRunning(`${row.view.id}:${step.key}`);
    try {
      await demoCampaignService.run(row.view.id, step.key);
      toast.success(`${step.label}: xong`);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setRunning(null);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      await demoCampaignService.resetCampaigns();
      toast.success('Đã khôi phục chiến dịch mẫu.');
    } finally {
      setResetting(false);
    }
  };

  const brandLink = campaign
    ? brandCampaignLink(
        campaign.id,
        campaign.brandEmail,
        campaign.type === 'OPEN_RECRUITMENT' && (campaign.phase === 'APPLY' || campaign.phase === 'SELECT') ? 'ung-tuyen' : 'booking',
      )
    : null;

  return (
    <DemoPanelSection
      title="Quản lý chiến dịch"
      description="Chạy từng bước thay cho Nhãn hàng hoặc KOL/MCN mà không cần đổi tài khoản. Màn đang mở tự cập nhật."
    >
      {campaigns.loading && !campaigns.data ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Select value={campaignId ?? ''} onValueChange={setPicked} disabled={!list.length}>
          <SelectTrigger className="h-11 w-full md:h-10" aria-label="Chọn chiến dịch">
            <SelectValue placeholder="Chưa có chiến dịch" />
          </SelectTrigger>
          <SelectContent>
            {list.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="truncate">
                  {c.type === 'OPEN_RECRUITMENT' ? '[Tuyển nhiều KOL] ' : ''}
                  {c.name} · {c.bookingCount} booking
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {campaign && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="min-w-0">
            {campaign.brandName} · {CAMPAIGN_STATUS_LABEL[campaign.status]}
          </span>
          {brandLink && (
            <Button type="button" variant="outline" size="sm" className="h-9" disabled={locked} onClick={() => void open(brandLink)}>
              {opening === brandLink.label ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
              Mở chiến dịch (Nhãn hàng)
            </Button>
          )}
        </div>
      )}

      {campaign && <CampaignControls campaign={campaign} locked={locked} />}

      <div className="space-y-2">
        {bookings.loading && !bookings.data ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : !bookings.data?.length ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            {campaign?.type === 'OPEN_RECRUITMENT'
              ? 'Chưa có ứng viên. Bấm “Thêm 3 ứng viên mẫu” trong giai đoạn Ứng tuyển.'
              : 'Chiến dịch này chưa có booking. Mời KOL từ trang chiến dịch hoặc chọn chiến dịch khác.'}
          </p>
        ) : (
          bookings.data.map((row) => (
            <BookingRow key={row.view.id} row={row} running={running} locked={locked} opening={opening} onRun={run} onOpen={open} />
          ))
        )}
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" className="h-11 w-full md:h-9" disabled={locked}>
            {resetting ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
            Khôi phục chiến dịch mẫu
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục chiến dịch mẫu?</AlertDialogTitle>
            <AlertDialogDescription>
              Mọi chiến dịch, booking và chiến dịch đã lưu trở về dữ liệu mẫu ban đầu. Tài khoản, hồ sơ và phiên đăng nhập được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={() => void reset()}>Khôi phục</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DemoPanelSection>
  );
}

function BookingRow({
  row,
  running,
  locked,
  opening,
  onRun,
  onOpen,
}: {
  row: DemoBookingRow;
  running: string | null;
  locked: boolean;
  opening: string | null;
  onRun(row: DemoBookingRow, step: DemoStep): void;
  onOpen(link: NonNullable<ReturnType<typeof supplierBookingLink>>): void;
}) {
  const { view, steps } = row;
  const supplierName = view.supplier.name;
  const kols = [...new Set(view.items.map((i) => i.displayName))].join(', ');
  const supplierLink = supplierBookingLink(view.id, row.supplierEmail, supplierName);
  const isRunning = (s: DemoStep) => running === `${view.id}:${s.key}`;

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{kols || supplierName}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {view.supplier.type === 'MCN' && <span className="truncate">qua {supplierName}</span>}
            <SupplierTypeBadge type={view.supplier.type} />
            <span>{formatPrice(view.price)}</span>
          </p>
        </div>
        <BookingStatusBadge status={view.status} className="shrink-0" />
      </div>

      <p className="text-xs text-muted-foreground">
        {steps.waiting ? (
          steps.waiting
        ) : steps.next ? (
          <>
            Đến lượt: <span className="font-medium text-foreground">{actorName(steps.next, supplierName)}</span>
          </>
        ) : steps.primary ? (
          'Đã hoàn tất, chờ hai bên đánh giá'
        ) : view.status === 'COMPLETED' ? (
          'Đã hoàn tất, không còn bước nào'
        ) : (
          'Đã kết thúc, không còn bước nào'
        )}
      </p>

      {steps.primary && (
        <Button type="button" className="h-11 w-full justify-start md:h-9" disabled={locked} onClick={() => onRun(row, steps.primary!)}>
          {isRunning(steps.primary) ? <Loader2 className="animate-spin" aria-hidden /> : <ChevronRight aria-hidden />}
          <span className="truncate">{steps.primary.label}</span>
        </Button>
      )}

      {(steps.secondary.length > 0 || supplierLink) && (
        <div className="flex flex-wrap gap-1.5">
          {steps.secondary.map((s) => (
            <Button
              key={s.key}
              type="button"
              variant="outline"
              size="sm"
              className={`h-9 ${s.key === 'DECLINE' ? 'text-destructive hover:text-destructive' : ''}`}
              disabled={locked}
              onClick={() => onRun(row, s)}
            >
              {isRunning(s) && <Loader2 className="animate-spin" aria-hidden />}
              {s.label}
            </Button>
          ))}
          {supplierLink && (
            <Button type="button" variant="ghost" size="sm" className="h-9" disabled={locked} onClick={() => onOpen(supplierLink)}>
              {opening === supplierLink.label ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
              Mở góc nhìn KOL/MCN
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Campaign-level controls: "Tuyển nhiều KOL" phase / slots with sample applicants, pick-to-fill and "next phase";
 * the "Duyệt nháp" (Workflow) switch for any campaign.
 */
function CampaignControls({ campaign: c, locked }: { campaign: DemoCampaignOption; locked: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const recruit = c.type === 'OPEN_RECRUITMENT';
  const act = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    try {
      toast.success(await fn());
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };
  const disabled = locked || busy !== null;
  const free = (c.slots ?? 0) - (c.selected ?? 0);
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 p-3">
      {recruit && (
        <>
          <p className="text-xs text-muted-foreground">
            Giai đoạn: <span className="font-medium text-foreground">{c.phase ? RECRUIT_PHASE_LABEL[c.phase] : '—'}</span> · Đã chọn{' '}
            <span className="font-medium text-foreground tabular-nums">
              {c.selected ?? 0}/{c.slots ?? 0}
            </span>{' '}
            · {c.waiting ?? 0} chờ chọn
          </p>
          <div className="flex flex-wrap gap-1.5">
            {c.phase === 'APPLY' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={disabled}
                onClick={() => void act('apply', async () => `Đã thêm ${await demoCampaignService.simulateApplicants(c.id, 3)} ứng viên mẫu`)}
              >
                {busy === 'apply' ? <Loader2 className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
                Thêm 3 ứng viên mẫu
              </Button>
            )}
            {c.phase === 'SELECT' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={disabled || !c.waiting || free <= 0}
                onClick={() => void act('pick', async () => `Nhãn hàng đã chọn ${await demoCampaignService.pickWinners(c.id)} ứng viên`)}
              >
                {busy === 'pick' ? <Loader2 className="animate-spin" aria-hidden /> : <UserCheck aria-hidden />}
                Nhãn hàng chọn đủ suất
              </Button>
            )}
            {c.phase !== 'ENDED' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={disabled}
                onClick={() => void act('next', async () => `Đã chuyển sang giai đoạn ${RECRUIT_PHASE_LABEL[await demoCampaignService.advancePhase(c.id)]}`)}
              >
                {busy === 'next' ? <Loader2 className="animate-spin" aria-hidden /> : <FastForward aria-hidden />}
                Sang giai đoạn tiếp
              </Button>
            )}
          </div>
        </>
      )}
      <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Workflow: <span className="font-medium text-foreground">{c.draftReview ? 'Duyệt nháp' : 'Đăng trực tiếp'}</span>
        </span>
        <Switch
          checked={c.draftReview}
          disabled={disabled}
          aria-label="Bật/tắt Duyệt nháp"
          onCheckedChange={() =>
            void act('workflow', async () => ((await demoCampaignService.toggleDraftReview(c.id)) ? 'Đã bật Duyệt nháp' : 'Đã tắt Duyệt nháp: KOL đăng trực tiếp'))
          }
        />
      </label>
    </div>
  );
}
