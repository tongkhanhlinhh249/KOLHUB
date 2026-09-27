// Phase 2 types: KOL/MCN profiles, channels, eKYC, review, change requests, funnel.
import type { ErrorCode } from './types';

export type OwnerType = 'KOL' | 'MCN';
export type ProfileStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_FIX' | 'REJECTED';

import type { ActivityField, ChannelStatus, LatestVideo, Platform } from './bizTypes';
export type { ActivityField, ChannelStatus, LatestVideo, Platform };

/** Max length of the public "Giới thiệu" (contact.bio). */
export const BIO_MAX = 300;

export type EkycStatus = 'NOT_STARTED' | 'OCR_PASSED' | 'PASSED' | 'MANUAL_REVIEW' | 'REPORTED';
export type EkycScenario =
  | 'SUCCESS'
  | 'KOLHUB-4101'
  | 'KOLHUB-4102'
  | 'KOLHUB-4103'
  | 'KOLHUB-4104'
  | 'KOLHUB-4105'
  | 'KOLHUB-4106'
  | 'KOLHUB-4107'
  | 'KOLHUB-5101';

/** Metadata of an uploaded file. Original bytes are never stored. */
export interface StoredFile {
  name: string;
  type: string;
  size: number;
  /** JPEG data URL, longest side ≤ 480 px (images only). */
  thumbnail?: string;
}

export interface ContactInfo {
  displayName: string;
  phone: string;
  email: string;
  zalo: string;
  country: string;
  province: string;
  address: string;
  category: string;
  /** Public "Giới thiệu", ≤ BIO_MAX characters. */
  bio?: string;
  /** Public "Lĩnh vực hoạt động": 1–3 unique entries, `fields[0].name === category`. */
  fields?: ActivityField[];
}

export interface StaffInfo {
  staffName: string;
  staffPhone: string;
  staffEmail: string;
}

export interface ProfileBase {
  accountId: string;
  contact: ContactInfo;
  staff: StaffInfo;
  avatar?: StoredFile;
  cover?: StoredFile;
  status: ProfileStatus;
  submittedAt?: number;
  decidedAt?: number;
  decisionReason?: string;
  approvedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface OcrData {
  fullName: string;
  dob: string;
  idNoMasked: string;
  issueDate: string;
}

export interface KolProfile extends ProfileBase {
  ownerType: 'KOL';
  kolId?: string;
  ekycStatus: EkycStatus;
  ekycDraft?: OcrData & { nameMismatch: boolean };
}

export interface OrgIdentity {
  orgName: string;
  regNo: string;
  regDate: string;
  regBy: string;
  legalRep: string;
}

export interface McnProfile extends ProfileBase {
  ownerType: 'MCN';
  mcnId?: string;
  org: OrgIdentity;
  gcnFile?: StoredFile;
}

export interface IdentityRecord {
  accountId: string;
  fullName: string;
  dob: string;
  idNoMasked: string;
  issueDate: string;
  ekycSessionId: string;
  verifiedAt: number;
}

export interface EkycSession {
  id: string;
  accountId: string;
  step: 'OCR' | 'FACE';
  resultCode: 'OK' | ErrorCode;
  counted: boolean;
  createdAt: number;
  /** Only on the failed attempt that triggered the lock. */
  lockedUntil?: number;
}

export interface Channel {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  platform: Platform;
  url: string;
  handle: string;
  proofImage: StoredFile;
  status: ChannelStatus;
  active: boolean;
  badgeExpiresAt?: number;
  verifiedAt?: number;
  badgeSuspended?: boolean;
  note?: string;
  /** Mock social-listening data, set when the channel is verified (see mock/socialListening). */
  stats?: ChannelStats;
  createdAt: number;
  updatedAt: number;
}

export interface ChannelStats {
  followers: number;
  /** Newest first. */
  latestVideos: LatestVideo[];
  syncedAt: number;
}

export interface ReviewRequest {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  submittedAt: number;
  status: 'SUBMITTED' | 'APPROVED' | 'NEEDS_FIX' | 'REJECTED';
  decidedAt?: number;
  reason?: string;
}

export type OrgChange = { org: OrgIdentity; gcnFile?: StoredFile };
export type ChangeField = 'displayName' | 'orgIdentity';

export interface ChangeRequest {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  field: ChangeField;
  oldValue: string | OrgChange;
  newValue: string | OrgChange;
  status: 'PENDING_CHANGE' | 'APPROVED' | 'REJECTED';
  reason?: string;
  createdAt: number;
  decidedAt?: number;
}

export type FunnelStep =
  | 'register_started'
  | 'otp_email_verified'
  | 'otp_sms_verified'
  | 'ekyc_ocr_passed'
  | 'ekyc_face_passed'
  | 'channel_added'
  | 'profile_submitted';

export interface FunnelEvent {
  subject: string;
  step: FunnelStep;
  at: number;
}

export interface NoticeMessage {
  channel: 'email' | 'sms';
  target: string;
  title: string;
  body: string;
}

/** Field format error with no KOLHUB code in the spec; `field` names the form field. */
export class ValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** Public, search-safe summary of an approved KOL (phase 3 merges these into search). */
export interface ApprovedKolSummary {
  kolId: string;
  displayName: string;
  avatar?: string;
  category?: string;
  region?: string;
  /** Collaboration email shown to brands (profile contact email). Never phone/address/Zalo (BR-58). */
  collabEmail?: string;
  channels: { platform: Platform; url: string; followers?: number; badgeExpiresAt: string }[];
  verifiedAt: string;
}

// Single category list shared with brand search filters (bizTypes).
export { KOL_CATEGORIES } from './bizTypes';

export const PROVINCES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Khác'];

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
