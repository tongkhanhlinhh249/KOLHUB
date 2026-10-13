import { describe, expect, test } from 'vitest';
import { allowedActions, isAcceptingApplications, isoDay, routeKol } from './campaignRules';
import { SEED_AGENCY_ID, SEED_BOOKING, SEED_BRAND_ID, SEED_CAMPAIGN, SEED_HISTORY, SEED_KHANHVY_ID } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { seedState } from './seed';

describe('seed v9 — chiến dịch & booking', () => {
  const s = seedState();
  const now = Date.now();
  const campaign = (id: string) => s.campaigns.find((c) => c.id === id)!;
  const booking = (id: string) => s.bookings.find((b) => b.id === id)!;

  test('Nhãn hàng demo: Booking 1 KOL — 3 đã chọn KOL (đóng tuyển), 1 riêng tư đang mời, 3 trên Sàn đang tuyển, 1 nháp, 1 chờ duyệt; Booking nhiều KOL đã đóng tuyển; lịch sử 4 hoàn tất + 1 đã chọn KOL', () => {
    const mine = s.campaigns.filter((c) => c.brandAccountId === SEED_BRAND_ID);
    expect(mine.map((c) => [c.status, c.visibility])).toEqual([
      ['CLOSED', 'PRIVATE'],
      ['OPEN', 'MARKETPLACE'],
      ['OPEN', 'PRIVATE'],
      ['CLOSED', 'PRIVATE'],
      ['CLOSED', 'PRIVATE'],
      ['DRAFT', 'PRIVATE'],
      ['PENDING_REVIEW', 'MARKETPLACE'],
      ['OPEN', 'MARKETPLACE'],
      ['OPEN', 'MARKETPLACE'],
      ['CLOSED', 'MARKETPLACE'],
      ['COMPLETED', 'PRIVATE'],
      ['COMPLETED', 'PRIVATE'],
      ['COMPLETED', 'PRIVATE'],
      ['COMPLETED', 'PRIVATE'],
      ['CLOSED', 'PRIVATE'],
    ]);
    // Booking 1 KOL: không chiến dịch nào có quá 1 booking đã chốt, mọi nhóm 1 suất.
    for (const c of mine.filter((x) => x.type !== 'OPEN_RECRUITMENT')) {
      const confirmed = s.bookings.filter((b) => b.campaignId === c.id && !['SENT', 'APPLIED', 'NEGOTIATING', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(b.status));
      expect(confirmed.length, c.id).toBeLessThanOrEqual(1);
      expect((c.groups ?? []).every((g) => g.slots === 1), c.id).toBe(true);
    }
    expect(s.bookings.filter((b) => b.campaignId === SEED_CAMPAIGN.marketplace && b.status === 'APPLIED').length).toBeGreaterThanOrEqual(3);
    const agency = s.campaigns.filter((c) => c.brandAccountId === SEED_AGENCY_ID);
    expect(agency).toHaveLength(6);
    const agencyOpen = agency.filter((c) => c.id !== SEED_CAMPAIGN.recruitPosting);
    expect(agencyOpen.every((c) => c.status === 'OPEN' && c.visibility === 'MARKETPLACE' && isAcceptingApplications(c, now))).toBe(true);
    expect(s.campaigns.find((c) => c.id === SEED_CAMPAIGN.recruitPosting)!.status).toBe('CLOSED');
    expect(new Set(agency.map((c) => c.categories[0])).size).toBeGreaterThanOrEqual(4);
    expect(new Set(agency.map((c) => c.budget)).size).toBe(6);
    expect(s.brandPlans).toEqual({});
  });

  test('v10 — Sàn đa dạng: 1 chiến dịch sắp hết hạn (≤ 2 ngày), 1 chỉ YouTube, 1 livestream Facebook; chiến dịch đã lưu', () => {
    const open = s.campaigns.filter((c) => isAcceptingApplications(c, now));
    expect(open).toHaveLength(8);
    const soon = campaign(SEED_CAMPAIGN.yogurt);
    expect(soon.applyDeadline! <= isoDay(now + 2 * 86_400_000)).toBe(true);
    expect(campaign(SEED_CAMPAIGN.agencyHeadphones).platforms).toEqual(['youtube']);
    expect(campaign(SEED_CAMPAIGN.livestream).deliverables.some((d) => d.type === 'LIVESTREAM' && d.platform === 'facebook')).toBe(true);
    expect(s.savedCampaigns.filter((x) => x.accountId === SAOVIET).map((x) => x.campaignId).sort()).toEqual(
      [SEED_CAMPAIGN.agencyTravel, SEED_CAMPAIGN.yogurt].sort(),
    );
    expect(s.savedCampaigns.filter((x) => x.accountId === SEED_KHANHVY_ID).map((x) => x.campaignId)).toEqual([SEED_CAMPAIGN.agencyEnglish]);
  });

  test('v11 — mọi chiến dịch mẫu có ảnh chiến dịch (ảnh JPG từ kho ảnh mẫu), các chiến dịch trên Sàn không trùng ảnh', () => {
    expect(s.campaigns).toHaveLength(21);
    for (const c of s.campaigns) {
      expect(c.cover).toMatchObject({ type: 'image/jpeg' });
      expect(c.cover!.thumbnail).toMatch(/^https:\/\//);
      expect(c.cover!.size).toBeLessThanOrEqual(10 * 1024 * 1024);
    }
    const open = s.campaigns.filter((c) => isAcceptingApplications(c, now));
    expect(new Set(open.map((c) => c.cover!.thumbnail)).size).toBe(open.length);
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

  test('v13 — lịch sử hợp tác: Khánh Vy và Sao Việt có nhiều bài đã xác minh, đánh giá và thanh toán qua nhiều tháng', () => {
    const verifiedPosts = (acc: string) =>
      s.bookings.filter((b) => b.supplierAccountId === acc).flatMap((b) => b.contents.filter((c) => c.kind === 'POST' && c.verifiedAt && c.metrics));
    expect(verifiedPosts(SEED_KHANHVY_ID).length).toBeGreaterThanOrEqual(3);
    expect(verifiedPosts(SAOVIET).length).toBeGreaterThanOrEqual(5);
    // One Sao Việt post is hidden from the public profile to show the toggle.
    expect(verifiedPosts(SAOVIET).filter((c) => c.hiddenOnProfile)).toHaveLength(1);
    const months = new Set(
      s.bookings.filter((b) => b.supplierAccountId === SEED_KHANHVY_ID && b.payment.supplierConfirmedAt).map((b) => new Date(b.payment.supplierConfirmedAt!).getMonth()),
    );
    expect(months.size).toBeGreaterThanOrEqual(2);
    expect(booking(SEED_HISTORY.vyHomeOffice)).toMatchObject({ status: 'VERIFIED', payment: { brandMarkedAt: expect.any(Number) } });
    expect(booking(SEED_HISTORY.vyHomeOffice).payment.supplierConfirmedAt).toBeUndefined();
    for (const id of [SEED_HISTORY.vySummer, SEED_HISTORY.vyShoes, SEED_HISTORY.saoVietSummer, SEED_HISTORY.saoVietShoes]) {
      expect(booking(id).status).toBe('COMPLETED');
      expect(booking(id).ratings?.brand?.stars).toBeGreaterThanOrEqual(4);
    }
    // Past campaigns are after the brand registered.
    const brandSince = Date.parse(s.accounts.find((a) => a.id === SEED_BRAND_ID)!.createdAt);
    expect(s.campaigns.filter((c) => c.brandAccountId === SEED_BRAND_ID).every((c) => c.createdAt >= brandSince)).toBe(true);
  });

  test('không dùng tên thương hiệu thật trong chiến dịch mẫu', () => {
    const text = JSON.stringify(s.campaigns).toLowerCase();
    expect(text).not.toMatch(/vinamilk|th true|netspace/);
  });
});
