import { expect, test } from 'vitest';
import { resolveAccess, roleOf } from '../auth/roles';
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

test('mỗi đường dẫn nhanh dùng tài khoản demo có thật và mở được với vai trò đó', () => {
  for (const g of DEMO_LINK_GROUPS)
    for (const l of g.links) {
      expect(DEMO_ACCOUNTS.some((d) => d.key === l.account && d.email)).toBe(true);
      const path = l.path.split('?')[0];
      expect(resolveAccess(ROLE_BY_ACCOUNT[l.account], path), `${l.label} → ${l.path}`).toEqual({ allow: true });
    }
  expect(roleOf(null)).toBe('kolhub.guest');
});
