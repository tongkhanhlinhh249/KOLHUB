import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarDays, Flag, Gift, Megaphone, Pencil, Send, Users, Wallet, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { bookingService, campaignService, KolhubError, phaseOfTimeline, type CampaignView } from '../../services';
import { CampaignTypeBadge, PhaseBadge } from '../shared/RecruitParts';
import { rewardShort } from '../shared/recruitView';
import { brandLockedView } from '../shared/BrandLocked';
import { CampaignCover } from '../shared/CampaignCover';
import { useBrandKolSheet } from '../shared/BrandKolSheet';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ConfirmAction, useBookingActions } from './BookingActions';
import { BookingSheet } from './BookingSheet';
import { CampaignStatusBadge, EmptyBlock, errText, LoadError, PlatformIcons, VisibilityLabel } from './CampaignParts';
import { ApplicationsTab, BookingsTab, ContentTab, OverviewTab, ReportTab } from './CampaignTabs';
import { QATab, SelectionTab } from './RecruitTabs';
import {
  campaignActions,
  campaignEditPath,
  CAMPAIGNS_PATH,
  collectDrafts,
  formatDateRange,
  formatVnd,
  openApplications,
  parseDetailTab,
  withParam,
} from './campaignView';
import { InviteKolsDialog } from './InviteKolsDialog';

const TAB_TRIGGER =
  'relative h-11 flex-none gap-1.5 rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary';

function Count({ n, highlight }: { n: number; highlight?: boolean }) {
  return (
    <span
      className={
        highlight && n > 0
          ? 'rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-foreground tabular-nums'
          : 'rounded-full bg-muted px-1.5 text-[11px] leading-5 text-muted-foreground tabular-nums'
      }
    >
      {n}
    </span>
  );
}

type Confirm = 'publish' | 'close' | 'cancel';

function HeaderCard({ c, onConfirm }: { c: CampaignView; onConfirm(kind: Confirm): void }) {
  const acts = campaignActions(c.status, c.type);
  const r = c.type === 'OPEN_RECRUITMENT' ? c.recruitment : undefined;
  return (
    <Card className="gap-4 p-4 md:p-5">
      <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <div className="flex min-w-0 items-start gap-3 @lg:gap-4">
          {c.cover && (
            <CampaignCover cover={c.cover} className="aspect-video w-24 shrink-0 rounded-[8px] border border-border @lg:w-40" iconClassName="size-5" />
          )}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CampaignStatusBadge status={c.status} />
              <CampaignTypeBadge type={c.type} />
              {r && c.status !== 'DRAFT' && <PhaseBadge campaign={{ type: 'OPEN_RECRUITMENT', phase: phaseOfTimeline(r.timeline, Date.now()), recruitment: r }} now={Date.now()} />}
              <VisibilityLabel visibility={c.visibility} />
            </div>
            <h2 className="text-lg font-semibold break-words text-foreground md:text-xl">{c.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="tabular-nums">{formatDateRange(c.startDate, c.endDate)}</span>
              </span>
              {r ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <Gift className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="tabular-nums">{rewardShort(r.reward)} / KOL</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="tabular-nums">
                      Đã chọn {c.stats.inProgress + c.stats.completed}/{r.slots} suất
                    </span>
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="tabular-nums">{c.budget > 0 ? formatVnd(c.budget) : 'Chưa nhập ngân sách'}</span>
                </span>
              )}
              <PlatformIcons platforms={c.platforms} />
            </div>
          </div>
        </div>
        {(acts.edit || acts.publish || acts.close || acts.cancel) && (
          <div className="flex flex-wrap gap-2 @3xl:shrink-0 @3xl:justify-end">
            {acts.publish && (
              <Button type="button" className="h-11 md:h-9" onClick={() => onConfirm('publish')}>
                <Send aria-hidden />
                Đăng
              </Button>
            )}
            {acts.edit && (
              <Link to={campaignEditPath(c.id)} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
                <Pencil aria-hidden />
                Sửa
              </Link>
            )}
            {acts.close && (
              <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onConfirm('close')}>
                <Flag aria-hidden />
                Đóng chiến dịch
              </Button>
            )}
            {acts.cancel && (
              <Button type="button" variant="ghost" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9" onClick={() => onConfirm('cancel')}>
                <XCircle aria-hidden />
                Huỷ
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Đang tải chiến dịch">
      <Card className="gap-3 p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </Card>
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/**
 * /chien-dich/:id — campaign header (status actions) and tabs Tổng quan · Booking · Ứng tuyển (marketplace
 * only) · Nội dung · Báo cáo. ?tab= and ?booking= (booking detail sheet) and ?kol= (KOL profile) live in the URL.
 */
export function CampaignDetailPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = useLiveQuery(() => Promise.all([campaignService.get(id), bookingService.listForBrand({ campaignId: id })]), [id]);
  const [campaign, bookings = []] = q.data ?? [];
  const actions = useBookingActions();
  const kol = useBrandKolSheet({ invite: false });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const marketplace = campaign?.visibility === 'MARKETPLACE';
  const tab = parseDetailTab(searchParams.get('tab'), marketplace);
  const bookingId = searchParams.get('booking');
  const setParam = (key: string, value: string | null) => setSearchParams((prev) => withParam(prev, key, value), { replace: key === 'tab' });
  const openBooking = (bid: string) => setParam('booking', bid);

  if (q.error && !q.data) {
    const locked = brandLockedView(q.error);
    if (locked) return locked;
    const notFound = q.error instanceof KolhubError && q.error.code === 'KOLHUB-4801';
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
        {notFound ? (
          <Card className="p-0">
            <EmptyBlock icon={<Megaphone className="size-6" aria-hidden />} title="Không tìm thấy chiến dịch" text={errText(q.error)}>
              <Link to={CAMPAIGNS_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11' })}>
                Về danh sách chiến dịch
              </Link>
            </EmptyBlock>
          </Card>
        ) : (
          <LoadError message="Không tải được chiến dịch." onRetry={q.reload} />
        )}
      </div>
    );
  }
  if (!campaign) return <DetailSkeleton />;

  const acts = campaignActions(campaign.status, campaign.type);
  const recruit = campaign.type === 'OPEN_RECRUITMENT' && !!campaign.recruitment;
  const applications = openApplications(bookings);
  const qa = campaign.visibility === 'MARKETPLACE' && campaign.status !== 'DRAFT';
  const pendingDrafts = collectDrafts(bookings, true);

  const runConfirm = async () => {
    try {
      if (confirm === 'publish') {
        const c = await campaignService.publish(campaign.id);
        toast.success('Đã đăng chiến dịch', {
          description: c.visibility === 'MARKETPLACE' ? 'Chiến dịch đang hiển thị trên Sàn chiến dịch.' : 'Hãy mời KOL để bắt đầu.',
        });
      } else if (confirm === 'close') {
        await campaignService.close(campaign.id);
        toast.success('Đã đóng chiến dịch');
      } else if (confirm === 'cancel') {
        await campaignService.cancel(campaign.id);
        toast.success('Đã huỷ chiến dịch');
      }
    } catch (e) {
      if (confirm === 'publish' && e instanceof KolhubError && e.code === 'KOLHUB-4803') {
        setConfirm(null);
        toast.error('Chưa đủ thông tin để đăng', { description: `${e.message} Bấm Sửa để bổ sung.` });
        return;
      }
      throw e;
    }
  };

  const confirmCopy: Record<Confirm, { title: string; text: string; label: string }> = {
    publish: {
      title: 'Đăng chiến dịch?',
      text:
        campaign.visibility === 'MARKETPLACE'
          ? 'Chiến dịch chuyển sang Đang mở và hiển thị trên Sàn chiến dịch để KOL/MCN gửi đề xuất.'
          : 'Chiến dịch chuyển sang Đang mở. Chiến dịch riêng tư: chỉ KOL/MCN được mời mới thấy.',
      label: 'Đăng chiến dịch',
    },
    close: {
      title: 'Đóng chiến dịch?',
      text: 'Chiến dịch chuyển sang Hoàn tất. Lời mời và đề xuất chưa chốt sẽ bị huỷ. Chỉ đóng được khi không còn booking đang thực hiện.',
      label: 'Đóng chiến dịch',
    },
    cancel: {
      title: 'Huỷ chiến dịch?',
      text: 'Chiến dịch chuyển sang Đã huỷ và không thể mở lại. Lời mời và đề xuất chưa chốt sẽ bị huỷ. Chỉ huỷ được khi không còn booking đang thực hiện.',
      label: 'Huỷ chiến dịch',
    },
  };

  return (
    <div className="@container mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
      <Link to={CAMPAIGNS_PATH} className={buttonVariants({ variant: 'ghost', className: '-ml-3 h-11 md:h-9' })}>
        <ArrowLeft aria-hidden />
        Danh sách chiến dịch
      </Link>

      <HeaderCard c={campaign} onConfirm={setConfirm} />

      <Tabs value={tab} onValueChange={(v) => setParam('tab', v === 'tong-quan' ? null : v)} className="gap-4">
        <div className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
          <TabsList className="h-auto justify-start gap-5 rounded-none bg-transparent p-0">
            <TabsTrigger value="tong-quan" className={TAB_TRIGGER}>
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="booking" className={TAB_TRIGGER}>
              Booking <Count n={bookings.length} />
            </TabsTrigger>
            {marketplace && (
              <TabsTrigger value="ung-tuyen" className={TAB_TRIGGER}>
                {recruit ? 'Ứng viên' : 'Ứng tuyển'} <Count n={applications.length} highlight />
              </TabsTrigger>
            )}
            <TabsTrigger value="noi-dung" className={TAB_TRIGGER}>
              Nội dung <Count n={pendingDrafts.length} highlight />
            </TabsTrigger>
            <TabsTrigger value="bao-cao" className={TAB_TRIGGER}>
              Báo cáo
            </TabsTrigger>
            {qa && (
              <TabsTrigger value="hoi-dap" className={TAB_TRIGGER}>
                Hỏi đáp
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="tong-quan" className="mt-0">
          <OverviewTab campaign={campaign} bookings={bookings} />
        </TabsContent>
        <TabsContent value="booking" className="mt-0">
          <BookingsTab bookings={bookings} canInvite={acts.invite} onInvite={() => setInviteOpen(true)} onOpen={openBooking} />
        </TabsContent>
        {marketplace && (
          <TabsContent value="ung-tuyen" className="mt-0">
            {recruit ? (
              <SelectionTab campaign={campaign} bookings={bookings} onOpen={openBooking} onOpenKol={kol.openKol} />
            ) : (
              <ApplicationsTab bookings={bookings} actions={actions} onOpen={openBooking} onOpenKol={kol.openKol} />
            )}
          </TabsContent>
        )}
        <TabsContent value="noi-dung" className="mt-0">
          <ContentTab bookings={bookings} actions={actions} onOpen={openBooking} />
        </TabsContent>
        <TabsContent value="bao-cao" className="mt-0">
          <ReportTab bookings={bookings} onOpen={openBooking} />
        </TabsContent>
        {qa && (
          <TabsContent value="hoi-dap" className="mt-0">
            <QATab campaignId={campaign.id} />
          </TabsContent>
        )}
      </Tabs>

      <BookingSheet bookingId={bookingId} onOpenChange={(o) => !o && setParam('booking', null)} onOpenKol={kol.openKol} actions={actions} />
      {acts.invite && <InviteKolsDialog campaign={campaign} open={inviteOpen} onOpenChange={setInviteOpen} />}
      {confirm && (
        <ConfirmAction
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirmCopy[confirm].title}
          description={confirmCopy[confirm].text}
          confirmLabel={confirmCopy[confirm].label}
          destructive={confirm === 'cancel'}
          onConfirm={runConfirm}
        />
      )}
      {actions.elements}
      {kol.elements}
    </div>
  );
}
