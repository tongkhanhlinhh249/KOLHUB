import { describe, expect, test } from 'vitest';
import { focusableStepIndex, orderStepTabs, stepTabKeyTarget } from './stepTabsModel';

describe('StepTabs', () => {
  const items = [
    { key: 'b', label: 'B' },
    { key: 'end', label: 'Đã đóng', kind: 'end' as const },
    { key: 'c', label: 'C' },
    { key: 'start', label: 'Cần xử lý', kind: 'start' as const },
  ];
  test('order: start chip, steps, end toggle', () => {
    expect(orderStepTabs(items).map((i) => i.key)).toEqual(['start', 'b', 'c', 'end']);
  });
  test('arrow keys wrap, Home / End jump, other keys ignored', () => {
    expect(stepTabKeyTarget('ArrowRight', 3, 4)).toBe(0);
    expect(stepTabKeyTarget('ArrowLeft', 0, 4)).toBe(3);
    expect(stepTabKeyTarget('ArrowDown', 1, 4)).toBe(2);
    expect(stepTabKeyTarget('Home', 2, 4)).toBe(0);
    expect(stepTabKeyTarget('End', 0, 4)).toBe(3);
    expect(stepTabKeyTarget('Enter', 0, 4)).toBeNull();
    expect(stepTabKeyTarget('ArrowRight', 0, 0)).toBeNull();
  });
  test('roving tabindex: the selected tab, else the first', () => {
    const ordered = orderStepTabs(items);
    expect(focusableStepIndex(ordered, 'c')).toBe(2);
    expect(focusableStepIndex(ordered, null)).toBe(0);
    expect(focusableStepIndex(ordered, 'zzz' as string)).toBe(0);
  });
});
