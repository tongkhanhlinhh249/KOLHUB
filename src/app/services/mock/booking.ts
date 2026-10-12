// Mock booking service (beta): negotiation, content review, post verification, record-only payment and
// internal ratings. Both sides use the same functions; the side is resolved from the signed-in account
// and every mutation checks `allowedActions` (KOLHUB-4805 otherwise).
import type {
  ApplyInput,
  Booking,
  BookingActionKey,
  BookingParty,
  BookingStatus,
  BookingView,
  BrandBookingCounts,
  BrandBookingFilters,
  Campaign,
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
  applySelection,
  checkNote,
  checkGroupSlots,
  checkSlots,
  currentSupplier,
  draftsCoverItems,
  effectiveStatus,
  isAcceptingApplications,
  isPrice,
  isRecruitApplication,
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
import { checkApplication, fixedPriceOf, fixedRewardOf, isRecruit, rewardValue } from './recruitment';

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

type Ctx = { state: DemoState; booking: Booking; party: BookingParty; status: BookingStatus; t: number; campaign?: Campaign };

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
    return { state, booking, party, status: effectiveStatus(booking, c, t), t, campaign: c };
  }

  function guard(id: string, action: BookingActionKey): Ctx {
    const ctx = load(id);
    requireAction(ctx.booking, ctx.status, ctx.party, action, { campaign: ctx.campaign, now: ctx.t });
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

  // --- confirmation (fixed reward per group, EP-02: no counter-offers) ---

  /**
   * The awaited party accepts → ACCEPTED (production can start) at the campaign's fixed group rewards (cash and
   * product, snapshotted on the booking). Needs a channel on every item (4809), a reward (4810) and a free slot in
   * every group it covers (4818).
   */
  async function accept(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'ACCEPT');
    if (ctx.booking.items.some((i) => !i.channelId)) throw new KolhubError('KOLHUB-4809');
    const c = ctx.campaign;
    // Older data without groups keeps its agreed price.
    const reward = c?.groups?.length ? fixedRewardOf(c, ctx.booking.items) : undefined;
    if (reward ? rewardValue(reward) <= 0 : !isPrice(ctx.booking.price)) throw new KolhubError('KOLHUB-4810');
    if (c) checkGroupSlots(ctx.state, c, ctx.booking, ctx.t);
    return commit(ctx, (b, s) => {
      if (reward) {
        b.price = reward.cash;
        if (reward.product) b.reward = reward;
      }
      b.status = 'ACCEPTED';
      delete b.awaiting;
      b.acceptedAt = ctx.t;
      b.history.push({ at: ctx.t, by: ctx.party, action: 'ACCEPTED', price: b.price });
      s.campaigns.find((x) => x.id === b.campaignId)!.updatedAt = ctx.t;
    });
  }

  /** The awaited party refuses → DECLINED. Open recruitment: the brand does not pick the applicant ("Không được chọn"). */
  async function decline(id: string, note?: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'DECLINE');
    const n = checkNote(note);
    const recruit = isRecruitApplication(ctx.booking, ctx.campaign);
    return commit(ctx, (b) => {
      b.status = 'DECLINED';
      delete b.awaiting;
      if (recruit) b.history.push({ at: ctx.t, by: 'BRAND', action: 'NOT_SELECTED', note: n || 'Không được chọn' });
      else b.history.push({ at: ctx.t, by: ctx.party, action: 'DECLINED', ...(n ? { note: n } : {}) });
    });
  }

  /** Open recruitment: the brand picks this applicant during "Chọn lọc" (SELECT) within the free slots (4818). */
  async function select(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'SELECT');
    checkSlots(ctx.state, ctx.campaign!, 1, ctx.t);
    db.update((s) => applySelection(s, ctx.campaign!.id, [id], ctx.t));
    const after = db.read();
    return toBookingView(after, after.bookings.find((x) => x.id === id)!, ctx.party, ctx.t);
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
      if (c.groups?.length) b.price = fixedPriceOf(c, next);
      b.history.push({ at: ctx.t, by: 'SUPPLIER', action: 'ITEMS_ASSIGNED' });
    });
  }

  /**
   * Sàn v2: the supplier edits its application (items, note; the price follows the fixed group rewards) while it is still APPLIED — the brand
   * has not answered yet (EDIT_APPLICATION, 4805 otherwise). Replaces the whole proposal; the reply deadline
   * (createdAt + 7 days / applyDeadline) does not move.
   */
  async function updateApplication(id: string, proposal: ApplyInput): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'EDIT_APPLICATION');
    const me = currentSupplier(ctx.state);
    const c = ctx.state.campaigns.find((x) => x.id === ctx.booking.campaignId)!;
    const items = resolveItems(ctx.state, me, c, proposal?.items ?? [], ctx.t, newId);
    const price = isRecruit(c) ? 0 : fixedPriceOf(c, items);
    const note = checkNote(proposal.note);
    const application = checkApplication(c, proposal, ctx.t);
    return commit(ctx, (b) => {
      b.items = items;
      b.price = price;
      b.note = note;
      if (application) b.application = application;
      else delete b.application;
      b.history.push({ at: ctx.t, by: 'SUPPLIER', action: 'APPLICATION_UPDATED', ...(price ? { price } : {}), ...(note ? { note } : {}) });
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

  /** Brand marks paid. Nothing to pay (product-only reward, price 0): the brand's confirmation completes the booking. */
  async function markPaid(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'MARK_PAID');
    return commit(ctx, (b) => {
      b.payment.brandMarkedAt = ctx.t;
      b.history.push({ at: ctx.t, by: 'BRAND', action: 'PAYMENT_MARKED', price: b.price });
      if (b.price === 0) {
        b.status = 'COMPLETED';
        b.completedAt = ctx.t;
      }
    });
  }

  // --- product reward (record only) ---

  /** Brand records "Đã gửi sản phẩm" (any time while the booking is in progress). */
  async function markProductSent(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'MARK_PRODUCT_SENT');
    return commit(ctx, (b) => {
      b.shipment = { ...(b.shipment ?? {}), sentAt: ctx.t };
      b.history.push({ at: ctx.t, by: 'BRAND', action: 'PRODUCT_SENT', note: b.reward?.product?.name });
    });
  }

  /** Supplier records "Đã nhận sản phẩm" after the brand marked it sent. */
  async function confirmProductReceived(id: string): Promise<BookingView> {
    await wait();
    const ctx = guard(id, 'CONFIRM_PRODUCT_RECEIVED');
    return commit(ctx, (b) => {
      b.shipment = { ...(b.shipment ?? {}), receivedAt: ctx.t };
      b.history.push({ at: ctx.t, by: 'SUPPLIER', action: 'PRODUCT_RECEIVED', note: b.reward?.product?.name });
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
    requireAction(ctx.booking, ctx.status, ctx.party, 'RATE', { campaign: ctx.campaign, now: ctx.t });
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
    accept,
    decline,
    select,
    cancel,
    updateApplication,
    assignItems,
    submitDraft,
    reviewContent,
    submitPost,
    markPaid,
    confirmPaid,
    markProductSent,
    confirmProductReceived,
    rate,
    setContractFile,
    brandCounts,
    supplierCounts,
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
