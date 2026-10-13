import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CheckCircle2, ExternalLink, Flag, Megaphone, MoreHorizontal, Pencil, Send, Trash2, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { bookingService, CAMPAIGN_TYPE_LABEL, campaignService, IN_PROGRESS_STATUSES, INBOX_PATHS, KolhubError, PRE_ACCEPT_STATUSES, UNPUBLISHED_STATUSES, type BookingView, type CampaignView } from '../../services';
import { brandLockedView } from '../shared/BrandLocked';
import { CampaignCover } from '../shared/CampaignCover';
import { useBrandKolSheet } from '../shared/BrandKolSheet';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ConfirmAction, useBookingActions } from './BookingActions';
import { BookingSheet } from './BookingSheet';
import { CampaignStatusBadge, EmptyBlock, errText, LoadError } from './CampaignParts';
import { ApplicationsTab, BookingsTab, ContentTab, InfoTab, OverviewTab, ReportTab } from './CampaignTabs';
import { QATab, SelectionTab } from './RecruitTabs';
import {
  campaignActions,
  campaignEditPath,
  CAMPAIGNS_PATH,
  campaignTodos,
  collectDrafts,
  kolProgress,
  openApplications,
  parseCollabSection,
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

function HeaderCard({ c, bookings, onConfirm, onCancel }: { c: CampaignView; bookings: BookingView[]; onConfirm(kind: Confirm): void; onCancel(): void }) {
  const acts = campaignActions(c.status, c.type);
  // Delete only a draft that was never sent for review and has no booking (EP-02 §6.5).
  const deletable = c.status === 'DRAFT' && !(c.log ?? []).some((e) => e.action === 'SUBMITTED') && c.stats.total === 0;
  const onSan = c.visibility === 'MARKETPLACE' && (c.status === 'OPEN' || c.status === 'CLOSED' || c.status === 'COMPLETED');
  const k = kolProgress(c, bookings);
  const brand = c.promotedBrand?.name ?? c.brand.company;
  // "Hoàn tất" leads only once nothing is left (no open application, no collaboration in progress).
  const completable = acts.close && !bookings.some((b) => PRE_ACCEPT_STATUSES.includes(b.status) || IN_PROGRESS_STATUSES.includes(b.status));
  // One primary action by status (UI/UX tối ưu §4.3–4.4); edit, view on the Sàn, delete and cancel live in ⋯.
  const primary = acts.publish ? (
    <Button type="button" className="h-11 md:h-9" onClick={() => onConfirm('publish')}>
      <Send aria-hidden />
      {c.status === 'DRAFT' ? 'Gửi đăng' : 'Gửi lại'}
    </Button>
  ) : acts.withdraw ? (
    <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onConfirm('withdraw')}>
      <Undo2 aria-hidden />
      Rút về nháp
    </Button>
  ) : acts.closeRecruitment ? (
    <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onConfirm('closeRecruitment')}>
      <Flag aria-hidden />
      Đóng tuyển
    </Button>
  ) : completable ? (
    <Button type="button" className="h-11 md:h-9" onClick={() => onConfirm('close')}>
      <CheckCircle2 aria-hidden />
      Hoàn tất
    </Button>
  ) : null;
  const hasMenu = acts.edit || onSan || deletable || acts.cancel || (acts.close && !completable);
  return (
    <Card className="gap-4 p-4 md:p-5">
      <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <div className="flex min-w-0 items-start gap-3 @lg:gap-4">
          {c.cover && (
            <CampaignCover cover={c.cover} className="aspect-video w-24 shrink-0 rounded-[8px] border border-border @lg:w-36" iconClassName="size-5" />
          )}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CampaignStatusBadge status={c.status} />
            </div>
            <h2 className="text-lg font-semibold break-words text-foreground md:text-xl">{c.name}</h2>
            <p className="text-sm text-muted-foreground">
              {brand} · {CAMPAIGN_TYPE_LABEL[c.type ?? 'BOOKING']}
              {!UNPUBLISHED_STATUSES.includes(c.status) && c.status !== 'CANCELLED' && (
                <>
                  {' · '}Đã chọn{' '}
                  <strong className="font-semibold text-foreground tabular-nums">
                    {k.chosen}/{k.target}
                  </strong>{' '}
                  KOL
                </>
              )}
            </p>
          </div>
        </div>
        {(primary || hasMenu) && (
          <div className="flex items-center gap-2 @3xl:shrink-0 @3xl:justify-end">
            {primary}
            {hasMenu && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="size-11 md:size-9" aria-label="Thao tác khác">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  {acts.edit && (
                    <DropdownMenuItem asChild>
                      <Link to={campaignEditPath(c.id)}>
                        <Pencil aria-hidden />
                        Sửa
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {onSan && (
                    <DropdownMenuItem asChild>
                      <a href={INBOX_PATHS.sanCampaign(c.id)} target="_blank" rel="noopener">
                        <ExternalLink aria-hidden />
                        Xem trên Sàn
                      </a>
                    </DropdownMenuItem>
                  )}
                  {acts.close && !completable && (
                    <DropdownMenuItem onSelect={() => onConfirm('close')}>
                      <CheckCircle2 aria-hidden />
                      Hoàn tất
                    </DropdownMenuItem>
                  )}
                  {(deletable || acts.cancel) && (acts.edit || onSan || acts.close) && <DropdownMenuSeparator />}
                  {deletable && (
                    <DropdownMenuItem variant="destructive" onSelect={() => onConfirm('delete')}>
                      <Trash2 aria-hidden />
                      Xoá nháp
                    </DropdownMenuItem>
                  )}
                  {acts.cancel && (
                    <DropdownMenuItem variant="destructive" onSelect={onCancel}>
                      <XCircle aria-hidden />
                      Huỷ chiến dịch
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
    const chosen = [...(c.log ?? [])].reverse().find((e) => e.action === 'CLOSED')?.note === 'Đã chọn KOL cho chiến dịch.';
    text = chosen
      ? 'Đã chọn KOL cho chiến dịch (Booking 1 KOL): không nhận đơn mới, các đơn khác đã được báo "Không được chọn". Hợp tác xong thì bấm "Hoàn tất".'
      : 'Đã đóng tuyển: không nhận đơn mới. Các đơn đã gửi và hợp tác đã xác nhận vẫn được xử lý; xử lý xong thì bấm "Hoàn tất".';
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
  const todos = campaignTodos(campaign, bookings);
  // Ứng viên: open invites; Hợp tác: bookings confirmed at some point (accepted or later, incl. cancelled after it).
  const invites = bookings.filter((b) => b.origin === 'INVITE' && !b.acceptedAt);
  const collabs = bookings.filter((b) => !!b.acceptedAt);
  const section = parseCollabSection(searchParams);

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

      <HeaderCard c={campaign} bookings={bookings} onConfirm={setConfirm} onCancel={() => setCancelOpen(true)} />

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams((prev) => withParam(withParam(prev, 'muc', null), 'tab', v === 'tong-quan' ? null : v), { replace: true })}
        className="gap-4"
      >
        <div className="border-b border-border">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-x-5 rounded-none bg-transparent p-0 @lg:flex @lg:w-auto @lg:justify-start">
            <TabsTrigger value="tong-quan" className={TAB_TRIGGER}>
              Tổng quan <Count n={todos.length} highlight />
            </TabsTrigger>
            <TabsTrigger value="ung-vien" className={TAB_TRIGGER}>
              Ứng viên <Count n={applications.length} highlight />
            </TabsTrigger>
            <TabsTrigger value="hop-tac" className={TAB_TRIGGER}>
              Hợp tác <Count n={collabs.length} />
            </TabsTrigger>
            <TabsTrigger value="thong-tin" className={TAB_TRIGGER}>
              Thông tin chiến dịch
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
        <TabsContent value="ung-vien" className="mt-0 space-y-6">
          {recruit ? (
            <SelectionTab campaign={campaign} bookings={bookings} onOpen={openBooking} onOpenKol={kol.openKol} />
          ) : (
            <>
              {marketplace && (
                <section className="space-y-3" aria-labelledby="ung-vien-don">
                  <h3 id="ung-vien-don" className="text-base font-semibold text-foreground">
                    Đơn ứng tuyển
                  </h3>
                  <ApplicationsTab bookings={bookings} actions={actions} onOpen={openBooking} onOpenKol={kol.openKol} />
                </section>
              )}
              <section className="space-y-3" aria-labelledby="ung-vien-moi">
                <h3 id="ung-vien-moi" className="text-base font-semibold text-foreground">
                  Lời mời
                </h3>
                <BookingsTab
                  bookings={invites}
                  canInvite={acts.invite}
                  onInvite={() => setInviteOpen(true)}
                  onOpen={openBooking}
                  intro="Booking 1 KOL: mời nhiều KOL, người nhận lời đầu tiên được chọn và chiến dịch tự đóng tuyển."
                  emptyTitle="Chưa có lời mời"
                  label="Lời mời của chiến dịch"
                />
              </section>
            </>
          )}
        </TabsContent>
        <TabsContent value="hop-tac" className="mt-0 space-y-4">
          <div role="tablist" aria-label="Mục hợp tác" className="inline-grid grid-cols-3 gap-1 rounded-[8px] bg-muted p-1">
            {(
              [
                ['danh-sach', `Hợp tác (${collabs.length})`],
                ['noi-dung', `Nội dung (${pendingDrafts.length})`],
                ['bao-cao', 'Báo cáo'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={section === key}
                onClick={() => setSearchParams((prev) => withParam(prev, 'muc', key === 'danh-sach' ? null : key), { replace: true })}
                className={cn(
                  'h-11 rounded-[6px] px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9',
                  section === key ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {section === 'danh-sach' && (
            <BookingsTab
              bookings={collabs}
              canInvite={false}
              onInvite={() => {}}
              onOpen={openBooking}
              intro="KOL đã xác nhận hợp tác: công việc, nội dung, kết quả và thanh toán (thanh toán ngoài KOLHUB, chỉ ghi nhận)."
              emptyTitle="Chưa có hợp tác"
              emptyText="Khi bạn chọn KOL (hoặc KOL nhận lời mời), hợp tác hiện ở đây."
              label="Hợp tác của chiến dịch"
            />
          )}
          {section === 'noi-dung' && <ContentTab bookings={bookings} actions={actions} onOpen={openBooking} />}
          {section === 'bao-cao' && <ReportTab bookings={bookings} onOpen={openBooking} />}
        </TabsContent>
        <TabsContent value="thong-tin" className="mt-0">
          <InfoTab campaign={campaign} />
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
