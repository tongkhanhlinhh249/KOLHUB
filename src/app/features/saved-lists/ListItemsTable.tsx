import { Eye, MoreHorizontal, NotebookPen, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import type { SavedListRow } from '../../services';
import { formatDate } from '../biz-search/format';
import { KolAvatar } from '../biz-search/KolCard';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { ListingStatusBadge } from '../biz-search/StatusBadges';

interface ListItemsTableProps {
  rows: SavedListRow[];
  onView(kolId: string): void;
  onEditNote(row: SavedListRow): void;
  onRemove(kolId: string): void;
}

function RowActions({ row, onView, onEditNote, onRemove }: { row: SavedListRow } & Omit<ListItemsTableProps, 'rows'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Thao tác với ${row.displayName}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {row.status !== 'UNAVAILABLE' && (
          <DropdownMenuItem onSelect={() => onView(row.kolId)}>
            <Eye aria-hidden />
            Xem hồ sơ
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onEditNote(row)}>
          <NotebookPen aria-hidden />
          Sửa ghi chú
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onRemove(row.kolId)}>
          <Trash2 aria-hidden />
          Bỏ khỏi danh sách
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NoteButton({ row, onEditNote }: { row: SavedListRow; onEditNote(row: SavedListRow): void }) {
  return (
    <button
      type="button"
      onClick={() => onEditNote(row)}
      className="line-clamp-2 max-w-full rounded-sm text-left text-sm break-words hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={row.note || undefined}
    >
      {row.note ? <span className="text-foreground">{row.note}</span> : <span className="text-muted-foreground">Thêm ghi chú</span>}
    </button>
  );
}

function KolCell({ row }: { row: SavedListRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <KolAvatar name={row.displayName} src={row.avatar} className="size-9" />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{row.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{row.kolId}</p>
      </div>
    </div>
  );
}

function Platforms({ row }: { row: SavedListRow }) {
  if (row.platforms.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {row.platforms.map((p) => (
        <PlatformIcon key={p} platform={p} className="size-5" />
      ))}
    </div>
  );
}

// Keeps the row menu reachable when the table scrolls horizontally on narrow desktops.
const STICKY_ACTIONS = 'sticky right-0 z-10 w-12 bg-card shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.15)]';

/** KOLs of one saved list: table from md, cards below. */
export function ListItemsTable({ rows, onView, onEditNote, onRemove }: ListItemsTableProps) {
  const actions = { onView, onEditNote, onRemove };
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KOL</TableHead>
              <TableHead>Lĩnh vực</TableHead>
              <TableHead>Nền tảng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[28%]">Ghi chú</TableHead>
              <TableHead>Ngày lưu</TableHead>
              <TableHead className={STICKY_ACTIONS}>
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.kolId}>
                <TableCell className="max-w-56">
                  <KolCell row={r} />
                </TableCell>
                <TableCell>{r.category ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Platforms row={r} />
                </TableCell>
                <TableCell>
                  <ListingStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  <NoteButton row={r} onEditNote={onEditNote} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(r.addedAt)}</TableCell>
                <TableCell className={STICKY_ACTIONS}>
                  <RowActions row={r} {...actions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.kolId}>
            <Card className="gap-3 p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <KolCell row={r} />
                </div>
                <RowActions row={r} {...actions} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ListingStatusBadge status={r.status} />
                {r.category && <Badge variant="secondary">{r.category}</Badge>}
                <Platforms row={r} />
              </div>
              <NoteButton row={r} onEditNote={onEditNote} />
              <p className="text-xs text-muted-foreground">Ngày lưu: {formatDate(r.addedAt)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
