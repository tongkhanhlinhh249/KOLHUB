// Mock campaign service (beta): Brand campaigns, KOL invites (routed to MCN or KOL) and the supplier-side
// marketplace ("Sàn chiến dịch"). Actor = the signed-in account (state.sessionAccountId).
import type {
  AppliedCampaign,
  ApplyInput,
  Booking,
  BookingItem,
  BookingView,
  Campaign,
  CampaignFilters,
  CampaignInput,
  CampaignPatch,
  CampaignQA,
  CampaignQAView,
  CampaignView,
  InviteOptions,
  InviteResult,
  MarketplaceCampaign,
  MarketplaceFilters,
  SelectionResult,
  SupplierMatchContext,
} from '../campaign-types';
import { CAMPAIGN_REASON_MAX, isDeliverableForPlatform, QA_ANSWER_MAX, QA_QUESTION_MAX, UNPUBLISHED_STATUSES, type CampaignLogEntry } from '../campaign-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import {
  brandInfoOf,
  checkNote,
  currentSupplier,
  effectiveStatus,
  endOfDay,
  inviteDeliverable,
  isAcceptingApplications,
  isInProgress,
  isListedOnMarketplace,
  isOccupying,
  isPreAccept,
  isPrice,
  resolveItems,
  applySelection,
  applyWindowEnded,
  checkSlots,
  hasPublicPage,
  sweepCampaignStatuses,
  routeKol,
  sanitizeCampaignInput,
  selectedCount,
  toBookingView,
  toCampaignView,
  toMarketplaceCampaign,
  validateForOpen,
} from './campaignRules';
import { normalizeText, publicKolOf } from './directory';
import { profileDisplayName } from './identity';
import { campaignType, checkApplication, deriveCampaignFields, fixedPriceOf, isRecruit, recruitPhase } from './recruitment';
import { matchCampaign, supplierMatchContext } from './campaignMatch';

export interface CampaignServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
  genId?: () => string;
}

/** Fields an OPEN campaign with applications may still change (EP-02 §7: ảnh, tên, mô tả giới thiệu). */
const PRESENTATION_KEYS: string[] = ['name', 'cover', 'objective'];

/** Empty values (undefined / null / '' / []) count as the same; everything else compares by value. */
function sameValue(a: unknown, b: unknown): boolean {
  const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
  if (empty(a) && empty(b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Campaign fields whose value differs between `before` and `after` (bookkeeping fields ignored). */
function changedKeys(before: Campaign, after: Campaign): string[] {
  const skip = new Set(['updatedAt', 'log', 'pendingRevision', 'reviewNote']);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => !skip.has(k) && !sameValue((before as unknown as Record<string, unknown>)[k], (after as unknown as Record<string, unknown>)[k]));
}

export function createCampaignService(deps: CampaignServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());
  const newId = () => deps.genId?.() ?? crypto.randomUUID();

  /** The brand's own campaign (4801 when missing or someone else's). */
  function ownCampaign(state: DemoState, id: string): Campaign {
    const acc = currentBizAccount(state);
    const c = state.campaigns.find((x) => x.id === id && x.brandAccountId === acc.id);
    if (!c) throw new KolhubError('KOLHUB-4801');
    return c;
  }

  /** Current state with OPEN campaigns past their apply window closed (EP-02 §8: hết hạn luôn tự đóng). */
  function read(): DemoState {
    const t = now();
    if (db.read().campaigns.some((c) => c.status === 'OPEN' && applyWindowEnded(c, t))) db.update((s) => void sweepCampaignStatuses(s, t));
    return db.read();
  }

  const log = (c: Campaign, entry: CampaignLogEntry) => {
    c.log = [...(c.log ?? []), entry];
  };

  function save(c: Campaign) {
    db.update((s) => {
      const i = s.campaigns.findIndex((x) => x.id === c.id);
      if (i >= 0) s.campaigns[i] = c;
      else s.campaigns.push(c);
    });
  }

  function view(id: string): CampaignView {
    const state = db.read();
    return toCampaignView(state, state.campaigns.find((c) => c.id === id)!, now());
  }

  // --- Brand ---

  /** The brand's campaigns, most recently updated first. */
  async function listMine(filters: CampaignFilters = {}): Promise<CampaignView[]> {
    await wait();
    const state = read();
    const acc = currentBizAccount(state);
    const t = now();
    const statuses = filters.status === undefined ? undefined : ([] as string[]).concat(filters.status);
    const kw = normalizeText(filters.keyword ?? '');
    return state.campaigns
      .filter((c) => c.brandAccountId === acc.id)
      .filter((c) => !statuses || statuses.includes(c.status))
      .filter((c) => !filters.visibility || c.visibility === filters.visibility)
      .filter((c) => !kw || normalizeText(`${c.name} ${c.objective} ${c.brief}`).includes(kw))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((c) => toCampaignView(state, c, t));
  }

  async function get(id: string): Promise<CampaignView> {
    await wait();
    const state = read();
    return toCampaignView(state, ownCampaign(state, id), now());
  }

  /** New DRAFT; only `name` is required (4803 with `field` for anything malformed). */
  async function create(input: CampaignInput): Promise<CampaignView> {
    await wait();
    const acc = currentBizAccount(db.read());
    const clean = sanitizeCampaignInput({ ...input, name: input?.name ?? '' });
    const t = now();
    const c: Campaign = {
      id: newId(),
      brandAccountId: acc.id,
      name: clean.name!,
      objective: clean.objective ?? '',
      brief: clean.brief ?? '',
      budget: clean.budget ?? 0,
      platforms: clean.platforms ?? [],
      categories: clean.categories ?? [],
      deliverables: clean.deliverables ?? [],
      contentRules: clean.contentRules ?? '',
      visibility: clean.visibility ?? 'PRIVATE',
      type: clean.type ?? 'BOOKING',
      status: 'DRAFT',
      createdAt: t,
      updatedAt: t,
    };
    if (clean.startDate) c.startDate = clean.startDate;
    if (clean.endDate) c.endDate = clean.endDate;
    if (clean.applyDeadline) c.applyDeadline = clean.applyDeadline;
    if (clean.applyDeadlineTime) c.applyDeadlineTime = clean.applyDeadlineTime;
    if (clean.promotedBrand) c.promotedBrand = clean.promotedBrand;
    if (clean.usageRights) c.usageRights = clean.usageRights;
    if (clean.cover) c.cover = clean.cover;
    for (const k of ['recruitment', 'groups', 'draftReview', 'contract', 'regions', 'target', 'survey', 'terms'] as const) {
      if (clean[k] !== undefined) (c as unknown as Record<string, unknown>)[k] = clean[k];
    }
    deriveCampaignFields(c);
    save(c);
    return view(c.id);
  }

  /**
   * Edit (EP-02 §7). DRAFT / NEEDS_FIX / REJECTED: anything, checked again on submit. PENDING_REVIEW: withdraw first
   * (4802). OPEN: the edit waits for Admin review as a revision while the public campaign keeps its current version —
   * without applications, changed terms pause new applications; with applications, only the cover, name and
   * description may change (4820). CLOSED / COMPLETED / CANCELLED: 4802.
   */
  async function update(id: string, patch: CampaignPatch): Promise<CampaignView> {
    await wait();
    const state = read();
    const c = structuredClone(ownCampaign(state, id));
    const editable: Campaign['status'][] = ['DRAFT', 'NEEDS_FIX', 'REJECTED', 'OPEN'];
    if (!editable.includes(c.status)) throw new KolhubError('KOLHUB-4802');
    const clean = sanitizeCampaignInput(patch ?? {});
    const t = now();
    const mine = state.bookings.filter((b) => b.campaignId === id);
    // The type decides how bookings work: it cannot change once there are bookings.
    if (clean.type && campaignType(clean) !== campaignType(c) && mine.length > 0) throw new KolhubError('KOLHUB-4803', { field: 'type' });
    const next: Campaign = { ...c, ...clean, updatedAt: t };
    for (const k of ['startDate', 'endDate', 'applyDeadline', 'applyDeadlineTime', 'promotedBrand', 'usageRights', 'cover', 'recruitment', 'groups', 'target'] as const) {
      if (next[k] === undefined) delete next[k];
    }
    deriveCampaignFields(next);
    if (isRecruit(next) && next.recruitment.slots < selectedCount(state, next, t)) throw new KolhubError('KOLHUB-4803', { field: 'slots' });
    if (c.status !== 'OPEN') {
      save(next);
      return view(id);
    }
    // OPEN: keep the public version; the changes become a revision for Admin review.
    const changed = changedKeys(c, next);
    if (changed.length === 0) return view(id);
    const hasApplications = mine.length > 0;
    if (hasApplications && changed.some((k) => !PRESENTATION_KEYS.includes(k))) throw new KolhubError('KOLHUB-4824');
    validateForOpen(next, t);
    const revisionPatch = Object.fromEntries(changed.map((k) => [k, (next as unknown as Record<string, unknown>)[k] ?? null])) as CampaignPatch;
    db.update((s) => {
      const sc = s.campaigns.find((x) => x.id === id)!;
      sc.pendingRevision = { patch: revisionPatch, submittedAt: t, pausesApplications: !hasApplications };
      sc.updatedAt = t;
      log(sc, { at: t, by: 'BRAND', action: 'REVISION_SUBMITTED' });
    });
    return view(id);
  }

  function open(c: Campaign, t: number): void {
    c.status = 'OPEN';
    c.publishedAt ??= t;
    c.updatedAt = t;
  }

  /**
   * "Gửi đăng" (EP-02 §6.2): DRAFT / NEEDS_FIX / REJECTED → PENDING_REVIEW once complete (4803 with the field otherwise,
   * 4802 for other statuses). Admin approves before the campaign goes public (approveReview).
   */
  async function publish(id: string): Promise<CampaignView> {
    await wait();
    const c = structuredClone(ownCampaign(read(), id));
    if (!['DRAFT', 'NEEDS_FIX', 'REJECTED'].includes(c.status)) throw new KolhubError('KOLHUB-4802');
    const t = now();
    deriveCampaignFields(c);
    validateForOpen(c, t, true);
    if (applyWindowEnded(c, t)) throw new KolhubError('KOLHUB-4823');
    c.status = 'PENDING_REVIEW';
    c.updatedAt = t;
    log(c, { at: t, by: 'BRAND', action: 'SUBMITTED' });
    save(c);
    return view(id);
  }

  /** "Rút về nháp": PENDING_REVIEW → DRAFT before Admin decides (4802 otherwise). */
  async function withdraw(id: string): Promise<CampaignView> {
    await wait();
    const c = structuredClone(ownCampaign(read(), id));
    if (c.status !== 'PENDING_REVIEW') throw new KolhubError('KOLHUB-4802');
    const t = now();
    c.status = 'DRAFT';
    c.updatedAt = t;
    log(c, { at: t, by: 'BRAND', action: 'WITHDRAWN' });
    save(c);
    return view(id);
  }

  /** Delete a DRAFT that was never submitted (EP-02 §6.5; 4802 otherwise). */
  async function deleteDraft(id: string): Promise<void> {
    await wait();
    const c = ownCampaign(read(), id);
    if (c.status !== 'DRAFT' || (c.log ?? []).some((e) => e.action === 'SUBMITTED') || db.read().bookings.some((b) => b.campaignId === id)) {
      throw new KolhubError('KOLHUB-4802');
    }
    db.update((s) => {
      s.campaigns = s.campaigns.filter((x) => x.id !== id);
      s.savedCampaigns = s.savedCampaigns.filter((x) => x.campaignId !== id);
    });
  }

  // --- Admin (Bảng demo): kiểm duyệt trước đăng và duyệt bản sửa ---

  function anyCampaign(state: DemoState, id: string): Campaign {
    const c = state.campaigns.find((x) => x.id === id);
    if (!c) throw new KolhubError('KOLHUB-4801');
    return c;
  }

  /** Campaigns waiting for Admin: submitted ones and OPEN ones with an edit under review, oldest first. */
  async function listReviewQueue(): Promise<CampaignView[]> {
    await wait();
    const state = read();
    const t = now();
    const at = (c: Campaign) => (c.status === 'PENDING_REVIEW' ? [...(c.log ?? [])].reverse().find((e) => e.action === 'SUBMITTED')?.at ?? c.updatedAt : c.pendingRevision!.submittedAt);
    return state.campaigns
      .filter((c) => c.status === 'PENDING_REVIEW' || (c.status === 'OPEN' && c.pendingRevision))
      .sort((a, b) => at(a) - at(b))
      .map((c) => toCampaignView(state, c, t));
  }

  /**
   * Admin approves: a submitted campaign goes OPEN (published) — unless its apply window already ended, then it goes
   * back to NEEDS_FIX ("Hạn ứng tuyển đã qua…", EP-02 §6.3); an edit under review is applied to the OPEN campaign.
   */
  async function approveReview(id: string): Promise<CampaignView> {
    await wait();
    const t = now();
    db.update((s) => {
      const c = anyCampaign(s, id);
      if (c.status === 'OPEN' && c.pendingRevision) {
        Object.assign(c, c.pendingRevision.patch);
        for (const k of Object.keys(c.pendingRevision.patch) as (keyof Campaign)[]) if ((c as unknown as Record<string, unknown>)[k] === null) delete (c as unknown as Record<string, unknown>)[k];
        delete c.pendingRevision;
        c.updatedAt = t;
        log(c, { at: t, by: 'ADMIN', action: 'REVISION_APPROVED' });
        return;
      }
      if (c.status !== 'PENDING_REVIEW') throw new KolhubError('KOLHUB-4802');
      if (applyWindowEnded(c, t)) {
        const note = 'Hạn ứng tuyển đã qua. Vui lòng cập nhật trước khi gửi đăng.';
        c.status = 'NEEDS_FIX';
        c.reviewNote = note;
        c.updatedAt = t;
        log(c, { at: t, by: 'ADMIN', action: 'NEEDS_FIX', note });
        return;
      }
      open(c, t);
      delete c.reviewNote;
      log(c, { at: t, by: 'ADMIN', action: 'APPROVED' });
    });
    return view(id);
  }

  function reviewReason(note: string): string {
    const r = (note ?? '').trim();
    if (!r || [...r].length > CAMPAIGN_REASON_MAX) throw new KolhubError('KOLHUB-4825');
    return r;
  }

  /** Admin: "Cần bổ sung" / "Không được duyệt" with a reason (4821). On an edit under review: the edit is dropped. */
  async function decideReview(id: string, outcome: 'NEEDS_FIX' | 'REJECTED', note: string): Promise<CampaignView> {
    await wait();
    const r = reviewReason(note);
    const t = now();
    db.update((s) => {
      const c = anyCampaign(s, id);
      if (c.status === 'OPEN' && c.pendingRevision) {
        delete c.pendingRevision;
        c.reviewNote = r;
        c.updatedAt = t;
        log(c, { at: t, by: 'ADMIN', action: 'REVISION_REJECTED', note: r });
        return;
      }
      if (c.status !== 'PENDING_REVIEW') throw new KolhubError('KOLHUB-4802');
      c.status = outcome;
      c.reviewNote = r;
      c.updatedAt = t;
      log(c, { at: t, by: 'ADMIN', action: outcome, note: r });
    });
    return view(id);
  }

  /**
   * "Đóng tuyển" (EP-02 §6.4, §8): OPEN → CLOSED. Stops new applications only: invites / applications already sent are
   * kept and handled, bookings continue.
   */
  async function closeRecruitment(id: string): Promise<CampaignView> {
    await wait();
    const c = structuredClone(ownCampaign(read(), id));
    if (c.status !== 'OPEN') throw new KolhubError('KOLHUB-4802');
    const t = now();
    c.status = 'CLOSED';
    c.recruitmentClosedAt = t;
    delete c.pendingRevision;
    c.updatedAt = t;
    log(c, { at: t, by: 'BRAND', action: 'CLOSED' });
    save(c);
    return view(id);
  }

  /**
   * "Hoàn tất" (EP-02 §6.5): CLOSED → COMPLETED when no application / invite is waiting and every booking has ended
   * (4822 otherwise). Without any confirmed booking the result is "Không phát sinh hợp tác". Never automatic.
   */
  async function close(id: string): Promise<CampaignView> {
    await wait();
    const state = read();
    const c = structuredClone(ownCampaign(state, id));
    if (c.status !== 'CLOSED') throw new KolhubError('KOLHUB-4802');
    const t = now();
    const mine = state.bookings.filter((b) => b.campaignId === id).map((b) => effectiveStatus(b, c, t));
    if (mine.some((st) => isPreAccept(st) || isInProgress(st))) throw new KolhubError('KOLHUB-4826');
    c.status = 'COMPLETED';
    c.closedAt = t;
    c.noCollaboration = !mine.includes('COMPLETED');
    c.updatedAt = t;
    log(c, { at: t, by: 'BRAND', action: 'COMPLETED', ...(c.noCollaboration ? { note: 'Không phát sinh hợp tác' } : {}) });
    save(c);
    return view(id);
  }

  /**
   * "Huỷ chiến dịch" with a reason (4821): any status but COMPLETED / CANCELLED (4802). Not while a booking is in
   * progress (4817): those go through booking / operations first. Waiting invites / applications are cancelled by the
   * system with the reason, so the applicants are told.
   */
  async function cancel(id: string, reason?: string): Promise<CampaignView> {
    await wait();
    const r = reviewReason(reason ?? '');
    const state = read();
    const c = ownCampaign(state, id);
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') throw new KolhubError('KOLHUB-4802');
    const t = now();
    const mine = state.bookings.filter((b) => b.campaignId === id);
    if (mine.some((b) => isInProgress(effectiveStatus(b, c, t)))) throw new KolhubError('KOLHUB-4817');
    db.update((s) => {
      const sc = s.campaigns.find((x) => x.id === id)!;
      sc.status = 'CANCELLED';
      sc.cancelReason = r;
      sc.closedAt = t;
      delete sc.pendingRevision;
      sc.updatedAt = t;
      log(sc, { at: t, by: 'BRAND', action: 'CANCELLED', note: r });
      for (const b of s.bookings) {
        if (b.campaignId !== id || !isPreAccept(effectiveStatus(b, sc, t))) continue;
        b.status = 'CANCELLED';
        delete b.awaiting;
        b.updatedAt = t;
        b.history.push({ at: t, by: 'SYSTEM', action: 'CANCELLED', note: `Chiến dịch đã bị huỷ: ${r}` });
      }
    });
    return view(id);
  }

  /**
   * Invite KOLs (by KOL ID) to an OPEN ("Đang tuyển") campaign.
   * Routing (spec §4): KOLs managed by an MCN go to that MCN, grouped into one SENT booking per MCN
   * (an existing SENT invite of the same MCN on this campaign is extended); others get their own booking.
   * Unknown / unlisted KOLs and KOLs already in an occupying booking of the campaign are skipped.
   */
  async function inviteKols(campaignId: string, kolIds: string[], opts: InviteOptions = {}): Promise<InviteResult> {
    await wait();
    const state = read();
    const c = structuredClone(ownCampaign(state, campaignId));
    // EP-02: only a published campaign that is recruiting ("Đang tuyển") can invite.
    if (c.status !== 'OPEN') throw new KolhubError('KOLHUB-4802');
    // "Tuyển nhiều KOL": KOL/MCN apply on the Sàn and the brand picks; no private invites.
    if (campaignType(c) === 'OPEN_RECRUITMENT') throw new KolhubError('KOLHUB-4802');
    const ids = [...new Set((kolIds ?? []).map((k) => (k ?? '').trim()).filter(Boolean))];
    if (ids.length === 0) throw new KolhubError('KOLHUB-4812');
    const note = checkNote(opts.note);
    const t = now();
    const deliverable = inviteDeliverable(c, opts.deliverable);

    const result: InviteResult = { bookings: [], created: 0, updated: 0, skipped: [] };
    const bookings = state.bookings.map((b) => structuredClone(b));
    const touched = new Set<string>();
    const createdIds = new Set<string>();
    const inCampaign = (kolAccountId: string) =>
      bookings.some((b) => b.campaignId === c.id && isOccupying(effectiveStatus(b, c, t)) && b.items.some((i) => i.kolAccountId === kolAccountId));

    for (const kolId of ids) {
      const profile = state.kolProfiles.find((p) => p.kolId === kolId);
      if (!profile || !publicKolOf(profile, state.channels, t)) {
        result.skipped.push({ kolId, reason: 'NOT_FOUND' });
        continue;
      }
      if (inCampaign(profile.accountId)) {
        result.skipped.push({ kolId, reason: 'ALREADY_INVITED' });
        continue;
      }
      const route = routeKol(state, profile.accountId, t);
      const ch =
        route.channels.find((x) => x.platform === deliverable.platform) ??
        // Another campaign platform only if it offers the same content type (no "Nhật ký" on YouTube).
        route.channels.find((x) => c.platforms.includes(x.platform) && isDeliverableForPlatform(deliverable.type, x.platform));
      const item: BookingItem = {
        id: newId(),
        kolAccountId: profile.accountId,
        kolId,
        platform: ch?.platform ?? deliverable.platform,
        deliverableType: deliverable.type,
        quantity: deliverable.quantity,
      };
      if (ch) item.channelId = ch.id;

      const existing = bookings.find(
        (b) =>
          b.campaignId === c.id &&
          b.origin === 'INVITE' &&
          b.supplierAccountId === route.supplierAccountId &&
          effectiveStatus(b, c, t) === 'SENT',
      );
      if (existing) {
        existing.items.push(item);
        // Fixed reward per channel × group (EP-02): the price follows the items.
        existing.price = fixedPriceOf(c, existing.items);
        existing.updatedAt = t;
        existing.history.push({ at: t, by: 'BRAND', action: 'ITEMS_ADDED', price: existing.price, ...(note ? { note } : {}) });
        touched.add(existing.id);
      } else {
        const price = fixedPriceOf(c, [item]);
        const b: Booking = {
          id: newId(),
          campaignId: c.id,
          brandAccountId: c.brandAccountId,
          supplierType: route.supplierType,
          supplierAccountId: route.supplierAccountId,
          origin: 'INVITE',
          items: [item],
          price,
          note,
          status: 'SENT',
          awaiting: 'SUPPLIER',
          history: [{ at: t, by: 'BRAND', action: 'INVITED', price, ...(note ? { note } : {}) }],
          contents: [],
          payment: {},
          createdAt: t,
          updatedAt: t,
        };
        bookings.push(b);
        touched.add(b.id);
        createdIds.add(b.id);
      }
    }

    if (touched.size > 0) {
      db.update((s) => {
        s.bookings = bookings;
        const sc = s.campaigns.find((x) => x.id === c.id)!;
        sc.updatedAt = t;
      });
    }
    const after = db.read();
    for (const id of touched) {
      result.bookings.push(toBookingView(after, after.bookings.find((b) => b.id === id)!, 'BRAND', t));
      if (createdIds.has(id)) result.created++;
      else result.updated++;
    }
    return result;
  }

  // --- Supplier (MCN / independent KOL with an APPROVED profile) ---

  /**
   * Who is browsing the marketplace: any signed-in KOL / MCN (read-only while the profile is not approved yet);
   * applying still needs an approved profile (currentSupplier, 4806). With `allowPublic`, a BIZ account or a guest
   * (no session, accountId '') may browse read-only (listMarketplace / getMarketplaceItem only: public brief fields,
   * no match / saved / myBooking). Otherwise guests and BIZ → 4806.
   */
  function marketplaceViewer(state: DemoState, opts: { allowPublic?: boolean } = {}): { accountId: string; brand: boolean } {
    const acc = state.sessionAccountId ? state.accounts.find((a) => a.id === state.sessionAccountId) : undefined;
    if (opts.allowPublic && !acc) return { accountId: '', brand: true };
    if (acc && opts.allowPublic && acc.type === 'BIZ') return { accountId: acc.id, brand: true };
    if (acc?.type !== 'KOL' && acc?.type !== 'MCN') throw new KolhubError('KOLHUB-4806');
    return { accountId: acc.id, brand: false };
  }

  /**
   * Marketplace card of `c` for the viewer: match, saved flag, accepting flag, `mine`.
   * Brand viewer (`ctx` null): no match, never saved, no myBooking (brands have no supplier bookings).
   */
  function card(
    state: DemoState,
    c: Campaign,
    viewerId: string,
    ctx: SupplierMatchContext | null,
    saved: Set<string>,
    t: number,
  ): MarketplaceCampaign {
    const item: MarketplaceCampaign = {
      ...toMarketplaceCampaign(state, c, ctx ? viewerId : null, t),
      saved: saved.has(c.id),
      accepting: isAcceptingApplications(c, t),
      mine: c.brandAccountId === viewerId,
    };
    // EP-02 §8: a closed campaign keeps its public page with the "Đã đóng tuyển" label; an edit under review pauses it.
    if (c.status === 'CLOSED' || c.status === 'COMPLETED') item.recruitmentClosed = true;
    if (c.status === 'OPEN' && c.pendingRevision?.pausesApplications) item.paused = true;
    if (ctx) item.match = matchCampaign(c, ctx);
    return item;
  }

  /** Viewer's match context + bookmarks (empty / null for a brand viewer). */
  function viewerContext(state: DemoState, me: { accountId: string; brand: boolean }, t: number) {
    return me.brand
      ? { ctx: null, saved: new Set<string>() }
      : { ctx: supplierMatchContext(state, me.accountId, t), saved: savedIds(state, me.accountId) };
  }

  const savedIds = (state: DemoState, accountId: string) =>
    new Set(state.savedCampaigns.filter((x) => x.accountId === accountId).map((x) => x.campaignId));

  /** Filters on the campaign itself (category / platform / budget); the keyword is matched on the card. */
  function campaignFilter(filters: MarketplaceFilters) {
    return (c: Campaign) =>
      (!filters.type || campaignType(c) === filters.type) &&
      (!filters.category || c.categories.includes(filters.category)) &&
      (!filters.platform || c.platforms.includes(filters.platform)) &&
      (filters.budgetMin === undefined || c.budget >= filters.budgetMin) &&
      (filters.budgetMax === undefined || c.budget <= filters.budgetMax);
  }

  function keywordFilter(filters: MarketplaceFilters) {
    const kw = normalizeText(filters.keyword ?? '');
    return (m: MarketplaceCampaign) => !kw || normalizeText(`${m.name} ${m.objective} ${m.brief} ${m.brand.company}`).includes(kw);
  }

  /**
   * Sort (default 'match': score desc, then newest — without match scores (brand viewer) that is just newest).
   * Campaigns still taking applications come first; open-recruitment campaigns past "Ứng tuyển" follow.
   */
  function compare(sort: MarketplaceFilters['sort'] = 'match') {
    const deadline = (m: MarketplaceCampaign) => (m.applyDeadlineAt !== undefined && m.accepting !== false ? m.applyDeadlineAt : Infinity);
    return (a: MarketplaceCampaign, b: MarketplaceCampaign) => {
      const open = Number(b.accepting !== false) - Number(a.accepting !== false);
      if (open) return open;
      if (sort === 'budget') return b.budget - a.budget || b.publishedAt - a.publishedAt;
      if (sort === 'deadline') return deadline(a) - deadline(b) || b.publishedAt - a.publishedAt;
      if (sort === 'match') return (b.match?.score ?? 0) - (a.match?.score ?? 0) || b.publishedAt - a.publishedAt;
      return b.publishedAt - a.publishedAt;
    };
  }

  function marketplaceList(
    filters: MarketplaceFilters,
    only?: (c: Campaign, saved: Set<string>) => boolean,
    allowPublic = false,
  ): MarketplaceCampaign[] {
    const state = read();
    const me = marketplaceViewer(state, { allowPublic });
    const t = now();
    const { ctx, saved } = viewerContext(state, me, t);
    return state.campaigns
      .filter((c) => isListedOnMarketplace(c, t))
      .filter((c) => !only || only(c, saved))
      .filter(campaignFilter(filters))
      .map((c) => card(state, c, me.accountId, ctx, saved, t))
      .filter(keywordFilter(filters))
      .sort(compare(filters.sort));
  }

  /**
   * Campaigns open for applications (MARKETPLACE, OPEN / RUNNING, deadline not passed), each with the viewer's
   * `match` ("Phù hợp với bạn") and `saved` flag. Default sort 'match'.
   * BIZ accounts and guests may browse read-only (no match / saved / myBooking; `mine` marks a brand's own campaigns).
   */
  async function listMarketplace(filters: MarketplaceFilters = {}): Promise<MarketplaceCampaign[]> {
    await wait();
    return marketplaceList(filters, undefined, true);
  }

  /** Marketplace detail (+ match, saved, brand block); 4801 unless open for applications or the supplier has a booking on it. */
  async function getMarketplaceItem(id: string): Promise<MarketplaceCampaign> {
    await wait();
    const state = read();
    const me = marketplaceViewer(state, { allowPublic: true });
    const t = now();
    const c = state.campaigns.find((x) => x.id === id);
    if (!c || UNPUBLISHED_STATUSES.includes(c.status)) throw new KolhubError('KOLHUB-4801');
    const { ctx, saved } = viewerContext(state, me, t);
    const item = card(state, c, me.accountId, ctx, saved, t);
    // Published marketplace campaigns keep a public page after recruitment closed (EP-02 §8: "Đã đóng tuyển", no apply
    // button); a cancelled one stays viewable by a supplier that has a booking on it or saved it.
    if (!hasPublicPage(c) && !(c.visibility === 'MARKETPLACE' && (item.myBooking || item.saved))) throw new KolhubError('KOLHUB-4801');
    return { ...item, brandInfo: brandInfoOf(state, c.brandAccountId, t) };
  }

  // --- saved campaigns (any signed-in KOL / MCN, like browsing) ---

  /** Bookmark a campaign that is open on the marketplace (4801 otherwise). Idempotent. */
  async function saveCampaign(id: string): Promise<void> {
    await wait();
    const state = read();
    const me = marketplaceViewer(state);
    const c = state.campaigns.find((x) => x.id === id);
    if (!c || !isListedOnMarketplace(c, now())) throw new KolhubError('KOLHUB-4801');
    if (state.savedCampaigns.some((x) => x.accountId === me.accountId && x.campaignId === id)) return;
    db.update((s) => {
      s.savedCampaigns.push({ accountId: me.accountId, campaignId: id, savedAt: now() });
    });
  }

  /** Remove a bookmark (no-op when absent). */
  async function unsaveCampaign(id: string): Promise<void> {
    await wait();
    const me = marketplaceViewer(db.read());
    db.update((s) => {
      s.savedCampaigns = s.savedCampaigns.filter((x) => !(x.accountId === me.accountId && x.campaignId === id));
    });
  }

  /** "Đã lưu": bookmarked campaigns still open for applications, same filters / sort as listMarketplace. */
  async function listSaved(filters: MarketplaceFilters = {}): Promise<MarketplaceCampaign[]> {
    await wait();
    return marketplaceList(filters, (c, saved) => saved.has(c.id));
  }

  /**
   * "Chiến dịch yêu thích › Đã lưu": every bookmarked campaign that is still public (not draft / private), including
   * the ones no longer taking applications (`accepting` false; filter with filterByInterest). Newest bookmark first.
   */
  async function listSavedAll(): Promise<MarketplaceCampaign[]> {
    await wait();
    const state = read();
    const me = marketplaceViewer(state);
    const t = now();
    const { ctx, saved } = viewerContext(state, me, t);
    const savedAt = new Map(state.savedCampaigns.filter((x) => x.accountId === me.accountId).map((x) => [x.campaignId, x.savedAt]));
    return state.campaigns
      .filter((c) => saved.has(c.id) && !UNPUBLISHED_STATUSES.includes(c.status) && c.visibility === 'MARKETPLACE')
      .map((c) => card(state, c, me.accountId, ctx, saved, t))
      .sort((a, b) => (savedAt.get(b.id) ?? 0) - (savedAt.get(a.id) ?? 0));
  }

  /**
   * "Đã ứng tuyển": every application (origin APPLICATION) of the viewer, any status, with its campaign
   * (`accepting` false once it stopped taking applications). Same filters / sort as listMarketplace.
   * Unapproved KOL / MCN simply have none.
   */
  async function listApplied(filters: MarketplaceFilters = {}): Promise<AppliedCampaign[]> {
    await wait();
    const state = read();
    const me = marketplaceViewer(state);
    const t = now();
    const ctx = supplierMatchContext(state, me.accountId, t);
    const saved = savedIds(state, me.accountId);
    const ofCampaign = campaignFilter(filters);
    const byKeyword = keywordFilter(filters);
    const order = compare(filters.sort);
    return state.bookings
      .filter((b) => b.supplierAccountId === me.accountId && b.origin === 'APPLICATION')
      .map((b) => ({ b, c: state.campaigns.find((x) => x.id === b.campaignId) }))
      .filter((x): x is { b: Booking; c: Campaign } => !!x.c && ofCampaign(x.c))
      .map(({ b, c }) => {
        const v = toBookingView(state, b, 'SUPPLIER', t);
        const booking: AppliedCampaign['booking'] = {
          id: v.id,
          status: v.status,
          payment: v.payment,
          price: v.price,
          origin: v.origin,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          allowedActions: v.allowedActions,
          campaign: v.campaign,
        };
        if (v.awaiting) booking.awaiting = v.awaiting;
        if (v.expiresAt !== undefined) booking.expiresAt = v.expiresAt;
        return { booking, campaign: card(state, c, me.accountId, ctx, saved, t) };
      })
      .filter((x) => byKeyword(x.campaign))
      .sort((a, b) => order(a.campaign, b.campaign) || b.booking.updatedAt - a.booking.updatedAt);
  }

  /**
   * Apply to a marketplace campaign with a proposal (no price: the fixed group rewards apply). MCN: items = its managed KOLs + an MCN channel assigned to
   * each; KOL: its own channels. One occupying booking per supplier per campaign (4807).
   */
  async function apply(campaignId: string, proposal: ApplyInput): Promise<BookingView> {
    await wait();
    const state = read();
    const me = currentSupplier(state);
    const t = now();
    const c = state.campaigns.find((x) => x.id === campaignId);
    if (!c || UNPUBLISHED_STATUSES.includes(c.status) || c.visibility !== 'MARKETPLACE') throw new KolhubError('KOLHUB-4801');
    if (!isAcceptingApplications(c, t)) throw new KolhubError('KOLHUB-4808');
    if (state.bookings.some((b) => b.campaignId === c.id && b.supplierAccountId === me.accountId && isOccupying(effectiveStatus(b, c, t)))) {
      throw new KolhubError('KOLHUB-4807');
    }
    const items = resolveItems(state, me, c, proposal?.items ?? [], t, newId);
    // No quote (EP-02): Booking riêng = the group rewards of the proposed channels; "Tuyển nhiều KOL" = the reward when picked.
    const price = isRecruit(c) ? 0 : fixedPriceOf(c, items);
    const note = checkNote(proposal.note);
    const application = checkApplication(c, proposal, t);
    const b: Booking = {
      id: newId(),
      campaignId: c.id,
      brandAccountId: c.brandAccountId,
      supplierType: me.type,
      supplierAccountId: me.accountId,
      origin: 'APPLICATION',
      items,
      price,
      note,
      status: 'APPLIED',
      awaiting: 'BRAND',
      history: [{ at: t, by: 'SUPPLIER', action: 'APPLIED', ...(price ? { price } : {}), ...(note ? { note } : {}) }],
      contents: [],
      payment: {},
      ...(application ? { application } : {}),
      createdAt: t,
      updatedAt: t,
    };
    db.update((s) => {
      s.bookings.push(b);
    });
    return toBookingView(db.read(), b, 'SUPPLIER', t);
  }

  // --- "Tuyển nhiều KOL": picking applicants (brand) ---

  /** The brand's open-recruitment campaign and the APPLIED applications among `bookingIds` (4801 / 4802 / 4805). */
  function selection(campaignId: string, bookingIds: string[]) {
    const state = read();
    const c = ownCampaign(state, campaignId);
    // Applications already sent are still handled after recruitment closed (EP-02 §6.4).
    if (!isRecruit(c) || (c.status !== 'OPEN' && c.status !== 'CLOSED')) throw new KolhubError('KOLHUB-4802');
    const t = now();
    const ids = [...new Set((bookingIds ?? []).filter(Boolean))];
    if (ids.length === 0) throw new KolhubError('KOLHUB-4812');
    for (const id of ids) {
      const b = state.bookings.find((x) => x.id === id && x.campaignId === c.id);
      if (!b) throw new KolhubError('KOLHUB-4804');
      if (b.origin !== 'APPLICATION' || effectiveStatus(b, c, t) !== 'APPLIED') throw new KolhubError('KOLHUB-4805');
    }
    return { state, c, t, ids };
  }

  function selectionResult(campaignId: string, ids: string[], t: number): SelectionResult {
    const after = db.read();
    const c = after.campaigns.find((x) => x.id === campaignId)!;
    return {
      bookings: ids.map((id) => toBookingView(after, after.bookings.find((b) => b.id === id)!, 'BRAND', t)),
      selected: selectedCount(after, c, t),
      slots: c.recruitment?.slots ?? 0,
    };
  }

  /**
   * Picks applicants during "Ứng tuyển" or "Chọn lọc" (EP-02 §13: continuous selection; 4819 otherwise): each becomes
   * ACCEPTED at the fixed reward (price = cash, reward snapshot). All-or-nothing within the free slots (4818).
   */
  async function selectApplicants(campaignId: string, bookingIds: string[]): Promise<SelectionResult> {
    await wait();
    const { state, c, t, ids } = selection(campaignId, bookingIds);
    const phase = recruitPhase(c, t);
    if (phase !== 'APPLY' && phase !== 'SELECT') throw new KolhubError('KOLHUB-4819');
    checkSlots(state, c, ids.length, t);
    db.update((s) => applySelection(s, c.id, ids, t));
    return selectionResult(c.id, ids, t);
  }

  /** Declines applicants ("Không được chọn") during "Ứng tuyển" or "Chọn lọc" (4819 otherwise). */
  async function rejectApplicants(campaignId: string, bookingIds: string[], note?: string): Promise<SelectionResult> {
    await wait();
    const { c, t, ids } = selection(campaignId, bookingIds);
    const phase = recruitPhase(c, t);
    if (phase !== 'APPLY' && phase !== 'SELECT') throw new KolhubError('KOLHUB-4819');
    const n = checkNote(note) || 'Không được chọn';
    db.update((s) => {
      for (const id of ids) {
        const b = s.bookings.find((x) => x.id === id)!;
        b.status = 'DECLINED';
        delete b.awaiting;
        b.updatedAt = t;
        b.history.push({ at: t, by: 'BRAND', action: 'NOT_SELECTED', note: n });
      }
    });
    return selectionResult(c.id, ids, t);
  }

  /** "Chốt danh sách" during "Chọn lọc": every applicant not picked yet becomes "Không được chọn". */
  async function finalizeSelection(campaignId: string): Promise<SelectionResult> {
    await wait();
    const state = read();
    const c = ownCampaign(state, campaignId);
    if (!isRecruit(c)) throw new KolhubError('KOLHUB-4802');
    const t = now();
    if (recruitPhase(c, t) !== 'SELECT') throw new KolhubError('KOLHUB-4819');
    const ids = state.bookings
      .filter((b) => b.campaignId === c.id && b.origin === 'APPLICATION' && effectiveStatus(b, c, t) === 'APPLIED')
      .map((b) => b.id);
    if (ids.length === 0) return selectionResult(c.id, [], t);
    return rejectApplicants(campaignId, ids);
  }

  // --- public Q&A ("Hỏi đáp") ---

  function qaView(q: CampaignQA, viewerId: string): CampaignQAView {
    const v: CampaignQAView = { id: q.id, askerName: q.askerName, question: q.question, createdAt: q.createdAt, mine: !!viewerId && q.askerAccountId === viewerId };
    if (q.answer) {
      v.answer = q.answer;
      v.answeredAt = q.answeredAt;
    }
    return v;
  }

  /**
   * Q&A of a marketplace campaign, for anyone (guests included): answered questions, plus the viewer's own
   * unanswered ones; the owning brand sees every question. Unanswered first for the brand, then newest first.
   */
  async function listQuestions(campaignId: string): Promise<CampaignQAView[]> {
    await wait();
    const state = read();
    const me = marketplaceViewer(state, { allowPublic: true });
    const c = state.campaigns.find((x) => x.id === campaignId);
    if (!c || UNPUBLISHED_STATUSES.includes(c.status) || c.visibility !== 'MARKETPLACE') throw new KolhubError('KOLHUB-4801');
    const owner = !!me.accountId && c.brandAccountId === me.accountId;
    return state.campaignQuestions
      .filter((q) => q.campaignId === c.id && (owner || !!q.answer || (!!me.accountId && q.askerAccountId === me.accountId)))
      .sort((a, b) => (owner ? Number(!!a.answer) - Number(!!b.answer) : 0) || b.createdAt - a.createdAt)
      .map((q) => qaView(q, me.accountId));
  }

  /** A signed-in KOL / MCN asks a public question on a campaign shown on the Sàn (4806 guests / brands, 4801). */
  async function askQuestion(campaignId: string, text: string): Promise<CampaignQAView> {
    await wait();
    const state = read();
    const me = marketplaceViewer(state);
    const t = now();
    const c = state.campaigns.find((x) => x.id === campaignId);
    if (!c || !isListedOnMarketplace(c, t)) throw new KolhubError('KOLHUB-4801');
    const question = (text ?? '').normalize('NFC').trim();
    if (!question || [...question].length > QA_QUESTION_MAX) throw new KolhubError('KOLHUB-4803', { field: 'question' });
    const acc = state.accounts.find((a) => a.id === me.accountId)!;
    const profile =
      acc.type === 'MCN' ? state.mcnProfiles.find((p) => p.accountId === acc.id) : state.kolProfiles.find((p) => p.accountId === acc.id);
    const q: CampaignQA = {
      id: newId(),
      campaignId: c.id,
      askerAccountId: me.accountId,
      askerName: (profile && profileDisplayName(profile)) || acc.fullName || (acc.type === 'MCN' ? 'MCN' : 'KOL'),
      question,
      createdAt: t,
    };
    db.update((s) => {
      s.campaignQuestions.push(q);
    });
    return qaView(q, me.accountId);
  }

  /** The owning brand answers (or edits its answer to) a question (4016 non-BIZ, 4820 unknown / another brand's). */
  async function answerQuestion(questionId: string, text: string): Promise<CampaignQAView> {
    await wait();
    const state = read();
    const acc = currentBizAccount(state);
    const q = state.campaignQuestions.find((x) => x.id === questionId);
    const c = q ? state.campaigns.find((x) => x.id === q.campaignId) : undefined;
    if (!q || !c || c.brandAccountId !== acc.id) throw new KolhubError('KOLHUB-4820');
    const answer = (text ?? '').normalize('NFC').trim();
    if (!answer || [...answer].length > QA_ANSWER_MAX) throw new KolhubError('KOLHUB-4803', { field: 'answer' });
    const t = now();
    db.update((s) => {
      const x = s.campaignQuestions.find((y) => y.id === questionId)!;
      x.answer = answer;
      x.answeredAt = t;
    });
    return qaView({ ...q, answer, answeredAt: t }, acc.id);
  }

  return {
    listMine,
    get,
    create,
    update,
    publish,
    withdraw,
    deleteDraft,
    closeRecruitment,
    close,
    cancel,
    listReviewQueue,
    approveReview,
    decideReview,
    inviteKols,
    listMarketplace,
    getMarketplaceItem,
    apply,
    saveCampaign,
    unsaveCampaign,
    listSaved,
    listSavedAll,
    listApplied,
    selectApplicants,
    rejectApplicants,
    finalizeSelection,
    listQuestions,
    askQuestion,
    answerQuestion,
  };
}

export type CampaignService = ReturnType<typeof createCampaignService>;
