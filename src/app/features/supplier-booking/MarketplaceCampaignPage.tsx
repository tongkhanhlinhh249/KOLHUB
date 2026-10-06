import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { AlertCircle, ArrowLeft, ChevronRight, RotateCcw, SearchX } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../auth/AuthContext';
import { MARKETPLACE_PATH } from '../../auth/roles';
import { campaignService, KolhubError } from '../../services';
import { CampaignCover } from '../shared/CampaignCover';
import { useLiveQuery } from '../shared/useLiveQuery';
import { CampaignDetailHeader, CampaignDetailSections, CampaignScheduleCard, useCampaignActions } from './CampaignDetailBody';
import { errText } from './parts';
import { marketplaceBackLabel, marketplaceBackPath, marketplaceViewerOf } from './supplierBooking';
import { useSupplierAccess } from './useSupplierAccess';

/** Hidden on wide screens, where the right rail shows the same block. */
const NARROW_ONLY = '@4xl/page:hidden';

/** "← Sàn chiến dịch" / "← Chiến dịch yêu thích": back to the list the user came from (its filters kept), else /san. */
function BackLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-9"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {marketplaceBackLabel(to)}
    </Link>
  );
}

/**
 * /san/:campaignId — full-page campaign detail on the public Sàn (MarketplaceLayout), open to guests, KOL/MCN and
 * Brands. Wide screens: content + sticky right rail (schedule, call to action); phones / tablets: one column with
 * the call to action in a sticky bottom bar. Draft, hidden or deleted campaigns → "không tồn tại hoặc đã đóng".
 */
export function MarketplaceCampaignPage() {
  const { campaignId = '' } = useParams();
  const location = useLocation();
  const backTo = marketplaceBackPath(location.state);
  const { role } = useAuth();
  const viewer = marketplaceViewerOf(role);
  const access = useSupplierAccess(viewer === 'supplier');
  // `role` in the deps: reload when the demo switches account while staying on the page.
  const q = useLiveQuery(() => campaignService.getMarketplaceItem(campaignId), [campaignId, role]);
  const c = q.data && q.data.id === campaignId ? q.data : null;
  const now = Date.now();
  const { cta, dialogs } = useCampaignActions(c, access, viewer, now);
  const notFound = !c && q.error instanceof KolhubError && q.error.code === 'KOLHUB-4801';

  useEffect(() => {
    if (!c?.name) return;
    const prev = document.title;
    document.title = `${c.name} · Sàn chiến dịch`;
    return () => {
      document.title = prev;
    };
  }, [c?.name]);

  if (!c && (q.loading || (!q.error && !q.data))) {
    return (
      <div className="w-full space-y-4" aria-busy="true" aria-label="Đang tải chiến dịch">
        <BackLink to={backTo} />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-3/4" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-[8px]" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="hidden h-64 lg:block" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="w-full space-y-4">
        <BackLink to={backTo} />
        {notFound ? (
          <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border bg-card px-4 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-6" aria-hidden />
            </div>
            <h1 className="text-base font-semibold text-foreground">Chiến dịch không tồn tại hoặc đã đóng</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Chiến dịch có thể đã ngừng hiển thị trên Sàn, đã kết thúc hoặc đường dẫn không đúng.
            </p>
            <Link to={MARKETPLACE_PATH} className={buttonVariants({ className: 'h-11 md:h-9' })}>
              Xem chiến dịch khác trên Sàn
            </Link>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertDescription className="space-y-3">
              <p>{errText(q.error)}</p>
              <Button type="button" variant="outline" className="h-11 md:h-8" onClick={q.reload}>
                <RotateCcw aria-hidden />
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="@container/page w-full">
      <nav aria-label="Đường dẫn" className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
        <BackLink to={backTo} />
        <ChevronRight className="hidden size-4 shrink-0 sm:block" aria-hidden />
        <span className="hidden min-w-0 truncate sm:block" aria-current="page">
          {c.name}
        </span>
      </nav>

      <div className="mt-2 grid gap-6 @4xl/page:grid-cols-[minmax(0,1fr)_20rem] @4xl/page:gap-8">
        <div className="min-w-0 space-y-6">
          <CampaignDetailHeader campaign={c} now={now} />
          <CampaignCover cover={c.cover} alt={`Ảnh chiến dịch ${c.name}`} className="aspect-video w-full rounded-[8px] border border-border" />
          <CampaignDetailSections campaign={c} viewer={viewer} now={now} narrowOnlyClass={NARROW_ONLY} />
        </div>

        <aside className="hidden @4xl/page:block" aria-label="Lịch trình và ứng tuyển">
          {/* Below the sticky 64 px marketplace header. */}
          <div className="sticky top-20 space-y-4">
            <CampaignScheduleCard campaign={c} now={now} />
            <div className="@container rounded-[8px] border border-border bg-card p-4">{cta}</div>
          </div>
        </aside>
      </div>

      {/* Phones / tablets: call to action pinned to the bottom of the viewport (stops at the end of the content). */}
      <div
        className="@container sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgb(0_0_0/0.06)] backdrop-blur supports-[backdrop-filter]:bg-card/85 md:-mx-6 md:px-6 @4xl/page:hidden"
        aria-label="Ứng tuyển"
        role="region"
      >
        {cta}
      </div>

      {dialogs}
    </div>
  );
}
