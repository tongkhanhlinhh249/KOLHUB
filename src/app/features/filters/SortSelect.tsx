import { ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import { triggerBase, type FilterOption } from './FilterSelect';

export function SortSelect<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: FilterOption<T>[];
  onChange(v: T): void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-label="Sắp xếp" className={cn(triggerBase, className)}>
        {/* div, not span: SelectTrigger line-clamps direct span children */}
        <div className="flex min-w-0 items-center gap-2">
          <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            <SelectValue />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
