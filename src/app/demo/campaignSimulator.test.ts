import { expect, test } from 'vitest';
import { resolveAccess } from '../auth/roles';
import { createDb } from '../services/mock/db';
import { createDemoCampaignService } from '../services/mock/demoCampaign';
import { seedState } from '../services/mock/seed';
import { actorName, brandCampaignLink, demoAccountKeyOf, supplierBookingLink } from './campaignSimulator';

const ROLE = {
  'biz-new': 'kolhub.user.biz',
  'biz-verified': 'kolhub.user.biz',
  'mcn-new': 'kolhub.user.mcn',
  'mcn-verified': 'kolhub.user.mcn',
  'kol-new': 'kolhub.user.kol',
  'kol-verified': 'kolhub.user.kol',
} as const;

test('mỗi chiến dịch / booking có booking mở được bằng tài khoản demo đúng vai trò', async () => {
  const svc = createDemoCampaignService({ db: createDb(null, seedState), now: Date.now, delay: false });
  const campaigns = (await svc.listCampaigns()).filter((c) => c.bookingCount > 0);
  expect(campaigns.length).toBeGreaterThan(0);
  for (const c of campaigns) {
    const link = brandCampaignLink(c.id, c.brandEmail);
    expect(link, c.name).not.toBeNull();
    expect(resolveAccess(ROLE[link!.account], link!.path.split('?')[0])).toEqual({ allow: true });
    for (const r of await svc.listBookings(c.id)) {
      const s = supplierBookingLink(r.view.id, r.supplierEmail, r.view.supplier.name);
      expect(s, r.view.id).not.toBeNull();
      expect(['kol-verified', 'mcn-verified']).toContain(s!.account);
      expect(resolveAccess(ROLE[s!.account], s!.path.split('?')[0])).toEqual({ allow: true });
      expect(s!.path).toContain(`booking=${r.view.id}`);
    }
  }
});

test('tài khoản lạ → không có đường dẫn; tên người thao tác', () => {
  expect(demoAccountKeyOf('khong-co@example.com')).toBeNull();
  expect(demoAccountKeyOf(undefined)).toBeNull();
  expect(brandCampaignLink('x', 'khong-co@example.com')).toBeNull();
  expect(actorName('BRAND', 'Sao Việt Media')).toBe('Nhãn hàng');
  expect(actorName('SUPPLIER', 'Sao Việt Media')).toBe('Sao Việt Media');
  expect(actorName('SYSTEM', 'Sao Việt Media')).toBe('Hệ thống');
});
