import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { cn } from '../../components/ui/utils';
import { PLATFORMS, type Platform } from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { triggerActive } from './FilterSelect';

/** Multi-select of platforms folded into one dropdown so a filter bar fits on one line. */
export function PlatformSelect({
  value,
  onChange,
  className,
  label = 'Nền tảng',
  title = 'Nền tảng',
}: {
  value: Platform[];
  onChange(v: Platform[]): void;
  className?: string;
  /** Accessible name of the trigger (selected platforms are appended). */
  label?: string;
  /** Heading inside the dropdown. */
  title?: string;
}) {
  const titleId = useId();
  const toggle = (p: Platform, on: boolean) =>
    onChange(on ? PLATFORMS.map((x) => x.key).filter((k) => k === p || value.includes(k)) : value.filter((k) => k !== p));
  const selected = PLATFORMS.filter((p) => value.includes(p.key));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={selected.length ? `${label}: ${selected.map((p) => p.label).join(', ')}` : label}
          className={cn(
            'h-10 w-full justify-between gap-2 border-border bg-card px-3 font-normal shadow-none hover:bg-card',
            selected.length > 0 && triggerActive,
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected.length === 0 && <span className="truncate">Nền tảng</span>}
            {selected.length === 1 && (
              <>
                <PlatformIcon platform={selected[0].key} />
                <span className="truncate">{selected[0].label}</span>
              </>
            )}
            {selected.length > 1 && (
              <>
                <span className="flex -space-x-1" aria-hidden>
                  {selected.map((p) => (
                    <span key={p.key} className="rounded-full bg-card ring-2 ring-card">
                      <PlatformIcon platform={p.key} />
                    </span>
                  ))}
                </span>
              </>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        <p id={titleId} className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
          {title}
        </p>
        <div role="group" aria-labelledby={titleId} className="space-y-0.5">
          {PLATFORMS.map((p) => {
            const id = `${titleId}-${p.key}`;
            return (
              <label
                key={p.key}
                htmlFor={id}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-muted"
              >
                <Checkbox
                  id={id}
                  checked={value.includes(p.key)}
                  onCheckedChange={(c) => toggle(p.key, c === true)}
                />
                <PlatformIcon platform={p.key} />
                {p.label}
              </label>
            );
          })}
        </div>
        {value.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="mt-1 w-full" onClick={() => onChange([])}>
            Bỏ chọn nền tảng
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
