import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Building2, Loader2, LogIn, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import {
  BOOKING_NOTE_MAX,
  BOOKING_STATUS_LABEL,
  bookingService,
  type BookingView,
  type MarketplaceCampaign,
  type OwnerType,
  type ProfileStatus,
} from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { CampaignTypeBadge, ConditionsList, PhaseBadge, RecruitTimeline, RewardBlock, WorkflowNote } from '../shared/RecruitParts';
import { contractLabel, deadlineText, RECRUIT_STAGE_LABEL, recruitStage, regionText, rewardShort, rewardText, usageRightsText, workflowLabel } from '../shared/recruitView';
import { PLATFORM_LABEL } from '../shared/StatusBadges';
import { ReasonDialog } from '../violations/ReasonDialog';
import { ApplyDialog } from './ApplyDialog';
import { CampaignQASection } from './CampaignQA';
import { MineBadge, MyBookingBadge } from './MarketplaceCampaignCard';
import { BrandInfoBlock, MatchDetails, SaveButton } from './MarketplaceParts';
import { CountdownText, errText, Fact, LongText, PlatformIcons, SheetSection } from './parts';
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

/**
 * Shared body of a marketplace campaign detail (/san/<id>, MarketplaceCampaignPage): header, REVU-style
 * sections, the schedule card of the right rail, and the per-viewer call to action (+ its dialogs).
 */

export interface DetailAccess {
  accountId: string;
  ownerType: OwnerType;
  status?: ProfileStatus;
  approved: boolean;
}

const isRecruit = (c: MarketplaceCampaign) => c.type === 'OPEN_RECRUITMENT' && !!c.recruitment;

/** Brand, campaign name (page heading) and state badges. */
export function CampaignDetailHeader({ campaign: c, now }: { campaign: MarketplaceCampaign; now: number }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span className="truncate font-medium text-foreground">{c.promotedBrand?.name ?? c.brand.company}</span>
        {c.promotedBrand?.viaAgency && <span className="truncate">· vận hành bởi {c.brand.company}</span>}
      </p>
      <h1 className="text-xl font-semibold break-words text-foreground md:text-2xl">{c.name}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <PhaseBadge campaign={c} now={now} />
        <CampaignTypeBadge type={c.type} />
        {c.myBooking && <MyBookingBadge myBooking={c.myBooking} />}
        {c.mine && <MineBadge />}
        <PlatformIcons platforms={c.platforms} withLabel />
      </div>
    </div>
  );
}

function DeadlineValue({ campaign: c, now }: { campaign: MarketplaceCampaign; now: number }) {
  if (!c.applyDeadline) return <>Không giới hạn</>;
  return (
    <span className="flex flex-col gap-0.5">
      {deadlineText(c)}
      <CountdownText countdown={deadlineCountdown(c.applyDeadline, now)} />
    </span>
  );
}

/**
 * Main column: Phù hợp với bạn, key facts, Lịch trình (only where the rail is hidden: `narrowOnlyClass`),
 * Phần thưởng, Điều kiện tham gia, Bản tóm tắt sáng tạo, Yêu cầu nội dung, Hỏi đáp, Nhãn hàng.
 */
export function CampaignDetailSections({
  campaign: c,
  viewer,
  now,
  narrowOnlyClass,
  preview = false,
}: {
  campaign: MarketplaceCampaign;
  viewer: MarketplaceViewer;
  now: number;
  /** Class hiding blocks that the right rail already shows on wide screens. */
  narrowOnlyClass: string;
  /** "Xem trước" of the create form: no Q&A (the campaign does not exist on the Sàn yet). */
  preview?: boolean;
}) {
  const recruit = isRecruit(c);
  return (
    <div className="@container min-w-0 space-y-6">
      {c.match && (
        <SheetSection title="Phù hợp với bạn">
          <MatchDetails match={c.match} />
        </SheetSection>
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-[8px] border border-border bg-card p-4 @lg:grid-cols-3">
        {recruit ? (
          <>
            <Fact label="Phần thưởng / KOL">
              <span className="font-semibold text-primary tabular-nums">{rewardShort(c.recruitment!.reward)}</span>
            </Fact>
            <Fact label="Tổng ngân sách dự kiến">
              <span className="tabular-nums">{formatVnd(c.budget)}</span>
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
              <DeadlineValue campaign={c} now={now} />
            </Fact>
          </>
        )}
        <Fact label="Khu vực">{regionText(c.regions)}</Fact>
        <Fact label="Workflow">{workflowLabel(c.draftReview)}</Fact>
        {!recruit && <Fact label="Thù lao">Cố định theo nhóm đầu việc</Fact>}
        <Fact label="Hợp đồng">{contractLabel(c.contract)}</Fact>
      </dl>

      {recruit && (
        <div className={narrowOnlyClass}>
          <SheetSection title="Lịch trình">
            <RecruitTimeline timeline={c.recruitment!.timeline} phase={c.phase} />
          </SheetSection>
        </div>
      )}

      <SheetSection title="Phần thưởng">
        {recruit ? (
          <RewardBlock reward={c.recruitment!.reward} slots={c.recruitment!.slots} />
        ) : (
          <div className="space-y-2">
            <ul className="divide-y divide-border rounded-[8px] border border-border">
              {c.groups.map((g) => (
                <li key={g.platform} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2.5">
                  <span className="text-sm text-foreground">{PLATFORM_LABEL[g.platform]}</span>
                  <span className="text-sm font-semibold text-primary tabular-nums">{rewardText(g.reward)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Nhãn hàng chọn 1 KOL/MCN cho chiến dịch. Thù lao cố định gồm toàn bộ đầu việc của nhóm; bạn không cần báo giá.
            </p>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Điều kiện tham gia">
        <ConditionsList target={c.target} categories={c.categories} regions={c.regions} />
      </SheetSection>

      <SheetSection title="Bản tóm tắt sáng tạo">
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
        <p className="text-xs text-muted-foreground">Hạng mục nội dung</p>
        <ul className="divide-y divide-border rounded-[8px] border border-border bg-card">
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

      {/* EP-02 §4.2: shown before applying; never "unlimited" by default. */}
      <SheetSection title="Quyền sử dụng nội dung">
        {c.usageRights ? (
          <div className="space-y-1 text-sm text-foreground">
            <p>{usageRightsText(c.usageRights)}</p>
            {c.usageRights.note && <LongText text={c.usageRights.note} />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nhãn hàng không yêu cầu sử dụng lại nội dung ngoài bài đăng gốc.</p>
        )}
      </SheetSection>

      {!preview && (
        <div id="hoi-dap" className="scroll-mt-20">
          <SheetSection title="Hỏi đáp">
            <CampaignQASection campaignId={c.id} viewer={viewer} mine={c.mine} canAsk />
          </SheetSection>
        </div>
      )}

      {c.brandInfo && (
        <SheetSection title="Nhãn hàng">
          <BrandInfoBlock info={c.brandInfo} />
        </SheetSection>
      )}
    </div>
  );
}

/** Right rail: recruitment timeline (Tuyển nhiều KOL) or dates + application count (Booking riêng). */
export function CampaignScheduleCard({ campaign: c, now }: { campaign: MarketplaceCampaign; now: number }) {
  if (isRecruit(c)) {
    return (
      <div className="space-y-3 rounded-[8px] border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Lịch trình</h2>
          <PhaseBadge campaign={c} now={now} />
        </div>
        <RecruitTimeline timeline={c.recruitment!.timeline} phase={c.phase} />
        <p className="border-t border-border pt-3 text-sm text-foreground tabular-nums">
          Đã ứng tuyển <span className="font-semibold">{c.applicationCount}</span> / {c.recruitment!.slots} suất
        </p>
        {c.selectedCount !== undefined && (
          <p className="text-sm text-foreground tabular-nums">
            Đã chọn <span className="font-semibold">{c.selectedCount}</span> / {c.recruitment!.slots} suất
          </p>
        )}
      </div>
    );
  }
  return (
    <dl className="space-y-3 rounded-[8px] border border-border bg-card p-4">
      <Fact label="Thời gian chạy">{formatDayRange(c.startDate, c.endDate)}</Fact>
      <Fact label="Hạn ứng tuyển">
        <DeadlineValue campaign={c} now={now} />
      </Fact>
      <Fact label="Đề xuất đã nhận">{c.applicationCount}</Fact>
    </dl>
  );
}

/**
 * Call to action of the viewer and the dialogs behind it. `cta` may be rendered in several places
 * (rail on wide screens, sticky bar on phones); `dialogs` once. Lay `cta` out inside an `@container`.
 * Guest: "Đăng nhập để ứng tuyển" (returns to /san/<id>). Brand: read-only, own campaign → "Quản lý chiến dịch".
 * KOL/MCN: save + apply, or the existing booking (edit / withdraw while the brand has not answered), or the profile gate.
 */
export function useCampaignActions(
  c: MarketplaceCampaign | null,
  access: DetailAccess,
  viewer: MarketplaceViewer,
  now: number,
): { cta: ReactNode; dialogs: ReactNode } {
  const supplier = viewer === 'supplier';
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState<BookingView | null>(null);
  const [editing, setEditing] = useState<BookingView | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  if (!c) return { cta: null, dialogs: null };

  const countdown = deadlineCountdown(c.applyDeadline, now);
  const recruit = isRecruit(c);
  // Open recruitment takes applications only during "Ứng tuyển".
  const closed = !!countdown?.passed || c.accepting === false;
  const closedText = c.recruitmentClosed
    ? 'Đã đóng tuyển: chiến dịch không nhận đơn mới.'
    : c.paused
      ? 'Chiến dịch đang cập nhật nội dung nên tạm ngừng nhận đơn mới. Vui lòng quay lại sau.'
      : recruit
        ? 'Chiến dịch không còn nhận ứng tuyển (đã qua giai đoạn Ứng tuyển).'
        : 'Chiến dịch đã hết hạn nhận đề xuất.';
  const myBookingId = c.myBooking?.id ?? (applied && applied.campaignId === c.id ? applied.id : undefined);
  // Sàn v2: an application the brand has not answered yet can be edited or withdrawn here.
  const editable = supplier && access.approved && c.myBooking?.origin === 'APPLICATION' && c.myBooking.status === 'APPLIED';
  // "Tuyển nhiều KOL": editable only while "Ứng tuyển" lasts; it can still be withdrawn until picked.
  const canEdit = editable && (c.type !== 'OPEN_RECRUITMENT' || c.phase === 'APPLY');

  const startEdit = async () => {
    if (!c.myBooking) return;
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

  let cta: ReactNode;
  if (viewer === 'guest') {
    cta = <GuestCta campaignId={c.id} closed={closed} closedText={closedText} />;
  } else if (viewer === 'brand') {
    cta = <BrandCta campaignId={c.id} mine={!!c.mine} />;
  } else if (myBookingId) {
    cta = (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground">
          {recruit
            ? c.myBooking && c.myBooking.status !== 'APPLIED'
              ? `Bạn đã ứng tuyển · ${RECRUIT_STAGE_LABEL[recruitStage(c.myBooking)]}`
              : 'Bạn đã ứng tuyển · Chờ Nhãn hàng chọn trong giai đoạn Chọn lọc'
            : c.myBooking
              ? `${c.myBooking.origin === 'APPLICATION' ? 'Bạn đã ứng tuyển' : 'Bạn đã được mời'} · ${c.myBooking.status === 'SENT' ? 'Lời mời mới' : BOOKING_STATUS_LABEL[c.myBooking.status]}`
              : 'Bạn đã ứng tuyển · Chờ Nhãn hàng phản hồi'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {editable && (
            <>
              <Button type="button" variant="ghost" className="h-11 text-destructive hover:text-destructive md:h-9" onClick={() => setWithdrawOpen(true)}>
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
          <Link to={bookingDetailPath(myBookingId)} className={buttonVariants({ className: cn('h-11 md:h-9', (!editable || canEdit) && 'col-span-2') })}>
            Xem booking
          </Link>
        </div>
      </div>
    );
  } else if (!access.approved) {
    cta = (
      <div className="space-y-3">
        <SupplierGate ownerType={access.ownerType} status={access.status} compact />
        {c.accepting !== false && <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} className="w-full" />}
      </div>
    );
  } else {
    cta = (
      <div className="flex flex-col gap-2">
        {closed && <p className="text-sm text-muted-foreground">{closedText}</p>}
        <div className="grid grid-cols-2 gap-2">
          <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} />
          <Button type="button" className="h-11 md:h-9" disabled={closed} onClick={() => setApplyOpen(true)}>
            {recruit ? 'Ứng tuyển ngay' : 'Ứng tuyển'}
          </Button>
        </div>
      </div>
    );
  }

  const dialogs = (
    <>
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
  );

  return { cta, dialogs };
}

/** Guest: public brief only; applying needs an account (returns to this campaign page after login). */
function GuestCta({ campaignId, closed, closedText }: { campaignId: string; closed: boolean; closedText: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {closed ? closedText : 'Đăng nhập bằng tài khoản KOL hoặc MCN để ứng tuyển.'}{' '}
        <Link to="/dang-ky" className="font-medium text-primary underline-offset-4 hover:underline">
          Chưa có tài khoản? Đăng ký
        </Link>
      </p>
      {!closed && (
        <Link to={loginToApplyPath(campaignId)} className={buttonVariants({ className: 'h-11 w-full md:h-9' })}>
          <LogIn aria-hidden />
          Đăng nhập để ứng tuyển
        </Link>
      )}
    </div>
  );
}

/** Brand: the Sàn is read-only; own campaigns link to their management page. */
function BrandCta({ campaignId, mine }: { campaignId: string; mine: boolean }) {
  if (!mine) {
    return <p className="text-sm text-muted-foreground">Bạn đang xem Sàn với vai trò Nhãn hàng. Chỉ KOL/MCN mới gửi được đề xuất ứng tuyển.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-foreground">Đây là chiến dịch của bạn. Xem đề xuất ứng tuyển và quản lý booking trong trang chiến dịch.</p>
      <Link to={brandCampaignPath(campaignId)} className={buttonVariants({ className: 'h-11 w-full md:h-9' })}>
        Quản lý chiến dịch
      </Link>
    </div>
  );
}
