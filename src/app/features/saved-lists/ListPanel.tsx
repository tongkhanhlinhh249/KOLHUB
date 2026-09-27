import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from '../../components/ui/utils';
import { normalizeText, type SavedListSummary } from '../../services';

interface ListPanelProps {
  lists: SavedListSummary[];
  selectedId: string | null;
  onSelect(id: string): void;
  onCreate(): void;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'dd/MM');
}

/** Left panel of SCR-11 on wide containers: search, "Tạo danh sách", one nav item per list. */
export function ListPanel({ lists, selectedId, onSelect, onCreate }: ListPanelProps) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const kw = normalizeText(query).trim();
    return kw ? lists.filter((l) => normalizeText(l.name).includes(kw)) : lists;
  }, [lists, query]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Danh sách của bạn</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{lists.length}</span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm danh sách"
          aria-label="Tìm danh sách"
          className="h-10 bg-card pl-9"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-10 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
        onClick={onCreate}
      >
        <Plus aria-hidden />
        Tạo danh sách
      </Button>
      <nav aria-label="Danh sách đã lưu" className="-mx-1 max-h-[calc(100dvh-20rem)] min-h-0 overflow-y-auto px-1">
        {shown.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Không tìm thấy danh sách</p>
        ) : (
          <ul className="space-y-0.5">
            {shown.map((l) => {
              const active = l.id === selectedId;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(l.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-11 w-full flex-col items-start gap-0.5 rounded-lg py-2 pr-3 pl-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    {active && <span className="absolute top-2 bottom-2 left-1 w-1 rounded-full bg-primary" aria-hidden />}
                    <span className={cn('w-full truncate text-sm', active && 'font-semibold')} title={l.name}>
                      {l.name}
                    </span>
                    <span className={cn('text-xs tabular-nums', active ? 'text-primary/80' : 'text-muted-foreground')}>
                      {l.count} KOL · Cập nhật {shortDate(l.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}
