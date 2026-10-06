// Pure helpers of the supplier side (MCN / independent KOL) of the campaign booking beta:
// money, deadlines, stage tabs, status wording, timeline labels and URL state.
import {
  BOOKING_STATUS_LABEL,
  DELIVERABLE_TYPES,
  MARKETPLACE_SORTS,
  PLATFORMS,
  type BookingAction,
  type BookingActor,
  type BookingEvent,
  type BookingOrigin,
  type BookingStatus,
  type BookingView,
  type CampaignMatch,
  type CampaignType,
  type RecruitPhase,
  type Deliverable,
  type DeliverableType,
  type KolCategory,
  type MarketplaceFilters,
  type MarketplaceSort,
  type Platform,
  type RoleKey,
} from '../../services';
import type { Tone } from '../shared/StatusBadges';
import { RECRUIT_STAGE_LABEL, recruitStage, recruitStageTone } from '../shared/recruitView';
import { CAMPAIGNS_PATH, MARKETPLACE_PATH, SUPPLIER_CAMPAIGNS_PATH } from '../../auth/roles';

const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** 120000000 → "120.000.000 ₫". */
export function formatVnd(n: number): string {
  const v = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
}

/** Compact budget for the 3-column Sàn card: 150000000 → "150 triệu ₫", 1250000000 → "1,25 tỷ ₫"; below 1 triệu → formatVnd. */
export function formatVndShort(n: number): string {
  const v = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  const unit = v >= 1_000_000_000 ? { d: 1_000_000_000, w: 'tỷ' } : v >= 1_000_000 ? { d: 1_000_000, w: 'triệu' } : null;
  if (!unit) return formatVnd(v);
  const x = Math.round((v / unit.d) * 100) / 100;
  return `${String(x).replace('.', ',')} ${unit.w} ₫`;
}

/** Price field text: "12.000.000" while typing (digits only, grouped); '' when empty. */
export function formatVndInput(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
}

/** "12.000.000" / "12000000 ₫" → 12000000; '' → 0. */
export function parseVndInput(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/** Booking price as the supplier reads it: 0 = the brand has not proposed a price yet. */
export function priceText(price: number): string {
  return price > 0 ? formatVnd(price) : 'Chờ báo giá';
}

// ---------------------------------------------------------------------------
// Dates and countdowns
// ---------------------------------------------------------------------------

function localDay(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 'YYYY-MM-DD' → "dd/MM/yyyy" ('' when invalid). */
export function formatDay(iso: string | undefined): string {
  const d = iso ? localDay(iso) : null;
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** "01/10/2026 – 31/10/2026" (either side may be missing). */
export function formatDayRange(start?: string, end?: string): string {
  const a = formatDay(start);
  const b = formatDay(end);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

/** Epoch ms → "dd/MM/yyyy HH:mm" (local). */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Whole local calendar days from `now` to the deadline day (0 = today, < 0 = passed). */
export function daysUntil(iso: string, now: number): number | null {
  const d = localDay(iso);
  if (!d) return null;
  const today = new Date(now);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((d.getTime() - t0) / DAY);
}

export interface Countdown {
  text: string;
  /** ≤ 3 days left: show as urgent. */
  urgent: boolean;
  passed: boolean;
}

/** Apply deadline ('YYYY-MM-DD', end of that day): "còn 5 ngày", "Hạn chót hôm nay", "Đã hết hạn"; null when none. */
export function deadlineCountdown(applyDeadline: string | undefined, now: number): Countdown | null {
  if (!applyDeadline) return null;
  const n = daysUntil(applyDeadline, now);
  if (n === null) return null;
  if (n < 0) return { text: 'Đã hết hạn', urgent: false, passed: true };
  if (n === 0) return { text: 'Hạn chót hôm nay', urgent: true, passed: false };
  return { text: `còn ${n} ngày`, urgent: n <= 3, passed: false };
}

/** Expiry of a pending invite / application (epoch ms): "còn 3 ngày", "còn 5 giờ", "Đã hết hạn". */
export function expiryCountdown(expiresAt: number | undefined, now: number): Countdown | null {
  if (expiresAt === undefined) return null;
  const left = expiresAt - now;
  if (left <= 0) return { text: 'Đã hết hạn', urgent: false, passed: true };
  if (left < DAY) {
    const h = Math.max(1, Math.floor(left / 3_600_000));
    return { text: `còn ${h} giờ`, urgent: true, passed: false };
  }
  const d = Math.floor(left / DAY);
  return { text: `còn ${d} ngày`, urgent: d <= 1, passed: false };
}

// ---------------------------------------------------------------------------
// Deliverables, platforms
// ---------------------------------------------------------------------------

export const deliverableLabel = (t: DeliverableType) => DELIVERABLE_TYPES.find((d) => d.key === t)?.label ?? t;
export const platformName = (p: Platform) => PLATFORMS.find((x) => x.key === p)?.label ?? p;

/** [{VIDEO, tiktok, 2}, {POST, facebook, 1}] → "2 Video TikTok · 1 Bài đăng Facebook". */
export function deliverablesSummary(list: Pick<Deliverable, 'type' | 'platform' | 'quantity'>[]): string {
  return list.map((d) => `${d.quantity} ${deliverableLabel(d.type)} ${platformName(d.platform)}`).join(' · ');
}

// ---------------------------------------------------------------------------
// Booking stages (tabs) and status wording
// ---------------------------------------------------------------------------

export type BookingTab = 'can-xu-ly' | 'dang-trao-doi' | 'dang-thuc-hien' | 'cho-thanh-toan' | 'hoan-tat' | 'da-dong';

export const BOOKING_TABS: { key: BookingTab; label: string }[] = [
  { key: 'can-xu-ly', label: 'Cần xử lý' },
  { key: 'dang-trao-doi', label: 'Đang trao đổi' },
  { key: 'dang-thuc-hien', label: 'Đang thực hiện' },
  { key: 'cho-thanh-toan', label: 'Chờ thanh toán' },
  { key: 'hoan-tat', label: 'Hoàn tất' },
  { key: 'da-dong', label: 'Đã đóng' },
];

type TabInput = Pick<BookingView, 'status' | 'awaiting' | 'payment'>;

/**
 * Stage of a booking for the supplier (each booking in exactly one tab):
 * anything the supplier must act on now (needsSupplier: answer, deliver a draft/post, confirm a payment)
 * → Cần xử lý, so the tab always matches the "N cần bạn xử lý" count; otherwise by stage:
 * pre-deal waiting for the brand → Đang trao đổi;
 * ACCEPTED … PUBLISHED → Đang thực hiện; VERIFIED → Chờ thanh toán; COMPLETED → Hoàn tất; DECLINED / CANCELLED / EXPIRED → Đã đóng.
 */
export function tabOf(b: TabInput): BookingTab {
  if (needsSupplier(b)) return 'can-xu-ly';
  switch (b.status) {
    case 'SENT':
    case 'APPLIED':
    case 'NEGOTIATING':
      return b.awaiting === 'SUPPLIER' ? 'can-xu-ly' : 'dang-trao-doi';
    case 'ACCEPTED':
    case 'IN_PRODUCTION':
    case 'CONTENT_REVIEW':
    case 'CONTENT_APPROVED':
    case 'PUBLISHED':
      return 'dang-thuc-hien';
    case 'VERIFIED':
      return 'cho-thanh-toan';
    case 'COMPLETED':
      return 'hoan-tat';
    default:
      return 'da-dong';
  }
}

export function countByTab(list: TabInput[]): Record<BookingTab, number> {
  const out = Object.fromEntries(BOOKING_TABS.map((t) => [t.key, 0])) as Record<BookingTab, number>;
  for (const b of list) out[tabOf(b)]++;
  return out;
}

type NeedsInput = Pick<BookingView, 'status' | 'awaiting' | 'payment'> & {
  origin?: BookingOrigin;
  acceptedAt?: number;
  price?: number;
  campaign?: { type?: CampaignType };
};

/** An application to a "Tuyển nhiều KOL" campaign (stages instead of negotiation). */
export const isRecruitBooking = (b: { origin?: BookingOrigin; campaign?: { type?: CampaignType } }) =>
  b.origin === 'APPLICATION' && b.campaign?.type === 'OPEN_RECRUITMENT';

/**
 * The supplier has something to do now: answer an invite / counter-offer, deliver a draft or post,
 * or confirm a payment the brand marked. (Rating is optional and not counted.)
 */
export function needsSupplier(b: NeedsInput): boolean {
  switch (b.status) {
    case 'SENT':
    case 'APPLIED':
    case 'NEGOTIATING':
      return b.awaiting === 'SUPPLIER';
    case 'ACCEPTED':
    case 'IN_PRODUCTION':
    case 'CONTENT_APPROVED':
    case 'PUBLISHED':
      return true;
    case 'VERIFIED':
      return !!b.payment.brandMarkedAt && !b.payment.supplierConfirmedAt;
    default:
      return false;
  }
}

/**
 * Status label from the supplier's point of view. Open recruitment reads as stages: Đã ứng tuyển → Đã được chọn →
 * Đang thực hiện → Hoàn tất / Không được chọn (payment steps keep their own wording).
 */
export function supplierStatusLabel(b: NeedsInput): string {
  if (isRecruitBooking(b) && b.status !== 'VERIFIED') return RECRUIT_STAGE_LABEL[recruitStage(b)];
  if (b.status === 'VERIFIED' && b.price === 0) return b.payment.brandMarkedAt ? 'Hoàn tất' : 'Chờ Nhãn hàng xác nhận hoàn tất';
  if (b.status === 'SENT') return 'Lời mời mới';
  if (b.status === 'APPLIED') return 'Chờ Nhãn hàng phản hồi';
  if (b.status === 'NEGOTIATING') return b.awaiting === 'SUPPLIER' ? 'Nhãn hàng trả giá' : 'Chờ Nhãn hàng phản hồi giá';
  if (b.status === 'VERIFIED') return b.payment.brandMarkedAt ? 'Nhãn hàng đã thanh toán' : 'Chờ Nhãn hàng thanh toán';
  return BOOKING_STATUS_LABEL[b.status];
}

export function statusTone(b: NeedsInput): Tone {
  if (isRecruitBooking(b) && !needsSupplier(b)) return recruitStageTone(recruitStage(b));
  const s: BookingStatus = b.status;
  if (s === 'DECLINED') return 'error';
  if (s === 'CANCELLED' || s === 'EXPIRED') return 'neutral';
  if (s === 'COMPLETED' || s === 'CONTENT_APPROVED' || s === 'ACCEPTED') return 'success';
  if (needsSupplier(b)) return 'warning';
  return 'info';
}

const dm = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');

/** What the supplier should do next (one sentence), or null. */
export function nextStepText(
  b: Pick<BookingView, 'status' | 'awaiting' | 'payment' | 'price' | 'items' | 'allowedActions'> & {
    origin?: BookingOrigin;
    campaign?: { type?: CampaignType; phase?: RecruitPhase; recruitment?: BookingView['campaign']['recruitment'] };
  },
): string | null {
  const missingChannel = b.items.some((i) => !i.channelId);
  const can = (a: BookingView['allowedActions'][number]) => b.allowedActions.includes(a);
  const product = can('CONFIRM_PRODUCT_RECEIVED') ? ' Nhãn hàng đã gửi sản phẩm: bấm "Đã nhận sản phẩm" khi bạn nhận được hàng.' : '';
  if (isRecruitBooking(b)) {
    const t = b.campaign?.recruitment?.timeline;
    if (b.status === 'APPLIED') {
      return b.campaign?.phase === 'SELECT'
        ? `Nhãn hàng đang chọn KOL. Kết quả có trước hết ngày ${dm(t?.selectEnd)}.`
        : `Bạn đã ứng tuyển. Nhãn hàng chọn KOL trong giai đoạn Chọn lọc (${dm(t?.selectStart)} – ${dm(t?.selectEnd)}). Bạn vẫn sửa hoặc rút được đến hết giai đoạn Ứng tuyển.`;
    }
    if (b.status === 'DECLINED' || b.status === 'EXPIRED') return 'Rất tiếc, bạn không được chọn ở chiến dịch này. Hãy xem các chiến dịch khác trên Sàn.';
    if (b.status === 'ACCEPTED') {
      return can('SUBMIT_POST')
        ? `Bạn đã được chọn! Đăng bài theo yêu cầu (chiến dịch không cần duyệt nháp) rồi gửi link bài đăng.${product}`
        : `Bạn đã được chọn! Sản xuất nội dung và nộp bản nháp để Nhãn hàng duyệt.${product}`;
    }
  }
  if (b.status === 'VERIFIED' && b.price === 0) return 'Bài đăng đã xác minh. Chờ Nhãn hàng xác nhận hoàn tất.';
  if (product && ['IN_PRODUCTION', 'CONTENT_REVIEW', 'CONTENT_APPROVED', 'PUBLISHED', 'VERIFIED', 'COMPLETED'].includes(b.status)) {
    return `${nextStepText({ ...b, allowedActions: b.allowedActions.filter((a) => a !== 'CONFIRM_PRODUCT_RECEIVED') }) ?? ''}${product}`.trim();
  }
  switch (b.status) {
    case 'SENT':
    case 'NEGOTIATING':
    case 'APPLIED':
      if (b.awaiting !== 'SUPPLIER') return 'Đang chờ Nhãn hàng phản hồi đề xuất của bạn.';
      if (missingChannel) return 'Một số hạng mục chưa có kênh đăng. Hãy giao KOL/kênh trước khi chấp nhận.';
      if (b.price <= 0) return 'Nhãn hàng chưa đưa giá. Hãy báo giá (Trả giá) để Nhãn hàng xác nhận.';
      return b.status === 'SENT'
        ? 'Nhãn hàng mời bạn tham gia chiến dịch. Chấp nhận, trả giá hoặc từ chối lời mời.'
        : 'Nhãn hàng đề xuất giá mới. Chấp nhận, trả giá tiếp hoặc từ chối.';
    case 'ACCEPTED':
      return can('SUBMIT_POST')
        ? 'Booking đã chốt. Đăng bài theo yêu cầu (chiến dịch không cần duyệt nháp) rồi gửi link bài đăng.'
        : 'Booking đã chốt. Sản xuất nội dung và nộp bản nháp để Nhãn hàng duyệt.';
    case 'IN_PRODUCTION':
      return 'Nhãn hàng yêu cầu chỉnh sửa. Xem góp ý và nộp lại bản nháp.';
    case 'CONTENT_REVIEW':
      return 'Bản nháp đang chờ Nhãn hàng duyệt.';
    case 'CONTENT_APPROVED':
      return 'Nội dung đã được duyệt. Đăng bài và gửi link bài đăng để hệ thống xác minh.';
    case 'PUBLISHED':
      return 'Còn hạng mục chưa có bài đăng được xác minh. Gửi link bài đăng cho các hạng mục còn lại.';
    case 'VERIFIED':
      return b.payment.brandMarkedAt
        ? 'Nhãn hàng đã đánh dấu thanh toán. Kiểm tra tài khoản và xác nhận đã nhận tiền.'
        : 'Bài đăng đã xác minh. Đang chờ Nhãn hàng thanh toán.';
    case 'COMPLETED':
      return b.allowedActions.includes('RATE') ? 'Booking đã hoàn tất. Bạn có thể đánh giá Nhãn hàng (chỉ lưu nội bộ).' : null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

const ACTOR: Record<BookingActor, string> = { BRAND: 'Nhãn hàng', SUPPLIER: 'Bạn', SYSTEM: 'Hệ thống' };

const ACTION: Record<BookingAction, string> = {
  INVITED: 'gửi lời mời',
  ITEMS_ADDED: 'mời thêm KOL',
  APPLIED: 'gửi đề xuất ứng tuyển',
  COUNTERED: 'đề xuất giá',
  ITEMS_ASSIGNED: 'cập nhật KOL/kênh',
  APPLICATION_UPDATED: 'sửa đề xuất ứng tuyển',
  ACCEPTED: 'chốt booking',
  DECLINED: 'từ chối',
  CANCELLED: 'huỷ booking',
  DRAFT_SUBMITTED: 'nộp bản nháp',
  CONTENT_APPROVED: 'duyệt nội dung',
  CHANGES_REQUESTED: 'yêu cầu chỉnh sửa',
  POST_SUBMITTED: 'gửi link bài đăng',
  POST_VERIFIED: 'xác minh bài đăng',
  PAYMENT_MARKED: 'đánh dấu đã thanh toán',
  PAYMENT_CONFIRMED: 'xác nhận đã nhận tiền',
  CONTRACT_ATTACHED: 'đính kèm hợp đồng',
  CONTRACT_REMOVED: 'gỡ hợp đồng',
  RATED: 'gửi đánh giá',
  SELECTED: 'chọn bạn tham gia chiến dịch',
  NOT_SELECTED: 'không chọn đề xuất này',
  PRODUCT_SENT: 'đã gửi sản phẩm',
  PRODUCT_RECEIVED: 'đã nhận sản phẩm',
};

/** "Nhãn hàng đề xuất giá" / "Bạn nộp bản nháp" / "Hệ thống xác minh bài đăng". */
export function eventLabel(e: Pick<BookingEvent, 'by' | 'action'>): string {
  return `${ACTOR[e.by]} ${ACTION[e.action]}`;
}

/** Timeline for the supplier, newest first; the brand's rating event is internal and hidden. */
export function supplierTimeline(history: BookingEvent[]): BookingEvent[] {
  return history.filter((e) => !(e.action === 'RATED' && e.by === 'BRAND')).sort((a, b) => b.at - a.at);
}

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

export type BudgetRange = 'duoi-50' | '50-100' | '100-200' | 'tren-200';
const M = 1_000_000;
export const BUDGET_RANGES: { key: BudgetRange; label: string; min?: number; max?: number }[] = [
  { key: 'duoi-50', label: 'Dưới 50 triệu', max: 50 * M - 1 },
  { key: '50-100', label: '50 – 100 triệu', min: 50 * M, max: 100 * M },
  { key: '100-200', label: '100 – 200 triệu', min: 100 * M + 1, max: 200 * M },
  { key: 'tren-200', label: 'Trên 200 triệu', min: 200 * M + 1 },
];

/** ?loai= values of the campaign type filter. */
export type TypeParam = 'booking' | 'tuyen-nhieu';
export const TYPE_FILTERS: { key: TypeParam; label: string; type: CampaignType }[] = [
  { key: 'booking', label: 'Booking riêng', type: 'BOOKING' },
  { key: 'tuyen-nhieu', label: 'Tuyển nhiều KOL', type: 'OPEN_RECRUITMENT' },
];

export interface MarketplaceQuery {
  keyword?: string;
  type?: TypeParam;
  category?: KolCategory;
  platform?: Platform;
  budget?: BudgetRange;
  sort: MarketplaceSort;
}

const SORT_KEYS = MARKETPLACE_SORTS.map((s) => s.key);
const PLATFORM_KEYS = PLATFORMS.map((p) => p.key);
const BUDGET_KEYS = BUDGET_RANGES.map((b) => b.key);

/** ?q=…&linh-vuc=…&nen-tang=tiktok&ngan-sach=50-100&sap-xep=budget (unknown values → defaults; sort "Phù hợp nhất"). */
export function parseMarketplaceParams(p: URLSearchParams, categories: readonly string[]): MarketplaceQuery {
  const sort = p.get('sap-xep') as MarketplaceSort | null;
  const q: MarketplaceQuery = { sort: sort && SORT_KEYS.includes(sort) ? sort : 'match' };
  const kw = p.get('q')?.trim();
  if (kw) q.keyword = kw;
  const cat = p.get('linh-vuc');
  if (cat && categories.includes(cat)) q.category = cat as KolCategory;
  const pf = p.get('nen-tang') as Platform | null;
  if (pf && PLATFORM_KEYS.includes(pf)) q.platform = pf;
  const b = p.get('ngan-sach') as BudgetRange | null;
  if (b && BUDGET_KEYS.includes(b)) q.budget = b;
  const t = p.get('loai') as TypeParam | null;
  if (t && TYPE_FILTERS.some((x) => x.key === t)) q.type = t;
  return q;
}

/** Write the query into `prev`, keeping unrelated params (e.g. ?chien-dich=). */
export function mergeMarketplaceParams(prev: URLSearchParams, q: MarketplaceQuery): URLSearchParams {
  const next = new URLSearchParams(prev);
  const set = (k: string, v: string | undefined) => (v ? next.set(k, v) : next.delete(k));
  set('q', q.keyword?.trim() || undefined);
  set('linh-vuc', q.category);
  set('nen-tang', q.platform);
  set('ngan-sach', q.budget);
  set('loai', q.type);
  set('sap-xep', q.sort === 'match' ? undefined : q.sort);
  return next;
}

// --- Sàn v2: tabs, match, brand ---

export type MarketplaceTab = 'tat-ca' | 'da-luu' | 'da-ung-tuyen';
export const MARKETPLACE_TABS: { key: MarketplaceTab; label: string }[] = [
  { key: 'tat-ca', label: 'Tất cả' },
  { key: 'da-luu', label: 'Đã lưu' },
  { key: 'da-ung-tuyen', label: 'Đã ứng tuyển' },
];
const MARKETPLACE_TAB_KEYS = MARKETPLACE_TABS.map((t) => t.key);

/** ?tab=da-luu | da-ung-tuyen (default "Tất cả", not written to the URL). */
export function parseMarketplaceTab(p: URLSearchParams): MarketplaceTab {
  const t = p.get('tab') as MarketplaceTab | null;
  return t && MARKETPLACE_TAB_KEYS.includes(t) ? t : 'tat-ca';
}

/** Value of ?tab= for `withParam` (null = default tab). */
export const marketplaceTabParam = (t: MarketplaceTab): string | null => (t === 'tat-ca' ? null : t);

/** "Khớp 86%". */
export const matchLabel = (score: number) => `Khớp ${Math.round(score)}%`;

/** ≥ 70 strong fit, ≥ 40 partial, below: weak. */
export function matchTone(score: number): Tone {
  if (score >= 70) return 'success';
  if (score >= 40) return 'info';
  return 'neutral';
}

/** Account createdAt (ISO) → "Tháng 9/2026" ('' when invalid). */
export function memberSinceText(iso: string): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

export const marketplaceFilterCount = (q: MarketplaceQuery) => [q.type, q.category, q.platform, q.budget].filter(Boolean).length;
export const hasMarketplaceFilters = (q: MarketplaceQuery) => !!q.keyword || marketplaceFilterCount(q) > 0;

/** URL query → service filters. */
export function toMarketplaceFilters(q: MarketplaceQuery): MarketplaceFilters {
  const f: MarketplaceFilters = { sort: q.sort };
  if (q.keyword) f.keyword = q.keyword;
  if (q.category) f.category = q.category;
  if (q.platform) f.platform = q.platform;
  const type = TYPE_FILTERS.find((x) => x.key === q.type)?.type;
  if (type) f.type = type;
  const range = BUDGET_RANGES.find((b) => b.key === q.budget);
  if (range?.min !== undefined) f.budgetMin = range.min;
  if (range?.max !== undefined) f.budgetMax = range.max;
  return f;
}

const TAB_KEYS = BOOKING_TABS.map((t) => t.key);

/** ?tab=dang-thuc-hien (default "Cần xử lý"). */
export function parseBookingTab(p: URLSearchParams): BookingTab {
  const t = p.get('tab') as BookingTab | null;
  return t && TAB_KEYS.includes(t) ? t : 'can-xu-ly';
}

/**
 * Tab when the URL has no ?tab=: the stage of the linked booking (?booking=), else "Cần xử lý" when it has
 * bookings, else the first non-empty stage (so an MCN with only work in progress does not land on an empty tab).
 */
export function defaultBookingTab(list: (TabInput & { id: string })[], linkedId?: string | null): BookingTab {
  const linked = linkedId ? list.find((b) => b.id === linkedId) : undefined;
  if (linked) return tabOf(linked);
  const counts = countByTab(list);
  if (counts['can-xu-ly'] > 0) return 'can-xu-ly';
  return BOOKING_TABS.find((t) => counts[t.key] > 0)?.key ?? 'can-xu-ly';
}

export const MARKETPLACE_DETAIL_PARAM = 'chien-dich';
export const BOOKING_DETAIL_PARAM = 'booking';

/** Link to a booking's detail sheet on the KOL/MCN "Chiến dịch" page /chien-dich-cua-toi (its stage tab selected). */
export function bookingDetailPath(id: string, tab?: BookingTab): string {
  const p = new URLSearchParams();
  if (tab) p.set('tab', tab);
  p.set(BOOKING_DETAIL_PARAM, id);
  return `${SUPPLIER_CAMPAIGNS_PATH}?${p.toString()}`;
}

/** Link to a campaign's detail sheet on the Sàn (/san). */
export const marketplaceDetailPath = (id: string) => `${MARKETPLACE_PATH}?${MARKETPLACE_DETAIL_PARAM}=${encodeURIComponent(id)}`;

/** Who is looking at the Sàn: guest (public brief only), KOL / MCN (match, save, apply) or Brand (read-only). */
export type MarketplaceViewer = 'guest' | 'supplier' | 'brand';

export function marketplaceViewerOf(role: RoleKey): MarketplaceViewer {
  if (role === 'kolhub.guest') return 'guest';
  return role === 'kolhub.user.biz' ? 'brand' : 'supplier';
}

/** Guest "Đăng nhập để ứng tuyển": log in, then come back to the campaign's detail on the Sàn. */
export const loginToApplyPath = (campaignId: string) => `/dang-nhap?returnTo=${encodeURIComponent(marketplaceDetailPath(campaignId))}`;

/** Brand's own campaign page (from "Của bạn" on the Sàn). */
export const brandCampaignPath = (campaignId: string) => `${CAMPAIGNS_PATH}/${encodeURIComponent(campaignId)}`;

/** Set or clear one param, keeping the others. */
export function withParam(prev: URLSearchParams, key: string, value: string | null): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (value) next.set(key, value);
  else next.delete(key);
  return next;
}

// ---------------------------------------------------------------------------
// Sàn card (3-column grid)
// ---------------------------------------------------------------------------

/** Categories shown on a card (first `max`) and how many are hidden behind "+n". */
export function cardCategories(categories: KolCategory[], max = 2): { shown: KolCategory[]; more: number } {
  return { shown: categories.slice(0, max), more: Math.max(0, categories.length - max) };
}

/** The one match line of a card: top reason, else what is missing most, else a neutral note. */
export function cardMatchLine(match: CampaignMatch): { text: string; kind: 'reason' | 'missing' } {
  if (match.reasons[0]) return { text: match.reasons[0], kind: 'reason' };
  return { text: match.missing[0] ?? 'Chưa đủ dữ liệu để đánh giá mức phù hợp.', kind: 'missing' };
}
