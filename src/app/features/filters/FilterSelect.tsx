import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';

export const ALL = '__all';

/** Shared look for every filter trigger; active filters get a primary tint so state is visible at a glance. */
export const triggerBase = 'h-10 w-full gap-2 bg-card text-sm font-normal data-[placeholder]:text-foreground';
export const triggerActive = 'border-primary/60 bg-primary/5 text-primary';

export interface FilterOption<T extends string> {
  key: T;
  label: string;
}

/**
 * Unset → the trigger shows the filter name ("Lĩnh vực") as placeholder;
 * set → it shows the chosen value. "Tất cả …" in the list clears the filter.
 */
export function FilterSelect<T extends string>({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  value: T | undefined;
  options: FilterOption<T>[];
  onChange(v: T | undefined): void;
  className?: string;
}) {
  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))}>
      <SelectTrigger aria-label={label} className={cn(triggerBase, value && triggerActive, className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
