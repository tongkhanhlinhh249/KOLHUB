import { useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Building2, Loader2, LogIn, Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import {
  BOOKING_NOTE_MAX,
  BOOKING_STATUS_LABEL,
  bookingService,
  campaignService,
  type BookingView,
  type OwnerType,
  type ProfileStatus,
} from '../../services';
import { CampaignCover } from '../shared/CampaignCover';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ReasonDialog } from '../violations/ReasonDialog';
import { ApplyDialog } from './ApplyDialog';
import { MineBadge, MyBookingBadge } from './MarketplaceCampaignCard';
import { BrandInfoBlock, MatchDetails, SaveButton } from './MarketplaceParts';
import { CategoryChips, CountdownText, errText, Fact, LongText, PlatformIcons, SheetSection } from './parts';
import {
  bookingDetailPath,
  brandCampaignPath,
  deadlineCountdown,
  deliverableLabel,
  formatDay,
  formatDayRange,
  formatVnd,
  loginToApplyPath,
  platformName,
  type MarketplaceViewer,
} from './supplierBooking';
import { SupplierGate } from './useSupplierAccess';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { ConditionsList, PhaseBadge, RecruitTimeline, RecruitTypeBadge, RewardBlock, WorkflowNote } from '../shared/RecruitParts';
import { RECRUIT_STAGE_LABEL, recruitStage, regionText, rewardShort, workflowLabel } from '../shared/recruitView';
import { CampaignQASection } from './CampaignQA';

/**
 * The sheet's built-in close button (last child of the content) as a round, near-opaque 44 px button (36 px from md)
 * so it stays visible over the cover image.
 */
const CLOSE_OVER_IMAGE = [
  '[&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:z-20',
  '[&>button:last-child]:flex [&>button:last-child]:size-11 md:[&>button:last-child]:size-9',
  '[&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full',
  '[&>button:last-child]:bg-background/90 [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-sm',
].join(' ');

/**
 * Marketplace campaign detail (?chien-dich=): brief, deliverables, content rules, dates and the
 * "Ứng tuyển" action — or the viewer's booking on it, or the profile gate when not approved.
 * Guest: "Đăng nhập để ứng tuyển". Brand: read-only; own campaigns link to their campaign page.
 */
export function CampaignDetailSheet({
  campaignId,
  onClose,
  access,
  viewer = 'supplier',
}: {
  campaignId: string | null;
  onClose(): void;
  access: { accountId: string; ownerType: OwnerType; status?: ProfileStatus; approved: boolean };
  viewer?: MarketplaceViewer;
}) {
  const supplier = viewer === 'supplier';
  const q = useLiveQuery(() => (campaignId ? campaignService.getMarketplaceItem(campaignId) : Promise.resolve(null)), [campaignId]);
  const c = q.data && q.data.id === campaignId ? q.data : null;
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState<BookingView | null>(null);
  const [editing, setEditing] = useState<BookingView | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const now = Date.now();
  const countdown = c ? deadlineCountdown(c.applyDeadline, now) : null;
  const recruit = c?.type === 'OPEN_RECRUITMENT' && !!c.recruitment;
  // Open recruitment takes applications only during "Ứng tuyển".
  const closed = !!countdown?.passed || c?.accepting === false;
  const closedText = recruit ? 'Chiến dịch không còn nhận ứng tuyển (đã qua giai đoạn Ứng tuyển).' : 'Chiến dịch đã hết hạn nhận đề xuất.';
  const myBookingId = c?.myBooking?.id ?? (applied && applied.campaignId === c?.id ? applied.id : undefined);
  // Sàn v2: an application the brand has not answered yet can be edited or withdrawn here.
  const editable = supplier && access.approved && c?.myBooking?.origin === 'APPLICATION' && c.myBooking.status === 'APPLIED';
  // "Tuyển nhiều KOL": editable only while "Ứng tuyển" lasts; it can still be withdrawn until picked.
  const canEdit = editable && (c?.type !== 'OPEN_RECRUITMENT' || c?.phase === 'APPLY');

  const startEdit = async () => {
    if (!c?.myBooking) return;
    setLoadingEdit(true);
    try {
      const b = await bookingService.get(c.myBooking.id);
      if (!b.allowedActions.includes('EDIT_APPLICATION')) {
        toast.error('Nhãn hàng đã phản hồi, không thể sửa đề xuất nữa.');
        return;
      }
      setEditing(b);
      setApplyOpen(true);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoadingEdit(false);
    }
  };

  const cta = c ? (
viewer === 'guest' ? (
                <GuestFooter campaignId={c.id} closed={closed} closedText={closedText} />
              ) : viewer === 'brand' ? (
                <BrandFooter campaignId={c.id} mine={!!c.mine} />
              ) : myBookingId ? (
                <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
                  <p className="text-sm text-foreground">
                    {recruit
                      ? c.myBooking && c.myBooking.status !== 'APPLIED'
                        ? `Bạn đã ứng tuyển · ${RECRUIT_STAGE_LABEL[recruitStage(c.myBooking)]}`
                        : 'Bạn đã ứng tuyển · Chờ Nhãn hàng chọn trong giai đoạn Chọn lọc'
                      : c.myBooking
                        ? `${c.myBooking.origin === 'APPLICATION' ? 'Bạn đã ứng tuyển' : 'Bạn đã được mời'} · ${c.myBooking.status === 'SENT' ? 'Lời mời mới' : BOOKING_STATUS_LABEL[c.myBooking.status]}`
                        : 'Bạn đã ứng tuyển · Chờ Nhãn hàng phản hồi'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 @lg:flex @lg:items-center">
                    {editable && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 text-destructive hover:text-destructive md:h-9"
                          onClick={() => setWithdrawOpen(true)}
                        >
                          {recruit ? 'Rút ứng tuyển' : 'Rút đề xuất'}
                        </Button>
                        {canEdit && (
                        <Button type="button" variant="outline" className="h-11 md:h-9" disabled={loadingEdit} onClick={() => void startEdit()}>
                          {loadingEdit ? <Loader2 className="animate-spin" aria-hidden /> : <Pencil aria-hidden />}
                          {recruit ? 'Sửa ứng tuyển' : 'Sửa đề xuất'}
                        </Button>
                        )}
                      </>
                    )}
                    <Link to={bookingDetailPath(myBookingId)} className={buttonVariants({ className: cn('h-11 md:h-9', editable && 'col-span-2') })}>
                      Xem booking
                    </Link>
                  </div>
                </div>
              ) : !access.approved ? (
                <div className="space-y-3">
                  <SupplierGate ownerType={access.ownerType} status={access.status} compact />
                  {c.accepting !== false && <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} className="w-full @lg:w-auto" />}
                </div>
              ) : (
                <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:justify-end">
                  {closed && <p className="text-sm text-muted-foreground @lg:mr-auto">{closedText}</p>}
                  <div className="grid grid-cols-2 gap-2 @lg:flex">
                    <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} />
                    <Button type="button" className="h-11 md:h-9" disabled={closed} onClick={() => setApplyOpen(true)}>
                      {recruit ? 'Ứng tuyển ngay' : 'Ứng tuyển'}
                    </Button>
                  </div>
                </div>
              )
  ) : null;

  return (
    <Sheet open={campaignId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className={cn('@container/sheet flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-3xl xl:max-w-5xl', CLOSE_OVER_IMAGE)}>
        <SheetHeader className="sr-only">
          <SheetTitle>{c ? c.name : 'Chi tiết chiến dịch'}</SheetTitle>
          <SheetDescription>Brief, hạng mục, quy định nội dung và thời gian của chiến dịch.</SheetDescription>
        </SheetHeader>

        {q.loading && !c && (
          <div className="space-y-4 p-4 pt-12 sm:p-6" aria-busy="true" aria-label="Đang tải chiến dịch">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {q.error && !c && !q.loading ? (
          <div className="p-4 pt-12 sm:p-6">
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
          </div>
        ) : null}

        {c && (
          <>
            <div className="@container min-h-0 flex-1 overflow-y-auto">
              {c.cover && <CampaignCover cover={c.cover} alt={`Ảnh chiến dịch ${c.name}`} className="aspect-video w-full @4xl/sheet:aspect-[21/9]" />}
              <div className={cn('space-y-2 border-b border-border bg-muted/50 px-4 pb-5 sm:px-6', c.cover ? 'pt-4 sm:pt-5' : 'pt-12 sm:pt-6')}>
                <p className="flex items-center gap-1.5 pr-8 text-sm text-muted-foreground">
                  <Building2 className="size-4 shrink-0" aria-hidden />
                  <span className="truncate font-medium text-foreground">{c.brand.company}</span>
                </p>
                <h2 className="pr-8 text-lg font-semibold break-words text-foreground sm:text-xl">{c.name}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <PhaseBadge campaign={c} now={now} />
                  {recruit && <RecruitTypeBadge />}
                  {c.myBooking && <MyBookingBadge myBooking={c.myBooking} />}
                  {c.mine && <MineBadge />}
                  <PlatformIcons platforms={c.platforms} withLabel />
                </div>
              </div>

              <div className="grid gap-6 p-4 sm:p-6 @4xl/sheet:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-w-0 space-y-6">
                  {c.match && (
                    <SheetSection title="Phù hợp với bạn">
                      <MatchDetails match={c.match} />
                    </SheetSection>
                  )}

                  <dl className="grid grid-cols-2 gap-4 rounded-[8px] border border-border p-4 @lg:grid-cols-4">
                    {recruit ? (
                      <>
                        <Fact label="Phần thưởng / KOL">
                          <span className="font-semibold text-primary tabular-nums">{rewardShort(c.recruitment!.reward)}</span>
                        </Fact>
                        <Fact label="Đã ứng tuyển">
                          <span className="tabular-nums">
                            {c.applicationCount} / {c.recruitment!.slots} suất
                          </span>
                        </Fact>
                      </>
                    ) : (
                      <>
                        <Fact label="Ngân sách">
                          <span className="font-semibold text-primary tabular-nums">{formatVnd(c.budget)}</span>
                        </Fact>
                        <Fact label="Hạn ứng tuyển">
                          {c.applyDeadline ? (
                            <span className="flex flex-col gap-0.5">
                              {formatDay(c.applyDeadline)}
                              <CountdownText countdown={countdown} />
                            </span>
                          ) : (
                            'Không giới hạn'
                          )}
                        </Fact>
                      </>
                    )}
                    <Fact label="Khu vực">{regionText(c.regions)}</Fact>
                    <Fact label="Workflow">{workflowLabel(c.draftReview)}</Fact>
                  </dl>

                  {recruit && (
                    <div className="@4xl/sheet:hidden">
                      <SheetSection title="Lịch trình">
                        <RecruitTimeline timeline={c.recruitment!.timeline} phase={c.phase} />
                      </SheetSection>
                    </div>
                  )}

                  <SheetSection title="Phần thưởng">
                    {recruit ? (
                      <RewardBlock reward={c.recruitment!.reward} slots={c.recruitment!.slots} />
                    ) : (
                      <p className="text-sm text-foreground">
                        Ngân sách chiến dịch <span className="font-semibold text-primary tabular-nums">{formatVnd(c.budget)}</span>. Bạn đề xuất giá cho phần
                        việc của mình khi ứng tuyển, Nhãn hàng có thể thương lượng.
                      </p>
                    )}
                  </SheetSection>

                  <SheetSection title="Điều kiện tham gia">
                    <ConditionsList target={c.target} categories={c.categories} regions={c.regions} />
                  </SheetSection>

                  <SheetSection title="Hướng dẫn chiến dịch">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Mục tiêu</p>
                        <LongText text={c.objective} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Brief</p>
                        <LongText text={c.brief} />
                      </div>
                      {!recruit && (
                        <p className="text-sm text-muted-foreground">
                          Thời gian chạy: <span className="text-foreground">{formatDayRange(c.startDate, c.endDate)}</span>
                        </p>
                      )}
                    </div>
                  </SheetSection>

                  <SheetSection title="Yêu cầu nội dung">
                    <ul className="divide-y divide-border rounded-[8px] border border-border">
                      {c.deliverables.map((d, i) => (
                        <li key={i} className="flex min-h-12 items-center gap-3 px-3 py-2 text-sm">
                          <PlatformIcon platform={d.platform} className="size-6 rounded-md" />
                          <span className="min-w-0 flex-1 text-foreground">
                            {deliverableLabel(d.type)} {platformName(d.platform)}
                          </span>
                          <span className="font-medium text-foreground tabular-nums">× {d.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Quy định nội dung</p>
                      <LongText text={c.contentRules} />
                    </div>
                    <WorkflowNote draftReview={c.draftReview} />
                    {(c.survey.length > 0 || c.terms.length > 0) && (
                      <p className="text-xs text-muted-foreground">
                        Khi ứng tuyển: {c.survey.length > 0 ? `trả lời ${c.survey.length} câu hỏi khảo sát` : ''}
                        {c.survey.length > 0 && c.terms.length > 0 ? ', ' : ''}
                        {c.terms.length > 0 ? `đồng ý ${c.terms.length} điều khoản` : ''}
                        {recruit && c.recruitment!.reward.product ? ', nhập địa chỉ nhận sản phẩm' : ''}.
                      </p>
                    )}
                  </SheetSection>

                  <SheetSection title="Hỏi đáp">
                    <CampaignQASection campaignId={c.id} viewer={viewer} mine={c.mine} canAsk />
                  </SheetSection>

                  {c.brandInfo && (
                    <SheetSection title="Nhãn hàng">
                      <BrandInfoBlock info={c.brandInfo} />
                    </SheetSection>
                  )}
                </div>

                <aside className="hidden @4xl/sheet:block" aria-label="Lịch trình và ứng tuyển">
                  <div className="sticky top-4 space-y-4">
                    {recruit ? (
                      <div className="space-y-3 rounded-[8px] border border-border p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground">Lịch trình</h3>
                          <PhaseBadge campaign={c} now={now} />
                        </div>
                        <RecruitTimeline timeline={c.recruitment!.timeline} phase={c.phase} />
                        <p className="border-t border-border pt-3 text-sm text-foreground tabular-nums">
                          Đã ứng tuyển <span className="font-semibold">{c.applicationCount}</span> / {c.recruitment!.slots} suất
                        </p>
                      </div>
                    ) : (
                      <dl className="space-y-3 rounded-[8px] border border-border p-4">
                        <Fact label="Thời gian">{formatDayRange(c.startDate, c.endDate)}</Fact>
                        <Fact label="Hạn ứng tuyển">
                          {c.applyDeadline ? (
                            <span className="flex flex-col gap-0.5">
                              {formatDay(c.applyDeadline)}
                              <CountdownText countdown={countdown} />
                            </span>
                          ) : (
                            'Không giới hạn'
                          )}
                        </Fact>
                        <Fact label="Đề xuất đã nhận">{c.applicationCount}</Fact>
                      </dl>
                    )}
                    <div className="@container rounded-[8px] border border-border p-4">{cta}</div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="@container shrink-0 space-y-3 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 @4xl/sheet:hidden">
              {cta}
            </div>

            {supplier && access.approved && (
              <ApplyDialog
                open={applyOpen}
                onOpenChange={(o) => {
                  setApplyOpen(o);
                  if (!o) setEditing(null);
                }}
                campaign={c}
                accountId={access.accountId}
                supplierType={access.ownerType}
                onApplied={setApplied}
                editing={editing}
              />
            )}

            {editable && c.myBooking && (
              <ReasonDialog
                open={withdrawOpen}
                onOpenChange={setWithdrawOpen}
                title="Rút đề xuất ứng tuyển"
                description="Nhãn hàng sẽ không thể chấp nhận đề xuất này nữa. Bạn có thể ứng tuyển lại khi chiến dịch còn nhận đề xuất."
                label="Lý do (không bắt buộc)"
                placeholder="Nêu ngắn gọn lý do…"
                confirmLabel="Rút đề xuất"
                minLength={0}
                maxLength={BOOKING_NOTE_MAX}
                destructive
                onConfirm={async (text) => {
                  await bookingService.cancel(c.myBooking!.id, text || undefined);
                  setApplied(null);
                  toast.success('Đã rút đề xuất', { description: c.name });
                }}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Guest: public brief only; applying needs an account (returns to this campaign after login). */
function GuestFooter({ campaignId, closed, closedText }: { campaignId: string; closed: boolean; closedText: string }) {
  return (
    <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:justify-between">
      <p className="text-sm text-muted-foreground">
        {closed ? closedText : 'Đăng nhập bằng tài khoản KOL hoặc MCN để ứng tuyển.'}{' '}
        <Link to="/dang-ky" className="font-medium text-primary underline-offset-4 hover:underline">
          Chưa có tài khoản? Đăng ký
        </Link>
      </p>
      {!closed && (
        <Link to={loginToApplyPath(campaignId)} className={buttonVariants({ className: 'h-11 w-full @lg:w-auto md:h-9' })}>
          <LogIn aria-hidden />
          Đăng nhập để ứng tuyển
        </Link>
      )}
    </div>
  );
}

/** Brand: the Sàn is read-only; own campaigns link to their management page. */
function BrandFooter({ campaignId, mine }: { campaignId: string; mine: boolean }) {
  if (!mine) {
    return <p className="text-sm text-muted-foreground">Bạn đang xem Sàn với vai trò Nhãn hàng. Chỉ KOL/MCN mới gửi được đề xuất ứng tuyển.</p>;
  }
  return (
    <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:justify-between">
      <p className="text-sm text-foreground">Đây là chiến dịch của bạn. Xem đề xuất ứng tuyển và quản lý booking trong trang chiến dịch.</p>
      <Link to={brandCampaignPath(campaignId)} className={buttonVariants({ className: 'h-11 w-full @lg:w-auto md:h-9' })}>
        Quản lý chiến dịch
      </Link>
    </div>
  );
}
