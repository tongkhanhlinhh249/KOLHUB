import { beforeEach, describe, expect, test } from 'vitest';
import { createBookingService } from './booking';
import { SEED_BOOKING, SEED_CAMPAIGN } from './campaignSeed';
import { effectiveStatus, postMatchesPlatform } from './campaignRules';
import { actingAs, createDemoCampaignService, demoSteps, expireBooking, resetCampaignData, samplePostUrl } from './demoCampaign';
import { makeHarness, type Harness } from './testHarness';

const BRAND = 'acc-biz-demo';
let h: Harness;
let demo: ReturnType<typeof createDemoCampaignService>;
let seq = 0;

const stored = (id: string) => h.db.read().bookings.find((b) => b.id === id)!;
const statusOf = (id: string) => {
  const s = h.db.read();
  const b = s.bookings.find((x) => x.id === id)!;
  return effectiveStatus(
    b,
    s.campaigns.find((c) => c.id === b.campaignId),
    h.now(),
  );
};
const stepsOf = (id: string) => demoSteps(stored(id), statusOf(id));

beforeEach(() => {
  h = makeHarness();
  h.clock.t = Date.now();
  seq = 0;
  demo = createDemoCampaignService({ db: h.db, now: h.now, delay: false, genId: () => `demo-${++seq}` });
  h.db.update((s) => {
    s.sessionAccountId = BRAND;
  });
});

describe('chế độ demo: quản lý chiến dịch', () => {
  test('chạy trọn vòng lời mời KOL lẻ → Hoàn tất, phiên đăng nhập không đổi', async () => {
    const id = SEED_BOOKING.khanhVyInvite;
    expect(stepsOf(id)).toMatchObject({ next: 'SUPPLIER', primary: { key: 'SUPPLIER_ACCEPT', actor: 'SUPPLIER' } });

    const flow: [string, string][] = [
      ['SUPPLIER_ACCEPT', 'ACCEPTED'],
      ['SUBMIT_DRAFT', 'CONTENT_REVIEW'],
      ['APPROVE_CONTENT', 'CONTENT_APPROVED'],
      ['SUBMIT_POST', 'VERIFIED'],
      ['MARK_PAID', 'VERIFIED'],
      ['CONFIRM_PAID', 'COMPLETED'],
    ];
    for (const [key, status] of flow) {
      expect(stepsOf(id).primary?.key).toBe(key);
      await demo.run(id, key as never);
      expect(statusOf(id)).toBe(status);
    }
    const b = stored(id);
    // KOL Safety scanned the sample draft; the post was verified with metrics.
    expect(b.contents.find((x) => x.kind === 'DRAFT')?.safety?.verdict).toBeTruthy();
    expect(b.contents.filter((x) => x.kind === 'POST').every((x) => x.verifiedAt && x.metrics)).toBe(true);
    expect(b.history.map((e) => e.action)).toEqual(
      expect.arrayContaining(['ACCEPTED', 'DRAFT_SUBMITTED', 'CONTENT_APPROVED', 'POST_SUBMITTED', 'POST_VERIFIED', 'PAYMENT_MARKED', 'PAYMENT_CONFIRMED']),
    );
    expect(stepsOf(id).primary?.key).toBe('RATE');
    await demo.run(id, 'RATE');
    expect(stored(id).ratings).toMatchObject({ brand: { stars: 5 }, supplier: { stars: 5 } });
    expect(stepsOf(id)).toEqual({ secondary: [], next: null });
    expect(h.db.read().sessionAccountId).toBe(BRAND);
  });

  test('ứng tuyển: trả giá qua lại rồi chốt; yêu cầu sửa nội dung rồi nộp lại', async () => {
    const id = SEED_BOOKING.application;
    expect(stepsOf(id)).toMatchObject({ next: 'BRAND', primary: { key: 'BRAND_ACCEPT' } });
    await demo.run(id, 'BRAND_COUNTER');
    expect(stored(id)).toMatchObject({ status: 'NEGOTIATING', awaiting: 'SUPPLIER', price: 54_000_000 });
    await demo.run(id, 'SUPPLIER_COUNTER');
    expect(stored(id)).toMatchObject({ awaiting: 'BRAND', price: 59_500_000 });
    await demo.run(id, 'BRAND_ACCEPT');
    expect(statusOf(id)).toBe('ACCEPTED');
    expect(h.db.read().campaigns.find((c) => c.id === SEED_CAMPAIGN.marketplace)?.status).toBe('RUNNING');
    await demo.run(id, 'SUBMIT_DRAFT');
    await demo.run(id, 'REQUEST_CHANGES');
    expect(statusOf(id)).toBe('IN_PRODUCTION');
    await demo.run(id, 'SUBMIT_DRAFT');
    await demo.run(id, 'APPROVE_CONTENT');
    await demo.run(id, 'SUBMIT_POST');
    // Two items (YouTube + TikTok) → one verified post each.
    expect(stored(id).contents.filter((x) => x.kind === 'POST')).toHaveLength(2);
    expect(statusOf(id)).toBe('VERIFIED');
  });

  test('từ chối và cho hết hạn', async () => {
    await demo.run(SEED_BOOKING.khanhVyInvite, 'DECLINE');
    expect(statusOf(SEED_BOOKING.khanhVyInvite)).toBe('DECLINED');
    expect(stored(SEED_BOOKING.khanhVyInvite).history.at(-1)).toMatchObject({ by: 'SUPPLIER', action: 'DECLINED' });

    expect(stepsOf(SEED_BOOKING.application).secondary.map((s) => s.key)).toContain('EXPIRE');
    await demo.run(SEED_BOOKING.application, 'EXPIRE');
    expect(statusOf(SEED_BOOKING.application)).toBe('EXPIRED');
    expect(stepsOf(SEED_BOOKING.application)).toEqual({ secondary: [], next: null });
    expect(() => h.db.update((s) => expireBooking(s, SEED_BOOKING.application, h.now()))).toThrow();
  });

  test('bước không được phép → 4805, không đổi dữ liệu', async () => {
    const before = JSON.stringify(h.db.read());
    await expect(demo.run(SEED_BOOKING.review, 'MARK_PAID')).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(demo.run(SEED_BOOKING.completed, 'DECLINE')).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(demo.run('khong-co', 'DECLINE')).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    expect(JSON.stringify(h.db.read())).toBe(before);
  });

  test('lời mời chưa có kênh: KOL/MCN nhận lời tự gán kênh phù hợp', async () => {
    h.db.update((s) => {
      delete s.bookings.find((b) => b.id === SEED_BOOKING.khanhVyInvite)!.items[0].channelId;
    });
    await demo.run(SEED_BOOKING.khanhVyInvite, 'SUPPLIER_ACCEPT');
    expect(statusOf(SEED_BOOKING.khanhVyInvite)).toBe('ACCEPTED');
    expect(stored(SEED_BOOKING.khanhVyInvite).items[0].channelId).toBeTruthy();
  });

  test('danh sách chiến dịch và booking: chiến dịch có booking lên đầu, ai cần thao tác tiếp', async () => {
    const list = await demo.listCampaigns();
    expect(list.slice(0, 2).map((c) => c.id).sort()).toEqual([SEED_CAMPAIGN.marketplace, SEED_CAMPAIGN.running].sort());
    expect(list.find((c) => c.id === SEED_CAMPAIGN.running)).toMatchObject({ bookingCount: 4, brandEmail: expect.any(String) });
    const rows = await demo.listBookings(SEED_CAMPAIGN.running);
    expect(rows).toHaveLength(4);
    const byId = Object.fromEntries(rows.map((r) => [r.view.id, r]));
    expect(byId[SEED_BOOKING.review].steps.next).toBe('BRAND');
    expect(byId[SEED_BOOKING.verified].steps.primary?.key).toBe('MARK_PAID');
    expect(byId[SEED_BOOKING.khanhVyInvite].supplierEmail).toBeTruthy();
  });

  test('khôi phục chiến dịch mẫu: chỉ dữ liệu chiến dịch, giữ phiên và tài khoản', async () => {
    await demo.run(SEED_BOOKING.khanhVyInvite, 'DECLINE');
    h.db.update((s) => {
      s.accounts[0].phone = '0900000000';
    });
    await demo.resetCampaigns();
    const s = h.db.read();
    expect(s.bookings.find((b) => b.id === SEED_BOOKING.khanhVyInvite)?.status).toBe('SENT');
    expect(s.sessionAccountId).toBe(BRAND);
    expect(s.accounts[0].phone).toBe('0900000000');
    const into = h.db.read();
    resetCampaignData(into);
    expect(into.campaigns.map((c) => c.id)).toEqual(s.campaigns.map((c) => c.id));
  });

  test('actingAs chỉ đổi phiên trong lúc chạy; link bài mẫu qua được xác minh nền tảng', async () => {
    const svc = createBookingService({ db: actingAs(h.db, 'acc-kol-2026-0001'), now: h.now, delay: false });
    expect((await svc.get(SEED_BOOKING.khanhVyInvite)).viewer).toBe('SUPPLIER');
    expect(h.db.read().sessionAccountId).toBe(BRAND);
    for (const p of ['tiktok', 'youtube', 'facebook'] as const) expect(postMatchesPlatform(samplePostUrl(p, '@kenh', 'x'), p)).toBe(true);
  });
});
