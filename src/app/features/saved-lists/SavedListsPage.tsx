import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BookMarked, MoreVertical, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
import { ListColumn } from './ListColumn';
import { ListItemsTable } from './ListItemsTable';
import { ListNameDialog } from './ListNameDialog';
import { NoteDialog } from './NoteDialog';

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function EmptyState({ icon, title, text, children }: { icon?: boolean; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BookMarked className="size-6" aria-hidden />
        </div>
      )}
      <p className="font-semibold text-foreground">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

function SearchLink() {
  return (
    <Link to="/tim-kiem-kol" className={buttonVariants({ variant: 'outline', className: 'h-11' })}>
      <Search aria-hidden />
      Tìm kiếm KOL
    </Link>
  );
}

/** SCR-11 — saved lists of the signed-in Brand/Agency account (BR-59..62). */
export function SavedListsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ds = searchParams.get('ds');
  const kolParam = searchParams.get('kol');

  const [lists, setLists] = useState<SavedListSummary[] | null>(null);
  const [listsError, setListsError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SavedListDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTick, setDetailTick] = useState(0);

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

  const selected = lists?.find((l) => l.id === ds) ?? null;

  // Missing / unknown ?ds → first list (replace). An unknown id is a list we cannot see (4403).
  useEffect(() => {
    if (!lists || lists.length === 0 || selected) return;
    if (ds && warnedDs.current !== ds) {
      warnedDs.current = ds;
      toast.error(new KolhubError('KOLHUB-4403').message);
    }
    setParam('ds', lists[0].id, true);
  }, [lists, selected, ds, setParam]);

  const selectedId = selected?.id ?? null;

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    setDetailError(null);
    savedListService
      .getList(selectedId)
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
  }, [selectedId, detailTick, loadLists]);

  const refresh = useCallback(async () => {
    await loadLists();
    setDetailTick((n) => n + 1);
  }, [loadLists]);

  const createList = async (name: string) => {
    const l = await savedListService.createList(name);
    toast.success('Đã tạo danh sách');
    await loadLists();
    setParam('ds', l.id);
  };

  const renameList = async (name: string) => {
    if (!selectedId) return;
    await savedListService.renameList(selectedId, name);
    toast.success('Đã đổi tên');
    await refresh();
  };

  const deleteList = async () => {
    if (!selectedId) return;
    try {
      await savedListService.deleteList(selectedId);
      toast.success('Đã xoá danh sách');
      const l = await loadLists();
      setParam('ds', l && l.length > 0 ? l[0].id : null, true);
    } catch (e) {
      toast.error(messageOf(e));
    }
  };

  const saveNote = async (note: string) => {
    if (!selectedId || !noteRow) return;
    await savedListService.updateNote(selectedId, noteRow.kolId, note);
    toast.success('Đã lưu ghi chú');
    setDetailTick((n) => n + 1);
  };

  const removeKol = async (kolId: string) => {
    if (!selectedId || !detail) return;
    const listId = selectedId;
    const row = detail.rows.find((r) => r.kolId === kolId);
    const name = row?.displayName ?? kolId;
    try {
      const removed = await savedListService.removeFromList(listId, kolId);
      await refresh();
      if (!removed) return;
      toast.success(`Đã bỏ ${name} khỏi danh sách`, {
        action: {
          label: 'Hoàn tác',
          onClick: async () => {
            try {
              // Restores the exact item (note, addedAt, position), even if the badge expired meanwhile (BR-62).
              await savedListService.restoreItem(removed);
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

  const openProfile = (kolId: string) => setParam('kol', kolId);
  const rowName = (kolId: string) => detail?.rows.find((r) => r.kolId === kolId)?.displayName ?? kolId;

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
        initialName={nameDialog === 'rename' ? (selected?.name ?? '') : ''}
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
            <AlertDialogTitle>Xoá danh sách “{selected?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xoá danh sách, không ảnh hưởng tới KOL.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={() => void deleteList()}>
              Xoá
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
      <div className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 md:grid-cols-[280px_1fr] md:p-6" aria-busy="true" aria-label="Đang tải">
        <Card className="gap-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </Card>
        <Card className="gap-3 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Card className="p-0">
          <EmptyState icon title="Bạn chưa có danh sách nào" text="Tạo danh sách để gom các KOL bạn quan tâm cho từng chiến dịch.">
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

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 md:grid-cols-[280px_1fr] md:items-start md:p-6">
      <Card className="hidden gap-0 p-4 md:flex">
        <ListColumn lists={lists} selectedId={selectedId} onSelect={(id) => setParam('ds', id)} onCreate={() => setNameDialog('create')} />
      </Card>

      <div className="flex gap-2 md:hidden">
        <Select value={selectedId ?? undefined} onValueChange={(id) => setParam('ds', id)}>
          <SelectTrigger aria-label="Chọn danh sách" className="h-11 min-w-0 flex-1">
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
        <Button type="button" variant="outline" className="h-11" onClick={() => setNameDialog('create')}>
          <Plus aria-hidden />
          <span className="sr-only sm:not-sr-only">Tạo danh sách</span>
        </Button>
      </div>

      <Card className="min-w-0 gap-4 p-4 md:p-6">
        {selected && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground" title={selected.name}>
                {selected.name}
              </h2>
              <p className="text-sm text-muted-foreground">{selected.count} KOL</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Thao tác với danh sách">
                  <MoreVertical aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setNameDialog('rename')}>
                  <Pencil aria-hidden />
                  Đổi tên
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden />
                  Xoá danh sách
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {detailError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{detailError}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailTick((n) => n + 1)}>
                <RotateCcw aria-hidden />
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : detailLoading && (!detail || detail.id !== selectedId) ? (
          <div className="space-y-3" aria-busy="true" aria-label="Đang tải danh sách">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : detail && detail.rows.length === 0 ? (
          <EmptyState title="Danh sách trống" text="Tìm KOL phù hợp và bấm biểu tượng lưu để thêm vào danh sách này.">
            <SearchLink />
          </EmptyState>
        ) : detail ? (
          <ListItemsTable rows={detail.rows} onView={openProfile} onEditNote={setNoteRow} onRemove={(id) => void removeKol(id)} />
        ) : null}
      </Card>

      {dialogs}
    </div>
  );
}
