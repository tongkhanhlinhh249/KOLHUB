import { describe, expect, test } from 'vitest';
import { GUEST_PATHS, ROLE_CONFIG, bottomNavOf, getPageMeta, isNavActive, resolveAccess, roleOf, safeReturnTo } from './roles';
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
  test('KOL và MCN đều vào được Kiểm duyệt (KOL Safety), kể cả chi tiết kênh và đường dẫn cũ /kol-safety', () => {
    for (const p of [
      '/kiem-duyet',
      '/kiem-duyet/video',
      '/kiem-duyet/tiktok',
      '/kiem-duyet/facebook',
      '/kiem-duyet/youtube',
      '/kiem-duyet/tiktok/mon-123',
      '/kol-safety',
    ]) {
      expect(resolveAccess('kolhub.user.kol', p)).toEqual({ allow: true });
      expect(resolveAccess('kolhub.user.mcn', p)).toEqual({ allow: true });
    }
  });
  test('Nhãn hàng không vào được Kiểm duyệt → forbidden; khách → Đăng nhập', () => {
    for (const p of ['/kiem-duyet/video', '/kiem-duyet/youtube/mon-1', '/kol-safety', '/kiem-duyet/vi-pham']) {
      expect(resolveAccess('kolhub.user.biz', p)).toEqual({ allow: false, redirect: '/tim-kiem-kol', reason: 'forbidden' });
      expect(resolveAccess('kolhub.guest', p)).toMatchObject({ allow: false, reason: 'login' });
    }
  });
  test('Danh sách vi phạm: KOL/MCN ở /kiem-duyet/vi-pham, Nhãn hàng ở /vi-pham-kol (không vào trang của nhau)', () => {
    for (const r of ['kolhub.user.kol', 'kolhub.user.mcn'] as const) {
      expect(resolveAccess(r, '/kiem-duyet/vi-pham')).toEqual({ allow: true });
      expect(resolveAccess(r, '/vi-pham-kol')).toMatchObject({ allow: false, reason: 'forbidden' });
    }
    expect(resolveAccess('kolhub.user.biz', '/vi-pham-kol')).toEqual({ allow: true });
    expect(resolveAccess('kolhub.guest', '/vi-pham-kol')).toMatchObject({ allow: false, reason: 'login' });
  });
  test('Danh sách kênh: chỉ Nhãn hàng', () => {
    expect(resolveAccess('kolhub.user.biz', '/danh-sach-kenh')).toEqual({ allow: true });
    for (const r of ['kolhub.user.kol', 'kolhub.user.mcn'] as const)
      expect(resolveAccess(r, '/danh-sach-kenh')).toMatchObject({ allow: false, reason: 'forbidden' });
    expect(resolveAccess('kolhub.guest', '/danh-sach-kenh?kol=KOL-2026-0001')).toMatchObject({ allow: false, reason: 'login' });
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

const SAFETY_ROWS = [
  ['Kiểm tra video trước khi đăng', 'Video', '/kiem-duyet/video', 'Kiểm duyệt (KOL Safety)'],
  ['Kiểm duyệt kênh TikTok', 'TikTok', '/kiem-duyet/tiktok', 'Kiểm duyệt (KOL Safety)'],
  ['Kiểm duyệt kênh Facebook', 'Facebook', '/kiem-duyet/facebook', 'Kiểm duyệt (KOL Safety)'],
  ['Kiểm duyệt kênh YouTube', 'YouTube', '/kiem-duyet/youtube', 'Kiểm duyệt (KOL Safety)'],
  ['Danh sách vi phạm', 'Vi phạm', '/kiem-duyet/vi-pham', 'Kiểm duyệt (KOL Safety)'],
];

describe('bottomNavOf', () => {
  test('KOL/MCN: 4 tab + "Thêm" (MCN: Quản lý KOL; định danh, Facebook, YouTube, vi phạm)', () => {
    for (const [role, base] of [
      ['kolhub.user.kol', '/ho-so-kol'],
      ['kolhub.user.mcn', '/ho-so-mcn'],
    ] as const) {
      const nav = bottomNavOf(role);
      expect(nav.items.map((i) => [i.label, i.path])).toEqual([
        ['Liên hệ', `${base}/lien-he`],
        ['Kênh', `${base}/kenh`],
        ['Video', '/kiem-duyet/video'],
        ['Kiểm duyệt', '/kiem-duyet/tiktok'],
      ]);
      expect(nav.more.map((m) => m.label)).toEqual([
        ...(role === 'kolhub.user.mcn' ? ['Quản lý KOL'] : []),
        'Thông tin định danh',
        'Kiểm duyệt kênh Facebook',
        'Kiểm duyệt kênh YouTube',
        'Danh sách vi phạm',
      ]);
      // Every tab / "Thêm" item is a menu page the role may open.
      for (const p of [...nav.items.map((i) => i.path), ...nav.more.map((m) => m.path)])
        expect(resolveAccess(role, p)).toEqual({ allow: true });
    }
  });
  test('Nhãn hàng: 4 tab + "Thêm" (Tài khoản doanh nghiệp); khách: mọi mục menu là tab', () => {
    const nav = bottomNavOf('kolhub.user.biz');
    expect(nav.items.map((i) => [i.label, i.path])).toEqual([
      ['Tìm KOL', '/tim-kiem-kol'],
      ['Kênh', '/danh-sach-kenh'],
      ['Đã lưu', '/danh-sach-da-luu'],
      ['Vi phạm', '/vi-pham-kol'],
    ]);
    expect(nav.more.map((m) => m.path)).toEqual(['/tai-khoan-doanh-nghiep']);
    for (const p of [...nav.items.map((i) => i.path), ...nav.more.map((m) => m.path)])
      expect(resolveAccess('kolhub.user.biz', p)).toEqual({ allow: true });
    expect(bottomNavOf('kolhub.guest').items).toHaveLength(2);
    expect(bottomNavOf('kolhub.guest').more).toEqual([]);
  });
  test('tab "Kiểm duyệt" sáng ở trang kênh TikTok/Facebook/YouTube và chi tiết kênh, không ở trang Video', () => {
    const tab = bottomNavOf('kolhub.user.kol').items[3];
    for (const p of ['/kiem-duyet/tiktok', '/kiem-duyet/facebook', '/kiem-duyet/youtube/mon-1'])
      expect(isNavActive(p, tab)).toBe(true);
    expect(isNavActive('/kiem-duyet/video', tab)).toBe(false);
    expect(isNavActive('/ho-so-kol/kenh/', bottomNavOf('kolhub.user.kol').items[1])).toBe(true);
  });
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
      ['Quản lý kênh', 'Kênh', '/ho-so-kol/kenh', 'Hồ sơ KOL'],
      ...SAFETY_ROWS,
    ]);
    expect(ROLE_CONFIG['kolhub.user.mcn'].menu.map((m) => [m.label, m.shortLabel, m.path, m.group])).toEqual([
      ['Thông tin liên hệ', 'Liên hệ', '/ho-so-mcn/lien-he', 'Hồ sơ MCN'],
      ['Thông tin định danh', 'Định danh', '/ho-so-mcn/dinh-danh', 'Hồ sơ MCN'],
      ['Quản lý kênh', 'Kênh', '/ho-so-mcn/kenh', 'Hồ sơ MCN'],
      ['Quản lý KOL', 'KOL', '/ho-so-mcn/kol', 'Hồ sơ MCN'],
      ...SAFETY_ROWS,
    ]);
    expect(ROLE_CONFIG['kolhub.user.biz'].menu.map((m) => m.path)).toEqual([
      '/tim-kiem-kol',
      '/danh-sach-kenh',
      '/danh-sach-da-luu',
      '/vi-pham-kol',
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
    expect(getPageMeta('/ho-so-mcn/kol?tab=cho-xac-nhan', 'kolhub.user.mcn')).toEqual({
      title: 'Quản lý KOL',
      group: 'Tổ chức/MCN',
      description: 'Mời KOL, theo dõi lời mời và các KOL MCN đang quản lý',
    });
    expect(resolveAccess('kolhub.user.kol', '/ho-so-mcn/kol')).toMatchObject({ allow: false, reason: 'forbidden' });
    expect(getPageMeta('/tim-kiem-kol')).toMatchObject({ title: 'Tìm kiếm KOL', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/kiem-duyet/video', 'kolhub.user.mcn')).toEqual({
      title: 'Kiểm tra video trước khi đăng',
      group: 'Tổ chức/MCN',
      description: 'Tải video lên để phát hiện vi phạm trước khi đăng',
    });
    expect(getPageMeta('/kiem-duyet/tiktok', 'kolhub.user.kol')).toEqual({
      title: 'Kiểm duyệt kênh TikTok',
      group: 'Cá nhân/KOL',
      description: 'Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.',
    });
    expect(getPageMeta('/kiem-duyet/facebook')).toMatchObject({ title: 'Kiểm duyệt kênh Facebook' });
    expect(getPageMeta('/kiem-duyet/youtube/mon-1', 'kolhub.user.kol')).toEqual({
      title: 'Kiểm duyệt kênh YouTube',
      group: 'Cá nhân/KOL',
      description: 'Sức khoẻ kênh và kết quả quét video gần nhất',
    });
    expect(getPageMeta('/kiem-duyet/vi-pham', 'kolhub.user.mcn')).toMatchObject({ title: 'Danh sách vi phạm', group: 'Tổ chức/MCN' });
    expect(getPageMeta('/danh-sach-kenh')).toEqual({
      title: 'Danh sách kênh',
      group: 'Nhãn hàng/Agency',
      description: 'Các kênh đã xác thực, tìm theo nền tảng và lĩnh vực',
    });
    expect(getPageMeta('/vi-pham-kol')).toMatchObject({ title: 'Danh sách vi phạm', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/quen-mat-khau')).toMatchObject({ title: 'Quên mật khẩu', group: 'Khách' });
  });
});
