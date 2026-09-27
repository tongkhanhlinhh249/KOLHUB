import { Link } from 'react-router';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { formatCompactVi, formatDate } from '../biz-search/format';
import type { ListSummary } from './listView';

interface ListHeaderProps {
  name: string;
  count: number;
  updatedAt: string;
  /** null while the rows are loading. */
  summary: ListSummary | null;
  onRename(): void;
  onDelete(): void;
}

function Chip({ tone, children }: { tone: 'green' | 'amber' | 'muted'; children: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'green' && 'bg-chart-4/15 text-foreground',
        tone === 'amber' && 'bg-chart-5/15 text-foreground',
        tone === 'muted' && 'bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', tone === 'green' && 'bg-chart-4', tone === 'amber' && 'bg-chart-5', tone === 'muted' && 'bg-muted-foreground')}
        aria-hidden
      />
      {children}
    </span>
  );
}

/** Name, totals and badge-status summary of the selected list, with its actions. */
export function ListHeader({ name, count, updatedAt, summary, onRename, onDelete }: ListHeaderProps) {
  return (
    <Card className="gap-3 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64 space-y-1">
          <h2 className="truncate text-xl font-semibold text-foreground" title={name}>
            {name}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {count} KOL
            {summary && summary.totalFollowers > 0 && <> · Tổng {formatCompactVi(summary.totalFollowers)} người theo dõi</>}
            {updatedAt && <> · Cập nhật {formatDate(updatedAt)}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/tim-kiem-kol" className={buttonVariants({ className: 'h-11 md:h-9' })}>
            <Plus aria-hidden />
            Thêm KOL
          </Link>
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onRename}>
            <Pencil aria-hidden />
            Đổi tên
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9" aria-label="Thao tác khác với danh sách">
                <MoreVertical aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 aria-hidden />
                Xoá danh sách
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {count > 0 &&
        (summary ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Tình trạng dấu xác thực">
            {summary.verified > 0 && <Chip tone="green">{`${summary.verified} còn dấu xác thực`}</Chip>}
            {summary.expired > 0 && <Chip tone="amber">{`${summary.expired} hết hạn dấu`}</Chip>}
            {summary.inactive > 0 && <Chip tone="muted">{`${summary.inactive} ngừng hoạt động`}</Chip>}
          </div>
        ) : (
          <Skeleton className="h-6 w-64" />
        ))}
    </Card>
  );
}
