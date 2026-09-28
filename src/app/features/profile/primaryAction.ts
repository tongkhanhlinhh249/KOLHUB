import type { ChecklistItem, EkycStatus, OwnerType, ProfileStatus } from '../../services';

export type ProfileSection = 'tong-quan' | 'lien-he' | 'dinh-danh' | 'kenh';

/** Sidebar order; `tong-quan` ("Gửi hồ sơ xác thực") is the profile area's landing page. */
export const PROFILE_SECTIONS: readonly ProfileSection[] = ['tong-quan', 'lien-he', 'dinh-danh', 'kenh'];

/** Landing section of /ho-so-kol and /ho-so-mcn (and the KOL/MCN role home). */
export const DEFAULT_PROFILE_SECTION: ProfileSection = 'tong-quan';

export const isProfileSection = (v: string | null | undefined): v is ProfileSection =>
  PROFILE_SECTIONS.includes(v as ProfileSection);

/** Base route of the profile area for each owner type (sections live at `${base}/${section}`). */
export function profileBase(ownerType: OwnerType): string {
  return ownerType === 'KOL' ? '/ho-so-kol' : '/ho-so-mcn';
}

/** Route of one profile section; `openAddChannel` adds ?them=1 so the channels page opens its add sheet. */
export function profilePath(ownerType: OwnerType, section: ProfileSection, opts?: { openAddChannel?: boolean }): string {
  const path = `${profileBase(ownerType)}/${section}`;
  return opts?.openAddChannel && section === 'kenh' ? `${path}?them=1` : path;
}

export interface PrimaryActionInput {
  ownerType: OwnerType;
  status: ProfileStatus;
  ekycStatus?: EkycStatus;
  /** Every item of ProfileView.checklist is ok. */
  eligible: boolean;
  hasNeedsFixChannel: boolean;
}

export interface PrimaryAction {
  label: string;
  /** Route the button navigates to (null when disabled). */
  to: string | null;
  disabled: boolean;
}

/** Main button of the profile header (SCR-03) for each profile state. */
export function primaryAction(input: PrimaryActionInput): PrimaryAction | null {
  const go = (label: string, section: ProfileSection, openAddChannel = false): PrimaryAction => ({
    label,
    to: profilePath(input.ownerType, section, { openAddChannel }),
    disabled: false,
  });
  switch (input.status) {
    case 'DRAFT':
      if (input.ownerType === 'KOL') {
        if (input.ekycStatus !== 'PASSED') return go('Xác thực danh tính', 'dinh-danh');
        return input.eligible ? go('Gửi xét duyệt', 'tong-quan') : go('Hoàn thiện hồ sơ', 'dinh-danh');
      }
      return input.eligible ? go('Gửi xét duyệt', 'tong-quan') : go('Xác thực tổ chức', 'dinh-danh');
    case 'SUBMITTED':
      return { label: 'Đang xét duyệt', to: null, disabled: true };
    case 'NEEDS_FIX':
      return go('Xem yêu cầu bổ sung', input.hasNeedsFixChannel ? 'kenh' : 'dinh-danh');
    case 'APPROVED':
      return go('Thêm kênh', 'kenh', true);
    case 'REJECTED':
      return null;
  }
}

export type MilestoneKey = 'contact' | 'staff' | 'identity' | 'channel' | 'submitted';

const MILESTONE_SECTION: Record<MilestoneKey, ProfileSection> = {
  contact: 'lien-he',
  staff: 'lien-he',
  identity: 'dinh-danh',
  channel: 'kenh',
  submitted: 'tong-quan',
};

/** Short badge label and the sub-route where a completeness milestone gets done. */
export function milestoneBadge(ownerType: OwnerType, key: MilestoneKey): { label: string; to: string } {
  const labels: Record<MilestoneKey, string> = {
    contact: 'Liên hệ',
    staff: 'Nhân sự',
    identity: ownerType === 'KOL' ? 'eKYC' : 'GCN ĐKDN',
    channel: 'Kênh & ảnh',
    submitted: 'Gửi xét duyệt',
  };
  return { label: labels[key], to: profilePath(ownerType, MILESTONE_SECTION[key]) };
}

export type ChecklistKey = ChecklistItem['key'];

const CHECKLIST_SECTION: Partial<Record<ChecklistKey, ProfileSection>> = {
  ekyc: 'dinh-danh',
  org: 'dinh-danh',
  gcn: 'dinh-danh',
  contact: 'lien-he',
  staff: 'lien-he',
  channel: 'kenh',
};

/** Page where an unmet submit condition gets fixed (pledges are ticked in place → undefined). */
export function checklistLink(ownerType: OwnerType, key: ChecklistKey): string | undefined {
  const section = CHECKLIST_SECTION[key];
  return section ? profilePath(ownerType, section) : undefined;
}
