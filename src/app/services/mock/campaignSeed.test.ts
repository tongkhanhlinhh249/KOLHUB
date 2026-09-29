import { describe, expect, test } from 'vitest';
import { allowedActions, isAcceptingApplications, routeKol } from './campaignRules';
import { SEED_AGENCY_ID, SEED_BOOKING, SEED_BRAND_ID, SEED_CAMPAIGN, SEED_KHANHVY_ID } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { seedState } from './seed';

describe('seed v9 — chiến dịch & booking', () => {
  const s = seedState();
  const now = Date.now();
  const campaign = (id: string) => s.campaigns.find((c) => c.id === id)!;
  const booking = (id: string) => s.bookings.find((b) => b.id === id)!;

  test('Nhãn hàng demo: 1 RUNNING riêng tư, 1 OPEN trên Sàn, 1 DRAFT; agency: 3 OPEN trên Sàn', () => {
    const mine = s.campaigns.filter((c) => c.brandAccountId === SEED_BRAND_ID);
    expect(mine.map((c) => [c.status, c.visibility])).toEqual([
      ['RUNNING', 'PRIVATE'],
      ['OPEN', 'MARKETPLACE'],
      ['DRAFT', 'PRIVATE'],
    ]);
    const agency = s.campaigns.filter((c) => c.brandAccountId === SEED_AGENCY_ID);
    expect(agency).toHaveLength(3);
    expect(agency.every((c) => c.status === 'OPEN' && c.visibility === 'MARKETPLACE' && isAcceptingApplications(c, now))).toBe(true);
    expect(new Set(agency.map((c) => c.categories[0])).size).toBe(3);
    expect(new Set(agency.map((c) => c.budget)).size).toBe(3);
    expect(s.brandPlans).toEqual({});
  });

  test('chiến dịch RUNNING: booking với Sao Việt ở CONTENT_REVIEW (có KOL Safety), VERIFIED chờ thanh toán, COMPLETED', () => {
    const review = booking(SEED_BOOKING.review);
    expect(review).toMatchObject({ campaignId: SEED_CAMPAIGN.running, supplierAccountId: SAOVIET, supplierType: 'MCN', status: 'CONTENT_REVIEW' });
    const drafts = review.contents.filter((c) => c.kind === 'DRAFT');
    expect(drafts.map((d) => d.status)).toEqual(['CHANGES_REQUESTED', 'PENDING']);
    expect(drafts.every((d) => d.safety && d.safety.issues.length > 0)).toBe(true);

    const verified = booking(SEED_BOOKING.verified);
    expect(verified.status).toBe('VERIFIED');
    expect(verified.payment).toEqual({});
    expect(verified.contents.find((c) => c.kind === 'POST')!.metrics!.views).toBeGreaterThan(0);
    expect(allowedActions(verified, 'VERIFIED', 'BRAND')).toContain('MARK_PAID');

    const completed = booking(SEED_BOOKING.completed);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.payment.brandMarkedAt).toBeLessThan(completed.payment.supplierConfirmedAt!);
    expect(completed.ratings?.brand?.stars).toBe(5);
  });

  test('Sàn: 1 đề xuất APPLIED của Sao Việt; Khánh Vy có 1 lời mời SENT trực tiếp', () => {
    expect(booking(SEED_BOOKING.application)).toMatchObject({
      campaignId: SEED_CAMPAIGN.marketplace,
      origin: 'APPLICATION',
      status: 'APPLIED',
      awaiting: 'BRAND',
      supplierAccountId: SAOVIET,
    });
    const vy = booking(SEED_BOOKING.khanhVyInvite);
    expect(vy).toMatchObject({ supplierType: 'KOL', supplierAccountId: SEED_KHANHVY_ID, status: 'SENT', awaiting: 'SUPPLIER' });
    expect(vy.items[0].channelId).toBeTruthy();
  });

  test('dữ liệu seed tuân theo quy tắc định tuyến và kênh hợp lệ', () => {
    for (const b of s.bookings) {
      for (const it of b.items) {
        const route = routeKol(s, it.kolAccountId, now);
        expect([b.supplierType, b.supplierAccountId]).toEqual([route.supplierType, route.supplierAccountId]);
        const ch = s.channels.find((c) => c.id === it.channelId)!;
        expect(ch.platform).toBe(it.platform);
        expect(campaign(b.campaignId).platforms).toContain(it.platform);
      }
    }
  });

  test('không dùng tên thương hiệu thật trong chiến dịch mẫu', () => {
    const text = JSON.stringify(s.campaigns).toLowerCase();
    expect(text).not.toMatch(/vinamilk|th true|netspace/);
  });
});
