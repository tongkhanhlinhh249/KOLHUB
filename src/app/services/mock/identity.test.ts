import { describe, expect, test } from 'vitest';
import type { Account } from '../types';
import type { KolProfile, McnProfile } from '../profile-types';
import { DEMO_ACCOUNT_ALIASES, DEMO_ACCOUNTS, identityOf } from './identity';
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

  test('MCN: displayName → orgName → email; chưa duyệt → phụ đề = mã số DN', () => {
    const { s, a } = acc('mcn@demo.kolhub.vn');
    const p = s.mcnProfiles.find((x) => x.accountId === a.id) as McnProfile;
    expect(identityOf(s, a)).toEqual({ name: 'mcn@demo.kolhub.vn', roleLabel: 'Tổ chức/MCN' });
    p.org.orgName = 'Công ty MCN Sao Việt';
    expect(identityOf(s, a).name).toBe('Công ty MCN Sao Việt');
    p.contact.displayName = '  Sao   Việt ';
    p.org.regNo = '0312345678';
    p.avatar = { name: 'a.png', type: 'image/png', size: 1, thumbnail: 'data:x' };
    expect(identityOf(s, a)).toEqual({ name: 'Sao Việt', subtitle: '0312345678', avatar: 'data:x', roleLabel: 'Tổ chức/MCN' });
  });

  test('MCN đã duyệt: phụ đề = MCN ID (như KOL ID của KOL)', () => {
    const { s, a } = acc('mcn@demo.kolhub.vn');
    const p = s.mcnProfiles.find((x) => x.accountId === a.id) as McnProfile;
    p.contact.displayName = 'Sao Việt';
    p.org.regNo = '0312345678';
    p.status = 'APPROVED';
    p.mcnId = 'MCN-2026-0099';
    expect(identityOf(s, a)).toEqual({ name: 'Sao Việt', subtitle: 'MCN-2026-0099', roleLabel: 'Tổ chức/MCN' });
  });

  test('Nhãn hàng: fullName, phụ đề = company; thiếu fullName → email', () => {
    const { s, a } = acc('brand@vinamilk-demo.vn');
    expect(identityOf(s, a)).toEqual({ name: 'Nguyễn Minh Anh', subtitle: 'Công ty Demo Sữa', roleLabel: 'Nhãn hàng/Agency' });
    expect(identityOf(s, { ...a, fullName: '', company: undefined })).toEqual({ name: 'brand@vinamilk-demo.vn', roleLabel: 'Nhãn hàng/Agency' });
  });

  test('MCN đã xác thực (Sao Việt Media): cùng tên và ảnh với đầu trang hồ sơ, phụ đề = MCN ID', () => {
    const { s, a } = acc('saoviet@demo.kolhub.vn');
    const p = s.mcnProfiles.find((x) => x.accountId === a.id) as McnProfile;
    const id = identityOf(s, a);
    expect(id).toMatchObject({ name: 'Sao Việt Media', subtitle: p.mcnId, roleLabel: 'Tổ chức/MCN' });
    expect(id.name).toBe(p.contact.displayName);
    expect(id.avatar).toBe(p.avatar?.thumbnail);
  });

  test('Nhãn hàng tài khoản mới: Trần Thu Hà, phụ đề = công ty', () => {
    const { s, a } = acc('agency@newbrand-demo.vn');
    expect(identityOf(s, a)).toEqual({ name: 'Trần Thu Hà', subtitle: 'Công ty TNHH Newbrand Agency', roleLabel: 'Nhãn hàng/Agency' });
  });

  test('KOL chưa có hồ sơ (vừa đăng ký) → email', () => {
    const a: Account = { id: 'new', type: 'KOL', email: 'new@x.vn', createdAt: '' };
    expect(identityOf(seedState(), a)).toEqual({ name: 'new@x.vn', roleLabel: 'Cá nhân/KOL' });
  });
});

test('DEMO_ACCOUNTS: Khách + hồ sơ mới / đã xác thực cho từng vai trò, email có trong seed', () => {
  expect(DEMO_ACCOUNTS.map((d) => [d.key, d.label, d.email])).toEqual([
    ['guest', 'Khách', undefined],
    ['kol-new', 'Cá nhân/KOL (hồ sơ mới)', 'kol@demo.kolhub.vn'],
    ['kol-verified', 'Cá nhân/KOL (đã xác thực)', 'khanhvy@demo.kolhub.vn'],
    ['mcn-new', 'Tổ chức/MCN (hồ sơ mới)', 'mcn@demo.kolhub.vn'],
    ['mcn-verified', 'Tổ chức/MCN (đã xác thực)', 'saoviet@demo.kolhub.vn'],
    ['biz-new', 'Nhãn hàng/Agency (tài khoản mới)', 'agency@newbrand-demo.vn'],
    ['biz-verified', 'Nhãn hàng/Agency (đã xác thực)', 'brand@vinamilk-demo.vn'],
  ]);
  const emails = new Set(seedState().accounts.map((a) => a.email));
  for (const d of DEMO_ACCOUNTS.slice(1)) expect(emails.has(d.email!)).toBe(true);
  expect(DEMO_ACCOUNT_ALIASES).toEqual({ mcn: 'mcn-new', biz: 'biz-verified' });
});
