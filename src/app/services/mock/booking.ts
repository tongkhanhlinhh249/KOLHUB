// Mock booking service (beta): negotiation, content review, post verification, record-only payment and
// internal ratings. Both sides use the same functions; the side is resolved from the signed-in account
// and every mutation checks `allowedActions` (KOLHUB-4805 otherwise).
import type {
  Booking,
  BookingActionKey,
  BookingParty,
  BookingStatus,
  BookingView,
  BrandBookingCounts,
  BrandBookingFilters,
  ContentSubmission,
  DraftInput,
  PostInput,
  ProposalItemInput,
  ReviewDecision,
  SupplierBookingCounts,
  SupplierBookingFilters,
} from '../campaign-types';
import { CAMPAIGN_NAME_MAX } from '../campaign-types';
import type { StoredFile } from '../profile-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import {
  checkNote,
  currentSupplier,
  draftsCoverItems,
  effectiveStatus,
  isAcceptingApplications,
  isPrice,
  matchesStatus,
  partyOf,
  platformOfLink,
  postMatchesPlatform,
  postMetrics,
  postsCoverItems,
  requireAction,
  resolveItems,
  toBookingView,
} from './campaignRules';
import { scanVideoFile } from './safety';

export interface BookingServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
  genId?: () => string;
}

const CONTRACT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const CONTRACT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_DRAFT_SEC = 60;

type Ctx = { state: DemoState; booking: Booking; party: BookingParty; status: BookingStatus; t: number };

export function createBookingService(deps: BookingServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());
  const newId = () => deps.genId?.() ?? crypto.randomUUID();

  /** Loads the booking for the session's side (4804 when missing / not a party). */
  function load(id: string): Ctx {
    const state = db.read();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) {
      // Still enforce the session guard first (4016 / 4806 style) so errors do not depend on existence.
      const acc = state.sessionAccountId ? state.accounts.find((a) => a.id === state.sessionAccountId) : undefined;
      if (acc?.type !== 'BIZ') currentSupplier(state);
      throw new KolhubError('KOLHUB-4804');
    }
    const party = partyOf(state, booking);
    const t = now();
    const c = state.campaigns.find((x) => x.id === booking.campaignId);
    return { state, booking, party, status: effectiveStatus(booking, c, t), t };
  }

  function guard(id: string, action: BookingActionKey): Ctx {
    const ctx = load(id);
    requireAction(ctx.booking, ctx.status, ctx.party, action);
    return ctx;
  }

  /** Applies `fn` to the stored booking and returns the fresh view. */
  function commit(ctx: Ctx, fn: (b: Booking, s: DemoState) => void): BookingView {
    db.update((s) => {
      const b = s.bookings.find((x) => x.id === ctx.booking.id)!;
      fn(b, s);
      b.updatedAt = ctx.t;
    });
    const after = db.read();
    return toBookingView(after, after.bookings.find((x) => x.id === ctx.booking.id)!, ctx.party, ctx.t);
  }

  const other = (p: BookingParty): BookingParty => (p === 'BRAND' ? 'SUPPLIER' : 'BRAND');

  // --- lists ---

  async function listForBrand(filters: BrandBookingFilters = {}): Promise<BookingView[]> {
    await wait();
    const state = db.read();
    const acc = currentBizAccount(state);
    const t = now();
    return state.bookings
      .filter((b) => b.brandAccountId === acc.id && (!filters.campaignId || b.campaignId === filters.campaignId))
      .map((b) => toBookingView(state, b, 'BRAND', t))
      .filter((v) => matchesStatus(v.status, filters.status))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function listForSupplier(filters: SupplierBookingFilters = {}): Promise<BookingView[]> {
    await wait();
    const state = db.read();
    const me = currentSupplier(state);
    const t = now();
    return state.bookings
      .filter((b) => b.supplierAccountId === me.accountId)
      .filter((b) => (!filters.campaignId || b.campaignId === filters.campaignId) && (!filters.origin || b.origin === filters.origin))
      .map((b) => toBookingView(state, b, 'SUPPLIER', t))
      .filter((v) => matchesStatus(v.status, filters.status))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Booking detail for either side: campaign summary, supplier, public KOL profile per item, allowed actions. */
  async function get(id: string): Promise<BookingView> {
    await wait();
    const ctx = load(id);
    return toBookingView(ctx.state, ctx.booking, ctx.party, ctx.t);
  }

  // --- negotiation ---

  /** The awaited party proposes a new total price; status NEGOTIATING, the other party must answer. */
  async function counter(id: string, price: number, note?: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'COUNTER');
    if (!isPrice(price)) throw new KolhubError('KOLHUB-4810');
    const n = checkNote(note);
    return commit(ctx, (b) => {
      b.price = price;
      if (n) b.note = n;
      b.status = 'NEGOTIATING';
      b.awaiting = other(ctx.party);
      b.history.push({ at: ctx.t, by: ctx.party, action: 'COUNTERED', price, ...(n ? { note: n } : {}) });
    });
  }

  /**
   * The awaited party accepts the current price → ACCEPTED (production can start). Needs a price (4810) and a
   * channel on every item (4809). The campaign becomes RUNNING.
   */
  async function accept(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'ACCEPT');
    if (!isPrice(ctx.booking.price)) throw new KolhubError('KOLHUB-4810');
    if (ctx.booking.items.some((i) => !i.channelId)) throw new KolhubError('KOLHUB-4809');
    return commit(ctx, (b, s) => {
      b.status = 'ACCEPTED';
      delete b.awaiting;
      b.acceptedAt = ctx.t;
      b.history.push({ at: ctx.t, by: ctx.party, action: 'ACCEPTED', price: b.price });
      const c = s.campaigns.find((x) => x.id === b.campaignId)!;
      if (c.status === 'OPEN') {
        c.status = 'RUNNING';
        c.updatedAt = ctx.t;
      }
    });
  }

  /** The awaited party refuses → DECLINED. */
  async function decline(id: string, note?: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'DECLINE');
    const n = checkNote(note);
    return commit(ctx, (b) => {
      b.status = 'DECLINED';
      delete b.awaiting;
      b.history.push({ at: ctx.t, by: ctx.party, action: 'DECLINED', ...(n ? { note: n } : {}) });
    });
  }

  /**
   * Before the deal: the party that is not awaited withdraws (brand cancels an invite, supplier withdraws an
   * application). After the deal (until the brand marks paid): either side, with a reason (4816).
   */
  async function cancel(id: string, note?: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'CANCEL');
    const n = checkNote(note);
    const started = !['SENT', 'APPLIED', 'NEGOTIATING'].includes(ctx.status);
    if (started && !n) throw new KolhubError('KOLHUB-4816');
    return commit(ctx, (b) => {
      b.status = 'CANCELLED';
      delete b.awaiting;
      b.history.push({ at: ctx.t, by: ctx.party, action: 'CANCELLED', ...(n ? { note: n } : {}) });
    });
  }

  /** Supplier (while it must answer) replaces the items: which KOL, which channel, what and how many. */
  async function assignItems(id: string, items: ProposalItemInput[]): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'ASSIGN_ITEMS');
    const me = currentSupplier(ctx.state);
    const c = ctx.state.campaigns.find((x) => x.id === ctx.booking.campaignId)!;
    const next = resolveItems(ctx.state, me, c, items, ctx.t, newId);
    return commit(ctx, (b) => {
      b.items = next;
      b.history.push({ at: ctx.t, by: 'SUPPLIER', action: 'ITEMS_ASSIGNED' });
    });
  }

  // --- content ---

  /** Supplier submits a draft (file and/or preview link); a file gets a KOL Safety verdict. → CONTENT_REVIEW. */
  async function submitDraft(id: string, input: DraftInput): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'SUBMIT_DRAFT');
    const title = (input?.title ?? '').trim().replace(/\s+/g, ' ');
    if (!title || [...title].length > CAMPAIGN_NAME_MAX) throw new KolhubError('KOLHUB-4803', { field: 'title' });
    const url = (input.url ?? '').trim();
    if (!input.file && !url) throw new KolhubError('KOLHUB-4803', { field: 'file' });
    if (input.file && (!input.file.name || typeof input.file.size !== 'number')) throw new KolhubError('KOLHUB-4803', { field: 'file' });
    if (input.itemId && !ctx.booking.items.some((i) => i.id === input.itemId)) throw new KolhubError('KOLHUB-4803', { field: 'item' });
    const note = checkNote(input.note);
    const draft: ContentSubmission = { id: newId(), kind: 'DRAFT', title, status: 'PENDING', submittedAt: ctx.t };
    if (input.itemId) draft.itemId = input.itemId;
    if (input.file) {
      draft.file = { ...input.file };
      draft.safety = scanVideoFile(input.file.name, input.durationSec ?? DEFAULT_DRAFT_SEC);
    }
    if (url) draft.url = url;
    if (note) draft.note = note;
    return commit(ctx, (b) => {
      b.contents.push(draft);
      b.status = 'CONTENT_REVIEW';
      b.history.push({ at: ctx.t, by: 'SUPPLIER', action: 'DRAFT_SUBMITTED', note: title });
    });
  }

  /**
   * Brand reviews a PENDING draft. REQUEST_CHANGES needs feedback (4803 'feedback'); no revision limit.
   * When no draft is pending any more: every item covered by an approved draft → CONTENT_APPROVED,
   * otherwise IN_PRODUCTION.
   */
  async function reviewContent(id: string, contentId: string, decision: ReviewDecision, feedback?: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'REVIEW_CONTENT');
    const content = ctx.booking.contents.find((x) => x.id === contentId && x.kind === 'DRAFT');
    if (!content || content.status !== 'PENDING') throw new KolhubError('KOLHUB-4813');
    if (decision !== 'APPROVE' && decision !== 'REQUEST_CHANGES') throw new KolhubError('KOLHUB-4805');
    const fb = checkNote(feedback, 'feedback');
    if (decision === 'REQUEST_CHANGES' && !fb) throw new KolhubError('KOLHUB-4803', { field: 'feedback' });
    return commit(ctx, (b) => {
      const x = b.contents.find((y) => y.id === contentId)!;
      x.status = decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED';
      x.reviewedAt = ctx.t;
      if (fb) x.feedback = fb;
      b.history.push({
        at: ctx.t,
        by: 'BRAND',
        action: decision === 'APPROVE' ? 'CONTENT_APPROVED' : 'CHANGES_REQUESTED',
        ...(fb ? { note: fb } : {}),
      });
      if (b.contents.some((y) => y.kind === 'DRAFT' && y.status === 'PENDING')) return;
      b.status = draftsCoverItems(b) ? 'CONTENT_APPROVED' : 'IN_PRODUCTION';
    });
  }

  /**
   * Supplier submits a published post link for an item. Mock verification runs at once: the link host must match
   * the item's platform (4811); metrics are pulled. → PUBLISHED, and VERIFIED once every item has a verified post.
   */
  async function submitPost(id: string, input: PostInput): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'SUBMIT_POST');
    const url = (input?.url ?? '').trim();
    const b0 = ctx.booking;
    const posted = (itemId: string) => b0.contents.some((x) => x.kind === 'POST' && x.itemId === itemId);
    let item = input.itemId ? b0.items.find((i) => i.id === input.itemId) : undefined;
    if (input.itemId && !item) throw new KolhubError('KOLHUB-4803', { field: 'item' });
    if (!item) {
      const platform = platformOfLink(url);
      const candidates = b0.items.filter((i) => i.platform === platform);
      item = candidates.find((i) => !posted(i.id)) ?? candidates[0];
    }
    if (!item || !postMatchesPlatform(url, item.platform)) throw new KolhubError('KOLHUB-4811');
    const ch = item.channelId ? ctx.state.channels.find((c) => c.id === item!.channelId) : undefined;
    const post: ContentSubmission = {
      id: newId(),
      kind: 'POST',
      itemId: item.id,
      title: (input.title ?? '').trim() || 'Bài đăng',
      url,
      status: 'APPROVED',
      metrics: postMetrics(url, ch?.stats?.followers ?? 0),
      verifiedAt: ctx.t,
      submittedAt: ctx.t,
    };
    return commit(ctx, (b) => {
      b.contents.push(post);
      b.history.push({ at: ctx.t, by: 'SUPPLIER', action: 'POST_SUBMITTED', note: url });
      b.history.push({ at: ctx.t, by: 'SYSTEM', action: 'POST_VERIFIED', note: url });
      b.status = postsCoverItems(b) ? 'VERIFIED' : 'PUBLISHED';
    });
  }

  // --- payment (record only) ---

  async function markPaid(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'MARK_PAID');
    return commit(ctx, (b) => {
      b.payment.brandMarkedAt = ctx.t;
      b.history.push({ at: ctx.t, by: 'BRAND', action: 'PAYMENT_MARKED', price: b.price });
    });
  }

  /** Supplier confirms receipt → COMPLETED. */
  async function confirmPaid(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'CONFIRM_PAID');
    return commit(ctx, (b) => {
      b.payment.supplierConfirmedAt = ctx.t;
      b.status = 'COMPLETED';
      b.completedAt = ctx.t;
      b.history.push({ at: ctx.t, by: 'SUPPLIER', action: 'PAYMENT_CONFIRMED', price: b.price });
    });
  }

  // --- rating, contract ---

  /** Each side rates the other once after COMPLETED (internal; 4814 stars, 4815 already rated). */
  async function rate(id: string, stars: number, comment?: string): Promise<BookingView> {
    await wait();
    const ctx = load(id);
    const mine = ctx.party === 'BRAND' ? ctx.booking.ratings?.brand : ctx.booking.ratings?.supplier;
    if (ctx.status === 'COMPLETED' && mine) throw new KolhubError('KOLHUB-4815');
    requireAction(ctx.booking, ctx.status, ctx.party, 'RATE');
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new KolhubError('KOLHUB-4814');
    const text = checkNote(comment, 'comment');
    return commit(ctx, (b) => {
      b.ratings ??= {};
      b.ratings[ctx.party === 'BRAND' ? 'brand' : 'supplier'] = { stars, comment: text, at: ctx.t };
      b.history.push({ at: ctx.t, by: ctx.party, action: 'RATED' });
    });
  }

  /** Either side attaches (or with null removes) contract file metadata: PDF / JPG / PNG / DOCX ≤ 10 MB. */
  async function setContractFile(id: string, file: StoredFile | null): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'ATTACH_CONTRACT');
    if (file && (!file.name || !CONTRACT_TYPES.includes(file.type) || !(file.size >= 0 && file.size <= CONTRACT_MAX_BYTES))) {
      throw new KolhubError('KOLHUB-4803', { field: 'contractFile' });
    }
    return commit(ctx, (b) => {
      if (file) b.contractFile = { ...file };
      else delete b.contractFile;
      b.history.push({ at: ctx.t, by: ctx.party, action: file ? 'CONTRACT_ATTACHED' : 'CONTRACT_REMOVED', ...(file ? { note: file.name } : {}) });
    });
  }

  // --- badges ---

  async function brandCounts(): Promise<BrandBookingCounts> {
    const list = await listForBrand();
    return {
      newApplications: list.filter((b) => b.status === 'APPLIED').length,
      awaitingBrand: list.filter((b) => b.awaiting === 'BRAND' && ['APPLIED', 'NEGOTIATING'].includes(b.status)).length,
      pendingReviews: list.filter((b) => b.status === 'CONTENT_REVIEW').length,
      toPay: list.filter((b) => b.status === 'VERIFIED' && !b.payment.brandMarkedAt).length,
    };
  }

  async function supplierCounts(): Promise<SupplierBookingCounts> {
    const list = await listForSupplier();
    const state = db.read();
    const t = now();
    return {
      newInvites: list.filter((b) => b.status === 'SENT').length,
      awaitingSupplier: list.filter((b) => b.awaiting === 'SUPPLIER' && ['SENT', 'NEGOTIATING'].includes(b.status)).length,
      toDeliver: list.filter((b) => ['ACCEPTED', 'IN_PRODUCTION', 'CONTENT_APPROVED', 'PUBLISHED'].includes(b.status)).length,
      toConfirmPayment: list.filter((b) => b.status === 'VERIFIED' && b.payment.brandMarkedAt && !b.payment.supplierConfirmedAt).length,
      openMarketplace: state.campaigns.filter((c) => isAcceptingApplications(c, t)).length,
    };
  }

  return {
    listForBrand,
    listForSupplier,
    get,
    counter,
    accept,
    decline,
    cancel,
    assignItems,
    submitDraft,
    reviewContent,
    submitPost,
    markPaid,
    confirmPaid,
    rate,
    setContractFile,
    brandCounts,
    supplierCounts,
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
