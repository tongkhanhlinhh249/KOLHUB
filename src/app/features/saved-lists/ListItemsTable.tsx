import type { MouseEvent, ReactNode } from 'react';
import { ArrowRightLeft, Eye, Megaphone, MoreHorizontal, NotebookPen, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import type { SavedListRow, SavedListSummary } from '../../services';
import { formatCompactVi, formatDate } from '../biz-search/format';
import { KolAvatar } from '../biz-search/KolCard';
import { FieldBadges } from '../biz-search/KolMedia';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { ListingStatusBadge } from '../biz-search/StatusBadges';

export interface RowHandlers {
  onView(kolId: string): void;
  onEditNote(row: SavedListRow): void;
  onRemove(kolIds: string[]): void;
  onMove(kolIds: string[], targetId: string): void;
  /** "Mời vào chiến dịch" (campaign booking beta); hidden when not given. */
  onInvite?(row: SavedListRow): void;
}

interface ListItemsTableProps extends RowHandlers {
  rows: SavedListRow[];
  /** Lists the KOLs can be moved to (every own list but the current one). */
  otherLists: SavedListSummary[];
  selected: ReadonlySet<string>;
  onToggle(kolId: string, checked: boolean): void;
  onToggleAll(checked: boolean): void;
}

const canView = (r: SavedListRow) => r.status !== 'UNAVAILABLE';

/** Clicks on controls (also inside portalled menus, which bubble through React) must not open the sheet. */
function fromControl(e: MouseEvent): boolean {
  return !!(e.target as HTMLElement).closest('button, a, input, label, [role="checkbox"], [role="menuitem"], [role="menu"]');
}

// --- Cells -----------------------------------------------------------------------------------

function KolIdentity({ row, onView, showFields }: { row: SavedListRow; onView(kolId: string): void; showFields?: 'always' | 'narrow' }) {
  const sub = [row.handle ? `@${row.handle}` : null, row.status === 'UNAVAILABLE' ? null : row.kolId].filter(Boolean).join(' · ');
  return (
    <div className="flex min-w-0 items-center gap-3">
      <KolAvatar name={row.displayName} src={row.avatar} className="size-10" />
      <div className="min-w-0 flex-1">
        {canView(row) ? (
          <button
            type="button"
            onClick={() => onView(row.kolId)}
            className="block max-w-full truncate rounded-sm text-left font-semibold text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title={row.displayName}
          >
            {row.displayName}
          </button>
        ) : (
          <p className="truncate font-semibold text-muted-foreground" title={row.displayName}>
            {row.displayName}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground" title={sub || undefined}>
          {sub || 'Hồ sơ không còn công khai'}
        </p>
        {showFields && row.fields.length > 0 && (
          // w-0 + min-w-full: fills the cell without widening the column (pills truncate instead).
          <Fields row={row} className={cn('mt-1 w-0 min-w-full', showFields === 'narrow' && '@min-[72rem]:hidden')} />
        )}
      </div>
    </div>
  );
}

/** Up to 2 compact field pills on one line, "+n" for the rest (full list in the tooltip). */
function Fields({ row, className }: { row: SavedListRow; className?: string }) {
  if (row.fields.length === 0) return <span className={cn('text-sm text-muted-foreground', className)}>—</span>;
  const extra = row.fields.length - 2;
  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)} title={row.fields.map((f) => f.name).join(', ')}>
      <FieldBadges fields={row.fields.slice(0, 2)} size="sm" className="min-w-0 flex-nowrap gap-1 overflow-hidden [&>li]:min-w-0 [&>li]:max-w-[7.5rem]" />
      {extra > 0 && (
        <span className="shrink-0 text-xs font-medium text-muted-foreground" aria-label={`và ${extra} lĩnh vực khác`}>
          +{extra}
        </span>
      )}
    </div>
  );
}

/**
 * Platform logo + compact followers per public channel, never wrapped inside an item; at most two
 * per line so the column stays ~130px (3–4 channels take a second line instead of widening it).
 */
function Channels({ row, className }: { row: SavedListRow; className?: string }) {
  if (row.channels.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  const all = row.channels.map((c) => `${platformLabel(c.platform)}: ${formatCompactVi(c.followers)}`).join(' · ');
  return (
    <ul className={cn('grid w-max grid-cols-[auto_auto] gap-x-3 gap-y-1 whitespace-nowrap', className)} title={all} aria-label="Kênh và người theo dõi">
      {row.channels.map((c, i) => (
        <li key={`${c.platform}-${i}`} className="inline-flex items-center gap-1.5 text-sm text-foreground tabular-nums">
          <PlatformIcon platform={c.platform} className="size-4" />
          {formatCompactVi(c.followers)}
        </li>
      ))}
    </ul>
  );
}

function NoteButton({ row, onEditNote, className }: { row: SavedListRow; onEditNote(row: SavedListRow): void; className?: string }) {
  const button = (
    <button
      type="button"
      onClick={() => onEditNote(row)}
      aria-label={row.note ? `Sửa ghi chú cho ${row.displayName}: ${row.note}` : `Thêm ghi chú cho ${row.displayName}`}
      className={cn(
        'line-clamp-2 max-w-full rounded-sm text-left text-sm break-words hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        row.note ? 'text-foreground' : 'inline-flex items-center gap-1.5 text-muted-foreground',
        className,
      )}
    >
      {row.note || (
        <>
          <NotebookPen className="size-3.5 shrink-0" aria-hidden />
          Thêm ghi chú…
        </>
      )}
    </button>
  );
  if (!row.note) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-xs text-sm break-words whitespace-pre-wrap">
        {row.note}
      </TooltipContent>
    </Tooltip>
  );
}

function MoveItems({ otherLists, onPick }: { otherLists: SavedListSummary[]; onPick(listId: string): void }) {
  if (otherLists.length === 0) return <DropdownMenuItem disabled>Chưa có danh sách khác</DropdownMenuItem>;
  return (
    <>
      {otherLists.map((l) => (
        <DropdownMenuItem key={l.id} onSelect={() => onPick(l.id)}>
          <span className="min-w-0 flex-1 truncate">{l.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{l.count}</span>
        </DropdownMenuItem>
      ))}
    </>
  );
}

function RowMenu({ row, otherLists, onEditNote, onRemove, onMove, onInvite, className }: { row: SavedListRow; otherLists: SavedListSummary[]; className?: string } & Omit<RowHandlers, 'onView'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={cn('size-11 md:size-8', className)} aria-label={`Thao tác với ${row.displayName}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {onInvite && canView(row) && (
          <DropdownMenuItem onSelect={() => onInvite(row)}>
            <Megaphone aria-hidden />
            Mời vào chiến dịch
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onEditNote(row)}>
          <NotebookPen aria-hidden />
          Sửa ghi chú
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <ArrowRightLeft className="size-4 text-muted-foreground" aria-hidden />
            Chuyển sang danh sách…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto">
            <MoveItems otherLists={otherLists} onPick={(id) => onMove([row.kolId], id)} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRemove([row.kolId])}>
          <Trash2 aria-hidden />
          Bỏ khỏi danh sách
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ViewButton({ row, onView, className, children }: { row: SavedListRow; onView(kolId: string): void; className?: string; children?: ReactNode }) {
  const ok = canView(row);
  return (
    <Button
      type="button"
      variant={children ? 'outline' : 'ghost'}
      size={children ? 'sm' : 'icon'}
      className={className}
      disabled={!ok}
      onClick={() => onView(row.kolId)}
      aria-label={ok ? `Xem hồ sơ ${row.displayName}` : 'Hồ sơ không còn công khai'}
      title={ok ? 'Xem hồ sơ' : 'Hồ sơ không còn công khai'}
    >
      <Eye aria-hidden />
      {children}
    </Button>
  );
}

function RowCheckbox({ row, checked, onToggle, className }: { row: SavedListRow; checked: boolean; onToggle(kolId: string, c: boolean): void; className?: string }) {
  return (
    <label className={cn('grid cursor-pointer place-items-center', className)}>
      <Checkbox checked={checked} onCheckedChange={(c) => onToggle(row.kolId, c === true)} aria-label={`Chọn ${row.displayName}`} />
    </label>
  );
}

// --- Table / cards -----------------------------------------------------------------------------

/*
 * Widths are sized for the detail column (container queries — the list panel and the app sidebar
 * take their share of the screen). Table from 50rem (800px; the detail column at 1440px beside the
 * panel is ~820px). Column budget incl. padding: ☐ 44 · KOL 208–232 · Kênh ≤ 154 (2 per line) ·
 * Trạng thái ≤ 155 · Ghi chú ≥ 136 (takes the rest) · actions 88 → worst case ≈ 809.
 * In that band "Lĩnh vực" sits under the KOL handle and "Ngày lưu" under the status badge.
 * From 72rem (1152px) both get their own column: KOL ≤ 264 · Lĩnh vực ≤ 184 · Ngày lưu 104 → worst
 * case ≈ 1129. Below 50rem: stacked cards.
 */
export function ListItemsTable({ rows, otherLists, selected, onToggle, onToggleAll, ...handlers }: ListItemsTableProps) {
  const { onView, onEditNote } = handlers;
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.kolId));
  const someChecked = !allChecked && rows.some((r) => selected.has(r.kolId));

  return (
    <>
      <Card className="hidden gap-0 overflow-clip p-0 @min-[50rem]:flex">
        <table className="w-full caption-bottom text-sm" aria-label="KOL trong danh sách">
          <TableHeader className="sticky top-0 z-10 [&_th]:bg-card [&_th]:shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pr-0 pl-3">
                <label className="grid size-8 cursor-pointer place-items-center">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                    onCheckedChange={(c) => onToggleAll(c === true)}
                    aria-label="Chọn tất cả KOL đang hiển thị"
                  />
                </label>
              </TableHead>
              <TableHead className="h-11 px-3">KOL</TableHead>
              <TableHead className={cn('hidden h-11 px-3 whitespace-nowrap', '@min-[72rem]:table-cell')}>Lĩnh vực</TableHead>
              <TableHead className="h-11 px-3 whitespace-nowrap">Kênh &amp; người theo dõi</TableHead>
              <TableHead className="h-11 px-3 whitespace-nowrap">Trạng thái</TableHead>
              <TableHead className="h-11 w-full px-3">Ghi chú</TableHead>
              <TableHead className={cn('hidden h-11 px-3 whitespace-nowrap', '@min-[72rem]:table-cell')}>Ngày lưu</TableHead>
              <TableHead className="h-11 pr-3 pl-2">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const checked = selected.has(r.kolId);
              return (
                <TableRow
                  key={r.kolId}
                  data-state={checked ? 'selected' : undefined}
                  className={cn('hover:bg-muted/40 data-[state=selected]:bg-primary/5', canView(r) && 'cursor-pointer')}
                  onClick={(e) => {
                    if (canView(r) && !fromControl(e)) onView(r.kolId);
                  }}
                >
                  <TableCell className="w-10 py-3 pr-0 pl-3">
                    <RowCheckbox row={r} checked={checked} onToggle={onToggle} className="size-8" />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="max-w-[13rem] min-w-[11.5rem] @min-[72rem]:max-w-[15rem]">
                      <KolIdentity row={r} onView={onView} showFields="narrow" />
                    </div>
                  </TableCell>
                  <TableCell className={cn('hidden px-3 py-3', '@min-[72rem]:table-cell')}>
                    <div className="max-w-[10rem] min-w-[9rem]">
                      <Fields row={r} />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <Channels row={r} />
                  </TableCell>
                  <TableCell className="px-3 py-3 whitespace-nowrap">
                    <ListingStatusBadge status={r.status} />
                    <span className={cn('mt-1 block text-xs text-muted-foreground tabular-nums', '@min-[72rem]:hidden')}>Lưu {formatDate(r.addedAt)}</span>
                  </TableCell>
                  <TableCell className="px-3 py-3 whitespace-normal">
                    <div className="min-w-[7rem]">
                      <NoteButton row={r} onEditNote={onEditNote} />
                    </div>
                  </TableCell>
                  <TableCell className={cn('hidden px-3 py-3 whitespace-nowrap text-muted-foreground tabular-nums', '@min-[72rem]:table-cell')}>
                    {formatDate(r.addedAt)}
                  </TableCell>
                  <TableCell className="py-3 pr-3 pl-2">
                    <div className="flex items-center justify-end gap-1">
                      <ViewButton row={r} onView={onView} className="size-8" />
                      <RowMenu row={r} otherLists={otherLists} {...handlers} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </Card>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 @min-[36rem]:grid-cols-2 @min-[50rem]:hidden" aria-label="KOL trong danh sách">
        {rows.map((r) => {
          const checked = selected.has(r.kolId);
          return (
            <li key={r.kolId} className="min-w-0">
              <Card className={cn('h-full gap-3 p-4', checked && 'border-primary/50 bg-primary/5')}>
                <div className="flex items-start gap-1">
                  <RowCheckbox row={r} checked={checked} onToggle={onToggle} className="-mt-2 -ml-3 size-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <KolIdentity row={r} onView={onView} />
                  </div>
                  <RowMenu row={r} otherLists={otherLists} {...handlers} className="-mt-2 -mr-2 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ListingStatusBadge status={r.status} />
                  <Channels row={r} />
                </div>
                {r.fields.length > 0 && <FieldBadges fields={r.fields} size="sm" />}
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <NoteButton row={r} onEditNote={onEditNote} className="min-h-11 w-full md:min-h-7" />
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">Lưu {formatDate(r.addedAt)}</span>
                  <ViewButton row={r} onView={onView} className="h-11">
                    Xem hồ sơ
                  </ViewButton>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Placeholder rows while a list loads (same breakpoints as the table). */
export function ListItemsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải danh sách">
      <Card className="hidden gap-0 p-0 @min-[50rem]:flex">
        <div className="h-11 border-b" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            <Skeleton className="size-4" />
            <Skeleton className="size-10 rounded-full" />
            <div className="w-44 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="size-8" />
          </div>
        ))}
      </Card>
      <div className="grid gap-3 @min-[36rem]:grid-cols-2 @min-[50rem]:hidden">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
