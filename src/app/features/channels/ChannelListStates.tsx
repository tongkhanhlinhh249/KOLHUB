import type { ReactNode } from 'react';
import { AlertCircle, RotateCcw, SearchX, type LucideIcon } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { SearchPagination } from '../biz-search/SearchPagination';
import { ChannelRowSkeleton } from './ChannelRow';

/**
 * List container and states shared by "Quản lý kênh" (KOL/MCN) and "Danh sách kênh" (Brand):
 * count line, loading rows, error, empty, the list itself and its pagination.
 */

/** "N kênh" + secondary text on the left, actions (e.g. "Thêm kênh") on the right. */
export function ChannelCountLine({ count, extra, actions }: { count?: number; extra?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
        {count !== undefined && (
          <>
            <span className="font-medium text-foreground">{count} kênh</span>
            {extra && <span className="text-muted-foreground">{extra}</span>}
          </>
        )}
      </p>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ChannelListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải kênh">
      {Array.from({ length: count }, (_, i) => (
        <ChannelRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChannelListError({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Thử lại
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ChannelListEmpty({
  icon: Icon = SearchX,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/** "Xoá bộ lọc" for the no-match state. */
export function ClearFiltersButton({ onClear }: { onClear(): void }) {
  return (
    <Button type="button" variant="outline" className="h-11" onClick={onClear}>
      Xoá bộ lọc
    </Button>
  );
}

export function ChannelList({
  label,
  busy = false,
  page,
  pageCount,
  onPage,
  children,
}: {
  label: string;
  busy?: boolean;
  page: number;
  pageCount: number;
  onPage(page: number): void;
  children: ReactNode;
}) {
  return (
    <>
      <ul className={cn('flex flex-col gap-3 transition-opacity', busy && 'opacity-60')} aria-label={label}>
        {children}
      </ul>
      <SearchPagination page={page} pageCount={pageCount} onPage={onPage} />
    </>
  );
}
