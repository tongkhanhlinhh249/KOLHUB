import { describe, expect, test } from 'vitest';
import { GUEST_PATHS, ROLE_CONFIG, getPageMeta, resolveAccess, roleOf, safeReturnTo } from './roles';
import type { Account } from '../services/types';

const acc = (type: Account['type']): Account => ({ id: 'a', type, email: 'a@b.vn', createdAt: '' });

describe('resolveAccess', () => {
  test('guest vào trang cần đăng nhập → Đăng nhập kèm returnTo', () =>
    expect(resolveAccess('kolhub.guest', '/ho-so-kol/kenh')).toEqual({
      allow: false,
      redirect: '/dang-nhap?returnTo=%2Fho-so-kol%2Fkenh',
      reason: 'login',
    }));
  test('KOL vào trang của Nhãn hàng → màn mặc định, forbidden', () =>
    expect(resolveAccess('kolhub.user.kol', '/tim-kiem-kol')).toEqual({
      allow: false,
      redirect: '/ho-so-kol/lien-he',
      reason: 'forbidden',
    }));
  test('đã đăng nhập vào trang khách → màn mặc định, không báo lỗi', () =>
    expect(resolveAccess('kolhub.user.biz', '/dang-nhap')).toEqual({
      allow: false,
      redirect: '/tim-kiem-kol',
      reason: 'home',
    }));
  test('"/" và đường dẫn lạ → màn mặc định', () => {
    expect(resolveAccess('kolhub.user.mcn', '/')).toMatchObject({ redirect: '/ho-so-mcn/lien-he', reason: 'home' });
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
  test('MCN vào Hồ sơ KOL → forbidden', () => {
    for (const p of ['/ho-so-kol', '/ho-so-kol/lien-he', '/ho-so-kol/dinh-danh', '/ho-so-kol/kenh?them=1'])
      expect(resolveAccess('kolhub.user.mcn', p)).toEqual({ allow: false, redirect: '/ho-so-mcn/lien-he', reason: 'forbidden' });
  });
  test('KOL vào Hồ sơ MCN → forbidden', () => {
    for (const p of ['/ho-so-mcn', '/ho-so-mcn/lien-he', '/ho-so-mcn/dinh-danh', '/ho-so-mcn/kenh'])
      expect(resolveAccess('kolhub.user.kol', p)).toEqual({ allow: false, redirect: '/ho-so-kol/lien-he', reason: 'forbidden' });
  });
  test('KOL/MCN vào được từng trang hồ sơ và đường dẫn gốc (chuyển hướng sang Liên hệ)', () => {
    for (const s of ['', '/lien-he', '/dinh-danh', '/kenh', '/kenh?them=1', '?tab=kenh']) {
      expect(resolveAccess('kolhub.user.kol', `/ho-so-kol${s}`)).toEqual({ allow: true });
      expect(resolveAccess('kolhub.user.mcn', `/ho-so-mcn${s}`)).toEqual({ allow: true });
    }
  });
  test('guest vào đường dẫn hồ sơ gốc → Đăng nhập', () =>
    expect(resolveAccess('kolhub.guest', '/ho-so-mcn')).toMatchObject({ reason: 'login' }));
  test('dấu / cuối vẫn khớp', () => expect(resolveAccess('kolhub.user.biz', '/danh-sach-da-luu/')).toEqual({ allow: true }));
});

describe('safeReturnTo', () => {
  test.each(['https://evil.com', '//evil.com', '/\\evil.com', '/tim-kiem-kol', null, ''])('safeReturnTo KOL bỏ qua %s', (r) =>
    expect(safeReturnTo('kolhub.user.kol', r)).toBe('/ho-so-kol/lien-he'));
  test('safeReturnTo giữ đường dẫn hợp quyền', () =>
    expect(safeReturnTo('kolhub.user.biz', '/danh-sach-da-luu')).toBe('/danh-sach-da-luu'));
  test('safeReturnTo về trang con hồ sơ', () => {
    expect(safeReturnTo('kolhub.user.kol', '/ho-so-kol/kenh?them=1')).toBe('/ho-so-kol/kenh?them=1');
    expect(safeReturnTo('kolhub.user.mcn', '/ho-so-mcn/dinh-danh')).toBe('/ho-so-mcn/dinh-danh');
    expect(safeReturnTo('kolhub.user.kol', '/ho-so-mcn/kenh')).toBe('/ho-so-kol/lien-he');
  });
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
    expect(ROLE_CONFIG['kolhub.user.kol']).toMatchObject({ label: 'Cá nhân/KOL', home: '/ho-so-kol/lien-he' });
    expect(ROLE_CONFIG['kolhub.user.mcn']).toMatchObject({ label: 'Tổ chức/MCN', home: '/ho-so-mcn/lien-he' });
    expect(ROLE_CONFIG['kolhub.user.biz']).toMatchObject({ label: 'Nhãn hàng/Agency', home: '/tim-kiem-kol' });
    expect(ROLE_CONFIG['kolhub.user.kol'].menu.map((m) => [m.label, m.shortLabel, m.path, m.group])).toEqual([
      ['Thông tin liên hệ', 'Liên hệ', '/ho-so-kol/lien-he', 'Hồ sơ KOL'],
      ['Thông tin định danh', 'Định danh', '/ho-so-kol/dinh-danh', 'Hồ sơ KOL'],
      ['Quản lý kênh', 'Kênh', '/ho-so-kol/kenh', 'Quản lý nội dung'],
      ['KOL Safety', 'Safety', '/kol-safety', 'Quản lý nội dung'],
    ]);
    expect(ROLE_CONFIG['kolhub.user.mcn'].menu.map((m) => [m.label, m.shortLabel, m.path, m.group])).toEqual([
      ['Thông tin liên hệ', 'Liên hệ', '/ho-so-mcn/lien-he', 'Hồ sơ MCN'],
      ['Thông tin định danh', 'Định danh', '/ho-so-mcn/dinh-danh', 'Hồ sơ MCN'],
      ['Quản lý kênh', 'Kênh', '/ho-so-mcn/kenh', 'Quản lý nội dung'],
      ['KOL Safety', 'Safety', '/kol-safety', 'Quản lý nội dung'],
    ]);
    expect(ROLE_CONFIG['kolhub.user.biz'].menu.map((m) => m.path)).toEqual([
      '/tim-kiem-kol',
      '/danh-sach-da-luu',
      '/tai-khoan-doanh-nghiep',
    ]);
  });
  test('getPageMeta', () => {
    expect(getPageMeta('/ho-so-kol/lien-he')).toEqual({
      title: 'Thông tin liên hệ',
      group: 'Cá nhân/KOL',
      description: 'Thông tin liên hệ và nhân sự quản lý nội dung',
    });
    expect(getPageMeta('/ho-so-kol/dinh-danh')).toMatchObject({
      title: 'Thông tin định danh',
      description: 'Xác thực danh tính bằng CCCD và gửi hồ sơ xét duyệt',
    });
    expect(getPageMeta('/ho-so-mcn/dinh-danh', 'kolhub.user.mcn')).toEqual({
      title: 'Thông tin định danh',
      group: 'Tổ chức/MCN',
      description: 'Xác thực tổ chức bằng Giấy chứng nhận ĐKDN',
    });
    expect(getPageMeta('/ho-so-mcn/kenh?them=1')).toMatchObject({
      title: 'Quản lý kênh',
      description: 'Thêm kênh, ảnh quản lý kênh và trạng thái dấu xác thực',
    });
    expect(getPageMeta('/tim-kiem-kol')).toMatchObject({ title: 'Tìm kiếm KOL', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/kol-safety', 'kolhub.user.mcn')).toMatchObject({ title: 'KOL Safety', group: 'Tổ chức/MCN' });
    expect(getPageMeta('/quen-mat-khau')).toMatchObject({ title: 'Quên mật khẩu', group: 'Khách' });
  });
});
