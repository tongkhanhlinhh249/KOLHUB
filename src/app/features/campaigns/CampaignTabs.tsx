import type { ReactNode } from 'react';
import { BarChart3, Check, ClipboardCheck, Inbox, Minus, UserPlus, Users } from 'lucide-react';
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

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-primary/20 bg-primary/5 p-3">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">
        <span className="block truncate text-lg font-bold text-foreground tabular-nums">{value}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

const Paragraph = ({ text, empty }: { text: string; empty: string }) => (
  <p className={cn('text-sm whitespace-pre-line', text ? 'text-foreground/85' : 'italic text-muted-foreground')}>{text || empty}</p>
);

// ---------------------------------------------------------------------------
// Tổng quan
// ---------------------------------------------------------------------------

export function OverviewTab({ campaign: c, bookings }: { campaign: CampaignView; bookings: BookingView[] }) {
  const posts = collectPosts(bookings);
  const totals = metricTotals(posts.map((p) => p.post));
  const groups = countByBookingStatus(bookings);
  return (
    <div className="@container space-y-4">
      <dl className="grid grid-cols-2 gap-2 @2xl:grid-cols-4 @2xl:gap-3">
        <Stat label="Booking" value={c.stats.total} hint={`${c.stats.inProgress + c.stats.completed} đã chốt`} />
        <Stat label="Giá trị đã chốt" value={formatVnd(c.stats.committed)} hint={c.budget > 0 ? `Ngân sách ${formatVnd(c.budget)}` : undefined} />
        <Stat label="Bài đăng đã xác minh" value={totals.posts} hint={`${c.stats.pendingReview} booking chờ duyệt nội dung`} />
        <Stat label="Lượt xem / Thích" value={`${formatCompactVi(totals.views)} / ${formatCompactVi(totals.likes)}`} hint={`Tương tác ${formatPercent(totals.engagementRate)}`} />
      </dl>

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
            <Panel title="Lịch trình">
              <RecruitTimeline timeline={c.recruitment.timeline} phase={c.status === 'DRAFT' ? undefined : phaseOfTimeline(c.recruitment.timeline, Date.now())} />
            </Panel>
          )}
          <Panel title="Thông tin">
            <dl className="grid grid-cols-1 gap-3">
              <Meta label="Thời gian">{formatDateRange(c.startDate, c.endDate)}</Meta>
              <Meta label={c.type === 'OPEN_RECRUITMENT' ? `Tổng giá trị (${c.recruitment?.slots ?? 0} suất)` : 'Ngân sách'}>
                {c.budget > 0 ? formatVnd(c.budget) : 'Chưa nhập'}
              </Meta>
              <Meta label="Hiển thị">
                <VisibilityLabel visibility={c.visibility} className="text-sm text-foreground" />
                {c.visibility === 'MARKETPLACE' && (
                  <span className="block text-xs text-muted-foreground">
                    {c.applyDeadline ? `Nhận đề xuất đến ${formatIsoDay(c.applyDeadline)}` : 'Nhận đề xuất đến khi kết thúc'}
                  </span>
                )}
              </Meta>
              <Meta label="Nền tảng">
                <PlatformIcons platforms={c.platforms} />
              </Meta>
              <Meta label="Lĩnh vực">
                {c.categories.length === 0 ? (
                  'Không giới hạn'
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {c.categories.map((cat) => {
                      const Icon = fieldIcon(cat);
                      return (
                        <li key={cat} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                          <Icon className="size-3.5" aria-hidden />
                          {cat}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Meta>
            </dl>
          </Panel>
          <Panel title="Tính năng">
            <FeatureSummary campaign={c} />
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
          <Panel title="Booking theo trạng thái">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có booking.</p>
            ) : (
              <ul className="space-y-1.5">
                {groups.map((g) => (
                  <li key={g.status} className="flex items-center justify-between gap-2">
                    <BookingStatusBadge status={g.status} />
                    <span className="text-sm font-semibold text-foreground tabular-nums">{g.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
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
                {b.origin === 'INVITE' ? 'Lời mời' : b.campaign.type === 'OPEN_RECRUITMENT' ? 'Ứng tuyển (Tuyển nhiều KOL)' : 'Đề xuất từ Sàn'} · cập nhật{' '}
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
}: {
  bookings: BookingView[];
  canInvite: boolean;
  onInvite(): void;
  onOpen(id: string): void;
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
        <p className="text-sm text-muted-foreground">
          KOL do MCN quản lý được gửi tới MCN đó; KOL độc lập nhận lời mời trực tiếp.
        </p>
        {inviteButton}
      </div>
      {rows.length === 0 ? (
        <Card className="p-0">
          <EmptyBlock icon={<Users className="size-6" aria-hidden />} title="Chưa có booking" text="Mời KOL từ danh sách đã lưu hoặc tìm theo tên, KOL ID.">
            {inviteButton}
          </EmptyBlock>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Booking của chiến dịch">
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
                <p className="text-lg font-semibold text-foreground tabular-nums">{formatPrice(b.price)}</p>
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
