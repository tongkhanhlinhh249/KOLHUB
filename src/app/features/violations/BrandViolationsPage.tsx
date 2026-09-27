import { useMemo, useState } from 'react';
import { AlertCircle, Info, RotateCcw, SearchX } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { countViolationsByStatus, violationService, type BrandViolation } from '../../services';
import { useBrandKolSheet } from '../shared/BrandKolSheet';
import { useLiveQuery } from '../shared/useLiveQuery';
import { brandLockedView } from '../shared/BrandLocked';
import { ViolationDetailSheet } from './ViolationDetailSheet';
import { ViolationFilters } from './ViolationFilters';
import { SummaryCard, ViolationTableSkeleton } from './ViolationParts';
import { ViolationTable } from './ViolationTable';
import { applyViolationQuery, hasActiveFilters, type StatusTab, type ViolationQuery } from './violationQuery';

/**
 * /vi-pham-kol — read-only list of CONFIRMED / RESOLVED violations of approved KOLs
 * (exception to BR-58, see demo assumptions). No notes, no pending or dismissed items.
 */
export function BrandViolationsPage() {
  const q = useLiveQuery(() => violationService.listForBrand(), []);
  const all = q.data;
  const [query, setQuery] = useState<ViolationQuery>({ status: 'all', sort: 'newest' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const kol = useBrandKolSheet();

  const change = (patch: Partial<ViolationQuery>) => setQuery((prev) => ({ ...prev, ...patch }));
  const clear = () => setQuery((prev) => ({ status: prev.status, sort: prev.sort }));
  const counts = useMemo(() => countViolationsByStatus(all ?? []), [all]);
  const rows = useMemo(() => applyViolationQuery(all ?? [], query), [all, query]);
  const detail = all?.find((v) => v.id === detailId) ?? null;
  const status = query.status ?? 'all';

  if (q.error && !all) {
    const locked = brandLockedView(q.error);
    if (locked) return locked;
  }

  const cards: { status: StatusTab; label: string; value: number; tone: 'primary' | 'red' | 'green'; hint: string }[] = [
    { status: 'all', label: 'Tổng vi phạm đã xác nhận', value: counts.all, tone: 'primary', hint: 'Đã được Admin xác minh' },
    { status: 'CONFIRMED', label: 'Đang hiệu lực', value: counts.CONFIRMED, tone: 'red', hint: 'KOL chưa khắc phục' },
    { status: 'RESOLVED', label: 'Đã khắc phục', value: counts.RESOLVED, tone: 'green', hint: 'Nội dung đã gỡ hoặc sửa' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <SummaryCard
            key={c.status}
            label={c.label}
            value={all ? c.value : '–'}
            hint={c.hint}
            tone={c.tone}
            active={status === c.status && c.status !== 'all'}
            onClick={() => change({ status: status === c.status ? 'all' : c.status })}
          />
        ))}
      </div>

      <ViolationFilters
        query={query}
        onChange={change}
        onClear={clear}
        searchPlaceholder="Tìm tên KOL, KOL ID, @kênh, tiêu đề"
        searchLabel="Tìm vi phạm theo tên KOL, KOL ID, tên kênh hoặc tiêu đề nội dung"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium text-foreground" aria-live="polite">
          {all ? `${rows.length} vi phạm${status === 'CONFIRMED' ? ' đang hiệu lực' : status === 'RESOLVED' ? ' đã khắc phục' : ''}` : ''}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" aria-hidden />
          Chỉ hiện vi phạm đã được Admin xác nhận.
        </p>
      </div>

      {q.loading && !all ? (
        <ViolationTableSkeleton />
      ) : q.error && !all ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Không tải được danh sách vi phạm.</span>
            <Button type="button" variant="outline" size="sm" onClick={q.reload}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-6" aria-hidden />
          </div>
          <p className="font-semibold text-foreground">{all?.length ? 'Không có vi phạm phù hợp' : 'Chưa có vi phạm nào được xác nhận'}</p>
          {(hasActiveFilters(query) || status !== 'all') && (
            <Button type="button" variant="outline" className="h-11" onClick={() => setQuery({ status: 'all', sort: query.sort })}>
              Xoá bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <ViolationTable<BrandViolation>
          rows={rows}
          label="Danh sách vi phạm của KOL"
          onView={(v) => setDetailId(v.id)}
          onKol={(v) => kol.openKol(v.kolId)}
        />
      )}

      <ViolationDetailSheet
        violation={detail}
        mode="brand"
        onOpenChange={(o) => !o && setDetailId(null)}
        onKol={(kolId) => {
          setDetailId(null);
          kol.openKol(kolId);
        }}
      />
      {kol.elements}
    </div>
  );
}
