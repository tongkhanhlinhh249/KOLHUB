import type { OtpMessage } from './mock/otp';

type Listener = (m: OtpMessage) => void;

const listeners = new Set<Listener>();

/** Fake SMS/email inbox: the mock OTP service publishes here, the UI subscribes to show toasts. */
export const otpInbox = {
  publish(m: OtpMessage): void {
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

export type { OtpMessage };
