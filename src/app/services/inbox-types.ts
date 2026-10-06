// "Tin nhắn" (one thread per booking, brand ↔ KOL/MCN), "Thông báo" (in-app notification center, derived from
// booking / campaign events) and "Câu hỏi của tôi" (the supplier's Sàn questions). Timestamps are epoch ms.
import type { BookingActor, BookingParty, BookingStatus, SupplierType } from './campaign-types';
import type { StoredFile } from './profile-types';

export const MESSAGE_TEXT_MAX = 2000;
export const MESSAGE_LINK_MAX = 500;

/** A message written by one party of a booking (stored). */
export interface BookingMessage {
  id: string;
  bookingId: string;
  from: BookingParty;
  authorAccountId: string;
  text: string;
  /** Optional http(s) link (brief, draft, drive folder…). */
  link?: string;
  at: number;
}

/** Last time `accountId` opened the thread of `bookingId`. */
export interface ThreadRead {
  accountId: string;
  bookingId: string;
  readAt: number;
}

/** Read state of the notification center of one account: everything up to `readAllAt` + single ids. */
export interface NotificationReadState {
  accountId: string;
  readAllAt?: number;
  readIds: string[];
}

export interface ThreadMessageView {
  id: string;
  /** USER = written by a party; SYSTEM = a key booking event (status change), shown inline. */
  kind: 'USER' | 'SYSTEM';
  from: BookingActor;
  mine: boolean;
  /** "Bạn" / brand company / KOL-MCN name / "Hệ thống". */
  authorName: string;
  text: string;
  link?: string;
  at: number;
}

export interface ThreadSummary {
  bookingId: string;
  campaignId: string;
  campaignName: string;
  cover?: StoredFile;
  viewer: BookingParty;
  counterpartName: string;
  /** BRAND when the viewer is the supplier; the supplier type when the viewer is the brand. */
  counterpartType: 'BRAND' | SupplierType;
  status: BookingStatus;
  last?: Pick<ThreadMessageView, 'kind' | 'mine' | 'text' | 'at'>;
  lastAt: number;
  /** Messages from the other party after the viewer last opened the thread. */
  unread: number;
  /** False once the booking ended without a deal (declined / cancelled / expired): read-only. */
  canPost: boolean;
  /** Booking detail of the viewer's side. */
  bookingPath: string;
}

export interface ThreadView extends ThreadSummary {
  messages: ThreadMessageView[];
}

export interface MessageInput {
  text: string;
  link?: string;
}

export type NotificationKind =
  // KOL/MCN
  | 'INVITE'
  | 'PICKED'
  | 'NOT_PICKED'
  | 'OFFER'
  | 'DRAFT_APPROVED'
  | 'CHANGES_REQUESTED'
  | 'POST_VERIFIED'
  | 'PAID'
  | 'PRODUCT_SENT'
  | 'QA_ANSWERED'
  | 'INVITE_EXPIRING'
  // Brand
  | 'APPLICATION'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'DRAFT_SUBMITTED'
  | 'PAYMENT_CONFIRMED'
  | 'PRODUCT_RECEIVED'
  | 'QA_ASKED'
  // both
  | 'CANCELLED'
  | 'MESSAGE';

export interface AppNotification {
  /** Stable id derived from the source event (e.g. `ev:<bookingId>:<n>`, `msg:<id>`, `qa:<id>`, `exp:<bookingId>`). */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: number;
  /** In-app deep link to the target (booking sheet, thread, campaign page…). */
  href: string;
  read: boolean;
  campaignName?: string;
}

export type NotificationFilter = 'all' | 'unread';

export type MyQuestionStatus = 'ANSWERED' | 'PENDING';
export type MyQuestionFilter = 'all' | 'answered' | 'pending';

export interface MyQuestion {
  id: string;
  campaignId: string;
  campaignName: string;
  cover?: StoredFile;
  brandCompany: string;
  question: string;
  answer?: string;
  answeredAt?: number;
  createdAt: number;
  status: MyQuestionStatus;
}

/** "Chiến dịch quan tâm" filter: still taking applications / closed. */
export type InterestFilter = 'all' | 'open' | 'closed';

// In-app paths used by deep links (kept here so services do not import UI code).
export const INBOX_PATHS = {
  messages: '/tin-nhan',
  notifications: '/thong-bao',
  myQuestions: '/cau-hoi-cua-toi',
  supplierBooking: (bookingId: string) => `/chien-dich-cua-toi?booking=${encodeURIComponent(bookingId)}`,
  brandBooking: (campaignId: string, bookingId: string) =>
    `/chien-dich/${encodeURIComponent(campaignId)}?tab=booking&booking=${encodeURIComponent(bookingId)}`,
  brandQa: (campaignId: string) => `/chien-dich/${encodeURIComponent(campaignId)}?tab=hoi-dap`,
  thread: (bookingId: string) => `/tin-nhan?thread=${encodeURIComponent(bookingId)}`,
  sanCampaign: (campaignId: string) => `/san/${encodeURIComponent(campaignId)}`,
} as const;
