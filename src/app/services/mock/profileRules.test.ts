import { describe, expect, test } from 'vitest';
import type { Channel, ContactInfo, KolProfile } from '../profile-types';
import type { DemoState } from './db';
import {
  buildTimeline,
  canManageKolAssignments,
  completeness,
  contactComplete,
  findProfile,
  maskIdNo,
  missingContactFields,
  missingOrgFields,
  normalizeName,
  submitChecklist,
  sweepExpired,
} from './profileRules';
import { makeHarness } from './testHarness';

const fullContact: ContactInfo = {
  displayName: 'Khánh Vy',
  phone: '0912000001',
  email: 'kol@demo.kolhub.vn',
  zalo: '',
  country: 'Việt Nam',
  province: 'Hà Nội',
  address: '1 Tràng Tiền',
  category: 'Giáo dục',
};
const staff = { staffName: 'Lan', staffPhone: '0987654321', staffEmail: '' };
const png = { name: 'a.png', type: 'image/png', size: 1000 };

function channel(ownerId: string, patch: Partial<Channel> = {}): Channel {
  return {
    id: `ch-${Math.random()}`,
    ownerType: 'KOL',
    ownerId,
    platform: 'facebook',
    url: 'https://facebook.com/abc',
    handle: 'abc',
    proofImage: png,
    status: 'PENDING_REVIEW',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...patch,
  };
}

function withProfile(s: DemoState, id: string, fn: (p: KolProfile) => void): DemoState {
  const p = s.kolProfiles.find((x) => x.accountId === id)!;
  fn(p);
  return s;
}

function fillKolReady(s: DemoState, id: string): DemoState {
  withProfile(s, id, (p) => {
    p.contact = { ...fullContact };
    p.staff = { ...staff };
    p.ekycStatus = 'PASSED';
    p.status = 'SUBMITTED';
  });
  s.channels.push(channel(id));
  return s;
}

describe('completeness', () => {
  test('hồ sơ KOL rỗng = 0%, đủ 5 mốc = 100%', () => {
    const h = makeHarness();
    let s = h.db.read();
    expect(completeness(s, h.kolId).percent).toBe(0);
    s = fillKolReady(s, h.kolId);
    expect(completeness(s, h.kolId)).toMatchObject({ percent: 100 });
  });

  test('mỗi mốc 20%: chỉ có liên hệ + nhân sự = 40%', () => {
    const h = makeHarness();
    const s = withProfile(h.db.read(), h.kolId, (p) => {
      p.contact = { ...fullContact };
      p.staff = { ...staff };
    });
    expect(completeness(s, h.kolId).percent).toBe(40);
  });

  test('MCN: mốc định danh là có file GCN', () => {
    const h = makeHarness();
    const s = h.db.read();
    s.mcnProfiles[0].gcnFile = { name: 'gcn.pdf', type: 'application/pdf', size: 100 };
    const c = completeness(s, h.mcnId);
    expect(c.milestones.find((m) => m.key === 'identity')).toMatchObject({ done: true, label: 'Tải Giấy chứng nhận ĐKDN' });
    expect(c.percent).toBe(17);
  });

  test('MCN có 6 mốc (thêm KOL được gán kênh), % = số mốc xong / tổng', () => {
    const h = makeHarness();
    const s = h.db.read();
    expect(completeness(s, h.mcnId).milestones.map((m) => m.key)).toEqual(['contact', 'staff', 'identity', 'channel', 'kols', 'submitted']);
    expect(completeness(s, h.kolId).milestones.map((m) => m.key)).toEqual(['contact', 'staff', 'identity', 'channel', 'submitted']);
    s.channels.push(channel(h.mcnId, { ownerType: 'MCN', assignedKolAccountId: 'acc-kol-2026-0011' }));
    const c = completeness(s, h.mcnId);
    expect(c.milestones.filter((m) => m.done).map((m) => m.key)).toEqual(['channel', 'kols']);
    expect(c.percent).toBe(33);
  });

  test('kênh INACTIVE không tính mốc kênh', () => {
    const h = makeHarness();
    const s = h.db.read();
    s.channels.push(channel(h.kolId, { active: false }));
    expect(completeness(s, h.kolId).milestones.find((m) => m.key === 'channel')!.done).toBe(false);
  });
});

describe('submitChecklist', () => {
  test('checklist KOL thiếu eKYC và 1 cam đoan', () => {
    const h = makeHarness();
    const s = fillKolReady(h.db.read(), h.kolId);
    withProfile(s, h.kolId, (p) => {
      p.ekycStatus = 'OCR_PASSED';
      p.status = 'DRAFT';
    });
    const items = submitChecklist(s, h.kolId, [true, true, false]);
    expect(items.map((i) => i.key)).toEqual(['ekyc', 'contact', 'staff', 'channel', 'pledges']);
    expect(items.filter((i) => !i.ok).map((i) => i.key)).toEqual(['ekyc', 'pledges']);
  });

  test('checklist MCN: đủ tab Thông tin hồ sơ, Quản lý kênh và Quản lý KOL', () => {
    const h = makeHarness();
    const items = submitChecklist(h.db.read(), h.mcnId, [true, true, true]);
    expect(items.map((i) => i.key)).toEqual(['org', 'gcn', 'contact', 'staff', 'channel', 'kols', 'pledges']);
    expect(items.find((i) => i.key === 'kols')).toMatchObject({ ok: false, label: 'Có ít nhất 1 KOL được gán kênh' });
  });

  test('MCN: kênh gán cho KOL đạt cả mốc kênh và KOL; kênh riêng MCN chỉ đạt mốc kênh', () => {
    const h = makeHarness();
    const s = h.db.read();
    s.channels.push(channel(h.mcnId, { ownerType: 'MCN' }));
    const ok = (key: string) => submitChecklist(s, h.mcnId, [true, true, true]).find((i) => i.key === key)!.ok;
    expect([ok('channel'), ok('kols')]).toEqual([true, false]);
    s.channels.push(channel(h.mcnId, { ownerType: 'MCN', assignedKolAccountId: 'khong-co' }));
    expect(ok('kols')).toBe(false);
    s.channels.push(channel(h.mcnId, { ownerType: 'MCN', assignedKolAccountId: 'acc-kol-2026-0011' }));
    expect(ok('kols')).toBe(true);
  });
});

describe('pure helpers', () => {
  test('contactComplete từ chối SĐT sai định dạng', () => {
    expect(contactComplete(fullContact)).toBe(true);
    expect(contactComplete({ ...fullContact, phone: '12345' })).toBe(false);
  });
  test('missingContactFields: trường trống và SĐT/email sai định dạng', () => {
    expect(missingContactFields(fullContact)).toEqual([]);
    expect(missingContactFields({ ...fullContact, phone: '123', province: ' ', email: 'x' })).toEqual(['phone', 'email', 'province']);
  });
  test('missingOrgFields', () =>
    expect(missingOrgFields({ orgName: 'A', regNo: '', regDate: '2020-01-01', regBy: '', legalRep: 'B' })).toEqual(['regNo', 'regBy']));
  test('canManageKolAssignments: soạn hồ sơ / cần bổ sung / đã duyệt', () =>
    expect((['DRAFT', 'SUBMITTED', 'NEEDS_FIX', 'APPROVED', 'REJECTED'] as const).filter(canManageKolAssignments)).toEqual([
      'DRAFT',
      'NEEDS_FIX',
      'APPROVED',
    ]));
  test('maskIdNo', () => expect(maskIdNo('079096012345')).toBe('079*******45'));
  test('normalizeName so khớp không phân biệt hoa và khoảng trắng', () =>
    expect(normalizeName('  nguyễn   văn an ')).toBe(normalizeName('NGUYỄN VĂN AN')));
});

describe('buildTimeline', () => {
  const h = makeHarness();
  const draft = findProfile(h.db.read(), h.kolId)!;
  const submitted = { ...draft, status: 'SUBMITTED' as const, submittedAt: 1000 };

  test('timeline DRAFT: cả 3 mốc todo', () => expect(buildTimeline(draft).map((t) => t.state)).toEqual(['todo', 'todo', 'todo']));
  test('timeline SUBMITTED: done, current, todo', () =>
    expect(buildTimeline(submitted).map((t) => t.state)).toEqual(['done', 'current', 'todo']));
  test('timeline REJECTED hiện lý do', () =>
    expect(buildTimeline({ ...submitted, status: 'REJECTED', decisionReason: 'Giấy tờ giả' })[2]).toMatchObject({
      state: 'error',
      label: 'Không được duyệt',
      note: 'Giấy tờ giả',
    }));
  test('timeline APPROVED: success', () =>
    expect(buildTimeline({ ...submitted, status: 'APPROVED', decidedAt: 2000 }).map((t) => t.state)).toEqual([
      'done',
      'done',
      'success',
    ]));
});

describe('sweepExpired', () => {
  test('badgeExpiresAt === now → EXPIRED, còn hạn giữ nguyên', () => {
    const h = makeHarness();
    const s = h.db.read();
    s.channels.push(channel(h.kolId, { id: 'a', status: 'VERIFIED', badgeExpiresAt: 5000 }));
    s.channels.push(channel(h.kolId, { id: 'b', status: 'VERIFIED', badgeExpiresAt: 5001 }));
    sweepExpired(s, 5000);
    expect(s.channels.filter((c) => c.ownerId === h.kolId).map((c) => c.status)).toEqual(['EXPIRED', 'VERIFIED']);
  });
});
