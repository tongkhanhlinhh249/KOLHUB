import { useMemo, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { AlertCircle, Bookmark, RotateCcw, Send, Store } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import { campaignService } from '../../services';
import { MARKETPLACE_PATH } from '../../auth/roles';
import { useAuth } from '../../auth/AuthContext';
import { useLiveQuery } from '../shared/useLiveQuery';
import { AppliedCampaignCard, MarketplaceCampaignCard, MarketplaceCampaignCardSkeleton } from '../supplier-booking/MarketplaceCampaignCard';
import { marketplaceCampaignPath, withParam, type MarketplaceBackState } from '../supplier-booking/supplierBooking';
import { SupplierGate, useSupplierAccess } from '../supplier-booking/useSupplierAccess';
import {
  appliedCounts,
  filterApplied,
  filterSaved,
  INTEREST_FILTER_PARAM,
  INTEREST_FILTERS,
  INTEREST_TABS,
  parseInterestFilter,
  parseInterestTab,
  savedCounts,
  type InterestTab,
} from './interest';

/** Same grid as the Sàn: 1 column on phones, 2 from 672 px of content, 3 from 1024 px. */
const GRID = 'grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3';

const chip = (active: boolean) =>
  cn(
    'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors md:h-8',
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted',
  );

const EMPTY: Record<InterestTab, { icon: typeof Store; title: string; text: string }> = {
  'da-luu': {
    icon: Bookmark,
    title: 'Bạn chưa lưu chiến dịch nào',
    text: 'Bấm biểu tượng lưu trên thẻ chiến dịch ở Sàn để xem lại và ứng tuyển sau.',
  },
  'da-ung-tuyen': {
    icon: Send,
    title: 'Bạn chưa ứng tuyển chiến dịch nào',
    text: 'Đề xuất bạn gửi cho Nhãn hàng trên Sàn sẽ hiện ở đây kèm trạng thái phản hồi.',
  },
};

/**
 * /chien-dich-da-luu — "Chiến dịch quan tâm" of a KOL / MCN (moved from the Sàn's tabs): "Đã lưu" (every saved
 * campaign, including closed ones; bookmark button to unsave) and "Đã ứng tuyển" (applications with their status).
 * ?tab=da-ung-tuyen, ?trang-thai=dang-mo | da-dong.
 */
export function InterestedCampaignsPage() {
  const { role } = useAuth();
  const access = useSupplierAccess();
  const { pathname, search } = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = parseInterestTab(params);
  const filter = parseInterestFilter(params);
  const backState: MarketplaceBackState = { from: pathname + search };

  const saved = useLiveQuery(() => campaignService.listSavedAll(), [role, access.accountId]);
  const applied = useLiveQuery(() => campaignService.listApplied(), [role, access.accountId]);
  const now = Date.now();

  const counts = useMemo(
    () => (tab === 'da-luu' ? savedCounts(saved.data ?? []) : appliedCounts(applied.data ?? [])),
    [tab, saved.data, applied.data],
  );

  const setTab = (t: string) =>
    setParams((prev) => withParam(withParam(prev, 'tab', t === 'da-luu' ? null : t), INTEREST_FILTER_PARAM, null), { replace: true });
  const setFilter = (param: string | null) => setParams((prev) => withParam(prev, INTEREST_FILTER_PARAM, param), { replace: true });

  const q = tab === 'da-luu' ? saved : applied;
  let body: ReactNode;
  if (q.loading && !q.data) {
    body = (
      <div className={GRID} aria-busy="true" aria-label="Đang tải chiến dịch">
        {[0, 1, 2].map((i) => (
          <MarketplaceCampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (q.error && !q.data) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được danh sách chiến dịch.</span>
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (counts.all === 0) {
    const e = EMPTY[tab];
    body = (
      <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <e.icon className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">{e.title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{e.text}</p>
        <Link to={MARKETPLACE_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
          <Store aria-hidden />
          Xem Sàn chiến dịch
        </Link>
      </div>
    );
  } else if (tab === 'da-luu') {
    const list = filterSaved(saved.data ?? [], filter);
    body =
      list.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Không có chiến dịch nào khớp bộ lọc.</p>
      ) : (
        <ul className={GRID} aria-label="Chiến dịch đã lưu">
          {list.map((c) => (
            <li key={c.id} className="min-w-0 [&>*]:h-full">
              <MarketplaceCampaignCard campaign={c} now={now} to={marketplaceCampaignPath(c.id)} linkState={backState} viewer="supplier" />
            </li>
          ))}
        </ul>
      );
  } else {
    const list = filterApplied(applied.data ?? [], filter);
    body =
      list.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Không có đề xuất nào khớp bộ lọc.</p>
      ) : (
        <ul className={GRID} aria-label="Đề xuất đã gửi">
          {list.map((a) => (
            <li key={a.booking.id} className="min-w-0 [&>*]:h-full">
              <AppliedCampaignCard item={a} now={now} />
            </li>
          ))}
        </ul>
      );
  }

  const tabCount = (t: InterestTab) => (t === 'da-luu' ? saved.data?.length : applied.data?.length);

  return (
    <div className="@container mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      {!access.loading && !access.approved && <SupplierGate ownerType={access.ownerType} status={access.status} compact />}

      <div className="-mx-4 min-w-0 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto" aria-label="Chiến dịch quan tâm">
            {INTEREST_TABS.map((t) => {
              const n = tabCount(t.key);
              return (
                <TabsTrigger key={t.key} value={t.key} className="h-11 gap-1.5 md:h-8">
                  {t.label}
                  {n !== undefined && <span className="rounded-full bg-background/70 px-1.5 text-xs text-muted-foreground tabular-nums">{n}</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {counts.all > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Lọc theo trạng thái nhận ứng tuyển">
          {INTEREST_FILTERS.map((f) => (
            <button key={f.key} type="button" className={chip(filter === f.key)} aria-pressed={filter === f.key} onClick={() => setFilter(f.param)}>
              {f.label}
              <span className={cn('text-xs tabular-nums', filter === f.key ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
      )}

      {body}
    </div>
  );
}
