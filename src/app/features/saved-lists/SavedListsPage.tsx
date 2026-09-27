import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BookMarked, FilterX, Plus, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
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
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import {
  KolhubError,
  savedListService,
  type SavedListDetail,
  type SavedListRow,
  type SavedListSummary,
} from '../../services';
import { KolProfileSheet } from '../biz-search/KolProfileSheet';
import { SaveToListsDialog } from '../biz-search/SaveToListsDialog';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect } from '../filters/FilterSelect';
import { SortSelect } from '../filters/SortSelect';
import { BulkBar } from './BulkBar';
import { ListHeader } from './ListHeader';
import { ListItemsSkeleton, ListItemsTable } from './ListItemsTable';
import { ListNameDialog } from './ListNameDialog';
import { ListPanel } from './ListPanel';
import {
  applyListView,
  BADGE_FILTERS,
  clearFilters,
  fieldOptions,
  hasActiveView,
  LIST_SORTS,
  parseListView,
  summarizeRows,
  writeListView,
  type BadgeFilter,
  type ListView,
} from './listView';
import { NoteDialog } from './NoteDialog';

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function EmptyState({ icon, title, text, children }: { icon?: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      {icon && <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
      <p className="font-semibold text-foreground">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

function SearchLink({ label = 'Tìm KOL', primary = false }: { label?: string; primary?: boolean }) {
  return (
    <Link to="/tim-kiem-kol" className={buttonVariants({ variant: primary ? 'default' : 'outline', className: 'h-11' })}>
      <Search aria-hidden />
      {label}
    </Link>
  );
}

/*
 * Two columns (list panel + detail) only when the page container is ≥ 71.5rem (1144px), i.e. when
 * the detail column keeps ≥ 50rem (800px) for the table — at 1440px beside the expanded app sidebar
 * the detail column is ~820px. Narrower: a list Select row above the detail instead.
 */
const TWO_COL = '@min-[71.5rem]:grid-cols-[272px_minmax(0,1fr)] @min-[71.5rem]:gap-6';

/** SCR-11 — saved lists of the signed-in Brand/Agency account (BR-59..62). */
export function SavedListsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ds = searchParams.get('ds');
  const kolParam = searchParams.get('kol');
  const viewKey = searchParams.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- parse only when the query string changes
  const view = useMemo(() => parseListView(searchParams), [viewKey]);

  const [lists, setLists] = useState<SavedListSummary[] | null>(null);
  const [listsError, setListsError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SavedListDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTick, setDetailTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [nameDialog, setNameDialog] = useState<'create' | 'rename' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteRow, setNoteRow] = useState<SavedListRow | null>(null);
  const [saveTarget, setSaveTarget] = useState<{ kolId: string; name: string } | null>(null);
  const warnedDs = useRef<string | null>(null);

  const setParam = useCallback(
    (key: string, value: string | null, replace = false) =>
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (value === null) sp.delete(key);
          else sp.set(key, value);
          return sp;
        },
        { replace },
      ),
    [setSearchParams],
  );

  const setView = useCallback(
    (patch: Partial<ListView>) => setSearchParams((prev) => writeListView(prev, patch), { replace: true }),
    [setSearchParams],
  );

  /** Switching list drops the filters of the previous one (its fields may not exist here); sort stays. */
  const selectList = useCallback(
    (id: string | null, replace = false) =>
      setSearchParams(
        (prev) => {
          const sp = clearFilters(prev);
          if (id === null) sp.delete('ds');
          else sp.set('ds', id);
          return sp;
        },
        { replace },
      ),
    [setSearchParams],
  );

  const loadLists = useCallback(async () => {
    try {
      setListsError(null);
      const l = await savedListService.listLists();
      setLists(l);
      return l;
    } catch (e) {
      setListsError(messageOf(e));
      return null;
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const current = lists?.find((l) => l.id === ds) ?? null;

  // Missing / unknown ?ds → first list (replace). An unknown id is a list we cannot see (4403).
  useEffect(() => {
    if (!lists || lists.length === 0 || current) return;
    if (ds && warnedDs.current !== ds) {
      warnedDs.current = ds;
      toast.error(new KolhubError('KOLHUB-4403').message);
    }
    setParam('ds', lists[0].id, true);
  }, [lists, current, ds, setParam]);

  const currentId = current?.id ?? null;

  useEffect(() => {
    setSelected(new Set());
  }, [currentId]);

  useEffect(() => {
    if (!currentId) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    setDetailError(null);
    savedListService
      .getList(currentId)
      .then((d) => alive && setDetail(d))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof KolhubError && e.code === 'KOLHUB-4403') {
          toast.error(e.message);
          void loadLists();
        } else setDetailError(messageOf(e));
      })
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [currentId, detailTick, loadLists]);

  const refresh = useCallback(async () => {
    await loadLists();
    setDetailTick((n) => n + 1);
  }, [loadLists]);

  const rows = useMemo(() => (detail && detail.id === currentId ? detail.rows : null), [detail, currentId]);
  const visible = useMemo(() => (rows ? applyListView(rows, view) : []), [rows, view]);
  const summary = useMemo(() => (rows ? summarizeRows(rows) : null), [rows]);
  const fields = useMemo(() => (rows ? fieldOptions(rows) : []), [rows]);
  const otherLists = useMemo(() => (lists ?? []).filter((l) => l.id !== currentId), [lists, currentId]);

  // Selection only ever covers rows on screen (filters, removals and moves shrink it).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const onScreen = new Set(visible.map((r) => r.kolId));
      const next = new Set([...prev].filter((id) => onScreen.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visible]);

  const toggle = (kolId: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(kolId);
      else next.delete(kolId);
      return next;
    });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(visible.map((r) => r.kolId)) : new Set());

  const rowName = (kolId: string) => rows?.find((r) => r.kolId === kolId)?.displayName ?? kolId;
  const who = (ids: string[]) => (ids.length === 1 ? rowName(ids[0]) : `${ids.length} KOL`);

  const createList = async (name: string) => {
    const l = await savedListService.createList(name);
    toast.success('Đã tạo danh sách');
    await loadLists();
    selectList(l.id);
  };

  const renameList = async (name: string) => {
    if (!currentId) return;
    await savedListService.renameList(currentId, name);
    toast.success('Đã đổi tên');
    await refresh();
  };

  const deleteList = async () => {
    if (!currentId) return;
    try {
      await savedListService.deleteList(currentId);
      toast.success('Đã xoá danh sách');
      const l = await loadLists();
      selectList(l && l.length > 0 ? l[0].id : null, true);
    } catch (e) {
      toast.error(messageOf(e));
    }
  };

  const saveNote = async (note: string) => {
    if (!currentId || !noteRow) return;
    await savedListService.updateNote(currentId, noteRow.kolId, note);
    toast.success('Đã lưu ghi chú');
    setDetailTick((n) => n + 1);
  };

  const removeKols = async (kolIds: string[]) => {
    if (!currentId || kolIds.length === 0) return;
    const label = who(kolIds);
    try {
      const removed = await savedListService.removeItems(currentId, kolIds);
      await refresh();
      if (removed.length === 0) return;
      toast.success(`Đã bỏ ${label} khỏi danh sách`, {
        action: {
          label: 'Hoàn tác',
          onClick: async () => {
            try {
              // Restores the exact items (note, addedAt, position), even if a badge expired meanwhile (BR-62).
              await savedListService.restoreItems(removed);
              await refresh();
            } catch (e) {
              toast.error(messageOf(e));
            }
          },
        },
      });
    } catch (e) {
      toast.error(messageOf(e));
    }
  };

  const moveKols = async (kolIds: string[], targetId: string) => {
    if (!currentId || kolIds.length === 0) return;
    const target = lists?.find((l) => l.id === targetId);
    const label = who(kolIds);
    try {
      const { moved, alreadyInTarget } = await savedListService.moveItems(currentId, targetId, kolIds);
      await refresh();
      const already = alreadyInTarget > 0 && moved > 0 ? ` (${alreadyInTarget} KOL đã có sẵn ở đó)` : '';
      toast.success(
        moved === 0 && alreadyInTarget > 0
          ? `${label} đã có trong “${target?.name ?? ''}”, đã bỏ khỏi danh sách này`
          : `Đã chuyển ${label} sang “${target?.name ?? ''}”${already}`,
        { action: { label: 'Mở danh sách', onClick: () => selectList(targetId) } },
      );
    } catch (e) {
      toast.error(messageOf(e));
    }
  };

  const openProfile = (kolId: string) => setParam('kol', kolId);

  if (listsError && !lists) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{listsError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadLists()}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const dialogs = (
    <>
      <ListNameDialog
        open={nameDialog !== null}
        mode={nameDialog ?? 'create'}
        initialName={nameDialog === 'rename' ? (current?.name ?? '') : ''}
        onSubmit={nameDialog === 'rename' ? renameList : createList}
        onOpenChange={(o) => !o && setNameDialog(null)}
      />
      <NoteDialog
        open={noteRow !== null}
        kolName={noteRow?.displayName ?? ''}
        initialNote={noteRow?.note ?? ''}
        onSubmit={saveNote}
        onOpenChange={(o) => !o && setNoteRow(null)}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá danh sách “{current?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xoá danh sách và ghi chú trong đó, không ảnh hưởng tới KOL hay các danh sách khác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => void deleteList()}>
              Xoá danh sách
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <KolProfileSheet
        kolId={kolParam}
        saved
        onOpenChange={(o) => !o && setParam('kol', null)}
        onSave={(kolId, name) => setSaveTarget({ kolId, name: name ?? rowName(kolId) })}
      />
      <SaveToListsDialog
        kolId={saveTarget?.kolId ?? null}
        kolName={saveTarget?.name ?? ''}
        onOpenChange={(o) => !o && setSaveTarget(null)}
        onSaved={() => void refresh()}
      />
    </>
  );

  if (lists === null) {
    return (
      <div className="@container">
        <div className={`mx-auto grid w-full max-w-[1600px] gap-4 p-4 md:p-6 ${TWO_COL}`} aria-busy="true" aria-label="Đang tải">
          <Card className="hidden gap-3 p-4 @min-[71.5rem]:flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </Card>
          <div className="min-w-0 space-y-4">
            <Card className="gap-3 p-5">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </Card>
            <Skeleton className="h-10 w-full" />
            <div className="@container">
              <ListItemsSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Card className="p-0">
          <EmptyState
            icon={<BookMarked className="size-6" aria-hidden />}
            title="Bạn chưa có danh sách nào"
            text="Tạo danh sách để gom các KOL bạn quan tâm cho từng chiến dịch."
          >
            <Button type="button" className="h-11" onClick={() => setNameDialog('create')}>
              <Plus aria-hidden />
              Tạo danh sách
            </Button>
            <SearchLink />
          </EmptyState>
        </Card>
        {dialogs}
      </div>
    );
  }

  const filtered = hasActiveView(view);
  const clearAll = () => setSearchParams((prev) => clearFilters(prev), { replace: true });
  const statusLabel = BADGE_FILTERS.find((f) => f.key === view.status)?.label;
  const chips = [
    ...(view.q.trim() ? [{ key: 'q', label: `“${view.q.trim()}”`, remove: () => setView({ q: '' }) }] : []),
    ...(statusLabel ? [{ key: 'status', label: `Dấu: ${statusLabel}`, remove: () => setView({ status: 'tat-ca' }) }] : []),
    ...(view.field ? [{ key: 'field', label: view.field, remove: () => setView({ field: '' }) }] : []),
  ];
  const selectedIds = [...selected];
  const loadingRows = !detailError && rows === null;

  let body: ReactNode;
  if (detailError) {
    body = (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{detailError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setDetailTick((n) => n + 1)}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (rows === null) {
    body = <ListItemsSkeleton />;
  } else if (rows.length === 0) {
    body = (
      <Card className="p-0">
        <EmptyState
          icon={<BookMarked className="size-6" aria-hidden />}
          title="Danh sách chưa có KOL nào"
          text="Tìm KOL phù hợp rồi bấm biểu tượng lưu để thêm vào danh sách này."
        >
          <SearchLink primary />
        </EmptyState>
      </Card>
    );
  } else {
    body = (
      <>
        <div className="flex min-h-11 flex-wrap items-center gap-2">
          {selected.size > 0 ? (
            <div className="min-w-0 flex-1">
              <BulkBar
                count={selected.size}
                otherLists={otherLists}
                onMove={(target) => void moveKols(selectedIds, target)}
                onRemove={() => void removeKols(selectedIds)}
                onClear={() => setSelected(new Set())}
              />
            </div>
          ) : (
            <>
              {visible.length > 0 && (
                <label className="-ml-1 inline-flex min-h-11 cursor-pointer items-center gap-2 px-1 text-sm text-foreground @min-[50rem]:hidden">
                  <Checkbox checked={false} onCheckedChange={(c) => toggleAll(c === true)} aria-label="Chọn tất cả KOL đang hiển thị" />
                  Chọn tất cả
                </label>
              )}
              <p className="ml-auto text-sm text-muted-foreground tabular-nums @min-[50rem]:ml-0" aria-live="polite">
                Hiển thị {visible.length}/{rows.length} KOL
              </p>
            </>
          )}
        </div>
        {visible.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={<FilterX className="size-6" aria-hidden />}
              title="Không có KOL phù hợp"
              text="Thử từ khoá khác hoặc bỏ bớt bộ lọc."
            >
              <Button type="button" variant="outline" className="h-11" onClick={clearAll}>
                Xoá bộ lọc
              </Button>
            </EmptyState>
          </Card>
        ) : (
          <ListItemsTable
            rows={visible}
            otherLists={otherLists}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onView={openProfile}
            onEditNote={setNoteRow}
            onRemove={(ids) => void removeKols(ids)}
            onMove={(ids, target) => void moveKols(ids, target)}
          />
        )}
      </>
    );
  }

  return (
    <div className="@container">
      <div className={`mx-auto grid w-full max-w-[1600px] gap-4 p-4 md:p-6 @min-[71.5rem]:items-start ${TWO_COL}`}>
        <aside className="sticky top-6 hidden @min-[71.5rem]:block">
          <Card className="gap-0 p-4">
            <ListPanel lists={lists} selectedId={currentId} onSelect={(id) => selectList(id)} onCreate={() => setNameDialog('create')} />
          </Card>
        </aside>

        <div className="flex w-full gap-2 md:max-w-xl @min-[71.5rem]:hidden">
          <Select value={currentId ?? undefined} onValueChange={(id) => selectList(id)}>
            <SelectTrigger aria-label="Chọn danh sách" className="h-11 min-w-0 flex-1 bg-card">
              <SelectValue placeholder="Chọn danh sách" />
            </SelectTrigger>
            <SelectContent>
              {lists.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} ({l.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => setNameDialog('create')}
          >
            <Plus aria-hidden />
            <span className="sr-only sm:not-sr-only">Tạo danh sách</span>
          </Button>
        </div>

        <section className="@container min-w-0 space-y-4" aria-label={current?.name ?? 'Danh sách'}>
          {current && (
            <ListHeader
              name={current.name}
              count={current.count}
              updatedAt={current.updatedAt}
              summary={loadingRows ? null : summary}
              onRename={() => setNameDialog('rename')}
              onDelete={() => setConfirmDelete(true)}
            />
          )}

          {rows && rows.length > 0 && (
            <FilterBar
              keyword={view.q || undefined}
              onKeywordChange={(q) => setView({ q: q ?? '' })}
              searchPlaceholder="Tìm KOL trong danh sách (tên, KOL ID)"
              searchLabel="Tìm KOL trong danh sách"
              renderFilters={(cls) => (
                <>
                  <FilterSelect<Exclude<BadgeFilter, 'tat-ca'>>
                    label="Trạng thái dấu"
                    allLabel="Tất cả"
                    value={view.status === 'tat-ca' ? undefined : view.status}
                    options={BADGE_FILTERS}
                    onChange={(v) => setView({ status: v ?? 'tat-ca' })}
                    className={cls}
                  />
                  <FilterSelect<string>
                    label="Lĩnh vực"
                    allLabel="Tất cả lĩnh vực"
                    value={view.field || undefined}
                    options={fields.map((f) => ({ key: f, label: f }))}
                    onChange={(v) => setView({ field: v ?? '' })}
                    className={cls}
                  />
                </>
              )}
              filterGridClass="grid-cols-2"
              inlineFilterClass="@4xl:w-40"
              renderSort={(cls) => (
                <SortSelect value={view.sort} options={LIST_SORTS} onChange={(v) => setView({ sort: v })} className={cls} />
              )}
              sortClass="w-56 @4xl:w-60"
              filterCount={(view.status !== 'tat-ca' ? 1 : 0) + (view.field ? 1 : 0)}
              active={filtered}
              chips={chips}
              onClear={clearAll}
            />
          )}

          {detailLoading && rows !== null ? <div className="sr-only" aria-live="polite">Đang cập nhật</div> : null}
          {body}
        </section>

        {dialogs}
      </div>
    </div>
  );
}
