// Pure helpers shared by the Brand, Sàn and KOL/MCN screens for "Tuyển nhiều KOL" (open recruitment):
// phase badge (D-n), reward / region / workflow wording, the 4-milestone timeline and the applicant's stage.
import {
  daysTo,
  RECRUIT_MILESTONES,
  TARGET_GENDER_LABEL,
  type BookingStatus,
  type CampaignReward,
  type CampaignTarget,
  type CampaignType,
  type RecruitmentTimeline,
  type RecruitMilestone,
  type RecruitPhase,
} from '../../services';
import type { Tone } from './StatusBadges';

const group = (n: number) => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const vnd = (n: number) => `${group(n)} ₫`;

/** 2500000 → "2,5 triệu ₫"; below 1 triệu → "450.000 ₫". */
export function vndShort(n: number): string {
  const v = Math.max(0, Math.round(n));
  const unit = v >= 1_000_000_000 ? { d: 1_000_000_000, w: 'tỷ' } : v >= 1_000_000 ? { d: 1_000_000, w: 'triệu' } : null;
  if (!unit) return vnd(v);
  return `${String(Math.round((v / unit.d) * 100) / 100).replace('.', ',')} ${unit.w} ₫`;
}

// ---------------------------------------------------------------------------
// Phase badge
// ---------------------------------------------------------------------------

export interface PhaseBadge {
  text: string;
  tone: Tone;
  /** Countdown of ≤ 3 days. */
  urgent: boolean;
  /** Screen-reader text ("Còn 5 ngày nhận ứng tuyển"). */
  label: string;
}

/**
 * Card badge. Open recruitment: "D-n" until the end of "Ứng tuyển" ("D-Day" on the last day), then "Tuyển chọn",
 * "Đang đăng bài", "Đang đánh giá", "Đã kết thúc" ("Sắp mở" before it starts). Booking riêng: "D-n" until the apply
 * deadline, "Đang nhận đề xuất" without one, "Đã đóng" once passed.
 */
export function phaseBadge(
  c: { type: CampaignType; phase?: RecruitPhase; recruitment?: { timeline: RecruitmentTimeline }; applyDeadline?: string },
  now: number,
): PhaseBadge {
  const countdown = (iso: string, what: string): PhaseBadge => {
    const n = daysTo(iso, now);
    if (n < 0) return { text: 'Đã đóng', tone: 'neutral', urgent: false, label: `Đã hết hạn ${what}` };
    return { text: n === 0 ? 'D-Day' : `D-${n}`, tone: n <= 3 ? 'warning' : 'info', urgent: n <= 3, label: n === 0 ? `Hôm nay là ngày cuối ${what}` : `Còn ${n} ngày ${what}` };
  };
  if (c.type === 'OPEN_RECRUITMENT' && c.recruitment) {
    switch (c.phase) {
      case 'UPCOMING':
        return { text: 'Sắp mở', tone: 'neutral', urgent: false, label: 'Chưa mở ứng tuyển' };
      case 'APPLY':
        return countdown(c.recruitment.timeline.applyEnd, 'nhận ứng tuyển');
      case 'SELECT':
        return { text: 'Tuyển chọn', tone: 'warning', urgent: false, label: 'Nhãn hàng đang chọn KOL' };
      case 'POST':
        return { text: 'Đang đăng bài', tone: 'success', urgent: false, label: 'KOL đang đăng bài' };
      case 'REVIEW':
        return { text: 'Đang đánh giá', tone: 'info', urgent: false, label: 'Đang đánh giá kết quả' };
      default:
        return { text: 'Đã kết thúc', tone: 'neutral', urgent: false, label: 'Chiến dịch đã kết thúc' };
    }
  }
  if (c.applyDeadline) return countdown(c.applyDeadline, 'nhận đề xuất');
  return { text: 'Đang nhận đề xuất', tone: 'info', urgent: false, label: 'Đang nhận đề xuất, không giới hạn hạn chót' };
}

// ---------------------------------------------------------------------------
// Reward, region, workflow, conditions
// ---------------------------------------------------------------------------

/** Value of one KOL's reward (cash + product value). */
export const rewardTotal = (r: CampaignReward) => r.cash + (r.product?.value ?? 0);

/** "3.000.000 ₫ + Máy làm sữa hạt mini (trị giá 2.500.000 ₫)" / "Máy… (trị giá …)" / "3.000.000 ₫". */
export function rewardText(r: CampaignReward): string {
  const parts: string[] = [];
  if (r.cash > 0) parts.push(vnd(r.cash));
  if (r.product) parts.push(`${r.product.name} (trị giá ${vnd(r.product.value)})`);
  return parts.join(' + ') || 'Chưa đặt phần thưởng';
}

/** Card line: "3 triệu ₫ + quà 2,5 triệu ₫" / "Quà 450.000 ₫" / "25 triệu ₫". */
export function rewardShort(r: CampaignReward): string {
  const parts: string[] = [];
  if (r.cash > 0) parts.push(vndShort(r.cash));
  if (r.product) parts.push(`${parts.length ? 'quà' : 'Quà'} ${vndShort(r.product.value)}`);
  return parts.join(' + ') || '—';
}

/** "Toàn quốc" / "Hà Nội, TP. Hồ Chí Minh" / "Hà Nội, Huế +2". */
export function regionText(regions: string[] | undefined, max = 2): string {
  const list = regions ?? [];
  if (list.length === 0) return 'Toàn quốc';
  const shown = list.slice(0, max).join(', ');
  return list.length > max ? `${shown} +${list.length - max}` : shown;
}

/** "Workflow" value on cards and details. */
/** "Thương lượng giá" (Booking riêng): "Có thương lượng" / "Giá cố định" ("Đàm phán" on / off). */
export const priceRuleLabel = (negotiation: boolean) => (negotiation ? 'Có thương lượng' : 'Giá cố định');
/** "Hợp đồng": apply terms + contract file on bookings ("Hợp đồng" feature on / off). */
export const contractLabel = (contract: boolean) => (contract ? 'Có (điều khoản + tệp hợp đồng)' : 'Không dùng hợp đồng');
export const workflowLabel = (draftReview: boolean) => (draftReview ? 'Duyệt nháp' : 'Đăng trực tiếp');
export const workflowHint = (draftReview: boolean) =>
  draftReview
    ? 'KOL gửi bản nháp để Nhãn hàng duyệt (kèm kiểm tra KOL Safety) trước khi đăng.'
    : 'KOL đăng bài trực tiếp theo yêu cầu rồi gửi link; không cần gửi bản nháp.';

const compact = (n: number) => (n >= 1_000_000 ? `${String(Math.round(n / 100_000) / 10).replace('.', ',')}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n));

/** "Điều kiện tham gia" rows (label → value); categories empty = "Không giới hạn". */
export function targetRows(target: CampaignTarget | undefined, categories: string[]): { label: string; value: string }[] {
  const t = target ?? {};
  const age =
    t.ageMin !== undefined && t.ageMax !== undefined
      ? `${t.ageMin}–${t.ageMax} tuổi`
      : t.ageMin !== undefined
        ? `Từ ${t.ageMin} tuổi`
        : t.ageMax !== undefined
          ? `Đến ${t.ageMax} tuổi`
          : 'Không giới hạn';
  return [
    { label: 'Độ tuổi', value: age },
    { label: 'Giới tính', value: TARGET_GENDER_LABEL[t.gender ?? 'ANY'] },
    { label: 'Người theo dõi tối thiểu', value: t.minFollowers ? `${compact(t.minFollowers)} người theo dõi` : 'Không yêu cầu' },
    { label: 'Lĩnh vực', value: categories.length ? categories.join(', ') : 'Không giới hạn' },
  ];
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface MilestoneRow {
  key: RecruitMilestone;
  label: string;
  /** "01/10 – 05/10". */
  range: string;
  state: 'done' | 'current' | 'upcoming';
}

const dm = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');

/** The 4 milestones with the current one highlighted (all done once ENDED; none current while UPCOMING). */
export function milestoneRows(t: RecruitmentTimeline, phase: RecruitPhase | undefined): MilestoneRow[] {
  const order = RECRUIT_MILESTONES.map((m) => m.key);
  const cur = phase === 'ENDED' ? order.length : phase && phase !== 'UPCOMING' ? order.indexOf(phase) : -1;
  return RECRUIT_MILESTONES.map((m, i) => ({
    key: m.key,
    label: m.label,
    range: `${dm(t[m.start])} – ${dm(t[m.end])}`,
    state: i < cur ? 'done' : i === cur ? 'current' : 'upcoming',
  }));
}

// ---------------------------------------------------------------------------
// The applicant's stage (KOL/MCN side)
// ---------------------------------------------------------------------------

export type RecruitStage = 'APPLIED' | 'SELECTED' | 'WORKING' | 'DONE' | 'NOT_SELECTED' | 'WITHDRAWN' | 'CANCELLED';
export const RECRUIT_STAGE_LABEL: Record<RecruitStage, string> = {
  APPLIED: 'Đã ứng tuyển',
  SELECTED: 'Đã được chọn',
  WORKING: 'Đang thực hiện',
  DONE: 'Hoàn tất',
  NOT_SELECTED: 'Không được chọn',
  WITHDRAWN: 'Đã rút ứng tuyển',
  CANCELLED: 'Đã huỷ',
};
/** The happy path shown as a stepper. */
export const RECRUIT_STAGE_STEPS: RecruitStage[] = ['APPLIED', 'SELECTED', 'WORKING', 'DONE'];

/**
 * Đã ứng tuyển → Đã được chọn (ACCEPTED, nothing delivered yet) → Đang thực hiện (content / post / payment)
 * → Hoàn tất; or Không được chọn (declined / not picked in time) / Đã rút ứng tuyển (withdrawn before being picked) /
 * Đã huỷ (cancelled after being picked).
 */
export function recruitStage(b: { status: BookingStatus; acceptedAt?: number }): RecruitStage {
  switch (b.status) {
    case 'SENT':
    case 'APPLIED':
    case 'NEGOTIATING':
      return 'APPLIED';
    case 'ACCEPTED':
      return 'SELECTED';
    case 'COMPLETED':
      return 'DONE';
    case 'DECLINED':
    case 'EXPIRED':
      return 'NOT_SELECTED';
    case 'CANCELLED':
      return b.acceptedAt ? 'CANCELLED' : 'WITHDRAWN';
    default:
      return 'WORKING';
  }
}

export function recruitStageTone(s: RecruitStage): Tone {
  if (s === 'NOT_SELECTED') return 'error';
  if (s === 'WITHDRAWN' || s === 'CANCELLED') return 'neutral';
  if (s === 'SELECTED' || s === 'DONE') return 'success';
  return s === 'WORKING' ? 'warning' : 'info';
}
