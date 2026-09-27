import { describe, expect, test } from 'vitest';
import type { Account } from '../types';
import type { KolProfile, McnProfile } from '../profile-types';
import { DEMO_ACCOUNTS, identityOf } from './identity';
import { seedState } from './seed';

const acc = (email: string) => {
  const s = seedState();
  const { password: _p, ...a } = s.accounts.find((x) => x.email === email)!;
  return { s, a: a as Account };
};

describe('identityOf', () => {
  test('khách', () => expect(identityOf(seedState(), null)).toEqual({ name: 'Khách', roleLabel: 'Khách' }));

  test('KOL hồ sơ mới: tên rỗng → email, chưa có KOL ID', () => {
    const { s, a } = acc('kol@demo.kolhub.vn');
    expect(identityOf(s, a)).toEqual({ name: 'kol@demo.kolhub.vn', roleLabel: 'Cá nhân/KOL' });
  });

  test('KOL đã duyệt: tên hồ sơ, phụ đề KOL ID, ảnh đại diện hồ sơ', () => {
    const { s, a } = acc('khanhvy@demo.kolhub.vn');
    const id = identityOf(s, a);
    expect(id).toMatchObject({ name: 'Khánh Vy', subtitle: 'KOL-2026-0001', roleLabel: 'Cá nhân/KOL' });
    expect(id.avatar).toBe((s.kolProfiles.find((p) => p.accountId === a.id) as KolProfile).avatar!.thumbnail);
  });

  test('KOL có tên nhưng chưa duyệt → không có phụ đề KOL ID', () => {
    const { s, a } = acc('kol@demo.kolhub.vn');
    s.kolProfiles.find((p) => p.accountId === a.id)!.contact.displayName = '  Mai Anh  ';
    expect(identityOf(s, a)).toEqual({ name: 'Mai Anh', roleLabel: 'Cá nhân/KOL' });
  });

  test('MCN: orgName → displayName → email; phụ đề = mã số DN', () => {
    const { s, a } = acc('mcn@demo.kolhub.vn');
    const p = s.mcnProfiles.find((x) => x.accountId === a.id) as McnProfile;
    expect(identityOf(s, a)).toEqual({ name: 'mcn@demo.kolhub.vn', roleLabel: 'Tổ chức/MCN' });
    p.contact.displayName = 'Sao Việt';
    expect(identityOf(s, a).name).toBe('Sao Việt');
    p.org.orgName = 'Công ty MCN Sao Việt';
    p.org.regNo = '0312345678';
    p.avatar = { name: 'a.png', type: 'image/png', size: 1, thumbnail: 'data:x' };
    expect(identityOf(s, a)).toEqual({ name: 'Công ty MCN Sao Việt', subtitle: '0312345678', avatar: 'data:x', roleLabel: 'Tổ chức/MCN' });
  });

  test('Nhãn hàng: fullName, phụ đề = company; thiếu fullName → email', () => {
    const { s, a } = acc('brand@vinamilk-demo.vn');
    expect(identityOf(s, a)).toEqual({ name: 'Nguyễn Minh Anh', subtitle: 'Công ty Demo Sữa', roleLabel: 'Nhãn hàng/Agency' });
    expect(identityOf(s, { ...a, fullName: '', company: undefined })).toEqual({ name: 'brand@vinamilk-demo.vn', roleLabel: 'Nhãn hàng/Agency' });
  });

  test('KOL chưa có hồ sơ (vừa đăng ký) → email', () => {
    const a: Account = { id: 'new', type: 'KOL', email: 'new@x.vn', createdAt: '' };
    expect(identityOf(seedState(), a)).toEqual({ name: 'new@x.vn', roleLabel: 'Cá nhân/KOL' });
  });
});

test('DEMO_ACCOUNTS: 5 lựa chọn của thanh chuyển vai trò, email có trong seed', () => {
  expect(DEMO_ACCOUNTS.map((d) => d.key)).toEqual(['guest', 'kol-new', 'kol-verified', 'mcn', 'biz']);
  expect(DEMO_ACCOUNTS[0].email).toBeUndefined();
  const emails = new Set(seedState().accounts.map((a) => a.email));
  for (const d of DEMO_ACCOUNTS.slice(1)) expect(emails.has(d.email!)).toBe(true);
  expect(DEMO_ACCOUNTS.find((d) => d.key === 'kol-verified')!.email).toBe('khanhvy@demo.kolhub.vn');
  expect(DEMO_ACCOUNTS.every((d) => d.label.trim().length > 0)).toBe(true);
});
