import { useEffect, useRef, type KeyboardEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import { focusableStepIndex, orderStepTabs, stepTabKeyTarget, type StepTabItem } from './stepTabsModel';

export type { StepTabItem } from './stepTabsModel';

/**
 * Step progress bar used as status tabs: pipeline steps spread over the full width with ">" between them,
 * an optional highlighted chip before them (kind 'start', e.g. "Cần xử lý") and a small muted toggle after them
 * (kind 'end', e.g. "Đã đóng"). One `role="tablist"`: arrow keys / Home / End move between every item.
 * `value` may match no item (e.g. a cross-stage filter is on): then nothing is selected.
 * On narrow screens the bar scrolls horizontally inside its own box (snap) and keeps the selected item in view.
 */
export function StepTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: StepTabItem<K>[];
  value: K | null | undefined;
  onChange(key: K): void;
  label: string;
  className?: string;
}) {
  const ordered = orderStepTabs(items);
  const focusIndex = focusableStepIndex(ordered, value);
  const scroller = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the selected item visible inside the scroll box (horizontal only — never scrolls the page).
  useEffect(() => {
    const box = scroller.current;
    const el = refs.current[ordered.findIndex((it) => it.key === value)];
    if (!box || !el || box.scrollWidth <= box.clientWidth) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.left < b.left || r.right > b.right) {
      box.scrollLeft += r.left - b.left - (b.width - r.width) / 2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = stepTabKeyTarget(e.key, i, ordered.length);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(ordered[next].key);
  };

  const steps = ordered.filter((it) => (it.kind ?? 'step') === 'step');

  return (
    <div ref={scroller} className={cn('relative -mx-4 min-w-0 snap-x snap-proximity overflow-x-auto px-4 md:mx-0 md:px-0', className)}>
      <div role="tablist" aria-label={label} className="flex min-w-max items-stretch gap-2 border-b border-border">
        {ordered.map((it, i) => {
          const kind = it.kind ?? 'step';
          const active = it.key === value;
          const common = {
            ref: (el: HTMLButtonElement | null) => {
              refs.current[i] = el;
            },
            type: 'button' as const,
            role: 'tab',
            'aria-selected': active,
            tabIndex: i === focusIndex ? 0 : -1,
            onClick: () => onChange(it.key),
            onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onKeyDown(e, i),
          };
          const count = it.count ?? 0;
          if (kind === 'start') {
            return (
              <div key={it.key} className="flex shrink-0 snap-start items-center pr-2 pb-2">
                <button
                  {...common}
                  className={cn(
                    'inline-flex h-11 items-center gap-2 rounded-[8px] border px-3 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9',
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-primary/30 bg-card text-foreground hover:border-primary/60',
                  )}
                >
                  {it.label}
                  <span
                    className={cn(
                      'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs tabular-nums',
                      count > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                </button>
              </div>
            );
          }
          if (kind === 'end') {
            return (
              <div key={it.key} className="flex shrink-0 snap-end items-center pb-2 pl-2">
                <button
                  {...common}
                  className={cn(
                    'inline-flex h-11 items-center gap-1.5 rounded-[8px] px-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9',
                    active ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {it.label}
                  <span className="text-xs tabular-nums">{count}</span>
                </button>
              </div>
            );
          }
          const stepIndex = steps.indexOf(it);
          return (
            <div key={it.key} className="flex min-w-[9.5rem] flex-1 snap-start items-stretch md:min-w-fit">
              <button
                {...common}
                className={cn(
                  'group relative -mb-px flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-3 pb-2 text-sm whitespace-nowrap transition-colors focus-visible:rounded-[6px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  active ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{it.label}</span>
                <span className={cn('tabular-nums', active ? 'font-semibold text-primary' : 'text-muted-foreground group-hover:text-foreground')}>{count}</span>
              </button>
              {stepIndex < steps.length - 1 && (
                <ChevronRight className="mb-2 size-4 shrink-0 self-center text-muted-foreground/60" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
