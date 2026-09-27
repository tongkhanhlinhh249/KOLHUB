import { X } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export interface FilterChip {
  key: string;
  label: string;
  remove(): void;
}

/** Removable chips for every active filter, so state stays visible after the dropdowns close. */
export function ActiveFilterChips({ chips, onClear }: { chips: FilterChip[]; onClear(): void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Bộ lọc đang áp dụng">
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="h-8 gap-1 rounded-full py-0 pr-1 pl-3 text-xs font-medium">
          {c.label}
          <button
            type="button"
            onClick={c.remove}
            aria-label={`Bỏ lọc ${c.label}`}
            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </Badge>
      ))}
      <Button type="button" variant="link" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
        Xoá tất cả
      </Button>
    </div>
  );
}
