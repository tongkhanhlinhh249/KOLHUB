import type { EkycStatus, OwnerType, ProfileStatus } from '../../services';

export type ProfileTab = 'lien-he' | 'dinh-danh' | 'kenh';

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
  tab: ProfileTab | null;
  disabled: boolean;
}

/** Main button of the profile header (SCR-03) for each profile state. */
export function primaryAction(input: PrimaryActionInput): PrimaryAction | null {
  const go = (label: string, tab: ProfileTab): PrimaryAction => ({ label, tab, disabled: false });
  switch (input.status) {
    case 'DRAFT':
      if (input.ownerType === 'KOL') {
        if (input.ekycStatus !== 'PASSED') return go('Xác thực danh tính', 'dinh-danh');
        return input.eligible ? go('Gửi xét duyệt', 'dinh-danh') : go('Hoàn thiện hồ sơ', 'dinh-danh');
      }
      return input.eligible ? go('Gửi xét duyệt', 'dinh-danh') : go('Xác thực tổ chức', 'dinh-danh');
    case 'SUBMITTED':
      return { label: 'Đang xét duyệt', tab: null, disabled: true };
    case 'NEEDS_FIX':
      return go('Xem yêu cầu bổ sung', input.hasNeedsFixChannel ? 'kenh' : 'dinh-danh');
    case 'APPROVED':
      return go('Thêm kênh', 'kenh');
    case 'REJECTED':
      return null;
  }
}
