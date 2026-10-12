import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarDays, CheckCircle2, Flag, Gift, Megaphone, Pencil, Send, Trash2, Undo2, Users, Wallet, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { bookingService, campaignService, KolhubError, phaseOfTimeline, UNPUBLISHED_STATUSES, type CampaignView } from '../../services';
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
import { ReasonDialog } from '../violations/ReasonDialog';

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

type Confirm = 'publish' | 'withdraw' | 'closeRecruitment' | 'close' | 'delete';

function HeaderCard({ c, onConfirm, onCancel }: { c: CampaignView; onConfirm(kind: Confirm): void; onCancel(): void }) {
  const acts = campaignActions(c.status, c.type);
  // Delete only a draft that was never sent for review and has no booking (EP-02 §6.5).
  const deletable = c.status === 'DRAFT' && !(c.log ?? []).some((e) => e.action === 'SUBMITTED') && c.stats.total === 0;
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
        {(acts.edit || acts.publish || acts.withdraw || acts.closeRecruitment || acts.close || acts.cancel || deletable) && (
          <div className="flex flex-wrap gap-2 @3xl:shrink-0 @3xl:justify-end">
            {acts.publish && (
              <Button type="button" className="h-11 md:h-9" onClick={() => onConfirm('publish')}>
                <Send aria-hidden />
                {c.status === 'DRAFT' ? 'Gửi đăng' : 'Gửi lại'}
              </Button>
            )}
            {acts.withdraw && (
              <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onConfirm('withdraw')}>
                <Undo2 aria-hidden />
                Rút về nháp
              </Button>
            )}
            {acts.edit && (
              <Link to={campaignEditPath(c.id)} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
                <Pencil aria-hidden />
                Sửa
              </Link>
            )}
            {acts.closeRecruitment && (
              <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onConfirm('closeRecruitment')}>
                <Flag aria-hidden />
                Đóng tuyển
              </Button>
            )}
            {acts.close && (
              <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onConfirm('close')}>
                <CheckCircle2 aria-hidden />
                Hoàn tất
              </Button>
            )}
            {acts.cancel && (
              <Button type="button" variant="ghost" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9" onClick={onCancel}>
                <XCircle aria-hidden />
                Huỷ chiến dịch
              </Button>
            )}
            {deletable && (
              <Button type="button" variant="ghost" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9" onClick={() => onConfirm('delete')}>
                <Trash2 aria-hidden />
                Xoá nháp
              </Button>
            )}
          </div>
        )}
      </div>
      <ReviewNotice c={c} />
    </Card>
  );
}

/** Admin feedback and lifecycle notes under the header (EP-02 §10 "Kết quả duyệt": status, concrete reason, CTA). */
function ReviewNotice({ c }: { c: CampaignView }) {
  let tone: 'info' | 'warning' | 'error' | 'neutral' = 'info';
  let text: ReactNode = null;
  if (c.status === 'PENDING_REVIEW') text = 'Chiến dịch đã được gửi duyệt. Admin KOL Hub kiểm tra trước khi công bố lên Sàn; bạn có thể rút về nháp để sửa.';
  else if (c.status === 'NEEDS_FIX') {
    tone = 'warning';
    text = (
      <>
        <span className="font-medium">Admin yêu cầu bổ sung:</span> {c.reviewNote}. Bấm "Sửa", hoàn thiện rồi "Gửi lại".
      </>
    );
  } else if (c.status === 'REJECTED') {
    tone = 'error';
    text = (
      <>
        <span className="font-medium">Không được duyệt:</span> {c.reviewNote}. Bạn có thể sửa và gửi lại.
      </>
    );
  } else if (c.status === 'OPEN' && c.pendingRevision) {
    text = c.pendingRevision.pausesApplications
      ? 'Bản sửa đang chờ Admin duyệt. Trong lúc này chiến dịch tạm ngừng nhận đơn mới; nội dung công khai vẫn là bản cũ.'
      : 'Bản sửa (ảnh, tên, mô tả) đang chờ Admin duyệt; chiến dịch vẫn nhận đơn với điều kiện hiện tại.';
  } else if (c.status === 'OPEN' && c.reviewNote && c.log?.at(-1)?.action === 'REVISION_REJECTED') {
    tone = 'warning';
    text = (
      <>
        <span className="font-medium">Bản sửa không được duyệt:</span> {c.reviewNote}. Chiến dịch giữ nguyên nội dung cũ.
      </>
    );
  } else if (c.status === 'CLOSED') {
    tone = 'neutral';
    text = 'Đã đóng tuyển: không nhận đơn mới. Các đơn đã gửi và hợp tác đã xác nhận vẫn được xử lý; xử lý xong thì bấm "Hoàn tất".';
  } else if (c.status === 'COMPLETED' && c.noCollaboration) {
    tone = 'neutral';
    text = 'Hoàn tất: Không phát sinh hợp tác.';
  } else if (c.status === 'CANCELLED' && c.cancelReason) {
    tone = 'neutral';
    text = `Đã huỷ: ${c.cancelReason}`;
  }
  if (!text) return null;
  const cls = {
    info: 'border-primary/30 bg-primary/5',
    warning: 'border-chart-5/50 bg-chart-5/10',
    error: 'border-destructive/40 bg-destructive/5',
    neutral: 'border-border bg-muted/60',
  }[tone];
  return <p className={cn('rounded-[8px] border p-3 text-sm text-foreground', cls)} role="status">{text}</p>;
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
  const [cancelOpen, setCancelOpen] = useState(false);
  const navigate = useNavigate();

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
  const qa = campaign.visibility === 'MARKETPLACE' && !UNPUBLISHED_STATUSES.includes(campaign.status);
  const pendingDrafts = collectDrafts(bookings, true);

  const runConfirm = async () => {
    try {
      if (confirm === 'publish') {
        await campaignService.publish(campaign.id);
        toast.success('Chiến dịch đã được gửi duyệt.', { description: 'Admin KOL Hub kiểm tra trước khi công bố lên Sàn.' });
      } else if (confirm === 'withdraw') {
        await campaignService.withdraw(campaign.id);
        toast.success('Đã rút về nháp');
      } else if (confirm === 'closeRecruitment') {
        await campaignService.closeRecruitment(campaign.id);
        toast.success('Đã đóng tuyển');
      } else if (confirm === 'close') {
        const c = await campaignService.close(campaign.id);
        toast.success(c.noCollaboration ? 'Đã hoàn tất: Không phát sinh hợp tác' : 'Đã hoàn tất chiến dịch');
      } else if (confirm === 'delete') {
        await campaignService.deleteDraft(campaign.id);
        toast.success('Đã xoá bản nháp');
        navigate(CAMPAIGNS_PATH, { replace: true });
      }
    } catch (e) {
      if (confirm === 'publish' && e instanceof KolhubError && (e.code === 'KOLHUB-4803' || e.code === 'KOLHUB-4823')) {
        setConfirm(null);
        toast.error('Vui lòng hoàn thiện các thông tin được đánh dấu trước khi gửi đăng.', { description: `${e.message} Bấm Sửa để bổ sung.` });
        return;
      }
      throw e;
    }
  };

  // Errors (e.g. 4817 bookings in progress) stay in the reason dialog.
  const cancelCampaign = async (reason: string) => {
    await campaignService.cancel(campaign.id, reason);
    toast.success('Đã huỷ chiến dịch');
  };

  const confirmCopy: Record<Confirm, { title: string; text: string; label: string }> = {
    publish: {
      title: campaign.status === 'DRAFT' ? 'Gửi đăng chiến dịch?' : 'Gửi lại chiến dịch?',
      text: 'Chiến dịch chuyển sang Chờ duyệt. Admin KOL Hub kiểm tra tổ chức, nội dung và điều kiện hợp tác trước khi công bố lên Sàn.',
      label: 'Gửi đăng',
    },
    withdraw: {
      title: 'Rút về nháp?',
      text: 'Chiến dịch rời hàng chờ duyệt và về Bản nháp để bạn sửa. Sửa xong hãy gửi đăng lại.',
      label: 'Rút về nháp',
    },
    closeRecruitment: {
      title: 'Đóng tuyển?',
      text: 'Đóng tuyển sẽ ngừng nhận đơn mới. Các đơn đã gửi và hợp tác đã xác nhận vẫn được giữ. Không mở lại tuyển được; cần tuyển đợt khác hãy tạo chiến dịch mới.',
      label: 'Đóng tuyển',
    },
    close: {
      title: 'Hoàn tất chiến dịch?',
      text: 'Chỉ hoàn tất được khi không còn đơn chờ xử lý và mọi hợp tác đã kết thúc. Không có hợp tác nào thì kết quả ghi "Không phát sinh hợp tác".',
      label: 'Hoàn tất',
    },
    delete: {
      title: 'Xoá bản nháp?',
      text: 'Bản nháp bị xoá hẳn và không khôi phục được.',
      label: 'Xoá nháp',
    },
  };

  return (
    <div className="@container mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
      <Link to={CAMPAIGNS_PATH} className={buttonVariants({ variant: 'ghost', className: '-ml-3 h-11 md:h-9' })}>
        <ArrowLeft aria-hidden />
        Danh sách chiến dịch
      </Link>

      <HeaderCard c={campaign} onConfirm={setConfirm} onCancel={() => setCancelOpen(true)} />

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
          destructive={confirm === 'delete'}
          onConfirm={runConfirm}
        />
      )}
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Huỷ chiến dịch?"
        description="Chiến dịch chuyển sang Đã huỷ và không mở lại được. Lời mời, đơn chưa chốt bị huỷ kèm lý do để ứng viên được báo. Còn hợp tác đang thực hiện thì chưa huỷ được: hãy xử lý từng hợp tác trước."
        label="Lý do huỷ"
        placeholder="VD: Nhãn hàng dừng chương trình khuyến mãi"
        confirmLabel="Huỷ chiến dịch"
        maxLength={1000}
        destructive
        onConfirm={cancelCampaign}
      />
      {actions.elements}
      {kol.elements}
    </div>
  );
}
