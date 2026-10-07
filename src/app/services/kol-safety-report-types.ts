// "KOL Safety – Tổng hợp kênh": demo report of the 30 most recently scanned contents of a channel
// (simulates the AI Video Analysis tool; data is deterministic from the channel id).
import type { Platform } from './bizTypes';
import type { IssueSeverity, SafetyVerdict } from './safety-types';

/** Issue categories of the channel report. */
export type ContentCategory =
  | 'profanity'
  | 'violence'
  | 'adult'
  | 'restricted_product'
  | 'misinformation'
  | 'music_copyright'
  | 'undisclosed_ad'
  | 'child_safety';

/** One finding inside a content: where, what, how bad, what to do. */
export interface ContentFinding {
  /** Second of the video where the finding appears. */
  atSec: number;
  category: ContentCategory;
  severity: IssueSeverity;
  /** Short reason shown in the list. */
  reason: string;
  /** Transcript / caption snippet or frame description. */
  excerpt: string;
  recommendation: string;
}

/** One scanned content (video / reel / short) of the channel. */
export interface ScannedContent {
  id: string;
  /** Position in the channel's history (0 = oldest content ever scanned); stable across re-scans. */
  seq: number;
  title: string;
  thumbnail: string;
  /** Link to the post on the platform. */
  url: string;
  publishedAt: number;
  durationSec: number;
  views: number;
  verdict: SafetyVerdict;
  /** 0–100, higher is safer. */
  score: number;
  findings: ContentFinding[];
}

/** Channel of the signed-in KOL/MCN that can be summarised. */
export interface KolSafetyChannel {
  id: string;
  platform: Platform;
  /** Without "@". */
  handle: string;
  url: string;
  followers: number;
  verified: boolean;
  /** MCN: name of the KOL the channel is assigned to; "Kênh riêng MCN" when unassigned. KOL: undefined. */
  group?: string;
}

/** Persisted per (account, channel): re-scan history and the "Chia sẻ cho Nhãn hàng" flag (demo). */
export interface KolSafetyReportState {
  accountId: string;
  channelId: string;
  /** Time of the first scan (the report's anchor). */
  firstScanAt: number;
  /** Time of every "Quét lại", oldest first; each adds one new content. */
  rescans: number[];
  shared: boolean;
  sharedAt?: number;
  /** "Khiên An toàn nội dung" of the channel (absent = never requested). */
  shield?: ShieldState;
  /** Contents the owner marked "Đã gỡ bài" (left out of the shield window). */
  removedIds?: string[];
}

export interface ChannelReport {
  channelId: string;
  /** 1 + number of re-scans. */
  scanNo: number;
  scannedAt: number;
  /** Exactly 30, newest first. */
  items: ScannedContent[];
  shared: boolean;
  sharedAt?: number;
  /** "Khiên An toàn nội dung" as of now. */
  shield: ShieldView;
  /** "Quét lại" left this month on the current plan (absent = unlimited). */
  rescansLeft?: number;
}

export interface ReportSummary {
  /** 0–100. */
  score: number;
  counts: { safe: number; gray: number; violation: number };
  /** Findings per category (every category present, 0 when none). */
  categoryTotals: Record<ContentCategory, number>;
  /** Oldest / newest publish time of the scanned contents (null when empty). */
  from: number | null;
  to: number | null;
  /** Scores in time order (oldest first). */
  trend: { id: string; publishedAt: number; score: number }[];
  /** Up to 3 recommendations, most pressing first. */
  recommendations: string[];
}

export type ContentSort = 'date_desc' | 'date_asc' | 'score_asc' | 'score_desc';

export interface ContentFilter {
  verdict?: SafetyVerdict | 'ALL';
  category?: ContentCategory | 'ALL';
  query?: string;
  sort?: ContentSort;
}

// ---------------------------------------------------------------------------
// "Khiên An toàn nội dung" (content-safety shield, per channel) — one of the two criteria of the
// Kol.gov.vn verification badge (with a complete, approved profile). Reviewed by the KOLHUB operations team.
// ---------------------------------------------------------------------------

/** Contents evaluated: the newest ones not marked "Đã gỡ bài". */
export const SHIELD_WINDOW = 10;
/** At most this many "Cần xem lại" in the window (and no "Vi phạm"). */
export const SHIELD_MAX_GRAY = 2;
/** Days to remove the content or appeal once the shield is suspended. */
export const SHIELD_SUSPEND_DAYS = 7;
export const SHIELD_APPEAL_MAX = 1000;

/** Stored status; "APPEALED" and "REVOKED" (deadline passed) are derived when read. */
export type ShieldStoredStatus = 'ACTIVE' | 'FAILED' | 'SUSPENDED' | 'REVOKED';
export type ShieldStatus = 'NONE' | ShieldStoredStatus | 'APPEALED';

export const SHIELD_STATUS_LABEL: Record<ShieldStatus, string> = {
  NONE: 'Chưa xin khiên',
  ACTIVE: 'Đạt Khiên An toàn',
  FAILED: 'Chưa đạt',
  SUSPENDED: 'Tạm treo',
  APPEALED: 'Đang xét khiếu nại',
  REVOKED: 'Đã thu hồi',
};

export interface ShieldAppeal {
  at: number;
  note: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  decidedAt?: number;
  decisionNote?: string;
}

export interface ShieldState {
  status: ShieldStoredStatus;
  /** Last evaluation. */
  evaluatedAt: number;
  grantedAt?: number;
  suspendedAt?: number;
  /** SUSPENDED: end of the grace period (then REVOKED). */
  deadline?: number;
  appeal?: ShieldAppeal;
}

/** Counts of the evaluated window. */
export interface ShieldWindow {
  total: number;
  safe: number;
  gray: number;
  violation: number;
  /** Ids of the "Vi phạm" / "Cần xem lại" contents in the window (newest first). */
  flaggedIds: string[];
}

export interface ShieldView {
  status: ShieldStatus;
  window: ShieldWindow;
  /** The window meets the rule right now. */
  passes: boolean;
  /** Why it does not pass (empty when it does). */
  reasons: string[];
  /** Channel has its "dấu xác thực" (required to request). */
  channelVerified: boolean;
  grantedAt?: number;
  deadline?: number;
  appeal?: ShieldAppeal;
  canRequest: boolean;
  canAppeal: boolean;
  /** "Đã gỡ bài" on flagged contents of the window. */
  canMarkRemoved: boolean;
}

// --- App switch and plans of KOL Safety (KOL/MCN account) ---

export type KolSafetyPlanKey = 'FREE' | 'PROTECT';

export interface KolSafetyPlan {
  key: KolSafetyPlanKey;
  name: string;
  /** Price text (to be announced). */
  price: string;
  /** "Quét lại" per channel per calendar month; null = unlimited. */
  rescansPerMonth: number | null;
  /** "Quét trước khi đăng" (/kiem-duyet/video). */
  prePublishScan: boolean;
  /** New posts are scanned automatically (demo: shown only). */
  autoMonitor: boolean;
  features: string[];
}

export const KOL_SAFETY_PLANS: KolSafetyPlan[] = [
  {
    key: 'FREE',
    name: 'Miễn phí',
    price: '0 ₫',
    rescansPerMonth: 3,
    prePublishScan: false,
    autoMonitor: false,
    features: ['Quét 10 nội dung mỗi kênh để xin Khiên An toàn', '3 lượt quét lại mỗi kênh mỗi tháng', 'Khiếu nại miễn phí'],
  },
  {
    key: 'PROTECT',
    name: 'Bảo vệ',
    price: 'Sẽ công bố',
    rescansPerMonth: null,
    prePublishScan: true,
    autoMonitor: true,
    features: ['Quét lại không giới hạn', 'Quét trước khi đăng để không mất khiên', 'Giám sát tự động bài mới', 'Báo cáo chi tiết từng bài'],
  },
];

/** Per account: KOL Safety switched on (absent = on) and the plan (absent = FREE). */
export interface KolSafetySettings {
  accountId: string;
  enabled: boolean;
  plan: KolSafetyPlanKey;
  planSince?: number;
}

export interface KolSafetySettingsView {
  enabled: boolean;
  plan: KolSafetyPlan;
  planSince?: number;
}

/** Operations queue: a pending shield appeal. */
export interface ShieldAppealItem {
  accountId: string;
  ownerName: string;
  channelId: string;
  platform: Platform;
  handle: string;
  appeal: ShieldAppeal;
  window: ShieldWindow;
}

/** One own channel in the shield checklist. */
export interface ChannelShieldRow {
  channelId: string;
  platform: Platform;
  handle: string;
  verified: boolean;
  status: ShieldStatus;
  /** The 10 newest contents meet the rule now. */
  passes: boolean;
}

/** What a brand sees on a public channel. */
export type PublicShield = 'ACTIVE' | 'SUSPENDED';
