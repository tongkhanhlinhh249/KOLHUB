import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Lock, RotateCcw, SearchX } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import {
  KolhubError,
  savedListService,
  searchService,
  type KolSearchQuery,
  type KolSearchResult,
} from '../../services';
import { ViewToggle } from '../filters/ViewToggle';
import { KolCard, KolCardSkeleton } from './KolCard';
import { KolListRow, KolListRowSkeleton } from './KolListRow';
import { KolProfileSheet } from './KolProfileSheet';
import { SaveToListsDialog } from './SaveToListsDialog';
import { createLatestOnly } from './latestOnly';
import { SearchFilters } from './SearchFilters';
import { SearchPagination } from './SearchPagination';
import {
  applyQueryPatch,
  hasActiveFilters,
  parseSearchParams,
  toSearchParams,
  toServiceQuery,
  type SearchPageQuery,
  type SearchView,
} from './searchParams';

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

/** SCR-09 — KOL search for Brand/Agency accounts. */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageQuery = parseSearchParams(searchParams);
  const view: SearchView = pageQuery.view ?? 'grid';
  // The service query leaves out `view`, so switching layout does not refetch.
  const queryKey = toSearchParams(toServiceQuery(pageQuery)).toString();
  const query = useMemo(() => toServiceQuery(parseSearchParams(new URLSearchParams(queryKey))), [queryKey]);

  const [result, setResult] = useState<KolSearchResult | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const latest = useRef(createLatestOnly()).current;

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

  useEffect(() => {
    setLoading(true);
    latest(searchService.search(query))
      .then((r) => {
        if (r.stale) return;
        setResult(r.value);
        setResultKey(queryKey);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, [query, queryKey, reload, latest]);

  /** Write a new query to the URL, keeping the open profile (?kol=) and the current view. */
  const writeQuery = useCallback(
    (next: SearchPageQuery, replace = false) => {
      setSearchParams(
        (prev) => {
          const sp = toSearchParams({ view: parseSearchParams(prev).view, ...next });
          const kol = prev.get('kol');
          if (kol) sp.set('kol', kol);
          return sp;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const onChange = useCallback((patch: Partial<KolSearchQuery>) => writeQuery(applyQueryPatch(query, patch)), [query, writeQuery]);
  const onClear = useCallback(() => writeQuery({ sort: query.sort, page: 1 }), [query.sort, writeQuery]);
  const onView = (next: SearchView) => {
    if (next !== view) writeQuery(applyQueryPatch({ ...query, view }, { view: next }), true);
  };

  // The service clamps ?trang=9 / ?trang=abc to a valid page: mirror that in the URL.
  useEffect(() => {
    if (result && resultKey === queryKey && result.page !== (query.page ?? 1)) {
      writeQuery({ ...query, page: result.page }, true);
    }
  }, [result, resultKey, queryKey, query, writeQuery]);

  const onPage = (page: number) => {
    writeQuery(applyQueryPatch(query, { page }));
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProfile = (kolId: string) =>
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.set('kol', kolId);
      return sp;
    });
  const profileId = searchParams.get('kol');
  const closeProfile = () =>
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.delete('kol');
      return sp;
    });
  const [saveTarget, setSaveTarget] = useState<{ kolId: string; name: string } | null>(null);
  const openSave = (kolId: string, name?: string) =>
    setSaveTarget({ kolId, name: name ?? result?.items.find((k) => k.kolId === kolId)?.displayName ?? kolId });
  const onSaved = (kolId: string, inAnyList: boolean) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (inAnyList) next.add(kolId);
      else next.delete(kolId);
      return next;
    });

  const active = hasActiveFilters(query);

  if (error instanceof KolhubError && error.code === 'KOLHUB-4016') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button asChild className="h-11">
          <Link to="/dang-ky?loai=biz">Đăng ký tài khoản Nhãn hàng</Link>
        </Button>
      </div>
    );
  }

  const from = result && result.total > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = result ? Math.min(result.total, result.page * result.pageSize) : 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
      <SearchFilters query={query} onChange={onChange} onClear={onClear} />

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
          {result && (
            <>
              <p className="font-medium text-foreground">{result.total} KOL đã xác thực</p>
              {result.total > 0 && (
                <p className="text-muted-foreground">
                  Hiển thị {from}–{to}
                </p>
              )}
            </>
          )}
        </div>
        <ViewToggle value={view} onChange={onView} className="ml-auto" />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{errorText(error)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setReload((n) => n + 1)}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading ? (
        view === 'list' ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải">
            {Array.from({ length: 5 }, (_, i) => (
              <KolListRowSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Đang tải">
            {Array.from({ length: 8 }, (_, i) => (
              <KolCardSkeleton key={i} />
            ))}
          </div>
        )
      ) : result && result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-6" aria-hidden />
          </div>
          <p className="font-semibold text-foreground">Không tìm thấy KOL phù hợp</p>
          <p className="text-sm text-muted-foreground">Thử bỏ bớt bộ lọc hoặc đổi từ khoá.</p>
          {active && (
            <Button type="button" variant="outline" className="h-11" onClick={onClear}>
              Xoá bộ lọc
            </Button>
          )}
        </div>
      ) : result ? (
        <>
          {view === 'list' ? (
            <ul className="flex flex-col gap-3" aria-label="Kết quả tìm kiếm KOL">
              {result.items.map((k) => (
                <li key={k.kolId}>
                  <KolListRow
                    kol={k}
                    saved={savedIds.has(k.kolId)}
                    onView={() => openProfile(k.kolId)}
                    onSave={() => openSave(k.kolId, k.displayName)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {result.items.map((k) => (
                <KolCard
                  key={k.kolId}
                  kol={k}
                  saved={savedIds.has(k.kolId)}
                  onView={() => openProfile(k.kolId)}
                  onSave={() => openSave(k.kolId, k.displayName)}
                />
              ))}
            </div>
          )}
          <SearchPagination page={result.page} pageCount={result.pageCount} onPage={onPage} />
        </>
      ) : null}

      <KolProfileSheet
        kolId={profileId}
        saved={profileId !== null && savedIds.has(profileId)}
        onOpenChange={(open) => !open && closeProfile()}
        onSave={openSave}
      />
      <SaveToListsDialog
        kolId={saveTarget?.kolId ?? null}
        kolName={saveTarget?.name ?? ''}
        onOpenChange={(open) => !open && setSaveTarget(null)}
        onSaved={onSaved}
      />
    </div>
  );
}
