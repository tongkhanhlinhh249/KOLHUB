// Pure helpers of StepTabs (no React here, unit-tested).

export type StepTabKind = 'start' | 'step' | 'end';

export interface StepTabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
  /** 'start' = highlighted chip before the steps, 'end' = small muted toggle after them, 'step' = pipeline step. */
  kind?: StepTabKind;
}

/** Items in visual / keyboard order: start chips, steps, end toggles (order inside each group kept). */
export function orderStepTabs<K extends string>(items: StepTabItem<K>[]): StepTabItem<K>[] {
  const rank: Record<StepTabKind, number> = { start: 0, step: 1, end: 2 };
  return items.map((it, i) => ({ it, i })).sort((a, b) => rank[a.it.kind ?? 'step'] - rank[b.it.kind ?? 'step'] || a.i - b.i).map((x) => x.it);
}

/** Index to focus after a key press in the tablist (wraps around; Home / End); null for other keys. */
export function stepTabKeyTarget(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (index + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** The tab that takes keyboard focus (roving tabindex): the selected one, else the first. */
export function focusableStepIndex<K extends string>(ordered: StepTabItem<K>[], value: K | null | undefined): number {
  const i = ordered.findIndex((it) => it.key === value);
  return i >= 0 ? i : 0;
}
