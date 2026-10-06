// Pure helpers of the KOL/MCN campaign workspace on "Tổng quan hồ sơ": the stage pipeline (with deep links into
// /chien-dich-cua-toi) and the "Việc cần làm" list (next action per booking with its deadline, most urgent first).
import type { BookingStatus, BookingView } from '../../services';
import { SUPPLIER_CAMPAIGNS_PATH } from '../../auth/roles';
import { bookingDetailPath, tabOf } from '../supplier-booking/supplierBooking';

const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/** ?giai-doan= values of /chien-dich-cua-toi (a filter across the stage tabs). */
export type PipelineStage = 'loi-moi' | 'dang-thuc-hien' | 'cho-duyet' | 'cho-thanh-toan' | 'hoan-tat';

export const PIPELINE_STAGES: { key: PipelineStage; label: string; statuses: readonly BookingStatus[] }[] = [
  { key: 'loi-moi', label: 'Lời mời / Đã ứng tuyển', statuses: ['SENT', 'APPLIED', 'NEGOTIATING'] },
  { key: 'dang-thuc-hien', label: 'Đã được chọn / Đang thực hiện', statuses: ['ACCEPTED', 'IN_PRODUCTION', 'CONTENT_APPROVED', 'PUBLISHED'] },
  { key: 'cho-duyet', label: 'Chờ duyệt nội dung', statuses: ['CONTENT_REVIEW'] },
  { key: 'cho-thanh-toan', label: 'Chờ thanh toán', statuses: ['VERIFIED'] },
  { key: 'hoan-tat', label: 'Hoàn tất', statuses: ['COMPLETED'] },
];

export const STAGE_PARAM = 'giai-doan';
const STAGE_KEYS = PIPELINE_STAGES.map((s) => s.key);

/** Stage of a booking (effective status); null for closed bookings (declined, cancelled, expired). */
export function stageOf(b: Pick<BookingView, 'status'>): PipelineStage | null {
  return PIPELINE_STAGES.find((s) => s.statuses.includes(b.status))?.key ?? null;
}

export function pipelineCounts(list: Pick<BookingView, 'status'>[]): Record<PipelineStage, number> {
  const out = Object.fromEntries(STAGE_KEYS.map((k) => [k, 0])) as Record<PipelineStage, number>;
  for (const b of list) {
    const s = stageOf(b);
    if (s) out[s]++;
  }
  return out;
}

/** /chien-dich-cua-toi?giai-doan=… */
export const stagePath = (s: PipelineStage) => `${SUPPLIER_CAMPAIGNS_PATH}?${STAGE_PARAM}=${s}`;

/** ?giai-doan= → stage (unknown values → null). */
export function parseStageParam(p: URLSearchParams): PipelineStage | null {
  const v = p.get(STAGE_PARAM) as PipelineStage | null;
  return v && STAGE_KEYS.includes(v) ? v : null;
}

// ---------------------------------------------------------------------------
// "Việc cần làm"
// ---------------------------------------------------------------------------

export type TodoKind = 'ANSWER_INVITE' | 'ANSWER_OFFER' | 'SUBMIT_DRAFT' | 'SUBMIT_POST' | 'CONFIRM_PRODUCT' | 'CONFIRM_PAYMENT';

export const TODO_LABEL: Record<TodoKind, string> = {
  ANSWER_INVITE: 'Trả lời lời mời',
  ANSWER_OFFER: 'Phản hồi đề xuất giá',
  SUBMIT_DRAFT: 'Nộp bản nháp',
  SUBMIT_POST: 'Đăng bài và gửi link',
  CONFIRM_PRODUCT: 'Xác nhận đã nhận sản phẩm',
  CONFIRM_PAYMENT: 'Xác nhận đã nhận thanh toán',
};

/** Tie-break when deadlines are equal / missing: answer first (offers expire), money last. */
const PRIORITY: Record<TodoKind, number> = {
  ANSWER_INVITE: 0,
  ANSWER_OFFER: 1,
  SUBMIT_DRAFT: 2,
  SUBMIT_POST: 3,
  CONFIRM_PRODUCT: 4,
  CONFIRM_PAYMENT: 5,
};

export interface TodoItem {
  id: string;
  kind: TodoKind;
  label: string;
  bookingId: string;
  campaignName: string;
  brandCompany: string;
  /** Epoch ms (end of the deadline day for calendar dates); undefined = no deadline. */
  dueAt?: number;
  /** Link to the booking's detail on /chien-dich-cua-toi. */
  href: string;
}

type TodoInput = Pick<BookingView, 'id' | 'status' | 'awaiting' | 'payment' | 'allowedActions' | 'expiresAt'> & {
  campaign: Pick<BookingView['campaign'], 'name' | 'brand' | 'endDate' | 'recruitment'>;
};

/** 'YYYY-MM-DD' → end of that local day (epoch ms). */
export function endOfDay(iso: string | undefined): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999).getTime();
}

/** Draft deadline: open recruitment → before posting starts; booking riêng → campaign end. */
function draftDue(b: TodoInput): number | undefined {
  const t = b.campaign.recruitment?.timeline;
  if (t?.postStart) return endOfDay(t.postStart);
  return endOfDay(b.campaign.endDate);
}

/** Post deadline: open recruitment → end of "Đăng bài"; booking riêng → campaign end. */
function postDue(b: TodoInput): number | undefined {
  return endOfDay(b.campaign.recruitment?.timeline.postEnd) ?? endOfDay(b.campaign.endDate);
}

/** Next actions of one booking (a booking may need two, e.g. confirm the product and post the link). */
export function todosOf(b: TodoInput): TodoItem[] {
  const can = (a: BookingView['allowedActions'][number]) => b.allowedActions.includes(a);
  const out: { kind: TodoKind; dueAt?: number }[] = [];
  if (b.awaiting === 'SUPPLIER' && (b.status === 'SENT' || b.status === 'NEGOTIATING')) {
    out.push({ kind: b.status === 'SENT' ? 'ANSWER_INVITE' : 'ANSWER_OFFER', dueAt: b.expiresAt });
  }
  if (can('SUBMIT_DRAFT') && (b.status === 'ACCEPTED' || b.status === 'IN_PRODUCTION')) out.push({ kind: 'SUBMIT_DRAFT', dueAt: draftDue(b) });
  if (can('SUBMIT_POST')) out.push({ kind: 'SUBMIT_POST', dueAt: postDue(b) });
  if (can('CONFIRM_PRODUCT_RECEIVED')) out.push({ kind: 'CONFIRM_PRODUCT' });
  if (can('CONFIRM_PAID')) out.push({ kind: 'CONFIRM_PAYMENT' });
  const href = bookingDetailPath(b.id, tabOf(b));
  return out.map(({ kind, dueAt }) => ({
    id: `${b.id}:${kind}`,
    kind,
    label: TODO_LABEL[kind],
    bookingId: b.id,
    campaignName: b.campaign.name,
    brandCompany: b.campaign.brand.company,
    ...(dueAt !== undefined ? { dueAt } : {}),
    href,
  }));
}

/** Most urgent first: dated items by deadline (overdue first), then undated ones; ties by kind. */
export function compareTodos(a: TodoItem, b: TodoItem): number {
  const da = a.dueAt ?? Infinity;
  const db = b.dueAt ?? Infinity;
  if (da !== db) return da - db;
  return PRIORITY[a.kind] - PRIORITY[b.kind] || a.campaignName.localeCompare(b.campaignName, 'vi');
}

export function deriveTodos(list: TodoInput[]): TodoItem[] {
  return list.flatMap(todosOf).sort(compareTodos);
}

export type DueTone = 'overdue' | 'urgent' | 'normal' | 'none';

/** "Quá hạn 2 ngày" / "Hạn hôm nay" / "Còn 5 giờ" / "Còn 3 ngày" / "Không có hạn"; urgent = ≤ 3 days. */
export function dueText(dueAt: number | undefined, now: number): { text: string; tone: DueTone } {
  if (dueAt === undefined) return { text: 'Không có hạn', tone: 'none' };
  const left = dueAt - now;
  if (left < 0) {
    const d = Math.max(1, Math.floor(-left / DAY));
    return { text: `Quá hạn ${d} ngày`, tone: 'overdue' };
  }
  if (left < DAY) {
    const sameDay = new Date(dueAt).toDateString() === new Date(now).toDateString();
    if (sameDay && new Date(dueAt).getHours() === 23) return { text: 'Hạn hôm nay', tone: 'urgent' };
    return { text: `Còn ${Math.max(1, Math.floor(left / 3_600_000))} giờ`, tone: 'urgent' };
  }
  const d = Math.floor(left / DAY);
  return { text: `Còn ${d} ngày`, tone: d <= 3 ? 'urgent' : 'normal' };
}
