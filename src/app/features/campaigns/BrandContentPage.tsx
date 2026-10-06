import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { bookingService } from '../../services';
import { brandLockedView } from '../shared/BrandLocked';
import { useLiveQuery } from '../shared/useLiveQuery';
import { useBookingActions } from './BookingActions';
import { LoadError } from './CampaignParts';
import { ContentTab, ReportTab } from './CampaignTabs';
import { campaignPath, collectDrafts, collectPosts, withParam } from './campaignView';

const TAB_PARAM = 'tab';
const POSTS_TAB = 'da-dang';
const CAMPAIGN_PARAM = 'chien-dich';
const ALL = 'all';

/**
 * /noi-dung-chien-dich — "Nội dung chiến dịch" of the brand: drafts waiting for review ("Chờ duyệt", approve /
 * request changes in place) and verified posts with metrics ("Bài đã đăng") across every campaign, filterable by
 * campaign (?chien-dich=). Opening an item goes to that booking on its campaign page.
 */
export function BrandContentPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = useLiveQuery(() => bookingService.listForBrand(), []);
  const actions = useBookingActions();
  const all = q.data;

  const campaigns = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of all ?? []) if (!seen.has(b.campaignId)) seen.set(b.campaignId, b.campaign.name);
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [all]);
  const campaignId = params.get(CAMPAIGN_PARAM);
  const bookings = useMemo(() => (all ?? []).filter((b) => !campaignId || b.campaignId === campaignId), [all, campaignId]);
  const tab = params.get(TAB_PARAM) === POSTS_TAB ? POSTS_TAB : 'cho-duyet';
  const pending = collectDrafts(bookings, true).length;
  const posts = collectPosts(bookings).length;

  const setParam = (key: string, value: string | null) => setParams((prev) => withParam(prev, key, value), { replace: true });
  const open = (id: string) => {
    const b = bookings.find((x) => x.id === id);
    if (b) navigate(`${campaignPath(b.campaignId)}?tab=booking&booking=${encodeURIComponent(id)}`);
  };

  if (q.error && !all) {
    return (
      brandLockedView(q.error) ?? (
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
          <LoadError message="Không tải được nội dung chiến dịch." onRetry={q.reload} />
        </div>
      )
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 p-4 md:p-6">
      {!all ? (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải nội dung">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setParam(TAB_PARAM, v === POSTS_TAB ? POSTS_TAB : null)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="cho-duyet" className="gap-1.5">
                Chờ duyệt <span className="tabular-nums text-muted-foreground">{pending}</span>
              </TabsTrigger>
              <TabsTrigger value={POSTS_TAB} className="gap-1.5">
                Bài đã đăng <span className="tabular-nums text-muted-foreground">{posts}</span>
              </TabsTrigger>
            </TabsList>
            <Select value={campaignId ?? ALL} onValueChange={(v) => setParam(CAMPAIGN_PARAM, v === ALL ? null : v)}>
              <SelectTrigger aria-label="Lọc theo chiến dịch" className="h-11 w-full bg-card sm:w-72 md:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả chiến dịch</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsContent value="cho-duyet" className="mt-4">
            <ContentTab bookings={bookings} actions={actions} onOpen={open} showCampaign />
          </TabsContent>
          <TabsContent value={POSTS_TAB} className="mt-4">
            <ReportTab bookings={bookings} onOpen={open} showCampaign />
          </TabsContent>
        </Tabs>
      )}
      {actions.elements}
    </div>
  );
}
