import { beforeEach, describe, expect, test } from 'vitest';
import type { KolProfile, McnProfile } from '../profile-types';
import { createDemoService, fillSampleProfile } from './demo';
import { contactComplete, findProfile, profileRecommendations, submitChecklist } from './profileRules';
import { createReviewService } from './review';
import { makeHarness, type Harness } from './testHarness';

const ALL = [true, true, true];
let h: Harness;

beforeEach(() => {
  h = makeHarness();
});

const fill = (id: string) => h.db.update((s) => fillSampleProfile(s, id, h.clock.t));

describe('fillSampleProfile', () => {
  test('KOL: đủ mọi mục bắt buộc (eKYC PASSED + danh tính), kênh mẫu chờ duyệt, KHÔNG tự gửi', () => {
    fill(h.kolId);
    const s = h.db.read();
    const p = findProfile(s, h.kolId) as KolProfile;
    expect(p.status).toBe('DRAFT');
    expect(p.ekycStatus).toBe('PASSED');
    expect(s.identities.find((x) => x.accountId === h.kolId)).toMatchObject({ fullName: 'TRẦN GIA HÂN' });
    expect(p.contact.bio).toBeTruthy();
    expect(p.contact.fields?.[0].name).toBe(p.contact.category);
    const own = s.channels.filter((c) => c.ownerId === h.kolId);
    expect(own.map((c) => [c.platform, c.status, c.active, !!c.proofImage])).toEqual([
      ['tiktok', 'PENDING_REVIEW', true, true],
      ['facebook', 'SAFETY_PENDING', true, true],
      ['instagram', 'SAFETY_PENDING', true, true],
    ]);
    expect(submitChecklist(s, h.kolId, [false, false, false]).filter((i) => !i.ok).map((i) => i.key)).toEqual(['pledges']);
    expect(s.reviewRequests.some((r) => r.ownerId === h.kolId)).toBe(false);
  });

  test('MCN: định danh tổ chức + GCN + liên hệ, và cả khuyến nghị (nhân sự, kênh, KOL được gán kênh)', () => {
    fill(h.mcnId);
    const s = h.db.read();
    const p = findProfile(s, h.mcnId) as McnProfile;
    expect(p.status).toBe('DRAFT');
    expect(p.org.regNo).toMatch(/^\d{10}$/);
    expect(p.gcnFile?.type).toBe('application/pdf');
    expect(submitChecklist(s, h.mcnId, ALL).every((i) => i.ok)).toBe(true);
    expect(profileRecommendations(s, h.mcnId).every((i) => i.ok)).toBe(true);
    const assigned = s.channels.filter((c) => c.ownerId === h.mcnId && c.assignedKolAccountId);
    expect(assigned).toHaveLength(1);
    expect(s.kolProfiles.find((k) => k.accountId === assigned[0].assignedKolAccountId)).toMatchObject({ status: 'APPROVED' });
  });

  test('giữ giá trị đã nhập, bấm lại không thêm kênh trùng', () => {
    h.db.update((s) => {
      findProfile(s, h.kolId)!.contact.displayName = 'Khánh Vy';
    });
    fill(h.kolId);
    fill(h.kolId);
    const s = h.db.read();
    expect(findProfile(s, h.kolId)!.contact.displayName).toBe('Khánh Vy');
    expect(s.identities.filter((x) => x.accountId === h.kolId)).toHaveLength(1);
    expect(s.channels.filter((c) => c.ownerId === h.kolId)).toHaveLength(3);
    expect(contactComplete(findProfile(s, h.kolId)!.contact)).toBe(true);
  });

  test.each(['SUBMITTED', 'APPROVED', 'REJECTED'] as const)('hồ sơ %s → NOT_EDITABLE, không đổi gì', (status) => {
    h.db.update((s) => {
      findProfile(s, h.kolId)!.status = status;
    });
    const before = JSON.stringify(h.db.read());
    expect(() => fill(h.kolId)).toThrow('NOT_EDITABLE');
    expect(JSON.stringify(h.db.read())).toBe(before);
  });

  test('NEEDS_FIX vẫn điền được', () => {
    h.db.update((s) => {
      findProfile(s, h.mcnId)!.status = 'NEEDS_FIX';
    });
    fill(h.mcnId);
    expect(submitChecklist(h.db.read(), h.mcnId, ALL).every((i) => i.ok)).toBe(true);
  });
});

describe('demoService', () => {
  test('điền xong, tick cam đoan là gửi xét duyệt được', async () => {
    const demo = createDemoService({ db: h.db, now: h.now, delay: false });
    const review = createReviewService({ db: h.db, now: h.now, notify: () => {}, delay: false });
    const view = await demo.fillSampleProfile(h.kolId);
    expect(view.checklist.every((i) => i.ok)).toBe(true);
    expect(view.profile.status).toBe('DRAFT');
    await expect(review.submit(h.kolId, ALL)).resolves.toMatchObject({ status: 'SUBMITTED' });
  });
});
