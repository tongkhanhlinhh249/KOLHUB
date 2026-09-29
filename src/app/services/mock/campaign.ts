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
  CampaignView,
  InviteOptions,
  InviteResult,
  MarketplaceCampaign,
  MarketplaceFilters,
  SupplierMatchContext,
} from '../campaign-types';
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
import { matchCampaign, supplierMatchContext } from './campaignMatch';

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
    if (clean.cover) c.cover = clean.cover;
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
    for (const k of ['startDate', 'endDate', 'applyDeadline', 'cover'] as const) if (next[k] === undefined) delete next[k];
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
      (!filters.category || c.categories.includes(filters.category)) &&
      (!filters.platform || c.platforms.includes(filters.platform)) &&
      (filters.budgetMin === undefined || c.budget >= filters.budgetMin) &&
      (filters.budgetMax === undefined || c.budget <= filters.budgetMax);
  }

  function keywordFilter(filters: MarketplaceFilters) {
    const kw = normalizeText(filters.keyword ?? '');
    return (m: MarketplaceCampaign) => !kw || normalizeText(`${m.name} ${m.objective} ${m.brief} ${m.brand.company}`).includes(kw);
  }

  /** Sort (default 'match': score desc, then newest — without match scores (brand viewer) that is just newest). */
  function compare(sort: MarketplaceFilters['sort'] = 'match') {
    const deadline = (m: MarketplaceCampaign) => (m.applyDeadline ? endOfDay(m.applyDeadline) : Infinity);
    return (a: MarketplaceCampaign, b: MarketplaceCampaign) => {
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
    const state = db.read();
    const me = marketplaceViewer(state, { allowPublic });
    const t = now();
    const { ctx, saved } = viewerContext(state, me, t);
    return state.campaigns
      .filter((c) => isAcceptingApplications(c, t))
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
    const state = db.read();
    const me = marketplaceViewer(state, { allowPublic: true });
    const t = now();
    const c = state.campaigns.find((x) => x.id === id);
    if (!c || c.status === 'DRAFT') throw new KolhubError('KOLHUB-4801');
    const { ctx, saved } = viewerContext(state, me, t);
    const item = card(state, c, me.accountId, ctx, saved, t);
    if (!isAcceptingApplications(c, t) && !(c.visibility === 'MARKETPLACE' && item.myBooking)) throw new KolhubError('KOLHUB-4801');
    return { ...item, brandInfo: brandInfoOf(state, c.brandAccountId, t) };
  }

  // --- saved campaigns (any signed-in KOL / MCN, like browsing) ---

  /** Bookmark a campaign that is open on the marketplace (4801 otherwise). Idempotent. */
  async function saveCampaign(id: string): Promise<void> {
    await wait();
    const state = db.read();
    const me = marketplaceViewer(state);
    const c = state.campaigns.find((x) => x.id === id);
    if (!c || !isAcceptingApplications(c, now())) throw new KolhubError('KOLHUB-4801');
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
   * "Đã ứng tuyển": every application (origin APPLICATION) of the viewer, any status, with its campaign
   * (`accepting` false once it stopped taking applications). Same filters / sort as listMarketplace.
   * Unapproved KOL / MCN simply have none.
   */
  async function listApplied(filters: MarketplaceFilters = {}): Promise<AppliedCampaign[]> {
    await wait();
    const state = db.read();
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
        };
        if (v.awaiting) booking.awaiting = v.awaiting;
        if (v.expiresAt !== undefined) booking.expiresAt = v.expiresAt;
        return { booking, campaign: card(state, c, me.accountId, ctx, saved, t) };
      })
      .filter((x) => byKeyword(x.campaign))
      .sort((a, b) => order(a.campaign, b.campaign) || b.booking.updatedAt - a.booking.updatedAt);
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

  return {
    listMine,
    get,
    create,
    update,
    publish,
    close,
    cancel,
    inviteKols,
    listMarketplace,
    getMarketplaceItem,
    apply,
    saveCampaign,
    unsaveCampaign,
    listSaved,
    listApplied,
  };
}

export type CampaignService = ReturnType<typeof createCampaignService>;
