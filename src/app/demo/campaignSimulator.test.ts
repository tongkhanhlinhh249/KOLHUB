import { expect, test } from 'vitest';
import { resolveAccess } from '../auth/roles';
import { createDb } from '../services/mock/db';
import { createDemoCampaignService } from '../services/mock/demoCampaign';
import { seedState } from '../services/mock/seed';
import { brandCampaignLink, demoAccountKeyOf, entriesFor, supplierBookingLink } from './campaignSimulator';
import { VERIFIED_KOL_EMAIL, VERIFIED_MCN_EMAIL } from '../services/mock/seed';

const ROLE = {
  'biz-new': 'kolhub.user.biz',
  'biz-verified': 'kolhub.user.biz',
  'mcn-new': 'kolhub.user.mcn',
  'mcn-verified': 'kolhub.user.mcn',
  'kol-new': 'kolhub.user.kol',
  'kol-verified': 'kolhub.user.kol',
} as const;

test('mỗi chiến dịch có booking mở được bằng tài khoản demo đúng vai trò (booking của KOL/MCN demo)', async () => {
  const svc = createDemoCampaignService({ db: createDb(null, seedState), now: Date.now, delay: false });
  const campaigns = (await svc.listCampaigns()).filter((c) => c.bookingCount > 0);
  expect(campaigns.length).toBeGreaterThan(0);
  for (const c of campaigns) {
    const link = brandCampaignLink(c.id, c.brandEmail);
    expect(link, c.name).not.toBeNull();
    expect(resolveAccess(ROLE[link!.account], link!.path.split('?')[0])).toEqual({ allow: true });
    const rows = await svc.listBookings(c.id);
    // Every campaign has at least one booking of a demo supplier; sample KOLs (applicants) have no demo login.
    expect(rows.some((r) => supplierBookingLink(r.view.id, r.supplierEmail, r.view.supplier.name)), c.name).toBe(true);
    for (const r of rows) {
      const s = supplierBookingLink(r.view.id, r.supplierEmail, r.view.supplier.name);
      if (!s) continue;
      expect(['kol-verified', 'mcn-verified']).toContain(s.account);
      expect(resolveAccess(ROLE[s!.account], s!.path.split('?')[0])).toEqual({ allow: true });
      expect(s!.path).toContain(`booking=${r.view.id}`);
    }
  }
});

test('tài khoản lạ → không có đường dẫn', () => {
  expect(demoAccountKeyOf('khong-co@example.com')).toBeNull();
  expect(demoAccountKeyOf(undefined)).toBeNull();
  expect(brandCampaignLink('x', 'khong-co@example.com')).toBeNull();
});

test('KOL/MCN chỉ thấy booking của chính mình; Nhãn hàng thấy tất cả', async () => {
  const svc = createDemoCampaignService({ db: createDb(null, seedState), now: Date.now, delay: false });
  const cs = await svc.listCampaigns();
  const entries = await Promise.all(cs.map(async (campaign) => ({ campaign, rows: await svc.listBookings(campaign.id) })));
  expect(entriesFor(entries, true, VERIFIED_KOL_EMAIL)).toBe(entries);
  for (const email of [VERIFIED_KOL_EMAIL, VERIFIED_MCN_EMAIL]) {
    const mine = entriesFor(entries, false, email);
    expect(mine.length, email).toBeGreaterThan(0);
    for (const e of mine) {
      expect(e.rows.length).toBeGreaterThan(0);
      for (const r of e.rows) expect(r.supplierEmail?.toLowerCase()).toBe(email.toLowerCase());
    }
  }
  expect(entriesFor(entries, false, 'khong-co@example.com')).toEqual([]);
  expect(entriesFor(entries, false, undefined)).toEqual([]);
});
