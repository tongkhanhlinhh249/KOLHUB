// Mock campaign service (beta): Brand campaigns, KOL invites (routed to MCN or KOL) and the supplier-side
// marketplace ("Sàn chiến dịch"). Actor = the signed-in account (state.sessionAccountId).
import type {
  ApplyInput,
  Booking,
  BookingItem,
  BookingView,
  Campaign,
  CampaignFilters,
  CampaignInput,
  CampaignPatch,
  CampaignView,
  InviteOptions,
  InviteResult,
  MarketplaceCampaign,
  MarketplaceFilters,
} from '../campaign-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import {
  checkNote,
  currentSupplier,
  effectiveStatus,
  endOfDay,
  inviteDeliverable,
  isAcceptingApplications,
  isInProgress,
  isOccupying,
  isPreAccept,
  isPrice,
  resolveItems,
  routeKol,
  sanitizeCampaignInput,
  toBookingView,
  toCampaignView,
  toMarketplaceCampaign,
  validateForOpen,
} from './campaignRules';
import { normalizeText, publicKolOf } from './directory';

export interface CampaignServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
  genId?: () => string;
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
    const state = db.read();
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
    const state = db.read();
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
      status: 'DRAFT',
      createdAt: t,
      updatedAt: t,
    };
    if (clean.startDate) c.startDate = clean.startDate;
    if (clean.endDate) c.endDate = clean.endDate;
    if (clean.applyDeadline) c.applyDeadline = clean.applyDeadline;
    save(c);
    return view(c.id);
  }

  /** Edit while DRAFT or OPEN (4802 otherwise); an OPEN campaign must stay complete (4803). */
  async function update(id: string, patch: CampaignPatch): Promise<CampaignView> {
    await wait();
    const state = db.read();
    const c = structuredClone(ownCampaign(state, id));
    if (c.status !== 'DRAFT' && c.status !== 'OPEN') throw new KolhubError('KOLHUB-4802');
    const clean = sanitizeCampaignInput(patch ?? {});
    const next: Campaign = { ...c, ...clean, updatedAt: now() };
    for (const k of ['startDate', 'endDate', 'applyDeadline'] as const) if (next[k] === undefined) delete next[k];
    if (next.status === 'OPEN') validateForOpen(next, now());
    save(next);
    return view(id);
  }

  function open(c: Campaign, t: number): void {
    c.status = 'OPEN';
    c.publishedAt ??= t;
    c.updatedAt = t;
  }

  /** DRAFT → OPEN (4802 otherwise; 4803 when incomplete). MARKETPLACE campaigns appear on the marketplace. */
  async function publish(id: string): Promise<CampaignView> {
    await wait();
    const c = structuredClone(ownCampaign(db.read(), id));
    if (c.status !== 'DRAFT') throw new KolhubError('KOLHUB-4802');
    const t = now();
    validateForOpen(c, t);
    open(c, t);
    save(c);
    return view(id);
  }

  /** Ends the campaign: pending invites / applications are cancelled by the system; 4817 while work is in progress. */
  function finish(id: string, allowed: Campaign['status'][], to: 'COMPLETED' | 'CANCELLED', note: string): CampaignView {
    const state = db.read();
    const c = ownCampaign(state, id);
    if (!allowed.includes(c.status)) throw new KolhubError('KOLHUB-4802');
    const t = now();
    const mine = state.bookings.filter((b) => b.campaignId === id);
    if (mine.some((b) => isInProgress(effectiveStatus(b, c, t)))) throw new KolhubError('KOLHUB-4817');
    db.update((s) => {
      const sc = s.campaigns.find((x) => x.id === id)!;
      sc.status = to;
      sc.closedAt = t;
      sc.updatedAt = t;
      for (const b of s.bookings) {
        if (b.campaignId !== id || !isPreAccept(effectiveStatus(b, sc, t))) continue;
        b.status = 'CANCELLED';
        delete b.awaiting;
        b.updatedAt = t;
        b.history.push({ at: t, by: 'SYSTEM', action: 'CANCELLED', note });
      }
    });
    return view(id);
  }

  /** OPEN / RUNNING → COMPLETED (brand decision; never automatic). */
  async function close(id: string): Promise<CampaignView> {
    await wait();
    return finish(id, ['OPEN', 'RUNNING'], 'COMPLETED', 'Chiến dịch đã kết thúc.');
  }

  /** DRAFT / OPEN / RUNNING → CANCELLED. */
  async function cancel(id: string): Promise<CampaignView> {
    await wait();
    return finish(id, ['DRAFT', 'OPEN', 'RUNNING'], 'CANCELLED', 'Chiến dịch đã bị huỷ.');
  }

  /**
   * Invite KOLs (by KOL ID) to a DRAFT / OPEN / RUNNING campaign. A DRAFT is validated and opened first.
   * Routing (spec §4): KOLs managed by an MCN go to that MCN, grouped into one SENT booking per MCN
   * (an existing SENT invite of the same MCN on this campaign is extended); others get their own booking.
   * Unknown / unlisted KOLs and KOLs already in an occupying booking of the campaign are skipped.
   */
  async function inviteKols(campaignId: string, kolIds: string[], opts: InviteOptions = {}): Promise<InviteResult> {
    await wait();
    const state = db.read();
    const c = structuredClone(ownCampaign(state, campaignId));
    if (c.status !== 'DRAFT' && c.status !== 'OPEN' && c.status !== 'RUNNING') throw new KolhubError('KOLHUB-4802');
    const ids = [...new Set((kolIds ?? []).map((k) => (k ?? '').trim()).filter(Boolean))];
    if (ids.length === 0) throw new KolhubError('KOLHUB-4812');
    if (opts.price !== undefined && !isPrice(opts.price)) throw new KolhubError('KOLHUB-4810');
    const note = checkNote(opts.note);
    const t = now();
    if (c.status === 'DRAFT') validateForOpen(c, t);
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
        route.channels.find((x) => x.platform === deliverable.platform) ?? route.channels.find((x) => c.platforms.includes(x.platform));
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
        // Priced invites add up; if either side has no price the supplier quotes the whole booking.
        existing.price = existing.price > 0 && opts.price !== undefined ? existing.price + opts.price : 0;
        existing.updatedAt = t;
        existing.history.push({ at: t, by: 'BRAND', action: 'ITEMS_ADDED', price: existing.price, ...(note ? { note } : {}) });
        touched.add(existing.id);
      } else {
        const b: Booking = {
          id: newId(),
          campaignId: c.id,
          brandAccountId: c.brandAccountId,
          supplierType: route.supplierType,
          supplierAccountId: route.supplierAccountId,
          origin: 'INVITE',
          items: [item],
          price: opts.price ?? 0,
          note,
          status: 'SENT',
          awaiting: 'SUPPLIER',
          history: [{ at: t, by: 'BRAND', action: 'INVITED', price: opts.price ?? 0, ...(note ? { note } : {}) }],
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
        if (sc.status === 'DRAFT') open(sc, t);
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
   * applying still needs an approved profile (currentSupplier, 4806). Others → 4806.
   */
  function marketplaceViewer(state: DemoState): { accountId: string } {
    const acc = state.sessionAccountId ? state.accounts.find((a) => a.id === state.sessionAccountId) : undefined;
    if (acc?.type !== 'KOL' && acc?.type !== 'MCN') throw new KolhubError('KOLHUB-4806');
    return { accountId: acc.id };
  }

  /** Campaigns open for applications (MARKETPLACE, OPEN / RUNNING, deadline not passed). */
  async function listMarketplace(filters: MarketplaceFilters = {}): Promise<MarketplaceCampaign[]> {
    await wait();
    const state = db.read();
    const me = marketplaceViewer(state);
    const t = now();
    const kw = normalizeText(filters.keyword ?? '');
    const items = state.campaigns
      .filter((c) => isAcceptingApplications(c, t))
      .filter((c) => !filters.category || c.categories.includes(filters.category))
      .filter((c) => !filters.platform || c.platforms.includes(filters.platform))
      .filter((c) => filters.budgetMin === undefined || c.budget >= filters.budgetMin)
      .filter((c) => filters.budgetMax === undefined || c.budget <= filters.budgetMax)
      .map((c) => toMarketplaceCampaign(state, c, me.accountId, t))
      .filter((m) => !kw || normalizeText(`${m.name} ${m.objective} ${m.brief} ${m.brand.company}`).includes(kw));
    const sort = filters.sort ?? 'newest';
    const deadline = (m: MarketplaceCampaign) => (m.applyDeadline ? endOfDay(m.applyDeadline) : Infinity);
    return items.sort((a, b) => {
      if (sort === 'budget') return b.budget - a.budget || b.publishedAt - a.publishedAt;
      if (sort === 'deadline') return deadline(a) - deadline(b) || b.publishedAt - a.publishedAt;
      return b.publishedAt - a.publishedAt;
    });
  }

  /** Marketplace detail; 4801 unless the campaign is open for applications or the supplier already has a booking on it. */
  async function getMarketplaceItem(id: string): Promise<MarketplaceCampaign> {
    await wait();
    const state = db.read();
    const me = marketplaceViewer(state);
    const t = now();
    const c = state.campaigns.find((x) => x.id === id);
    if (!c || c.status === 'DRAFT') throw new KolhubError('KOLHUB-4801');
    const item = toMarketplaceCampaign(state, c, me.accountId, t);
    if (!isAcceptingApplications(c, t) && !(c.visibility === 'MARKETPLACE' && item.myBooking)) throw new KolhubError('KOLHUB-4801');
    return item;
  }

  /**
   * Apply to a marketplace campaign with a proposal. MCN: items = its managed KOLs + an MCN channel assigned to
   * each; KOL: its own channels. One occupying booking per supplier per campaign (4807).
   */
  async function apply(campaignId: string, proposal: ApplyInput): Promise<BookingView> {
    await wait();
    const state = db.read();
    const me = currentSupplier(state);
    const t = now();
    const c = state.campaigns.find((x) => x.id === campaignId);
    if (!c || c.status === 'DRAFT' || c.visibility !== 'MARKETPLACE') throw new KolhubError('KOLHUB-4801');
    if (!isAcceptingApplications(c, t)) throw new KolhubError('KOLHUB-4808');
    if (state.bookings.some((b) => b.campaignId === c.id && b.supplierAccountId === me.accountId && isOccupying(effectiveStatus(b, c, t)))) {
      throw new KolhubError('KOLHUB-4807');
    }
    const items = resolveItems(state, me, c, proposal?.items ?? [], t, newId);
    if (!isPrice(proposal?.price)) throw new KolhubError('KOLHUB-4810');
    const note = checkNote(proposal.note);
    const b: Booking = {
      id: newId(),
      campaignId: c.id,
      brandAccountId: c.brandAccountId,
      supplierType: me.type,
      supplierAccountId: me.accountId,
      origin: 'APPLICATION',
      items,
      price: proposal.price,
      note,
      status: 'APPLIED',
      awaiting: 'BRAND',
      history: [{ at: t, by: 'SUPPLIER', action: 'APPLIED', price: proposal.price, ...(note ? { note } : {}) }],
      contents: [],
      payment: {},
      createdAt: t,
      updatedAt: t,
    };
    db.update((s) => {
      s.bookings.push(b);
    });
    return toBookingView(db.read(), b, 'SUPPLIER', t);
  }

  return { listMine, get, create, update, publish, close, cancel, inviteKols, listMarketplace, getMarketplaceItem, apply };
}

export type CampaignService = ReturnType<typeof createCampaignService>;
