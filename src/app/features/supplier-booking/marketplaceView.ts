// Public view of a campaign on the Sàn (KOLHUB — Nghiệp vụ công bố và hiển thị chiến dịch trên sàn, 15/10/2026):
// status label, deadline with "Sắp hết hạn", reward summary (cash and gift kept apart), "Số KOL cần tuyển" and the
// viewer's channel readiness behind the CTA. Pure helpers, no internal data (budget, application counts).
import {
  rewardKindOf,
  type CampaignReward,
  type Channel,
  type DeliverableGroup,
  type MarketplaceCampaign,
  type OwnerType,
  type Platform,
  type RewardKind,
} from '../../services';
import { channelBadge } from '../../services/mock/directory';
import type { Tone } from '../shared/StatusBadges';
import { formatVnd, formatVndShort } from './supplierBooking';

const HOUR = 3_600_000;
const VN_OFFSET = 7 * HOUR;

type StatusCampaign = Pick<MarketplaceCampaign, 'type' | 'phase' | 'accepting' | 'recruitmentClosed' | 'completed' | 'paused'>;

export type MarketplaceStatus = 'OPEN' | 'UPCOMING' | 'PAUSED' | 'CLOSED' | 'COMPLETED';
export const MARKETPLACE_STATUS: Record<MarketplaceStatus, { label: string; tone: Tone }> = {
  OPEN: { label: 'Đang nhận ứng tuyển', tone: 'success' },
  UPCOMING: { label: 'Sắp mở ứng tuyển', tone: 'neutral' },
  PAUSED: { label: 'Tạm ngừng nhận ứng tuyển', tone: 'warning' },
  CLOSED: { label: 'Đã đóng tuyển', tone: 'neutral' },
  COMPLETED: { label: 'Hoàn tất', tone: 'neutral' },
};

/** Status of the public page (§10), from the campaign status — never from the deadline alone. */
export function marketplaceStatus(c: StatusCampaign): MarketplaceStatus {
  if (c.completed) return 'COMPLETED';
  if (c.recruitmentClosed) return 'CLOSED';
  if (c.paused) return 'PAUSED';
  if (c.type === 'OPEN_RECRUITMENT' && c.phase === 'UPCOMING') return 'UPCOMING';
  return c.accepting === false ? 'CLOSED' : 'OPEN';
}

/** Exact end of applications (ms, Vietnam time): Booking 1 KOL `applyDeadlineAt`; Booking nhiều KOL end of "Ứng tuyển". */
export function deadlineAtOf(c: Pick<MarketplaceCampaign, 'type' | 'applyDeadlineAt' | 'recruitment'>): number | undefined {
  if (c.type === 'OPEN_RECRUITMENT') {
    const end = c.recruitment?.timeline.applyEnd;
    if (!end) return undefined;
    const [y, m, d] = end.split('-').map(Number);
    return Date.UTC(y, m - 1, d, 23, 59) - VN_OFFSET;
  }
  return c.applyDeadlineAt;
}

/** "23:59 · 22/10" in Vietnam time (UTC+7). */
export function vnDeadlineText(at: number, withYear = false): string {
  const d = new Date(at + VN_OFFSET);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} · ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}${withYear ? `/${d.getUTCFullYear()}` : ''}`;
}

export interface DeadlineInfo {
  at: number;
  /** "23:59 · 22/10". */
  text: string;
  /** ≤ 24 h left (§6.2 "Sắp hết hạn"). */
  soon: boolean;
  passed: boolean;
}

export function deadlineInfo(c: Pick<MarketplaceCampaign, 'type' | 'applyDeadlineAt' | 'recruitment'>, now: number, withYear = false): DeadlineInfo | null {
  const at = deadlineAtOf(c);
  if (at === undefined) return null;
  const left = at - now;
  return { at, text: vnDeadlineText(at, withYear), soon: left > 0 && left <= 24 * HOUR, passed: left <= 0 };
}

/** "Cần 1 KOL" / "Cần 6 KOL" — people to choose, not applications or bookings (§9, §16.8). */
export const kolTargetText = (c: Pick<MarketplaceCampaign, 'kolTarget'>) => `Cần ${c.kolTarget} KOL`;

const sameReward = (a: CampaignReward, b: CampaignReward) =>
  a.cash === b.cash && (a.product?.name ?? '') === (b.product?.name ?? '') && (a.product?.value ?? 0) === (b.product?.value ?? 0);

export interface RewardSummary {
  kind?: RewardKind;
  /** "3 triệu ₫/booking" (card) — undefined when no cash or when the groups differ. */
  cash?: string;
  /** Gift / experience name, never stated as money received. */
  product?: string;
  /** Groups pay differently: "Quyền lợi theo hạng mục" (no summed income per KOL, §6.2). */
  byGroup: boolean;
}

/** Card reward: cash per booking and the gift on separate lines; differing groups → "Quyền lợi theo hạng mục". */
export function rewardSummary(c: Pick<MarketplaceCampaign, 'type' | 'groups' | 'recruitment'>, short = true): RewardSummary {
  const kind = rewardKindOf(c);
  const money = short ? formatVndShort : formatVnd;
  const rewards: CampaignReward[] = c.type === 'OPEN_RECRUITMENT' ? (c.recruitment ? [c.recruitment.reward] : []) : c.groups.map((g) => g.reward);
  if (!rewards.length) return { kind, byGroup: false };
  if (rewards.some((r) => !sameReward(r, rewards[0]))) return { kind, byGroup: true };
  const r = rewards[0];
  return { kind, byGroup: false, ...(r.cash > 0 ? { cash: `${money(r.cash)}/booking` } : {}), ...(r.product ? { product: r.product.name } : {}) };
}

/** Detail rows per group: "TikTok: 3.000.000 ₫/booking" + gift on its own line. */
export function groupRewardLines(g: DeliverableGroup): { cash?: string; product?: string } {
  return {
    ...(g.reward.cash > 0 ? { cash: `${formatVnd(g.reward.cash)}/booking` } : {}),
    ...(g.reward.product ? { product: `${g.reward.product.name} (trị giá ${formatVnd(g.reward.product.value)}, quà tặng, không phải tiền)` } : {}),
  };
}

// ---------------------------------------------------------------------------
// CTA theo ngữ cảnh (§8): kênh của người xem
// ---------------------------------------------------------------------------

/**
 * Whether the viewer can apply with a channel on the campaign platforms: READY (verified, active; MCN: assigned to a
 * KOL), else why not — NO_CHANNEL (none on these platforms), EXPIRED (only expired badges), UNVERIFIED (not verified
 * yet), INACTIVE (verified but switched off), UNASSIGNED (MCN: verified channels not assigned to a KOL).
 */
export type ChannelReadiness = 'READY' | 'NO_CHANNEL' | 'UNVERIFIED' | 'EXPIRED' | 'INACTIVE' | 'UNASSIGNED';

export function channelReadiness(channels: Channel[], platforms: Platform[], now: number, supplierType: OwnerType): ChannelReadiness {
  const onPlatform = channels.filter((c) => platforms.includes(c.platform));
  if (!onPlatform.length) return 'NO_CHANNEL';
  const verified = onPlatform.filter((c) => channelBadge(c, now) === 'VERIFIED');
  const usable = verified.filter((c) => c.active);
  if (usable.some((c) => supplierType === 'KOL' || !!c.assignedKolAccountId)) return 'READY';
  if (usable.length) return 'UNASSIGNED';
  if (verified.length) return 'INACTIVE';
  if (onPlatform.some((c) => channelBadge(c, now) === 'EXPIRED')) return 'EXPIRED';
  return 'UNVERIFIED';
}

/** CTA label and hint for a channel that is not ready (§8). */
export const READINESS_CTA: Record<Exclude<ChannelReadiness, 'READY'>, { label: string; hint: string }> = {
  NO_CHANNEL: { label: 'Thêm kênh để ứng tuyển', hint: 'Chiến dịch cần kênh trên nền tảng của chiến dịch. Thêm kênh rồi quay lại đây để ứng tuyển.' },
  UNVERIFIED: { label: 'Xác thực kênh', hint: 'Chỉ kênh đã xác thực (đạt KOL Safety và được duyệt quyền quản lý) mới ứng tuyển được.' },
  EXPIRED: { label: 'Gia hạn kênh', hint: 'Xác thực kênh đã hết hạn. Gia hạn để tiếp tục tham gia chiến dịch bằng kênh này.' },
  INACTIVE: { label: 'Bật kênh để ứng tuyển', hint: 'Kênh đã xác thực đang tắt "Hoạt động". Bật lại để dùng kênh khi ứng tuyển.' },
  UNASSIGNED: { label: 'Gán kênh cho KOL', hint: 'MCN ứng tuyển bằng kênh đã gán cho KOL mình đại diện. Gán kênh rồi quay lại đây.' },
};

/** Query key the channel pages read to show "Quay lại chiến dịch". */
export const RETURN_PARAM = 'quay-lai';

/** Channel management (MCN: KOL assignment) keeping the way back to the campaign. */
export function readinessPath(readiness: Exclude<ChannelReadiness, 'READY'>, ownerType: OwnerType, returnTo: string): string {
  const base = readiness === 'UNASSIGNED' ? '/ho-so-mcn/kol' : ownerType === 'MCN' ? '/ho-so-mcn/kenh' : '/ho-so-kol/kenh';
  const q = new URLSearchParams({ [RETURN_PARAM]: returnTo });
  if (readiness === 'NO_CHANNEL') q.set('them', '1');
  return `${base}?${q.toString()}`;
}

/** Only an in-app Sàn page is a valid way back. */
export function safeCampaignReturn(v: string | null): string | null {
  return v && /^\/san\/[\w-]+$/.test(v) ? v : null;
}

