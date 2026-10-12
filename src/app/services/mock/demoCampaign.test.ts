import { beforeEach, describe, expect, test } from 'vitest';
import { createBookingService } from './booking';
import { SEED_BOOKING, SEED_CAMPAIGN, SEED_HISTORY } from './campaignSeed';
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

  test('ứng tuyển: Nhãn hàng duyệt theo thù lao cố định (không trả giá); yêu cầu sửa nội dung rồi nộp lại', async () => {
    const id = SEED_BOOKING.application;
    expect(stepsOf(id)).toMatchObject({ next: 'BRAND', primary: { key: 'BRAND_ACCEPT' } });
    expect(stepsOf(id).secondary.map((s) => s.key)).toEqual(['DECLINE', 'EXPIRE']);
    await demo.run(id, 'BRAND_ACCEPT');
    expect(statusOf(id)).toBe('ACCEPTED');
    expect(stored(id).price).toBe(40_000_000);
    expect(h.db.read().campaigns.find((c) => c.id === SEED_CAMPAIGN.marketplace)?.status).toBe('OPEN');
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
    const firstEmpty = list.findIndex((c) => c.bookingCount === 0);
    expect(list.slice(0, firstEmpty).map((c) => c.id).sort()).toEqual(
      [
        SEED_CAMPAIGN.marketplace,
        SEED_CAMPAIGN.running,
        SEED_CAMPAIGN.recruitSelecting,
        SEED_CAMPAIGN.recruitPosting,
        SEED_HISTORY.summerCampaign,
        SEED_HISTORY.runningShoesCampaign,
        SEED_HISTORY.homeOfficeCampaign,
      ].sort(),
    );
    expect(list.slice(firstEmpty).every((c) => c.bookingCount === 0)).toBe(true);
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

describe('chế độ demo: Tuyển nhiều KOL', () => {
  const recruitSteps = (id: string) => {
    const s = h.db.read();
    const b = s.bookings.find((x) => x.id === id)!;
    const c = s.campaigns.find((x) => x.id === b.campaignId)!;
    return demoSteps(b, statusOf(id), { campaign: c, now: h.now() });
  };
  const ofCampaign = (id: string) => h.db.read().bookings.filter((b) => b.campaignId === id);

  test('ứng viên mẫu → sang Chọn lọc → chọn đủ suất → Đăng bài: gửi / nhận sản phẩm, nộp nháp, đăng, hoàn tất', async () => {
    const cid = SEED_CAMPAIGN.livestream; // Ứng tuyển, có sản phẩm, Duyệt nháp bật
    expect(await demo.simulateApplicants(cid, 3)).toBeGreaterThan(0);
    const applied = ofCampaign(cid);
    expect(applied.every((b) => b.status === 'APPLIED' && b.price === 0 && !!b.application?.shipping)).toBe(true);
    expect(applied.some((b) => b.supplierAccountId === 'acc-kol-2026-0001')).toBe(true); // Khánh Vy (đăng nhập demo) đi đầu
    expect(recruitSteps(applied[0].id).primary).toBeUndefined();
    expect(recruitSteps(applied[0].id).waiting).toMatch(/Chọn lọc/);
    await expect(demo.pickWinners(cid)).rejects.toMatchObject({ code: 'KOLHUB-4819' });

    expect(await demo.advancePhase(cid)).toBe('SELECT');
    expect(recruitSteps(applied[0].id).primary?.key).toBe('SELECT');
    const picked = await demo.pickWinners(cid);
    expect(picked).toBe(applied.length); // 5 suất ≥ số ứng viên
    expect((await demo.listCampaigns()).find((c) => c.id === cid)).toMatchObject({ selected: applied.length, waiting: 0, phase: 'SELECT' });

    expect(await demo.advancePhase(cid)).toBe('POST');
    const id = applied[0].id;
    const flow: [string, string][] = [
      ['PRODUCT_SENT', 'ACCEPTED'],
      ['PRODUCT_RECEIVED', 'ACCEPTED'],
      ['SUBMIT_DRAFT', 'CONTENT_REVIEW'],
      ['APPROVE_CONTENT', 'CONTENT_APPROVED'],
      ['SUBMIT_POST', 'VERIFIED'],
      ['MARK_PAID', 'VERIFIED'],
      ['CONFIRM_PAID', 'COMPLETED'],
    ];
    for (const [key, status] of flow) {
      expect(recruitSteps(id).primary?.key).toBe(key);
      await demo.run(id, key as never);
      expect(statusOf(id)).toBe(status);
    }
    expect(stored(id).shipment).toMatchObject({ sentAt: expect.any(Number), receivedAt: expect.any(Number) });
    expect(await demo.advancePhase(cid)).toBe('REVIEW');
    expect(await demo.advancePhase(cid)).toBe('ENDED');
    await expect(demo.advancePhase(cid)).rejects.toMatchObject({ code: 'KOLHUB-4819' });
  });

  test('Workflow tắt: được chọn → đăng thẳng (không có bước nháp); bật/tắt Duyệt nháp từ demo', async () => {
    const cid = SEED_CAMPAIGN.agencyChallenge; // Duyệt nháp tắt, chỉ tiền mặt
    await demo.simulateApplicants(cid, 1);
    await demo.advancePhase(cid);
    await demo.pickWinners(cid);
    const id = ofCampaign(cid)[0].id;
    expect(statusOf(id)).toBe('ACCEPTED');
    expect(recruitSteps(id).primary).toMatchObject({ key: 'SUBMIT_POST', label: expect.stringContaining('không duyệt nháp') });
    await demo.run(id, 'SUBMIT_POST');
    expect(statusOf(id)).toBe('VERIFIED');
    expect(stored(id).contents.some((c) => c.kind === 'DRAFT')).toBe(false);

    expect(await demo.toggleDraftReview(cid)).toBe(true);
    expect(await demo.toggleDraftReview(cid)).toBe(false);
  });

  test('chọn / không chọn ngay trên hàng booking trong giai đoạn Chọn lọc', async () => {
    const waiting = ofCampaign(SEED_CAMPAIGN.recruitSelecting).filter((b) => b.status === 'APPLIED');
    await demo.run(waiting[0].id, 'SELECT');
    expect(statusOf(waiting[0].id)).toBe('ACCEPTED');
    await demo.run(waiting[1].id, 'DECLINE');
    expect(statusOf(waiting[1].id)).toBe('DECLINED');
    expect(stored(waiting[1].id).history.at(-1)!.action).toBe('NOT_SELECTED');
  });
});
