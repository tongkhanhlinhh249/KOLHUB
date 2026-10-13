// Mock "Tin nhắn" + "Thông báo" + "Câu hỏi của tôi".
// - Messages: one thread per booking; only the booking's two parties (brand account, supplier account) can read or post.
//   Key booking events (booking.history) are merged into the thread as SYSTEM messages, so the demo simulator's steps
//   show up there without extra writes.
// - Notifications are derived on read from booking history, messages, Q&A and invite expiry; only the read state is
//   stored (`notificationReads`). Every event source therefore produces notifications automatically.
import type { Booking, BookingAction, BookingEvent, BookingParty, Campaign } from '../campaign-types';
import { CLOSED_STATUSES } from '../campaign-types';
import {
  INBOX_PATHS,
  MESSAGE_LINK_MAX,
  MESSAGE_TEXT_MAX,
  type AppNotification,
  type BookingMessage,
  type MessageInput,
  type MyQuestion,
  type MyQuestionFilter,
  type NotificationFilter,
  type NotificationKind,
  type ThreadMessageView,
  type ThreadSummary,
  type ThreadView,
} from '../inbox-types';
import { KolhubError } from '../types';
import type { Db, DemoState, StoredAccount } from './db';
import { delay as fakeDelay } from './delay';
import { applyDeadlineAt, brandRef, effectiveStatus, expiresAtOf, supplierRef } from './campaignRules';

const HOUR = 3_600_000;
/** An open invite shows "sắp hết hạn" in its last 48 hours. */
export const EXPIRING_WINDOW = 48 * HOUR;
const NOTIFICATION_LIMIT = 100;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function sessionAccount(state: DemoState): StoredAccount | undefined {
  return state.sessionAccountId ? state.accounts.find((a) => a.id === state.sessionAccountId) : undefined;
}

/** The viewer's side of a booking, or null when the account is not one of its two parties. */
export function threadParty(b: Pick<Booking, 'brandAccountId' | 'supplierAccountId'>, accountId: string | null | undefined): BookingParty | null {
  if (!accountId) return null;
  if (b.brandAccountId === accountId) return 'BRAND';
  if (b.supplierAccountId === accountId) return 'SUPPLIER';
  return null;
}

const vnd = (n: number) => `${String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;

/** Booking events shown in the thread as system messages (status changes and money / product steps). */
const SYSTEM_TEXT: Partial<Record<BookingAction, (e: BookingEvent) => string>> = {
  INVITED: (e) => `gửi lời mời hợp tác${e.price ? ` với giá ${vnd(e.price)}` : ''}`,
  APPLIED: () => 'gửi đề xuất ứng tuyển',
  COUNTERED: (e) => `đề xuất giá mới ${vnd(e.price ?? 0)}`,
  ACCEPTED: () => 'chấp nhận, booking đã chốt',
  SELECTED: () => 'chọn tham gia chiến dịch',
  NOT_SELECTED: () => 'không chọn đề xuất này',
  DECLINED: () => 'từ chối',
  CANCELLED: () => 'huỷ booking',
  DRAFT_SUBMITTED: (e) => `nộp bản nháp${e.note ? ` "${e.note}"` : ''}`,
  CONTENT_APPROVED: () => 'duyệt bản nháp',
  CHANGES_REQUESTED: () => 'yêu cầu chỉnh sửa bản nháp',
  POST_VERIFIED: () => 'xác minh bài đăng',
  PAYMENT_MARKED: () => 'đánh dấu đã thanh toán (ghi nhận ngoài KOL Hub)',
  PAYMENT_CONFIRMED: () => 'xác nhận đã nhận thanh toán, booking hoàn tất',
  PRODUCT_SENT: () => 'đánh dấu đã gửi sản phẩm',
  PRODUCT_RECEIVED: () => 'xác nhận đã nhận sản phẩm',
};

interface Names {
  brand: string;
  supplier: string;
}

function namesOf(state: DemoState, b: Booking): Names {
  return {
    brand: brandRef(state.accounts.find((a) => a.id === b.brandAccountId), b.brandAccountId).company,
    supplier: supplierRef(state, b).name,
  };
}

function actorName(by: BookingEvent['by'], viewer: BookingParty, names: Names): string {
  if (by === viewer) return 'Bạn';
  if (by === 'BRAND') return names.brand;
  if (by === 'SUPPLIER') return names.supplier;
  return 'Hệ thống';
}

/** User messages + system messages of a booking for `viewer`, oldest first. */
export function threadMessages(state: DemoState, b: Booking, viewer: BookingParty): ThreadMessageView[] {
  const names = namesOf(state, b);
  const out: ThreadMessageView[] = [];
  b.history.forEach((e, i) => {
    const fn = SYSTEM_TEXT[e.action];
    if (!fn) return;
    const who = actorName(e.by, viewer, names);
    out.push({ id: `ev:${b.id}:${i}`, kind: 'SYSTEM', from: e.by, mine: e.by === viewer, authorName: who, text: `${who} ${fn(e)}`, at: e.at });
  });
  for (const m of state.bookingMessages ?? []) {
    if (m.bookingId !== b.id) continue;
    const mine = m.from === viewer;
    out.push({
      id: m.id,
      kind: 'USER',
      from: m.from,
      mine,
      authorName: actorName(m.from, viewer, names),
      text: m.text,
      ...(m.link ? { link: m.link } : {}),
      at: m.at,
    });
  }
  // Stable: same timestamp keeps system events before messages.
  return out.sort((a, b2) => a.at - b2.at);
}

/** Messages from the other party after the viewer last opened the thread. */
export function unreadInThread(state: DemoState, bookingId: string, viewer: BookingParty, accountId: string): number {
  const readAt = state.threadReads?.find((r) => r.accountId === accountId && r.bookingId === bookingId)?.readAt ?? 0;
  return (state.bookingMessages ?? []).filter((m) => m.bookingId === bookingId && m.from !== viewer && m.at > readAt).length;
}

export const bookingPathFor = (b: Pick<Booking, 'id' | 'campaignId'>, viewer: BookingParty) =>
  viewer === 'BRAND' ? INBOX_PATHS.brandBooking(b.campaignId, b.id) : INBOX_PATHS.supplierBooking(b.id);

function summary(state: DemoState, b: Booking, viewer: BookingParty, accountId: string, now: number): ThreadView {
  const c = state.campaigns.find((x) => x.id === b.campaignId);
  const names = namesOf(state, b);
  const messages = threadMessages(state, b, viewer);
  const lastMsg = messages[messages.length - 1];
  const status = effectiveStatus(b, c, now);
  const out: ThreadView = {
    bookingId: b.id,
    campaignId: b.campaignId,
    campaignName: c?.name ?? 'Chiến dịch',
    viewer,
    counterpartName: viewer === 'BRAND' ? names.supplier : names.brand,
    counterpartType: viewer === 'BRAND' ? b.supplierType : 'BRAND',
    status,
    lastAt: lastMsg?.at ?? b.updatedAt,
    unread: unreadInThread(state, b.id, viewer, accountId),
    canPost: !CLOSED_STATUSES.includes(status),
    bookingPath: bookingPathFor(b, viewer),
    messages,
  };
  if (c?.cover) out.cover = { ...c.cover };
  if (lastMsg) out.last = { kind: lastMsg.kind, mine: lastMsg.mine, text: lastMsg.text, at: lastMsg.at };
  return out;
}

/** Bookings the account is a party of, with its side. */
function myBookings(state: DemoState, accountId: string): { b: Booking; party: BookingParty }[] {
  const out: { b: Booking; party: BookingParty }[] = [];
  for (const b of state.bookings) {
    const party = threadParty(b, accountId);
    if (party) out.push({ b, party });
  }
  return out;
}

/** Inbox of `accountId`: every booking it is a party of, latest activity first. */
export function listThreadsOf(state: DemoState, accountId: string, now: number, keyword = ''): ThreadSummary[] {
  const kw = fold(keyword);
  return myBookings(state, accountId)
    .map(({ b, party }) => {
      const { messages: _m, ...rest } = summary(state, b, party, accountId, now);
      return rest;
    })
    .filter((t) => !kw || fold(`${t.campaignName} ${t.counterpartName} ${t.last?.text ?? ''}`).includes(kw))
    .sort((a, b) => b.lastAt - a.lastAt);
}

export function unreadMessagesOf(state: DemoState, accountId: string): number {
  return myBookings(state, accountId).reduce((n, { b, party }) => n + unreadInThread(state, b.id, party, accountId), 0);
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** Trimmed text 1–2000 chars and an optional http(s) link ≤ 500 chars (4803 `message` / `link`). */
export function checkMessage(input: MessageInput): { text: string; link?: string } {
  const text = (input?.text ?? '').normalize('NFC').trim();
  if (!text || [...text].length > MESSAGE_TEXT_MAX) throw new KolhubError('KOLHUB-4803', { field: 'message' });
  const link = (input?.link ?? '').trim();
  if (link) {
    let ok = false;
    try {
      const u = new URL(link);
      ok = (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname && link.length <= MESSAGE_LINK_MAX;
    } catch {
      ok = false;
    }
    if (!ok) throw new KolhubError('KOLHUB-4803', { field: 'link' });
    return { text, link };
  }
  return { text };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

type Draft = Omit<AppNotification, 'read'> & { readIfAfter?: number };

/** What a booking event means for the party that did not do it (null = no notification). */
function eventNotification(
  e: BookingEvent,
  b: Booking,
  viewer: BookingParty,
  ctx: { campaign: string; names: Names },
): { kind: NotificationKind; title: string; body: string } | null {
  if (e.by === viewer) return null;
  const { campaign, names } = ctx;
  const q = `"${campaign}"`;
  if (viewer === 'SUPPLIER') {
    switch (e.action) {
      case 'INVITED':
        return { kind: 'INVITE', title: 'Lời mời hợp tác mới', body: `${names.brand} mời bạn tham gia ${q}.` };
      case 'SELECTED':
        return { kind: 'PICKED', title: 'Bạn đã được chọn', body: `${names.brand} chọn bạn tham gia ${q}.` };
      case 'ACCEPTED':
        return b.origin === 'APPLICATION'
          ? { kind: 'PICKED', title: 'Đề xuất được chấp nhận', body: `${names.brand} chấp nhận đề xuất của bạn cho ${q}.` }
          : { kind: 'PICKED', title: 'Nhãn hàng chấp nhận giá', body: `Booking ${q} đã chốt. Bắt đầu sản xuất nội dung.` };
      case 'NOT_SELECTED':
        return { kind: 'NOT_PICKED', title: 'Không được chọn', body: `${names.brand} không chọn đề xuất của bạn cho ${q}.` };
      case 'DECLINED':
        return { kind: 'NOT_PICKED', title: 'Đề xuất bị từ chối', body: `${names.brand} từ chối đề xuất của bạn cho ${q}.` };
      case 'COUNTERED':
        return { kind: 'OFFER', title: 'Nhãn hàng đề xuất giá mới', body: `${q}: ${vnd(e.price ?? 0)}. Hãy phản hồi đề xuất.` };
      case 'CONTENT_APPROVED':
        return { kind: 'DRAFT_APPROVED', title: 'Bản nháp đã được duyệt', body: `${q}: bạn có thể đăng bài và gửi link.` };
      case 'CHANGES_REQUESTED':
        return { kind: 'CHANGES_REQUESTED', title: 'Nhãn hàng yêu cầu chỉnh sửa', body: e.note ? `${q}: ${e.note}` : `${q}: xem góp ý và nộp lại bản nháp.` };
      case 'POST_VERIFIED':
        return { kind: 'POST_VERIFIED', title: 'Bài đăng đã được xác minh', body: `${q}: số liệu bài đăng đã được ghi nhận.` };
      case 'PAYMENT_MARKED':
        return { kind: 'PAID', title: 'Nhãn hàng đã đánh dấu thanh toán', body: `${q}: kiểm tra tài khoản và xác nhận đã nhận tiền.` };
      case 'PRODUCT_SENT':
        return { kind: 'PRODUCT_SENT', title: 'Sản phẩm đã được gửi', body: `${q}: xác nhận khi bạn nhận được sản phẩm.` };
      case 'CANCELLED':
        return { kind: 'CANCELLED', title: 'Booking đã bị huỷ', body: `${names.brand} huỷ booking ${q}.` };
      default:
        return null;
    }
  }
  switch (e.action) {
    case 'APPLIED':
      return { kind: 'APPLICATION', title: 'Đề xuất ứng tuyển mới', body: `${names.supplier} ứng tuyển ${q}.` };
    case 'COUNTERED':
      return { kind: 'OFFER', title: 'KOL/MCN đề xuất giá mới', body: `${names.supplier}: ${vnd(e.price ?? 0)} cho ${q}.` };
    case 'ACCEPTED':
      return { kind: 'ACCEPTED', title: 'KOL/MCN đã nhận lời', body: `${names.supplier} chấp nhận booking ${q}.` };
    case 'DECLINED':
      return { kind: 'DECLINED', title: 'KOL/MCN từ chối lời mời', body: `${names.supplier} từ chối ${q}.` };
    case 'CANCELLED':
      return { kind: 'CANCELLED', title: 'Booking đã bị huỷ', body: `${names.supplier} huỷ booking ${q}.` };
    case 'DRAFT_SUBMITTED':
      return { kind: 'DRAFT_SUBMITTED', title: 'Bản nháp mới chờ duyệt', body: `${names.supplier} nộp bản nháp cho ${q}.` };
    case 'POST_VERIFIED':
      return { kind: 'POST_VERIFIED', title: 'Bài đăng đã được xác minh', body: `${names.supplier}: bài đăng ${q} đã xác minh, chờ thanh toán.` };
    case 'PAYMENT_CONFIRMED':
      return { kind: 'PAYMENT_CONFIRMED', title: 'KOL/MCN đã nhận thanh toán', body: `Booking ${q} với ${names.supplier} đã hoàn tất.` };
    case 'PRODUCT_RECEIVED':
      return { kind: 'PRODUCT_RECEIVED', title: 'KOL/MCN đã nhận sản phẩm', body: `${names.supplier} xác nhận đã nhận sản phẩm của ${q}.` };
    default:
      return null;
  }
}

/** Deadline reminder (EP-02 §13): once, 24 hours before the apply deadline of an OPEN campaign. */
export const DEADLINE_REMINDER = 24 * HOUR;

/**
 * EP-02 US-14: the campaign owner hears about Admin decisions (also by email: approved / needs fix / rejected,
 * and decisions on an edit), the automatic close at the deadline, and gets one reminder 24 hours before the
 * deadline — not when the campaign went public after that moment (no catch-up).
 */
function campaignNotifications(state: DemoState, accountId: string, now: number): Draft[] {
  const acc = state.accounts.find((a) => a.id === accountId);
  const email = acc?.type === 'BIZ' ? acc.email : undefined;
  const out: Draft[] = [];
  for (const c of state.campaigns) {
    if (c.brandAccountId !== accountId) continue;
    const href = INBOX_PATHS.brandCampaign(c.id);
    (c.log ?? []).forEach((e, i) => {
      const id = `cmp:${c.id}:${i}`;
      const base = { id, at: e.at, href, campaignName: c.name };
      const reason = e.note ? ` Lý do: ${e.note}` : '';
      const mail = email ? { email } : {};
      switch (e.action) {
        case 'APPROVED':
          out.push({ ...base, ...mail, kind: 'CAMPAIGN_REVIEW', title: 'Chiến dịch đã được duyệt', body: `"${c.name}" đã lên Sàn và bắt đầu nhận ứng tuyển.` });
          break;
        case 'NEEDS_FIX':
          out.push({ ...base, ...mail, kind: 'CAMPAIGN_REVIEW', title: 'Chiến dịch cần bổ sung', body: `"${c.name}" cần chỉnh sửa trước khi đăng.${reason}` });
          break;
        case 'REJECTED':
          out.push({ ...base, ...mail, kind: 'CAMPAIGN_REVIEW', title: 'Chiến dịch không được duyệt', body: `"${c.name}" không được đăng.${reason}` });
          break;
        case 'REVISION_APPROVED':
          out.push({ ...base, ...mail, kind: 'CAMPAIGN_REVIEW', title: 'Bản sửa đã được duyệt', body: `Nội dung mới của "${c.name}" đã công khai.` });
          break;
        case 'REVISION_REJECTED':
          out.push({ ...base, ...mail, kind: 'CAMPAIGN_REVIEW', title: 'Bản sửa không được duyệt', body: `"${c.name}" giữ nội dung cũ.${reason}` });
          break;
        case 'CLOSED':
          if (e.by === 'SYSTEM') {
            const chosen = e.note === 'Đã chọn KOL cho chiến dịch.';
            out.push({
              ...base,
              kind: 'CAMPAIGN_CLOSED',
              title: 'Chiến dịch đã đóng tuyển',
              body: chosen
                ? `"${c.name}" đã chọn được KOL; các đơn còn lại được báo "Không được chọn".`
                : `"${c.name}" hết hạn ứng tuyển. Đơn đã nhận vẫn được giữ để bạn xử lý.`,
            });
          }
          break;
      }
    });
    const deadline = applyDeadlineAt(c);
    const remindAt = deadline !== undefined ? deadline - DEADLINE_REMINDER : undefined;
    if (c.status === 'OPEN' && c.visibility === 'MARKETPLACE' && remindAt !== undefined && now >= remindAt && now < deadline! && (c.publishedAt ?? Infinity) <= remindAt) {
      out.push({
        id: `cmp-deadline:${c.id}:${c.applyDeadline}`,
        kind: 'DEADLINE_SOON',
        title: 'Sắp hết hạn ứng tuyển',
        body: `"${c.name}" còn 24 giờ nhận ứng tuyển. Xem đơn và chọn KOL trước khi chiến dịch tự đóng tuyển.`,
        at: remindAt,
        href,
        campaignName: c.name,
      });
    }
  }
  return out;
}

/** Every notification of `accountId` (unread state applied), newest first, at most 100. */
export function buildNotifications(state: DemoState, accountId: string, now: number): AppNotification[] {
  const drafts: Draft[] = [];
  const campaignOf = (id: string): Campaign | undefined => state.campaigns.find((c) => c.id === id);

  for (const { b, party } of myBookings(state, accountId)) {
    const c = campaignOf(b.campaignId);
    const campaign = c?.name ?? 'Chiến dịch';
    const names = namesOf(state, b);
    const href = bookingPathFor(b, party);
    b.history.forEach((e, i) => {
      const n = eventNotification(e, b, party, { campaign, names });
      if (n) drafts.push({ id: `ev:${b.id}:${i}`, ...n, at: e.at, href, campaignName: campaign });
    });
    // Messages from the other party; reading the thread also reads these.
    const readAt = state.threadReads?.find((r) => r.accountId === accountId && r.bookingId === b.id)?.readAt ?? 0;
    for (const m of state.bookingMessages ?? []) {
      if (m.bookingId !== b.id || m.from === party) continue;
      const who = m.from === 'BRAND' ? names.brand : names.supplier;
      drafts.push({
        id: `msg:${m.id}`,
        kind: 'MESSAGE',
        title: `Tin nhắn mới từ ${who}`,
        body: m.text.length > 140 ? `${m.text.slice(0, 139)}…` : m.text,
        at: m.at,
        href: INBOX_PATHS.thread(b.id),
        campaignName: campaign,
        readIfAfter: readAt,
      });
    }
    // Open invite in its last 48 hours.
    if (party === 'SUPPLIER' && effectiveStatus(b, c, now) === 'SENT') {
      const exp = expiresAtOf(b, c);
      if (exp !== undefined && exp > now && exp - now <= EXPIRING_WINDOW) {
        const hours = Math.max(1, Math.ceil((exp - now) / HOUR));
        drafts.push({
          id: `exp:${b.id}`,
          kind: 'INVITE_EXPIRING',
          title: 'Lời mời sắp hết hạn',
          body: `"${campaign}" còn khoảng ${hours} giờ để trả lời.`,
          at: exp - EXPIRING_WINDOW,
          href,
          campaignName: campaign,
        });
      }
    }
  }

  for (const q of state.campaignQuestions ?? []) {
    const c = campaignOf(q.campaignId);
    if (!c) continue;
    if (q.askerAccountId === accountId && q.answer && q.answeredAt) {
      drafts.push({
        id: `qa:${q.id}`,
        kind: 'QA_ANSWERED',
        title: 'Nhãn hàng đã trả lời câu hỏi',
        body: `"${c.name}": ${q.answer.length > 140 ? `${q.answer.slice(0, 139)}…` : q.answer}`,
        at: q.answeredAt,
        href: INBOX_PATHS.myQuestions,
        campaignName: c.name,
      });
    }
    if (c.brandAccountId === accountId) {
      drafts.push({
        id: `qa-ask:${q.id}`,
        kind: 'QA_ASKED',
        title: 'Câu hỏi mới về chiến dịch',
        body: `${q.askerName}: ${q.question}`,
        at: q.createdAt,
        href: INBOX_PATHS.brandQa(c.id),
        campaignName: c.name,
        // Answered questions need nothing more from the brand.
        ...(q.answeredAt ? { readIfAfter: Infinity } : {}),
      });
    }
  }

  drafts.push(...campaignNotifications(state, accountId, now));

  const rs = state.notificationReads?.find((r) => r.accountId === accountId);
  const readIds = new Set(rs?.readIds ?? []);
  return drafts
    .filter((d) => d.at <= now)
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
    .slice(0, NOTIFICATION_LIMIT)
    .map(({ readIfAfter, ...d }) => ({
      ...d,
      read: readIds.has(d.id) || (rs?.readAllAt !== undefined && d.at <= rs.readAllAt) || (readIfAfter !== undefined && d.at <= readIfAfter),
    }));
}

export function filterNotifications(list: AppNotification[], filter: NotificationFilter): AppNotification[] {
  return filter === 'unread' ? list.filter((n) => !n.read) : list;
}

// ---------------------------------------------------------------------------
// "Câu hỏi của tôi"
// ---------------------------------------------------------------------------

/** Questions `accountId` asked on Sàn campaigns: unanswered first, then newest. */
export function myQuestionsOf(state: DemoState, accountId: string, filter: MyQuestionFilter = 'all'): MyQuestion[] {
  return state.campaignQuestions
    .filter((q) => q.askerAccountId === accountId)
    .map((q): MyQuestion | null => {
      const c = state.campaigns.find((x) => x.id === q.campaignId);
      if (!c) return null;
      const out: MyQuestion = {
        id: q.id,
        campaignId: c.id,
        campaignName: c.name,
        brandCompany: brandRef(state.accounts.find((a) => a.id === c.brandAccountId), c.brandAccountId).company,
        question: q.question,
        createdAt: q.createdAt,
        status: q.answer ? 'ANSWERED' : 'PENDING',
      };
      if (c.cover) out.cover = { ...c.cover };
      if (q.answer) {
        out.answer = q.answer;
        out.answeredAt = q.answeredAt;
      }
      return out;
    })
    .filter((q): q is MyQuestion => !!q)
    .filter((q) => filter === 'all' || (filter === 'answered' ? q.status === 'ANSWERED' : q.status === 'PENDING'))
    .sort((a, b) => Number(a.status === 'ANSWERED') - Number(b.status === 'ANSWERED') || b.createdAt - a.createdAt);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface InboxServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
  genId?: () => string;
}

export interface InboxCounts {
  messages: number;
  notifications: number;
}

export function createInboxService(deps: InboxServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay(150));
  const newId = () => deps.genId?.() ?? crypto.randomUUID();

  /** Booking + viewer side; 4804 when missing or the session is not one of its parties. */
  function access(state: DemoState, bookingId: string): { b: Booking; party: BookingParty; accountId: string } {
    const acc = sessionAccount(state);
    const b = state.bookings.find((x) => x.id === bookingId);
    const party = b && acc ? threadParty(b, acc.id) : null;
    if (!b || !acc || !party) throw new KolhubError('KOLHUB-4804');
    return { b, party, accountId: acc.id };
  }

  function markRead(s: DemoState, accountId: string, bookingId: string, t: number) {
    s.threadReads ??= [];
    const r = s.threadReads.find((x) => x.accountId === accountId && x.bookingId === bookingId);
    if (r) r.readAt = Math.max(r.readAt, t);
    else s.threadReads.push({ accountId, bookingId, readAt: t });
  }

  async function listThreads(keyword = ''): Promise<ThreadSummary[]> {
    await wait();
    const state = db.read();
    const acc = sessionAccount(state);
    return acc ? listThreadsOf(state, acc.id, now(), keyword) : [];
  }

  /** Thread of a booking (4804 for anyone but its two parties). Does not mark it read. */
  async function getThread(bookingId: string): Promise<ThreadView> {
    await wait();
    const state = db.read();
    const { b, party, accountId } = access(state, bookingId);
    return summary(state, b, party, accountId, now());
  }

  /** The viewer opened the thread: its messages (and their notifications) become read. */
  async function markThreadRead(bookingId: string): Promise<void> {
    const state = db.read();
    const { accountId } = access(state, bookingId);
    if (unreadInThread(state, bookingId, threadParty(state.bookings.find((x) => x.id === bookingId)!, accountId)!, accountId) === 0) return;
    const t = now();
    db.update((s) => markRead(s, accountId, bookingId, t));
  }

  /** A party posts a message (text + optional link). Closed bookings (declined / cancelled / expired) are read-only (4805). */
  async function send(bookingId: string, input: MessageInput): Promise<ThreadView> {
    await wait();
    const state = db.read();
    const { b, party, accountId } = access(state, bookingId);
    const t = now();
    const c = state.campaigns.find((x) => x.id === b.campaignId);
    if (CLOSED_STATUSES.includes(effectiveStatus(b, c, t))) throw new KolhubError('KOLHUB-4805');
    const msg: BookingMessage = { id: newId(), bookingId, from: party, authorAccountId: accountId, ...checkMessage(input), at: t };
    db.update((s) => {
      s.bookingMessages ??= [];
      s.bookingMessages.push(msg);
      markRead(s, accountId, bookingId, t);
    });
    const after = db.read();
    return summary(after, after.bookings.find((x) => x.id === bookingId)!, party, accountId, t);
  }

  async function listNotifications(filter: NotificationFilter = 'all'): Promise<AppNotification[]> {
    await wait();
    const state = db.read();
    const acc = sessionAccount(state);
    return acc ? filterNotifications(buildNotifications(state, acc.id, now()), filter) : [];
  }

  async function markNotificationRead(id: string): Promise<void> {
    const state = db.read();
    const acc = sessionAccount(state);
    if (!acc) return;
    // Opening a message notification also opens its thread.
    if (id.startsWith('msg:')) {
      const m = state.bookingMessages.find((x) => `msg:${x.id}` === id);
      if (m && threadParty(state.bookings.find((b) => b.id === m.bookingId) ?? { brandAccountId: '', supplierAccountId: '' }, acc.id)) {
        const t = now();
        db.update((s) => markRead(s, acc.id, m.bookingId, Math.max(t, m.at)));
        return;
      }
    }
    db.update((s) => {
      s.notificationReads ??= [];
      let r = s.notificationReads.find((x) => x.accountId === acc.id);
      if (!r) {
        r = { accountId: acc.id, readIds: [] };
        s.notificationReads.push(r);
      }
      if (!r.readIds.includes(id)) r.readIds.push(id);
    });
  }

  async function markAllNotificationsRead(): Promise<void> {
    const state = db.read();
    const acc = sessionAccount(state);
    if (!acc) return;
    const t = now();
    db.update((s) => {
      s.notificationReads ??= [];
      s.notificationReads = s.notificationReads.filter((x) => x.accountId !== acc.id);
      s.notificationReads.push({ accountId: acc.id, readAllAt: t, readIds: [] });
    });
  }

  /** Badges: unread messages (sidebar "Tin nhắn") and unread notifications (header bell). No latency. */
  async function counts(): Promise<InboxCounts> {
    const state = db.read();
    const acc = sessionAccount(state);
    if (!acc) return { messages: 0, notifications: 0 };
    return {
      messages: unreadMessagesOf(state, acc.id),
      notifications: buildNotifications(state, acc.id, now()).filter((n) => !n.read).length,
    };
  }

  /** "Câu hỏi của tôi" of the signed-in KOL / MCN (4806 otherwise). */
  async function listMyQuestions(filter: MyQuestionFilter = 'all'): Promise<MyQuestion[]> {
    await wait();
    const state = db.read();
    const acc = sessionAccount(state);
    if (acc?.type !== 'KOL' && acc?.type !== 'MCN') throw new KolhubError('KOLHUB-4806');
    return myQuestionsOf(state, acc.id, filter);
  }

  return {
    listThreads,
    getThread,
    markThreadRead,
    send,
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    counts,
    listMyQuestions,
  };
}

export type InboxService = ReturnType<typeof createInboxService>;
