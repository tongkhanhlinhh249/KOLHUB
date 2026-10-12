// Create / edit campaign form: values ↔ service input, and per-field error text (KOLHUB-4803 `meta.field`).
import {
  DEFAULT_TERMS,
  shiftIso,
  type Campaign,
  type CampaignInput,
  type CampaignType,
  type CampaignVisibility,
  type DeliverableGroup,
  type DeliverableType,
  type KolCategory,
  type Platform,
  type RecruitmentTimeline,
  type StoredFile,
  type TargetGender,
} from '../../services';
import { formatVndInput, parseVndInput } from './campaignView';

export interface DeliverableRow {
  type: DeliverableType;
  platform: Platform;
  /** Raw text of the quantity input. */
  quantity: string;
}

/** "Quyền lợi theo nhóm đầu việc" of one platform (Booking riêng): raw input texts. */
export interface GroupRow {
  platform: Platform;
  slots: string;
  /** Formatted VND text per booking, '' = 0. */
  cash: string;
  hasProduct: boolean;
  productName: string;
  /** Formatted VND text. */
  productValue: string;
}

export interface CampaignFormValues {
  name: string;
  objective: string;
  brief: string;
  /** Formatted VND text ("120.000.000"). */
  budget: string;
  startDate: string;
  endDate: string;
  platforms: Platform[];
  categories: KolCategory[];
  deliverables: DeliverableRow[];
  /** Booking riêng: slots + fixed reward per platform of the deliverables (kept for every platform ever entered). */
  groups: GroupRow[];
  contentRules: string;
  visibility: CampaignVisibility;
  applyDeadline: string;
  /** "Ảnh chiến dịch" (16:9 cover); null = none. */
  cover: StoredFile | null;
  // --- loại chiến dịch / Tuyển nhiều KOL ---
  type: CampaignType;
  /** Raw text of the slots input. */
  slots: string;
  /** Formatted VND text, '' = 0. */
  rewardCash: string;
  hasProduct: boolean;
  productName: string;
  /** Formatted VND text. */
  productValue: string;
  productNote: string;
  timeline: RecruitmentTimeline;
  // --- workflow, conditions, apply form ---
  draftReview: boolean;
  /** Empty = Toàn quốc. */
  regions: string[];
  ageMin: string;
  ageMax: string;
  gender: TargetGender;
  /** Formatted number text. */
  minFollowers: string;
  survey: SurveyRow[];
  terms: TermRow[];
  // --- "Tính năng của chiến dịch" (bật/tắt) ---
  /** "Hợp đồng": contract file on bookings + apply terms. */
  contract: boolean;
  /** "Đề nghị trả phí" (Tuyển nhiều KOL): cash reward per KOL. */
  payCash: boolean;
  /** "Sự tuân thủ": content rules. */
  useContentRules: boolean;
  /** "Điều kiện tham gia". */
  useConditions: boolean;
  /** "Câu hỏi khảo sát". */
  useSurvey: boolean;
}

export interface SurveyRow {
  id?: string;
  text: string;
  required: boolean;
}

export interface TermRow {
  id?: string;
  text: string;
}

export const EMPTY_TIMELINE: RecruitmentTimeline = {
  applyStart: '',
  applyEnd: '',
  selectStart: '',
  selectEnd: '',
  postStart: '',
  postEnd: '',
  reviewStart: '',
  reviewEnd: '',
};

/** "Gợi ý lịch": Ứng tuyển 7 ngày từ `startIso`, Chọn lọc 3 ngày, Đăng bài 15 ngày, Đánh giá 6 ngày. */
export function suggestTimeline(startIso: string): RecruitmentTimeline {
  const d = (n: number) => shiftIso(startIso, n);
  return {
    applyStart: d(0),
    applyEnd: d(6),
    selectStart: d(7),
    selectEnd: d(9),
    postStart: d(10),
    postEnd: d(24),
    reviewStart: d(25),
    reviewEnd: d(30),
  };
}

export const EMPTY_FORM: CampaignFormValues = {
  name: '',
  objective: '',
  brief: '',
  budget: '',
  startDate: '',
  endDate: '',
  platforms: [],
  categories: [],
  deliverables: [],
  groups: [],
  contentRules: '',
  visibility: 'PRIVATE',
  applyDeadline: '',
  cover: null,
  type: 'BOOKING',
  slots: '',
  rewardCash: '',
  hasProduct: false,
  productName: '',
  productValue: '',
  productNote: '',
  timeline: EMPTY_TIMELINE,
  draftReview: true,
  regions: [],
  ageMin: '',
  ageMax: '',
  gender: 'ANY',
  minFollowers: '',
  survey: [],
  terms: DEFAULT_TERMS.map((text) => ({ text })),
  contract: true,
  payCash: true,
  useContentRules: false,
  useConditions: false,
  useSurvey: false,
};

const numText = (n: number | undefined) => (n !== undefined && n > 0 ? formatVndInput(String(n)) : '');

export function formFromCampaign(c: Campaign): CampaignFormValues {
  const r = c.recruitment;
  return {
    name: c.name,
    objective: c.objective,
    brief: c.brief,
    budget: c.budget > 0 ? formatVndInput(String(c.budget)) : '',
    startDate: c.startDate ?? '',
    endDate: c.endDate ?? '',
    platforms: [...c.platforms],
    categories: [...c.categories],
    deliverables: c.deliverables.map((d) => ({ type: d.type, platform: d.platform, quantity: String(d.quantity) })),
    groups: (c.groups ?? []).map((g) => ({
      platform: g.platform,
      slots: g.slots > 0 ? String(g.slots) : '',
      cash: numText(g.reward.cash),
      hasProduct: !!g.reward.product,
      productName: g.reward.product?.name ?? '',
      productValue: numText(g.reward.product?.value),
    })),
    contentRules: c.contentRules,
    visibility: c.visibility,
    applyDeadline: c.applyDeadline ?? '',
    cover: c.cover ?? null,
    type: c.type === 'OPEN_RECRUITMENT' ? 'OPEN_RECRUITMENT' : 'BOOKING',
    slots: r && r.slots > 0 ? String(r.slots) : '',
    rewardCash: numText(r?.reward.cash),
    hasProduct: !!r?.reward.product,
    productName: r?.reward.product?.name ?? '',
    productValue: numText(r?.reward.product?.value),
    productNote: r?.reward.product?.note ?? '',
    timeline: r ? { ...r.timeline } : EMPTY_TIMELINE,
    draftReview: c.draftReview !== false,
    regions: [...(c.regions ?? [])],
    ageMin: c.target?.ageMin !== undefined ? String(c.target.ageMin) : '',
    ageMax: c.target?.ageMax !== undefined ? String(c.target.ageMax) : '',
    gender: c.target?.gender ?? 'ANY',
    minFollowers: numText(c.target?.minFollowers),
    survey: (c.survey ?? []).map((q) => ({ ...q })),
    terms: (c.terms ?? []).map((t) => ({ ...t })),
    contract: c.contract !== false,
    payCash: r ? r.reward.cash > 0 : true,
    useContentRules: !!c.contentRules.trim(),
    useConditions: (c.regions ?? []).length > 0 || !!c.target,
    useSurvey: (c.survey ?? []).length > 0,
  };
}

/** Whole number from a digits field; '' → undefined; anything else → NaN so the service rejects it. */
function intOrUndefined(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

/** Whole-number quantity; anything else becomes 0 so the service rejects it (4803 deliverables). */
function qty(text: string): number {
  const t = text.trim();
  return /^\d+$/.test(t) ? Number(t) : 0;
}

/**
 * Form → service input. The apply deadline only applies to marketplace campaigns (cleared otherwise).
 * "Tuyển nhiều KOL" sends its recruitment block (the service derives budget, dates, deadline and visibility);
 * "Booking riêng" clears it. Blank survey questions / terms are dropped.
 * A feature card turned off clears its data: content rules, conditions, survey, terms (with "Hợp đồng"), cash reward.
 */
export function formToInput(v: CampaignFormValues): CampaignInput {
  const recruit = v.type === 'OPEN_RECRUITMENT';
  // Conditions and survey apply to applicants only: a private Booking riêng (invites only) drops them.
  const applyForm = recruit || v.visibility === 'MARKETPLACE';
  const ageMin = intOrUndefined(v.ageMin);
  const ageMax = intOrUndefined(v.ageMax);
  const minFollowers = parseVndInput(v.minFollowers);
  const target = {
    ...(ageMin !== undefined ? { ageMin } : {}),
    ...(ageMax !== undefined ? { ageMax } : {}),
    ...(v.gender !== 'ANY' ? { gender: v.gender } : {}),
    ...(minFollowers ? { minFollowers } : {}),
  };
  const extra: Partial<CampaignInput> = {
    type: v.type,
    recruitment: recruit
      ? {
          slots: intOrUndefined(v.slots) ?? 0,
          reward: {
            cash: v.payCash ? (parseVndInput(v.rewardCash) ?? 0) : 0,
            ...(v.hasProduct
              ? { product: { name: v.productName, value: parseVndInput(v.productValue) ?? 0, ...(v.productNote.trim() ? { note: v.productNote } : {}) } }
              : {}),
          },
          timeline: { ...v.timeline },
        }
      : null,
    // Booking riêng: one group per deliverable platform; the service derives the budget from it.
    groups: recruit ? null : deliverablePlatforms(v.deliverables).map((p) => groupInput(groupRow(v.groups, p))),
    draftReview: v.draftReview,
    contract: v.contract,
    regions: applyForm && v.useConditions ? v.regions : [],
    target: applyForm && v.useConditions && Object.keys(target).length ? target : null,
    survey: applyForm && v.useSurvey ? v.survey.filter((q) => q.text.trim()).map((q) => ({ ...(q.id ? { id: q.id } : {}), text: q.text, required: q.required })) : [],
    terms: v.contract ? v.terms.filter((t) => t.text.trim()).map((t) => ({ ...(t.id ? { id: t.id } : {}), text: t.text })) : [],
  };
  return {
    ...extra,
    name: v.name,
    objective: v.objective,
    brief: v.brief,
    budget: recruit ? recruitBudget(v) : bookingBudget(v),
    startDate: v.startDate,
    endDate: v.endDate,
    // Booking riêng has no separate platform picker: the platforms are those of its deliverables.
    platforms: recruit ? v.platforms : deliverablePlatforms(v.deliverables),
    categories: v.categories,
    deliverables: v.deliverables.map((d) => ({ type: d.type, platform: d.platform, quantity: qty(d.quantity) })),
    contentRules: v.useContentRules ? v.contentRules : '',
    visibility: recruit ? 'MARKETPLACE' : v.visibility,
    applyDeadline: !recruit && v.visibility === 'MARKETPLACE' && v.applyDeadline ? v.applyDeadline : null,
    cover: v.cover,
  } as CampaignInput;
}

/** The group row of `platform` (an empty one when not entered yet). */
export function groupRow(groups: GroupRow[], platform: Platform): GroupRow {
  return groups.find((g) => g.platform === platform) ?? { platform, slots: '', cash: '', hasProduct: false, productName: '', productValue: '' };
}

function groupInput(g: GroupRow): DeliverableGroup {
  return {
    platform: g.platform,
    slots: intOrUndefined(g.slots) ?? 0,
    reward: {
      cash: parseVndInput(g.cash) ?? 0,
      ...(g.hasProduct ? { product: { name: g.productName, value: parseVndInput(g.productValue) ?? 0 } } : {}),
    },
  };
}

/** Value of one booking of a group row: cash + product value. */
export function groupRowValue(g: GroupRow): number {
  return (parseVndInput(g.cash) ?? 0) + (g.hasProduct ? (parseVndInput(g.productValue) ?? 0) : 0);
}

/** Budget preview of a Booking riêng form: Σ over the deliverable platforms of slots × (cash + product value). */
export function bookingBudget(v: CampaignFormValues): number {
  return deliverablePlatforms(v.deliverables).reduce((sum, p) => {
    const g = groupRow(v.groups, p);
    const slots = intOrUndefined(g.slots) ?? 0;
    return sum + (Number.isFinite(slots) ? slots * groupRowValue(g) : 0);
  }, 0);
}

/** Budget preview of an open-recruitment form: slots × (cash + product value). */
export function recruitBudget(v: CampaignFormValues): number {
  const slots = intOrUndefined(v.slots) ?? 0;
  const per = (v.payCash ? (parseVndInput(v.rewardCash) ?? 0) : 0) + (v.hasProduct ? (parseVndInput(v.productValue) ?? 0) : 0);
  return Number.isFinite(slots) ? slots * per : 0;
}

/** Platforms of the deliverable rows, without duplicates, in row order. */
export function deliverablePlatforms(rows: DeliverableRow[]): Platform[] {
  return [...new Set(rows.map((r) => r.platform))];
}

/** Fields shown inside "Tính năng nâng cao" of a Booking riêng form (an error on one opens that block). */
export const ADVANCED_FIELDS: readonly string[] = [
  'objective',
  'visibility',
  'applyDeadline',
  'categories',
  'draftReview',
  'contentRules',
  'contract',
  'terms',
  'regions',
  'target',
  'survey',
];

/** New deliverable row: first selected platform, 1 video. */
export function newDeliverable(platforms: Platform[]): DeliverableRow {
  return { type: 'VIDEO', platform: platforms[0] ?? 'tiktok', quantity: '1' };
}

export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Fields the service may name in KOLHUB-4803 for a campaign. */
export const FORM_FIELDS = [
  'name',
  'objective',
  'brief',
  'budget',
  'dates',
  'platforms',
  'categories',
  'deliverables',
  'contentRules',
  'visibility',
  'applyDeadline',
  'cover',
  'type',
  'recruitment',
  'slots',
  'reward',
  'product',
  'timeline',
  'draftReview',
  'groups',
  'contract',
  'regions',
  'target',
  'survey',
  'terms',
] as const;
export type FormField = (typeof FORM_FIELDS)[number];

const HINT: Partial<Record<FormField, string>> = {
  name: 'Tên chiến dịch từ 1 đến 150 ký tự.',
  budget: 'Ngân sách tự tính từ số suất và quyền lợi của từng nhóm đầu việc.',
  groups: 'Mỗi nền tảng trong hạng mục cần số suất (1–1.000) và thù lao/booking lớn hơn 0 hoặc tặng sản phẩm (tên và giá trị).',
  dates: 'Cần ngày bắt đầu và ngày kết thúc; ngày kết thúc không trước ngày bắt đầu và chưa qua.',
  platforms: 'Cần ít nhất một hạng mục nội dung (nền tảng lấy theo hạng mục).',
  deliverables: 'Cần ít nhất một hạng mục, số lượng 1–100. Với Tuyển nhiều KOL, nền tảng của hạng mục phải nằm trong các nền tảng đã chọn.',
  applyDeadline: 'Hạn ứng tuyển không được sau ngày kết thúc và chưa qua.',
  objective: 'Tối đa 5.000 ký tự.',
  brief: 'Brief bắt buộc khi đăng chiến dịch Booking riêng, tối đa 5.000 ký tự.',
  contentRules: 'Tối đa 5.000 ký tự.',
  type: 'Không đổi được loại chiến dịch khi đã có booking.',
  slots: 'Số suất từ 1 đến 500 và không ít hơn số KOL đã chọn.',
  reward: 'Cần tiền mặt lớn hơn 0 hoặc tặng kèm sản phẩm.',
  product: 'Nhập tên sản phẩm (tối đa 150 ký tự) và giá trị lớn hơn 0.',
  timeline: 'Cần đủ ngày bắt đầu, kết thúc của 4 giai đoạn, theo đúng thứ tự, không trùng nhau; giai đoạn Ứng tuyển chưa kết thúc.',
  target: 'Độ tuổi từ 16 đến 80, tuổi tối thiểu không lớn hơn tuổi tối đa.',
  survey: 'Tối đa 10 câu hỏi, mỗi câu tối đa 300 ký tự.',
  terms: 'Tối đa 10 điều khoản, mỗi điều khoản tối đa 300 ký tự.',
};

/** "Ảnh chiến dịch" upload rules (mirror the service: JPG / PNG / WebP ≤ 10 MB). */
export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp';
export const COVER_MAX_BYTES = 10 * 1024 * 1024;
export const COVER_ERROR = 'Ảnh chiến dịch phải là JPG, PNG hoặc WebP, tối đa 10 MB.';

/** Checks a picked file before it is read; the error text, or undefined when it is fine. */
export function coverFileError(f: { type: string; size: number }): string | undefined {
  return COVER_ACCEPT.split(',').includes(f.type) && f.size <= COVER_MAX_BYTES ? undefined : COVER_ERROR;
}

/** Service message + what to fix for that field. */
export function fieldErrorText(field: string, message: string): string {
  const hint = HINT[field as FormField];
  return hint ? `${message} ${hint}` : message;
}

export function isFormField(f: unknown): f is FormField {
  return typeof f === 'string' && (FORM_FIELDS as readonly string[]).includes(f);
}
