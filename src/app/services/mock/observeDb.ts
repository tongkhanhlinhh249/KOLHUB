import type { Db } from './db';

export interface LiveDb extends Db {
  /** Called after every update and reset. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void;
}

/** Wrap a Db so screens can re-load when data changes (e.g. Admin approves in the Demo Panel). */
export function observeDb(db: Db): LiveDb {
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const fn of [...listeners]) {
      try {
        fn();
      } catch {
        // a broken listener must not stop the others
      }
    }
  };
  return {
    read: () => db.read(),
    update(fn) {
      db.update(fn);
      emit();
    },
    reset() {
      db.reset();
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
