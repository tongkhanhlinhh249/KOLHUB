// Violations ("Danh sách vi phạm"): detected by KOL Safety or reported by a brand/user, reviewed by Admin.
import type { OwnerType } from './profile-types';
import type { Platform } from './bizTypes';

export const VIOLATION_CATEGORIES = [
  'Quảng cáo không gắn nhãn',
  'Thông tin sai sự thật',
  'Nội dung phản cảm',
  'Lộ thông tin cá nhân',
  'Vi phạm bản quyền',
  'Sản phẩm cấm quảng cáo',
] as const;
export type ViolationCategory = (typeof VIOLATION_CATEGORIES)[number];

export type ViolationSeverity = 'high' | 'medium' | 'low';
export const VIOLATION_SEVERITIES: { key: ViolationSeverity; label: string }[] = [
  { key: 'high', label: 'Nghiêm trọng' },
  { key: 'medium', label: 'Trung bình' },
  { key: 'low', label: 'Nhẹ' },
];

/** KOL_SAFETY = found by a channel scan; REPORT = reported by a brand or a viewer. */
export type ViolationSource = 'KOL_SAFETY' | 'REPORT';
export const VIOLATION_SOURCE_LABEL: Record<ViolationSource, string> = {
  KOL_SAFETY: 'KOL Safety',
  REPORT: 'Báo cáo',
};

/**
 * PENDING_REVIEW → (Admin) CONFIRMED | DISMISSED.
 * CONFIRMED → (owner) RESOLVED | APPEALED (once). APPEALED → (Admin) DISMISSED | CONFIRMED.
 */
export type ViolationStatus = 'PENDING_REVIEW' | 'CONFIRMED' | 'DISMISSED' | 'APPEALED' | 'RESOLVED';
export const VIOLATION_STATUS_LABEL: Record<ViolationStatus, string> = {
  PENDING_REVIEW: 'Chờ xác minh',
  CONFIRMED: 'Cần xử lý',
  APPEALED: 'Đang khiếu nại',
  RESOLVED: 'Đã khắc phục',
  DISMISSED: 'Đã bác bỏ',
};

/** reporter = the Brand/Agency that sent a report (identity never shown to the owner). */
export type ViolationActor = 'system' | 'admin' | 'owner' | 'reporter';
export type ViolationAction = 'DETECTED' | 'REPORTED' | 'CONFIRMED' | 'DISMISSED' | 'APPEALED' | 'APPEAL_ACCEPTED' | 'APPEAL_REJECTED' | 'RESOLVED';

export interface ViolationEvent {
  at: number;
  actor: ViolationActor;
  action: ViolationAction;
  note?: string;
}

export interface Violation {
  id: string;
  /** Public KOL ID when the owner is a KOL with an approved profile. */
  kolId?: string;
  ownerType: OwnerType;
  /** Account id of the owner (KOL or MCN). */
  ownerId: string;
  /** Channel record id, when known (reports). */
  channelId?: string;
  platform: Platform;
  /** Without "@". */
  channelHandle: string;
  /** Channel link without protocol. */
  channelUrl: string;
  contentTitle: string;
  contentUrl?: string;
  thumbnail?: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  source: ViolationSource;
  /** What the reporter wrote (REPORT only). Admin/owner only. */
  reporterNote?: string;
  /** Brand/Agency that reported it (REPORT by a brand). Admin only — stripped from owner views. */
  reporter?: ViolationReporter;
  /** Scanned video id for KOL_SAFETY detections (dedupe key). */
  scanVideoId?: string;
  detectedAt: number;
  status: ViolationStatus;
  history: ViolationEvent[];
  /** Owner's note when marking it fixed. */
  ownerNote?: string;
  appealReason?: string;
  /** Admin's latest reason (dismiss / appeal decision). */
  adminReason?: string;
  /** Set once the owner appealed; a rejected appeal cannot be repeated. */
  appealed?: boolean;
  updatedAt: number;
}

export interface ViolationReporter {
  accountId: string;
  company?: string;
}

/** Owner view: the full record minus the reporter's identity. */
export type OwnerViolation = Omit<Violation, 'reporter'>;

/** What a Brand may see (CONFIRMED / RESOLVED of an approved KOL only; no notes, no reporter). */
export interface BrandViolation {
  id: string;
  kolId: string;
  kolName: string;
  kolAvatar?: string;
  platform: Platform;
  channelHandle: string;
  channelUrl: string;
  contentTitle: string;
  contentUrl?: string;
  thumbnail?: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  source: ViolationSource;
  detectedAt: number;
  status: 'CONFIRMED' | 'RESOLVED';
  /** Public steps only (detected/reported, confirmed, resolved), without notes. */
  history: { at: number; action: ViolationAction }[];
}

export interface ViolationAdminQueue {
  pending: Violation[];
  appealed: Violation[];
}

/** Minimum length of an appeal reason. */
export const APPEAL_MIN = 20;

/** Brand report description length (characters, trimmed). */
export const REPORT_NOTE_MIN = 20;
export const REPORT_NOTE_MAX = 1000;

export interface BrandReportInput {
  channelId: string;
  /** Link of the reported video/post; must be on the channel's platform. */
  contentUrl?: string;
  category: ViolationCategory;
  /** Default 'medium'. */
  severity?: ViolationSeverity;
  note: string;
}
