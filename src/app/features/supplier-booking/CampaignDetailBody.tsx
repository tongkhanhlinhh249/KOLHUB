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
  channelService,
  type BookingView,
  type MarketplaceCampaign,
  type OwnerType,
  type ProfileStatus,
} from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { CampaignTypeBadge, ConditionsList, RecruitTimeline } from '../shared/RecruitParts';
import { RECRUIT_STAGE_LABEL, recruitStage, usageRightsText, workflowHint } from '../shared/recruitView';
import { PLATFORM_LABEL, ToneBadge } from '../shared/StatusBadges';
import { deadlineInfo, kolTargetText, MARKETPLACE_STATUS, marketplaceStatus, rewardSummary } from './marketplaceView';
import { ReasonDialog } from '../violations/ReasonDialog';
import { ApplyDialog } from './ApplyDialog';
import { CampaignQASection } from './CampaignQA';
import { MineBadge, MyBookingBadge } from './MarketplaceCampaignCard';
import { BrandInfoBlock, MatchDetails, SaveButton } from './MarketplaceParts';
import { CategoryChips, errText, Fact, LongText, PlatformIcons, SheetSection } from './parts';
import {
  bookingDetailPath,
  brandCampaignPath,
  deliverableLabel,
  formatDayRange,
  formatVnd,
  loginToApplyPath,
  marketplaceCampaignPath,
  platformName,
  type MarketplaceViewer,
} from './supplierBooking';
import { SupplierGate } from './useSupplierAccess';
import { useLiveQuery } from '../shared/useLiveQuery';
import { channelReadiness, marketplaceStatus as statusOf, READINESS_CTA, readinessPath } from './marketplaceView';

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

/** Brand being promoted (+ operating organisation), campaign name (page heading), application status (§7.1 ①). */
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
        <MarketplaceStatusBadge campaign={c} now={now} />
        <CampaignTypeBadge type={c.type} />
        {c.myBooking && <MyBookingBadge myBooking={c.myBooking} />}
        {c.mine && <MineBadge />}
      </div>
    </div>
  );
}

/** "Đang nhận ứng tuyển" / "Sắp hết hạn" (≤ 24 h) / "Tạm ngừng nhận ứng tuyển" / "Đã đóng tuyển" / "Hoàn tất" — from the status (§10). */
export function MarketplaceStatusBadge({ campaign: c, now, className }: { campaign: MarketplaceCampaign; now: number; className?: string }) {
  const st = marketplaceStatus(c);
  const soon = st === 'OPEN' && !!deadlineInfo(c, now)?.soon;
  return (
    <ToneBadge tone={soon ? 'warning' : MARKETPLACE_STATUS[st].tone} className={className}>
      {soon ? 'Sắp hết hạn' : MARKETPLACE_STATUS[st].label}
    </ToneBadge>
  );
}

/** "23:59 · 22/10/2026 (giờ Việt Nam)" + "Sắp hết hạn" within 24 h; open recruitment: end of "Ứng tuyển". */
function DeadlineValue({ campaign: c, now }: { campaign: MarketplaceCampaign; now: number }) {
  const dl = deadlineInfo(c, now, true);
  if (!dl) return <>Đến khi Nhãn hàng đóng tuyển</>;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="tabular-nums">{dl.text} (giờ Việt Nam)</span>
      {dl.soon && <span className="text-xs font-medium text-chart-5">Sắp hết hạn</span>}
    </span>
  );
}

/** Reward summary (§7.1 ②): cash per booking and gift apart, or "Quyền lợi theo hạng mục". */
function RewardFact({ campaign: c }: { campaign: MarketplaceCampaign }) {
  const r = rewardSummary(c, false);
  if (r.byGroup) return <span className="font-semibold text-primary">Quyền lợi theo hạng mục</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {r.cash && <span className="font-semibold text-primary tabular-nums">{r.cash}</span>}
      {r.product && <span className="font-normal">Quà: {r.product}</span>}
      {!r.cash && !r.product && <span className="text-muted-foreground">Chưa công bố</span>}
    </span>
  );
}

/** Label / value line of a detail section. */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

/** Gift as the brand set it: name, value (not money received), note; open recruitment asks for a shipping address. */
function ProductText({ product, shipping = false }: { product: { name: string; value: number; note?: string }; shipping?: boolean }) {
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span>{product.name}</span>
      <span className="text-xs font-normal text-muted-foreground tabular-nums">Trị giá {formatVnd(product.value)}</span>
      {product.note && <span className="text-xs font-normal text-muted-foreground">{product.note}</span>}
      {shipping && <span className="text-xs font-normal text-muted-foreground">Nhập địa chỉ nhận hàng khi ứng tuyển</span>}
    </span>
  );
}

/** One "Tính năng của chiến dịch" card of the create form, read-only: on → its settings; off → what that means. */
function FeatureRow({ title, on, offText, children }: { title: string; on: boolean; offText?: string; children: ReactNode }) {
  return (
    <li className="space-y-1.5 px-3 py-3">
      <p className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
        {title}
        <span className={cn('text-xs font-medium', on ? 'text-chart-4' : 'text-muted-foreground')}>{on ? 'Bật' : 'Tắt'}</span>
      </p>
      <div className="space-y-1 text-sm text-foreground">{on ? children : <p className="text-muted-foreground">{offText}</p>}</div>
    </li>
  );
}

/**
 * Main column: summary (quyền lợi, nền tảng, số KOL cần tuyển, hạn ứng tuyển — Công bố lên sàn §7.1), Phù hợp với bạn,
 * Lịch trình (only where the rail is hidden: `narrowOnlyClass`), then the sections of "Tạo chiến dịch" with the same
 * labels: Bản tóm tắt sáng tạo, Nội dung cần làm / Hạng mục nội dung, Quyền lợi theo nhóm đầu việc / Phần thưởng,
 * Thời gian, Tính năng của chiến dịch (Duyệt nháp, Sự tuân thủ, Hợp đồng, Điều kiện tham gia, Câu hỏi khảo sát), Quyền sử
 * dụng nội dung; then Hỏi đáp and Nhãn hàng. No budget, application or selection counts (§13).
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
      <dl className="grid grid-cols-2 gap-4 rounded-[8px] border border-border bg-card p-4 @lg:grid-cols-4">
        <Fact label="Quyền lợi">
          <RewardFact campaign={c} />
        </Fact>
        <Fact label="Nền tảng">
          <PlatformIcons platforms={c.platforms} withLabel />
        </Fact>
        <Fact label="Số KOL cần tuyển">
          <span className="tabular-nums">{kolTargetText(c)}</span>
        </Fact>
        <Fact label="Hạn ứng tuyển">
          <DeadlineValue campaign={c} now={now} />
        </Fact>
      </dl>

      {c.match && (
        <SheetSection title="Phù hợp với bạn">
          <MatchDetails match={c.match} />
        </SheetSection>
      )}

      {recruit && (
        <div className={narrowOnlyClass}>
          <SheetSection title="Lịch trình">
            <RecruitTimeline timeline={c.recruitment!.timeline} phase={c.phase} />
          </SheetSection>
        </div>
      )}

      {/* Same sections and labels as "Tạo chiến dịch", so KOL/MCN read exactly what the brand set. */}
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
          {c.categories.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Lĩnh vực</p>
              <CategoryChips categories={c.categories} />
            </div>
          )}
        </div>
      </SheetSection>

      <SheetSection title={recruit ? 'Hạng mục nội dung' : 'Nội dung cần làm'}>
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
      </SheetSection>

      <SheetSection title={recruit ? 'Phần thưởng' : 'Quyền lợi theo nhóm đầu việc'}>
        {recruit ? (
          <div className="space-y-3">
            <DetailRow label="Số KOL cần tuyển">{kolTargetText(c)}</DetailRow>
            <DetailRow label="Đề nghị trả phí">
              {c.recruitment!.reward.cash > 0 ? <span className="font-semibold text-primary tabular-nums">{formatVnd(c.recruitment!.reward.cash)}/booking</span> : 'Không'}
            </DetailRow>
            <DetailRow label="Tặng quà">{c.recruitment!.reward.product ? <ProductText product={c.recruitment!.reward.product} shipping /> : 'Không'}</DetailRow>
            <p className="text-xs text-muted-foreground">Phần thưởng cố định cho mỗi KOL được chọn, không cần báo giá. Giá trị quà tặng không phải tiền nhận được.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <ul className="divide-y divide-border rounded-[8px] border border-border">
              {c.groups.map((g) => (
                <li key={g.platform} className="space-y-2 px-3 py-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <PlatformIcon platform={g.platform} className="size-5 rounded-md" />
                    Nhóm {PLATFORM_LABEL[g.platform]}
                  </p>
                  <DetailRow label="Đề nghị trả phí">
                    {g.reward.cash > 0 ? <span className="font-semibold text-primary tabular-nums">{formatVnd(g.reward.cash)}/booking</span> : 'Không'}
                  </DetailRow>
                  <DetailRow label="Tặng quà">{g.reward.product ? <ProductText product={g.reward.product} /> : 'Không'}</DetailRow>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Nhãn hàng chọn 1 KOL/MCN cho chiến dịch. Mỗi kênh trong một nhóm là một booking; thù lao cố định gồm toàn bộ đầu việc của nhóm, bạn
              không cần báo giá.
            </p>
          </div>
        )}
      </SheetSection>

      {!recruit && (
        <SheetSection title="Thời gian">
          <div className="space-y-3">
            <DetailRow label="Thời gian chạy">{formatDayRange(c.startDate, c.endDate)}</DetailRow>
            <DetailRow label="Hạn ứng tuyển">
              <DeadlineValue campaign={c} now={now} />
            </DetailRow>
          </div>
        </SheetSection>
      )}

      <SheetSection title="Tính năng của chiến dịch">
        <ul className="divide-y divide-border rounded-[8px] border border-border bg-card">
          <FeatureRow title="Duyệt nháp" on={c.draftReview}>
            {workflowHint(c.draftReview)}
          </FeatureRow>
          <FeatureRow title="Sự tuân thủ" on={!!c.contentRules.trim()} offText="Nhãn hàng không đặt quy định nội dung riêng.">
            <span className="block text-xs text-muted-foreground">Quy định nội dung</span>
            <LongText text={c.contentRules} />
          </FeatureRow>
          <FeatureRow title="Hợp đồng" on={c.contract} offText="Không dùng hợp đồng: không có điều khoản khi ứng tuyển và tệp hợp đồng trong booking.">
            {c.terms.length > 0 ? (
              <>
                <span className="block text-xs text-muted-foreground">Điều khoản bạn đồng ý khi ứng tuyển</span>
                <ol className="list-decimal space-y-1 pl-5">
                  {c.terms.map((t) => (
                    <li key={t.id}>{t.text}</li>
                  ))}
                </ol>
              </>
            ) : (
              'Tệp hợp đồng hai bên đính kèm trong booking.'
            )}
          </FeatureRow>
          <FeatureRow title="Điều kiện tham gia" on>
            <ConditionsList target={c.target} categories={c.categories} regions={c.regions} />
            {c.target?.minFollowers !== undefined && (
              <span className="block text-xs text-muted-foreground">Số follower là tiêu chí Nhãn hàng xét khi chọn KOL, không chặn việc gửi ứng tuyển.</span>
            )}
          </FeatureRow>
          <FeatureRow title="Câu hỏi khảo sát" on={c.survey.length > 0} offText="Không có câu hỏi khi ứng tuyển.">
            <span className="block text-xs text-muted-foreground">Bạn trả lời khi ứng tuyển</span>
            <ol className="list-decimal space-y-1 pl-5">
              {c.survey.map((q) => (
                <li key={q.id}>
                  {q.text}
                  {q.required && <span className="text-muted-foreground"> (bắt buộc)</span>}
                </li>
              ))}
            </ol>
          </FeatureRow>
        </ul>
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

/** Right rail: status, deadline and "Số KOL cần tuyển"; open recruitment adds its timeline. No internal counts. */
export function CampaignScheduleCard({ campaign: c, now }: { campaign: MarketplaceCampaign; now: number }) {
  return (
    <div className="space-y-3 rounded-[8px] border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{isRecruit(c) ? 'Lịch trình' : 'Thời gian'}</h2>
        <MarketplaceStatusBadge campaign={c} now={now} />
      </div>
      {isRecruit(c) && <RecruitTimeline timeline={c.recruitment!.timeline} phase={c.phase} />}
      <dl className="space-y-3 border-t border-border pt-3">
        {!isRecruit(c) && <Fact label="Thời gian thực hiện">{formatDayRange(c.startDate, c.endDate)}</Fact>}
        <Fact label="Hạn ứng tuyển">
          <DeadlineValue campaign={c} now={now} />
        </Fact>
        <Fact label="Số KOL cần tuyển">{kolTargetText(c)}</Fact>
      </dl>
    </div>
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
  // §8: the viewer's channels decide between "Ứng tuyển" and "Thêm kênh / Xác thực kênh / Gia hạn kênh".
  const channelsQ = useLiveQuery(
    async () => (supplier && access.approved && access.accountId ? channelService.list(access.accountId) : null),
    [supplier, access.approved, access.accountId],
  );
  if (!c) return { cta: null, dialogs: null };

  const recruit = isRecruit(c);
  // Status of the page, never the deadline alone (a campaign closed by hand before its deadline is closed).
  const status = statusOf(c);
  const passed = (deadlineInfo(c, now)?.passed ?? false) && status === 'OPEN';
  const closed = status !== 'OPEN' || passed;
  const closedText =
    status === 'COMPLETED'
      ? 'Chiến dịch đã hoàn tất, không nhận đơn mới.'
      : status === 'PAUSED'
        ? 'Chiến dịch đang cập nhật nên tạm ngừng nhận ứng tuyển. Vui lòng quay lại sau.'
        : status === 'UPCOMING'
          ? 'Chưa đến giai đoạn Ứng tuyển. Lưu chiến dịch để quay lại khi mở.'
          : 'Đã đóng tuyển: chiến dịch không nhận đơn mới. Đơn đã gửi vẫn được giữ.';
  const closedLabel = status === 'PAUSED' ? 'Tạm ngừng nhận ứng tuyển' : status === 'UPCOMING' ? 'Sắp mở ứng tuyển' : status === 'COMPLETED' ? 'Hoàn tất' : 'Đã đóng tuyển';
  const readiness = channelsQ.data ? channelReadiness(channelsQ.data, c.platforms, now, access.ownerType) : 'READY';
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
            {myBookingLabel(c.myBooking ?? (applied ? { origin: 'APPLICATION', status: 'APPLIED' } : undefined))}
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
  } else if (closed) {
    // §8: closed / expired / paused / not open yet — no new application; old ones stay viewable from "Chiến dịch của tôi".
    cta = (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{closedText}</p>
        <div className={cn('grid gap-2', status === 'UPCOMING' ? 'grid-cols-2' : 'grid-cols-1')}>
          {status === 'UPCOMING' && <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} />}
          <Button type="button" className="h-11 md:h-9" disabled>
            {closedLabel}
          </Button>
        </div>
      </div>
    );
  } else if (readiness !== 'READY') {
    const r = READINESS_CTA[readiness];
    cta = (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{r.hint}</p>
        <div className="grid grid-cols-2 gap-2">
          <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} />
          <Link to={readinessPath(readiness, access.ownerType, marketplaceCampaignPath(c.id))} className={buttonVariants({ className: 'h-11 md:h-9' })}>
            {r.label}
          </Link>
        </div>
      </div>
    );
  } else {
    cta = (
      <div className="grid grid-cols-2 gap-2">
        <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} />
        <Button type="button" className="h-11 md:h-9" onClick={() => setApplyOpen(true)}>
          {recruit ? 'Ứng tuyển ngay' : 'Ứng tuyển'}
        </Button>
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

/** "Xem đơn ứng tuyển" while an application waits (§8), "Xem lời mời" for an invite, then "Xem booking". */
function myBookingLabel(b: { origin: string; status: string } | undefined): string {
  if (!b) return 'Xem booking';
  if (b.origin === 'APPLICATION' && (b.status === 'APPLIED' || b.status === 'NEGOTIATING')) return 'Xem đơn ứng tuyển';
  if (b.origin === 'INVITE' && b.status === 'SENT') return 'Xem lời mời';
  return 'Xem booking';
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
