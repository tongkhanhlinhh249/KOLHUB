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
