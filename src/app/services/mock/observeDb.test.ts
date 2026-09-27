import { expect, test, vi } from 'vitest';
import { createDb } from './db';
import { observeDb } from './observeDb';
import { seedState } from './seed';

test('subscribe nhận tín hiệu sau update và reset, huỷ được', () => {
  const live = observeDb(createDb(null, seedState));
  const fn = vi.fn();
  const off = live.subscribe(fn);
  live.update((s) => {
    s.funnel = [];
  });
  live.reset();
  expect(fn).toHaveBeenCalledTimes(2);
  off();
  live.update(() => {});
  expect(fn).toHaveBeenCalledTimes(2);
});
