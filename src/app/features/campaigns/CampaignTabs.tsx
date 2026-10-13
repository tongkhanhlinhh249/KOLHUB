import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, BarChart3, Check, ClipboardCheck, Inbox, Minus, UserPlus, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../components/ui/utils';
import type { BookingView, CampaignView } from '../../services';
import { formatCompactVi } from '../biz-search/format';
import { KolAvatar } from '../biz-search/KolCard';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { fieldIcon } from '../shared/fieldIcons';
import { ConditionsList, RecruitTimeline, RewardBlock, WorkflowNote } from '../shared/RecruitParts';
import { deadlineText, usageRightsText } from '../shared/recruitView';
import { phaseOfTimeline } from '../../services';
import { NegotiationButtons, type BookingActionsApi } from './BookingActions';
import { BookingItemRow } from './BookingSheet';
import {
  BookingStatusBadge,
  deliverableText,
  EmptyBlock,
  Meta,
  PlatformIcons,
  SupplierTypeBadge,
  TodoMarker,
  VisibilityLabel,
} from './CampaignParts';
import { DraftCard, href } from './ContentParts';
import {
  bookingPriceText,
  campaignEditPath,
  campaignMilestones,
  campaignTodos,
  kolProgress,
  type DetailTab,
  CAMPAIGN_LOG_ACTOR,
  CAMPAIGN_LOG_LABEL,
  campaignProgress,
  formatDayTime,
  groupRewardText,
  brandTodoLabel,
  campaignFeatures,
  collectDrafts,
  collectPosts,
  countByBookingStatus,
  expiryText,
  formatDateRange,
  formatDayMs,
  formatIsoDay,
  formatPercent,
  formatPrice,
  formatVnd,
  metricTotals,
  needsBrandAction,
  openApplications,
  sortBookings,
} from './campaignView';

/** Tổng quan › "Tính năng": which feature cards of the campaign are on. */
function FeatureSummary({ campaign }: { campaign: CampaignView }) {
  return (
    <ul className="grid grid-cols-1 gap-1.5 @md:grid-cols-2">
      {campaignFeatures(campaign).map((f) => (
        <li key={f.label} className={cn('flex items-center gap-2 text-sm', f.on ? 'text-foreground' : 'text-muted-foreground')}>
          {f.on ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : <Minus className="size-4 shrink-0" aria-hidden />}
          <span>{f.label}</span>
          <span className="sr-only">{f.on ? ': bật' : ': tắt'}</span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('gap-3 p-4 md:p-5', className)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </Card>
  );
}

/** A progress figure; with `to` it links to the tab that handles it (EP-02 US-13). */
function Stat({ label, value, hint, to }: { label: string; value: ReactNode; hint?: string; to?: string }) {
  const body = (
    <>
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">
        <span className="block truncate text-lg font-bold text-foreground tabular-nums">{value}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </>
  );
  const box = 'block min-w-0 rounded-[8px] border border-primary/20 bg-primary/5 p-3';
  return to ? (
    <div className="min-w-0">
      <Link
        to={to}
        replace
        className={cn(box, 'transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none')}
      >
        {body}
      </Link>
    </div>
  ) : (
    <div className={box}>{body}</div>
  );
}

const Paragraph = ({ text, empty }: { text: string; empty: string }) => (
  <p className={cn('text-sm whitespace-pre-line', text ? 'text-foreground/85' : 'italic text-muted-foreground')}>{text || empty}</p>
);

// ---------------------------------------------------------------------------
// Tổng quan
// ---------------------------------------------------------------------------

/**
 * "Tổng quan" (UI/UX tối ưu §5.2): what to do first (hidden when nothing), at most three figures for the current stage,
 * the next dates (apply deadline, selection, posting) instead of a step-by-step flow, and the history on demand.
 * Brief, rewards and settings live in "Thông tin chiến dịch".
 */
export function OverviewTab({ campaign: c, bookings }: { campaign: CampaignView; bookings: BookingView[] }) {
  const recruit = c.type === 'OPEN_RECRUITMENT';
  const marketplace = recruit || c.visibility === 'MARKETPLACE';
  const todos = campaignTodos(c, bookings);
  const p = campaignProgress(c, bookings);
  const k = kolProgress(c, bookings);
  const totals = metricTotals(collectPosts(bookings).map((x) => x.post));
  const tab = (t: DetailTab) => `?tab=${t}`;
  const kolStat = <Stat key="kol" label="KOL đã chọn" value={`${k.chosen}/${k.target} KOL`} hint={recruit ? 'Đếm mỗi KOL một lần' : 'Booking 1 KOL: chọn một KOL'} to={tab('hop-tac')} />;
  const stats =
    c.status === 'OPEN'
      ? [
          marketplace ? (
            <Stat key="apps" label="Đơn ứng tuyển" value={p.applications} hint={`${p.toHandle} đơn chưa xử lý`} to={tab('ung-vien')} />
          ) : (
            <Stat key="inv" label="Lời mời đã gửi" value={p.invites} hint={`${p.invitesWaiting} chờ KOL/MCN phản hồi`} to={tab('ung-vien')} />
          ),
          kolStat,
          ...(p.contentToReview ? [<Stat key="content" label="Nội dung chờ duyệt" value={p.contentToReview} to={`${tab('hop-tac')}&muc=noi-dung`} />] : []),
        ]
      : c.status === 'CLOSED'
        ? [
            kolStat,
            <Stat key="content" label="Nội dung chờ duyệt" value={p.contentToReview} to={`${tab('hop-tac')}&muc=noi-dung`} />,
            <Stat key="posts" label="Bài đăng đã xác minh" value={totals.posts} to={`${tab('hop-tac')}&muc=bao-cao`} />,
          ]
        : c.status === 'COMPLETED'
          ? [
              kolStat,
              <Stat key="posts" label="Bài đăng đã xác minh" value={totals.posts} to={`${tab('hop-tac')}&muc=bao-cao`} />,
              <Stat key="views" label="Lượt xem" value={formatCompactVi(totals.views)} hint={`Tương tác ${formatPercent(totals.engagementRate)}`} to={`${tab('hop-tac')}&muc=bao-cao`} />,
            ]
          : [];
  const milestones = campaignMilestones(c);
  return (
    <div className="@container space-y-4">
      {todos.length > 0 && (
        <Panel title="Việc cần xử lý">
          <ul className="divide-y divide-border">
            {todos.map((t) => (
              <li key={t.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className={cn('flex items-center gap-2 text-sm font-medium', t.urgent ? 'text-destructive' : 'text-foreground')}>
                  <AlertTriangle className={cn('size-4 shrink-0', t.urgent ? 'text-destructive' : 'text-chart-5')} aria-hidden />
                  {t.text}
                </span>
                <Link
                  to={t.to === 'edit' ? campaignEditPath(c.id) : tab(t.to)}
                  replace={t.to !== 'edit'}
                  className="text-sm font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {t.to === 'edit' ? 'Bổ sung' : 'Xử lý'}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {stats.length > 0 && <dl className={cn('grid gap-2 @2xl:gap-3', stats.length === 3 ? 'grid-cols-1 @lg:grid-cols-3' : 'grid-cols-2')}>{stats}</dl>}

      <div className="grid gap-4 @3xl:grid-cols-2">
        <Panel title="Mốc thời gian">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa đặt lịch.</p>
          ) : (
            <ol className="space-y-2.5">
              {milestones.map((m) => (
                <li key={m.label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                  <span className={cn('text-foreground', m.current && 'font-semibold')}>
                    {m.label}
                    {m.current && <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Đang diễn ra</span>}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{m.value}</span>
                </li>
              ))}
            </ol>
          )}
          {recruit && <p className="mt-3 text-xs text-muted-foreground">Bạn có thể xét và chọn KOL ngay khi có đơn, không cần chờ hết hạn ứng tuyển.</p>}
        </Panel>
        <Panel title="Lịch sử và phản hồi Admin">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <span>Xem lịch sử ({(c.log?.length ?? 0) + 1} mục)</span>
              <span className="text-xs text-muted-foreground group-open:hidden">Mở</span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">Thu gọn</span>
            </summary>
            <div className="mt-3">
              <CampaignHistory campaign={c} />
            </div>
          </details>
        </Panel>
      </div>
    </div>
  );
}

export function InfoTab({ campaign: c }: { campaign: CampaignView }) {
  return (
    <div className="@container space-y-4">
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Panel title="Mục tiêu">
            <Paragraph text={c.objective} empty="Chưa nhập mục tiêu." />
          </Panel>
          <Panel title="Brief">
            <Paragraph text={c.brief} empty="Chưa nhập brief." />
          </Panel>
          <Panel title="Quy định nội dung">
            <Paragraph text={c.contentRules} empty="Không có quy định riêng." />
            <WorkflowNote draftReview={c.draftReview !== false} />
          </Panel>
          {c.type === 'OPEN_RECRUITMENT' && c.recruitment && (
            <Panel title="Phần thưởng">
              <RewardBlock reward={c.recruitment.reward} slots={c.recruitment.slots} />
            </Panel>
          )}
          <Panel title="Điều kiện tham gia" className="@container">
            <ConditionsList target={c.target} categories={c.categories} regions={c.regions ?? []} />
          </Panel>
          <Panel title="Quyền sử dụng nội dung">
            {c.usageRights ? (
              <div className="space-y-1 text-sm text-foreground">
                <p>{usageRightsText(c.usageRights)}</p>
                {c.usageRights.note && <Paragraph text={c.usageRights.note} empty="" />}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không yêu cầu sử dụng lại nội dung ngoài bài đăng gốc.</p>
            )}
          </Panel>
          <Panel title="Câu hỏi khảo sát và điều khoản">
            {(c.survey ?? []).length === 0 && (c.terms ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có câu hỏi hay điều khoản riêng.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {(c.survey ?? []).length > 0 && (
                  <ol className="list-decimal space-y-1 pl-5 text-foreground">
                    {c.survey!.map((q) => (
                      <li key={q.id}>
                        {q.text} {q.required && <span className="text-xs text-muted-foreground">(bắt buộc)</span>}
                      </li>
                    ))}
                  </ol>
                )}
                {(c.terms ?? []).length > 0 && (
                  <ul className="space-y-1 text-muted-foreground">
                    {c.terms!.map((t) => (
                      <li key={t.id}>• {t.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>
        </div>
        <div className="space-y-4">
          {c.type === 'OPEN_RECRUITMENT' && c.recruitment && (
            <Panel title="Lịch trình 4 giai đoạn">
              <RecruitTimeline timeline={c.recruitment.timeline} phase={c.status === 'DRAFT' ? undefined : phaseOfTimeline(c.recruitment.timeline, Date.now())} />
            </Panel>
          )}
          <Panel title="Thông tin">
            <dl className="grid grid-cols-1 gap-3">
              <Meta label="Thời gian chạy">{formatDateRange(c.startDate, c.endDate)}</Meta>
              <Meta label={c.type === 'OPEN_RECRUITMENT' ? `Tổng ngân sách dự kiến (${c.recruitment?.slots ?? 0} suất)` : 'Ngân sách'}>
                {c.budget > 0 ? formatVnd(c.budget) : 'Chưa nhập'}
              </Meta>
              {c.promotedBrand?.name && (
                <Meta label="Nhãn hàng được quảng bá">
                  {c.promotedBrand.name}
                  {!c.promotedBrand.own && <span className="block text-xs text-muted-foreground">Agency quảng bá · căn cứ đại diện đã gửi Admin</span>}
                </Meta>
              )}
              <Meta label="Hiển thị">
                <VisibilityLabel visibility={c.visibility} className="text-sm text-foreground" />
                {c.visibility === 'MARKETPLACE' && (
                  <span className="block text-xs text-muted-foreground">
                    {c.applyDeadline ? `Hạn ứng tuyển: ${deadlineText(c)}` : 'Hạn ứng tuyển: chưa đặt'}
                  </span>
                )}
              </Meta>
              <Meta label="Nền tảng">
                <PlatformIcons platforms={c.platforms} />
              </Meta>
              <Meta label="Hợp đồng">{c.contract === false ? 'Không dùng hợp đồng' : 'Có (điều khoản + tệp hợp đồng)'}</Meta>
            </dl>
          </Panel>
          <Panel title="Hạng mục nội dung">
            {c.deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có hạng mục.</p>
            ) : (
              <ul className="space-y-1.5">
                {c.deliverables.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <PlatformIcon platform={d.platform} />
                    {deliverableText(d)}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {c.type !== 'OPEN_RECRUITMENT' && (
            <Panel title="Quyền lợi theo nhóm đầu việc">
              {(c.groups ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa thiết lập số suất và thù lao.</p>
              ) : (
                <ul className="space-y-1.5">
                  {c.groups!.map((g) => (
                    <li key={g.platform} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm text-foreground">
                      <span className="flex items-center gap-2">
                        <PlatformIcon platform={g.platform} />
                        {platformLabel(g.platform)}
                      </span>
                      <span className="font-semibold tabular-nums">{groupRewardText(g)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/** EP-02 §10 "lịch sử": gửi đăng, quyết định của Admin, đóng tuyển (ai, khi nào), huỷ / hoàn tất — newest first. */
function CampaignHistory({ campaign: c }: { campaign: CampaignView }) {
  const log = c.log ?? [];
  const entries: { at: number; label: string; actor: string; note?: string }[] = [
    { at: c.createdAt, label: 'Tạo bản nháp', actor: CAMPAIGN_LOG_ACTOR.BRAND },
    // Older data has no log: its first publication still shows.
    ...(c.publishedAt && !log.some((e) => e.action === 'APPROVED') ? [{ at: c.publishedAt, label: 'Bắt đầu tuyển', actor: CAMPAIGN_LOG_ACTOR.SYSTEM }] : []),
    ...log.map((e) => ({ at: e.at, label: CAMPAIGN_LOG_LABEL[e.action], actor: CAMPAIGN_LOG_ACTOR[e.by], note: e.note })),
  ].sort((a, b) => b.at - a.at);
  return (
    <ol className="space-y-3">
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative flex gap-3">
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/50')} aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">{e.label}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {e.actor} · {formatDayTime(e.at)}
            </p>
            {e.note && <p className="text-sm break-words whitespace-pre-line text-foreground/80">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

function KolStack({ booking }: { booking: BookingView }) {
  const shown = booking.items.slice(0, 4);
  const more = booking.items.length - shown.length;
  return (
    <div className="flex items-center" aria-label={`KOL: ${booking.items.map((i) => i.displayName).join(', ')}`}>
      {shown.map((it, i) => (
        <KolAvatar key={it.id} name={it.displayName} src={it.kol?.avatar} className={cn('size-8 border-2 border-card', i > 0 && '-ml-2')} />
      ))}
      {more > 0 && <span className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">+{more}</span>}
      <span className="ml-2 min-w-0 truncate text-xs text-muted-foreground">
        {booking.items.length === 1 ? booking.items[0].displayName : `${booking.items.length} KOL`}
      </span>
    </div>
  );
}

function BookingRow({ booking: b, onOpen }: { booking: BookingView; onOpen(): void }) {
  const todo = needsBrandAction(b);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Booking với ${b.supplier.name}${todo ? ' — cần bạn xử lý' : ''}`}
    >
      <Card className={cn('@container gap-0 p-4 transition-colors group-hover:border-primary/40', todo && 'border-primary/40')}>
        <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <KolAvatar name={b.supplier.name} src={b.supplier.avatar} className="size-10" />
            <div className="min-w-0 space-y-0.5">
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate font-semibold text-foreground group-hover:text-primary">{b.supplier.name}</span>
                <SupplierTypeBadge type={b.supplierType} />
              </p>
              <p className="text-xs text-muted-foreground">
                {b.origin === 'INVITE' ? 'Lời mời' : b.campaign.type === 'OPEN_RECRUITMENT' ? 'Ứng tuyển (Booking nhiều KOL)' : 'Đề xuất từ Sàn'} · cập nhật{' '}
                {formatDayMs(b.updatedAt)}
              </p>
            </div>
          </div>
          <div className="@2xl:w-48">
            <KolStack booking={b} />
          </div>
          <div className="flex flex-wrap items-center gap-2 @2xl:w-auto @2xl:flex-col @2xl:items-end @2xl:gap-1">
            <span className="text-sm font-semibold text-foreground tabular-nums">{bookingPriceText(b)}</span>
            <BookingStatusBadge status={b.status} />
          </div>
        </div>
        {(todo || b.expiresAt) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {todo && <TodoMarker label={brandTodoLabel(b)} />}
            {b.expiresAt && b.status !== 'EXPIRED' && <span className="text-xs text-muted-foreground tabular-nums">{expiryText(b.expiresAt, Date.now())}</span>}
          </div>
        )}
      </Card>
    </button>
  );
}

export function BookingsTab({
  bookings,
  canInvite,
  onInvite,
  onOpen,
  intro = 'KOL do MCN quản lý được gửi tới MCN đó; KOL độc lập nhận lời mời trực tiếp.',
  emptyTitle = 'Chưa có booking',
  emptyText = 'Mời KOL từ danh sách đã lưu hoặc tìm theo tên, KOL ID.',
  label = 'Booking của chiến dịch',
}: {
  bookings: BookingView[];
  canInvite: boolean;
  onInvite(): void;
  onOpen(id: string): void;
  intro?: string;
  emptyTitle?: string;
  emptyText?: string;
  label?: string;
}) {
  const rows = sortBookings(bookings);
  const inviteButton = canInvite && (
    <Button type="button" className="h-11 md:h-9" onClick={onInvite}>
      <UserPlus aria-hidden />
      Mời KOL
    </Button>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{intro}</p>
        {inviteButton}
      </div>
      {rows.length === 0 ? (
        <Card className="p-0">
          <EmptyBlock icon={<Users className="size-6" aria-hidden />} title={emptyTitle} text={emptyText}>
            {inviteButton}
          </EmptyBlock>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={label}>
          {rows.map((b) => (
            <li key={b.id}>
              <BookingRow booking={b} onOpen={() => onOpen(b.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ứng tuyển
// ---------------------------------------------------------------------------

export function ApplicationsTab({
  bookings,
  actions,
  onOpen,
  onOpenKol,
}: {
  bookings: BookingView[];
  actions: BookingActionsApi;
  onOpen(id: string): void;
  onOpenKol(kolId: string): void;
}) {
  const rows = openApplications(bookings);
  if (rows.length === 0) {
    return (
      <Card className="p-0">
        <EmptyBlock
          icon={<Inbox className="size-6" aria-hidden />}
          title="Chưa có đề xuất cần xử lý"
          text="KOL/MCN đã được duyệt có thể gửi đề xuất khi chiến dịch đang hiển thị trên Sàn chiến dịch."
        />
      </Card>
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label="Đề xuất ứng tuyển">
      {rows.map((b) => (
        <li key={b.id}>
          <Card className="gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <KolAvatar name={b.supplier.name} src={b.supplier.avatar} className="size-10" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-foreground">{b.supplier.name}</span>
                    <SupplierTypeBadge type={b.supplierType} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gửi {formatDayMs(b.createdAt)}
                    {b.expiresAt ? ` · ${expiryText(b.expiresAt, Date.now())}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground tabular-nums">{bookingPriceText(b)}</p>
                <BookingStatusBadge status={b.status} />
              </div>
            </div>
            {b.note && (
              <p className="rounded-[8px] bg-muted/60 p-2.5 text-sm whitespace-pre-line text-foreground">
                <span className="block text-xs text-muted-foreground">Lời nhắn</span>
                {b.note}
              </p>
            )}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">KOL đề xuất ({b.items.length}) — hồ sơ công khai</p>
              <ul className="space-y-2">
                {b.items.map((it) => (
                  <BookingItemRow key={it.id} item={it} onOpenKol={onOpenKol} />
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <NegotiationButtons booking={b} actions={actions} />
              <Button type="button" variant="link" className="h-11 px-0 md:h-9" onClick={() => onOpen(b.id)}>
                Xem chi tiết
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Nội dung
// ---------------------------------------------------------------------------

/** `showCampaign`: list spans several campaigns (brand "Nội dung chiến dịch"), so each card names its campaign. */
export function ContentTab({ bookings, actions, onOpen, showCampaign = false }: { bookings: BookingView[]; actions: BookingActionsApi; onOpen(id: string): void; showCampaign?: boolean }) {
  const pending = collectDrafts(bookings, true);
  if (pending.length === 0) {
    return (
      <Card className="p-0">
        <EmptyBlock
          icon={<ClipboardCheck className="size-6" aria-hidden />}
          title="Không có nội dung chờ duyệt"
          text="Bản nháp KOL gửi sẽ hiện ở đây kèm kết quả kiểm tra KOL Safety."
        />
      </Card>
    );
  }
  return (
    <div className="@container">
      <ul className="grid grid-cols-1 gap-3 @3xl:grid-cols-2" aria-label="Nội dung chờ duyệt">
        {pending.map(({ booking, draft, item }) => (
          <li key={draft.id} className="min-w-0">
            <DraftCard
              booking={booking}
              draft={draft}
              item={item}
              actions={actions}
              header={
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {showCampaign && <span className="font-medium text-foreground">{booking.campaign.name} · </span>}
                    {booking.supplier.name}
                  </span>
                  <Button type="button" variant="link" size="sm" className="h-11 shrink-0 px-0 md:h-auto" onClick={() => onOpen(booking.id)}>
                    Mở booking
                  </Button>
                </div>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Báo cáo
// ---------------------------------------------------------------------------

export function ReportTab({ bookings, onOpen, showCampaign = false }: { bookings: BookingView[]; onOpen(id: string): void; showCampaign?: boolean }) {
  const posts = collectPosts(bookings);
  const t = metricTotals(posts.map((p) => p.post));
  if (posts.length === 0) {
    return (
      <Card className="p-0">
        <EmptyBlock icon={<BarChart3 className="size-6" aria-hidden />} title="Chưa có bài đăng đã xác minh" text="Số liệu bài đăng được lấy khi nhà cung cấp gửi link và hệ thống xác minh." />
      </Card>
    );
  }
  const cells = (m?: { views: number; likes: number; comments: number; shares: number; engagementRate: number }) => [
    formatCompactVi(m?.views ?? 0),
    formatCompactVi(m?.likes ?? 0),
    formatCompactVi(m?.comments ?? 0),
    formatCompactVi(m?.shares ?? 0),
    formatPercent(m?.engagementRate ?? 0),
  ];
  const HEAD = ['Lượt xem', 'Thích', 'Bình luận', 'Chia sẻ', 'Tương tác'];
  return (
    <div className="@container space-y-3">
      <dl className="grid grid-cols-2 gap-2 @xl:grid-cols-3 @3xl:grid-cols-6">
        <Stat label="Bài đăng" value={t.posts} />
        {HEAD.map((h, i) => (
          <Stat key={h} label={h} value={cells(t)[i]} />
        ))}
      </dl>

      <Card className="hidden gap-0 overflow-hidden p-0 @3xl:block">
        <Table aria-label="Bài đăng đã xác minh">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>KOL</TableHead>
              <TableHead>Bài đăng</TableHead>
              {HEAD.map((h) => (
                <TableHead key={h} className="text-right">
                  {h}
                </TableHead>
              ))}
              <TableHead className="whitespace-nowrap">Xác minh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map(({ booking, post, item }) => (
              <TableRow key={post.id} className="cursor-pointer" onClick={() => onOpen(booking.id)}>
                <TableCell className="max-w-48">
                  <span className="block truncate font-medium text-foreground">{item?.displayName ?? booking.supplier.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{showCampaign ? `${booking.supplier.name} · ${booking.campaign.name}` : booking.supplier.name}</span>
                </TableCell>
                <TableCell className="max-w-56">
                  <a
                    href={href(post.url ?? '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
                  >
                    {item && <PlatformIcon platform={item.platform} className="size-3.5" />}
                    <span className="truncate">{(post.url ?? '').replace(/^https?:\/\//, '')}</span>
                  </a>
                  {item && <span className="sr-only"> ({platformLabel(item.platform)})</span>}
                </TableCell>
                {cells(post.metrics).map((v, i) => (
                  <TableCell key={i} className="text-right tabular-nums">
                    {v}
                  </TableCell>
                ))}
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{post.verifiedAt ? formatDayMs(post.verifiedAt) : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">
                Tổng ({t.posts} bài)
              </TableCell>
              {cells(t).map((v, i) => (
                <TableCell key={i} className="text-right font-semibold tabular-nums">
                  {v}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      <ul className="flex flex-col gap-2 @3xl:hidden" aria-label="Bài đăng đã xác minh">
        {posts.map(({ booking, post, item }) => (
          <li key={post.id}>
            <Card className="gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                  {item && <PlatformIcon platform={item.platform} className="size-4" />}
                  <span className="truncate">{item?.displayName ?? booking.supplier.name}</span>
                </span>
                <Button type="button" variant="link" size="sm" className="h-11 shrink-0 px-0" onClick={() => onOpen(booking.id)}>
                  Mở booking
                </Button>
              </div>
              <a href={href(post.url ?? '')} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-primary hover:underline">
                {(post.url ?? '').replace(/^https?:\/\//, '')}
              </a>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                {HEAD.map((h, i) => (
                  <div key={h} className="min-w-0">
                    <dt className="truncate text-[11px] text-muted-foreground">{h}</dt>
                    <dd className="font-semibold tabular-nums">{cells(post.metrics)[i]}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
