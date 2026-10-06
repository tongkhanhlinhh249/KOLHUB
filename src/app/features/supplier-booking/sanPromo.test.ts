import { expect, test } from 'vitest';
import { resolveAccess } from '../../auth/roles';
import { SAN_CATEGORY_TILES, sanPromo } from './sanPromo';

test('CTA của banner theo người xem: khách đăng ký/đăng nhập, KOL/MCN hoàn thiện hồ sơ, Nhãn hàng tạo chiến dịch', () => {
  expect(sanPromo('guest')).toEqual({
    apply: { label: 'Đăng ký tài khoản KOL', to: '/dang-ky?loai=kol' },
    brand: { label: 'Liên hệ tư vấn', to: '/dang-ky?loai=biz' },
    guide: { label: 'Xem hướng dẫn', to: '/dang-nhap?returnTo=%2Fho-tro%2Fhuong-dan' },
    guideTile: '/dang-nhap?returnTo=%2Fho-tro%2Fhuong-dan',
    brandTile: '/dang-ky?loai=biz',
  });
  expect(sanPromo('supplier', 'KOL').apply).toEqual({ label: 'Hoàn thiện hồ sơ', to: '/ho-so-kol/tong-quan' });
  expect(sanPromo('supplier', 'MCN').apply.to).toBe('/ho-so-mcn/tong-quan');
  expect(sanPromo('supplier', 'MCN').brand.to).toBe('/ho-tro/lien-he');
  expect(sanPromo('brand').brand).toEqual({ label: 'Tạo chiến dịch', to: '/chien-dich/tao' });
  // Every target opens for that viewer (guests: only public / guest pages).
  const role = { guest: 'kolhub.guest', supplier: 'kolhub.user.kol', brand: 'kolhub.user.biz' } as const;
  for (const v of ['guest', 'supplier', 'brand'] as const) {
    const p = sanPromo(v, 'KOL');
    for (const to of [p.apply.to, p.brand.to, p.guide.to, p.guideTile, p.brandTile])
      expect(resolveAccess(role[v], to.split('#')[0]), `${v} ${to}`).toEqual({ allow: true });
  }
});

test('ô lĩnh vực: mọi lĩnh vực chiến dịch trừ "Khác", mỗi ô có màu nền', () => {
  const names = SAN_CATEGORY_TILES.map((t) => t.category);
  expect(names).toContain('Làm đẹp');
  expect(names).toContain('Du lịch');
  expect(names).not.toContain('Khác');
  expect(SAN_CATEGORY_TILES.every((t) => /^bg-/.test(t.tone))).toBe(true);
});
