// Pure helpers of the Brand campaign screens: money / date formatting, list filters and tab counts,
// URL params, booking grouping, content / post collections and labels. No React here (unit-tested).
import {
  applyDeadlineAt,
  BOOKING_STATUS_LABEL,
  fixedRewardOf,
  IN_PROGRESS_STATUSES,
  normalizeText,
  PRE_ACCEPT_STATUSES,
  type BookingAction,
  type BookingActionKey,
  type BookingActor,
  type BookingItemView,
  type BookingStatus,
  type BookingView,
  type Campaign,
  type CampaignLogEntry,
  type CampaignReward,
  type CampaignStatus,
  type CampaignType,
  type CampaignView,
  type CampaignVisibility,
  type ContentSubmission,
  type DeliverableGroup,
  type InviteResult,
  type InviteSkipReason,
} from '../../services';
import type { AriaSort } from '../shared/tableView';
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

/** Cash of a booking; 0 = product / experience only (fixed reward per group, no quote). */
export function formatPrice(n: number): string {
  return n > 0 ? formatVnd(n) : 'Chỉ sản phẩm';
}

/** "5.000.000 ₫ + Bình giữ nhiệt" / "Bình giữ nhiệt" / "5.000.000 ₫". */
export function rewardText(r: CampaignReward): string {
  const parts: string[] = [];
  if (r.cash > 0) parts.push(formatVnd(r.cash));
  if (r.product) parts.push(r.product.name);
  return parts.join(' + ') || formatVnd(0);
}

/** Price of a booking in lists: the fixed reward for "Tuyển nhiều KOL" (cash + product), else the negotiated total. */
export function bookingPriceText(b: Pick<BookingView, 'price' | 'reward' | 'campaign' | 'items'>): string {
  if (b.campaign.type !== 'OPEN_RECRUITMENT') {
    // Booking riêng: the fixed rewards of the groups the booking covers (snapshot once accepted).
    if (b.reward) return rewardText(b.reward);
    return b.campaign.groups?.length ? rewardText(fixedRewardOf(b.campaign, b.items)) : formatPrice(b.price);
  }
  const r = b.reward ?? b.campaign.recruitment?.reward;
  return r ? rewardText(r) : 'Phần thưởng cố định';
}

/** Fixed reward of one group, per booking: "5.000.000 ₫/booking + Bình giữ nhiệt". */
export function groupRewardText(g: DeliverableGroup): string {
  return g.reward.cash > 0 ? `${formatVnd(g.reward.cash)}/booking${g.reward.product ? ` + ${g.reward.product.name}` : ''}` : rewardText(g.reward);
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
  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { key: 'NEEDS_FIX', label: 'Cần bổ sung' },
  { key: 'REJECTED', label: 'Không được duyệt' },
  { key: 'OPEN', label: 'Đang tuyển' },
  { key: 'CLOSED', label: 'Đã đóng tuyển' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

export const VISIBILITY_OPTIONS: { key: CampaignVisibility; label: string }[] = [
  { key: 'PRIVATE', label: 'Riêng tư' },
  { key: 'MARKETPLACE', label: 'Trên sàn' },
];

export type CampaignSort = 'updated' | 'deadline' | 'start' | 'budget';
export const CAMPAIGN_SORTS: { key: CampaignSort; label: string }[] = [
  { key: 'updated', label: 'Cập nhật gần nhất' },
  { key: 'deadline', label: 'Sắp hết hạn tuyển' },
  { key: 'start', label: 'Ngày bắt đầu gần nhất' },
  { key: 'budget', label: 'Ngân sách cao nhất' },
];
/** Sort menu of the campaign list (UI/UX tối ưu §3.2): "Cập nhật gần nhất" (default) and "Sắp hết hạn tuyển". */
export const CAMPAIGN_LIST_SORTS = CAMPAIGN_SORTS.filter((s) => s.key === 'updated' || s.key === 'deadline');

/**
 * Navigation groups of the list (UI/UX tối ưu §3.1). A group is not a status: "Đã đóng tuyển" stays in
 * "Đang hoạt động" because applications and collaborations may still be handled.
 */
export type CampaignGroup = 'all' | 'PREP' | 'ACTIVE' | 'DONE';
export const CAMPAIGN_GROUPS: { key: CampaignGroup; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'PREP', label: 'Chuẩn bị' },
  { key: 'ACTIVE', label: 'Đang hoạt động' },
  { key: 'DONE', label: 'Đã kết thúc' },
];
export const GROUP_STATUSES: Record<Exclude<CampaignGroup, 'all'>, CampaignStatus[]> = {
  PREP: ['DRAFT', 'PENDING_REVIEW', 'NEEDS_FIX', 'REJECTED'],
  ACTIVE: ['OPEN', 'CLOSED'],
  DONE: ['COMPLETED', 'CANCELLED'],
};
export const groupOfStatus = (s: CampaignStatus): Exclude<CampaignGroup, 'all'> =>
  (Object.keys(GROUP_STATUSES) as Exclude<CampaignGroup, 'all'>[]).find((g) => GROUP_STATUSES[g].includes(s))!;
const GROUP_PARAM: Record<CampaignGroup, string> = { all: '', PREP: 'chuan-bi', ACTIVE: 'dang-hoat-dong', DONE: 'da-ket-thuc' };

/** "Booking riêng" / "Tuyển nhiều KOL" filter (?loai=booking | tuyen-nhieu, same values as the Sàn). */
export const CAMPAIGN_TYPE_OPTIONS: { key: CampaignType; label: string }[] = [
  { key: 'BOOKING', label: 'Booking 1 KOL' },
  { key: 'OPEN_RECRUITMENT', label: 'Booking nhiều KOL' },
];
const TYPE_PARAM: Record<CampaignType, string> = { BOOKING: 'booking', OPEN_RECRUITMENT: 'tuyen-nhieu' };

export interface CampaignListQuery {
  /** Detailed status (inside "Bộ lọc"); 'all' = any. */
  tab: CampaignTab;
  /** Navigation group (tabs above the list); absent = Tất cả. */
  group?: CampaignGroup;
  /** "Cần xử lý": only campaigns with something for the brand to do. */
  todo?: boolean;
  keyword?: string;
  visibility?: CampaignVisibility;
  type?: CampaignType;
  /** Default 'updated' (not written to the URL). */
  sort?: CampaignSort;
}

const TAB_PARAM: Record<CampaignTab, string> = {
  all: '',
  DRAFT: 'nhap',
  PENDING_REVIEW: 'cho-duyet',
  NEEDS_FIX: 'can-bo-sung',
  REJECTED: 'khong-duoc-duyet',
  OPEN: 'dang-tuyen',
  CLOSED: 'da-dong-tuyen',
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
  const type = keyOf(TYPE_PARAM, sp.get('loai'));
  if (type) q.type = type;
  const sort = CAMPAIGN_SORTS.find((s) => s.key === sp.get('sap-xep'))?.key;
  if (sort && sort !== 'updated') q.sort = sort;
  const group = keyOf(GROUP_PARAM, sp.get('nhom'));
  if (group) q.group = group;
  if (sp.get('can-xu-ly') === '1') q.todo = true;
  return q;
}

export function toCampaignListParams(q: CampaignListQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.tab !== 'all') sp.set('trang-thai', TAB_PARAM[q.tab]);
  if (q.keyword?.trim()) sp.set('q', q.keyword.trim());
  if (q.visibility) sp.set('hien-thi', VIS_PARAM[q.visibility]);
  if (q.type) sp.set('loai', TYPE_PARAM[q.type]);
  if (q.sort && q.sort !== 'updated') sp.set('sap-xep', q.sort);
  if (q.group && q.group !== 'all') sp.set('nhom', GROUP_PARAM[q.group]);
  if (q.todo) sp.set('can-xu-ly', '1');
  return sp;
}

type FilterRow = Pick<CampaignView, 'name' | 'objective' | 'brief' | 'visibility' | 'type'>;

/** Keyword (name / objective / brief, accent-insensitive) + visibility + type; the status tab is left out. */
export function matchesCampaign(c: FilterRow, q: CampaignListQuery): boolean {
  if (q.visibility && c.visibility !== q.visibility) return false;
  if (q.type && (c.type ?? 'BOOKING') !== q.type) return false;
  const kw = normalizeText(q.keyword ?? '');
  return !kw || normalizeText(`${c.name} ${c.objective} ${c.brief}`).includes(kw);
}

export function countCampaignTabs<T extends FilterRow & Pick<CampaignView, 'status'>>(
  list: T[],
  q: CampaignListQuery,
): Record<CampaignTab, number> {
  const out: Record<CampaignTab, number> = { all: 0, DRAFT: 0, PENDING_REVIEW: 0, NEEDS_FIX: 0, REJECTED: 0, OPEN: 0, CLOSED: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const c of list) {
    if (!matchesCampaign(c, q)) continue;
    out.all++;
    out[c.status]++;
  }
  return out;
}

/** Per-type counts ("Tất cả" included) under the current tab, keyword and visibility; the type filter itself is left out. */
export function countCampaignTypes<T extends FilterRow & Pick<CampaignView, 'status'>>(
  list: T[],
  q: CampaignListQuery,
): Record<'all' | CampaignType, number> {
  const out: Record<'all' | CampaignType, number> = { all: 0, BOOKING: 0, OPEN_RECRUITMENT: 0 };
  const rest = { ...q, type: undefined };
  for (const c of list) {
    if (!matchesCampaign(c, rest) || (q.tab !== 'all' && c.status !== q.tab)) continue;
    out.all++;
    out[c.type ?? 'BOOKING']++;
  }
  return out;
}

type ListRow = FilterRow & Pick<CampaignView, 'id' | 'status' | 'updatedAt' | 'budget' | 'startDate' | 'applyDeadline' | 'applyDeadlineTime'>;

/** Group + detailed status + "Cần xử lý" (`todoIds`: campaigns with something to do). */
const inGroupAndStatus = (c: Pick<CampaignView, 'status' | 'id'>, q: CampaignListQuery, todoIds?: Set<string>) =>
  (q.tab === 'all' || c.status === q.tab) &&
  (!q.group || q.group === 'all' || GROUP_STATUSES[q.group].includes(c.status)) &&
  (!q.todo || !!todoIds?.has(c.id));

/** Per navigation group, for the tab counts: follows keyword / type / visibility / status / "Cần xử lý", not the group. */
export function countCampaignGroups<T extends FilterRow & Pick<CampaignView, 'status' | 'id'>>(
  list: T[],
  q: CampaignListQuery,
  todoIds?: Set<string>,
): Record<CampaignGroup, number> {
  const out: Record<CampaignGroup, number> = { all: 0, PREP: 0, ACTIVE: 0, DONE: 0 };
  for (const c of list) {
    if (!matchesCampaign(c, q) || !inGroupAndStatus(c, { ...q, group: 'all' }, todoIds)) continue;
    out.all++;
    out[groupOfStatus(c.status)]++;
  }
  return out;
}

/**
 * Group / status / "Cần xử lý" + filters, then sorted: updated (newest first) · deadline (open campaigns with the
 * nearest apply deadline first) · start · budget.
 */
export function applyCampaignQuery<T extends ListRow>(list: T[], q: CampaignListQuery, todoIds?: Set<string>): T[] {
  const out = list.filter((c) => matchesCampaign(c, q) && inGroupAndStatus(c, q, todoIds));
  const sort = q.sort ?? 'updated';
  const deadline = (c: T) => (c.status === 'OPEN' ? (applyDeadlineAt(c) ?? Infinity) : Infinity);
  return out.sort((a, b) => {
    if (sort === 'deadline') return deadline(a) - deadline(b) || b.updatedAt - a.updatedAt;
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
  return !!q.keyword?.trim() || !!q.visibility || !!q.type || q.tab !== 'all' || !!q.todo;
}

/** Sortable columns of the "Bảng" view → the list sort they apply (one direction each, as the sort menu). */
export type CampaignColumn = 'budget' | 'time' | 'updated';
export const CAMPAIGN_COLUMN_SORT: Record<CampaignColumn, { sort: CampaignSort; dir: Exclude<AriaSort, 'none'> }> = {
  budget: { sort: 'budget', dir: 'descending' },
  time: { sort: 'start', dir: 'ascending' },
  updated: { sort: 'updated', dir: 'descending' },
};

// ---------------------------------------------------------------------------
// Campaign status / actions
// ---------------------------------------------------------------------------

export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, Tone> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'info',
  NEEDS_FIX: 'warning',
  REJECTED: 'error',
  OPEN: 'success',
  CLOSED: 'neutral',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export interface CampaignActions {
  edit: boolean;
  /** "Gửi đăng" / "Gửi lại" (to Admin review). */
  publish: boolean;
  /** "Rút về nháp" while waiting for review. */
  withdraw: boolean;
  /** "Đóng tuyển" (OPEN → CLOSED). */
  closeRecruitment: boolean;
  /** "Hoàn tất" (CLOSED → COMPLETED). */
  close: boolean;
  cancel: boolean;
  invite: boolean;
}

/**
 * Header actions per status (EP-02 §5): edit Bản nháp / Cần bổ sung / Không được duyệt / Đang tuyển (as a revision),
 * gửi đăng from the first three, rút về nháp while Chờ duyệt, đóng tuyển while Đang tuyển, hoàn tất once Đã đóng tuyển,
 * huỷ until ended (a never-submitted draft is deleted instead). "Tuyển nhiều KOL" has no private invites.
 */
export function campaignActions(status: CampaignStatus, type: CampaignType = 'BOOKING'): CampaignActions {
  return {
    edit: status === 'DRAFT' || status === 'NEEDS_FIX' || status === 'REJECTED' || status === 'OPEN',
    publish: status === 'DRAFT' || status === 'NEEDS_FIX' || status === 'REJECTED',
    withdraw: status === 'PENDING_REVIEW',
    closeRecruitment: status === 'OPEN',
    close: status === 'CLOSED',
    cancel: status !== 'DRAFT' && status !== 'COMPLETED' && status !== 'CANCELLED',
    invite: status === 'OPEN' && type !== 'OPEN_RECRUITMENT',
  };
}

/** Campaigns a KOL can be invited to: published and recruiting. */
export const INVITABLE_STATUSES: CampaignStatus[] = ['OPEN'];

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
  if (b.allowedActions.includes('ACCEPT')) return b.status === 'APPLIED' ? 'Xem đề xuất' : 'Trả lời lời mời';
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

/** Marketplace proposals still to decide (APPLIED; NEGOTIATING only in older data). */
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
  COUNTERED: 'Đề xuất giá',
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

/**
 * UI/UX tối ưu §5.1: Tổng quan · Ứng viên · Hợp tác · Thông tin chiến dịch (+ Hỏi đáp for campaigns on the Sàn).
 * Older links still open the right place: booking / noi-dung / bao-cao → Hợp tác, ung-tuyen → Ứng viên.
 */
export type DetailTab = 'tong-quan' | 'ung-vien' | 'hop-tac' | 'thong-tin' | 'hoi-dap';
export const DETAIL_TABS: DetailTab[] = ['tong-quan', 'ung-vien', 'hop-tac', 'thong-tin', 'hoi-dap'];
const LEGACY_TAB: Record<string, DetailTab> = { booking: 'hop-tac', 'noi-dung': 'hop-tac', 'bao-cao': 'hop-tac', 'ung-tuyen': 'ung-vien' };

/** Unknown tab → Tổng quan; "Hỏi đáp" only exists for marketplace campaigns. */
export function parseDetailTab(value: string | null, marketplace: boolean): DetailTab {
  const t = DETAIL_TABS.find((x) => x === value) ?? (value ? LEGACY_TAB[value] : undefined) ?? 'tong-quan';
  return t === 'hoi-dap' && !marketplace ? 'tong-quan' : t;
}

/** Section inside "Hợp tác": the collaborations, drafts to review, or the report (?muc=, or an older ?tab=). */
export type CollabSection = 'danh-sach' | 'noi-dung' | 'bao-cao';
export function parseCollabSection(sp: URLSearchParams): CollabSection {
  const v = sp.get('muc') ?? sp.get('tab');
  return v === 'noi-dung' || v === 'bao-cao' ? v : 'danh-sach';
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

/** "Tính năng của chiến dịch" on/off, in the order of the form's feature cards (Tổng quan › "Tính năng"). */
export function campaignFeatures(c: Campaign): { label: string; on: boolean }[] {
  const recruit = c.type === 'OPEN_RECRUITMENT';
  const rewards = recruit ? (c.recruitment ? [c.recruitment.reward] : []) : (c.groups ?? []).map((g) => g.reward);
  return [
    { label: 'Đề nghị trả phí', on: rewards.some((r) => r.cash > 0) },
    { label: 'Tặng quà', on: rewards.some((r) => !!r.product) },
    { label: 'Duyệt nháp', on: c.draftReview !== false },
    { label: 'Sự tuân thủ', on: !!c.contentRules.trim() },
    { label: 'Hợp đồng', on: c.contract !== false },
    { label: 'Điều kiện tham gia', on: (c.regions ?? []).length > 0 || !!c.target },
    { label: 'Câu hỏi khảo sát', on: (c.survey ?? []).length > 0 },
  ];
}

// ---------------------------------------------------------------------------
// Tiến độ chiến dịch (EP-02 US-13, §8.4): đơn ≠ người được chọn ≠ booking xác nhận ≠ suất
// ---------------------------------------------------------------------------

/** Accepted or later, not cancelled: the deal is confirmed. */
const isConfirmed = (s: BookingStatus) => IN_PROGRESS_STATUSES.includes(s) || s === 'COMPLETED';

export interface CampaignProgress {
  /** Applications received (any status, not invites). */
  applications: number;
  /** Applications waiting for the brand. */
  toHandle: number;
  /** Invites sent / still waiting for the supplier. */
  invites: number;
  invitesWaiting: number;
  /** Bookings confirmed (accepted or later, not cancelled). */
  confirmed: number;
  /** Slots used / total (Booking 1 KOL: 1 KOL; Booking nhiều KOL: picked / slots). Undefined when not set. */
  slotsUsed: number;
  slots?: number;
  /** Bookings with drafts waiting for review / completed. */
  contentToReview: number;
  completed: number;
}

export function campaignProgress(
  c: Pick<Campaign, 'type' | 'recruitment'>,
  bookings: Pick<BookingView, 'status' | 'items' | 'origin' | 'awaiting'>[],
): CampaignProgress {
  const apps = bookings.filter((b) => b.origin === 'APPLICATION');
  const invites = bookings.filter((b) => b.origin === 'INVITE');
  const confirmed = bookings.filter((b) => isConfirmed(b.status));
  const recruit = c.type === 'OPEN_RECRUITMENT';
  const slots = recruit ? c.recruitment?.slots : 1;
  return {
    applications: apps.length,
    toHandle: apps.filter((b) => PRE_ACCEPT_STATUSES.includes(b.status) && b.awaiting === 'BRAND').length,
    invites: invites.length,
    invitesWaiting: invites.filter((b) => PRE_ACCEPT_STATUSES.includes(b.status)).length,
    confirmed: confirmed.length,
    slotsUsed: recruit ? confirmed.filter((b) => b.origin === 'APPLICATION').length : Math.min(1, confirmed.length),
    slots,
    contentToReview: bookings.filter((b) => b.status === 'CONTENT_REVIEW').length,
    completed: bookings.filter((b) => b.status === 'COMPLETED').length,
  };
}

/** "Lịch sử chiến dịch" line: what happened, by whom. */
export const CAMPAIGN_LOG_LABEL: Record<CampaignLogEntry['action'], string> = {
  SUBMITTED: 'Gửi đăng',
  WITHDRAWN: 'Rút về nháp',
  APPROVED: 'Được duyệt, bắt đầu tuyển',
  NEEDS_FIX: 'Cần bổ sung',
  REJECTED: 'Không được duyệt',
  CLOSED: 'Đóng tuyển',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Huỷ chiến dịch',
  REVISION_SUBMITTED: 'Gửi bản sửa',
  REVISION_APPROVED: 'Bản sửa được duyệt',
  REVISION_REJECTED: 'Bản sửa bị từ chối',
};
export const CAMPAIGN_LOG_ACTOR: Record<CampaignLogEntry['by'], string> = { BRAND: 'Bạn', ADMIN: 'Admin KOLHUB', SYSTEM: 'Hệ thống' };

// ---------------------------------------------------------------------------
// Card chiến dịch (UI/UX tối ưu §4): tiến độ KOL, việc cần xử lý, CTA theo trạng thái
// ---------------------------------------------------------------------------

type ProgressBooking = Pick<BookingView, 'status' | 'items' | 'origin' | 'awaiting' | 'allowedActions'>;

/**
 * "Đã chọn x/y KOL" (§6): KOL counted once each (an MCN booking counts every represented KOL). Booking 1 KOL: one
 * KOL for the whole campaign; Booking nhiều KOL: up to its slots. Booking per channel / deliverable stays in Hợp tác.
 */
export function kolProgress(c: Pick<Campaign, 'type' | 'recruitment'>, bookings: ProgressBooking[]): { chosen: number; target: number } {
  const confirmed = bookings.filter((b) => isConfirmed(b.status));
  if (c.type !== 'OPEN_RECRUITMENT') return { chosen: confirmed.length > 0 ? 1 : 0, target: 1 };
  const kols = new Set(confirmed.filter((b) => b.origin === 'APPLICATION').flatMap((b) => b.items.map((i) => i.kolAccountId)));
  return { chosen: kols.size, target: c.recruitment?.slots ?? 0 };
}

export interface CampaignTodo {
  key: 'fix' | 'rejected' | 'applications' | 'content' | 'product' | 'payment' | 'full' | 'complete';
  /** Concrete action, e.g. "3 đơn chưa xử lý" (never a generic "2 booking"). */
  text: string;
  /** Where to do it: a detail tab, or the edit form. */
  to: 'edit' | DetailTab;
  /** Blocks the campaign (shown first). */
  urgent?: boolean;
}

/**
 * Everything the brand has to do on a campaign, most important first (§4.4: blocking / overdue first); the card shows
 * the first one, the overview lists them all.
 */
export function campaignTodos(
  c: Pick<Campaign, 'status' | 'type' | 'recruitment' | 'reviewNote'>,
  bookings: ProgressBooking[],
): CampaignTodo[] {
  const out: CampaignTodo[] = [];
  if (c.status === 'NEEDS_FIX') out.push({ key: 'fix', text: 'Bổ sung thông tin theo yêu cầu của Admin', to: 'edit', urgent: true });
  const count = (a: BookingActionKey) => bookings.filter((b) => b.allowedActions.includes(a)).length;
  const apps = bookings.filter((b) => b.allowedActions.includes('SELECT') || (b.origin === 'APPLICATION' && b.allowedActions.includes('ACCEPT'))).length;
  if (apps) out.push({ key: 'applications', text: `${apps} đơn chưa xử lý`, to: 'ung-vien' });
  const content = count('REVIEW_CONTENT');
  if (content) out.push({ key: 'content', text: `${content} nội dung chờ duyệt`, to: 'hop-tac' });
  const product = count('MARK_PRODUCT_SENT');
  if (product) out.push({ key: 'product', text: `${product} KOL chờ gửi sản phẩm`, to: 'hop-tac' });
  const pay = count('MARK_PAID');
  if (pay) out.push({ key: 'payment', text: `${pay} hợp tác chờ xác nhận thanh toán`, to: 'hop-tac' });
  if (c.status === 'OPEN' && c.type === 'OPEN_RECRUITMENT') {
    const k = kolProgress(c, bookings);
    if (k.target > 0 && k.chosen >= k.target) out.push({ key: 'full', text: 'Đã đủ KOL: cân nhắc đóng tuyển', to: 'tong-quan' });
  }
  if (c.status === 'CLOSED' && out.length === 0 && !bookings.some((b) => PRE_ACCEPT_STATUSES.includes(b.status) || IN_PROGRESS_STATUSES.includes(b.status))) {
    out.push({ key: 'complete', text: 'Mọi việc đã xong: bấm Hoàn tất để kết thúc', to: 'tong-quan' });
  }
  return out;
}

/** The one primary action of a card (§4.3), by status. */
export function campaignCta(
  c: Pick<Campaign, 'id' | 'status'>,
  bookings: ProgressBooking[],
): { label: string; to: string } {
  const detail = campaignPath(c.id);
  const tab = (t: DetailTab) => `${detail}?tab=${t}`;
  switch (c.status) {
    case 'DRAFT':
      return { label: 'Tiếp tục tạo', to: campaignEditPath(c.id) };
    case 'PENDING_REVIEW':
      return { label: 'Xem chiến dịch', to: detail };
    case 'NEEDS_FIX':
      return { label: 'Bổ sung thông tin', to: campaignEditPath(c.id) };
    case 'REJECTED':
      return { label: 'Xem lý do', to: detail };
    case 'OPEN':
      return { label: 'Xem ứng viên', to: tab('ung-vien') };
    case 'CLOSED': {
      const waiting = bookings.some((b) => b.origin === 'APPLICATION' && PRE_ACCEPT_STATUSES.includes(b.status));
      return waiting ? { label: 'Xem ứng viên', to: tab('ung-vien') } : { label: 'Quản lý hợp tác', to: tab('hop-tac') };
    }
    case 'COMPLETED':
      return { label: 'Xem kết quả', to: `${tab('hop-tac')}&muc=bao-cao` };
    default:
      return { label: 'Xem chi tiết', to: detail };
  }
}

const TODO_CTA_LABEL: Record<CampaignTodo['key'], string> = {
  fix: 'Bổ sung thông tin',
  rejected: 'Xem lý do',
  applications: 'Xét duyệt ứng viên',
  content: 'Duyệt nội dung',
  product: 'Gửi sản phẩm',
  payment: 'Xác nhận thanh toán',
  full: 'Đóng tuyển',
  complete: 'Hoàn tất chiến dịch',
};

/**
 * The primary (filled) button of a card that has something to handle: an action verb matching the to-do, so it never
 * reads the same as the neutral "Xem …" button of a card with nothing pending.
 */
export function todoCta(c: Pick<Campaign, 'id'>, todo: CampaignTodo): { label: string; to: string } {
  if (todo.to === 'edit') return { label: TODO_CTA_LABEL[todo.key], to: campaignEditPath(c.id) };
  const to = `${campaignPath(c.id)}?tab=${todo.to}${todo.key === 'content' ? '&muc=noi-dung' : ''}`;
  return { label: TODO_CTA_LABEL[todo.key], to };
}

/**
 * "Mốc thời gian" of the overview (§5.2): dated milestones instead of a sequential flow. Booking nhiều KOL: its four
 * phases (selection can start before the apply phase ends); Booking 1 KOL: apply deadline and the running period.
 */
export function campaignMilestones(
  c: Pick<Campaign, 'type' | 'recruitment' | 'applyDeadline' | 'applyDeadlineTime' | 'startDate' | 'endDate' | 'status'>,
  now: number = Date.now(),
): { label: string; value: string; current?: boolean }[] {
  const range = (a?: string, b?: string) => formatDateRange(a, b);
  const today = localIso(now);
  const within = (a?: string, b?: string) => !!a && !!b && a <= today && today <= b && c.status !== 'DRAFT';
  if (c.type === 'OPEN_RECRUITMENT' && c.recruitment) {
    const t = c.recruitment.timeline;
    return [
      { label: 'Ứng tuyển', value: range(t.applyStart, t.applyEnd), current: within(t.applyStart, t.applyEnd) },
      { label: 'Chọn KOL', value: range(t.selectStart, t.selectEnd), current: within(t.selectStart, t.selectEnd) },
      { label: 'Đăng bài', value: range(t.postStart, t.postEnd), current: within(t.postStart, t.postEnd) },
      { label: 'Đánh giá', value: range(t.reviewStart, t.reviewEnd), current: within(t.reviewStart, t.reviewEnd) },
    ].filter((m) => m.value !== 'Chưa đặt lịch');
  }
  const out: { label: string; value: string; current?: boolean }[] = [];
  const at = applyDeadlineAt(c);
  if (at !== undefined) {
    const d = new Date(at);
    const hh = c.applyDeadlineTime ?? '23:59';
    out.push({ label: 'Hạn ứng tuyển', value: `${hh} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`, current: c.status === 'OPEN' && at > now });
  }
  if (c.startDate || c.endDate) out.push({ label: 'Thời gian thực hiện', value: range(c.startDate, c.endDate), current: within(c.startDate, c.endDate) });
  return out;
}

/** Local 'YYYY-MM-DD' of `ms`. */
function localIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
