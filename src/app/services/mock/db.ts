import type { Account, AccountType, OtpChannel, OtpPurpose } from '../types';
import { seedState } from './seed';
// --- phase 3 ---
import type { SavedList } from '../bizTypes';
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
// --- KOL Safety ---
import type { SafetyMonitor, SafetyVideo } from '../safety-types';
import type { KolSafetyReportState, KolSafetySettings } from '../kol-safety-report-types';
// --- violations ---
import type { Violation } from '../violation-types';
// --- campaign booking (beta) ---
import type { Booking, Campaign, CampaignQA, PlanKey, SavedCampaign } from '../campaign-types';
// --- Tin nhắn / Thông báo ---
import type { BookingMessage, NotificationReadState, ThreadRead } from '../inbox-types';

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

/**
 * Bump when the stored shape or seed content changes incompatibly; any other stored version is replaced by the seed.
 * v6: seeded monitors of profile channels carry that channel's follower count.
 * v7: MCN ↔ KOL links (`mcnKolLinks`) and MCN channels assigned to linked KOLs.
 * v8: no more links — MCN channels are assigned directly to approved KOLs (`Channel.assignedKolAccountId`).
 * v9: campaign booking beta — `campaigns`, `bookings`, `brandPlans`.
 * v10: Sàn v2 — `savedCampaigns` (supplier bookmarks) and 4 more marketplace campaigns in the seed.
 * v11: campaign cover image (`Campaign.cover`) on every seeded campaign.
 * v12: "Tuyển nhiều KOL" (open recruitment) campaigns, rewards, survey / terms, Workflow, regions and the public
 * campaign Q&A (`campaignQuestions`).
 * v13: past collaborations (verified posts, ratings, payments) for "Bài đã đăng" / "Thu nhập" and the per-post
 * "Hiện trên hồ sơ" flag (`ContentSubmission.hiddenOnProfile`).
 * v14: "Tin nhắn" per booking (`bookingMessages`, `threadReads`) and the read state of "Thông báo"
 * (`notificationReads`), with seeded threads for Khánh Vy, Sao Việt Media and the demo brand.
 * v15: Khánh Vy's rating of the brand on one past booking (seed only) for "Đánh giá › Bạn đánh giá".
 * v16: xác thực kênh qua KOL Safety — `Channel.safety`, status SAFETY_PENDING, dấu 90 ngày (seed gia hạn mỗi
 * 90 ngày), Instagram, vài kênh mẫu chờ KOL Safety / sắp hết hạn.
 * v17: EP-02 vòng đời chiến dịch — Chờ duyệt / Cần bổ sung / Không được duyệt / Đã đóng tuyển, bỏ "Đang chạy",
 * nhật ký duyệt, bản sửa chờ duyệt; 1 chiến dịch mẫu Chờ duyệt.
 * v18: EP-02 thù lao cố định — `Campaign.groups` (số suất + quyền lợi theo nhóm đầu việc), bỏ đàm phán giá.
 */
export const DB_VERSION = 18;

export interface DemoState {
  version: 18;
  accounts: StoredAccount[];
  otps: OtpRecord[];
  registrations: PendingRegistration[];
  loginFails: Record<string, { count: number; lockedUntil?: number }>;
  sessionAccountId: string | null;
  // --- phase 3 ---
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
  // --- KOL Safety ---
  safetyVideos: SafetyVideo[];
  safetyMonitors: SafetyMonitor[];
  // --- violations ---
  violations: Violation[];
  // --- campaign booking (beta) ---
  campaigns: Campaign[];
  bookings: Booking[];
  /** Brand account id → plan; absent = DEFAULT_PLAN (TRIAL). */
  brandPlans: Record<string, { plan: PlanKey; since: number }>;
  // --- Sàn v2 ---
  /** Marketplace bookmarks, one row per (supplier account, campaign). */
  savedCampaigns: SavedCampaign[];
  // --- Tuyển nhiều KOL ---
  /** Public Q&A of marketplace campaigns ("Hỏi đáp"). */
  campaignQuestions: CampaignQA[];
  // --- Tin nhắn / Thông báo (v14) ---
  /** One thread per booking: messages written by its two parties. */
  bookingMessages: BookingMessage[];
  /** When each account last opened each thread. */
  threadReads: ThreadRead[];
  /** Read state of the notification center (notifications themselves are derived). */
  notificationReads: NotificationReadState[];
  // --- KOL Safety – Tổng hợp kênh (optional: created on first "Quét lại" / share, no seed change) ---
  kolSafetyReports?: KolSafetyReportState[];
  /** KOL Safety app switch and plan per KOL/MCN account (optional, no seed change). */
  kolSafetySettings?: KolSafetySettings[];
  /** Demo Panel: kết quả của lần quét KOL Safety tiếp theo (mặc định AUTO). */
  safetyDemo?: { nextVerdict: 'AUTO' | 'PASS' | 'FAIL' | 'ERROR' };
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
    s.version === DB_VERSION &&
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
 * storage is null or throws; corrupt data or any version other than DB_VERSION (e.g. v1 with
 * `directory`) is replaced by the seed.
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
/** v2 data saved by an earlier build may lack keys added later: fill them from the seed (version unchanged). */
function backfillMissingKeys(parsed: DemoState, seed: () => DemoState): DemoState {
  const fresh = seed() as unknown as Record<string, unknown>;
  const target = parsed as unknown as Record<string, unknown>;
  for (const key of Object.keys(fresh)) {
    if (!(key in target)) target[key] = fresh[key];
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
