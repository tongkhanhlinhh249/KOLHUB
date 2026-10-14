import { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ban, CalendarClock, CalendarDays, ExternalLink, Eye, Lock, Pencil, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Card } from '../../components/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { cn } from '../../components/ui/utils';
import {
  INBOX_PATHS,
  phaseOfTimeline,
  RECRUIT_MILESTONES,
  RECRUIT_PHASE_LABEL,
  type BookingView,
  type CampaignView,
} from '../../services';
import { initials } from '../biz-search/format';
import { CampaignCover } from '../shared/CampaignCover';
import {
  cellClass,
  DataTable,
  ExpandButton,
  HeadCell,
  RowCheckbox,
  rowClass,
  rowClick,
  RowMenu,
  SortHeadCell,
} from '../shared/DataTable';
import { ariaSortOf, selectionState, toggleAllSelection, toggleSelection } from '../shared/tableView';
import { RecruitTypeBadge } from '../shared/RecruitParts';
import { recruitStage, rewardShort } from '../shared/recruitView';
import { ToneBadge } from '../shared/StatusBadges';
import { BookingStatusBadge, CampaignStatusBadge, TodoMarker, VisibilityLabel } from './CampaignParts';
import {
  brandTodoLabel,
  CAMPAIGN_COLUMN_SORT,
  campaignProgress,
  campaignActions,
  campaignEditPath,
  campaignPath,
  formatDateRange,
  formatDayMs,
  formatIsoDay,
  formatVnd,
  needsBrandAction,
  type CampaignColumn,
  type CampaignSort,
} from './campaignView';

export type CampaignBulkKind = 'close' | 'cancel';

/** "Booking riêng" chip, the counterpart of RecruitTypeBadge. */
function BookingTypeBadge() {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-border px-2 text-xs font-medium whitespace-nowrap text-muted-foreground">
      Booking 1 KOL
    </span>
  );
}

function TypeBadge({ c }: { c: Pick<CampaignView, 'type'> }) {
  return c.type === 'OPEN_RECRUITMENT' ? <RecruitTypeBadge /> : <BookingTypeBadge />;
}

/** Amber "n" pill of bookings waiting for the brand (empty cell otherwise). */
function PendingPill({ n }: { n: number }) {
  if (n <= 0) return <span className="sr-only">Không có</span>;
  return (
    <ToneBadge tone="warning" className="tabular-nums">
      {n} booking
    </ToneBadge>
  );
}

const isPublicOnSan = (c: Pick<CampaignView, 'visibility' | 'status'>) => c.visibility === 'MARKETPLACE' && (c.status === 'OPEN' || c.status === 'CLOSED' || c.status === 'COMPLETED');

/** Kebab items of one campaign: Xem, Sửa, Xem trên Sàn (new tab, the Sàn is its own channel), Đóng tuyển, Huỷ. */
export function CampaignMenuItems({ c, onAction }: { c: CampaignView; onAction(kind: CampaignBulkKind, ids: string[]): void }) {
  const acts = campaignActions(c.status, c.type);
  return (
    <>
      <DropdownMenuItem asChild>
        <Link to={campaignPath(c.id)}>
          <Eye aria-hidden />
          Xem chi tiết
        </Link>
      </DropdownMenuItem>
      {acts.edit && (
        <DropdownMenuItem asChild>
          <Link to={campaignEditPath(c.id)}>
            <Pencil aria-hidden />
            Sửa
          </Link>
        </DropdownMenuItem>
      )}
      {isPublicOnSan(c) && (
        <DropdownMenuItem asChild>
          <a href={INBOX_PATHS.sanCampaign(c.id)} target="_blank" rel="noopener">
            <ExternalLink aria-hidden />
            Xem trên Sàn
          </a>
        </DropdownMenuItem>
      )}
      {(acts.closeRecruitment || acts.cancel) && <DropdownMenuSeparator />}
      {acts.closeRecruitment && (
        <DropdownMenuItem onSelect={() => onAction('close', [c.id])}>
          <Lock aria-hidden />
          Đóng tuyển
        </DropdownMenuItem>
      )}
      {acts.cancel && (
        <DropdownMenuItem variant="destructive" onSelect={() => onAction('cancel', [c.id])}>
          <Ban aria-hidden />
          Huỷ chiến dịch
        </DropdownMenuItem>
      )}
    </>
  );
}

function SupplierAvatar({ name, src }: { name: string; src?: string }) {
  return (
    <Avatar className="size-8 shrink-0">
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

const MAX_BOOKINGS = 6;

/** Expanded row: the booking list summary (Booking riêng) or the recruitment phase and slots (Tuyển nhiều KOL). */
function ExpandedDetail({ c, bookings, now }: { c: CampaignView; bookings: BookingView[]; now: number }) {
  const recruit = c.type === 'OPEN_RECRUITMENT' && c.recruitment;
  const shown = bookings.slice(0, MAX_BOOKINGS);
  const tabLink = `${campaignPath(c.id)}?tab=${recruit ? 'ung-tuyen' : 'booking'}`;
  return (
    <div className="space-y-3">
      {recruit && (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Giai đoạn</dt>
              <dd className="font-medium text-foreground">{RECRUIT_PHASE_LABEL[phaseOfTimeline(recruit.timeline, now)]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Đã chọn / suất</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {bookings.filter((b) => ['SELECTED', 'WORKING', 'DONE'].includes(recruitStage(b))).length} / {recruit.slots || '–'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ứng viên chờ chọn</dt>
              <dd className="font-medium text-foreground tabular-nums">{c.stats.applications}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phần thưởng / KOL</dt>
              <dd className="font-medium text-foreground">{rewardShort(recruit.reward)}</dd>
            </div>
          </dl>
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Lịch trình">
            {RECRUIT_MILESTONES.map((m) => (
              <li key={m.key} className={cn(phaseOfTimeline(recruit.timeline, now) === m.key && 'font-medium text-primary')}>
                {m.label}: {formatIsoDay(recruit.timeline[m.start]).slice(0, 5)} – {formatIsoDay(recruit.timeline[m.end]).slice(0, 5)}
              </li>
            ))}
          </ol>
        </div>
      )}
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{recruit ? 'Chưa có KOL/MCN ứng tuyển.' : 'Chưa có booking nào. Mời KOL từ trang chi tiết chiến dịch.'}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Booking của ${c.name}`}>
          {shown.map((b) => {
            const todo = brandTodoLabel(b);
            return (
              <li key={b.id} className="flex min-w-0 items-center gap-2.5 rounded-[8px] border border-border bg-card px-3 py-2">
                <SupplierAvatar name={b.supplier.name} src={b.supplier.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{b.supplier.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <BookingStatusBadge status={b.status} />
                    {todo && <span className="text-xs font-medium text-primary">{todo}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link to={tabLink} className="inline-flex text-sm font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        {bookings.length > MAX_BOOKINGS ? `Xem tất cả ${bookings.length} ${recruit ? 'ứng viên' : 'booking'}` : recruit ? 'Mở tab Ứng viên' : 'Mở tab Booking'}
      </Link>
    </div>
  );
}

/** "Bảng" view of the brand's campaigns. */
export function CampaignTable({
  rows,
  pending,
  bookingsByCampaign,
  sort,
  onSort,
  selected,
  onSelectedChange,
  onAction,
}: {
  rows: CampaignView[];
  pending: Record<string, number>;
  bookingsByCampaign: Record<string, BookingView[]>;
  sort: CampaignSort;
  onSort(sort: CampaignSort): void;
  selected: ReadonlySet<string>;
  onSelectedChange(next: Set<string>): void;
  onAction(kind: CampaignBulkKind, ids: string[]): void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const ids = rows.map((r) => r.id);
  const all = selectionState(selected, ids);
  const now = Date.now();
  const sortCell = (col: CampaignColumn, label: string, className?: string) => (
    <SortHeadCell label={label} sort={ariaSortOf(CAMPAIGN_COLUMN_SORT, col, sort)} onSort={() => onSort(CAMPAIGN_COLUMN_SORT[col].sort)} className={className} />
  );

  return (
    <DataTable label="Bảng chiến dịch" minWidthClass="min-w-[1060px]">
      <thead className="border-b border-border bg-muted/40">
        <tr>
          <HeadCell className="w-10 pr-0">
            <RowCheckbox
              checked={all === 'all' ? true : all === 'some' ? 'indeterminate' : false}
              onChange={() => onSelectedChange(toggleAllSelection(selected, ids))}
              label="Chọn tất cả chiến dịch đang hiển thị"
            />
          </HeadCell>
          <HeadCell className="w-10 px-0">
            <span className="sr-only">Mở rộng</span>
          </HeadCell>
          <HeadCell>Chiến dịch</HeadCell>
          <HeadCell>Trạng thái</HeadCell>
          <HeadCell>Hạn tuyển</HeadCell>
          <HeadCell>Booking / Ứng viên</HeadCell>
          <HeadCell>Cần xử lý</HeadCell>
          {sortCell('budget', 'Ngân sách')}
          {sortCell('time', 'Thời gian')}
          {sortCell('updated', 'Cập nhật')}
          <HeadCell className="w-12">
            <span className="sr-only">Thao tác</span>
          </HeadCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => {
          const open = expanded.has(c.id);
          const isSel = selected.has(c.id);
          const detailId = `campaign-row-${c.id}-detail`;
          return (
            <Fragment key={c.id}>
              <tr className={rowClass} data-selected={isSel} data-expanded={open} onClick={rowClick(() => navigate(campaignPath(c.id)))}>
                <td className={cn(cellClass, 'w-10 pr-0')}>
                  <RowCheckbox checked={isSel} onChange={() => onSelectedChange(toggleSelection(selected, c.id))} label={`Chọn ${c.name}`} />
                </td>
                <td className={cn(cellClass, 'w-10 px-0')}>
                  <ExpandButton
                    expanded={open}
                    controls={detailId}
                    label={`${open ? 'Thu gọn' : 'Mở rộng'} ${c.name}`}
                    onToggle={() => setExpanded((prev) => toggleSelection(prev, c.id))}
                  />
                </td>
                <td className={cn(cellClass, 'max-w-[340px]')}>
                  <div className="flex min-w-[230px] items-center gap-3">
                    <CampaignCover cover={c.cover} className="aspect-square w-12 shrink-0 rounded-[6px]" iconClassName="size-4" />
                    <div className="min-w-0 space-y-1">
                      <Link
                        to={campaignPath(c.id)}
                        className="line-clamp-2 text-sm leading-snug font-semibold text-foreground hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {c.name}
                      </Link>
                      {c.objective && <p className="line-clamp-1 text-xs text-muted-foreground">{c.objective}</p>}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TypeBadge c={c} />
                        <VisibilityLabel visibility={c.visibility} className="text-xs whitespace-nowrap text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className={cellClass}>
                  <CampaignStatusBadge status={c.status} />
                </td>
                <td className={cn(cellClass, 'text-sm whitespace-nowrap')}>
                  <DeadlineText c={c} />
                </td>
                <td className={cn(cellClass, 'whitespace-nowrap tabular-nums')}>
                  <ProgressText c={c} bookings={bookingsByCampaign[c.id] ?? []} />
                </td>
                <td className={cellClass}>
                  <PendingPill n={pending[c.id] ?? 0} />
                </td>
                <td className={cn(cellClass, 'whitespace-nowrap tabular-nums')}>
                  {c.budget > 0 ? <span className="text-foreground">{formatVnd(c.budget)}</span> : <span className="text-muted-foreground">Chưa nhập</span>}
                </td>
                <td className={cn(cellClass, 'whitespace-nowrap text-xs leading-5 tabular-nums')}>
                  {c.startDate || c.endDate ? (
                    <>
                      <span className="block text-foreground">{formatIsoDay(c.startDate) || '…'} –</span>
                      <span className="block text-foreground">{formatIsoDay(c.endDate) || '…'}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Chưa đặt lịch</span>
                  )}
                </td>
                <td className={cn(cellClass, 'whitespace-nowrap text-muted-foreground tabular-nums')}>{formatDayMs(c.updatedAt)}</td>
                <td className={cn(cellClass, 'w-12 pl-0 text-right')}>
                  <RowMenu label={`Thao tác với ${c.name}`}>
                    <CampaignMenuItems c={c} onAction={onAction} />
                  </RowMenu>
                </td>
              </tr>
              {open && (
                <tr id={detailId} className="border-b border-border bg-muted/30 last:border-0">
                  <td />
                  <td colSpan={10} className="px-3 pt-1 pb-4">
                    <ExpandedDetail c={c} bookings={bookingsByCampaign[c.id] ?? []} now={now} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </DataTable>
  );
}

/** One campaign in the "Thẻ" view: 16:9 cover on top, then name, badges, booking counts, budget, dates. */
/** "Hạn tuyển" (US-09): deadline of a marketplace campaign; private Booking riêng = invites only. */
function DeadlineText({ c, className }: { c: CampaignView; className?: string }) {
  const marketplace = c.type === 'OPEN_RECRUITMENT' || c.visibility === 'MARKETPLACE';
  if (!marketplace) return <span className={cn('text-muted-foreground', className)}>Chỉ mời</span>;
  if (!c.applyDeadline) return <span className={cn('text-muted-foreground', className)}>Đến khi kết thúc</span>;
  return <span className={cn('text-foreground tabular-nums', className)}>{formatIsoDay(c.applyDeadline)}</span>;
}

/** "Booking / Ứng viên" (US-09, §8.4): KOL chosen (Booking 1 KOL) or picked / slots, and applications — each named. */
function ProgressText({ c, bookings }: { c: CampaignView; bookings: BookingView[] }) {
  const p = campaignProgress(c, bookings);
  const marketplace = c.type === 'OPEN_RECRUITMENT' || c.visibility === 'MARKETPLACE';
  return (
    <>
      <span className="block font-semibold text-foreground">
        {c.type === 'OPEN_RECRUITMENT' ? `${p.slotsUsed}/${p.slots ?? 0} suất` : p.slotsUsed ? 'Đã chọn KOL' : 'Chưa chọn KOL'}
      </span>
      <span className="block text-xs text-muted-foreground">
        {marketplace ? `${p.applications} đơn ứng tuyển` : `${p.invites} lời mời`}
      </span>
    </>
  );
}

function CampaignGridCard({
  c,
  bookings,
  pending,
  onAction,
}: {
  c: CampaignView;
  bookings: BookingView[];
  pending: number;
  onAction(kind: CampaignBulkKind, ids: string[]): void;
}) {
  return (
    <Card className="group relative h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary/40">
      <CampaignCover cover={c.cover} className="aspect-video w-full" />
      <div className="absolute top-2 right-2 z-10 rounded-[8px] bg-card/90 backdrop-blur-sm">
        <RowMenu label={`Thao tác với ${c.name}`}>
          <CampaignMenuItems c={c} onAction={onAction} />
        </RowMenu>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-base leading-snug font-semibold text-foreground group-hover:text-primary">
            <Link
              to={campaignPath(c.id)}
              className="after:absolute after:inset-0 after:rounded-[8px] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {c.name}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <CampaignStatusBadge status={c.status} />
            <TypeBadge c={c} />
            <VisibilityLabel visibility={c.visibility} className="ml-0.5" />
          </div>
        </div>
        <div className="space-y-1.5 text-sm text-foreground">
          <p className="flex items-center gap-1.5">
            <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="tabular-nums">{c.budget > 0 ? formatVnd(c.budget) : 'Chưa nhập ngân sách'}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="tabular-nums">{formatDateRange(c.startDate, c.endDate)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">Hạn tuyển:</span>
            <DeadlineText c={c} />
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-sm tabular-nums">
            <ProgressText c={c} bookings={bookings} />
          </p>
          {pending > 0 && <TodoMarker label={`${pending}`} />}
        </div>
      </div>
    </Card>
  );
}

/** "Thẻ" view: 1 column on phones, 2 at medium widths, 3 from @5xl (the page wrapper is the container). */
export function CampaignCardGrid({
  rows,
  pending,
  bookingsByCampaign,
  onAction,
}: {
  rows: CampaignView[];
  pending: Record<string, number>;
  bookingsByCampaign: Record<string, BookingView[]>;
  onAction(kind: CampaignBulkKind, ids: string[]): void;
}) {
  return (
    <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3" aria-label="Danh sách chiến dịch">
      {rows.map((c) => (
        <li key={c.id} className="min-w-0">
          <CampaignGridCard c={c} bookings={bookingsByCampaign[c.id] ?? []} pending={pending[c.id] ?? 0} onAction={onAction} />
        </li>
      ))}
    </ul>
  );
}

/** Bookings grouped by campaign id (for the expanded rows). */
export function groupBookings(bookings: BookingView[]): Record<string, BookingView[]> {
  const out: Record<string, BookingView[]> = {};
  for (const b of [...bookings].sort((x, y) => Number(needsBrandAction(y)) - Number(needsBrandAction(x)) || y.updatedAt - x.updatedAt)) {
    (out[b.campaignId] ??= []).push(b);
  }
  return out;
}
