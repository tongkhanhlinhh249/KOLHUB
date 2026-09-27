export type LatestResult<T> = { stale: false; value: T } | { stale: true };

/**
 * Wraps promises so only the most recent call counts: an older call that settles later
 * resolves to `{ stale: true }` (errors included) instead of overwriting newer results.
 */
export function createLatestOnly() {
  let seq = 0;
  return function latest<T>(p: Promise<T>): Promise<LatestResult<T>> {
    const id = ++seq;
    return p.then(
      (value) => (id === seq ? { stale: false as const, value } : { stale: true as const }),
      (err) => {
        if (id === seq) throw err;
        return { stale: true as const };
      },
    );
  };
}
