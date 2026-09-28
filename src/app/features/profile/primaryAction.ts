import type { ChecklistItem, OwnerType, ProfileStatus } from '../../services';

export type ProfileSection = 'tong-quan' | 'thong-tin' | 'kenh';

/**
 * Sidebar order; `tong-quan` ("Gửi hồ sơ xác thực") is the profile area's landing page and `thong-tin`
 * ("Thông tin hồ sơ") holds identity, contact and content staff on one page.
 */
export const PROFILE_SECTIONS: readonly ProfileSection[] = ['tong-quan', 'thong-tin', 'kenh'];

/** Blocks of "Thông tin hồ sơ" (element ids, deep-linked as `${base}/thong-tin#…`), top to bottom. */
export type ProfileAnchor = 'dinh-danh' | 'lien-he' | 'nhan-su';
export const PROFILE_ANCHORS: readonly ProfileAnchor[] = ['dinh-danh', 'lien-he', 'nhan-su'];

export const isProfileAnchor = (v: string | null | undefined): v is ProfileAnchor =>
  PROFILE_ANCHORS.includes(v as ProfileAnchor);

/** Former sections merged into "Thông tin hồ sơ": old routes and ?tab= values land on their block. */
export const LEGACY_SECTION_ANCHOR: Readonly<Record<'lien-he' | 'dinh-danh', ProfileAnchor>> = {
  'lien-he': 'lien-he',
  'dinh-danh': 'dinh-danh',
};

/** Landing section of /ho-so-kol and /ho-so-mcn (and the KOL/MCN role home). */
export const DEFAULT_PROFILE_SECTION: ProfileSection = 'tong-quan';

export const isProfileSection = (v: string | null | undefined): v is ProfileSection =>
  PROFILE_SECTIONS.includes(v as ProfileSection);

/** Base route of the profile area for each owner type (sections live at `${base}/${section}`). */
export function profileBase(ownerType: OwnerType): string {
  return ownerType === 'KOL' ? '/ho-so-kol' : '/ho-so-mcn';
}

/**
 * Route of one profile section; `openAddChannel` adds ?them=1 so the channels page opens its add sheet,
 * `anchor` adds #… to scroll to one block of "Thông tin hồ sơ".
 */
export function profilePath(
  ownerType: OwnerType,
  section: ProfileSection,
  opts?: { openAddChannel?: boolean; anchor?: ProfileAnchor },
): string {
  const path = `${profileBase(ownerType)}/${section}`;
  if (opts?.openAddChannel && section === 'kenh') return `${path}?them=1`;
  if (opts?.anchor && section === 'thong-tin') return `${path}#${opts.anchor}`;
  return path;
}

/** "Thông tin hồ sơ" scrolled to one of its blocks. */
export function infoPath(ownerType: OwnerType, anchor: ProfileAnchor): string {
  return profilePath(ownerType, 'thong-tin', { anchor });
}

/**
 * Target of a legacy `?tab=` value (or old sub-route name): current sections as is, `lien-he`/`dinh-danh`
 * to their block of "Thông tin hồ sơ", anything else to the landing page.
 */
export function legacySectionPath(ownerType: OwnerType, tab: string | null | undefined, opts?: { openAddChannel?: boolean }): string {
  if (tab === 'lien-he' || tab === 'dinh-danh') return infoPath(ownerType, LEGACY_SECTION_ANCHOR[tab]);
  return profilePath(ownerType, isProfileSection(tab) ? tab : DEFAULT_PROFILE_SECTION, opts);
}

export interface PrimaryActionInput {
  ownerType: OwnerType;
  status: ProfileStatus;
  /** First unmet REQUIRED item of ProfileView.checklist (undefined = ready to submit). */
  firstMissing?: ChecklistKey;
  hasNeedsFixChannel: boolean;
}

/** DRAFT header button: the next required step, in checklist order. */
function nextStep(ownerType: OwnerType, key: ChecklistKey): PrimaryAction {
  const to = (path: string, label: string): PrimaryAction => ({ label, to: path, disabled: false });
  switch (key) {
    case 'ekyc':
      return to(infoPath(ownerType, 'dinh-danh'), 'Xác thực danh tính');
    case 'org':
    case 'gcn':
      return to(infoPath(ownerType, 'dinh-danh'), 'Xác thực tổ chức');
    case 'contact':
      return to(infoPath(ownerType, 'lien-he'), 'Bổ sung liên hệ');
    case 'staff':
      return to(infoPath(ownerType, 'nhan-su'), 'Bổ sung nhân sự');
    case 'channel':
      return to(profilePath(ownerType, 'kenh', { openAddChannel: true }), 'Thêm kênh');
    case 'kols':
      return to(mcnKolsPath({ openAssign: true }), 'Gán kênh cho KOL');
    case 'pledges':
      return to(profilePath(ownerType, 'tong-quan'), 'Gửi xét duyệt');
  }
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
  const identity = (label: string): PrimaryAction => ({ label, to: infoPath(input.ownerType, 'dinh-danh'), disabled: false });
  switch (input.status) {
    case 'DRAFT':
      return input.firstMissing ? nextStep(input.ownerType, input.firstMissing) : go('Gửi xét duyệt', 'tong-quan');
    case 'SUBMITTED':
      return { label: 'Đang xét duyệt', to: null, disabled: true };
    case 'NEEDS_FIX':
      return input.hasNeedsFixChannel ? go('Xem yêu cầu bổ sung', 'kenh') : identity('Xem yêu cầu bổ sung');
    case 'APPROVED':
      return go('Thêm kênh', 'kenh', true);
    case 'REJECTED':
      return null;
  }
}

export type MilestoneKey = 'contact' | 'staff' | 'identity' | 'channel' | 'submitted';

/** MCN "Quản lý KOL" (assign channels to KOLs); `openAssign` adds ?gan=1 so the page opens its assign dialog. */
export function mcnKolsPath(opts?: { openAssign?: boolean }): string {
  return `${profileBase('MCN')}/kol${opts?.openAssign ? '?gan=1' : ''}`;
}

/** Where each milestone / submit condition gets done: a block of "Thông tin hồ sơ", a section or (MCN) "Quản lý KOL". */
type Target = ProfileAnchor | Exclude<ProfileSection, 'thong-tin'> | 'kol';

function targetPath(ownerType: OwnerType, t: Target): string {
  if (t === 'kol') return mcnKolsPath();
  return isProfileAnchor(t) ? infoPath(ownerType, t) : profilePath(ownerType, t);
}

const MILESTONE_TARGET: Record<MilestoneKey, Target> = {
  contact: 'lien-he',
  staff: 'nhan-su',
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
  return { label: labels[key], to: targetPath(ownerType, MILESTONE_TARGET[key]) };
}

export type ChecklistKey = ChecklistItem['key'];

const CHECKLIST_TARGET: Partial<Record<ChecklistKey, Target>> = {
  ekyc: 'dinh-danh',
  org: 'dinh-danh',
  gcn: 'dinh-danh',
  contact: 'lien-he',
  staff: 'nhan-su',
  channel: 'kenh',
  kols: 'kol',
};

/** Page where an unmet submit condition gets fixed (pledges are ticked in place → undefined). */
export function checklistLink(ownerType: OwnerType, key: ChecklistKey): string | undefined {
  const target = CHECKLIST_TARGET[key];
  return target ? targetPath(ownerType, target) : undefined;
}
