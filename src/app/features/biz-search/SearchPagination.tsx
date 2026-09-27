import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '../../components/ui/pagination';
import { cn } from '../../components/ui/utils';

/** Page numbers to show: first, last, current ±1, with null for gaps. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  const set = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

export function SearchPagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage(p: number): void;
}) {
  if (pageCount <= 1) return null;
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (p >= 1 && p <= pageCount && p !== page) onPage(p);
  };
  const disabledCls = 'pointer-events-none opacity-50';
  return (
    <Pagination aria-label="Phân trang">
      <PaginationContent className="flex-wrap justify-center">
        <PaginationItem>
          <PaginationLink
            href="#"
            size="default"
            aria-label="Trang trước"
            aria-disabled={page <= 1}
            className={cn('gap-1 pl-2.5', page <= 1 && disabledCls)}
            onClick={go(page - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">Trước</span>
          </PaginationLink>
        </PaginationItem>
        {pageWindow(page, pageCount).map((p, i) =>
          p === null ? (
            <PaginationItem key={`gap-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href="#" isActive={p === page} aria-label={`Trang ${p}`} onClick={go(p)}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationLink
            href="#"
            size="default"
            aria-label="Trang sau"
            aria-disabled={page >= pageCount}
            className={cn('gap-1 pr-2.5', page >= pageCount && disabledCls)}
            onClick={go(page + 1)}
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="size-4" aria-hidden />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
