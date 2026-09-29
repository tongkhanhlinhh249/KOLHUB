// Create / edit campaign form: values ↔ service input, and per-field error text (KOLHUB-4803 `meta.field`).
import type { Campaign, CampaignInput, CampaignVisibility, DeliverableType, KolCategory, Platform, StoredFile } from '../../services';
import { formatVndInput, parseVndInput } from './campaignView';

export interface DeliverableRow {
  type: DeliverableType;
  platform: Platform;
  /** Raw text of the quantity input. */
  quantity: string;
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
  contentRules: string;
  visibility: CampaignVisibility;
  applyDeadline: string;
  /** "Ảnh chiến dịch" (16:9 cover); null = none. */
  cover: StoredFile | null;
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
  contentRules: '',
  visibility: 'PRIVATE',
  applyDeadline: '',
  cover: null,
};

export function formFromCampaign(c: Campaign): CampaignFormValues {
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
    contentRules: c.contentRules,
    visibility: c.visibility,
    applyDeadline: c.applyDeadline ?? '',
    cover: c.cover ?? null,
  };
}

/** Whole-number quantity; anything else becomes 0 so the service rejects it (4803 deliverables). */
function qty(text: string): number {
  const t = text.trim();
  return /^\d+$/.test(t) ? Number(t) : 0;
}

/** Form → service input. The apply deadline only applies to marketplace campaigns (cleared otherwise). */
export function formToInput(v: CampaignFormValues): CampaignInput {
  return {
    name: v.name,
    objective: v.objective,
    brief: v.brief,
    budget: parseVndInput(v.budget) ?? 0,
    startDate: v.startDate,
    endDate: v.endDate,
    platforms: v.platforms,
    categories: v.categories,
    deliverables: v.deliverables.map((d) => ({ type: d.type, platform: d.platform, quantity: qty(d.quantity) })),
    contentRules: v.contentRules,
    visibility: v.visibility,
    applyDeadline: v.visibility === 'MARKETPLACE' && v.applyDeadline ? v.applyDeadline : null,
    cover: v.cover,
  };
}

/** New deliverable row: first selected platform, 1 video. */
export function newDeliverable(platforms: Platform[]): DeliverableRow {
  return { type: 'VIDEO', platform: platforms[0] ?? 'tiktok', quantity: '1' };
}

export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Fields the service may name in KOLHUB-4803 for a campaign. */
export const FORM_FIELDS = ['name', 'objective', 'brief', 'budget', 'dates', 'platforms', 'categories', 'deliverables', 'contentRules', 'visibility', 'applyDeadline', 'cover'] as const;
export type FormField = (typeof FORM_FIELDS)[number];

const HINT: Partial<Record<FormField, string>> = {
  name: 'Tên chiến dịch từ 1 đến 150 ký tự.',
  budget: 'Nhập ngân sách lớn hơn 0 để đăng chiến dịch.',
  dates: 'Cần ngày bắt đầu và ngày kết thúc; ngày kết thúc không trước ngày bắt đầu và chưa qua.',
  platforms: 'Chọn ít nhất một nền tảng.',
  deliverables: 'Cần ít nhất một hạng mục; nền tảng của hạng mục phải nằm trong các nền tảng đã chọn, số lượng 1–100.',
  applyDeadline: 'Hạn nhận đề xuất không được sau ngày kết thúc và chưa qua.',
  objective: 'Tối đa 5.000 ký tự.',
  brief: 'Tối đa 5.000 ký tự.',
  contentRules: 'Tối đa 5.000 ký tự.',
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
