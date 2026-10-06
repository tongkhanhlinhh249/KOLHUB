import { useEffect, useState, type MouseEvent, type ReactNode, type ThHTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Info, LayoutGrid, MoreVertical, Rows3, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { cn } from '../../components/ui/utils';
import type { AriaSort, ListView } from './tableView';

// Shared pieces of the "Bảng" view (campaign lists of Nhãn hàng and KOL/MCN), so both pages look the same:
// a bordered table with uppercase muted headers, tall rows with dividers, row checkboxes, an expand chevron
// and a kebab menu per row.

/** Live `matchMedia` result (read synchronously on first render so the default view does not flash). */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** "Bảng / Thẻ" switch: two icon buttons (aria-pressed). */
export function ViewToggle({ value, onChange, className }: { value: ListView; onChange(v: ListView): void; className?: string }) {
  const item = (v: ListView, label: string, icon: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={value === v}
      onClick={() => onChange(v)}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-md:size-11',
        value === v && 'bg-card text-primary shadow-sm hover:text-primary',
      )}
    >
      {icon}
    </button>
  );
  return (
    <div role="group" aria-label="Kiểu hiển thị" className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-[8px] border border-border bg-muted p-0.5', className)}>
      {item('table', 'Xem dạng bảng', <Rows3 className="size-4" aria-hidden />)}
      {item('cards', 'Xem dạng thẻ', <LayoutGrid className="size-4" aria-hidden />)}
    </div>
  );
}

/** Soft grey info bar above a list (e.g. "Cần bạn xử lý: …"). */
export function InfoBar({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-[8px] bg-muted px-4 py-2.5 text-sm text-foreground', className)} role="status">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon ?? <Info className="size-4" aria-hidden />}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Bordered table. It scrolls horizontally inside its own box (never the page) when the screen is narrower than
 * `minWidthClass`; the box is focusable so keyboard users can scroll it.
 */
export function DataTable({ label, minWidthClass, children }: { label: string; minWidthClass: string; children: ReactNode }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="relative max-w-full overflow-x-auto rounded-[8px] border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <table className={cn('w-full border-collapse text-sm', minWidthClass)}>{children}</table>
    </div>
  );
}

export const headClass = 'h-11 px-2.5 text-left align-middle text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase';
export const cellClass = 'px-2.5 py-4 align-middle';

export function HeadCell({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={cn(headClass, className)} {...props}>
      {children}
    </th>
  );
}

/** Sortable header: the whole label is a button; `aria-sort` on the th. */
export function SortHeadCell({ label, sort, onSort, className, align = 'left' }: { label: string; sort: AriaSort; onSort(): void; className?: string; align?: 'left' | 'right' }) {
  const Icon = sort === 'ascending' ? ArrowUp : sort === 'descending' ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={sort} className={cn(headClass, align === 'right' && 'text-right', className)}>
      <button
        type="button"
        onClick={onSort}
        className={cn(
          '-mx-1 inline-flex items-center gap-1 rounded-[6px] px-1 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          sort !== 'none' && 'text-foreground',
        )}
      >
        {label}
        <Icon className={cn('size-3.5', sort === 'none' && 'opacity-50')} aria-hidden />
        <span className="sr-only">{sort === 'none' ? '(bấm để sắp xếp)' : sort === 'ascending' ? '(đang tăng dần)' : '(đang giảm dần)'}</span>
      </button>
    </th>
  );
}

/** Row / header checkbox with an accessible label and a 36px hit area. */
export function RowCheckbox({ checked, onChange, label }: { checked: boolean | 'indeterminate'; onChange(): void; label: string }) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative size-4 rounded-[4px] border-muted-foreground/50 after:absolute after:-inset-2.5 after:content-[''] data-[state=checked]:border-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
    />
  );
}

export function ExpandButton({ expanded, onToggle, controls, label }: { expanded: boolean; onToggle(): void; controls: string; label: string }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={label}
      onClick={onToggle}
      className="inline-flex size-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ChevronRight className={cn('size-4 transition-transform', expanded && 'rotate-90')} aria-hidden />
    </button>
  );
}

/** Kebab menu of a row; put DropdownMenuItem children inside. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={label}>
          <MoreVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Bar shown while rows are selected: "Đã chọn N" + actions + "Bỏ chọn". */
export function BulkBar({ count, onClear, children }: { count: number; onClear(): void; children?: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="region" aria-label="Thao tác với mục đã chọn">
      <span className="font-medium text-foreground" aria-live="polite">
        Đã chọn {count}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <Button type="button" variant="ghost" size="sm" className="ml-auto h-11 md:h-8" onClick={onClear}>
        <X aria-hidden />
        Bỏ chọn
      </Button>
    </div>
  );
}

/** Sort menu as a compact icon button (label shown when `className` asks for a wide button, e.g. on phones). */
export function SortMenuButton<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange(v: T): void;
  className?: string;
}) {
  const current = options.find((o) => o.key === value)?.label ?? '';
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 bg-card font-normal', className ? className : 'w-10 px-0')}
          aria-label={`Sắp xếp: ${current}`}
          title={`Sắp xếp: ${current}`}
        >
          <ArrowUpDown className="text-muted-foreground" aria-hidden />
          {className && <span className="truncate">{current}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Sắp xếp theo</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.key} value={o.key}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="checkbox"], [role="menuitem"], [role="menu"], [data-row-ignore]';

/**
 * Click handler for a whole table row that leaves inner controls alone (checkbox, chevron, kebab, links) and
 * ignores text selection. Keyboard users open the row through its title link / button instead.
 */
export function rowClick(onOpen: () => void) {
  return (e: MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE)) return;
    if (window.getSelection()?.toString()) return;
    onOpen();
  };
}

export const rowClass =
  'cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40 data-[selected=true]:bg-primary/5 [&[data-expanded=true]]:border-b-0';
