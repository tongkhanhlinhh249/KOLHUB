import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, MessageSquareWarning, MoreHorizontal, RotateCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../auth/AuthContext';
import {
  APPEAL_MIN,
  countViolationsByStatus,
  VIOLATION_STATUS_LABEL,
  violationService,
  type OwnerViolation,
} from '../../services';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ReasonDialog } from './ReasonDialog';
import { ViolationDetailSheet } from './ViolationDetailSheet';
import { ViolationFilters } from './ViolationFilters';
import { SummaryCard, ViolationTableSkeleton } from './ViolationParts';
import { ViolationTable } from './ViolationTable';
import { applyViolationQuery, hasActiveFilters, matchesFilters, type StatusTab, type ViolationQuery } from './violationQuery';

const TABS: StatusTab[] = ['all', 'PENDING_REVIEW', 'CONFIRMED', 'APPEALED', 'RESOLVED', 'DISMISSED'];
const tabLabel = (t: StatusTab) => (t === 'all' ? 'Tất cả' : VIOLATION_STATUS_LABEL[t]);

const canResolve = (v: OwnerViolation) => v.status === 'CONFIRMED';
const canAppeal = (v: OwnerViolation) => v.status === 'CONFIRMED' && !v.appealed;

/** /kiem-duyet/vi-pham — violations of the signed-in KOL/MCN: view, mark fixed, appeal once. */
export function OwnerViolationsPage() {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const q = useLiveQuery(() => violationService.listForOwner(accountId), [accountId]);
  const all = q.data;

  const [query, setQuery] = useState<ViolationQuery>({ status: 'all', sort: 'newest' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [appealId, setAppealId] = useState<string | null>(null);

  const change = (patch: Partial<ViolationQuery>) => setQuery((prev) => ({ ...prev, ...patch }));
  const clear = () => setQuery((prev) => ({ status: prev.status, sort: prev.sort }));

  const counts = useMemo(() => countViolationsByStatus(all ?? []), [all]);
  const tabCounts = useMemo(() => countViolationsByStatus((all ?? []).filter((v) => matchesFilters(v, query))), [all, query]);
  const rows = useMemo(() => applyViolationQuery(all ?? [], query), [all, query]);
  const detail = all?.find((v) => v.id === detailId) ?? null;
  const status = query.status ?? 'all';

  const resolve = async (note: string) => {
    await violationService.markResolved(accountId, resolveId!, note);
    toast.success('Đã ghi nhận khắc phục', { description: 'Nhãn hàng sẽ thấy vi phạm này ở trạng thái Đã khắc phục.' });
  };
  const appeal = async (reason: string) => {
    await violationService.appeal(accountId, appealId!, reason);
    toast.success('Đã gửi khiếu nại', { description: 'Admin sẽ xem xét và phản hồi cho bạn.' });
  };

  const rowActions = (v: OwnerViolation) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`Thao tác: ${v.contentTitle}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => setDetailId(v.id)}>
          <Eye aria-hidden />
          Xem chi tiết
        </DropdownMenuItem>
        {(canResolve(v) || canAppeal(v)) && <DropdownMenuSeparator />}
        {canResolve(v) && (
          <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => setResolveId(v.id)}>
            <CheckCircle2 aria-hidden />
            Đã khắc phục
          </DropdownMenuItem>
        )}
        {canAppeal(v) && (
          <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => setAppealId(v.id)}>
            <MessageSquareWarning aria-hidden />
            Khiếu nại
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const sheetFooter =
    detail && (canResolve(detail) || canAppeal(detail)) ? (
      <>
        {canAppeal(detail) && (
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setAppealId(detail.id)}>
            <MessageSquareWarning aria-hidden />
            Khiếu nại
          </Button>
        )}
        <Button type="button" className="h-11 md:h-9" onClick={() => setResolveId(detail.id)}>
          <CheckCircle2 aria-hidden />
          Đã khắc phục
        </Button>
      </>
    ) : undefined;

  const summary: { status: StatusTab; label: string; tone: 'amber' | 'red' | 'primary' | 'green'; hint: string }[] = [
    { status: 'PENDING_REVIEW', label: 'Chờ xác minh', tone: 'amber', hint: 'Admin đang xem xét' },
    { status: 'CONFIRMED', label: 'Cần xử lý', tone: 'red', hint: 'Khắc phục hoặc khiếu nại' },
    { status: 'APPEALED', label: 'Đang khiếu nại', tone: 'primary', hint: 'Chờ Admin phản hồi' },
    { status: 'RESOLVED', label: 'Đã khắc phục', tone: 'green', hint: 'Đã gỡ hoặc sửa nội dung' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <SummaryCard
            key={s.status}
            label={s.label}
            value={all ? counts[s.status as keyof typeof counts] : '–'}
            hint={s.hint}
            tone={s.tone}
            active={status === s.status}
            onClick={() => change({ status: status === s.status ? 'all' : s.status })}
          />
        ))}
      </div>

      <ViolationFilters
        query={query}
        onChange={change}
        onClear={clear}
        searchPlaceholder="Tìm tiêu đề nội dung, @kênh"
        searchLabel="Tìm vi phạm theo tiêu đề nội dung hoặc tên kênh"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={status} onValueChange={(s) => change({ status: s as StatusTab })}>
            <TabsList className="h-auto" aria-label="Lọc theo trạng thái">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="h-11 md:h-8">
                  {tabLabel(t)} ({tabCounts[t]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <p className="shrink-0 text-sm font-medium text-foreground" aria-live="polite">
          {all ? `${rows.length} vi phạm` : ''}
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
          <div className="flex size-12 items-center justify-center rounded-full bg-chart-4/15 text-foreground">
            <ShieldCheck className="size-6" aria-hidden />
          </div>
          {all && all.length === 0 ? (
            <>
              <p className="font-semibold text-foreground">Chưa có vi phạm nào</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Vi phạm do KOL Safety phát hiện khi quét kênh hoặc do người dùng báo cáo sẽ hiện ở đây sau khi Admin xem xét.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">Không có vi phạm phù hợp</p>
              <p className="text-sm text-muted-foreground">Thử chọn trạng thái khác hoặc bỏ bớt bộ lọc.</p>
              {(hasActiveFilters(query) || status !== 'all') && (
                <Button type="button" variant="outline" className="h-11" onClick={() => setQuery({ status: 'all', sort: query.sort })}>
                  Xoá bộ lọc
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <ViolationTable rows={rows} label="Vi phạm" onView={(v) => setDetailId(v.id)} renderActions={rowActions} />
      )}

      <ViolationDetailSheet violation={detail} mode="owner" onOpenChange={(o) => !o && setDetailId(null)} footer={sheetFooter} />
      <ReasonDialog
        open={resolveId !== null}
        onOpenChange={(o) => !o && setResolveId(null)}
        title="Xác nhận đã khắc phục"
        description="Cho biết bạn đã gỡ hoặc sửa nội dung thế nào. Vi phạm sẽ chuyển sang Đã khắc phục."
        label="Ghi chú khắc phục"
        placeholder="Ví dụ: Đã gỡ video / Đã thêm nhãn #QuangCao ở đầu video"
        confirmLabel="Xác nhận đã khắc phục"
        onConfirm={resolve}
      />
      <ReasonDialog
        open={appealId !== null}
        onOpenChange={(o) => !o && setAppealId(null)}
        title="Khiếu nại vi phạm"
        description="Mỗi vi phạm chỉ được khiếu nại một lần. Nếu Admin từ chối, bạn chỉ có thể khắc phục nội dung."
        label="Lý do khiếu nại"
        placeholder="Nêu rõ vì sao nội dung không vi phạm, kèm căn cứ (giấy phép, hợp đồng…)"
        confirmLabel="Gửi khiếu nại"
        minLength={APPEAL_MIN}
        onConfirm={appeal}
      />
    </div>
  );
}
