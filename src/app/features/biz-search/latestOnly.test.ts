import { expect, test } from 'vitest';
import { createLatestOnly } from './latestOnly';

test('phản hồi cũ về sau bị đánh dấu stale', async () => {
  const latest = createLatestOnly();
  let r1!: (v: string) => void;
  const p1 = latest(new Promise<string>((r) => (r1 = r)));
  const p2 = latest(Promise.resolve('mới'));
  expect(await p2).toEqual({ stale: false, value: 'mới' });
  r1('cũ');
  expect(await p1).toEqual({ stale: true });
});

test('lỗi của lần gọi cũ cũng bị nuốt thành stale; lỗi của lần mới được ném ra', async () => {
  const latest = createLatestOnly();
  let rej1!: (e: Error) => void;
  const p1 = latest(new Promise<string>((_, rej) => (rej1 = rej)));
  const p2 = latest(Promise.reject(new Error('mới hỏng')));
  await expect(p2).rejects.toThrow('mới hỏng');
  rej1(new Error('cũ hỏng'));
  expect(await p1).toEqual({ stale: true });
});
