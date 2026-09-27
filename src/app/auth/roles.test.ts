import { describe, expect, test } from 'vitest';
import { GUEST_PATHS, ROLE_CONFIG, getPageMeta, resolveAccess, roleOf, safeReturnTo } from './roles';
import type { Account } from '../services/types';

const acc = (type: Account['type']): Account => ({ id: 'a', type, email: 'a@b.vn', createdAt: '' });

describe('resolveAccess', () => {
  test('guest vào trang cần đăng nhập → Đăng nhập kèm returnTo', () =>
    expect(resolveAccess('kolhub.guest', '/ho-so-kol')).toEqual({
      allow: false,
      redirect: '/dang-nhap?returnTo=%2Fho-so-kol',
      reason: 'login',
    }));
  test('KOL vào trang của Nhãn hàng → màn mặc định, forbidden', () =>
    expect(resolveAccess('kolhub.user.kol', '/tim-kiem-kol')).toEqual({
      allow: false,
      redirect: '/ho-so-kol',
      reason: 'forbidden',
    }));
  test('đã đăng nhập vào trang khách → màn mặc định, không báo lỗi', () =>
    expect(resolveAccess('kolhub.user.biz', '/dang-nhap')).toEqual({
      allow: false,
      redirect: '/tim-kiem-kol',
      reason: 'home',
    }));
  test('"/" và đường dẫn lạ → màn mặc định', () => {
    expect(resolveAccess('kolhub.user.mcn', '/')).toMatchObject({ redirect: '/ho-so-mcn', reason: 'home' });
    expect(resolveAccess('kolhub.guest', '/khong-ton-tai')).toMatchObject({ redirect: '/dang-ky', reason: 'home' });
    expect(resolveAccess('kolhub.guest', '/')).toMatchObject({ redirect: '/dang-ky', reason: 'home' });
  });
  test('KOL và MCN đều vào được KOL Safety', () => {
    expect(resolveAccess('kolhub.user.kol', '/kol-safety')).toEqual({ allow: true });
    expect(resolveAccess('kolhub.user.mcn', '/kol-safety')).toEqual({ allow: true });
  });
  test('guest vào được các trang khách', () => {
    for (const p of GUEST_PATHS) expect(resolveAccess('kolhub.guest', p)).toEqual({ allow: true });
  });
  test('MCN vào Hồ sơ KOL → forbidden', () =>
    expect(resolveAccess('kolhub.user.mcn', '/ho-so-kol')).toEqual({
      allow: false,
      redirect: '/ho-so-mcn',
      reason: 'forbidden',
    }));
  test('dấu / cuối vẫn khớp', () => expect(resolveAccess('kolhub.user.biz', '/danh-sach-da-luu/')).toEqual({ allow: true }));
});

describe('safeReturnTo', () => {
  test.each(['https://evil.com', '//evil.com', '/\\evil.com', '/tim-kiem-kol', null, ''])('safeReturnTo KOL bỏ qua %s', (r) =>
    expect(safeReturnTo('kolhub.user.kol', r)).toBe('/ho-so-kol'));
  test('safeReturnTo giữ đường dẫn hợp quyền', () =>
    expect(safeReturnTo('kolhub.user.biz', '/danh-sach-da-luu')).toBe('/danh-sach-da-luu'));
  test('safeReturnTo giữ query của đường dẫn hợp quyền', () =>
    expect(safeReturnTo('kolhub.user.biz', '/tim-kiem-kol?q=abc')).toBe('/tim-kiem-kol?q=abc'));
});

describe('roleOf / ROLE_CONFIG / getPageMeta', () => {
  test('roleOf', () => {
    expect(roleOf(null)).toBe('kolhub.guest');
    expect(roleOf(acc('KOL'))).toBe('kolhub.user.kol');
    expect(roleOf(acc('MCN'))).toBe('kolhub.user.mcn');
    expect(roleOf(acc('BIZ'))).toBe('kolhub.user.biz');
  });
  test('home và nhãn role', () => {
    expect(ROLE_CONFIG['kolhub.guest']).toMatchObject({ label: 'Khách', home: '/dang-ky' });
    expect(ROLE_CONFIG['kolhub.user.kol']).toMatchObject({ label: 'Cá nhân/KOL', home: '/ho-so-kol' });
    expect(ROLE_CONFIG['kolhub.user.mcn']).toMatchObject({ label: 'Tổ chức/MCN', home: '/ho-so-mcn' });
    expect(ROLE_CONFIG['kolhub.user.biz']).toMatchObject({ label: 'Nhãn hàng/Agency', home: '/tim-kiem-kol' });
    expect(ROLE_CONFIG['kolhub.user.biz'].menu.map((m) => m.path)).toEqual([
      '/tim-kiem-kol',
      '/danh-sach-da-luu',
      '/tai-khoan-doanh-nghiep',
    ]);
  });
  test('getPageMeta', () => {
    expect(getPageMeta('/ho-so-kol')).toEqual({
      title: 'Hồ sơ KOL',
      group: 'Cá nhân/KOL',
      description: 'Thông tin liên hệ, định danh và kênh của bạn',
    });
    expect(getPageMeta('/tim-kiem-kol')).toMatchObject({ title: 'Tìm kiếm KOL', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/kol-safety', 'kolhub.user.mcn')).toMatchObject({ title: 'KOL Safety', group: 'Tổ chức/MCN' });
    expect(getPageMeta('/quen-mat-khau')).toMatchObject({ title: 'Quên mật khẩu', group: 'Khách' });
  });
});
