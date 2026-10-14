import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { Building2, ExternalLink, MessageSquare, PanelRightOpen } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { DropdownMenuItem } from '../../components/ui/dropdown-menu';
import { cn } from '../../components/ui/utils';
import { INBOX_PATHS, type BookingView } from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
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
import { RecruitStageStepper } from '../shared/RecruitParts';
import { recruitStage, rewardShort } from '../shared/recruitView';
import { ToneBadge } from '../shared/StatusBadges';
import { BookingStatusBadge, CountdownText, KolAvatarStack, NeedsYouMarker, OriginBadge } from './parts';
import {
  bookingDeadline,
  expiryCountdown,
  formatDateTime,
  isRecruitBooking,
  nextStepText,
  priceText,
  SUPPLIER_COLUMN_SORT,
  supplierTodoLabel,
  type SupplierColumn,
  type SupplierSort,
} from './supplierBooking';

/** Price of an invite / application, or the fixed reward of a "Tuyển nhiều KOL" application. */
function PriceCell({ b }: { b: BookingView }) {
  const reward = b.reward ?? b.campaign.recruitment?.reward;
  if (isRecruitBooking(b) && reward) return <span className="text-foreground">{rewardShort(reward)}</span>;
  return <span className={b.price > 0 ? 'text-foreground' : 'text-muted-foreground'}>{priceText(b.price)}</span>;
}

/** HẠN: countdown of a pending invite / application, "Kết quả trước …" for recruitment, else "—". */
function DeadlineCell({ b, now }: { b: BookingView; now: number }) {
  const at = bookingDeadline(b);
  if (at === undefined) return <span className="text-muted-foreground">—</span>;
  if (isRecruitBooking(b)) {
    return (
      <span className="block text-xs leading-5 text-muted-foreground">
        <span className="block">Kết quả trước</span>
        <span className="block text-foreground tabular-nums">{formatDateTime(at)}</span>
      </span>
    );
  }
  return <CountdownText countdown={expiryCountdown(at, now)} />;
}

/** Kebab items: Mở (the booking sheet), Nhắn tin, Xem trên Sàn (new tab — the Sàn is its own channel). */
function BookingMenuItems({ b, onOpen }: { b: BookingView; onOpen(): void }) {
  return (
    <>
      <DropdownMenuItem onSelect={onOpen}>
        <PanelRightOpen aria-hidden />
        Mở chi tiết
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to={INBOX_PATHS.thread(b.id)}>
          <MessageSquare aria-hidden />
          Nhắn tin
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href={INBOX_PATHS.sanCampaign(b.campaignId)} target="_blank" rel="noopener">
          <ExternalLink aria-hidden />
          Xem trên Sàn
        </a>
      </DropdownMenuItem>
    </>
  );
}

function ExpandedDetail({ b }: { b: BookingView }) {
  const platforms = [...new Set(b.items.map((i) => i.channel?.platform ?? i.platform))];
  const kols = new Set(b.items.map((i) => i.kolAccountId)).size;
  const next = nextStepText(b);
  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <KolAvatarStack items={b.items} />
        <div className="text-xs text-muted-foreground">
          <p className="text-sm text-foreground">
            {kols} KOL · {b.items.length} hạng mục
          </p>
          <p className="flex items-center gap-1">
            {platforms.map((p) => (
              <PlatformIcon key={p} platform={p} className="size-4" />
            ))}
            {b.items.some((i) => !i.channelId) && <span className="text-destructive">Thiếu kênh</span>}
          </p>
        </div>
      </div>
      {isRecruitBooking(b) && <RecruitStageStepper stage={recruitStage(b)} className="w-full max-w-md" />}
      {next && <p className="max-w-xl min-w-0 flex-1 text-sm text-muted-foreground">{next}</p>}
    </div>
  );
}

/** "Bảng" view of the supplier's campaigns (one row per booking). Clicking a row opens the booking sheet. */
export function BookingTable({
  rows,
  now,
  sort,
  onSort,
  selected,
  onSelectedChange,
  onOpen,
  label,
}: {
  rows: BookingView[];
  now: number;
  sort: SupplierSort;
  onSort(sort: SupplierSort): void;
  selected: ReadonlySet<string>;
  onSelectedChange(next: Set<string>): void;
  onOpen(id: string): void;
  label: string;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const ids = rows.map((r) => r.id);
  const all = selectionState(selected, ids);
  const sortCell = (col: SupplierColumn, text: string) => (
    <SortHeadCell label={text} sort={ariaSortOf(SUPPLIER_COLUMN_SORT, col, sort)} onSort={() => onSort(SUPPLIER_COLUMN_SORT[col].sort)} />
  );

  return (
    <DataTable label={label} minWidthClass="min-w-[1000px]">
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
          <HeadCell>Nguồn</HeadCell>
          <HeadCell>Trạng thái</HeadCell>
          <HeadCell>Cần bạn</HeadCell>
          {sortCell('price', 'Giá / Thưởng')}
          {sortCell('deadline', 'Hạn')}
          {sortCell('updated', 'Cập nhật')}
          <HeadCell className="w-12">
            <span className="sr-only">Thao tác</span>
          </HeadCell>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => {
          const open = expanded.has(b.id);
          const isSel = selected.has(b.id);
          const detailId = `booking-row-${b.id}-detail`;
          const todo = supplierTodoLabel(b);
          return (
            <Fragment key={b.id}>
              <tr className={rowClass} data-selected={isSel} data-expanded={open} onClick={rowClick(() => onOpen(b.id))}>
                <td className={cn(cellClass, 'w-10 pr-0')}>
                  <RowCheckbox checked={isSel} onChange={() => onSelectedChange(toggleSelection(selected, b.id))} label={`Chọn ${b.campaign.name}`} />
                </td>
                <td className={cn(cellClass, 'w-10 px-0')}>
                  <ExpandButton
                    expanded={open}
                    controls={detailId}
                    label={`${open ? 'Thu gọn' : 'Mở rộng'} ${b.campaign.name}`}
                    onToggle={() => setExpanded((prev) => toggleSelection(prev, b.id))}
                  />
                </td>
                <td className={cn(cellClass, 'max-w-[340px]')}>
                  <div className="flex min-w-[190px] items-center gap-3">
                    <CampaignCover cover={b.campaign.cover} className="aspect-square w-12 shrink-0 rounded-[6px]" iconClassName="size-4" />
                    <div className="min-w-0 space-y-1">
                      <button
                        type="button"
                        onClick={() => onOpen(b.id)}
                        className="line-clamp-2 text-left text-sm leading-snug font-semibold text-foreground hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {b.campaign.name}
                      </button>
                      <p className="flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
                        <Building2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span className="line-clamp-1">{b.campaign.brand.company}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cellClass}>
                  <OriginBadge origin={b.origin} />
                </td>
                <td className={cellClass}>
                  <BookingStatusBadge booking={b} />
                </td>
                <td className={cellClass}>
                  {todo ? (
                    <ToneBadge tone="warning">
                      {todo}
                    </ToneBadge>
                  ) : (
                    <span className="sr-only">Không có</span>
                  )}
                </td>
                <td className={cn(cellClass, 'max-w-40 min-w-28 text-sm tabular-nums')}>
                  <PriceCell b={b} />
                </td>
                <td className={cn(cellClass, 'whitespace-nowrap')}>
                  <DeadlineCell b={b} now={now} />
                </td>
                <td className={cn(cellClass, 'text-xs leading-5 whitespace-nowrap text-muted-foreground tabular-nums')}>
                  {/* "dd/MM/yyyy HH:mm" on two lines */}
                  <span className="block text-foreground">{formatDateTime(b.updatedAt).slice(0, 10)}</span>
                  <span className="block">{formatDateTime(b.updatedAt).slice(11)}</span>
                </td>
                <td className={cn(cellClass, 'w-12 pl-0 text-right')}>
                  <RowMenu label={`Thao tác với ${b.campaign.name}`}>
                    <BookingMenuItems b={b} onOpen={() => onOpen(b.id)} />
                  </RowMenu>
                </td>
              </tr>
              {open && (
                <tr id={detailId} className="border-b border-border bg-muted/30 last:border-0">
                  <td />
                  <td colSpan={9} className="px-3 pt-1 pb-4">
                    <ExpandedDetail b={b} />
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

/** One booking in the "Thẻ" view: 16:9 cover on top; the title button covers the card and opens the sheet. */
function BookingGridCard({ b, now, onOpen }: { b: BookingView; now: number; onOpen(): void }) {
  const needs = supplierTodoLabel(b) !== null;
  const recruit = isRecruitBooking(b);
  const kols = new Set(b.items.map((i) => i.kolAccountId)).size;
  const at = bookingDeadline(b);
  return (
    <Card className={cn('group relative h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary/40', needs && 'border-primary/40')}>
      <CampaignCover cover={b.campaign.cover} className="aspect-video w-full" />
      <div className="absolute top-2 right-2 z-10 rounded-[8px] bg-card/90 backdrop-blur-sm">
        <RowMenu label={`Thao tác với ${b.campaign.name}`}>
          <BookingMenuItems b={b} onOpen={onOpen} />
        </RowMenu>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate font-medium text-foreground">{b.campaign.brand.company}</span>
          </p>
          <h2 className="line-clamp-2 text-base leading-snug font-semibold text-foreground group-hover:text-primary">
            <button
              type="button"
              onClick={onOpen}
              className="text-left after:absolute after:inset-0 after:rounded-[8px] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {b.campaign.name}
            </button>
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <BookingStatusBadge booking={b} />
            <OriginBadge origin={b.origin} />
            {needs && <NeedsYouMarker />}
          </div>
        </div>
        {recruit && <RecruitStageStepper stage={recruitStage(b)} />}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <KolAvatarStack items={b.items} max={3} />
            <span className="text-xs text-muted-foreground">{kols} KOL</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <p className="text-sm font-semibold tabular-nums">
              <PriceCell b={b} />
            </p>
            {at !== undefined && !recruit ? (
              <CountdownText countdown={expiryCountdown(at, now)} prefix="Hạn phản hồi" />
            ) : (
              <p className="text-xs text-muted-foreground">Cập nhật {formatDateTime(b.updatedAt)}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** "Thẻ" view: 1 column on phones, 2 at medium widths, 3 from @5xl (the page wrapper is the container). */
export function BookingCardGrid({ rows, now, onOpen, label }: { rows: BookingView[]; now: number; onOpen(id: string): void; label: string }) {
  return (
    <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3" aria-label={label}>
      {rows.map((b) => (
        <li key={b.id} className="min-w-0">
          <BookingGridCard b={b} now={now} onOpen={() => onOpen(b.id)} />
        </li>
      ))}
    </ul>
  );
}
