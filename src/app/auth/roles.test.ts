import { describe, expect, test } from 'vitest';
import { GUEST_PATHS, ROLE_CONFIG, bottomNavOf, getPageMeta, isNavActive, isPublicPath, resolveAccess, roleOf, safeReturnTo } from './roles';
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
      redirect: '/ho-so-kol/tong-quan',
      reason: 'forbidden',
    }));
  test('đã đăng nhập vào trang khách → màn mặc định, không báo lỗi', () =>
    expect(resolveAccess('kolhub.user.biz', '/dang-nhap')).toEqual({
      allow: false,
      redirect: '/tim-kiem-kol',
      reason: 'home',
    }));
  test('"/" và đường dẫn lạ → màn mặc định', () => {
    expect(resolveAccess('kolhub.user.mcn', '/')).toMatchObject({ redirect: '/ho-so-mcn/tong-quan', reason: 'home' });
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
    for (const p of ['/ho-so-kol', '/ho-so-kol/thong-tin#lien-he', '/ho-so-kol/lien-he', '/ho-so-kol/dinh-danh', '/ho-so-kol/kenh?them=1'])
      expect(resolveAccess('kolhub.user.mcn', p)).toEqual({ allow: false, redirect: '/ho-so-mcn/tong-quan', reason: 'forbidden' });
  });
  test('KOL vào Hồ sơ MCN → forbidden', () => {
    for (const p of ['/ho-so-mcn', '/ho-so-mcn/thong-tin', '/ho-so-mcn/lien-he', '/ho-so-mcn/dinh-danh', '/ho-so-mcn/kenh'])
      expect(resolveAccess('kolhub.user.kol', p)).toEqual({ allow: false, redirect: '/ho-so-kol/tong-quan', reason: 'forbidden' });
  });
  test('KOL/MCN vào được từng trang hồ sơ và đường dẫn gốc (chuyển hướng sang Tổng quan hồ sơ)', () => {
    for (const s of ['', '/tong-quan', '/thong-tin', '/thong-tin#nhan-su', '/lien-he', '/dinh-danh', '/kenh', '/kenh?them=1', '?tab=kenh']) {
      expect(resolveAccess('kolhub.user.kol', `/ho-so-kol${s}`)).toEqual({ allow: true });
      expect(resolveAccess('kolhub.user.mcn', `/ho-so-mcn${s}`)).toEqual({ allow: true });
    }
  });
  test('guest vào đường dẫn hồ sơ gốc → Đăng nhập', () =>
    expect(resolveAccess('kolhub.guest', '/ho-so-mcn')).toMatchObject({ reason: 'login' }));
  test('Sàn chiến dịch (/san, trang chiến dịch /san/<id>) mở cho mọi vai trò, kể cả khách; đường dẫn cũ /san-chien-dich cũng vậy', () => {
    for (const r of Object.keys(ROLE_CONFIG) as (keyof typeof ROLE_CONFIG)[])
      for (const p of ['/san', '/san/', '/san/cmp-1', '/san/cmp-1/', '/san/c%201?tab=x#hoi-dap', '/san?chien-dich=cmp-1', '/san-chien-dich?tab=da-luu'])
        expect(resolveAccess(r, p), `${r} ${p}`).toEqual({ allow: true });
    expect(isPublicPath('/san?q=abc')).toBe(true);
    expect(isPublicPath('/san/cmp-seed-sua-hat')).toBe(true);
    expect(isPublicPath('/sanxyz/cmp-1')).toBe(false);
    expect(isPublicPath('/sanxyz')).toBe(false);
    expect(resolveAccess('kolhub.guest', '/sanxyz')).toMatchObject({ reason: 'home' });
  });
  test('Chiến dịch của KOL/MCN: /chien-dich-cua-toi (+ đường dẫn cũ /booking); Nhãn hàng → forbidden; khách → Đăng nhập', () => {
    for (const r of ['kolhub.user.kol', 'kolhub.user.mcn'] as const)
      for (const p of ['/chien-dich-cua-toi', '/chien-dich-cua-toi?booking=bk-1', '/booking?tab=can-xu-ly'])
        expect(resolveAccess(r, p)).toEqual({ allow: true });
    expect(resolveAccess('kolhub.user.biz', '/chien-dich-cua-toi')).toMatchObject({ allow: false, reason: 'forbidden' });
    expect(resolveAccess('kolhub.guest', '/chien-dich-cua-toi')).toMatchObject({
      redirect: '/dang-nhap?returnTo=%2Fchien-dich-cua-toi',
      reason: 'login',
    });
    expect(resolveAccess('kolhub.user.kol', '/chien-dich')).toMatchObject({ allow: false, reason: 'forbidden' });
  });
  test('Nội dung (/bai-da-dang) và Thanh toán (/thu-nhap): KOL/MCN; Nhãn hàng → forbidden; khách → Đăng nhập', () => {
    for (const r of ['kolhub.user.kol', 'kolhub.user.mcn'] as const)
      for (const p of ['/bai-da-dang', '/bai-da-dang?nen-tang=tiktok&thoi-gian=90-ngay', '/thu-nhap', '/thu-nhap/'])
        expect(resolveAccess(r, p), `${r} ${p}`).toEqual({ allow: true });
    for (const p of ['/bai-da-dang', '/thu-nhap']) {
      expect(resolveAccess('kolhub.user.biz', p)).toEqual({ allow: false, redirect: '/tim-kiem-kol', reason: 'forbidden' });
      expect(resolveAccess('kolhub.guest', p)).toMatchObject({ allow: false, reason: 'login' });
    }
    expect(getPageMeta('/bai-da-dang', 'kolhub.user.kol')).toEqual({
      title: 'Nội dung',
      group: 'Cá nhân/KOL',
      description: 'Các bài đăng đã xác minh trong chiến dịch; chọn bài hiện trên hồ sơ cho Nhãn hàng xem',
    });
    expect(getPageMeta('/thu-nhap', 'kolhub.user.mcn')).toEqual({
      title: 'Thanh toán',
      group: 'Tổ chức/MCN',
      description: 'Theo dõi tiền và sản phẩm nhận từ chiến dịch (chỉ ghi nhận, thanh toán ngoài KOL Hub)',
    });
    expect(safeReturnTo('kolhub.user.kol', '/thu-nhap')).toBe('/thu-nhap');
  });
  test('Tin nhắn, Thông báo, Hỗ trợ: KOL/MCN và Nhãn hàng; Chiến dịch yêu thích, Đánh giá, Câu hỏi của tôi: chỉ KOL/MCN; khách → Đăng nhập', () => {
    const support = ['/ho-tro', '/ho-tro/huong-dan', '/ho-tro/faq', '/ho-tro/lien-he', '/ho-tro/lien-he/'];
    for (const r of ['kolhub.user.kol', 'kolhub.user.mcn', 'kolhub.user.biz'] as const)
      for (const p of ['/tin-nhan', '/tin-nhan?thread=bk-1', '/thong-bao', '/thong-bao?loc=chua-doc', ...support])
        expect(resolveAccess(r, p), `${r} ${p}`).toEqual({ allow: true });
    for (const r of ['kolhub.user.kol', 'kolhub.user.mcn'] as const)
      for (const p of ['/chien-dich-da-luu', '/chien-dich-da-luu?tab=da-ung-tuyen', '/cau-hoi-cua-toi', '/danh-gia', '/danh-gia?tab=cua-ban'])
        expect(resolveAccess(r, p), `${r} ${p}`).toEqual({ allow: true });
    for (const p of ['/chien-dich-da-luu', '/cau-hoi-cua-toi', '/danh-gia'])
      expect(resolveAccess('kolhub.user.biz', p)).toEqual({ allow: false, redirect: '/tim-kiem-kol', reason: 'forbidden' });
    for (const p of ['/tin-nhan', '/thong-bao', ...support, '/chien-dich-da-luu', '/cau-hoi-cua-toi', '/danh-gia'])
      expect(resolveAccess('kolhub.guest', p)).toMatchObject({ allow: false, reason: 'login' });
    // Thông báo is the header bell, Câu hỏi của tôi is linked from Liên hệ / Chiến dịch yêu thích: not menu items, own titles.
    for (const r of ['kolhub.user.kol', 'kolhub.user.mcn', 'kolhub.user.biz'] as const)
      for (const p of ['/thong-bao', '/cau-hoi-cua-toi']) expect(ROLE_CONFIG[r].menu.some((m) => m.path === p)).toBe(false);
    expect(getPageMeta('/thong-bao', 'kolhub.user.biz')).toEqual({
      title: 'Thông báo',
      group: 'Nhãn hàng/Agency',
      description: 'Lời mời, đề xuất, duyệt nội dung, thanh toán và tin nhắn mới',
    });
    expect(getPageMeta('/cau-hoi-cua-toi', 'kolhub.user.kol')).toEqual({
      title: 'Câu hỏi của tôi',
      group: 'Cá nhân/KOL',
      description: 'Câu hỏi bạn đã gửi Nhãn hàng trên Sàn chiến dịch',
    });
    // Same page, own label per side: "Cuộc trò chuyện" for KOL/MCN, "Tin nhắn" for brands.
    expect(getPageMeta('/tin-nhan?thread=x', 'kolhub.user.biz')).toMatchObject({ title: 'Tin nhắn', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/tin-nhan', 'kolhub.user.mcn')).toMatchObject({ title: 'Cuộc trò chuyện', group: 'Tổ chức/MCN' });
    expect(getPageMeta('/chien-dich-da-luu', 'kolhub.user.kol')).toMatchObject({ title: 'Chiến dịch yêu thích' });
    expect(getPageMeta('/danh-gia?tab=cua-ban', 'kolhub.user.mcn')).toMatchObject({ title: 'Đánh giá', group: 'Tổ chức/MCN' });
    // Hỗ trợ: one title per page for every role.
    for (const r of ['kolhub.user.mcn', 'kolhub.user.biz'] as const) {
      expect(getPageMeta('/ho-tro/huong-dan', r)).toMatchObject({ title: 'Hướng dẫn sử dụng', group: ROLE_CONFIG[r].label });
      expect(getPageMeta('/ho-tro/faq', r)).toMatchObject({ title: 'Câu hỏi thường gặp' });
      expect(getPageMeta('/ho-tro/lien-he', r)).toMatchObject({ title: 'Liên hệ hỗ trợ' });
    }
  });
  test('Nhãn hàng: một mục "Hỗ trợ" (mở Hướng dẫn), sáng trên cả ba trang hỗ trợ', () => {
    const item = ROLE_CONFIG['kolhub.user.biz'].menu.find((m) => m.label === 'Hỗ trợ')!;
    expect(item.path).toBe('/ho-tro/huong-dan');
    for (const p of ['/ho-tro/huong-dan', '/ho-tro/faq', '/ho-tro/lien-he']) expect(isNavActive(p, item), p).toBe(true);
    expect(isNavActive('/ho-tro-khac', item)).toBe(false);
    expect(isNavActive('/tin-nhan', item)).toBe(false);
    // KOL/MCN: each support page is its own item, only that one is active.
    const kolFaq = ROLE_CONFIG['kolhub.user.kol'].menu.find((m) => m.path === '/ho-tro/faq')!;
    expect(isNavActive('/ho-tro/faq', kolFaq)).toBe(true);
    expect(isNavActive('/ho-tro/lien-he', kolFaq)).toBe(false);
  });
  test('dấu / cuối vẫn khớp', () => expect(resolveAccess('kolhub.user.biz', '/danh-sach-da-luu/')).toEqual({ allow: true }));
});

describe('safeReturnTo', () => {
  test.each(['https://evil.com', '//evil.com', '/\\evil.com', '/tim-kiem-kol', null, ''])('safeReturnTo KOL bỏ qua %s', (r) =>
    expect(safeReturnTo('kolhub.user.kol', r)).toBe('/ho-so-kol/tong-quan'));
  test('safeReturnTo giữ đường dẫn hợp quyền', () =>
    expect(safeReturnTo('kolhub.user.biz', '/danh-sach-da-luu')).toBe('/danh-sach-da-luu'));
  test('safeReturnTo về trang con hồ sơ', () => {
    expect(safeReturnTo('kolhub.user.kol', '/ho-so-kol/kenh?them=1')).toBe('/ho-so-kol/kenh?them=1');
    expect(safeReturnTo('kolhub.user.mcn', '/ho-so-mcn/thong-tin#dinh-danh')).toBe('/ho-so-mcn/thong-tin#dinh-danh');
    expect(safeReturnTo('kolhub.user.kol', '/ho-so-mcn/kenh')).toBe('/ho-so-kol/tong-quan');
  });
  test('safeReturnTo về Sàn (kèm chiến dịch) cho mọi vai trò', () => {
    expect(safeReturnTo('kolhub.user.kol', '/san/cmp-1')).toBe('/san/cmp-1');
    expect(safeReturnTo('kolhub.user.mcn', '/san/cmp-1')).toBe('/san/cmp-1');
    expect(safeReturnTo('kolhub.user.biz', '/san/cmp-1')).toBe('/san/cmp-1');
    expect(safeReturnTo('kolhub.user.kol', '/san?chien-dich=cmp-1')).toBe('/san?chien-dich=cmp-1');
    expect(safeReturnTo('kolhub.user.biz', '/san')).toBe('/san');
  });
  test('safeReturnTo giữ query của đường dẫn hợp quyền', () =>
    expect(safeReturnTo('kolhub.user.biz', '/tim-kiem-kol?q=abc')).toBe('/tim-kiem-kol?q=abc'));
});

const SAFETY_ROWS = [
  ['Ứng dụng', 'Ứng dụng', '/ung-dung', 'Kiểm duyệt'],
  ['Vi phạm', 'Vi phạm', '/kiem-duyet/vi-pham', 'Kiểm duyệt'],
];

const ACTIVITY_ROWS = [
  ['Chiến dịch của tôi', 'Chiến dịch', '/chien-dich-cua-toi', 'Hoạt động của tôi'],
  ['Chiến dịch yêu thích', 'Yêu thích', '/chien-dich-da-luu', 'Hoạt động của tôi'],
  ['Đánh giá', 'Đánh giá', '/danh-gia', 'Hoạt động của tôi'],
];

const MANAGE_ROWS = [
  ['Cuộc trò chuyện', 'Trò chuyện', '/tin-nhan', 'Quản lý'],
  ['Nội dung', 'Nội dung', '/bai-da-dang', 'Quản lý'],
  ['Thanh toán', 'Thanh toán', '/thu-nhap', 'Quản lý'],
];

const SUPPORT_ROWS = [
  ['Hướng dẫn', 'Hướng dẫn', '/ho-tro/huong-dan', 'Hỗ trợ'],
  ['FAQ', 'FAQ', '/ho-tro/faq', 'Hỗ trợ'],
  ['Liên hệ', 'Liên hệ', '/ho-tro/lien-he', 'Hỗ trợ'],
];

describe('bottomNavOf', () => {
  test('KOL/MCN: 4 tab (Tổng quan, Chiến dịch, Yêu thích, Ứng dụng) + "Thêm" (các mục còn lại theo thứ tự nhóm menu)', () => {
    for (const [role, base] of [
      ['kolhub.user.kol', '/ho-so-kol'],
      ['kolhub.user.mcn', '/ho-so-mcn'],
    ] as const) {
      const nav = bottomNavOf(role);
      expect(nav.items.map((i) => [i.label, i.path])).toEqual([
        ['Tổng quan', `${base}/tong-quan`],
        ['Chiến dịch', '/chien-dich-cua-toi'],
        ['Yêu thích', '/chien-dich-da-luu'],
        ['Ứng dụng', '/ung-dung'],
      ]);
      expect(nav.more.map((m) => m.label)).toEqual([
        'Thông tin hồ sơ',
        'Quản lý kênh',
        ...(role === 'kolhub.user.mcn' ? ['Quản lý KOL'] : []),
        'Đánh giá',
        'Cuộc trò chuyện',
        'Nội dung',
        'Thanh toán',
        'Vi phạm',
        'Hướng dẫn',
        'FAQ',
        'Liên hệ',
      ]);
      // Tabs + "Thêm" cover the whole menu, each page once; every one opens for the role.
      const paths = [...nav.items.map((i) => i.path), ...nav.more.map((m) => m.path)];
      expect(new Set(paths).size).toBe(paths.length);
      expect([...paths].sort()).toEqual(ROLE_CONFIG[role].menu.map((m) => m.path).sort());
      for (const p of paths) expect(resolveAccess(role, p)).toEqual({ allow: true });
    }
  });
  test('Nhãn hàng: 4 tab + "Thêm" (Tin nhắn, Ứng dụng, Danh sách vi phạm, Tài khoản doanh nghiệp, Hỗ trợ); khách: mọi mục menu là tab', () => {
    const nav = bottomNavOf('kolhub.user.biz');
    expect(nav.items.map((i) => [i.label, i.path])).toEqual([
      ['Tìm KOL', '/tim-kiem-kol'],
      ['Chiến dịch', '/chien-dich'],
      ['Kênh', '/danh-sach-kenh'],
      ['Đã lưu', '/danh-sach-da-luu'],
    ]);
    expect(nav.more.map((m) => m.path)).toEqual(['/tin-nhan', '/ung-dung', '/vi-pham-kol', '/tai-khoan-doanh-nghiep', '/ho-tro/huong-dan']);
    expect(isNavActive('/chien-dich/cmp-1/sua', nav.items[1])).toBe(true);
    for (const p of [...nav.items.map((i) => i.path), ...nav.more.map((m) => m.path)])
      expect(resolveAccess('kolhub.user.biz', p)).toEqual({ allow: true });
    expect(bottomNavOf('kolhub.guest').items).toHaveLength(2);
    expect(bottomNavOf('kolhub.guest').more).toEqual([]);
  });
  test('tab "Ứng dụng" sáng ở /ung-dung; Chiến dịch và Tổng quan sáng ở trang của mình', () => {
    const tab = bottomNavOf('kolhub.user.kol').items[3];
    expect(isNavActive('/ung-dung', tab)).toBe(true);
    expect(isNavActive('/kiem-duyet/video', tab)).toBe(false);
    expect(isNavActive('/chien-dich-cua-toi/', bottomNavOf('kolhub.user.kol').items[1])).toBe(true);
    expect(isNavActive('/chien-dich', bottomNavOf('kolhub.user.kol').items[1])).toBe(false);
    expect(isNavActive('/ho-so-kol/tong-quan', bottomNavOf('kolhub.user.kol').items[0])).toBe(true);
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
    expect(ROLE_CONFIG['kolhub.user.kol']).toMatchObject({ label: 'Cá nhân/KOL', home: '/ho-so-kol/tong-quan' });
    expect(ROLE_CONFIG['kolhub.user.mcn']).toMatchObject({ label: 'Tổ chức/MCN', home: '/ho-so-mcn/tong-quan' });
    expect(ROLE_CONFIG['kolhub.user.biz']).toMatchObject({ label: 'Nhãn hàng/Agency', home: '/tim-kiem-kol' });
    expect(ROLE_CONFIG['kolhub.user.kol'].menu.map((m) => [m.label, m.shortLabel, m.path, m.group])).toEqual([
      ['Tổng quan hồ sơ', 'Tổng quan', '/ho-so-kol/tong-quan', 'Hồ sơ'],
      ['Thông tin hồ sơ', 'Hồ sơ', '/ho-so-kol/thong-tin', 'Hồ sơ'],
      ['Quản lý kênh', 'Kênh', '/ho-so-kol/kenh', 'Hồ sơ'],
      ...ACTIVITY_ROWS,
      ...MANAGE_ROWS,
      ...SAFETY_ROWS,
      ...SUPPORT_ROWS,
    ]);
    expect(ROLE_CONFIG['kolhub.user.mcn'].menu.map((m) => [m.label, m.shortLabel, m.path, m.group])).toEqual([
      ['Tổng quan hồ sơ', 'Tổng quan', '/ho-so-mcn/tong-quan', 'Hồ sơ'],
      ['Thông tin hồ sơ', 'Hồ sơ', '/ho-so-mcn/thong-tin', 'Hồ sơ'],
      ['Quản lý kênh', 'Kênh', '/ho-so-mcn/kenh', 'Hồ sơ'],
      ['Quản lý KOL', 'KOL', '/ho-so-mcn/kol', 'Hồ sơ'],
      ...ACTIVITY_ROWS,
      ...MANAGE_ROWS,
      ...SAFETY_ROWS,
      ...SUPPORT_ROWS,
    ]);
    // Brand menu unchanged except Hỗ trợ (opens the guide); it keeps "Tin nhắn" and its own "Danh sách vi phạm".
    expect(ROLE_CONFIG['kolhub.user.biz'].menu.map((m) => [m.label, m.path, m.group])).toEqual([
      ['Tìm kiếm KOL', '/tim-kiem-kol', 'Tìm KOL'],
      ['Danh sách kênh', '/danh-sach-kenh', 'Tìm KOL'],
      ['Danh sách đã lưu', '/danh-sach-da-luu', 'Tìm KOL'],
      ['Chiến dịch', '/chien-dich', 'Hợp tác'],
      ['Tin nhắn', '/tin-nhan', 'Hợp tác'],
      ['Ứng dụng', '/ung-dung', 'Kiểm duyệt'],
      ['Danh sách vi phạm', '/vi-pham-kol', 'Kiểm duyệt'],
      ['Tài khoản doanh nghiệp', '/tai-khoan-doanh-nghiep', 'Tài khoản'],
      ['Hỗ trợ', '/ho-tro/huong-dan', 'Hỗ trợ'],
    ]);
  });
  test('getPageMeta: Chiến dịch (Nhãn hàng) và các trang con', () => {
    expect(getPageMeta('/chien-dich?trang-thai=dang-mo', 'kolhub.user.biz')).toEqual({
      title: 'Chiến dịch',
      group: 'Nhãn hàng/Agency',
      description: 'Tạo chiến dịch, mời KOL/MCN, duyệt nội dung và theo dõi kết quả',
    });
    expect(getPageMeta('/chien-dich/tao').description).toMatch(/^Nhập brief/);
    expect(getPageMeta('/chien-dich/cmp-1').description).toMatch(/^Booking, đề xuất/);
    expect(getPageMeta('/chien-dich/cmp-1/sua')).toMatchObject({ title: 'Chiến dịch', description: 'Sửa thông tin chiến dịch (bản nháp hoặc đang mở)' });
    expect(resolveAccess('kolhub.user.biz', '/chien-dich/cmp-1')).toEqual({ allow: true });
    expect(resolveAccess('kolhub.user.kol', '/chien-dich')).toMatchObject({ allow: false, reason: 'forbidden' });
  });
  test('getPageMeta', () => {
    expect(getPageMeta('/san/cmp-1', 'kolhub.user.mcn')).toEqual({
      title: 'Sàn chiến dịch',
      group: 'Tổ chức/MCN',
      description: 'Chiến dịch Nhãn hàng đang tìm KOL: xem brief và gửi đề xuất ứng tuyển',
    });
    expect(getPageMeta('/chien-dich-cua-toi?tab=can-xu-ly', 'kolhub.user.kol')).toEqual({
      title: 'Chiến dịch của tôi',
      group: 'Cá nhân/KOL',
      description: 'Nhận lời mời, ứng tuyển và quản lý các chiến dịch đang thực hiện',
    });
    expect(getPageMeta('/ho-so-kol/thong-tin#lien-he')).toEqual({
      title: 'Thông tin hồ sơ',
      group: 'Cá nhân/KOL',
      description: 'Định danh (eKYC), thông tin liên hệ và nhân sự quản lý nội dung',
    });
    expect(getPageMeta('/ho-so-kol/tong-quan', 'kolhub.user.kol')).toEqual({
      title: 'Tổng quan hồ sơ',
      group: 'Cá nhân/KOL',
      description: 'Tình trạng các mục hồ sơ, gửi xét duyệt và theo dõi kết quả',
    });
    expect(getPageMeta('/ho-so-mcn/tong-quan', 'kolhub.user.mcn')).toMatchObject({ title: 'Tổng quan hồ sơ', group: 'Tổ chức/MCN' });
    expect(getPageMeta('/ho-so-mcn/thong-tin', 'kolhub.user.mcn')).toEqual({
      title: 'Thông tin hồ sơ',
      group: 'Tổ chức/MCN',
      description: 'Thông tin tổ chức, Giấy chứng nhận ĐKDN, liên hệ và nhân sự quản lý',
    });
    expect(getPageMeta('/ho-so-mcn/kenh?them=1')).toMatchObject({
      title: 'Quản lý kênh',
      description: 'Thêm kênh, ảnh quản lý kênh và trạng thái dấu xác thực',
    });
    expect(getPageMeta('/ho-so-mcn/kol?sap-xep=name', 'kolhub.user.mcn')).toEqual({
      title: 'Quản lý KOL',
      group: 'Tổ chức/MCN',
      description: 'Gán kênh của MCN cho KOL và xem KOL đang phụ trách kênh',
    });
    expect(resolveAccess('kolhub.user.kol', '/ho-so-mcn/kol')).toMatchObject({ allow: false, reason: 'forbidden' });
    expect(getPageMeta('/tim-kiem-kol')).toMatchObject({ title: 'Tìm kiếm KOL', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/ung-dung', 'kolhub.user.mcn')).toEqual({
      title: 'Ứng dụng',
      group: 'Tổ chức/MCN',
      description: 'KOL Safety và Brand Safety: mở công cụ kiểm duyệt nội dung',
    });
    expect(getPageMeta('/ung-dung', 'kolhub.user.biz')).toMatchObject({ title: 'Ứng dụng', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/kiem-duyet/vi-pham', 'kolhub.user.mcn')).toMatchObject({ title: 'Vi phạm', group: 'Tổ chức/MCN' });
    expect(getPageMeta('/danh-sach-kenh')).toEqual({
      title: 'Danh sách kênh',
      group: 'Nhãn hàng/Agency',
      description: 'Các kênh đã xác thực, tìm theo nền tảng và lĩnh vực',
    });
    expect(getPageMeta('/vi-pham-kol')).toMatchObject({ title: 'Danh sách vi phạm', group: 'Nhãn hàng/Agency' });
    expect(getPageMeta('/quen-mat-khau')).toMatchObject({ title: 'Quên mật khẩu', group: 'Khách' });
  });
});

describe('KOL Safety – Tổng hợp kênh (/kiem-duyet/kol-safety)', () => {
  test('KOL và MCN vào được; Nhãn hàng bị chặn; khách → Đăng nhập', () => {
    expect(resolveAccess('kolhub.user.kol', '/kiem-duyet/kol-safety')).toEqual({ allow: true });
    expect(resolveAccess('kolhub.user.mcn', '/kiem-duyet/kol-safety?kenh=ch-1')).toEqual({ allow: true });
    expect(resolveAccess('kolhub.user.biz', '/kiem-duyet/kol-safety')).toMatchObject({ allow: false, reason: 'forbidden' });
    expect(resolveAccess('kolhub.guest', '/kiem-duyet/kol-safety')).toMatchObject({ allow: false, reason: 'login' });
  });
  test('tiêu đề riêng, nhóm theo vai trò', () => {
    expect(getPageMeta('/kiem-duyet/kol-safety', 'kolhub.user.kol')).toMatchObject({
      title: 'KOL Safety – Tổng hợp kênh',
      group: 'Cá nhân/KOL',
    });
    expect(getPageMeta('/kiem-duyet/kol-safety/', 'kolhub.user.mcn')).toMatchObject({ group: 'Tổ chức/MCN' });
    expect(getPageMeta('/kiem-duyet/kol-safety').description).toMatch(/30 nội dung/);
  });
});
