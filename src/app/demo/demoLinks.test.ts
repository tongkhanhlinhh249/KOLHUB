import { expect, test } from 'vitest';
import { isPublicPath, resolveAccess, roleOf } from '../auth/roles';
import { DEMO_ACCOUNTS } from '../services/mock/identity';
import { DEMO_LINK_GROUPS } from './demoLinks';

const ROLE_BY_ACCOUNT = {
  'biz-new': 'kolhub.user.biz',
  'biz-verified': 'kolhub.user.biz',
  'mcn-new': 'kolhub.user.mcn',
  'mcn-verified': 'kolhub.user.mcn',
  'kol-new': 'kolhub.user.kol',
  'kol-verified': 'kolhub.user.kol',
} as const;

test('mỗi đường dẫn nhanh dùng tài khoản demo có thật và mở được với vai trò đó (Sàn /san công khai)', () => {
  for (const g of DEMO_LINK_GROUPS)
    for (const l of g.links) {
      expect(DEMO_ACCOUNTS.some((d) => d.key === l.account && d.email)).toBe(true);
      const path = l.path.split('?')[0];
      expect(resolveAccess(ROLE_BY_ACCOUNT[l.account], path), `${l.label} → ${l.path}`).toEqual({ allow: true });
    }
  // Public Sàn: open to everyone, guests included.
  const sanLinks = DEMO_LINK_GROUPS.flatMap((g) => g.links).filter((l) => isPublicPath(l.path));
  expect(sanLinks.map((l) => l.account).sort()).toEqual(['biz-verified', 'kol-new', 'kol-verified', 'mcn-verified']);
  for (const l of sanLinks) expect(resolveAccess('kolhub.guest', l.path)).toEqual({ allow: true });
  // Campaign pages use /san/<id> (never the old ?chien-dich= param).
  expect(sanLinks.some((l) => /^\/san\/[^/?]+$/.test(l.path))).toBe(true);
  for (const g of DEMO_LINK_GROUPS) for (const l of g.links) expect(l.path).not.toContain('chien-dich=');
  // No link points at the old paths (they only redirect).
  for (const g of DEMO_LINK_GROUPS) for (const l of g.links) expect(l.path).not.toMatch(/^\/(booking|san-chien-dich)(\?|$)/);
  // The Sàn's old tabs moved to "Chiến dịch yêu thích".
  for (const g of DEMO_LINK_GROUPS) for (const l of g.links) expect(l.path).not.toMatch(/^\/san\?.*tab=da-(luu|ung-tuyen)/);
  // New pages have quick links (Tin nhắn / Cuộc trò chuyện for all three sides, Thông báo, Hỗ trợ, Câu hỏi của tôi, Chiến dịch yêu thích, Đánh giá).
  const all = DEMO_LINK_GROUPS.flatMap((g) => g.links);
  for (const a of ['kol-verified', 'mcn-verified', 'biz-verified'] as const) expect(all.some((l) => l.account === a && l.path.startsWith('/tin-nhan'))).toBe(true);
  for (const p of ['/thong-bao', '/ho-tro/huong-dan', '/cau-hoi-cua-toi', '/chien-dich-da-luu', '/danh-gia']) expect(all.some((l) => l.path === p)).toBe(true);
  expect(roleOf(null)).toBe('kolhub.guest');
});
