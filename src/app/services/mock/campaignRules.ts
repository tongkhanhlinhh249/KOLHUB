// Pure rules shared by the campaign and booking services: actors, effective status, allowed actions,
// invite routing, proposal items, post verification and view projections.
import { KOL_CATEGORIES, PLATFORMS, type KolCategory, type Platform } from '../bizTypes';
import {
  BOOKING_EXPIRY_DAYS,
  BOOKING_NOTE_MAX,
  CAMPAIGN_NAME_MAX,
  CAMPAIGN_TEXT_MAX,
  CLOSED_STATUSES,
  DELIVERABLE_QTY_MAX,
  DELIVERABLE_TYPES,
  IN_PROGRESS_STATUSES,
  PRE_ACCEPT_STATUSES,
  DEADLINE_TIME_DEFAULT,
  PROMOTED_BRAND_MAX,
  PROOF_NOTE_MAX,
  USAGE_CHANNELS,
  USAGE_MONTHS_MAX,
  USAGE_NOTE_MAX,
  isDeliverableForPlatform,
  type PromotedBrand,
  type UsageRights,
  type Booking,
  type BookingActionKey,
  type BookingCampaignSummary,
  type BookingItem,
  type BookingItemView,
  type BookingParty,
  type BookingStatus,
  type BookingView,
  type BrandRef,
  type Campaign,
  type CampaignType,
  type DeliverableGroup,
  type Recruitment,
  type RewardKind,
  type CampaignInput,
  type CampaignStats,
  type CampaignView,
  type Deliverable,
  type DeliverableType,
  type MarketplaceBrandInfo,
  type MarketplaceCampaign,
  type PostMetrics,
  type ProposalItemInput,
  type SupplierRef,
  type SupplierType,
} from '../campaign-types';
import { MAX_FILE_BYTES, type Channel, type KolProfile, type McnProfile, type StoredFile } from '../profile-types';
import { KolhubError } from '../types';
import type { DemoState, StoredAccount } from './db';
import { isFreeEmail } from './auth';
import { currentBizAccount } from './bizSession';
import { isSearchableChannel, publicKolOf } from './directory';
import { profileDisplayName } from './identity';
import { safetyHash } from './safety';
import {
  campaignType,
  checkGroups,
  checkRecruitment,
  checkRegions,
  checkSurvey,
  checkTarget,
  checkTerms,
  contractOn,
  draftReviewOn,
  endOfLocalDay,
  isRecruit,
  phaseOfTimeline,
  recruitPhase,
  validateGroupsForOpen,
  validateRecruitmentForOpen,
} from './recruitment';

const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

export interface Supplier {
  type: SupplierType;
  accountId: string;
  profile: KolProfile | McnProfile;
}

/** Signed-in KOL / MCN with an APPROVED profile (KOL: with a KOL ID); anything else → KOLHUB-4806. */
export function currentSupplier(state: DemoState): Supplier {
  const acc = state.sessionAccountId ? state.accounts.find((a) => a.id === state.sessionAccountId) : undefined;
  if (acc?.type === 'MCN') {
    const p = state.mcnProfiles.find((x) => x.accountId === acc.id);
    if (p?.status === 'APPROVED') return { type: 'MCN', accountId: acc.id, profile: p };
  } else if (acc?.type === 'KOL') {
    const p = state.kolProfiles.find((x) => x.accountId === acc.id);
    if (p?.status === 'APPROVED' && p.kolId) return { type: 'KOL', accountId: acc.id, profile: p };
  }
  throw new KolhubError('KOLHUB-4806');
}

/** Which side of `booking` the session is on: BIZ owner → BRAND, approved supplier owner → SUPPLIER, else 4804. */
export function partyOf(state: DemoState, booking: Booking): BookingParty {
  const acc = state.sessionAccountId ? state.accounts.find((a) => a.id === state.sessionAccountId) : undefined;
  if (acc?.type === 'BIZ') {
    if (booking.brandAccountId === acc.id) return 'BRAND';
    throw new KolhubError('KOLHUB-4804');
  }
  const s = currentSupplier(state);
  if (booking.supplierAccountId === s.accountId) return 'SUPPLIER';
  throw new KolhubError('KOLHUB-4804');
}

export { currentBizAccount };

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

/** Last ms of the local day `iso` ('YYYY-MM-DD'). */
export function endOfDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** 'YYYY-MM-DD' of `ms` in local time. */
export function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Campaign validation
// ---------------------------------------------------------------------------

const PLATFORM_KEYS = new Set<string>(PLATFORMS.map((p) => p.key));
const DELIVERABLE_KEYS = new Set<string>(DELIVERABLE_TYPES.map((d) => d.key));
const bad = (field: string) => new KolhubError('KOLHUB-4803', { field });
const cleanText = (s: string | undefined) => (s ?? '').normalize('NFC').trim();

export function isPlatform(v: unknown): v is Platform {
  return typeof v === 'string' && PLATFORM_KEYS.has(v);
}
export function isDeliverableType(v: unknown): v is DeliverableType {
  return typeof v === 'string' && DELIVERABLE_KEYS.has(v);
}
const isQty = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= DELIVERABLE_QTY_MAX;
export const isPrice = (n: unknown) => Number.isSafeInteger(n) && (n as number) > 0;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VN_OFFSET = 7 * 3_600_000;

/** Exact end of applications (ms): `applyDeadline` at `applyDeadlineTime` (default 23:59), Vietnam time (UTC+7). */
export function applyDeadlineAt(c: Pick<Campaign, 'applyDeadline' | 'applyDeadlineTime'>): number | undefined {
  if (!c.applyDeadline) return undefined;
  const [y, m, d] = c.applyDeadline.split('-').map(Number);
  const [hh, mm] = (c.applyDeadlineTime ?? DEADLINE_TIME_DEFAULT).split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - VN_OFFSET;
}

/** Proof of representation (EP-02 §4.1): PDF / JPG / PNG / WebP ≤ MAX_FILE_BYTES. */
const PROOF_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function checkPromotedBrand(v: unknown): PromotedBrand | undefined {
  if (v == null) return undefined;
  const x = v as Partial<PromotedBrand>;
  if (typeof x !== 'object' || typeof x.own !== 'boolean') throw bad('promotedBrand');
  const name = cleanText(x.name).replace(/\s+/g, ' ');
  const proofNote = cleanText(x.proofNote);
  if ([...name].length > PROMOTED_BRAND_MAX || [...proofNote].length > PROOF_NOTE_MAX) throw bad('promotedBrand');
  const out: PromotedBrand = { name, own: x.own };
  if (x.proof) {
    const f = x.proof;
    if (typeof f.name !== 'string' || !PROOF_TYPES.includes(f.type) || typeof f.size !== 'number' || f.size < 0 || f.size > MAX_FILE_BYTES) throw bad('promotedBrand');
    out.proof = { name: f.name, type: f.type, size: f.size, ...(f.thumbnail ? { thumbnail: f.thumbnail } : {}) };
  }
  if (proofNote) out.proofNote = proofNote;
  return out;
}

const USAGE_KEYS = new Set<string>(USAGE_CHANNELS.map((u) => u.key));

function checkUsageRights(v: unknown): UsageRights | undefined {
  if (v == null) return undefined;
  const x = v as Partial<UsageRights>;
  const channels = Array.isArray(x.channels) ? [...new Set(x.channels)] : null;
  const note = cleanText(x.note);
  if (
    typeof x !== 'object' ||
    !Number.isInteger(x.months) ||
    (x.months as number) < 1 ||
    (x.months as number) > USAGE_MONTHS_MAX ||
    !channels ||
    channels.length === 0 ||
    !channels.every((c) => USAGE_KEYS.has(c)) ||
    typeof x.exclusive !== 'boolean' ||
    [...note].length > USAGE_NOTE_MAX
  ) {
    throw bad('usageRights');
  }
  return { months: x.months as number, channels, exclusive: x.exclusive, ...(note ? { note } : {}) };
}

/** "Ảnh chiến dịch" types (JPG / PNG / WebP), each ≤ MAX_FILE_BYTES. */
export const CAMPAIGN_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** A valid campaign cover (4803 `cover` otherwise); returns a clean copy. */
export function checkCampaignCover(f: unknown): StoredFile {
  const x = f as Partial<StoredFile> | null;
  if (
    !x ||
    typeof x !== 'object' ||
    typeof x.name !== 'string' ||
    typeof x.type !== 'string' ||
    !CAMPAIGN_COVER_TYPES.includes(x.type) ||
    typeof x.size !== 'number' ||
    !(x.size >= 0) ||
    x.size > MAX_FILE_BYTES ||
    (x.thumbnail !== undefined && typeof x.thumbnail !== 'string')
  ) {
    throw bad('cover');
  }
  return { name: x.name, type: x.type, size: x.size, ...(x.thumbnail ? { thumbnail: x.thumbnail } : {}) };
}

/** Normalizes and type-checks the given fields (a partial patch is fine); throws 4803 with `field`. */
export function sanitizeCampaignInput(input: Partial<CampaignInput>): Partial<Campaign> & { applyDeadline?: string | undefined } {
  const out: Partial<Campaign> = {};
  if ('name' in input) {
    const name = cleanText(input.name).replace(/\s+/g, ' ');
    if (!name || [...name].length > CAMPAIGN_NAME_MAX) throw bad('name');
    out.name = name;
  }
  for (const key of ['objective', 'brief', 'contentRules'] as const) {
    if (key in input) {
      const v = cleanText(input[key]);
      if ([...v].length > CAMPAIGN_TEXT_MAX) throw bad(key);
      out[key] = v;
    }
  }
  if ('budget' in input) {
    const b = input.budget ?? 0;
    if (!Number.isSafeInteger(b) || b < 0) throw bad('budget');
    out.budget = b;
  }
  for (const key of ['startDate', 'endDate'] as const) {
    if (key in input) {
      const v = input[key];
      if (v !== undefined && v !== '' && !isIsoDate(v)) throw bad('dates');
      out[key] = v || undefined;
    }
  }
  if ('platforms' in input) {
    const list = input.platforms ?? [];
    if (!Array.isArray(list) || !list.every(isPlatform)) throw bad('platforms');
    out.platforms = [...new Set(list)];
  }
  if ('categories' in input) {
    const list = input.categories ?? [];
    if (!Array.isArray(list) || !list.every((c) => (KOL_CATEGORIES as readonly string[]).includes(c))) throw bad('categories');
    out.categories = [...new Set(list)] as KolCategory[];
  }
  if ('deliverables' in input) {
    const list = input.deliverables ?? [];
    const ok = (d: Deliverable) => d && isDeliverableType(d.type) && isPlatform(d.platform) && isDeliverableForPlatform(d.type, d.platform) && isQty(d.quantity);
    if (!Array.isArray(list) || !list.every(ok)) {
      throw bad('deliverables');
    }
    out.deliverables = list.map((d) => ({ type: d.type, platform: d.platform, quantity: d.quantity }));
  }
  if ('visibility' in input) {
    if (input.visibility !== 'PRIVATE' && input.visibility !== 'MARKETPLACE') throw bad('visibility');
    out.visibility = input.visibility;
  }
  if ('applyDeadline' in input) {
    const v = input.applyDeadline;
    if (v !== undefined && v !== null && v !== '' && !isIsoDate(v)) throw bad('applyDeadline');
    out.applyDeadline = v || undefined;
  }
  if ('applyDeadlineTime' in input) {
    const v = input.applyDeadlineTime;
    if (v !== undefined && v !== null && v !== '' && !TIME_RE.test(v)) throw bad('applyDeadline');
    out.applyDeadlineTime = v || undefined;
  }
  if ('promotedBrand' in input) out.promotedBrand = checkPromotedBrand(input.promotedBrand);
  if ('usageRights' in input) out.usageRights = checkUsageRights(input.usageRights);
  if ('cover' in input) {
    out.cover = input.cover == null ? undefined : checkCampaignCover(input.cover);
  }
  // --- open recruitment, workflow, conditions, apply form ---
  if ('type' in input && input.type !== undefined) {
    if (input.type !== 'BOOKING' && input.type !== 'OPEN_RECRUITMENT') throw bad('type');
    out.type = input.type;
  }
  if ('recruitment' in input) out.recruitment = input.recruitment == null ? undefined : checkRecruitment(input.recruitment);
  if ('groups' in input) out.groups = input.groups == null ? undefined : checkGroups(input.groups);
  for (const k of ['draftReview', 'contract'] as const) {
    if (k in input && input[k] !== undefined) {
      if (typeof input[k] !== 'boolean') throw bad(k);
      out[k] = input[k];
    }
  }
  if ('regions' in input) out.regions = checkRegions(input.regions ?? []);
  if ('target' in input) out.target = checkTarget(input.target);
  if ('survey' in input) out.survey = checkSurvey(input.survey ?? []);
  if ('terms' in input) out.terms = checkTerms(input.terms ?? []);
  return out;
}

/**
 * Everything an OPEN campaign needs (publish, invite from DRAFT, edit while OPEN). Open recruitment: the
 * recruitment block (slots, reward, ordered timeline; `publishing` also needs the apply phase not over yet).
 */
export function validateForOpen(c: Campaign, now: number, publishing = false): void {
  if (!c.name) throw bad('name');
  // EP-02 §4.1: an Agency names the promoted brand and gives proof of representation for Admin review.
  const pb = c.promotedBrand;
  if (pb && !pb.own && (!pb.name || (!pb.proof && !pb.proofNote))) throw bad('promotedBrand');
  if (c.type === 'OPEN_RECRUITMENT') {
    validateRecruitmentForOpen(c, now, publishing);
    if (c.platforms.length === 0) throw bad('platforms');
    if (c.deliverables.length === 0 || c.deliverables.some((d) => !c.platforms.includes(d.platform))) throw bad('deliverables');
    return;
  }
  // Booking riêng: the brief is what the invited KOL works from, so it is required to open the campaign.
  if (!c.brief.trim()) throw bad('brief');
  if (!c.startDate || !c.endDate || c.startDate > c.endDate || endOfDay(c.endDate) < now) throw bad('dates');
  if (c.platforms.length === 0) throw bad('platforms');
  if (c.deliverables.length === 0 || c.deliverables.some((d) => !c.platforms.includes(d.platform))) throw bad('deliverables');
  // Fixed reward per deliverable group (EP-02 §4.3); the budget is derived from it.
  validateGroupsForOpen(c);
  if (!isPrice(c.budget)) throw bad('budget');
  // Optional apply deadline: not after the end date and still in the future.
  if (c.applyDeadline && (c.applyDeadline > c.endDate || applyDeadlineAt(c)! <= now)) throw bad('applyDeadline');
}

export function checkNote(note: string | undefined, field = 'note'): string {
  const v = cleanText(note);
  if ([...v].length > BOOKING_NOTE_MAX) throw bad(field);
  return v;
}

// ---------------------------------------------------------------------------
// Booking status
// ---------------------------------------------------------------------------

export const isPreAccept = (s: BookingStatus) => PRE_ACCEPT_STATUSES.includes(s);
export const isInProgress = (s: BookingStatus) => IN_PROGRESS_STATUSES.includes(s);
/** Holds the supplier's slot on the campaign (anything but DECLINED / CANCELLED / EXPIRED). */
export const isOccupying = (s: BookingStatus) => !CLOSED_STATUSES.includes(s);
export const isTerminal = (s: BookingStatus) => CLOSED_STATUSES.includes(s) || s === 'COMPLETED';

/** An application to an open-recruitment campaign (no negotiation; picked or not by the brand). */
export const isRecruitApplication = (b: Pick<Booking, 'origin'>, c: Campaign | undefined) => b.origin === 'APPLICATION' && isRecruit(c);

/**
 * SENT / APPLIED expire 7 days after creation. Closing recruitment (or reaching the apply deadline) does not expire
 * them: applications already sent are kept and handled (EP-02 §6.4, §8). Open recruitment: an application waits until
 * the end of "Chọn lọc" (selectEnd).
 */
export function expiresAtOf(b: Booking, c: Campaign | undefined): number | undefined {
  if (b.status !== 'SENT' && b.status !== 'APPLIED') return undefined;
  if (isRecruitApplication(b, c) && c!.recruitment!.timeline.selectEnd) return endOfLocalDay(c!.recruitment!.timeline.selectEnd);
  return b.createdAt + BOOKING_EXPIRY_DAYS * DAY;
}

/** Past expiry: EXPIRED, or DECLINED ("Không được chọn") for an open-recruitment application not picked in time. */
export function effectiveStatus(b: Booking, c: Campaign | undefined, now: number): BookingStatus {
  const exp = expiresAtOf(b, c);
  if (exp === undefined || now <= exp) return b.status;
  return isRecruitApplication(b, c) ? 'DECLINED' : 'EXPIRED';
}

/** Every item has an APPROVED draft for it (a draft without itemId covers the whole booking). */
export function draftsCoverItems(b: Booking): boolean {
  const approved = b.contents.filter((x) => x.kind === 'DRAFT' && x.status === 'APPROVED');
  if (approved.some((x) => !x.itemId)) return true;
  return b.items.every((it) => approved.some((x) => x.itemId === it.id));
}

/** Every item has a verified post. */
export function postsCoverItems(b: Booking): boolean {
  const posts = b.contents.filter((x) => x.kind === 'POST' && x.verifiedAt !== undefined);
  return b.items.every((it) => posts.some((x) => x.itemId === it.id));
}

/** Campaign context of `allowedActions` (open recruitment phase, "Duyệt nháp"). */
export interface ActionContext {
  campaign?: Campaign;
  now?: number;
  /** Booking 1 KOL: another booking already holds the one KOL — no further ACCEPT (Công bố lên sàn §9). */
  kolTaken?: boolean;
}

/**
 * The single source of truth for who may do what, used by views (allowedActions) and every mutation.
 * Open-recruitment applications: no negotiation — the brand picks (SELECT) or declines during "Chọn lọc"
 * (declining also during "Ứng tuyển"); the supplier may edit while "Ứng tuyển" lasts and withdraw until picked.
 * "Duyệt nháp" off: the supplier posts directly (SUBMIT_POST from ACCEPTED / IN_PRODUCTION, no drafts).
 * Booking riêng: fixed reward per group (EP-02), so no counter-offers. "Hợp đồng" off: no ATTACH_CONTRACT.
 * Product reward: brand MARK_PRODUCT_SENT, then supplier CONFIRM_PRODUCT_RECEIVED (record only).
 */
export function allowedActions(b: Booking, status: BookingStatus, party: BookingParty, ctx: ActionContext = {}): BookingActionKey[] {
  const out: BookingActionKey[] = [];
  const c = ctx.campaign;
  const recruit = isRecruitApplication(b, c);
  const review = draftReviewOn(c);
  if (recruit && isPreAccept(status)) {
    const phase = recruitPhase(c!, ctx.now ?? Date.now());
    if (party === 'BRAND' && status === 'APPLIED') {
      // EP-02 §13 "tuyển liên tục": the brand may pick during "Ứng tuyển" too, not only in "Chọn lọc".
      if (phase === 'APPLY' || phase === 'SELECT') out.push('SELECT', 'DECLINE');
    }
    if (party === 'SUPPLIER') {
      out.push('CANCEL');
      if (status === 'APPLIED' && phase === 'APPLY') out.push('EDIT_APPLICATION');
    }
  } else if (isPreAccept(status)) {
    if (b.awaiting === party) {
      if (!ctx.kolTaken) out.push('ACCEPT');
      out.push('DECLINE');
      if (party === 'SUPPLIER') out.push('ASSIGN_ITEMS');
    } else {
      out.push('CANCEL');
      // Sàn v2: an application can be edited until the brand answers.
      if (party === 'SUPPLIER' && status === 'APPLIED' && b.origin === 'APPLICATION') out.push('EDIT_APPLICATION');
    }
  }
  if (isInProgress(status) && !b.payment.brandMarkedAt) out.push('CANCEL');
  if (party === 'SUPPLIER') {
    if (review) {
      if (status === 'ACCEPTED' || status === 'IN_PRODUCTION' || status === 'CONTENT_REVIEW') out.push('SUBMIT_DRAFT');
      if (status === 'CONTENT_APPROVED' || status === 'PUBLISHED') out.push('SUBMIT_POST');
    } else if (['ACCEPTED', 'IN_PRODUCTION', 'CONTENT_APPROVED', 'PUBLISHED'].includes(status)) {
      out.push('SUBMIT_POST');
    }
    if (status === 'VERIFIED' && b.payment.brandMarkedAt && !b.payment.supplierConfirmedAt) out.push('CONFIRM_PAID');
  } else {
    if (status === 'CONTENT_REVIEW') out.push('REVIEW_CONTENT');
    if (status === 'VERIFIED' && !b.payment.brandMarkedAt) out.push('MARK_PAID');
  }
  if (b.reward?.product) {
    const sent = !!b.shipment?.sentAt;
    if (party === 'BRAND' && !sent && isInProgress(status)) out.push('MARK_PRODUCT_SENT');
    if (party === 'SUPPLIER' && sent && !b.shipment?.receivedAt && (isInProgress(status) || status === 'COMPLETED')) out.push('CONFIRM_PRODUCT_RECEIVED');
  }
  if (status === 'COMPLETED' && !(party === 'BRAND' ? b.ratings?.brand : b.ratings?.supplier)) out.push('RATE');
  // "Hợp đồng" off: no contract file (an already attached one stays visible, read-only).
  if (!isTerminal(status) && c?.contract !== false) out.push('ATTACH_CONTRACT');
  return out;
}

export function requireAction(b: Booking, status: BookingStatus, party: BookingParty, action: BookingActionKey, ctx: ActionContext = {}): void {
  if (!allowedActions(b, status, party, ctx).includes(action)) throw new KolhubError('KOLHUB-4805');
}

// ---------------------------------------------------------------------------
// Invite routing and proposal items
// ---------------------------------------------------------------------------

export interface Route {
  supplierType: SupplierType;
  supplierAccountId: string;
  /** Channels that can publish for this KOL under that supplier (verified, active, unexpired). */
  channels: Channel[];
}

/**
 * Routing rule (spec §4): a KOL holding ≥ 1 channel of an APPROVED MCN (`Channel.assignedKolAccountId`)
 * is booked through that MCN (the most recently assigned one if several); otherwise the KOL itself.
 */
export function routeKol(state: DemoState, kolAccountId: string, now: number): Route {
  const approvedMcn = new Set(state.mcnProfiles.filter((p) => p.status === 'APPROVED').map((p) => p.accountId));
  const assigned = state.channels
    .filter((c) => c.ownerType === 'MCN' && c.assignedKolAccountId === kolAccountId && approvedMcn.has(c.ownerId))
    .sort((a, b) => (b.assignedAt ?? 0) - (a.assignedAt ?? 0));
  if (assigned.length) {
    const mcn = assigned[0].ownerId;
    return {
      supplierType: 'MCN',
      supplierAccountId: mcn,
      channels: assigned.filter((c) => c.ownerId === mcn && isSearchableChannel(c, now)),
    };
  }
  return {
    supplierType: 'KOL',
    supplierAccountId: kolAccountId,
    channels: state.channels.filter((c) => c.ownerType === 'KOL' && c.ownerId === kolAccountId && isSearchableChannel(c, now)),
  };
}

/** Channels a supplier may use for `kolAccountId` in a proposal / item assignment. */
function eligibleChannel(state: DemoState, supplier: Supplier, kolAccountId: string, channelId: string, now: number): Channel | undefined {
  const c = state.channels.find((x) => x.id === channelId);
  if (!c || !isSearchableChannel(c, now) || c.ownerId !== supplier.accountId || c.ownerType !== supplier.type) return undefined;
  if (supplier.type === 'MCN' && c.assignedKolAccountId !== kolAccountId) return undefined;
  return c;
}

/** Validates proposal lines (4812 empty, 4809 KOL/channel/platform, 4803 deliverables) → booking items. */
export function resolveItems(
  state: DemoState,
  supplier: Supplier,
  campaign: Campaign,
  inputs: ProposalItemInput[],
  now: number,
  newId: () => string,
): BookingItem[] {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new KolhubError('KOLHUB-4812');
  return inputs.map((it) => {
    if (!it || !isDeliverableType(it.deliverableType) || !isQty(it.quantity)) throw bad('deliverables');
    const kolAccountId = supplier.type === 'KOL' ? supplier.accountId : it.kolAccountId;
    if (supplier.type === 'KOL' && it.kolAccountId && it.kolAccountId !== supplier.accountId) throw new KolhubError('KOLHUB-4809');
    const kol = kolAccountId ? state.kolProfiles.find((p) => p.accountId === kolAccountId) : undefined;
    if (!kol || kol.status !== 'APPROVED' || !kol.kolId) throw new KolhubError('KOLHUB-4809');
    const ch = eligibleChannel(state, supplier, kol.accountId, it.channelId, now);
    if (!ch || !campaign.platforms.includes(ch.platform)) throw new KolhubError('KOLHUB-4809');
    // The content type must exist on the channel's platform (e.g. no "Shorts" on TikTok).
    if (!isDeliverableForPlatform(it.deliverableType, ch.platform)) throw bad('deliverables');
    return {
      id: newId(),
      kolAccountId: kol.accountId,
      kolId: kol.kolId,
      channelId: ch.id,
      platform: ch.platform,
      deliverableType: it.deliverableType,
      quantity: it.quantity,
    };
  });
}

// ---------------------------------------------------------------------------
// Post verification (mock)
// ---------------------------------------------------------------------------

const POST_HOSTS: Record<Platform, string[]> = {
  tiktok: ['tiktok.com', 'vt.tiktok.com', 'vm.tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'fb.com', 'fb.watch'],
  instagram: ['instagram.com', 'instagr.am'],
};

/** Host of an http(s) link without www./m.; null when it is not a link. */
export function linkHost(url: string): string | null {
  const raw = (url ?? '').trim();
  if (!raw || /\s/.test(raw)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.pathname === '/' || u.pathname === '') return null;
    return u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  } catch {
    return null;
  }
}

/** Mock verification: the post link's host belongs to `platform`. */
export function postMatchesPlatform(url: string, platform: Platform): boolean {
  const host = linkHost(url);
  return !!host && POST_HOSTS[platform].includes(host);
}

export function platformOfLink(url: string): Platform | null {
  const host = linkHost(url);
  if (!host) return null;
  return (Object.keys(POST_HOSTS) as Platform[]).find((p) => POST_HOSTS[p].includes(host)) ?? null;
}

/** Metrics "pulled" for a verified post: deterministic from the link, scaled on the channel's followers. */
export function postMetrics(url: string, followers: number): PostMetrics {
  const h = safetyHash(`post:${url.trim().toLowerCase()}`);
  const base = Math.max(followers, 5_000);
  const views = Math.round(base * (0.08 + (h % 73) / 100));
  const likes = Math.round(views * (0.03 + ((h >>> 7) % 8) / 100));
  const comments = Math.round(likes * (0.02 + ((h >>> 11) % 7) / 100));
  const shares = Math.round(likes * (0.01 + ((h >>> 15) % 5) / 100));
  const engagementRate = views ? Math.round(((likes + comments + shares) / views) * 10_000) / 100 : 0;
  return { views, likes, comments, shares, engagementRate };
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export function brandRef(acc: StoredAccount | undefined, id: string): BrandRef {
  const ref: BrandRef = { accountId: id, company: acc?.company || acc?.fullName || 'Nhãn hàng' };
  if (acc?.fullName) ref.contactName = acc.fullName;
  return ref;
}

export function campaignStats(state: DemoState, c: Campaign, now: number): CampaignStats {
  const stats: CampaignStats = { total: 0, invited: 0, applications: 0, inProgress: 0, pendingReview: 0, completed: 0, committed: 0 };
  for (const b of state.bookings) {
    if (b.campaignId !== c.id) continue;
    const st = effectiveStatus(b, c, now);
    stats.total++;
    if (isPreAccept(st)) {
      if (b.origin === 'INVITE') stats.invited++;
      else stats.applications++;
    }
    if (isInProgress(st)) stats.inProgress++;
    if (st === 'CONTENT_REVIEW') stats.pendingReview++;
    if (st === 'COMPLETED') stats.completed++;
    if (isInProgress(st) || st === 'COMPLETED') stats.committed += b.price;
  }
  return stats;
}

export function toCampaignView(state: DemoState, c: Campaign, now: number): CampaignView {
  const acc = state.accounts.find((a) => a.id === c.brandAccountId);
  return { ...structuredClone(c), brand: brandRef(acc, c.brandAccountId), stats: campaignStats(state, c, now) };
}

/**
 * The apply window is over (EP-02 §4.4: now ≥ deadline means closed): open recruitment past its "Ứng tuyển" phase;
 * Booking riêng past its applyDeadline, or its end date when it has none.
 */
export function applyWindowEnded(c: Campaign, now: number): boolean {
  if (c.type === 'OPEN_RECRUITMENT') {
    if (!isRecruit(c) || !c.recruitment.timeline.applyEnd) return false;
    return endOfLocalDay(c.recruitment.timeline.applyEnd) < now;
  }
  if (c.applyDeadline) return applyDeadlineAt(c)! <= now;
  return !!c.endDate && endOfDay(c.endDate) < now;
}

/**
 * EP-02 §8: "hết hạn luôn tự đóng". OPEN campaigns whose apply window ended become CLOSED (in place); applications
 * already sent are kept. Returns true when something changed.
 */
export function sweepCampaignStatuses(state: DemoState, now: number): boolean {
  let changed = false;
  for (const c of state.campaigns) {
    if (c.status !== 'OPEN' || !applyWindowEnded(c, now)) continue;
    c.status = 'CLOSED';
    c.recruitmentClosedAt = now;
    c.log = [...(c.log ?? []), { at: now, by: 'SYSTEM', action: 'CLOSED', note: 'Hết hạn ứng tuyển.' }];
    changed = true;
  }
  return changed;
}

/** An OPEN campaign has an edit under review that pauses new applications (C2, EP-02 §7). */
export const isPausedForRevision = (c: Campaign) => !!c.pendingRevision?.pausesApplications;

/** Hidden from the Sàn by Admin (Công bố lên sàn §12.3). */
export const isHiddenByAdmin = (c: Campaign) => c.hiddenAt !== undefined;

/**
 * OPEN ("Đang tuyển") marketplace campaign whose apply window is still running, not paused by an edit under review and
 * not hidden by Admin. Open recruitment: only while its "Ứng tuyển" phase lasts.
 */
export function isAcceptingApplications(c: Campaign, now: number): boolean {
  if (c.visibility !== 'MARKETPLACE' || c.status !== 'OPEN' || isPausedForRevision(c) || isHiddenByAdmin(c)) return false;
  if (c.type === 'OPEN_RECRUITMENT') return isRecruit(c) && phaseOfTimeline(c.recruitment.timeline, now) === 'APPLY';
  if (!c.endDate || endOfDay(c.endDate) < now) return false;
  return !c.applyDeadline || applyDeadlineAt(c)! > now;
}

/**
 * In the Sàn list of opportunities (Công bố lên sàn §4.2): published, Đang tuyển, before the deadline, not hidden and not
 * paused by a terms edit under review (its page stays public with "đang cập nhật"). Open recruitment also shows while
 * its "Ứng tuyển" phase has not started yet. CLOSED campaigns leave the list but their page stays public.
 */
export function isListedOnMarketplace(c: Campaign, now: number): boolean {
  if (c.visibility !== 'MARKETPLACE' || c.status !== 'OPEN' || isHiddenByAdmin(c) || isPausedForRevision(c)) return false;
  if (isAcceptingApplications(c, now)) return true;
  return isRecruit(c) && phaseOfTimeline(c.recruitment.timeline, now) === 'UPCOMING';
}

/**
 * Public page of a published marketplace campaign: Đang tuyển, Đã đóng tuyển or Hoàn tất (§10). Drafts never have one;
 * cancelled or hidden campaigns show "Chiến dịch không còn khả dụng" instead (KOLHUB-4827).
 */
export function hasPublicPage(c: Campaign): boolean {
  return c.visibility === 'MARKETPLACE' && !isHiddenByAdmin(c) && (c.status === 'OPEN' || c.status === 'CLOSED' || c.status === 'COMPLETED');
}

/**
 * Reward kind shown and filtered on the Sàn (§6.2–6.3): cash only, product/experience only, or both. Booking 1 KOL looks at
 * every deliverable group; Booking nhiều KOL at its single reward. undefined when nothing is set yet.
 */
export function rewardKindOf(c: { type?: CampaignType; groups?: DeliverableGroup[]; recruitment?: Recruitment }): RewardKind | undefined {
  const rewards = c.type === 'OPEN_RECRUITMENT' ? (c.recruitment ? [c.recruitment.reward] : []) : (c.groups ?? []).map((g) => g.reward);
  const cash = rewards.some((r) => r.cash > 0);
  const product = rewards.some((r) => !!r.product);
  return cash && product ? 'BOTH' : cash ? 'CASH' : product ? 'PRODUCT' : undefined;
}

/**
 * The version Admin is deciding on (§4.1): when the pending submission was sent — the last "Gửi đăng" of a campaign
 * waiting for review, or the edit under review of an OPEN one. Changes whenever the brand withdraws and resubmits.
 */
export function reviewVersionOf(c: Campaign): number | undefined {
  if (c.status === 'OPEN' && c.pendingRevision) return c.pendingRevision.submittedAt;
  if (c.status !== 'PENDING_REVIEW') return undefined;
  return [...(c.log ?? [])].reverse().find((e) => e.action === 'SUBMITTED')?.at ?? c.updatedAt;
}

/** Why a published campaign takes no new applications (KOLHUB-4808 meta.reason). */
export function notAcceptingReason(c: Campaign): 'PAUSED' | 'CLOSED' | 'HIDDEN' | undefined {
  if (isHiddenByAdmin(c) || c.status === 'CANCELLED') return 'HIDDEN';
  if (c.status === 'CLOSED' || c.status === 'COMPLETED') return 'CLOSED';
  if (c.status === 'OPEN' && isPausedForRevision(c)) return 'PAUSED';
  return undefined;
}

/**
 * Marks `ids` as picked on `state` (in place): ACCEPTED at the campaign's fixed reward (price = cash, reward snapshot),
 * history SELECTED. Callers check the phase, statuses and free slots first.
 */
export function applySelection(state: DemoState, campaignId: string, ids: string[], t: number): void {
  const c = state.campaigns.find((x) => x.id === campaignId)!;
  const reward = structuredClone(c.recruitment!.reward);
  for (const id of ids) {
    const b = state.bookings.find((x) => x.id === id)!;
    b.status = 'ACCEPTED';
    delete b.awaiting;
    b.price = reward.cash;
    b.reward = structuredClone(reward);
    b.acceptedAt = t;
    b.updatedAt = t;
    b.history.push({ at: t, by: 'BRAND', action: 'SELECTED', ...(reward.cash ? { price: reward.cash } : {}) });
  }
  c.updatedAt = t;
}

/** Free slots of an open-recruitment campaign; 4818 when `wanted` does not fit. */
export function checkSlots(state: DemoState, c: Campaign, wanted: number, now: number): void {
  const slots = c.recruitment?.slots ?? 0;
  const remaining = slots - selectedCount(state, c, now);
  if (wanted > remaining) throw new KolhubError('KOLHUB-4818', { slots, remaining: Math.max(0, remaining) });
}

/**
 * Booking 1 KOL: the campaign confirms one booking only (4818 { slots: 1, remaining: 0 } once another booking is
 * accepted or later, not cancelled). Recruitment stays open and other applications stay pending (Công bố lên sàn §9).
 */
export function checkSingleBooking(state: DemoState, c: Campaign, b: Booking, now: number): void {
  if (campaignType(c) !== 'BOOKING') return;
  const taken = state.bookings.some((x) => {
    if (x.campaignId !== c.id || x.id === b.id) return false;
    const st = effectiveStatus(x, c, now);
    return isInProgress(st) || st === 'COMPLETED';
  });
  if (taken) throw new KolhubError('KOLHUB-4818', { slots: 1, remaining: 0 });
}

/** Booking 1 KOL: another (not cancelled) booking of `c` is accepted or later. */
export function kolTakenBy(state: DemoState, c: Campaign | undefined, b: Booking, now: number): boolean {
  if (!c || campaignType(c) !== 'BOOKING') return false;
  return state.bookings.some((x) => {
    if (x.campaignId !== c.id || x.id === b.id) return false;
    const st = effectiveStatus(x, c, now);
    return isInProgress(st) || st === 'COMPLETED';
  });
}

/** Picked applicants of an open-recruitment campaign (ACCEPTED or later, not cancelled). */
export function selectedCount(state: DemoState, c: Campaign, now: number): number {
  return state.bookings.filter((b) => {
    if (b.campaignId !== c.id || b.origin !== 'APPLICATION') return false;
    const st = effectiveStatus(b, c, now);
    return isInProgress(st) || st === 'COMPLETED';
  }).length;
}

export function toMarketplaceCampaign(state: DemoState, c: Campaign, viewerId: string | null, now: number): MarketplaceCampaign {
  const acc = state.accounts.find((a) => a.id === c.brandAccountId);
  const own = state.bookings.filter((b) => b.campaignId === c.id);
  const item: MarketplaceCampaign = {
    id: c.id,
    name: c.name,
    objective: c.objective,
    brief: c.brief,
    startDate: c.startDate ?? '',
    endDate: c.endDate ?? '',
    platforms: [...c.platforms],
    categories: [...c.categories],
    deliverables: c.deliverables.map((d) => ({ ...d })),
    contentRules: c.contentRules,
    publishedAt: c.publishedAt ?? c.createdAt,
    brand: { company: brandRef(acc, c.brandAccountId).company },
    kolTarget: isRecruit(c) ? c.recruitment.slots : 1,
    type: campaignType(c),
    draftReview: draftReviewOn(c),
    groups: structuredClone(c.groups ?? []),
    contract: contractOn(c),
    regions: [...(c.regions ?? [])],
    survey: (c.survey ?? []).map((q) => ({ ...q })),
    terms: (c.terms ?? []).map((t) => ({ ...t })),
  };
  if (c.applyDeadline) {
    item.applyDeadline = c.applyDeadline;
    item.applyDeadlineTime = c.applyDeadlineTime ?? DEADLINE_TIME_DEFAULT;
    item.applyDeadlineAt = applyDeadlineAt(c);
  }
  if (c.promotedBrand?.name) item.promotedBrand = { name: c.promotedBrand.name, viaAgency: !c.promotedBrand.own };
  if (c.usageRights) item.usageRights = structuredClone(c.usageRights);
  if (c.cover) item.cover = { ...c.cover };
  if (c.target) item.target = { ...c.target };
  if (isRecruit(c)) {
    item.recruitment = structuredClone(c.recruitment);
    item.phase = phaseOfTimeline(c.recruitment.timeline, now);
  }
  const mine = viewerId ? own.find((b) => b.supplierAccountId === viewerId && isOccupying(effectiveStatus(b, c, now))) : undefined;
  if (mine) item.myBooking = { id: mine.id, status: effectiveStatus(mine, c, now), origin: mine.origin };
  return item;
}

/**
 * "Nhãn hàng" block of a marketplace campaign (Sàn v2): public facts only — no contact data, no ratings.
 * Brand accounts register with an OTP-verified email on a company domain (BR-45), so that counts as verified.
 */
export function brandInfoOf(state: DemoState, brandAccountId: string, now: number): MarketplaceBrandInfo {
  const acc = state.accounts.find((a) => a.id === brandAccountId);
  const campaigns = state.campaigns.filter((c) => c.brandAccountId === brandAccountId);
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  return {
    company: brandRef(acc, brandAccountId).company,
    businessEmailVerified: acc?.type === 'BIZ' && !!acc.email && !isFreeEmail(acc.email),
    campaignsPosted: campaigns.filter((c) => c.status !== 'DRAFT' && c.publishedAt !== undefined).length,
    completedBookings: state.bookings.filter(
      (b) => b.brandAccountId === brandAccountId && effectiveStatus(b, byId.get(b.campaignId), now) === 'COMPLETED',
    ).length,
    memberSince: acc?.createdAt ?? '',
  };
}

export function supplierRef(state: DemoState, b: Booking): SupplierRef {
  const p =
    b.supplierType === 'MCN'
      ? state.mcnProfiles.find((x) => x.accountId === b.supplierAccountId)
      : state.kolProfiles.find((x) => x.accountId === b.supplierAccountId);
  const ref: SupplierRef = { type: b.supplierType, accountId: b.supplierAccountId, name: (p && profileDisplayName(p)) || b.supplierAccountId };
  const code = p ? (p.ownerType === 'MCN' ? p.mcnId : p.kolId) : undefined;
  if (code) ref.code = code;
  if (p?.avatar?.thumbnail) ref.avatar = p.avatar.thumbnail;
  return ref;
}

function campaignSummary(state: DemoState, c: Campaign, now: number): BookingCampaignSummary {
  const out: BookingCampaignSummary = {
    type: campaignType(c),
    draftReview: draftReviewOn(c),
    groups: structuredClone(c.groups ?? []),
    contract: contractOn(c),
    regions: [...(c.regions ?? [])],
    categories: [...c.categories],
    ...(c.target ? { target: { ...c.target } } : {}),
    id: c.id,
    name: c.name,
    objective: c.objective,
    brief: c.brief,
    contentRules: c.contentRules,
    status: c.status,
    visibility: c.visibility,
    platforms: [...c.platforms],
    deliverables: c.deliverables.map((d) => ({ ...d })),
    brand: brandRef(
      state.accounts.find((a) => a.id === c.brandAccountId),
      c.brandAccountId,
    ),
  };
  if (c.startDate) out.startDate = c.startDate;
  if (c.endDate) out.endDate = c.endDate;
  if (c.applyDeadline) {
    out.applyDeadline = c.applyDeadline;
    out.applyDeadlineTime = c.applyDeadlineTime ?? DEADLINE_TIME_DEFAULT;
  }
  if (c.promotedBrand?.name) out.promotedBrand = { name: c.promotedBrand.name, viaAgency: !c.promotedBrand.own };
  if (c.usageRights) out.usageRights = structuredClone(c.usageRights);
  if (c.cover) out.cover = { ...c.cover };
  if (isRecruit(c)) {
    out.recruitment = structuredClone(c.recruitment);
    out.phase = phaseOfTimeline(c.recruitment.timeline, now);
  }
  return out;
}

export function itemView(state: DemoState, it: BookingItem, now: number): BookingItemView {
  const profile = state.kolProfiles.find((p) => p.accountId === it.kolAccountId);
  const kol = profile ? publicKolOf(profile, state.channels, now, state.kolSafetyReports) : null;
  const view: BookingItemView = { ...it, kol, displayName: kol?.displayName || (profile && profileDisplayName(profile)) || it.kolId };
  const ch = it.channelId ? state.channels.find((c) => c.id === it.channelId) : undefined;
  if (ch) {
    view.channel = { id: ch.id, ownerType: ch.ownerType, platform: ch.platform, handle: ch.handle, url: ch.url, followers: ch.stats?.followers ?? 0 };
  }
  return view;
}

export function toBookingView(state: DemoState, b: Booking, party: BookingParty, now: number): BookingView {
  const c = state.campaigns.find((x) => x.id === b.campaignId)!;
  const status = effectiveStatus(b, c, now);
  const { items, ratings, ...rest } = structuredClone(b);
  const view: BookingView = {
    ...rest,
    status,
    viewer: party,
    allowedActions: allowedActions(b, status, party, { campaign: c, now, kolTaken: kolTakenBy(state, c, b, now) }),
    campaign: campaignSummary(state, c, now),
    supplier: supplierRef(state, b),
    items: items.map((it) => itemView(state, it, now)),
  };
  if (isPreAccept(status) || status === 'EXPIRED') {
    const exp = expiresAtOf(b, c);
    if (exp !== undefined) view.expiresAt = exp;
  }
  if (status === 'EXPIRED' || status === 'DECLINED') delete view.awaiting;
  const mine = party === 'BRAND' ? ratings?.brand : ratings?.supplier;
  if (mine) view.myRating = mine;
  return view;
}

export function matchesStatus(st: BookingStatus, filter: BookingStatus | BookingStatus[] | undefined): boolean {
  if (filter === undefined) return true;
  return Array.isArray(filter) ? filter.includes(st) : st === filter;
}

/** Default deliverable of an invite (spec §4). */
export function inviteDeliverable(c: Campaign, opt?: { type: DeliverableType; platform?: Platform; quantity?: number }): Deliverable {
  const first = c.deliverables[0];
  const type = opt?.type ?? first?.type ?? 'VIDEO';
  const platform = opt?.platform ?? first?.platform ?? c.platforms[0] ?? 'tiktok';
  const quantity = opt?.quantity ?? (opt ? 1 : (first?.quantity ?? 1));
  if (!isDeliverableType(type) || !isPlatform(platform) || !isQty(quantity)) throw bad('deliverables');
  return { type, platform, quantity };
}
