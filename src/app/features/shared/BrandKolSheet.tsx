import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { savedListService } from '../../services';
import { KolProfileSheet } from '../biz-search/KolProfileSheet';
import { SaveToListsDialog } from '../biz-search/SaveToListsDialog';

/**
 * KOL detail sheet driven by `?kol=<kolId>` plus the "Lưu vào danh sách" dialog, for Brand pages
 * other than the search (Danh sách kênh, Danh sách vi phạm). Returns helpers and the elements to render.
 */
export function useBrandKolSheet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveTarget, setSaveTarget] = useState<{ kolId: string; name: string } | null>(null);

  useEffect(() => {
    let alive = true;
    savedListService
      .getSavedKolIds()
      .then((ids) => alive && setSavedIds(new Set(ids)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const openKol = useCallback(
    (kolId: string) =>
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        sp.set('kol', kolId);
        return sp;
      }),
    [setSearchParams],
  );
  const closeKol = () =>
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.delete('kol');
      return sp;
    });
  const openSave = useCallback((kolId: string, name?: string) => setSaveTarget({ kolId, name: name ?? kolId }), []);
  const onSaved = (kolId: string, inAnyList: boolean) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (inAnyList) next.add(kolId);
      else next.delete(kolId);
      return next;
    });

  const profileId = searchParams.get('kol');
  const elements = (
    <>
      <KolProfileSheet
        kolId={profileId}
        saved={profileId !== null && savedIds.has(profileId)}
        onOpenChange={(open) => !open && closeKol()}
        onSave={openSave}
      />
      <SaveToListsDialog
        kolId={saveTarget?.kolId ?? null}
        kolName={saveTarget?.name ?? ''}
        onOpenChange={(open) => !open && setSaveTarget(null)}
        onSaved={onSaved}
      />
    </>
  );
  return { openKol, openSave, savedIds, elements };
}
