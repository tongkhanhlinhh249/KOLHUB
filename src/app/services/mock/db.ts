import type { Account, AccountType, OtpChannel, OtpPurpose } from '../types';
import { seedState } from './seed';

export const DB_KEY = 'kolhub-demo-v1';

export type StoredAccount = Account & { password: string };

export interface OtpRecord {
  id: string;
  channel: OtpChannel;
  target: string;
  purpose: OtpPurpose;
  code: string;
  expiresAt: number;
  sentAt: number;
  failCount: number;
  status: 'PENDING' | 'VERIFIED' | 'CANCELLED' | 'SUPERSEDED';
}

export interface PendingRegistration {
  id: string;
  type: AccountType;
  email: string;
  phone?: string;
  password: string;
  fullName?: string;
  company?: string;
  consentAt: string;
  createdAt: number;
}

export interface DemoState {
  version: 1;
  accounts: StoredAccount[];
  otps: OtpRecord[];
  registrations: PendingRegistration[];
  loginFails: Record<string, { count: number; lockedUntil?: number }>;
  sessionAccountId: string | null;
}

export type DemoStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface Db {
  read(): DemoState;
  update(fn: (s: DemoState) => void): void;
  reset(): void;
}

function isValidState(v: unknown): v is DemoState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<DemoState>;
  return (
    s.version === 1 &&
    Array.isArray(s.accounts) &&
    Array.isArray(s.otps) &&
    Array.isArray(s.registrations) &&
    !!s.loginFails &&
    typeof s.loginFails === 'object' &&
    (s.sessionAccountId === null || typeof s.sessionAccountId === 'string')
  );
}

/**
 * Demo data store persisted to storage under DB_KEY. Falls back to memory when
 * storage is null or throws; corrupt / wrong-version data is replaced by the seed.
 */
export function createDb(storage: DemoStorage | null, seed: () => DemoState): Db {
  function load(): DemoState {
    try {
      const raw = storage?.getItem(DB_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValidState(parsed)) return parsed;
      }
    } catch {
      // fall through to seed
    }
    return seed();
  }

  function persist(s: DemoState) {
    try {
      storage?.setItem(DB_KEY, JSON.stringify(s));
    } catch {
      // keep running in memory
    }
  }

  let state = load();
  persist(state);

  return {
    read: () => structuredClone(state),
    update(fn) {
      const next = structuredClone(state);
      fn(next);
      state = next;
      persist(state);
    },
    reset() {
      state = seed();
      persist(state);
    },
  };
}

function browserStorage(): DemoStorage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Default instance backed by window.localStorage (memory fallback). */
export const db: Db = createDb(browserStorage(), seedState);
