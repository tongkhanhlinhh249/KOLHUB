import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Building2, Info, MonitorPlay, MoreHorizontal, Plus, RotateCcw, SearchX, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button, buttonVariants } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useAuth } from '../../auth/AuthContext';
import {
  canManageKolAssignments,
  channelService,
  KOL_CATEGORIES,
  mcnKolService,
  profileService,
  type KolCategory,
  type McnKolRow,
} from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect } from '../filters/FilterSelect';
import { SortSelect } from '../filters/SortSelect';
import { useLiveQuery } from '../shared/useLiveQuery';
import { profilePath } from '../profile/primaryAction';
import { AssignChannelsDialog } from './AssignChannelsDialog';
import { ASSIGN_LOCKED_TEXT } from './useMcnChannelOwners';
import { McnKolListRow, McnKolListRowSkeleton } from './McnKolRow';
import { ReturnToCampaign } from '../supplier-booking/ReturnToCampaign';
import {
  applyMcnKolQuery,
  assignedChannelsPath,
  hasMcnKolFilters,
  mergeMcnKolParams,
  MCN_KOL_SORT_OPTIONS,
  parseMcnKolParams,
  type McnKolQuery,
} from './mcnKolQuery';

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

/**
 * /ho-so-mcn/kol — KOLs holding channels of the signed-in MCN: assign channels (many → one KOL), unassign.
 * Allowed while the MCN profile is DRAFT / NEEDS_FIX (≥ 1 assigned KOL is recommended, not required) or APPROVED;
 * locked while under review or rejected. `?gan=1` opens the assign dialog once (overview CTA).
 */
export function McnKolsPage() {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const q = useLiveQuery(async () => {
    const [rows, channels, view] = await Promise.all([
      mcnKolService.listKols(accountId),
      channelService.list(accountId),
      profileService.getProfile(accountId),
    ]);
    return { rows, channels, status: view.profile.status };
  }, [accountId]);

  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => parseMcnKolParams(new URLSearchParams(paramsKey), KOL_CATEGORIES), [paramsKey]);
  const write = useCallback(
    (next: McnKolQuery) => setParams((prev) => mergeMcnKolParams(prev, next), { replace: true }),
    [setParams],
  );
  const change = (patch: Partial<McnKolQuery>) => write({ ...query, ...patch });
  const clear = () => write({ sort: query.sort });

  const [assign, setAssign] = useState<{ kol: McnKolRow | null } | null>(null);
  const [confirm, setConfirm] = useState<McnKolRow | null>(null);

  const all = q.data?.rows;
  const channels = q.data?.channels ?? [];
  const status = q.data?.status;
  const canAssign = !!status && canManageKolAssignments(status);
  const preparing = status === 'DRAFT' || status === 'NEEDS_FIX';

  // "Gán kênh cho KOL" from the overview (?gan=1): open the dialog once the profile state is known.
  const openAssign = params.get('gan') === '1';
  useEffect(() => {
    if (!openAssign || !status) return;
    if (canAssign) setAssign({ kol: null });
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('gan');
        return next;
      },
      { replace: true },
    );
  }, [openAssign, status, canAssign, setParams]);
  const rows = useMemo(() => applyMcnKolQuery(all ?? [], query), [all, query]);
  const active = hasMcnKolFilters(query);
  const ownCount = channels.filter((c) => !c.assignedKolAccountId).length;
  const ownerName = (id: string) => all?.find((r) => r.kolAccountId === id)?.displayName;

  const unassignAll = async (r: McnKolRow) => {
    try {
      const prev = await mcnKolService.unassignChannels(accountId, r.channels.map((c) => c.id));
      toast.success(`Đã bỏ gán ${prev.length} kênh của ${r.displayName}`, {
        description: 'Các kênh trở thành Kênh riêng MCN.',
        action: {
          label: 'Hoàn tác',
          onClick: () =>
            void mcnKolService
              .assignChannels(accountId, prev.map((p) => p.channelId), r.kolAccountId)
              .catch((e) => toast.error(errText(e))),
        },
      });
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const rowActions = (r: McnKolRow) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`Thao tác: ${r.displayName}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild className="min-h-11 md:min-h-8">
          <Link to={assignedChannelsPath(r.kolId)}>
            <MonitorPlay aria-hidden />
            Xem kênh được gán
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 md:min-h-8" disabled={!canAssign} onSelect={() => setAssign({ kol: r })}>
          <Plus aria-hidden />
          Gán thêm kênh
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" className="min-h-11 md:min-h-8" disabled={!canAssign} onSelect={() => setConfirm(r)}>
          <Building2 aria-hidden />
          Bỏ gán tất cả kênh
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const chips: FilterChip[] = query.category ? [{ key: 'category', label: query.category, remove: () => change({ category: undefined }) }] : [];
  const assignButton = (
    <Button type="button" className="h-11 md:h-9" onClick={() => setAssign({ kol: null })} disabled={!canAssign}>
      <Plus aria-hidden />
      Gán kênh cho KOL
    </Button>
  );

  let body: ReactNode;
  if (q.loading && !all) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải danh sách KOL">
        {[0, 1, 2].map((i) => (
          <McnKolListRowSkeleton key={i} />
        ))}
      </div>
    );
  } else if (q.error && !all) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được danh sách KOL.</span>
          <Button type="button" variant="outline" size="sm" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (all && all.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Chưa gán kênh cho KOL nào</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Chọn một KOL đã được duyệt và giao cho KOL đó một hoặc nhiều kênh của MCN. Kênh chưa gán là Kênh riêng MCN.
        </p>
        {canAssign && assignButton}
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Không có KOL phù hợp</p>
        <p className="text-sm text-muted-foreground">Thử đổi từ khoá hoặc bỏ bớt bộ lọc.</p>
        <Button type="button" variant="outline" className="h-11" onClick={clear}>
          Xoá bộ lọc
        </Button>
      </div>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3" aria-label="Danh sách KOL">
        {rows.map((r) => (
          <li key={r.kolAccountId}>
            <McnKolListRow row={r} actions={rowActions(r)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <ReturnToCampaign />
      {q.data && !canAssign && (
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>{status === 'REJECTED' ? 'Hồ sơ tổ chức không được duyệt' : 'Hồ sơ tổ chức đang xét duyệt'}</AlertTitle>
          <AlertDescription>
            <p>
              {ASSIGN_LOCKED_TEXT}{' '}
              <Link to={profilePath('MCN', 'tong-quan')} className="font-medium text-primary underline-offset-4 hover:underline">
                Xem trạng thái hồ sơ
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}
      {q.data && preparing && all && all.length === 0 && (
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>Khuyến nghị: gán kênh cho KOL</AlertTitle>
          <AlertDescription>
            <p>
              Gán kênh cho ít nhất 1 KOL giúp hồ sơ MCN đầy đủ hơn khi xét duyệt (không bắt buộc để gửi hồ sơ).{' '}
              <Link to={profilePath('MCN', 'tong-quan')} className="font-medium text-primary underline-offset-4 hover:underline">
                Xem điều kiện gửi hồ sơ
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {all && all.length > 0 && (
        <FilterBar
          keyword={query.keyword}
          onKeywordChange={(keyword) => change({ keyword })}
          searchPlaceholder="Tìm theo tên hoặc KOL ID"
          searchLabel="Tìm KOL theo tên hoặc KOL ID"
          renderFilters={(triggerClass) => (
            <FilterSelect<KolCategory>
              label="Lĩnh vực"
              allLabel="Tất cả lĩnh vực"
              value={query.category}
              options={KOL_CATEGORIES.map((c) => ({ key: c, label: c }))}
              onChange={(category) => change({ category })}
              className={triggerClass}
            />
          )}
          filterGridClass="grid-cols-2"
          inlineFilterClass="@4xl:w-44"
          renderSort={(className) => (
            <SortSelect value={query.sort} options={MCN_KOL_SORT_OPTIONS} onChange={(sort) => change({ sort })} className={className} />
          )}
          sortClass="@4xl:w-56"
          filterCount={query.category ? 1 : 0}
          active={active}
          chips={chips}
          onClear={clear}
        />
      )}

      {all && all.length > 0 && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
            <span className="font-medium text-foreground">{rows.length} KOL</span>
            <span className="text-muted-foreground">
              {channels.length - ownCount} kênh đã gán · {ownCount} Kênh riêng MCN
            </span>
          </p>
          <div className="ml-auto">{assignButton}</div>
        </div>
      )}

      {body}

      <AssignChannelsDialog
        open={assign !== null}
        onOpenChange={(o) => !o && setAssign(null)}
        mcnAccountId={accountId}
        channels={channels}
        ownerName={ownerName}
        initialKol={assign?.kol ?? null}
      />
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ gán tất cả kênh của {confirm?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.assignedChannelCount} kênh sẽ trở thành Kênh riêng MCN và KOL không còn trong danh sách này. Bạn có thể gán lại bất cứ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">Đóng</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive', className: 'h-11 md:h-9' })}
              onClick={() => confirm && void unassignAll(confirm)}
            >
              Bỏ gán tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
