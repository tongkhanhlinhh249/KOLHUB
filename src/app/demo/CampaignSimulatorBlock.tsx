import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Switch } from '../components/ui/switch';
import { cn } from '../components/ui/utils';
import { useAuth } from '../auth/AuthContext';
import {
  CAMPAIGN_STATUS_LABEL,
  demoCampaignService,
  RECRUIT_PHASE_LABEL,
  type CampaignType,
  type DemoBookingRow,
  type DemoCampaignOption,
  type DemoStep,
} from '../services';
import { BookingStatusBadge } from '../features/campaigns/CampaignParts';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import type { DemoLink } from './demoLinks';
import { DemoPanelSection } from './DemoPanelSection';
import { brandCampaignLink, entriesFor, supplierBookingLink, type CampaignEntry } from './campaignSimulator';
import { orderSteps, stepLabel, type CampaignSide, type RoleTab } from './demoTabs';
import { useDemoOpen } from './useDemoOpen';

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Không thực hiện được bước này.');

const CAMPAIGN_KINDS: { type: CampaignType; label: string }[] = [
  { type: 'BOOKING', label: 'Booking 1 KOL' },
  { type: 'OPEN_RECRUITMENT', label: 'Booking nhiều KOL' },
];

/** Small icon button that opens a demo screen as the right account. */
function OpenLink({ link, title, locked, opening, onOpen }: { link: DemoLink; title: string; locked: boolean; opening: string | null; onOpen(l: DemoLink): void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" title={title} aria-label={title} disabled={locked} onClick={() => onOpen(link)}>
      {opening === link.label ? <Loader2 className="animate-spin" aria-hidden /> : <ExternalLink aria-hidden />}
    </Button>
  );
}

/**
 * Campaign states of the current role: type switch, campaign select and one compact row per booking with buttons
 * named by the target state. Steps of the other side stay runnable (after the role's own). KOL / MCN see only the
 * signed-in account's bookings; the brand also gets the campaign-level controls.
 */
export function CampaignSimulatorBlock({ role, onDone }: { role: RoleTab; onDone(): void }) {
  const { account } = useAuth();
  const brand = role === 'biz';
  const side: CampaignSide = brand ? 'BRAND' : 'SUPPLIER';
  const data = useLiveQuery(async (): Promise<CampaignEntry[]> => {
    const cs = await demoCampaignService.listCampaigns();
    const rows = await Promise.all(cs.map((c) => demoCampaignService.listBookings(c.id)));
    return cs.map((campaign, i) => ({ campaign, rows: rows[i] }));
  }, []);
  const [picked, setPicked] = useState<string | null>(null);
  const [kind, setKind] = useState<CampaignType>('BOOKING');
  const { open, busy: opening } = useDemoOpen(onDone);
  const [running, setRunning] = useState<string | null>(null);
  const locked = running !== null || opening !== null;

  const entries = entriesFor(data.data ?? [], brand, account?.email);
  const list = entries.filter((e) => e.campaign.type === kind);
  const entry = list.find((e) => e.campaign.id === picked) ?? list[0];
  const campaign = entry?.campaign;

  const run = async (row: DemoBookingRow, step: DemoStep, label: string) => {
    setRunning(`${row.view.id}:${step.key}`);
    try {
      await demoCampaignService.run(row.view.id, step.key);
      toast.success(`${label}: xong`);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setRunning(null);
    }
  };

  const brandLink =
    campaign && brand
      ? brandCampaignLink(
          campaign.id,
          campaign.brandEmail,
          campaign.type === 'OPEN_RECRUITMENT' && (campaign.phase === 'APPLY' || campaign.phase === 'SELECT') ? 'ung-tuyen' : 'booking',
        )
      : null;

  return (
    <DemoPanelSection title="Chiến dịch">
      <div role="radiogroup" aria-label="Loại chiến dịch" className="grid grid-cols-2 gap-1 rounded-[8px] bg-muted p-1">
        {CAMPAIGN_KINDS.map((k) => {
          const on = k.type === kind;
          return (
            <button
              key={k.type}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setKind(k.type)}
              className={cn(
                'flex min-h-10 items-center justify-center gap-1.5 rounded-[6px] px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                on ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="truncate">{k.label}</span>
              {data.data && <span className="text-xs tabular-nums opacity-70">{entries.filter((e) => e.campaign.type === k.type).length}</span>}
            </button>
          );
        })}
      </div>

      {data.loading && !data.data ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <div className="flex items-center gap-1">
          <Select value={campaign?.id ?? ''} onValueChange={setPicked} disabled={!list.length}>
            <SelectTrigger className="h-10 min-w-0 flex-1" aria-label="Chọn chiến dịch">
              <SelectValue placeholder="Chưa có chiến dịch" />
            </SelectTrigger>
            <SelectContent>
              {list.map((e) => (
                <SelectItem key={e.campaign.id} value={e.campaign.id}>
                  <span className="truncate">
                    {e.campaign.name} · {brand ? e.campaign.bookingCount : e.rows.length} booking
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {brandLink && <OpenLink link={brandLink} title="Mở chiến dịch" locked={locked} opening={opening} onOpen={(l) => void open(l)} />}
        </div>
      )}

      {campaign && brand && <CampaignControls campaign={campaign} locked={locked} />}

      <div className="space-y-2">
        {data.loading && !data.data ? (
          <Skeleton className="h-20 w-full" />
        ) : !entry || !entry.rows.length ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            {!brand
              ? kind === 'OPEN_RECRUITMENT'
                ? 'Chưa có booking. Nhãn hàng bấm “Thêm ứng viên”.'
                : 'Tài khoản này chưa có booking.'
              : campaign?.type === 'OPEN_RECRUITMENT'
                ? 'Chưa có ứng viên. Bấm “Thêm ứng viên”.'
                : 'Chưa có booking.'}
          </p>
        ) : (
          entry.rows.map((row) => (
            <BookingRow
              key={row.view.id}
              row={row}
              side={side}
              brandName={entry.campaign.brandName}
              recruit={entry.campaign.type === 'OPEN_RECRUITMENT'}
              running={running}
              locked={locked}
              opening={opening}
              onRun={run}
              onOpen={(l) => void open(l)}
            />
          ))
        )}
      </div>
    </DemoPanelSection>
  );
}

function BookingRow({
  row,
  side,
  brandName,
  recruit,
  running,
  locked,
  opening,
  onRun,
  onOpen,
}: {
  row: DemoBookingRow;
  side: CampaignSide;
  brandName: string;
  recruit: boolean;
  running: string | null;
  locked: boolean;
  opening: string | null;
  onRun(row: DemoBookingRow, step: DemoStep, label: string): void;
  onOpen(link: DemoLink): void;
}) {
  const { view, steps } = row;
  const supplierName = view.supplier.name;
  const kols = [...new Set(view.items.map((i) => i.displayName))].join(', ');
  // Brand: the KOL(s); MCN: its KOL(s) on this booking (same brand on every row); KOL: the brand.
  const name = side === 'BRAND' ? kols || supplierName : view.supplier.type === 'MCN' ? kols || brandName : brandName;
  const supplierLink = side === 'SUPPLIER' ? supplierBookingLink(view.id, row.supplierEmail, supplierName) : null;
  const ctx = { status: view.status, price: view.price, recruit };
  const otherName = { BRAND: 'Nhãn hàng', SUPPLIER: view.supplier.type === 'MCN' ? 'MCN' : 'KOL' } as const;

  return (
    <div className="space-y-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={name}>
          {name}
        </p>
        <BookingStatusBadge status={view.status} className="shrink-0" />
        {supplierLink && <OpenLink link={supplierLink} title="Mở booking" locked={locked} opening={opening} onOpen={onOpen} />}
      </div>
      {steps.waiting && <p className="text-xs text-muted-foreground">{steps.waiting}</p>}
      {(steps.primary || steps.secondary.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {orderSteps(steps, side).map(({ step, primary, other }) => {
            const label = stepLabel(step, ctx);
            const full = other ? `${label} (${otherName[other]})` : label;
            return (
              <Button
                key={step.key}
                type="button"
                size="sm"
                variant={primary ? 'default' : 'outline'}
                className={cn('h-8', !primary && step.key === 'DECLINE' && 'text-destructive hover:text-destructive')}
                disabled={locked}
                onClick={() => onRun(row, step, full)}
              >
                {running === `${view.id}:${step.key}` && <Loader2 className="animate-spin" aria-hidden />}
                {label}
                {other && <span className="text-[10px] font-normal opacity-70">({otherName[other]})</span>}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Brand only: "Tuyển nhiều KOL" phase controls and the "Duyệt nháp" switch. */
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
  const spin = (key: string) => busy === key && <Loader2 className="animate-spin" aria-hidden />;
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 p-2.5">
      {recruit && (
        <>
          <p className="text-xs text-muted-foreground">
            {c.phase ? RECRUIT_PHASE_LABEL[c.phase] : CAMPAIGN_STATUS_LABEL[c.status]} · Đã chọn{' '}
            <span className="font-medium text-foreground tabular-nums">
              {c.selected ?? 0}/{c.slots ?? 0}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 bg-background"
              disabled={disabled || c.phase !== 'APPLY'}
              onClick={() => void act('apply', async () => `Đã thêm ${await demoCampaignService.simulateApplicants(c.id, 3)} ứng viên`)}
            >
              {spin('apply')}
              Thêm ứng viên
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 bg-background"
              disabled={disabled || c.phase !== 'SELECT' || !c.waiting || free <= 0}
              onClick={() => void act('pick', async () => `Đã chọn ${await demoCampaignService.pickWinners(c.id)} ứng viên`)}
            >
              {spin('pick')}
              Chọn đủ suất
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 bg-background"
              disabled={disabled || c.phase === 'ENDED'}
              onClick={() => void act('next', async () => `Sang ${RECRUIT_PHASE_LABEL[await demoCampaignService.advancePhase(c.id)]}`)}
            >
              {spin('next')}
              Giai đoạn tiếp
            </Button>
          </div>
        </>
      )}
      <label className="flex items-center justify-between gap-3 text-xs text-foreground">
        Duyệt nháp
        <Switch
          checked={c.draftReview}
          disabled={disabled}
          aria-label="Duyệt nháp"
          onCheckedChange={() => void act('workflow', async () => ((await demoCampaignService.toggleDraftReview(c.id)) ? 'Đã bật Duyệt nháp' : 'Đã tắt Duyệt nháp'))}
        />
      </label>
    </div>
  );
}
