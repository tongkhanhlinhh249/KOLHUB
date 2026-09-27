import type { Account, AccountType, OtpChannel, OtpPurpose } from '../types';
import { seedState } from './seed';
// --- phase 3 ---
import type { DirectoryKol, SavedList } from '../bizTypes';
// --- phase 2 ---
import type {
  ChangeRequest,
  Channel,
  EkycScenario,
  EkycSession,
  FunnelEvent,
  IdentityRecord,
  KolProfile,
  McnProfile,
  ReviewRequest,
} from '../profile-types';

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
  // --- phase 3 ---
  directory: DirectoryKol[];
  savedLists: SavedList[];
  // --- phase 2 ---
  kolProfiles: KolProfile[];
  mcnProfiles: McnProfile[];
  identities: IdentityRecord[];
  ekycSessions: EkycSession[];
  ekycScenario: EkycScenario;
  channels: Channel[];
  reviewRequests: ReviewRequest[];
  changeRequests: ChangeRequest[];
  funnel: FunnelEvent[];
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
        if (isValidState(parsed)) return backfillMissingKeys(parsed, seed);
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

// --- phase 3 ---
/** Data saved by an earlier build may lack keys added later: fill them from the seed (version unchanged). */
function backfillMissingKeys(parsed: DemoState, seed: () => DemoState): DemoState {
  const fresh = seed() as unknown as Record<string, unknown>;
  const target = parsed as unknown as Record<string, unknown>;
  for (const key of Object.keys(fresh)) {
    if (!(key in target)) target[key] = fresh[key];
  }
  // Directory entries saved before "Lĩnh vực hoạt động" / "Video mới nhất" existed: fill those two keys by kolId.
  if (Array.isArray(parsed.directory)) {
    const seeded = new Map(((fresh.directory as DirectoryKol[] | undefined) ?? []).map((k) => [k.kolId, k]));
    for (const k of parsed.directory as Partial<DirectoryKol>[]) {
      const src = k.kolId ? seeded.get(k.kolId) : undefined;
      if (!('fields' in k)) k.fields = src?.fields ?? (k.category ? [{ name: k.category, medal: 'none' }] : []);
      if (!('latestVideos' in k)) k.latestVideos = src?.latestVideos ?? [];
    }
  }
  return parsed;
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
