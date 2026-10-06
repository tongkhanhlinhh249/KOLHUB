// Pure helpers of the Brand campaign screens: money / date formatting, list filters and tab counts,
// URL params, booking grouping, content / post collections and labels. No React here (unit-tested).
import {
  BOOKING_STATUS_LABEL,
  normalizeText,
  PRE_ACCEPT_STATUSES,
  type BookingAction,
  type BookingActionKey,
  type BookingActor,
  type BookingItemView,
  type BookingStatus,
  type BookingView,
  type CampaignStatus,
  type CampaignType,
  type CampaignView,
  type CampaignVisibility,
  type ContentSubmission,
  type InviteResult,
  type InviteSkipReason,
} from '../../services';
import type { Tone } from '../shared/StatusBadges';

export const CAMPAIGNS_PATH = '/chien-dich';
export const CAMPAIGN_CREATE_PATH = `${CAMPAIGNS_PATH}/tao`;
export const campaignPath = (id: string) => `${CAMPAIGNS_PATH}/${encodeURIComponent(id)}`;
export const campaignEditPath = (id: string) => `${campaignPath(id)}/sua`;

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** 120000000 → "120.000.000" (vi-VN grouping, no currency). */
export function groupDigits(n: number): string {
  const v = Math.max(0, Math.round(n));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 120000000 → "120.000.000 ₫". */
export function formatVnd(n: number): string {
  return `${groupDigits(n)} ₫`;
}

/** Booking total: "Chờ báo giá" when 0 (invite without price). */
export function formatPrice(n: number): string {
  return n > 0 ? formatVnd(n) : 'Chờ báo giá';
}

/** Price of a booking in lists: the fixed reward for "Tuyển nhiều KOL" (cash + product), else the negotiated total. */
export function bookingPriceText(b: Pick<BookingView, 'price' | 'reward' | 'campaign'>): string {
  if (b.campaign.type !== 'OPEN_RECRUITMENT') return formatPrice(b.price);
  const r = b.reward ?? b.campaign.recruitment?.reward;
  if (!r) return 'Phần thưởng cố định';
  const parts: string[] = [];
  if (r.cash > 0) parts.push(formatVnd(r.cash));
  if (r.product) parts.push(r.product.name);
  return parts.join(' + ');
}

/** Text typed in a VND field → integer, or undefined when empty. Non-digits are ignored. */
export function parseVndInput(text: string): number | undefined {
  const digits = (text ?? '').replace(/\D/g, '');
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : undefined;
}

/** Re-format what the user typed: "1200000" → "1.200.000"; empty stays empty. */
export function formatVndInput(text: string): string {
  const n = parseVndInput(text);
  return n === undefined ? '' : groupDigits(n);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' → 'dd/MM/yyyy' ('' when missing / malformed). */
export function formatIsoDay(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** "01/10/2026 – 31/10/2026", one side only, or "Chưa đặt lịch". */
export function formatDateRange(start?: string, end?: string): string {
  const a = formatIsoDay(start);
  const b = formatIsoDay(end);
  if (a && b) return `${a} – ${b}`;
  if (a) return `Từ ${a}`;
  if (b) return `Đến ${b}`;
  return 'Chưa đặt lịch';
}

/** Epoch ms → 'dd/MM/yyyy'. */
export function formatDayMs(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Epoch ms → 'HH:mm dd/MM/yyyy'. */
export function formatDayTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${formatDayMs(ms)}`;
}

/** Countdown of a SENT / APPLIED booking: "Hết hạn sau 3 ngày", "Hết hạn hôm nay", "Đã hết hạn". */
export function expiryText(expiresAt: number, now: number): string {
  const left = expiresAt - now;
  if (left <= 0) return 'Đã hết hạn';
  const days = Math.floor(left / 86_400_000);
  if (days >= 1) return `Hết hạn sau ${days} ngày`;
  const hours = Math.max(1, Math.floor(left / 3_600_000));
  return `Hết hạn sau ${hours} giờ`;
}

// ---------------------------------------------------------------------------
// Campaign list (/chien-dich)
// ---------------------------------------------------------------------------

export type CampaignTab = 'all' | CampaignStatus;

export const CAMPAIGN_TABS: { key: CampaignTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'OPEN', label: 'Đang mở' },
  { key: 'RUNNING', label: 'Đang chạy' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

export const VISIBILITY_OPTIONS: { key: CampaignVisibility; label: string }[] = [
  { key: 'PRIVATE', label: 'Riêng tư' },
  { key: 'MARKETPLACE', label: 'Trên sàn' },
];

export type CampaignSort = 'updated' | 'start' | 'budget';
export const CAMPAIGN_SORTS: { key: CampaignSort; label: string }[] = [
  { key: 'updated', label: 'Cập nhật gần nhất' },
  { key: 'start', label: 'Ngày bắt đầu gần nhất' },
  { key: 'budget', label: 'Ngân sách cao nhất' },
];

export interface CampaignListQuery {
  tab: CampaignTab;
  keyword?: string;
  visibility?: CampaignVisibility;
  /** Default 'updated' (not written to the URL). */
  sort?: CampaignSort;
}

const TAB_PARAM: Record<CampaignTab, string> = {
  all: '',
  DRAFT: 'nhap',
  OPEN: 'dang-mo',
  RUNNING: 'dang-chay',
  COMPLETED: 'hoan-tat',
  CANCELLED: 'da-huy',
};
const VIS_PARAM: Record<CampaignVisibility, string> = { PRIVATE: 'rieng-tu', MARKETPLACE: 'tren-san' };

const keyOf = <K extends string>(map: Record<K, string>, v: string | null): K | undefined =>
  v ? (Object.keys(map) as K[]).find((k) => map[k] === v) : undefined;

/** ?trang-thai=dang-mo&q=…&hien-thi=tren-san → query (unknown values ignored). */
export function parseCampaignListParams(sp: URLSearchParams): CampaignListQuery {
  const q: CampaignListQuery = { tab: keyOf(TAB_PARAM, sp.get('trang-thai')) ?? 'all' };
  const kw = sp.get('q')?.trim();
  if (kw) q.keyword = kw;
  const vis = keyOf(VIS_PARAM, sp.get('hien-thi'));
  if (vis) q.visibility = vis;
  const sort = CAMPAIGN_SORTS.find((s) => s.key === sp.get('sap-xep'))?.key;
  if (sort && sort !== 'updated') q.sort = sort;
  return q;
}

export function toCampaignListParams(q: CampaignListQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.tab !== 'all') sp.set('trang-thai', TAB_PARAM[q.tab]);
  if (q.keyword?.trim()) sp.set('q', q.keyword.trim());
  if (q.visibility) sp.set('hien-thi', VIS_PARAM[q.visibility]);
  if (q.sort && q.sort !== 'updated') sp.set('sap-xep', q.sort);
  return sp;
}

/** Keyword (name / objective / brief, accent-insensitive) + visibility; the status tab is left out. */
export function matchesCampaign(c: Pick<CampaignView, 'name' | 'objective' | 'brief' | 'visibility'>, q: CampaignListQuery): boolean {
  if (q.visibility && c.visibility !== q.visibility) return false;
  const kw = normalizeText(q.keyword ?? '');
  return !kw || normalizeText(`${c.name} ${c.objective} ${c.brief}`).includes(kw);
}

export function countCampaignTabs<T extends Pick<CampaignView, 'name' | 'objective' | 'brief' | 'visibility' | 'status'>>(
  list: T[],
  q: CampaignListQuery,
): Record<CampaignTab, number> {
  const out: Record<CampaignTab, number> = { all: 0, DRAFT: 0, OPEN: 0, RUNNING: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const c of list) {
    if (!matchesCampaign(c, q)) continue;
    out.all++;
    out[c.status]++;
  }
  return out;
}

type ListRow = Pick<CampaignView, 'name' | 'objective' | 'brief' | 'visibility' | 'status' | 'updatedAt' | 'budget' | 'startDate'>;

/** Tab + filters, then sorted: updated (newest first) · start (earliest start first, undated last) · budget (desc). */
export function applyCampaignQuery<T extends ListRow>(list: T[], q: CampaignListQuery): T[] {
  const out = list.filter((c) => matchesCampaign(c, q) && (q.tab === 'all' || c.status === q.tab));
  const sort = q.sort ?? 'updated';
  return out.sort((a, b) => {
    if (sort === 'budget') return b.budget - a.budget || b.updatedAt - a.updatedAt;
    if (sort === 'start') {
      const x = a.startDate ?? '9999-99-99';
      const y = b.startDate ?? '9999-99-99';
      return x < y ? -1 : x > y ? 1 : b.updatedAt - a.updatedAt;
    }
    return b.updatedAt - a.updatedAt;
  });
}

export function hasCampaignFilters(q: CampaignListQuery): boolean {
  return !!q.keyword?.trim() || !!q.visibility;
}

// ---------------------------------------------------------------------------
// Campaign status / actions
// ---------------------------------------------------------------------------

export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, Tone> = {
  DRAFT: 'neutral',
  OPEN: 'info',
  RUNNING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export interface CampaignActions {
  edit: boolean;
  publish: boolean;
  close: boolean;
  cancel: boolean;
  invite: boolean;
}

/**
 * Header actions per status (spec §3): edit DRAFT/OPEN, publish DRAFT, close OPEN/RUNNING, cancel until ended.
 * "Tuyển nhiều KOL" has no private invites (KOL/MCN apply on the Sàn).
 */
export function campaignActions(status: CampaignStatus, type: CampaignType = 'BOOKING'): CampaignActions {
  const live = status === 'DRAFT' || status === 'OPEN' || status === 'RUNNING';
  return {
    edit: status === 'DRAFT' || status === 'OPEN',
    publish: status === 'DRAFT',
    close: status === 'OPEN' || status === 'RUNNING',
    cancel: live,
    invite: live && type !== 'OPEN_RECRUITMENT',
  };
}

/** Campaigns a KOL can be invited to (DRAFT is opened on the first invite). */
export const INVITABLE_STATUSES: CampaignStatus[] = ['DRAFT', 'OPEN', 'RUNNING'];

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  SENT: 'info',
  APPLIED: 'info',
  NEGOTIATING: 'warning',
  ACCEPTED: 'success',
  IN_PRODUCTION: 'warning',
  CONTENT_REVIEW: 'warning',
  CONTENT_APPROVED: 'success',
  PUBLISHED: 'info',
  VERIFIED: 'success',
  COMPLETED: 'success',
  DECLINED: 'neutral',
  CANCELLED: 'error',
  EXPIRED: 'neutral',
};

/** Actions that mean "the brand has to do something now" (rating and contract are optional). */
const BRAND_TODO: BookingActionKey[] = ['ACCEPT', 'SELECT', 'REVIEW_CONTENT', 'MARK_PAID', 'MARK_PRODUCT_SENT'];

export function needsBrandAction(b: Pick<BookingView, 'allowedActions'>): boolean {
  return b.allowedActions.some((a) => BRAND_TODO.includes(a));
}

/** Short reason shown next to the "Cần bạn xử lý" marker. */
export function brandTodoLabel(b: Pick<BookingView, 'allowedActions' | 'origin' | 'status'>): string | null {
  if (b.allowedActions.includes('SELECT')) return 'Chọn ứng viên';
  if (b.allowedActions.includes('REVIEW_CONTENT')) return 'Duyệt nội dung';
  if (b.allowedActions.includes('MARK_PRODUCT_SENT')) return 'Gửi sản phẩm';
  if (b.allowedActions.includes('MARK_PAID')) return 'Xác nhận thanh toán';
  if (b.allowedActions.includes('ACCEPT')) return b.status === 'APPLIED' ? 'Xem đề xuất' : 'Trả lời báo giá';
  return null;
}

/** Number of bookings waiting for the brand, per campaign id. */
export function pendingByCampaign(bookings: Pick<BookingView, 'campaignId' | 'allowedActions'>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of bookings) if (needsBrandAction(b)) out[b.campaignId] = (out[b.campaignId] ?? 0) + 1;
  return out;
}

const STATUS_ORDER: BookingStatus[] = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[];

/** Non-empty status groups in lifecycle order: [{ status, label, count }]. */
export function countByBookingStatus(bookings: Pick<BookingView, 'status'>[]): { status: BookingStatus; label: string; count: number }[] {
  const counts = new Map<BookingStatus, number>();
  for (const b of bookings) counts.set(b.status, (counts.get(b.status) ?? 0) + 1);
  return STATUS_ORDER.filter((s) => counts.has(s)).map((s) => ({ status: s, label: BOOKING_STATUS_LABEL[s], count: counts.get(s)! }));
}

/** Bookings sorted for the Booking tab: the ones waiting for the brand first, then most recently updated. */
export function sortBookings<T extends Pick<BookingView, 'allowedActions' | 'updatedAt'>>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(needsBrandAction(b)) - Number(needsBrandAction(a)) || b.updatedAt - a.updatedAt);
}

/** Marketplace proposals still to decide (APPLIED, or an application in negotiation). */
export function openApplications<T extends Pick<BookingView, 'origin' | 'status'>>(list: T[]): T[] {
  return list.filter((b) => b.origin === 'APPLICATION' && PRE_ACCEPT_STATUSES.includes(b.status));
}

export interface DraftEntry {
  booking: BookingView;
  draft: ContentSubmission;
  item?: BookingItemView;
}

/** Drafts of every booking, newest first; `pendingOnly` keeps the ones waiting for review. */
export function collectDrafts(bookings: BookingView[], pendingOnly = false): DraftEntry[] {
  const out: DraftEntry[] = [];
  for (const b of bookings) {
    for (const d of b.contents) {
      if (d.kind !== 'DRAFT' || (pendingOnly && d.status !== 'PENDING')) continue;
      out.push({ booking: b, draft: d, item: d.itemId ? b.items.find((i) => i.id === d.itemId) : undefined });
    }
  }
  return out.sort((a, b) => b.draft.submittedAt - a.draft.submittedAt);
}

export interface PostEntry {
  booking: BookingView;
  post: ContentSubmission;
  item?: BookingItemView;
}

/** Verified posts of every booking (cancelled bookings excluded), newest first. */
export function collectPosts(bookings: BookingView[]): PostEntry[] {
  const out: PostEntry[] = [];
  for (const b of bookings) {
    if (b.status === 'CANCELLED') continue;
    for (const p of b.contents) {
      if (p.kind !== 'POST' || p.verifiedAt === undefined) continue;
      out.push({ booking: b, post: p, item: p.itemId ? b.items.find((i) => i.id === p.itemId) : undefined });
    }
  }
  return out.sort((a, b) => (b.post.verifiedAt ?? 0) - (a.post.verifiedAt ?? 0));
}

export interface MetricTotals {
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  /** Interactions / views × 100 over all posts, 2 decimals. */
  engagementRate: number;
}

export function metricTotals(posts: Pick<ContentSubmission, 'metrics'>[]): MetricTotals {
  const t: MetricTotals = { posts: posts.length, views: 0, likes: 0, comments: 0, shares: 0, engagementRate: 0 };
  for (const p of posts) {
    t.views += p.metrics?.views ?? 0;
    t.likes += p.metrics?.likes ?? 0;
    t.comments += p.metrics?.comments ?? 0;
    t.shares += p.metrics?.shares ?? 0;
  }
  t.engagementRate = t.views ? Math.round(((t.likes + t.comments + t.shares) / t.views) * 10_000) / 100 : 0;
  return t;
}

/** 4.25 → "4,25%". */
export function formatPercent(n: number): string {
  return `${String(Math.round(n * 100) / 100).replace('.', ',')}%`;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

const ACTION_LABEL: Record<BookingAction, string> = {
  INVITED: 'Gửi lời mời',
  ITEMS_ADDED: 'Thêm KOL vào lời mời',
  APPLIED: 'Gửi đề xuất ứng tuyển',
  COUNTERED: 'Báo giá mới',
  ITEMS_ASSIGNED: 'Cập nhật KOL và kênh',
  APPLICATION_UPDATED: 'Sửa đề xuất ứng tuyển',
  ACCEPTED: 'Chốt booking',
  DECLINED: 'Từ chối',
  CANCELLED: 'Huỷ booking',
  DRAFT_SUBMITTED: 'Gửi nội dung nháp',
  CONTENT_APPROVED: 'Duyệt nội dung',
  CHANGES_REQUESTED: 'Yêu cầu chỉnh sửa',
  POST_SUBMITTED: 'Gửi link bài đăng',
  POST_VERIFIED: 'Xác minh bài đăng',
  PAYMENT_MARKED: 'Đánh dấu đã thanh toán',
  PAYMENT_CONFIRMED: 'Xác nhận đã nhận thanh toán',
  CONTRACT_ATTACHED: 'Đính kèm hợp đồng',
  CONTRACT_REMOVED: 'Gỡ tệp hợp đồng',
  RATED: 'Đánh giá',
  SELECTED: 'Chọn tham gia chiến dịch',
  NOT_SELECTED: 'Không được chọn',
  PRODUCT_SENT: 'Đã gửi sản phẩm',
  PRODUCT_RECEIVED: 'Đã nhận sản phẩm',
};

export function historyLabel(action: BookingAction): string {
  return ACTION_LABEL[action] ?? action;
}

/** Who did it, from the brand's point of view. */
export function actorLabel(by: BookingActor, supplierName: string): string {
  if (by === 'BRAND') return 'Bạn';
  if (by === 'SYSTEM') return 'Hệ thống';
  return supplierName;
}

// ---------------------------------------------------------------------------
// Detail page URL (/chien-dich/:id?tab=…&booking=…)
// ---------------------------------------------------------------------------

export type DetailTab = 'tong-quan' | 'booking' | 'ung-tuyen' | 'noi-dung' | 'bao-cao' | 'hoi-dap';
export const DETAIL_TABS: DetailTab[] = ['tong-quan', 'booking', 'ung-tuyen', 'noi-dung', 'bao-cao', 'hoi-dap'];

/** Unknown tab → Tổng quan; "Ứng tuyển" and "Hỏi đáp" only exist for marketplace campaigns. */
export function parseDetailTab(value: string | null, marketplace: boolean): DetailTab {
  const t = DETAIL_TABS.find((x) => x === value) ?? 'tong-quan';
  return (t === 'ung-tuyen' || t === 'hoi-dap') && !marketplace ? 'tong-quan' : t;
}

/** Returns a copy of `prev` with `key` set (or removed when value is null / the default). */
export function withParam(prev: URLSearchParams, key: string, value: string | null): URLSearchParams {
  const sp = new URLSearchParams(prev);
  if (value === null || value === '') sp.delete(key);
  else sp.set(key, value);
  return sp;
}

// ---------------------------------------------------------------------------
// Invite result
// ---------------------------------------------------------------------------

export const SKIP_REASON_LABEL: Record<InviteSkipReason, string> = {
  NOT_FOUND: 'Không tìm thấy KOL hoặc hồ sơ không còn hiển thị',
  ALREADY_INVITED: 'KOL đã có trong chiến dịch',
};

export interface InviteRoute {
  bookingId: string;
  supplierType: 'MCN' | 'KOL';
  supplierName: string;
  kols: string[];
  created: boolean;
}

/**
 * Where each invited KOL went: one line per booking touched ("Qua MCN Sao Việt: A, B" / "Trực tiếp: C").
 * Only KOLs that were part of this call (`kolIds`) are listed for an extended booking.
 */
export function inviteRoutes(result: InviteResult, kolIds: string[]): InviteRoute[] {
  const asked = new Set(kolIds);
  return result.bookings.map((b) => ({
    bookingId: b.id,
    supplierType: b.supplierType,
    supplierName: b.supplier.name,
    kols: b.items.filter((it) => asked.has(it.kolId)).map((it) => it.displayName),
    // A booking created by this call ends with INVITED; an extended one with ITEMS_ADDED.
    created: b.history[b.history.length - 1]?.action === 'INVITED',
  }));
}

/** One-line toast text for an invite result. */
export function inviteSummary(result: InviteResult): string {
  const parts: string[] = [];
  if (result.created) parts.push(`${result.created} lời mời mới`);
  if (result.updated) parts.push(`${result.updated} lời mời được bổ sung KOL`);
  if (result.skipped.length) parts.push(`${result.skipped.length} KOL bỏ qua`);
  return parts.length ? parts.join(' · ') : 'Không có lời mời nào được gửi';
}
