// Campaign booking (beta): Brand campaigns, bookings with MCN / independent KOL suppliers, the campaign
// marketplace ("Sàn chiến dịch") and brand plans. Service-layer contract for the UI; see
// docs/superpowers/specs/2026-09-29-kolhub-campaign-booking-beta-design.md.
// Timestamps are epoch ms; calendar dates (startDate, endDate, applyDeadline) are 'YYYY-MM-DD' (local day).
import type { KolCategory, Platform } from './bizTypes';
import type { StoredFile } from './profile-types';
import type { ScanResult } from './safety-types';
import type { PublicKol } from './mock/directory';

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export type DeliverableType = 'VIDEO' | 'POST' | 'LIVESTREAM';
export const DELIVERABLE_TYPES: { key: DeliverableType; label: string }[] = [
  { key: 'VIDEO', label: 'Video' },
  { key: 'POST', label: 'Bài đăng' },
  { key: 'LIVESTREAM', label: 'Livestream' },
];

export interface Deliverable {
  type: DeliverableType;
  platform: Platform;
  /** 1–100. */
  quantity: number;
}

/** PRIVATE = invite only; MARKETPLACE = also listed on "Sàn chiến dịch" while open for applications. */
export type CampaignVisibility = 'PRIVATE' | 'MARKETPLACE';
export const CAMPAIGN_VISIBILITY_LABEL: Record<CampaignVisibility, string> = {
  PRIVATE: 'Riêng tư',
  MARKETPLACE: 'Đăng lên Sàn chiến dịch',
};

/**
 * DRAFT → (publish, or first invite) OPEN → (first booking ACCEPTED) RUNNING → (brand closes) COMPLETED.
 * DRAFT / OPEN / RUNNING → (brand cancels) CANCELLED. Closing / cancelling needs no booking in progress.
 */
export type CampaignStatus = 'DRAFT' | 'OPEN' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang mở',
  RUNNING: 'Đang chạy',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};

export const CAMPAIGN_NAME_MAX = 150;
export const CAMPAIGN_TEXT_MAX = 5000;
export const BOOKING_NOTE_MAX = 1000;
export const DELIVERABLE_QTY_MAX = 100;

export interface Campaign {
  id: string;
  brandAccountId: string;
  name: string;
  objective: string;
  brief: string;
  /** VND; 0 = not entered yet (drafts only). */
  budget: number;
  /** 'YYYY-MM-DD'; optional while DRAFT. */
  startDate?: string;
  endDate?: string;
  platforms: Platform[];
  categories: KolCategory[];
  deliverables: Deliverable[];
  contentRules: string;
  visibility: CampaignVisibility;
  /** 'YYYY-MM-DD', last day suppliers may apply / respond (end of that local day). */
  applyDeadline?: string;
  status: CampaignStatus;
  /** First time the campaign became OPEN. */
  publishedAt?: number;
  /** When it became COMPLETED or CANCELLED. */
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** Fields a brand can set. `name` is required on create; publish requires the rest (see spec §3). */
export interface CampaignInput {
  name: string;
  objective?: string;
  brief?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  platforms?: Platform[];
  categories?: KolCategory[];
  deliverables?: Deliverable[];
  contentRules?: string;
  visibility?: CampaignVisibility;
  /** null clears it. */
  applyDeadline?: string | null;
}
export type CampaignPatch = Partial<CampaignInput>;

export interface BrandRef {
  accountId: string;
  company: string;
  /** Brand contact person (account full name). */
  contactName?: string;
}

/** Booking counters of one campaign (effective statuses, see BookingStatus). */
export interface CampaignStats {
  /** Every booking, any status. */
  total: number;
  /** INVITE bookings waiting for the supplier / in negotiation. */
  invited: number;
  /** APPLICATION bookings not decided yet (APPLIED / NEGOTIATING). */
  applications: number;
  /** ACCEPTED … VERIFIED. */
  inProgress: number;
  /** CONTENT_REVIEW (drafts waiting for the brand). */
  pendingReview: number;
  completed: number;
  /** Sum of `price` of bookings ACCEPTED or later (not cancelled). */
  committed: number;
}

export interface CampaignView extends Campaign {
  brand: BrandRef;
  stats: CampaignStats;
}

export interface CampaignFilters {
  status?: CampaignStatus | CampaignStatus[];
  visibility?: CampaignVisibility;
  /** Accent-insensitive match on name / objective / brief. */
  keyword?: string;
}

// ---------------------------------------------------------------------------
// Marketplace ("Sàn chiến dịch")
// ---------------------------------------------------------------------------

export type MarketplaceSort = 'newest' | 'budget' | 'deadline';
export const MARKETPLACE_SORTS: { key: MarketplaceSort; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'budget', label: 'Ngân sách cao nhất' },
  { key: 'deadline', label: 'Sắp hết hạn nhận đề xuất' },
];

export interface MarketplaceFilters {
  /** Accent-insensitive match on name / objective / brief / brand company. */
  keyword?: string;
  category?: KolCategory;
  platform?: Platform;
  /** VND, inclusive. */
  budgetMin?: number;
  budgetMax?: number;
  /** Default 'newest' (publishedAt desc). 'budget' = desc; 'deadline' = soonest applyDeadline first, none last. */
  sort?: MarketplaceSort;
}

/** A campaign as suppliers see it on the marketplace (no brand-internal data). */
export interface MarketplaceCampaign {
  id: string;
  name: string;
  objective: string;
  brief: string;
  budget: number;
  startDate: string;
  endDate: string;
  platforms: Platform[];
  categories: KolCategory[];
  deliverables: Deliverable[];
  contentRules: string;
  applyDeadline?: string;
  publishedAt: number;
  brand: { company: string };
  /** Applications received (any status except withdrawn/expired/declined). */
  applicationCount: number;
  /** The viewer's own occupying booking on this campaign, if any (invite or application). */
  myBooking?: { id: string; status: BookingStatus; origin: BookingOrigin };
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export type SupplierType = 'MCN' | 'KOL';
export type BookingOrigin = 'INVITE' | 'APPLICATION';
export type BookingParty = 'BRAND' | 'SUPPLIER';
export type BookingActor = BookingParty | 'SYSTEM';

/**
 * INVITE:      SENT ─(supplier counter)→ NEGOTIATING ⇄ (counters) ─(awaited party accepts)→ ACCEPTED
 *              SENT ─(supplier accepts)→ ACCEPTED
 * APPLICATION: APPLIED ─(brand accepts)→ ACCEPTED · (brand counter)→ NEGOTIATING
 * Then ACCEPTED ─draft→ CONTENT_REVIEW ─approve all→ CONTENT_APPROVED | ─request changes→ IN_PRODUCTION ─draft→ …
 *      CONTENT_APPROVED ─post link(s)→ PUBLISHED ─(system verifies every item)→ VERIFIED
 *      VERIFIED ─brand marks paid + supplier confirms→ COMPLETED
 * Exits: DECLINED (awaited party refuses), CANCELLED, EXPIRED (SENT / APPLIED, computed on read).
 */
export type BookingStatus =
  | 'SENT'
  | 'APPLIED'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'IN_PRODUCTION'
  | 'CONTENT_REVIEW'
  | 'CONTENT_APPROVED'
  | 'PUBLISHED'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  SENT: 'Đã gửi lời mời',
  APPLIED: 'Đã ứng tuyển',
  NEGOTIATING: 'Đang thương lượng',
  ACCEPTED: 'Đã chốt',
  IN_PRODUCTION: 'Đang sản xuất',
  CONTENT_REVIEW: 'Chờ duyệt nội dung',
  CONTENT_APPROVED: 'Nội dung đã duyệt',
  PUBLISHED: 'Đã đăng',
  VERIFIED: 'Đã xác minh',
  COMPLETED: 'Hoàn tất',
  DECLINED: 'Đã từ chối',
  CANCELLED: 'Đã huỷ',
  EXPIRED: 'Hết hạn',
};

/** Before a deal: someone must answer (`Booking.awaiting`). */
export const PRE_ACCEPT_STATUSES: readonly BookingStatus[] = ['SENT', 'APPLIED', 'NEGOTIATING'];
/** Deal made, work not finished. */
export const IN_PROGRESS_STATUSES: readonly BookingStatus[] = [
  'ACCEPTED',
  'IN_PRODUCTION',
  'CONTENT_REVIEW',
  'CONTENT_APPROVED',
  'PUBLISHED',
  'VERIFIED',
];
/** Ended without a deal; do not block a new invite / application. */
export const CLOSED_STATUSES: readonly BookingStatus[] = ['DECLINED', 'CANCELLED', 'EXPIRED'];

/** Days a SENT invite / APPLIED application stays open without an answer. */
export const BOOKING_EXPIRY_DAYS = 7;

export interface BookingItem {
  id: string;
  kolAccountId: string;
  kolId: string;
  /** Channel that will publish: an MCN channel assigned to the KOL (MCN bookings) or the KOL's own channel. */
  channelId?: string;
  platform: Platform;
  deliverableType: DeliverableType;
  quantity: number;
}

export type BookingAction =
  | 'INVITED'
  | 'ITEMS_ADDED'
  | 'APPLIED'
  | 'COUNTERED'
  | 'ITEMS_ASSIGNED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'DRAFT_SUBMITTED'
  | 'CONTENT_APPROVED'
  | 'CHANGES_REQUESTED'
  | 'POST_SUBMITTED'
  | 'POST_VERIFIED'
  | 'PAYMENT_MARKED'
  | 'PAYMENT_CONFIRMED'
  | 'CONTRACT_ATTACHED'
  | 'CONTRACT_REMOVED'
  | 'RATED';

export interface BookingEvent {
  at: number;
  by: BookingActor;
  action: BookingAction;
  price?: number;
  note?: string;
}

export type ContentKind = 'DRAFT' | 'POST';
export type ContentStatus = 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED';
export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  PENDING: 'Chờ duyệt',
  CHANGES_REQUESTED: 'Cần chỉnh sửa',
  APPROVED: 'Đã duyệt',
};

/** Mock post metrics pulled at verification (deterministic from the link). */
export interface PostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  /** (likes + comments + shares) / views × 100, 2 decimals. */
  engagementRate: number;
}

export interface ContentSubmission {
  id: string;
  kind: ContentKind;
  /** Item this content is for; absent = the whole booking. */
  itemId?: string;
  title: string;
  /** Draft file metadata (thumbnail only, never the bytes). */
  file?: StoredFile;
  /** Draft preview link, or the published post link (POST). */
  url?: string;
  note?: string;
  /** KOL Safety pre-check of a draft file (same scan as "Kiểm tra video"). */
  safety?: ScanResult;
  /** DRAFT: brand review. POST: APPROVED once verified. */
  status: ContentStatus;
  feedback?: string;
  reviewedAt?: number;
  metrics?: PostMetrics;
  verifiedAt?: number;
  submittedAt: number;
}

export interface BookingPayment {
  /** Brand marked "Đã thanh toán" (record only; no escrow in beta). */
  brandMarkedAt?: number;
  /** Supplier confirmed "Đã nhận thanh toán" → COMPLETED. */
  supplierConfirmedAt?: number;
}

export interface BookingRating {
  /** 1–5. */
  stars: number;
  comment: string;
  at: number;
}

export interface Booking {
  id: string;
  campaignId: string;
  brandAccountId: string;
  supplierType: SupplierType;
  /** MCN account (supplierType MCN) or the KOL's own account (KOL). */
  supplierAccountId: string;
  origin: BookingOrigin;
  items: BookingItem[];
  /** Total VND for the whole booking; 0 = waiting for the supplier's quote (invite without price). */
  price: number;
  note: string;
  /** Stored status; SENT / APPLIED may read as EXPIRED (see effective status in views). */
  status: BookingStatus;
  /** Pre-accept only: the party that must answer next. */
  awaiting?: BookingParty;
  history: BookingEvent[];
  contents: ContentSubmission[];
  contractFile?: StoredFile;
  payment: BookingPayment;
  /** Internal ratings: `brand` = given by the brand (of the supplier), `supplier` = given by the supplier. */
  ratings?: { brand?: BookingRating; supplier?: BookingRating };
  acceptedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** What the viewer may do now; every mutation checks the same list (KOLHUB-4805 otherwise). */
export type BookingActionKey =
  | 'COUNTER'
  | 'ACCEPT'
  | 'DECLINE'
  | 'CANCEL'
  | 'ASSIGN_ITEMS'
  | 'SUBMIT_DRAFT'
  | 'REVIEW_CONTENT'
  | 'SUBMIT_POST'
  | 'MARK_PAID'
  | 'CONFIRM_PAID'
  | 'RATE'
  | 'ATTACH_CONTRACT';

export interface SupplierRef {
  type: SupplierType;
  accountId: string;
  name: string;
  /** MCN ID / KOL ID. */
  code?: string;
  avatar?: string;
}

/** Campaign as shown inside a booking (both sides). Budget is left out for suppliers. */
export interface BookingCampaignSummary {
  id: string;
  name: string;
  objective: string;
  brief: string;
  contentRules: string;
  status: CampaignStatus;
  visibility: CampaignVisibility;
  startDate?: string;
  endDate?: string;
  applyDeadline?: string;
  platforms: Platform[];
  deliverables: Deliverable[];
  brand: BrandRef;
}

export interface BookingChannelRef {
  id: string;
  ownerType: SupplierType;
  platform: Platform;
  handle: string;
  url: string;
  followers: number;
}

export interface BookingItemView extends BookingItem {
  /** Public KOL profile (BR-58 whitelist via publicKolOf); null if the KOL is no longer listed. */
  kol: PublicKol | null;
  displayName: string;
  channel?: BookingChannelRef;
}

export interface BookingView extends Omit<Booking, 'items' | 'ratings'> {
  /** Effective status (SENT / APPLIED past expiry read as EXPIRED). */
  status: BookingStatus;
  /** When a SENT / APPLIED booking expires. */
  expiresAt?: number;
  viewer: BookingParty;
  allowedActions: BookingActionKey[];
  campaign: BookingCampaignSummary;
  supplier: SupplierRef;
  items: BookingItemView[];
  /** Only the viewer's own rating (ratings are internal). */
  myRating?: BookingRating;
}

export interface BrandBookingFilters {
  campaignId?: string;
  status?: BookingStatus | BookingStatus[];
}

export interface SupplierBookingFilters {
  campaignId?: string;
  status?: BookingStatus | BookingStatus[];
  origin?: BookingOrigin;
}

// --- inputs ---

export interface InviteOptions {
  /** Price per invited KOL (VND); omitted = the supplier quotes via counter. */
  price?: number;
  note?: string;
  /** Default: the campaign's first deliverable. `platform` defaults to that deliverable's platform. */
  deliverable?: { type: DeliverableType; platform?: Platform; quantity?: number };
}

export type InviteSkipReason = 'NOT_FOUND' | 'ALREADY_INVITED';

export interface InviteResult {
  /** Bookings created or extended by this call. */
  bookings: BookingView[];
  created: number;
  updated: number;
  skipped: { kolId: string; reason: InviteSkipReason }[];
}

/** One line of a proposal / item assignment. MCN: `kolAccountId` required; KOL: always itself. */
export interface ProposalItemInput {
  kolAccountId?: string;
  channelId: string;
  deliverableType: DeliverableType;
  quantity: number;
}

export interface ApplyInput {
  items: ProposalItemInput[];
  /** Total VND. */
  price: number;
  note?: string;
}

export interface DraftInput {
  title: string;
  file?: StoredFile;
  /** Preview link (e.g. cloud drive). A file or a link is required. */
  url?: string;
  /** Used by the KOL Safety scan (default 60 s). */
  durationSec?: number;
  note?: string;
  itemId?: string;
}

export interface PostInput {
  url: string;
  /** Required when the booking has several items on the link's platform. */
  itemId?: string;
  title?: string;
}

export type ReviewDecision = 'APPROVE' | 'REQUEST_CHANGES';

// --- badges ---

export interface BrandBookingCounts {
  /** APPLIED applications to answer. */
  newApplications: number;
  /** Every pre-accept booking where the brand must answer (APPLIED + NEGOTIATING awaiting brand). */
  awaitingBrand: number;
  /** CONTENT_REVIEW. */
  pendingReviews: number;
  /** VERIFIED not yet marked paid. */
  toPay: number;
}

export interface SupplierBookingCounts {
  /** SENT invites. */
  newInvites: number;
  /** Pre-accept bookings where the supplier must answer. */
  awaitingSupplier: number;
  /** ACCEPTED / IN_PRODUCTION / CONTENT_APPROVED / PUBLISHED: the supplier has work to deliver. */
  toDeliver: number;
  /** VERIFIED, marked paid by the brand, not confirmed yet. */
  toConfirmPayment: number;
  /** Campaigns open for applications on the marketplace. */
  openMarketplace: number;
}

// ---------------------------------------------------------------------------
// Brand plans (catalog only; no enforcement in beta)
// ---------------------------------------------------------------------------

export type PlanKey = 'TRIAL' | 'STANDARD' | 'ENTERPRISE';

export interface PlanInfo {
  key: PlanKey;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
}

export const DEFAULT_PLAN: PlanKey = 'TRIAL';

export const PLANS: PlanInfo[] = [
  {
    key: 'TRIAL',
    name: 'Dùng thử',
    priceLabel: 'Miễn phí',
    description: 'Trải nghiệm quản lý chiến dịch và booking KOL trong giai đoạn beta.',
    features: [
      'Tạo và quản lý chiến dịch',
      'Mời KOL/MCN, nhận đề xuất từ Sàn chiến dịch',
      'Duyệt nội dung kèm kết quả KOL Safety',
      'Theo dõi số liệu bài đăng cơ bản',
    ],
  },
  {
    key: 'STANDARD',
    name: 'Tiêu chuẩn',
    priceLabel: 'Sẽ công bố',
    description: 'Dành cho nhãn hàng chạy chiến dịch thường xuyên.',
    features: [
      'Mọi tính năng gói Dùng thử',
      'Nhiều chiến dịch chạy song song',
      'Báo cáo hiệu quả chiến dịch chi tiết',
      'Hỗ trợ ưu tiên',
    ],
  },
  {
    key: 'ENTERPRISE',
    name: 'Doanh nghiệp',
    priceLabel: 'Sẽ công bố',
    description: 'Dành cho doanh nghiệp và agency quản lý nhiều nhãn hàng.',
    features: [
      'Mọi tính năng gói Tiêu chuẩn',
      'Nhiều thành viên và phân quyền',
      'Chuyên viên phụ trách riêng',
      'Tuỳ chỉnh quy trình duyệt nội dung',
    ],
  },
];

export interface CurrentPlan {
  plan: PlanInfo;
  /** When the plan was set; absent for the default trial. */
  since?: number;
}
