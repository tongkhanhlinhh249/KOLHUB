// Pure profile rules shared by the services and screens (phase 2).
import type { Account } from '../types';
import type {
  Channel,
  ContactInfo,
  KolProfile,
  McnProfile,
  OrgIdentity,
  StaffInfo,
} from '../profile-types';
import type { DemoState } from './db';
import { isValidEmail, isValidPhone } from './normalize';

function emptyBase(acc: Account, now: number) {
  return {
    accountId: acc.id,
    contact: {
      displayName: '',
      phone: acc.phone ?? '',
      email: acc.email,
      zalo: '',
      country: 'Việt Nam',
      province: '',
      address: '',
      category: '',
    },
    staff: { staffName: '', staffPhone: '', staffEmail: '' },
    status: 'DRAFT' as const,
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyKolProfile(acc: Account, now: number): KolProfile {
  return { ...emptyBase(acc, now), ownerType: 'KOL', ekycStatus: 'NOT_STARTED' };
}

export function emptyMcnProfile(acc: Account, now: number): McnProfile {
  return {
    ...emptyBase(acc, now),
    ownerType: 'MCN',
    org: { orgName: '', regNo: '', regDate: '', regBy: '', legalRep: '' },
  };
}

export const REQUIRED_CONTACT: (keyof ContactInfo)[] = ['displayName', 'phone', 'email', 'province', 'address', 'category'];

const filled = (v: string | undefined) => !!v && v.trim() !== '';

export function contactComplete(c: ContactInfo): boolean {
  return REQUIRED_CONTACT.every((k) => filled(c[k])) && isValidPhone(c.phone) && isValidEmail(c.email);
}

export function hasStaff(s: StaffInfo): boolean {
  return filled(s.staffName) && filled(s.staffPhone) && isValidPhone(s.staffPhone);
}

export function orgComplete(o: OrgIdentity): boolean {
  return filled(o.orgName) && filled(o.regNo) && filled(o.regDate) && filled(o.regBy) && filled(o.legalRep);
}

export function findProfile(state: DemoState, accountId: string): KolProfile | McnProfile | undefined {
  return (
    state.kolProfiles.find((p) => p.accountId === accountId) ?? state.mcnProfiles.find((p) => p.accountId === accountId)
  );
}

export function activeWithProof(ch: Channel): boolean {
  return ch.active && !!ch.proofImage;
}

function hasActiveChannel(state: DemoState, accountId: string): boolean {
  return state.channels.some((c) => c.ownerId === accountId && activeWithProof(c));
}

function identityDone(p: KolProfile | McnProfile): boolean {
  return p.ownerType === 'KOL' ? p.ekycStatus === 'PASSED' : !!p.gcnFile;
}

export interface Milestone {
  key: 'contact' | 'staff' | 'identity' | 'channel' | 'submitted';
  label: string;
  done: boolean;
}

export interface Completeness {
  percent: number;
  milestones: Milestone[];
}

export function completeness(state: DemoState, accountId: string): Completeness {
  const p = findProfile(state, accountId);
  if (!p) return { percent: 0, milestones: [] };
  const milestones: Milestone[] = [
    { key: 'contact', label: 'Thông tin liên hệ đầy đủ', done: contactComplete(p.contact) },
    { key: 'staff', label: 'Có nhân sự quản lý nội dung', done: hasStaff(p.staff) },
    {
      key: 'identity',
      label: p.ownerType === 'KOL' ? 'Xác thực danh tính (eKYC)' : 'Tải Giấy chứng nhận ĐKDN',
      done: identityDone(p),
    },
    { key: 'channel', label: 'Có ít nhất 1 kênh hoạt động kèm ảnh', done: hasActiveChannel(state, accountId) },
    { key: 'submitted', label: 'Đã gửi xét duyệt', done: p.status !== 'DRAFT' },
  ];
  return { percent: milestones.filter((m) => m.done).length * 20, milestones };
}

export interface ChecklistItem {
  key: 'ekyc' | 'org' | 'gcn' | 'contact' | 'staff' | 'channel' | 'pledges';
  label: string;
  ok: boolean;
}

export const PLEDGES_LABEL = 'Đã tick đủ 3 cam đoan';

/** BR-64 (KOL) / BR-65 (MCN) submit conditions. */
export function submitChecklist(state: DemoState, accountId: string, pledges: boolean[]): ChecklistItem[] {
  const p = findProfile(state, accountId);
  if (!p) return [];
  const pledgeItem: ChecklistItem = {
    key: 'pledges',
    label: PLEDGES_LABEL,
    ok: pledges.length >= 3 && pledges.every(Boolean),
  };
  const contact: ChecklistItem = {
    key: 'contact',
    label: 'Thông tin liên hệ đủ trường bắt buộc',
    ok: contactComplete(p.contact),
  };
  if (p.ownerType === 'KOL') {
    return [
      { key: 'ekyc', label: 'Đã xác thực danh tính (eKYC)', ok: p.ekycStatus === 'PASSED' },
      contact,
      { key: 'staff', label: 'Có nhân sự quản lý nội dung', ok: hasStaff(p.staff) },
      { key: 'channel', label: 'Có ít nhất 1 kênh đang hoạt động kèm ảnh', ok: hasActiveChannel(state, accountId) },
      pledgeItem,
    ];
  }
  return [
    { key: 'org', label: 'Đủ 5 trường định danh tổ chức', ok: orgComplete(p.org) },
    { key: 'gcn', label: 'Đã tải Giấy chứng nhận ĐKDN', ok: !!p.gcnFile },
    contact,
    pledgeItem,
  ];
}

export interface TimelineStep {
  key: 'submitted' | 'reviewing' | 'result';
  label: string;
  state: 'done' | 'current' | 'todo' | 'success' | 'warning' | 'error';
  at?: number;
  note?: string;
}

export const REVIEW_SLA_NOTE = 'Thời gian xét duyệt 1–2 ngày làm việc';

export function buildTimeline(profile: KolProfile | McnProfile): TimelineStep[] {
  const submitted: TimelineStep = { key: 'submitted', label: 'Đã gửi hồ sơ', state: 'todo' };
  const reviewing: TimelineStep = { key: 'reviewing', label: 'Đang xét duyệt', state: 'todo', note: REVIEW_SLA_NOTE };
  const result: TimelineStep = { key: 'result', label: 'Kết quả', state: 'todo' };
  if (profile.status === 'DRAFT') return [submitted, reviewing, result];

  submitted.state = 'done';
  submitted.at = profile.submittedAt;
  if (profile.status === 'SUBMITTED') {
    reviewing.state = 'current';
    return [submitted, reviewing, result];
  }

  reviewing.state = 'done';
  result.at = profile.decidedAt;
  if (profile.status === 'APPROVED') {
    result.state = 'success';
    result.label = 'Đã duyệt';
  } else if (profile.status === 'NEEDS_FIX') {
    result.state = 'warning';
    result.label = 'Cần bổ sung';
    result.note = profile.decisionReason;
  } else {
    result.state = 'error';
    result.label = 'Không được duyệt';
    result.note = profile.decisionReason;
  }
  return [submitted, reviewing, result];
}

/** NFC, trim, collapse whitespace, upper-case (Vietnamese locale). */
export function normalizeName(s: string): string {
  return (s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi');
}

/** 079096012345 → 079*******45 (first 3 + stars + last 2). */
export function maskIdNo(id: string): string {
  const d = (id ?? '').replace(/\s/g, '');
  if (d.length <= 5) return d;
  return d.slice(0, 3) + '*'.repeat(d.length - 5) + d.slice(-2);
}

/** Verified channels whose badge has expired (badgeExpiresAt <= now) become EXPIRED. */
export function sweepExpired(state: DemoState, now: number): void {
  for (const ch of state.channels) {
    if (ch.status === 'VERIFIED' && ch.badgeExpiresAt !== undefined && ch.badgeExpiresAt <= now) {
      ch.status = 'EXPIRED';
    }
  }
}
