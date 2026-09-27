import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Loader2, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { LIST_NAME_MAX, normalizeListName, savedListService, type ListMembership } from '../../services';

interface SaveToListsDialogProps {
  kolId: string | null;
  kolName: string;
  onOpenChange(open: boolean): void;
  onSaved(kolId: string, inAnyList: boolean): void;
}

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

/** SCR-12 — pick the lists a KOL belongs to; create a new list inline (BR-60, BR-61). */
export function SaveToListsDialog({ kolId, kolName, onOpenChange, onSaved }: SaveToListsDialogProps) {
  const [lists, setLists] = useState<ListMembership[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  useEffect(() => {
    if (!kolId) return;
    let alive = true;
    setLists(null);
    setLoadError(null);
    setSaveError(null);
    setCreateError(null);
    setNewName('');
    savedListService
      .getMembership(kolId)
      .then((m) => {
        if (!alive) return;
        setLists(m);
        setChecked(new Set(m.filter((x) => x.checked).map((x) => x.listId)));
        if (m.length === 0) window.setTimeout(() => inputRef.current?.focus(), 0);
      })
      .catch((e) => alive && setLoadError(messageOf(e)));
    return () => {
      alive = false;
    };
  }, [kolId, attempt]);

  const toggle = (id: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const create = async (e?: FormEvent) => {
    e?.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const l = await savedListService.createList(newName);
      setLists((prev) => [{ listId: l.id, name: l.name, count: l.count, checked: true }, ...(prev ?? [])]);
      toggle(l.id, true);
      setNewName('');
    } catch (err) {
      setCreateError(messageOf(err));
      inputRef.current?.focus();
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    if (!kolId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ids = [...checked];
      await savedListService.setMembership(kolId, ids);
      toast.success(ids.length > 0 ? `Đã lưu ${kolName} vào ${ids.length} danh sách` : `Đã bỏ ${kolName} khỏi mọi danh sách`);
      onSaved(kolId, ids.length > 0);
      onOpenChange(false);
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  };

  const nameLength = [...normalizeListName(newName)].length;

  return (
    <Dialog open={kolId !== null} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu {kolName} vào danh sách</DialogTitle>
          <DialogDescription>Một KOL có thể nằm trong nhiều danh sách.</DialogDescription>
        </DialogHeader>

        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription className="space-y-3">
              <p>{loadError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                <RotateCcw aria-hidden />
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : lists === null ? (
          <div className="space-y-3" aria-busy="true" aria-label="Đang tải danh sách">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bạn chưa có danh sách nào. Tạo danh sách đầu tiên bên dưới.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1" aria-label="Danh sách của bạn">
            {lists.map((l) => {
              const id = `${inputId}-list-${l.listId}`;
              return (
                <li key={l.listId}>
                  <Label
                    htmlFor={id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 font-normal hover:bg-muted"
                  >
                    {/* The label wraps the checkbox, so name it explicitly from the list name. */}
                    <Checkbox
                      id={id}
                      checked={checked.has(l.listId)}
                      onCheckedChange={(v) => toggle(l.listId, v === true)}
                      aria-labelledby={`${id}-name`}
                      aria-describedby={`${id}-count`}
                    />
                    <span className="min-w-0 flex-1">
                      <span id={`${id}-name`} className="block truncate text-sm text-foreground" title={l.name}>
                        {l.name}
                      </span>
                      <span id={`${id}-count`} className="block text-xs text-muted-foreground">
                        {l.count} KOL
                      </span>
                    </span>
                  </Label>
                </li>
              );
            })}
          </ul>
        )}

        {!loadError && (
          <form onSubmit={create} className="space-y-1.5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor={inputId}>Tạo danh sách mới</Label>
              <span className={cn('text-xs', nameLength > LIST_NAME_MAX ? 'text-destructive' : 'text-muted-foreground')}>
                {nameLength}/{LIST_NAME_MAX}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id={inputId}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setCreateError(null);
                }}
                placeholder="Ví dụ: Chiến dịch Tết 2027"
                aria-invalid={createError ? true : undefined}
                aria-describedby={createError ? errorId : undefined}
                className={cn('h-10', createError && 'border-destructive')}
                disabled={lists === null}
              />
              <Button type="submit" variant="outline" className="h-10" disabled={creating || lists === null}>
                {creating ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
                Tạo
              </Button>
            </div>
            {createError && (
              <p id={errorId} className="text-xs text-destructive">
                {createError}
              </p>
            )}
          </form>
        )}

        {saveError && (
          <p role="alert" className="text-sm text-destructive">
            {saveError}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button type="button" className="h-11" onClick={save} disabled={saving || lists === null || !!loadError}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
