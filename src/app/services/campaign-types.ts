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

export type DeliverableType = 'VIDEO' | 'SHORTS' | 'REELS' | 'POST' | 'STORY' | 'LIVESTREAM';
/** Generic labels; use `deliverableLabel(type, platform)` for the platform's own wording (TikTok "Nhật ký"). */
export const DELIVERABLE_TYPES: { key: DeliverableType; label: string }[] = [
  { key: 'VIDEO', label: 'Video' },
  { key: 'SHORTS', label: 'Shorts' },
  { key: 'REELS', label: 'Reels' },
  { key: 'POST', label: 'Bài đăng' },
  { key: 'STORY', label: 'Story' },
  { key: 'LIVESTREAM', label: 'Livestream' },
];

/** Content types each platform offers, in display order (the first is the default when the platform changes). */
export const PLATFORM_DELIVERABLES: Record<Platform, DeliverableType[]> = {
  tiktok: ['VIDEO', 'STORY'],
  facebook: ['POST', 'VIDEO', 'REELS', 'STORY', 'LIVESTREAM'],
  instagram: ['POST', 'REELS', 'STORY', 'LIVESTREAM'],
  youtube: ['VIDEO', 'SHORTS', 'LIVESTREAM'],
};

export const isDeliverableForPlatform = (type: DeliverableType, platform: Platform) => PLATFORM_DELIVERABLES[platform]?.includes(type) ?? false;

/** "Video", "Bài đăng", "Nhật ký" (TikTok's name for stories)… */
export function deliverableLabel(type: DeliverableType, platform?: Platform): string {
  if (type === 'STORY' && platform === 'tiktok') return 'Nhật ký';
  return DELIVERABLE_TYPES.find((d) => d.key === type)?.label ?? type;
}

export interface Deliverable {
  type: DeliverableType;
  platform: Platform;
  /** 1–100. */
  quantity: number;
}

/**
 * EP-02 §4.3 "nhóm đầu việc": the deliverables of one platform, with their own slots and fixed reward. One slot =
 * one booking of one channel in that group; the reward covers every deliverable of the group (not × quantity).
 */
export interface DeliverableGroup {
  platform: Platform;
  /** 1–1000 bookings (channels) to recruit for this group. */
  slots: number;
  /** Fixed reward per booking: cash VND (0 = product only) and/or a product / experience. No quotes, no ranges. */
  reward: CampaignReward;
}
export const GROUP_SLOTS_MAX = 1000;

/** EP-02 §4.2 "Quyền sử dụng nội dung": where and how long the brand may reuse the KOL's content. */
export type UsageChannel = 'BRAND_SOCIAL' | 'ADS' | 'WEBSITE' | 'OFFLINE';
export const USAGE_CHANNELS: { key: UsageChannel; label: string }[] = [
  { key: 'BRAND_SOCIAL', label: 'Kênh mạng xã hội của nhãn hàng' },
  { key: 'ADS', label: 'Quảng cáo trả phí' },
  { key: 'WEBSITE', label: 'Website, sàn thương mại điện tử' },
  { key: 'OFFLINE', label: 'Ấn phẩm, điểm bán' },
];
export const USAGE_MONTHS_MAX = 24;
export const USAGE_NOTE_MAX = 500;
/** Absent on a campaign = no reuse requested (the brand may only share the original post). Never unlimited. */
export interface UsageRights {
  /** 1–24 months from the post date. */
  months: number;
  channels: UsageChannel[];
  /** The KOL does not work with competing brands during `months`. */
  exclusive: boolean;
  note?: string;
}

/** EP-02 §4.1 "Nhãn hàng được quảng bá": the brand being promoted and, for an Agency, its proof of representation. */
export interface PromotedBrand {
  name: string;
  /** true = the organisation's own brand; false = an Agency promoting a client (needs proof for Admin review). */
  own: boolean;
  /** Authorisation letter / contract (PDF, JPG, PNG, WebP ≤ 10 MB). */
  proof?: StoredFile;
  proofNote?: string;
}
export const PROMOTED_BRAND_MAX = 120;
export const PROOF_NOTE_MAX = 500;

/** Apply deadline time when none is set (Vietnam time, UTC+7). */
export const DEADLINE_TIME_DEFAULT = '23:59';

/** PRIVATE = invite only; MARKETPLACE = also listed on "Sàn chiến dịch" while open for applications. */
export type CampaignVisibility = 'PRIVATE' | 'MARKETPLACE';
export const CAMPAIGN_VISIBILITY_LABEL: Record<CampaignVisibility, string> = {
  PRIVATE: 'Riêng tư',
  MARKETPLACE: 'Trên Sàn chiến dịch',
};

/**
 * EP-02 §5 (kiểm duyệt trước đăng bắt buộc): DRAFT → (gửi đăng) PENDING_REVIEW → (Admin) OPEN | NEEDS_FIX | REJECTED;
 * NEEDS_FIX / REJECTED → (sửa, gửi lại) PENDING_REVIEW; PENDING_REVIEW → (rút) DRAFT.
 * OPEN ("Đang tuyển") → CLOSED ("Đã đóng tuyển") when the brand closes recruitment or the apply window ends;
 * CLOSED → COMPLETED once nothing is left to handle. Any non-final status → CANCELLED (with a reason; not while a
 * booking is in progress). A DRAFT never submitted can be deleted.
 */
export type CampaignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_FIX' | 'REJECTED' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  NEEDS_FIX: 'Cần bổ sung',
  REJECTED: 'Không được duyệt',
  OPEN: 'Đang tuyển',
  CLOSED: 'Đã đóng tuyển',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};
/** Never published: not shown to suppliers anywhere. */
export const UNPUBLISHED_STATUSES: CampaignStatus[] = ['DRAFT', 'PENDING_REVIEW', 'NEEDS_FIX', 'REJECTED'];

export const CAMPAIGN_REASON_MAX = 1000;

/** One step of the campaign's review / lifecycle log (EP-02 §6, lịch sử phiên bản và phản hồi). */
export interface CampaignLogEntry {
  at: number;
  by: 'BRAND' | 'ADMIN' | 'SYSTEM';
  action:
    | 'SUBMITTED'
    | 'WITHDRAWN'
    | 'APPROVED'
    | 'NEEDS_FIX'
    | 'REJECTED'
    | 'CLOSED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REVISION_SUBMITTED'
    | 'REVISION_APPROVED'
    | 'REVISION_REJECTED'
    | 'HIDDEN'
    | 'RESTORED';
  note?: string;
}

/**
 * C2 (EP-02 §7): an edit of an OPEN campaign waiting for Admin review. The public campaign keeps the old version;
 * `pausesApplications` = it changes the terms of a campaign without applications, so new applications stop meanwhile.
 */
export interface CampaignRevision {
  patch: CampaignPatch;
  submittedAt: number;
  pausesApplications: boolean;
}

// ---------------------------------------------------------------------------
// Campaign type: "Booking riêng" (negotiated) or "Tuyển nhiều KOL" (open recruitment, REVU-style)
// ---------------------------------------------------------------------------

/**
 * BOOKING: invite / apply with a price, then negotiate (default; campaigns without `type`).
 * OPEN_RECRUITMENT: fixed reward per KOL, N slots, a 4-phase timeline (Ứng tuyển → Chọn lọc → Đăng bài → Đánh giá);
 * KOL/MCN apply without a quote and the brand picks up to N winners during "Chọn lọc".
 */
export type CampaignType = 'BOOKING' | 'OPEN_RECRUITMENT';
export const CAMPAIGN_TYPES: { key: CampaignType; label: string; description: string }[] = [
  { key: 'BOOKING', label: 'Booking 1 KOL', description: 'Mời và nhận ứng tuyển từ nhiều KOL, chọn 1 KOL phù hợp để hợp tác.' },
  { key: 'OPEN_RECRUITMENT', label: 'Booking nhiều KOL', description: 'Mời và nhận ứng tuyển từ nhiều KOL, chọn nhiều KOL phù hợp để hợp tác.' },
];
export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = { BOOKING: 'Booking 1 KOL', OPEN_RECRUITMENT: 'Booking nhiều KOL' };

/** Slots of an open-recruitment campaign: 1–RECRUIT_SLOTS_MAX. */
export const RECRUIT_SLOTS_MAX = 500;
export const PRODUCT_NAME_MAX = 150;
export const PRODUCT_NOTE_MAX = 500;

/** Product given to each selected KOL (record only: the brand ships it outside KOL Hub). */
export interface ProductReward {
  name: string;
  /** VND, > 0. */
  value: number;
  note?: string;
}

/** Reward per selected KOL: cash and/or a product (at least one). */
export interface CampaignReward {
  /** VND per KOL, ≥ 0 (0 = product only). */
  cash: number;
  product?: ProductReward;
}

/**
 * The 4 phases as local-day ranges ('YYYY-MM-DD', inclusive), in order without overlap:
 * applyStart ≤ applyEnd < selectStart ≤ selectEnd < postStart ≤ postEnd < reviewStart ≤ reviewEnd.
 * '' = not set yet (drafts only).
 */
export interface RecruitmentTimeline {
  applyStart: string;
  applyEnd: string;
  selectStart: string;
  selectEnd: string;
  postStart: string;
  postEnd: string;
  reviewStart: string;
  reviewEnd: string;
}

export interface Recruitment {
  /** Number of KOL/MCN the brand will pick (0 = not set yet, drafts only). */
  slots: number;
  reward: CampaignReward;
  timeline: RecruitmentTimeline;
}

/** Current phase of an open-recruitment campaign (a gap between two phases belongs to the next one). */
export type RecruitPhase = 'UPCOMING' | 'APPLY' | 'SELECT' | 'POST' | 'REVIEW' | 'ENDED';
export type RecruitMilestone = Exclude<RecruitPhase, 'UPCOMING' | 'ENDED'>;
export const RECRUIT_MILESTONES: { key: RecruitMilestone; label: string; start: keyof RecruitmentTimeline; end: keyof RecruitmentTimeline }[] = [
  { key: 'APPLY', label: 'Ứng tuyển', start: 'applyStart', end: 'applyEnd' },
  { key: 'SELECT', label: 'Chọn lọc', start: 'selectStart', end: 'selectEnd' },
  { key: 'POST', label: 'Đăng bài', start: 'postStart', end: 'postEnd' },
  { key: 'REVIEW', label: 'Đánh giá', start: 'reviewStart', end: 'reviewEnd' },
];
export const RECRUIT_PHASE_LABEL: Record<RecruitPhase, string> = {
  UPCOMING: 'Sắp mở',
  APPLY: 'Ứng tuyển',
  SELECT: 'Chọn lọc',
  POST: 'Đăng bài',
  REVIEW: 'Đánh giá',
  ENDED: 'Đã kết thúc',
};

// --- survey, terms, target ---

export const SURVEY_MAX = 10;
export const TERMS_MAX = 10;
export const SURVEY_TEXT_MAX = 300;
export const ANSWER_MAX = 1000;

/** A question the applicant answers in the apply form (short text). */
export interface SurveyQuestion {
  id: string;
  text: string;
  required: boolean;
}

/** A term the applicant must tick to apply. */
export interface CampaignTerm {
  id: string;
  text: string;
}

/** Terms prefilled in a new campaign. */
export const DEFAULT_TERMS: string[] = [
  'Giữ bài đăng ở chế độ công khai tối thiểu 6 tháng.',
  'Cho phép Nhãn hàng dùng lại bài đăng để quảng bá trên kênh của Nhãn hàng.',
];

export type TargetGender = 'ANY' | 'FEMALE' | 'MALE';
export const TARGET_GENDER_LABEL: Record<TargetGender, string> = { ANY: 'Không giới hạn', FEMALE: 'Nữ', MALE: 'Nam' };
export const TARGET_AGE_MIN = 16;
export const TARGET_AGE_MAX = 80;

/** "Điều kiện tham gia" (shown to applicants; the categories live on the campaign). */
export interface CampaignTarget {
  ageMin?: number;
  ageMax?: number;
  gender?: TargetGender;
  /** Followers of the publishing channel, ≥ 0. */
  minFollowers?: number;
}

/** Provinces / cities of Việt Nam (34 after the 2025 merger) for regions and shipping addresses. */
export const VN_PROVINCES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Hải Phòng',
  'Đà Nẵng',
  'Cần Thơ',
  'Huế',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hoà',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hoá',
  'Tuyên Quang',
  'Vĩnh Long',
] as const;

export const SHIPPING_ADDRESS_MAX = 300;

/** Where the brand ships the product reward (required to apply when the campaign gives a product). */
export interface ShippingInfo {
  province: string;
  address: string;
  /** Normalized Vietnamese mobile number. */
  phone: string;
}

export interface ApplicationAnswer {
  questionId: string;
  /** The question as asked (kept if the brand edits it later). */
  question: string;
  answer: string;
}

/** What the applicant filled in besides the proposal: survey answers, accepted terms, shipping. */
export interface ApplicationDetails {
  answers: ApplicationAnswer[];
  /** Texts of the terms ticked (all of them). */
  acceptedTerms: string[];
  termsAcceptedAt?: number;
  shipping?: ShippingInfo;
}

/** Record-only shipping of the product reward. */
export interface ProductShipment {
  /** Brand marked "Đã gửi sản phẩm". */
  sentAt?: number;
  /** Supplier confirmed "Đã nhận sản phẩm". */
  receivedAt?: number;
}

// --- public Q&A ---

export const QA_QUESTION_MAX = 500;
export const QA_ANSWER_MAX = 1000;

/** A public question on a marketplace campaign; visible to everyone once the brand answered it. */
export interface CampaignQA {
  id: string;
  campaignId: string;
  askerAccountId: string;
  /** Display name of the KOL / MCN who asked. */
  askerName: string;
  question: string;
  answer?: string;
  answeredAt?: number;
  createdAt: number;
}

/** Q&A as a viewer sees it (no account id). */
export interface CampaignQAView {
  id: string;
  askerName: string;
  question: string;
  answer?: string;
  answeredAt?: number;
  createdAt: number;
  /** Asked by the viewer (unanswered questions are only shown to the asker and the brand). */
  mine: boolean;
}

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
  /** VND; 0 = not entered yet (drafts only). Derived: Σ group slots × (cash + product value) (recruit: slots × reward). */
  budget: number;
  /** 'YYYY-MM-DD'; optional while DRAFT. */
  startDate?: string;
  endDate?: string;
  platforms: Platform[];
  categories: KolCategory[];
  deliverables: Deliverable[];
  contentRules: string;
  visibility: CampaignVisibility;
  /**
   * "Ảnh chiến dịch": cover shown on the marketplace card / detail (16:9). JPG, PNG or WebP ≤ 10 MB;
   * `thumbnail` is a data URL (uploads) or an image URL (seed).
   */
  cover?: StoredFile;
  /** 'YYYY-MM-DD', last day suppliers may apply (Vietnam time). */
  applyDeadline?: string;
  /** 'HH:mm' on `applyDeadline`, Vietnam time (UTC+7); absent = 23:59. Applications stop when now ≥ that moment. */
  applyDeadlineTime?: string;
  /** EP-02 §4.1: brand being promoted (absent = the organisation's own brand). */
  promotedBrand?: PromotedBrand;
  /** EP-02 §4.2: content reuse requested by the brand (absent = none). */
  usageRights?: UsageRights;
  /** Absent = BOOKING. */
  type?: CampaignType;
  /** OPEN_RECRUITMENT only: slots, reward per KOL and the 4-phase timeline. */
  recruitment?: Recruitment;
  /** "Duyệt nháp" (Workflow): KOL submits a draft for review before posting. Absent = on. */
  draftReview?: boolean;
  /** BOOKING only: one entry per platform of `deliverables` — slots and fixed reward (EP-02: no price negotiation). */
  groups?: DeliverableGroup[];
  /** "Hợp đồng": off = no contract file on bookings and no apply terms. Absent = on. */
  contract?: boolean;
  /** Provinces the campaign targets; empty / absent = "Toàn quốc". */
  regions?: string[];
  /** "Điều kiện tham gia". */
  target?: CampaignTarget;
  /** Survey questions of the apply form. */
  survey?: SurveyQuestion[];
  /** Terms the applicant must accept. */
  terms?: CampaignTerm[];
  status: CampaignStatus;
  /** First time the campaign became OPEN. */
  publishedAt?: number;
  /** When recruitment closed (CLOSED, by the brand or at the end of the apply window). */
  recruitmentClosedAt?: number;
  /** When it became COMPLETED or CANCELLED. */
  closedAt?: number;
  /** Last Admin feedback (NEEDS_FIX / REJECTED reason), shown to the brand. */
  reviewNote?: string;
  /** Review / lifecycle log. */
  log?: CampaignLogEntry[];
  /** Edit of an OPEN campaign waiting for Admin review (C2). */
  pendingRevision?: CampaignRevision;
  /** COMPLETED without any confirmed collaboration: "Không phát sinh hợp tác". */
  noCollaboration?: boolean;
  /** Admin hid the campaign from the Sàn (Công bố lên sàn §12.3): no listing, no new applications; bookings kept. */
  hiddenAt?: number;
  hiddenReason?: string;
  cancelReason?: string;
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
  /** 'HH:mm' (Vietnam time); null clears it (23:59). */
  applyDeadlineTime?: string | null;
  promotedBrand?: PromotedBrand | null;
  usageRights?: UsageRights | null;
  /** JPG / PNG / WebP ≤ 10 MB (4803 `cover` otherwise); null removes it. */
  cover?: StoredFile | null;
  /** Cannot change once the campaign has bookings (4803 `type`). */
  type?: CampaignType;
  /**
   * OPEN_RECRUITMENT: dates / budget / apply deadline / visibility are derived from it (start = applyStart,
   * end = reviewEnd, applyDeadline = applyEnd, budget = slots × (cash + product value), MARKETPLACE).
   */
  recruitment?: Recruitment | null;
  draftReview?: boolean;
  /** BOOKING: slots + fixed reward per platform group; budget is derived from it. null clears it. */
  groups?: DeliverableGroup[] | null;
  contract?: boolean;
  regions?: string[];
  target?: CampaignTarget | null;
  /** Questions without `id` get one. */
  survey?: { id?: string; text: string; required: boolean }[];
  terms?: { id?: string; text: string }[];
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

export type MarketplaceSort = 'match' | 'newest' | 'deadline';
/** Reward kind of a campaign on the Sàn: "Tiền", "Sản phẩm/trải nghiệm" or both. */
export type RewardKind = 'CASH' | 'PRODUCT' | 'BOTH';
export const REWARD_KIND_LABEL: Record<RewardKind, string> = { CASH: 'Tiền', PRODUCT: 'Sản phẩm/trải nghiệm', BOTH: 'Tiền và sản phẩm' };
export const MARKETPLACE_SORTS: { key: MarketplaceSort; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'deadline', label: 'Sắp hết hạn' },
  { key: 'match', label: 'Phù hợp nhất' },
];

export interface MarketplaceFilters {
  /** Accent-insensitive match on the campaign name or the brand (promoted brand or operating company). */
  keyword?: string;
  category?: KolCategory;
  platform?: Platform;
  /** "Booking riêng" / "Tuyển nhiều KOL". */
  type?: CampaignType;
  /** Target province; campaigns for "Toàn quốc" always match. */
  region?: string;
  /** Reward kind: cash only, product/experience only, or both. */
  reward?: RewardKind;
  /**
   * Default 'newest' (first publish time desc; edits never bump a campaign). 'match' = match score desc, then newest;
   * 'deadline' = soonest applyDeadline first, none last.
   */
  sort?: MarketplaceSort;
}

/**
 * The signed-in supplier as the matcher sees it: channels it could put in a proposal (verified badge, active;
 * MCN: MCN channels assigned to an approved KOL; KOL: its own channels), each with the categories / activity
 * fields of the KOL behind it.
 */
export interface SupplierMatchContext {
  type: SupplierType;
  channels: { id: string; platform: Platform; followers: number; kolAccountId: string; categories: string[] }[];
  /** MCN only: verified, active MCN channels not assigned to any KOL yet (cannot be proposed). */
  unassignedPlatforms?: Platform[];
}

/** "Phù hợp với bạn": how well a marketplace campaign fits the signed-in supplier (see spec "Sàn v2"). */
export interface CampaignMatch {
  /** 0–100. */
  score: number;
  /** Why it fits, most important first (e.g. "Khớp lĩnh vực Ẩm thực", "Có 3 kênh TikTok đã xác thực"). */
  reasons: string[];
  /** What is missing (e.g. "Chưa có kênh YouTube đã xác thực"). */
  missing: string[];
}

/** Public facts about the brand behind a marketplace campaign (no contact data, no ratings). */
export interface MarketplaceBrandInfo {
  company: string;
  /** Brand accounts register with an OTP-verified company email (free mail domains are refused, BR-45). */
  businessEmailVerified: boolean;
  /** Campaigns the brand has published (OPEN at least once). */
  campaignsPosted: number;
  /** Bookings of the brand that reached COMPLETED on KOLHUB. */
  completedBookings: number;
  /** Account creation time (ISO). */
  memberSince: string;
}

/** A bookmark of a marketplace campaign by a supplier account. */
export interface SavedCampaign {
  accountId: string;
  campaignId: string;
  savedAt: number;
}

/** A campaign as suppliers see it on the marketplace (no brand-internal data). */
export interface MarketplaceCampaign {
  id: string;
  name: string;
  objective: string;
  brief: string;
  startDate: string;
  endDate: string;
  platforms: Platform[];
  categories: KolCategory[];
  deliverables: Deliverable[];
  contentRules: string;
  applyDeadline?: string;
  applyDeadlineTime?: string;
  /** Exact end of applications (ms), Vietnam time. */
  applyDeadlineAt?: number;
  /** Brand being promoted; `viaAgency` = run by an Agency on its behalf (proof stays internal). */
  promotedBrand?: { name: string; viaAgency: boolean };
  usageRights?: UsageRights;
  /** "Ảnh chiến dịch" (16:9 cover), when the brand added one. */
  cover?: StoredFile;
  publishedAt: number;
  brand: { company: string };
  /** "Số KOL cần tuyển": Booking 1 KOL = 1, Booking nhiều KOL = slots. Budget, application and selection counts stay internal (§13). */
  kolTarget: number;
  /** The viewer's own occupying booking on this campaign, if any (invite or application). */
  myBooking?: { id: string; status: BookingStatus; origin: BookingOrigin };
  /** Fit for the viewer (listMarketplace / listSaved / getMarketplaceItem / listApplied); undefined for a brand viewer or a guest. */
  match?: CampaignMatch;
  /** The viewer bookmarked it ("Đã lưu"). */
  saved?: boolean;
  /** Still open for applications (false only in listApplied for campaigns that closed since). */
  accepting?: boolean;
  /** "Đã đóng tuyển" (or completed): public page, no apply button (EP-02 §8). */
  recruitmentClosed?: boolean;
  /** COMPLETED: the public page is kept as history with the "Hoàn tất" label. */
  completed?: boolean;
  /** An edit of the campaign is under Admin review: new applications are paused meanwhile (EP-02 §7). */
  paused?: boolean;
  /** getMarketplaceItem only: the "Nhãn hàng" block. */
  brandInfo?: MarketplaceBrandInfo;
  /** The viewer is the brand that owns this campaign (only ever true for a BIZ viewer). */
  mine?: boolean;
  type: CampaignType;
  /** OPEN_RECRUITMENT only. */
  recruitment?: Recruitment;
  /** OPEN_RECRUITMENT only: current phase. */
  phase?: RecruitPhase;
  draftReview: boolean;
  /** BOOKING: slots and fixed reward per platform group. */
  groups: DeliverableGroup[];
  /** "Hợp đồng". */
  contract: boolean;
  /** Empty = Toàn quốc. */
  regions: string[];
  target?: CampaignTarget;
  survey: SurveyQuestion[];
  terms: CampaignTerm[];
}

/** "Đã ứng tuyển": one of the viewer's applications with its campaign. */
export interface AppliedCampaign {
  booking: Pick<BookingView, 'id' | 'status' | 'awaiting' | 'payment' | 'price' | 'origin' | 'expiresAt' | 'createdAt' | 'updatedAt' | 'allowedActions' | 'campaign'>;
  campaign: MarketplaceCampaign;
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export type SupplierType = 'MCN' | 'KOL';
export type BookingOrigin = 'INVITE' | 'APPLICATION';
export type BookingParty = 'BRAND' | 'SUPPLIER';
export type BookingActor = BookingParty | 'SYSTEM';

/**
 * Fixed reward per group (EP-02): no counter-offers. NEGOTIATING only remains in data from before.
 * INVITE:      SENT ─(supplier accepts)→ ACCEPTED
 * APPLICATION: APPLIED ─(brand accepts)→ ACCEPTED
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
  | 'APPLICATION_UPDATED'
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
  | 'RATED'
  /** Open recruitment: picked by the brand (→ ACCEPTED at the fixed reward). */
  | 'SELECTED'
  /** Open recruitment: not picked (→ DECLINED, "Không được chọn"). */
  | 'NOT_SELECTED'
  | 'PRODUCT_SENT'
  | 'PRODUCT_RECEIVED';

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
  /** POST only: the supplier hid it from "Bài đã đăng" on its public profile (default shown). */
  hiddenOnProfile?: boolean;
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
  /** Total cash VND for the whole booking, fixed by the campaign's group rewards (Σ per channel × group); 0 = product only. */
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
  /** Survey answers, accepted terms and shipping address given when applying. */
  application?: ApplicationDetails;
  /** Open recruitment: the campaign reward when the applicant was picked (price = reward.cash). */
  reward?: CampaignReward;
  /** Product reward shipping (record only). */
  shipment?: ProductShipment;
  acceptedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** What the viewer may do now; every mutation checks the same list (KOLHUB-4805 otherwise). */
export type BookingActionKey =
  | 'ACCEPT'
  | 'DECLINE'
  | 'CANCEL'
  | 'ASSIGN_ITEMS'
  /** Supplier edits its APPLIED application (items, price, note) until the brand answers. */
  | 'EDIT_APPLICATION'
  | 'SUBMIT_DRAFT'
  | 'REVIEW_CONTENT'
  | 'SUBMIT_POST'
  | 'MARK_PAID'
  | 'CONFIRM_PAID'
  | 'RATE'
  | 'ATTACH_CONTRACT'
  /** Brand picks an open-recruitment applicant (during "Chọn lọc", within the slots). */
  | 'SELECT'
  /** Brand records "Đã gửi sản phẩm". */
  | 'MARK_PRODUCT_SENT'
  /** Supplier records "Đã nhận sản phẩm". */
  | 'CONFIRM_PRODUCT_RECEIVED';

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
  applyDeadlineTime?: string;
  platforms: Platform[];
  deliverables: Deliverable[];
  brand: BrandRef;
  promotedBrand?: { name: string; viaAgency: boolean };
  usageRights?: UsageRights;
  type: CampaignType;
  /** OPEN_RECRUITMENT only. */
  recruitment?: Recruitment;
  phase?: RecruitPhase;
  draftReview: boolean;
  groups: DeliverableGroup[];
  contract: boolean;
  regions: string[];
  /** "Điều kiện tham gia" (with regions). */
  categories: KolCategory[];
  target?: CampaignTarget;
  /** "Ảnh chiến dịch" (16:9 cover), when the brand added one. */
  cover?: StoredFile;
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
  note?: string;
  /** The price is the group's fixed reward (no price input). Default: the campaign's first deliverable. `platform` defaults to that deliverable's platform. */
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
  /** No price: BOOKING uses the group rewards, OPEN_RECRUITMENT the campaign reward. */
  note?: string;
  /** Survey answers by question id (required questions must be answered; 4803 `answers`). */
  answers?: Record<string, string>;
  /** Ids of the accepted terms: all of them are required (4803 `terms`). */
  acceptedTerms?: string[];
  /** Required when the campaign rewards a product (4803 `shipping` / `phone`). */
  shipping?: ShippingInfo;
}

/** Result of a bulk pick / reject on an open-recruitment campaign. */
export interface SelectionResult {
  /** Bookings changed by this call (brand view). */
  bookings: BookingView[];
  /** Picked so far after this call. */
  selected: number;
  slots: number;
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
