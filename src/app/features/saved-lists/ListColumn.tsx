import { Plus } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import type { SavedListSummary } from '../../services';

interface ListColumnProps {
  lists: SavedListSummary[];
  selectedId: string | null;
  onSelect(id: string): void;
  onCreate(): void;
}

/** Left column of SCR-11 (md and up). */
export function ListColumn({ lists, selectedId, onSelect, onCreate }: ListColumnProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Danh sách của bạn</h2>
        <Button type="button" variant="outline" size="sm" onClick={onCreate}>
          <Plus aria-hidden />
          Tạo danh sách
        </Button>
      </div>
      <nav aria-label="Danh sách đã lưu">
        <ul className="space-y-1">
          {lists.map((l) => {
            const selected = l.id === selectedId;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onSelect(l.id)}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate" title={l.name}>
                    {l.name}
                  </span>
                  <Badge variant="secondary">{l.count}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
