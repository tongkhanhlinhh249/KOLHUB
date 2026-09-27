import { beforeEach, describe, expect, test } from 'vitest';
import type { OrgIdentity, ProfileStatus, StoredFile } from '../profile-types';
import { createProfileService } from './profile';
import { findProfile } from './profileRules';
import { makeHarness, type Harness } from './testHarness';

const pdf = (size: number): StoredFile => ({ name: 'gcn.pdf', type: 'application/pdf', size });
const org1: OrgIdentity = {
  orgName: 'Công ty MCN Sao Việt',
  regNo: '0312345678',
  regDate: '2020-01-15',
  regBy: 'Sở KH&ĐT TP.HCM',
  legalRep: 'Nguyễn A',
};

function setStatus(h: Harness, id: string, status: ProfileStatus, contact: Record<string, string> = {}) {
  h.db.update((s) => {
    const p = findProfile(s, id)!;
    p.status = status;
    Object.assign(p.contact, contact);
  });
}

let h: Harness;
let profile: ReturnType<typeof createProfileService>;

beforeEach(() => {
  h = makeHarness();
  profile = createProfileService({ db: h.db, now: h.now, delay: false });
});

describe('profile service', () => {
  test('tài khoản KOL mới chưa có hồ sơ → getProfile tạo DRAFT', async () => {
    h.db.update((s) => {
      s.accounts.push({ id: 'acc-new', type: 'KOL', email: 'new@x.vn', phone: '0987000111', createdAt: '', password: 'x' });
    });
    const v = await profile.getProfile('acc-new');
    expect(v.profile).toMatchObject({ status: 'DRAFT', contact: { email: 'new@x.vn', phone: '0987000111' } });
    expect(h.db.read().kolProfiles.filter((p) => p.accountId === 'acc-new')).toHaveLength(1);
  });

  test('checklist trong view theo BR-64/BR-65, không có pledges', async () => {
    expect((await profile.getProfile(h.kolId)).checklist.map((i) => i.key)).toEqual(['ekyc', 'contact', 'staff', 'channel']);
    expect((await profile.getProfile(h.mcnId)).checklist.map((i) => i.key)).toEqual(['org', 'gcn', 'contact']);
  });

  test('SĐT liên hệ sai → ValidationError field phone, không lưu', async () => {
    await expect(profile.updateContact(h.kolId, { phone: '0212345678' })).rejects.toMatchObject({ field: 'phone' });
    expect(findProfile(h.db.read(), h.kolId)!.contact.phone).toBe('0912000001');
  });

  test('Email nhân sự sai → ValidationError field staffEmail', async () => {
    await expect(
      profile.updateStaff(h.kolId, { staffName: 'Lan', staffPhone: '0987654321', staffEmail: 'x@' }),
    ).rejects.toMatchObject({ field: 'staffEmail' });
  });

  test('DRAFT: đổi Họ tên KOL lưu ngay', async () =>
    expect((await profile.updateContact(h.kolId, { displayName: 'Khánh Vy' })).profile.contact.displayName).toBe('Khánh Vy'));

  test('SUBMITTED: đổi Họ tên KOL → PENDING_CHANGE, hiển thị giữ nguyên; các trường khác lưu ngay', async () => {
    setStatus(h, h.kolId, 'SUBMITTED', { displayName: 'Khánh Vy' });
    const v = await profile.updateContact(h.kolId, { displayName: 'Vy Khánh', address: '12 Lý Thường Kiệt' });
    expect(v.profile.contact).toMatchObject({ displayName: 'Khánh Vy', address: '12 Lý Thường Kiệt' });
    expect(v.pendingChanges).toEqual([
      expect.objectContaining({ field: 'displayName', oldValue: 'Khánh Vy', newValue: 'Vy Khánh', status: 'PENDING_CHANGE' }),
    ]);
  });

  test('sửa lần hai khi đang chờ → ghi đè cùng một change request', async () => {
    setStatus(h, h.kolId, 'APPROVED', { displayName: 'Khánh Vy' });
    await profile.updateContact(h.kolId, { displayName: 'Vy 1' });
    const v = await profile.updateContact(h.kolId, { displayName: 'Vy 2' });
    expect(v.pendingChanges).toHaveLength(1);
    expect(v.pendingChanges[0].newValue).toBe('Vy 2');
  });

  test('đổi về đúng tên đang hiển thị → không tạo change request', async () => {
    setStatus(h, h.kolId, 'SUBMITTED', { displayName: 'Khánh Vy' });
    await profile.updateContact(h.kolId, { displayName: 'Vy 1' });
    const v = await profile.updateContact(h.kolId, { displayName: 'Khánh Vy' });
    expect(v.pendingChanges).toEqual([]);
  });

  test('MCN DRAFT: định danh lưu ngay; SUBMITTED: PENDING_CHANGE kèm GCN mới', async () => {
    await profile.updateOrgIdentity(h.mcnId, org1);
    setStatus(h, h.mcnId, 'SUBMITTED');
    await profile.uploadGcn(h.mcnId, pdf(2_000_000));
    const v = await profile.updateOrgIdentity(h.mcnId, { ...org1, legalRep: 'Trần B' });
    expect(v.profile).toMatchObject({ org: org1 });
    expect(v.profile.ownerType === 'MCN' && v.profile.gcnFile).toBeFalsy();
    expect(v.pendingChanges).toHaveLength(1);
    expect(v.pendingChanges[0].newValue).toMatchObject({ org: { legalRep: 'Trần B' }, gcnFile: { type: 'application/pdf' } });
  });

  test('GCN .docx → 4301; PDF 10 MB + 1 byte → 4302; đúng 10 MB → nhận', async () => {
    await expect(
      profile.uploadGcn(h.mcnId, {
        name: 'a.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 10,
      }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4301' });
    await expect(profile.uploadGcn(h.mcnId, pdf(10 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: 'KOLHUB-4302' });
    await expect(profile.uploadGcn(h.mcnId, pdf(10 * 1024 * 1024))).resolves.toBeTruthy();
  });

  test('mã số DN trùng MCN khác → 4303', async () => {
    h.db.update((s) => {
      s.accounts.push({ id: 'mcn2', type: 'MCN', email: 'm2@x.vn', phone: '0987000222', createdAt: '', password: 'x' });
    });
    await profile.getProfile('mcn2');
    await profile.updateOrgIdentity('mcn2', org1);
    await expect(profile.updateOrgIdentity(h.mcnId, { ...org1, regNo: '0312 345 678' })).rejects.toMatchObject({
      code: 'KOLHUB-4303',
    });
  });

  test('REJECTED: sửa định danh MCN bị chặn', async () => {
    setStatus(h, h.mcnId, 'REJECTED');
    await expect(profile.updateOrgIdentity(h.mcnId, org1)).rejects.toThrow('IDENTITY_LOCKED');
  });

  test('avatar GIF → 4203; PNG lưu được', async () => {
    await expect(profile.updateImages(h.kolId, { avatar: { name: 'a.gif', type: 'image/gif', size: 10 } })).rejects.toMatchObject({
      code: 'KOLHUB-4203',
    });
    const v = await profile.updateImages(h.kolId, { avatar: { name: 'a.png', type: 'image/png', size: 10, thumbnail: 'data:x' } });
    expect(v.profile.avatar?.thumbnail).toBe('data:x');
  });
});

describe('giới thiệu & lĩnh vực hoạt động', () => {
  const contactOf = () => findProfile(h.db.read(), h.kolId)!.contact;

  test('bio ≤ 300 ký tự (trim); 301 → ValidationError field bio, không lưu', async () => {
    await expect(profile.updateContact(h.kolId, { bio: 'ệ'.repeat(301) })).rejects.toMatchObject({ field: 'bio' });
    expect(contactOf().bio).toBeUndefined();
    const v = await profile.updateContact(h.kolId, { bio: `  ${'a'.repeat(300)}  ` });
    expect(v.profile.contact.bio).toBe('a'.repeat(300));
  });

  test('fields: 1–3 mục, mục đầu = category, không trùng; KOL tự khai → medal none', async () => {
    const v = await profile.updateContact(h.kolId, {
      category: 'Giáo dục',
      fields: [
        { name: 'Giáo dục', medal: 'gold' },
        { name: 'Lifestyle', medal: 'silver' },
      ],
    });
    expect(v.profile.contact.fields).toEqual([
      { name: 'Giáo dục', medal: 'none' },
      { name: 'Lifestyle', medal: 'none' },
    ]);
    const bad: [string, { name: string; medal: 'none' }[]][] = [
      ['rỗng', []],
      ['4 mục', ['Giáo dục', 'Lifestyle', 'Du lịch', 'Gaming'].map((name) => ({ name, medal: 'none' as const }))],
      ['mục đầu khác category', [{ name: 'Lifestyle', medal: 'none' }]],
      ['trùng', [{ name: 'Giáo dục', medal: 'none' }, { name: 'giáo dục', medal: 'none' }]],
      ['tên rỗng', [{ name: 'Giáo dục', medal: 'none' }, { name: '  ', medal: 'none' }]],
    ];
    for (const [, fields] of bad) {
      await expect(profile.updateContact(h.kolId, { fields })).rejects.toMatchObject({ field: 'fields' });
    }
    expect(contactOf().fields).toHaveLength(2);
  });

  test('medal đã được gán (dữ liệu mẫu/Admin) giữ nguyên khi KOL lưu lại', async () => {
    h.db.update((s) => {
      const c = findProfile(s, h.kolId)!.contact;
      c.category = 'Giáo dục';
      c.fields = [
        { name: 'Giáo dục', medal: 'gold' },
        { name: 'MC', medal: 'silver' },
      ];
    });
    const v = await profile.updateContact(h.kolId, {
      fields: [
        { name: 'Giáo dục', medal: 'none' },
        { name: 'MC', medal: 'none' },
        { name: 'Lifestyle', medal: 'gold' },
      ],
    });
    expect(v.profile.contact.fields).toEqual([
      { name: 'Giáo dục', medal: 'gold' },
      { name: 'MC', medal: 'silver' },
      { name: 'Lifestyle', medal: 'none' },
    ]);
  });

  test('đổi category → mục đầu đổi theo, bỏ mục trùng; category rỗng → fields rỗng', async () => {
    await profile.updateContact(h.kolId, { category: 'Giáo dục' });
    expect(contactOf().fields).toEqual([{ name: 'Giáo dục', medal: 'none' }]);
    await profile.updateContact(h.kolId, {
      fields: [
        { name: 'Giáo dục', medal: 'none' },
        { name: 'Lifestyle', medal: 'none' },
        { name: 'Du lịch', medal: 'none' },
      ],
    });
    await profile.updateContact(h.kolId, { category: 'Lifestyle' });
    expect(contactOf().fields).toEqual([
      { name: 'Lifestyle', medal: 'none' },
      { name: 'Du lịch', medal: 'none' },
    ]);
    await profile.updateContact(h.kolId, { category: '' });
    expect(contactOf().fields).toEqual([]);
  });

  test('gửi category mới cùng fields mới trong một lần', async () => {
    const v = await profile.updateContact(h.kolId, {
      category: 'Gaming',
      fields: [
        { name: 'Gaming', medal: 'none' },
        { name: 'Giải trí', medal: 'none' },
      ],
    });
    expect(v.profile.contact).toMatchObject({ category: 'Gaming', fields: [{ name: 'Gaming' }, { name: 'Giải trí' }] });
  });
});
