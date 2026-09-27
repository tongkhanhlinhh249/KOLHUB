import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Info, MonitorPlay, MoreHorizontal, RotateCcw, SearchX, UserMinus, UserPlus, Users, XCircle } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../auth/AuthContext';
import { KOL_CATEGORIES, mcnKolService, profileService, type KolCategory, type McnKolRow, type McnKolTab } from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect } from '../filters/FilterSelect';
import { SortSelect } from '../filters/SortSelect';
import { useLiveQuery } from '../shared/useLiveQuery';
import { InviteKolDialog } from './InviteKolDialog';
import { McnKolListRow, McnKolListRowSkeleton } from './McnKolRow';
import {
  applyMcnKolQuery,
  assignedChannelsPath,
  countMcnKolTabs,
  hasMcnKolFilters,
  mergeMcnKolParams,
  MCN_KOL_SORT_OPTIONS,
  MCN_KOL_TABS,
  parseMcnKolParams,
  type McnKolQuery,
} from './mcnKolQuery';

const EMPTY_TAB: Record<McnKolTab, { title: string; body: string }> = {
  ACTIVE: {
    title: 'Chưa quản lý KOL nào',
    body: 'Mời KOL đã được duyệt bằng KOL ID hoặc email. Khi KOL chấp nhận, bạn có thể gán kênh MCN cho KOL đó.',
  },
  PENDING: { title: 'Không có lời mời đang chờ', body: 'Lời mời bạn gửi sẽ hiện ở đây cho tới khi KOL chấp nhận hoặc từ chối.' },
  CLOSED: { title: 'Chưa có KOL nào kết thúc', body: 'KOL từ chối lời mời, rời MCN hoặc được bạn kết thúc quản lý sẽ hiện ở đây.' },
};

type Confirm = { kind: 'end' | 'cancel'; row: McnKolRow } | null;

/** /ho-so-mcn/kol — KOLs managed by the signed-in MCN: invite, cancel an invite, end management. */
export function McnKolsPage() {
  const { account } = useAuth();
  const accountId = account?.id ?? '';
  const q = useLiveQuery(async () => {
    const [rows, view] = await Promise.all([mcnKolService.listKols(accountId), profileService.getProfile(accountId)]);
    return { rows, approved: view.profile.status === 'APPROVED' };
  }, [accountId]);

  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => parseMcnKolParams(new URLSearchParams(paramsKey), KOL_CATEGORIES), [paramsKey]);
  const write = useCallback(
    (next: McnKolQuery) => setParams((prev) => mergeMcnKolParams(prev, next), { replace: true }),
    [setParams],
  );
  const change = (patch: Partial<McnKolQuery>) => write({ ...query, ...patch });
  const clear = () => write({ tab: query.tab, sort: query.sort });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const all = q.data?.rows;
  const approved = q.data?.approved ?? false;
  const counts = useMemo(() => countMcnKolTabs(all ?? [], query), [all, query]);
  const rows = useMemo(() => applyMcnKolQuery(all ?? [], query), [all, query]);
  const active = hasMcnKolFilters(query);

  const invite = async (target: string) => {
    const row = await mcnKolService.invite(accountId, target);
    toast.success(`Đã gửi lời mời tới ${row.displayName}`, { description: 'KOL sẽ thấy lời mời trong hồ sơ của mình.' });
    write({ tab: 'PENDING', sort: query.sort });
    return row;
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, row } = confirm;
    try {
      if (kind === 'end') {
        await mcnKolService.endLink(accountId, row.linkId);
        toast.success(`Đã kết thúc quản lý ${row.displayName}`, {
          description: row.assignedChannelCount > 0 ? 'Các kênh đã gán cho KOL này trở thành Kênh riêng MCN.' : undefined,
        });
      } else {
        await mcnKolService.cancelInvite(accountId, row.linkId);
        toast.success(`Đã huỷ lời mời ${row.displayName}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const rowActions = (r: McnKolRow) => {
    if (r.status !== 'ACTIVE' && r.status !== 'PENDING') return null;
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`Thao tác: ${r.displayName}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {r.status === 'ACTIVE' ? (
            <>
              <DropdownMenuItem asChild className="min-h-11 md:min-h-8">
                <Link to={assignedChannelsPath(r.kolId)}>
                  <MonitorPlay aria-hidden />
                  Xem kênh được gán
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" className="min-h-11 md:min-h-8" onSelect={() => setConfirm({ kind: 'end', row: r })}>
                <UserMinus aria-hidden />
                Kết thúc quản lý
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem variant="destructive" className="min-h-11 md:min-h-8" onSelect={() => setConfirm({ kind: 'cancel', row: r })}>
              <XCircle aria-hidden />
              Huỷ lời mời
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const chips: FilterChip[] = query.category ? [{ key: 'category', label: query.category, remove: () => change({ category: undefined }) }] : [];

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
  } else if (rows.length === 0 && active) {
    body = (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Không có KOL phù hợp</p>
        <p className="text-sm text-muted-foreground">Thử đổi từ khoá, bỏ bớt bộ lọc hoặc xem trạng thái khác.</p>
        <Button type="button" variant="outline" className="h-11" onClick={clear}>
          Xoá bộ lọc
        </Button>
      </div>
    );
  } else if (rows.length === 0) {
    const e = EMPTY_TAB[query.tab];
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">{e.title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{e.body}</p>
        {query.tab === 'ACTIVE' && approved && (
          <Button type="button" className="h-11 md:h-9" onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden />
            Mời KOL
          </Button>
        )}
      </div>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3" aria-label="Danh sách KOL">
        {rows.map((r) => (
          <li key={r.linkId}>
            <McnKolListRow row={r} actions={rowActions(r)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      {q.data && !approved && (
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>Hồ sơ tổ chức chưa được duyệt</AlertTitle>
          <AlertDescription>
            <p>
              Bạn cần được duyệt hồ sơ trước khi mời KOL.{' '}
              <Link to="/ho-so-mcn/dinh-danh" className="font-medium text-primary underline-offset-4 hover:underline">
                Xem thông tin định danh
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={query.tab} onValueChange={(t) => change({ tab: t as McnKolTab })}>
            <TabsList className="h-auto" aria-label="Lọc theo trạng thái">
              {MCN_KOL_TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="h-11 md:h-8">
                  {t.label} ({all ? counts[t.key] : '–'})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <p className="text-sm font-medium text-foreground" aria-live="polite">
            {all ? `${rows.length} KOL` : ''}
          </p>
          <Button type="button" className="h-11 md:h-9" onClick={() => setInviteOpen(true)} disabled={!approved}>
            <UserPlus aria-hidden />
            Mời KOL
          </Button>
        </div>
      </div>

      {body}

      <InviteKolDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={invite} />
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'end' ? `Kết thúc quản lý ${confirm.row.displayName}?` : `Huỷ lời mời ${confirm?.row.displayName ?? ''}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'end'
                ? confirm.row.assignedChannelCount > 0
                  ? `${confirm.row.assignedChannelCount} kênh đã gán cho KOL này sẽ trở thành Kênh riêng MCN. Bạn có thể mời lại KOL sau.`
                  : 'KOL sẽ không còn thuộc quản lý của MCN. Bạn có thể mời lại KOL sau.'
                : 'KOL sẽ không còn thấy lời mời này. Bạn có thể mời lại sau.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">Đóng</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'destructive', className: 'h-11 md:h-9' })} onClick={() => void runConfirm()}>
              {confirm?.kind === 'end' ? 'Kết thúc quản lý' : 'Huỷ lời mời'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
