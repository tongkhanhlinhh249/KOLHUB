import type { BookingStatus, DemoAccountKey, DemoStep, ProfileStatus } from '../services';

/** Role of a demo account (the guest is its own role). */
export type DemoRole = 'guest' | 'kol' | 'mcn' | 'biz';
/** Roles that have their own section in the demo panel. */
export type RoleTab = Exclude<DemoRole, 'guest'>;

/** Blocks of the role section, in order. */
export type DemoBlock = 'hint' | 'profile' | 'campaign';

export const ROLE_SECTION_LABEL: Record<RoleTab, string> = { biz: 'Nhãn hàng', kol: 'KOL', mcn: 'MCN' };

export function roleOfAccount(key: DemoAccountKey | undefined): DemoRole {
  if (!key || key === 'guest') return 'guest';
  return key.split('-')[0] as DemoRole;
}

/** The current role's section only: brand → campaign states; KOL/MCN → profile + campaign states; guest → a hint. */
export function sectionsFor(role: DemoRole): DemoBlock[] {
  switch (role) {
    case 'biz':
      return ['campaign'];
    case 'kol':
    case 'mcn':
      return ['profile', 'campaign'];
    default:
      return ['hint'];
  }
}

/** Collapsed tools at the bottom of the panel, closed by default, for every role. */
export const COLLAPSED_SECTIONS = [
  { id: 'admin', label: 'Admin' },
  { id: 'system', label: 'Hệ thống' },
] as const;

export const ROLE_ACCOUNTS: Record<RoleTab, { fresh: Exclude<DemoAccountKey, 'guest'>; verified: Exclude<DemoAccountKey, 'guest'> }> = {
  biz: { fresh: 'biz-new', verified: 'biz-verified' },
  kol: { fresh: 'kol-new', verified: 'kol-verified' },
  mcn: { fresh: 'mcn-new', verified: 'mcn-verified' },
};

/** eKYC result picker: KOL only (MCN has no eKYC step). */
export const showsEkyc = (role: DemoRole) => role === 'kol';

/** Short profile state for the "Hồ sơ: …" badge. */
export const PROFILE_STATE_LABEL: Record<ProfileStatus, string> = {
  DRAFT: 'Chưa gửi',
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã xác thực',
  NEEDS_FIX: 'Cần bổ sung',
  REJECTED: 'Bị từ chối',
};

export type ProfileAction = 'fill' | 'submit' | 'approve' | 'requestFix' | 'reject' | 'useFresh';

/**
 * Next-state buttons of the profile section: draft → fill / submit; submitted → approve / request more / reject
 * (Admin shortcuts); approved or rejected → switch to the new sample profile (unless already on it).
 */
export function profileActions(status: ProfileStatus | undefined, onFresh: boolean): ProfileAction[] {
  switch (status) {
    case 'DRAFT':
    case 'NEEDS_FIX':
      return ['fill', 'submit'];
    case 'SUBMITTED':
      return ['approve', 'requestFix', 'reject'];
    case 'APPROVED':
    case 'REJECTED':
      return onFresh ? [] : ['useFresh'];
    default:
      return [];
  }
}

export type CampaignSide = 'BRAND' | 'SUPPLIER';

/** Plain button text of a step: the verb or the result only. */
export function stepLabel(step: DemoStep, ctx: { status: BookingStatus; price: number; recruit: boolean }): string {
  switch (step.key) {
    case 'SUPPLIER_ACCEPT':
      return 'Chấp nhận';
    case 'SUPPLIER_COUNTER':
      return ctx.price > 0 ? 'Trả giá' : 'Báo giá';
    case 'BRAND_ACCEPT':
      return ctx.status === 'APPLIED' ? 'Nhận ứng viên' : 'Chốt giá';
    case 'BRAND_COUNTER':
      return 'Trả giá';
    case 'DECLINE':
      return ctx.recruit && step.actor === 'BRAND' && ctx.status === 'APPLIED' ? 'Loại' : 'Từ chối';
    case 'EXPIRE':
      return 'Cho hết hạn';
    case 'SUBMIT_DRAFT':
      return 'Nộp nháp';
    case 'APPROVE_CONTENT':
      return 'Duyệt nháp';
    case 'REQUEST_CHANGES':
      return 'Yêu cầu sửa';
    case 'SUBMIT_POST':
      return 'Đăng bài';
    case 'MARK_PAID':
      return ctx.price > 0 ? 'Đánh dấu đã trả' : 'Hoàn tất';
    case 'CONFIRM_PAID':
      return 'Đã nhận tiền';
    case 'RATE':
      return 'Đánh giá 5 sao';
    case 'SELECT':
      return 'Chọn';
    case 'PRODUCT_SENT':
      return 'Gửi sản phẩm';
    case 'PRODUCT_RECEIVED':
      return 'Đã nhận hàng';
  }
}

export interface OrderedStep {
  step: DemoStep;
  primary: boolean;
  /** Set when the step belongs to the other side ("Nhãn hàng" / "KOL" / "MCN"). */
  other?: 'BRAND' | 'SUPPLIER';
}

/** A booking's steps in one flat list: the section's own side first, then the other side, then system steps. */
export function orderSteps(steps: { primary?: DemoStep; secondary: DemoStep[] }, first: CampaignSide): OrderedStep[] {
  const all = [...(steps.primary ? [steps.primary] : []), ...steps.secondary];
  const rank = (s: DemoStep) => (s.actor === first ? 0 : s.actor === 'SYSTEM' ? 2 : 1);
  return all
    .map((step, i) => ({ step, i }))
    .sort((a, b) => rank(a.step) - rank(b.step) || a.i - b.i)
    .map(({ step }) => ({
      step,
      primary: step === steps.primary,
      ...(step.actor !== first && step.actor !== 'SYSTEM' ? { other: step.actor } : {}),
    }));
}
