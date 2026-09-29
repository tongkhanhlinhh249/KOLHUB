import { ArrowRightLeft, ChevronDown, Megaphone, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import type { SavedListSummary } from '../../services';

interface BulkBarProps {
  count: number;
  otherLists: SavedListSummary[];
  onMove(targetId: string): void;
  onRemove(): void;
  onClear(): void;
  /** "Mời vào chiến dịch" for the checked KOLs; hidden when not given. */
  onInvite?(): void;
}

/** Actions on the checked KOLs; replaces the "Hiển thị n/N" line while something is selected. */
export function BulkBar({ count, otherLists, onMove, onRemove, onClear, onInvite }: BulkBarProps) {
  return (
    <div
      role="region"
      aria-label="Thao tác hàng loạt"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2"
    >
      <span className="mr-1 text-sm font-semibold text-primary tabular-nums" aria-live="polite">
        Đã chọn {count}
      </span>
      {onInvite && (
        <Button type="button" variant="outline" size="sm" className="h-11 bg-card md:h-8" onClick={onInvite}>
          <Megaphone aria-hidden />
          Mời vào chiến dịch
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-11 bg-card md:h-8">
            <ArrowRightLeft aria-hidden />
            Chuyển sang danh sách…
            <ChevronDown className="text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Chuyển {count} KOL sang</DropdownMenuLabel>
          {otherLists.length === 0 ? (
            <DropdownMenuItem disabled>Chưa có danh sách khác</DropdownMenuItem>
          ) : (
            otherLists.map((l) => (
              <DropdownMenuItem key={l.id} onSelect={() => onMove(l.id)}>
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{l.count}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-11 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive md:h-8"
        onClick={onRemove}
      >
        <Trash2 aria-hidden />
        Bỏ khỏi danh sách
      </Button>
      <Button type="button" variant="ghost" size="sm" className="ml-auto h-11 md:h-8" onClick={onClear}>
        <X aria-hidden />
        Bỏ chọn
      </Button>
    </div>
  );
}
