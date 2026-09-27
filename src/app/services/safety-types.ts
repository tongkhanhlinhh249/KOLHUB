// KOL Safety: video pre-check before posting and channel monitoring (mock).
import type { Platform } from './bizTypes';

/** Scan verdict: VIOLATION (score ≤ 30) · GRAY (50–79) · SAFE (≥ 80). */
export type SafetyVerdict = 'VIOLATION' | 'GRAY' | 'SAFE';
export type IssueSeverity = 'violation' | 'warning' | 'note';

export interface SafetyIssue {
  severity: IssueSeverity;
  title: string;
  detail: string;
  /** Second of the video where the issue appears. */
  atSec?: number;
}

/** Result of one scan; shared by uploaded videos and a monitored channel's videos. */
export interface ScanResult {
  verdict: SafetyVerdict;
  /** 0–100, higher is safer. */
  score: number;
  issues: SafetyIssue[];
}

export interface SafetyVideo {
  id: string;
  accountId: string;
  fileName: string;
  sizeBytes: number;
  durationSec: number;
  thumbnail: string;
  status: 'PROCESSING' | 'DONE';
  /** Set when status is DONE. */
  result?: ScanResult;
  uploadedAt: number;
  checkedAt?: number;
  publishedAt?: number;
}

export interface UploadVideoInput {
  fileName: string;
  sizeBytes: number;
  durationSec: number;
  /** Frame captured by the browser (data URL); a sample image is used when missing. */
  thumbnail?: string;
}

export interface SafetyStats {
  checked: number;
  /** VIOLATION + GRAY that are not published yet. */
  needsAction: number;
  processing: number;
}

export type MonitorPlatform = Platform;

export interface ScannedVideo extends ScanResult {
  id: string;
  title: string;
  thumbnail: string;
  durationSec: number;
  publishedAt: number;
}

export type HealthLabel = 'Tốt' | 'Cần chú ý' | 'Rủi ro';

export interface ChannelHealth {
  score: number;
  label: HealthLabel;
  counts: { violation: number; gray: number; safe: number };
}

export interface SafetyMonitor {
  id: string;
  accountId: string;
  platform: MonitorPlatform;
  /** Without "@". */
  handle: string;
  /** Canonical channel link, without protocol (e.g. tiktok.com/@tenkenh). */
  url: string;
  displayName: string;
  avatar: string;
  followers: number;
  likes: number;
  videoCount: number;
  connectedAt: number;
  lastScanAt: number | null;
  scanCount: number;
  scannedVideos: ScannedVideo[];
  health: ChannelHealth | null;
}

/** Monitor as shown to its owner: `verified` = it is one of the owner's verified profile channels. */
export interface MonitorView extends SafetyMonitor {
  verified: boolean;
}
