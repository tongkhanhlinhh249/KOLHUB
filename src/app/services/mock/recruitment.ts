// Pure rules of "Tuyển nhiều KOL" (open recruitment, REVU-style): campaign type, 4-phase timeline, reward,
// survey / terms / target / regions validation and the apply form checks. No state access here.
import {
  ANSWER_MAX,
  PRODUCT_NAME_MAX,
  PRODUCT_NOTE_MAX,
  RECRUIT_MILESTONES,
  RECRUIT_SLOTS_MAX,
  SHIPPING_ADDRESS_MAX,
  SURVEY_MAX,
  SURVEY_TEXT_MAX,
  TARGET_AGE_MAX,
  TARGET_AGE_MIN,
  TERMS_MAX,
  VN_PROVINCES,
  type ApplicationDetails,
  type ApplyInput,
  type Campaign,
  type CampaignReward,
  type CampaignTarget,
  type CampaignTerm,
  type CampaignType,
  type Recruitment,
  type RecruitmentTimeline,
  type RecruitMilestone,
  type RecruitPhase,
  type SurveyQuestion,
} from '../campaign-types';
import { KolhubError } from '../types';
import { isValidPhone, normalizePhone } from './normalize';

const DAY = 86_400_000;
const bad = (field: string) => new KolhubError('KOLHUB-4803', { field });
const clean = (s: unknown) => (typeof s === 'string' ? s.normalize('NFC').trim().replace(/\s+/g, ' ') : '');
const len = (s: string) => [...s].length;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROVINCES = new Set<string>(VN_PROVINCES);

// ---------------------------------------------------------------------------
// Type and phase
// ---------------------------------------------------------------------------

export function campaignType(c: Pick<Campaign, 'type'>): CampaignType {
  return c.type === 'OPEN_RECRUITMENT' ? 'OPEN_RECRUITMENT' : 'BOOKING';
}

/** An open-recruitment campaign (with its recruitment block). */
export function isRecruit(c: Pick<Campaign, 'type' | 'recruitment'> | undefined | null): c is Campaign & { recruitment: Recruitment } {
  return !!c && c.type === 'OPEN_RECRUITMENT' && !!c.recruitment;
}

/** "Duyệt nháp" is on unless explicitly turned off. */
export const draftReviewOn = (c: Pick<Campaign, 'draftReview'> | undefined | null) => c?.draftReview !== false;

/** "Đàm phán": price counter-offers between the two sides. Booking riêng only (absent = on); never for Tuyển nhiều KOL. */
export const negotiationOn = (c: Pick<Campaign, 'negotiation' | 'type'> | undefined | null) => !!c && c.type !== 'OPEN_RECRUITMENT' && c.negotiation !== false;

/** "Hợp đồng": contract file on bookings and the apply terms. Absent = on. */
export const contractOn = (c: Pick<Campaign, 'contract'> | undefined | null) => c?.contract !== false;

/** Local 'YYYY-MM-DD' of `ms`. */
export function localIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Last ms of the local day `iso`. */
export function endOfLocalDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** `iso` shifted by `days` local days. */
export function shiftIso(iso: string, days: number): string {
  if (!DATE_RE.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  return localIso(new Date(y, m - 1, d + days, 12).getTime());
}

/**
 * Phase on the local day of `now`: before applyStart → UPCOMING; then the first milestone whose end is today
 * or later (a gap between two milestones belongs to the next one); after reviewEnd → ENDED.
 */
export function phaseOfTimeline(t: RecruitmentTimeline, now: number): RecruitPhase {
  const today = localIso(now);
  if (!t.applyStart || today < t.applyStart) return 'UPCOMING';
  for (const m of RECRUIT_MILESTONES) if (t[m.end] && today <= t[m.end]) return m.key;
  return 'ENDED';
}

export function recruitPhase(c: Pick<Campaign, 'type' | 'recruitment'>, now: number): RecruitPhase | undefined {
  return isRecruit(c) ? phaseOfTimeline(c.recruitment.timeline, now) : undefined;
}

/** Last day ('YYYY-MM-DD') of a milestone. */
export function milestoneEnd(t: RecruitmentTimeline, m: RecruitMilestone): string {
  return t[RECRUIT_MILESTONES.find((x) => x.key === m)!.end];
}

/** Whole local days from today to `iso` (0 = today). */
export function daysTo(iso: string, now: number): number {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date(now);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((new Date(y, m - 1, d).getTime() - t0) / DAY);
}

/** Value of one KOL's reward (cash + product value). */
export const rewardValue = (r: CampaignReward | undefined) => (r ? r.cash + (r.product?.value ?? 0) : 0);

// ---------------------------------------------------------------------------
// Sanitizing campaign input (type checks; completeness is checked when the campaign opens)
// ---------------------------------------------------------------------------

const intIn = (n: unknown, min: number, max: number) => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;

export function checkRecruitment(r: unknown): Recruitment {
  const x = r as Partial<Recruitment> | null;
  if (!x || typeof x !== 'object') throw bad('recruitment');
  const slots = x.slots ?? 0;
  if (!intIn(slots, 0, RECRUIT_SLOTS_MAX)) throw bad('slots');
  const rw = (x.reward ?? { cash: 0 }) as Partial<CampaignReward>;
  const cash = rw.cash ?? 0;
  if (!Number.isSafeInteger(cash) || cash < 0) throw bad('reward');
  const reward: CampaignReward = { cash };
  if (rw.product) {
    const name = clean(rw.product.name);
    const note = clean(rw.product.note);
    if (!name || len(name) > PRODUCT_NAME_MAX || !Number.isSafeInteger(rw.product.value) || rw.product.value <= 0 || len(note) > PRODUCT_NOTE_MAX) {
      throw bad('product');
    }
    reward.product = { name, value: rw.product.value, ...(note ? { note } : {}) };
  }
  const t = (x.timeline ?? {}) as Partial<RecruitmentTimeline>;
  const timeline = {} as RecruitmentTimeline;
  for (const m of RECRUIT_MILESTONES) {
    for (const k of [m.start, m.end]) {
      const v = t[k] ?? '';
      if (typeof v !== 'string' || (v !== '' && !isRealDate(v))) throw bad('timeline');
      timeline[k] = v;
    }
  }
  return { slots, reward, timeline };
}

function isRealDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Survey questions: ≤ SURVEY_MAX, text 1–300 chars; missing / duplicate ids get `q-N`. */
export function checkSurvey(list: unknown): SurveyQuestion[] {
  if (!Array.isArray(list) || list.length > SURVEY_MAX) throw bad('survey');
  const used = new Set<string>();
  return list.map((q, i) => {
    const text = clean(q?.text);
    if (!text || len(text) > SURVEY_TEXT_MAX || (q.required !== undefined && typeof q.required !== 'boolean')) throw bad('survey');
    const id = uniqueId(q.id, `q-${i + 1}`, used);
    return { id, text, required: q.required === true };
  });
}

/** Terms: ≤ TERMS_MAX, text 1–300 chars; missing / duplicate ids get `t-N`. */
export function checkTerms(list: unknown): CampaignTerm[] {
  if (!Array.isArray(list) || list.length > TERMS_MAX) throw bad('terms');
  const used = new Set<string>();
  return list.map((x, i) => {
    const text = clean(x?.text);
    if (!text || len(text) > SURVEY_TEXT_MAX) throw bad('terms');
    return { id: uniqueId(x.id, `t-${i + 1}`, used), text };
  });
}

function uniqueId(given: unknown, fallback: string, used: Set<string>): string {
  let id = typeof given === 'string' && /^[\w-]{1,40}$/.test(given) && !used.has(given) ? given : fallback;
  let n = 1;
  while (used.has(id)) id = `${fallback}-${++n}`;
  used.add(id);
  return id;
}

export function checkRegions(list: unknown): string[] {
  if (!Array.isArray(list) || !list.every((p) => typeof p === 'string' && PROVINCES.has(p))) throw bad('regions');
  return [...new Set(list as string[])];
}

export function checkTarget(t: unknown): CampaignTarget | undefined {
  if (t === null || t === undefined) return undefined;
  const x = t as CampaignTarget;
  if (typeof x !== 'object') throw bad('target');
  const out: CampaignTarget = {};
  if (x.ageMin !== undefined) {
    if (!intIn(x.ageMin, TARGET_AGE_MIN, TARGET_AGE_MAX)) throw bad('target');
    out.ageMin = x.ageMin;
  }
  if (x.ageMax !== undefined) {
    if (!intIn(x.ageMax, TARGET_AGE_MIN, TARGET_AGE_MAX)) throw bad('target');
    out.ageMax = x.ageMax;
  }
  if (out.ageMin !== undefined && out.ageMax !== undefined && out.ageMin > out.ageMax) throw bad('target');
  if (x.gender !== undefined) {
    if (x.gender !== 'ANY' && x.gender !== 'FEMALE' && x.gender !== 'MALE') throw bad('target');
    if (x.gender !== 'ANY') out.gender = x.gender;
  }
  if (x.minFollowers !== undefined) {
    if (!Number.isSafeInteger(x.minFollowers) || x.minFollowers < 0) throw bad('target');
    if (x.minFollowers > 0) out.minFollowers = x.minFollowers;
  }
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Open-recruitment campaign: derived fields and completeness
// ---------------------------------------------------------------------------

/**
 * Fields derived from the recruitment block (in place): MARKETPLACE, start = applyStart, end = reviewEnd,
 * applyDeadline = applyEnd, budget = slots × (cash + product value).
 */
export function deriveRecruitmentFields(c: Campaign): void {
  if (!isRecruit(c)) return;
  const { slots, reward, timeline: t } = c.recruitment;
  c.visibility = 'MARKETPLACE';
  if (t.applyStart) c.startDate = t.applyStart;
  else delete c.startDate;
  if (t.reviewEnd) c.endDate = t.reviewEnd;
  else delete c.endDate;
  if (t.applyEnd) c.applyDeadline = t.applyEnd;
  else delete c.applyDeadline;
  c.budget = slots * rewardValue(reward);
}

/**
 * What an OPEN open-recruitment campaign needs (4803 with `field`): slots ≥ 1, a reward (cash > 0 or a product),
 * a complete ordered timeline that has not ended; when publishing, the apply phase must not be over.
 */
export function validateRecruitmentForOpen(c: Campaign, now: number, publishing: boolean): void {
  const r = c.recruitment;
  if (!r) throw bad('recruitment');
  if (!intIn(r.slots, 1, RECRUIT_SLOTS_MAX)) throw bad('slots');
  if (!(r.reward.cash > 0) && !r.reward.product) throw bad('reward');
  const t = r.timeline;
  let prevEnd = '';
  for (const m of RECRUIT_MILESTONES) {
    const s = t[m.start];
    const e = t[m.end];
    if (!s || !e || s > e || (prevEnd && s <= prevEnd)) throw bad('timeline');
    prevEnd = e;
  }
  if (endOfLocalDay(t.reviewEnd) < now) throw bad('timeline');
  if (publishing && endOfLocalDay(t.applyEnd) < now) throw bad('timeline');
}

// ---------------------------------------------------------------------------
// Apply form
// ---------------------------------------------------------------------------

/**
 * Survey answers (required ones filled, each ≤ 1000 chars → 4803 `answers`), every term ticked (4803 `terms`) and,
 * when the campaign rewards a product, a shipping address (province from the list + address line → `shipping`,
 * Vietnamese mobile → `phone`).
 */
export function checkApplication(c: Campaign, input: Pick<ApplyInput, 'answers' | 'acceptedTerms' | 'shipping'>, now: number): ApplicationDetails | undefined {
  const survey = c.survey ?? [];
  const terms = c.terms ?? [];
  const needsShipping = isRecruit(c) && !!c.recruitment.reward.product;
  const raw = input?.answers ?? {};
  if (typeof raw !== 'object') throw bad('answers');
  const answers = survey.map((q) => {
    const answer = typeof raw[q.id] === 'string' ? raw[q.id].normalize('NFC').trim() : '';
    if ((q.required && !answer) || len(answer) > ANSWER_MAX) throw bad('answers');
    return { questionId: q.id, question: q.text, answer };
  });
  const ticked = new Set(Array.isArray(input?.acceptedTerms) ? input.acceptedTerms : []);
  if (!terms.every((t) => ticked.has(t.id))) throw bad('terms');
  let shipping: ApplicationDetails['shipping'];
  if (needsShipping) {
    const s = input?.shipping;
    const address = clean(s?.address);
    if (!s || !PROVINCES.has(s.province) || len(address) < 5 || len(address) > SHIPPING_ADDRESS_MAX) throw bad('shipping');
    if (!isValidPhone(s.phone ?? '')) throw bad('phone');
    shipping = { province: s.province, address, phone: normalizePhone(s.phone) };
  }
  if (!survey.length && !terms.length && !shipping) return undefined;
  return {
    answers,
    acceptedTerms: terms.map((t) => t.text),
    ...(terms.length ? { termsAcceptedAt: now } : {}),
    ...(shipping ? { shipping } : {}),
  };
}
