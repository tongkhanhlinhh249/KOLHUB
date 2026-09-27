import type { EkycStatus, OwnerType, ProfileStatus } from '../../services';

export type ProfileSection = 'lien-he' | 'dinh-danh' | 'kenh';

export const PROFILE_SECTIONS: readonly ProfileSection[] = ['lien-he', 'dinh-danh', 'kenh'];

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
        return input.eligible ? go('Gửi xét duyệt', 'dinh-danh') : go('Hoàn thiện hồ sơ', 'dinh-danh');
      }
      return input.eligible ? go('Gửi xét duyệt', 'dinh-danh') : go('Xác thực tổ chức', 'dinh-danh');
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
