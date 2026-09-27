import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeData } from '../../services';

export interface LiveQuery<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  reload(): void;
}

/**
 * Load data and re-load it whenever the demo store changes (e.g. the Admin simulator
 * approves a profile). Background reloads keep the previous data and do not set `loading`.
 */
export function useLiveQuery<T>(load: () => Promise<T>, deps: unknown[]): LiveQuery<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);
  const alive = useRef(true);

  const run = useCallback((foreground: boolean) => {
    const id = ++seq.current;
    if (foreground) {
      setLoading(true);
      setError(null);
    }
    loadRef.current().then(
      (d) => {
        if (!alive.current || id !== seq.current) return;
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (!alive.current || id !== seq.current) return;
        if (foreground) setError(e);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    run(true);
    const off = subscribeData(() => run(false));
    return () => {
      alive.current = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run(true), [run]);
  return { data, loading, error, reload };
}
