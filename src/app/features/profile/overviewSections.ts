// "Tình trạng hồ sơ" on "Tổng quan hồ sơ": one summary card per tab of the profile area, built from the
// same BR-64/65 checklist (ProfileView.checklist = submitChecklist) that guards submit, so the cards'
// "Đã đủ / Còn thiếu N" and the submit button can never disagree. Recommended items
// (ProfileView.recommendations, e.g. MCN staff / channels / KOL assignment) are listed too but never block.
import {
  missingContactFields,
  missingOrgFields,
  type Channel,
  type ChecklistItem,
  type ContactInfo,
  type EkycStatus,
  type EkycView,
  type McnKolRow,
  type OrgIdentity,
  type OwnerType,
  type Platform,
  type ProfileView,
} from '../../services';
import { countByStatus, type ChannelStatusFilter } from '../channels/channelQuery';
import { checklistLink, mcnKolsPath, profilePath } from './primaryAction';

export type OverviewSectionKey = 'thong-tin' | 'kenh' | 'kol';
export type OverviewItemKey = Exclude<ChecklistItem['key'], 'pledges'>;

export interface OverviewItem {
  key: OverviewItemKey;
  label: string;
  /** Straight from the submit checklist (required) or the recommendations. */
  ok: boolean;
  /** Required to submit; false = "Khuyến nghị" (shown, never blocks). */
  required: boolean;
  detail?: string;
  /** Where the item is viewed / fixed. */
  to: string;
}

export interface OverviewSection {
  key: OverviewSectionKey;
  title: string;
  /** Element id of the card (the submit card scrolls to the first incomplete one). */
  anchorId: string;
  to: string;
  linkLabel: string;
  items: OverviewItem[];
  /** Unmet required items. */
  missing: number;
  /** Unmet recommended items. */
  suggestions: number;
  /** Every required item is met (recommendations may remain). */
  complete: boolean;
}

export const OVERVIEW_ANCHOR: Readonly<Record<OverviewSectionKey, string>> = {
  'thong-tin': 'tong-quan-thong-tin',
  kenh: 'tong-quan-kenh',
  kol: 'tong-quan-kol',
};

const SECTION_OF: Record<OverviewItemKey, OverviewSectionKey> = {
  ekyc: 'thong-tin',
  org: 'thong-tin',
  gcn: 'thong-tin',
  contact: 'thong-tin',
  staff: 'thong-tin',
  channel: 'kenh',
  kols: 'kol',
};

/** Row order inside a card. */
const ITEM_ORDER: OverviewItemKey[] = ['ekyc', 'org', 'gcn', 'contact', 'staff', 'channel', 'kols'];

const ITEM_LABEL: Record<OverviewItemKey, string> = {
  ekyc: 'Định danh (eKYC)',
  org: 'Định danh tổ chức',
  gcn: 'Giấy chứng nhận ĐKDN',
  contact: 'Liên hệ',
  staff: 'Nhân sự quản lý nội dung',
  channel: 'Có ít nhất 1 kênh hoạt động kèm ảnh',
  kols: 'Có ít nhất 1 KOL được gán kênh',
};

type RequiredContactKey = 'displayName' | 'phone' | 'email' | 'province' | 'address' | 'category';

function contactLabel(ownerType: OwnerType, k: keyof ContactInfo): string {
  const labels: Record<RequiredContactKey, string> = {
    displayName: ownerType === 'KOL' ? 'Họ tên KOL/KOC' : 'Tên hiển thị',
    phone: 'Số điện thoại',
    email: 'Email',
    province: 'Tỉnh/Thành phố',
    address: 'Địa chỉ',
    category: ownerType === 'KOL' ? 'Lĩnh vực chính' : 'Lĩnh vực',
  };
  return labels[k as RequiredContactKey] ?? String(k);
}

const ORG_LABEL: Record<keyof OrgIdentity, string> = {
  orgName: 'Tên tổ chức',
  regNo: 'Mã số doanh nghiệp',
  regDate: 'Ngày cấp',
  regBy: 'Nơi cấp',
  legalRep: 'Người đại diện',
};

const EKYC_PENDING: Record<Exclude<EkycStatus, 'PASSED'>, string> = {
  NOT_STARTED: 'Chưa xác thực danh tính',
  OCR_PASSED: 'Đã chụp giấy tờ, còn bước xác thực khuôn mặt',
  MANUAL_REVIEW: 'Yêu cầu xem xét họ tên đang chờ xử lý',
  REPORTED: 'Báo cáo mạo danh đang chờ xử lý',
};

const missingText = (n: number, names: string[]) => `Thiếu ${n} trường bắt buộc: ${names.join(', ')}`;

export interface ChannelStats {
  total: number;
  byStatus: Record<ChannelStatusFilter, number>;
  /** Switched off ("Đang tắt"). */
  off: number;
  /** Active with proof image (the submit condition). */
  activeWithProof: number;
  /** Distinct platforms, first-seen order. */
  platforms: Platform[];
}

export function channelStats(channels: Channel[], now: number): ChannelStats {
  const platforms: Platform[] = [];
  for (const c of channels) if (!platforms.includes(c.platform)) platforms.push(c.platform);
  return {
    total: channels.length,
    byStatus: countByStatus(channels, now),
    off: channels.filter((c) => !c.active).length,
    activeWithProof: channels.filter((c) => c.active && !!c.proofImage).length,
    platforms,
  };
}

export interface KolStats {
  /** KOLs holding ≥ 1 channel of the MCN. */
  kolCount: number;
  /** MCN channels assigned to a KOL. */
  assigned: number;
  /** "Kênh riêng MCN". */
  own: number;
  /** First KOLs of the list (most recently assigned first). */
  preview: McnKolRow[];
}

export const KOL_PREVIEW_LIMIT = 4;

export function kolStats(channels: Channel[], kols: McnKolRow[]): KolStats {
  const assigned = kols.reduce((n, k) => n + k.assignedChannelCount, 0);
  return { kolCount: kols.length, assigned, own: channels.length - assigned, preview: kols.slice(0, KOL_PREVIEW_LIMIT) };
}

export interface OverviewInput {
  view: ProfileView;
  ekyc?: EkycView;
  channels: Channel[];
  /** MCN only: KOLs holding its channels (mcnKolService.listKols). */
  kols?: McnKolRow[];
}

function itemDetail(key: OverviewItemKey, ok: boolean, { view, ekyc, channels, kols = [] }: OverviewInput): string {
  const { profile } = view;
  switch (key) {
    case 'ekyc': {
      if (profile.ownerType !== 'KOL') return '';
      const status = ekyc?.status ?? profile.ekycStatus;
      if (status !== 'PASSED') return EKYC_PENDING[status];
      const id = ekyc?.identity;
      return id ? `${id.fullName} · Số giấy tờ ${id.idNoMasked}` : 'Đã xác thực danh tính';
    }
    case 'org': {
      if (profile.ownerType !== 'MCN') return '';
      if (ok) return `${profile.org.orgName} · MST ${profile.org.regNo}`;
      const miss = missingOrgFields(profile.org);
      return missingText(miss.length, miss.map((k) => ORG_LABEL[k]));
    }
    case 'gcn':
      return profile.ownerType === 'MCN' && profile.gcnFile ? `Đã tải lên · ${profile.gcnFile.name}` : 'Chưa tải lên';
    case 'contact': {
      if (ok) return 'Đủ thông tin bắt buộc';
      const miss = missingContactFields(profile.contact);
      return missingText(miss.length, miss.map((k) => contactLabel(profile.ownerType, k)));
    }
    case 'staff': {
      const s = profile.staff;
      if (ok) return `${s.staffName.trim()} · ${s.staffPhone.trim()}`;
      return s.staffName.trim() ? 'Thiếu số điện thoại hợp lệ' : 'Chưa có nhân sự';
    }
    case 'channel': {
      const active = channels.filter((c) => c.active && !!c.proofImage).length;
      if (ok) return `${active || 'Có'} kênh đang hoạt động kèm ảnh`;
      return channels.length === 0 ? 'Chưa có kênh nào' : 'Chưa có kênh nào đang bật';
    }
    case 'kols': {
      if (!ok) return 'Chưa gán kênh cho KOL nào';
      const { kolCount, assigned } = kolStats(channels, kols);
      return kolCount ? `${kolCount} KOL · ${assigned} kênh đã gán` : 'Đã gán kênh cho KOL';
    }
  }
}

/** Summary sections (Thông tin hồ sơ, Quản lý kênh, MCN: Quản lý KOL) with their checklist items. */
export function overviewSections(input: OverviewInput): OverviewSection[] {
  const { ownerType } = input.view.profile;
  const meta: Record<OverviewSectionKey, { title: string; to: string; linkLabel: string }> = {
    'thong-tin': { title: 'Thông tin hồ sơ', to: profilePath(ownerType, 'thong-tin'), linkLabel: 'Thông tin hồ sơ' },
    kenh: { title: 'Quản lý kênh', to: profilePath(ownerType, 'kenh'), linkLabel: 'Quản lý kênh' },
    kol: { title: 'Quản lý KOL', to: mcnKolsPath(), linkLabel: 'Quản lý KOL' },
  };
  const order: OverviewSectionKey[] = ownerType === 'MCN' ? ['thong-tin', 'kenh', 'kol'] : ['thong-tin', 'kenh'];
  const all = [
    ...input.view.checklist.map((c) => ({ ...c, required: true })),
    ...(input.view.recommendations ?? []).map((c) => ({ ...c, required: false })),
  ].filter((c): c is ChecklistItem & { key: OverviewItemKey; required: boolean } => c.key !== 'pledges');
  return order.map((key) => {
    const items: OverviewItem[] = all
      .filter((c) => SECTION_OF[c.key] === key)
      .sort((a, b) => ITEM_ORDER.indexOf(a.key) - ITEM_ORDER.indexOf(b.key))
      .map((c) => ({
        key: c.key,
        label: ITEM_LABEL[c.key],
        ok: c.ok,
        required: c.required,
        detail: itemDetail(c.key, c.ok, input) || undefined,
        to: checklistLink(ownerType, c.key) ?? meta[key].to,
      }));
    const missing = items.filter((i) => i.required && !i.ok).length;
    const suggestions = items.filter((i) => !i.required && !i.ok).length;
    return { key, ...meta[key], anchorId: OVERVIEW_ANCHOR[key], items, missing, suggestions, complete: missing === 0 };
  });
}

/** Unmet required items across the sections and the first incomplete section (target of "Còn N mục cần bổ sung"). */
export function overviewProgress(sections: OverviewSection[]): { missing: number; firstIncomplete?: OverviewSection } {
  return {
    missing: sections.reduce((n, s) => n + s.missing, 0),
    firstIncomplete: sections.find((s) => !s.complete),
  };
}
