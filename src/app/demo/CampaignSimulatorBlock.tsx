import { useState } from 'react';
import { ArrowRight, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
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
import { CAMPAIGN_STATUS_LABEL, demoCampaignService, type DemoBookingRow, type DemoStep } from '../services';
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

  const brandLink = campaign ? brandCampaignLink(campaign.id, campaign.brandEmail) : null;

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

      <div className="space-y-2">
        {bookings.loading && !bookings.data ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : !bookings.data?.length ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Chiến dịch này chưa có booking. Mời KOL từ trang chiến dịch hoặc chọn chiến dịch khác.
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
        {steps.next ? (
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
