import type { NoticeMessage } from './profile-types';

type Listener = (m: NoticeMessage) => void;

const listeners = new Set<Listener>();

/** Fake email/SMS inbox for review results: the review service publishes, the UI shows toasts. */
export const noticeInbox = {
  publish(m: NoticeMessage): void {
    for (const fn of [...listeners]) {
      try {
        fn(m);
      } catch {
        // a broken listener must not stop delivery to the others
      }
    }
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
