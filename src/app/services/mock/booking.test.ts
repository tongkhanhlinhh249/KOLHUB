import { beforeEach, describe, expect, test } from 'vitest';
import { createBookingService } from './booking';
import { createCampaignService } from './campaign';
import { SEED_BOOKING, SEED_CAMPAIGN, SEED_RECRUIT_BOOKING } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { createPlanService } from './plans';
import { makeHarness, type Harness } from './testHarness';

const DAY = 86_400_000;
const BRAND = 'acc-biz-demo';
const AGENCY = 'acc-biz-new';
const KHANHVY = 'acc-kol-2026-0001';
const KOL2 = 'acc-kol-2026-0002';

let h: Harness;
let svc: ReturnType<typeof createBookingService>;
let campaigns: ReturnType<typeof createCampaignService>;
let seq = 0;

const as = (id: string | null) =>
  h.db.update((s) => {
    s.sessionAccountId = id;
  });
const stored = (id: string) => h.db.read().bookings.find((b) => b.id === id)!;
/** Tạo chiến dịch rồi "Gửi đăng" + Admin "Duyệt" → Đang tuyển. */
const createOpen = async (input: Parameters<typeof campaigns.create>[0]) => {
  const id = (await campaigns.create(input)).id;
  await campaigns.publish(id);
  await campaigns.approveReview(id);
  return id;
};
const video = (name: string) => ({ name, type: 'video/mp4', size: 20_000_000 });

beforeEach(() => {
  h = makeHarness();
  h.clock.t = Date.now();
  seq = 0;
  const genId = () => `id-${++seq}`;
  svc = createBookingService({ db: h.db, now: h.now, delay: false, genId });
  campaigns = createCampaignService({ db: h.db, now: h.now, delay: false, genId });
});

describe('xem booking & quyền sở hữu', () => {
  test('Nhãn hàng thấy booking của mình, hồ sơ công khai KOL từng hạng mục, giới hạn quyền thao tác', async () => {
    as(BRAND);
    // Booking 1 KOL: mỗi chiến dịch một KOL được chọn.
    expect((await svc.listForBrand({ campaignId: SEED_CAMPAIGN.running })).map((b) => b.id)).toEqual([SEED_BOOKING.review]);
    expect((await svc.listForBrand({ campaignId: SEED_CAMPAIGN.breakfast })).map((b) => b.id)).toEqual([SEED_BOOKING.khanhVyInvite]);
    const app = await svc.get(SEED_BOOKING.application);
    expect(app).toMatchObject({ viewer: 'BRAND', status: 'APPLIED', supplier: { type: 'MCN', name: 'Sao Việt Media', code: 'MCN-2026-0001' } });
    expect(app.allowedActions).toEqual(expect.arrayContaining(['ACCEPT', 'DECLINE']));
    expect(app.allowedActions).not.toContain('COUNTER' as never);
    expect(app.allowedActions).not.toContain('SUBMIT_DRAFT');
    const it = app.items[0];
    expect(it.kol).toMatchObject({ kolId: 'KOL-2026-0014', listingStatus: 'VISIBLE' });
    expect(it.kol).not.toHaveProperty('staff');
    expect(it.kol).not.toHaveProperty('phone');
    expect(it.channel).toMatchObject({ id: 'MCN-2026-0001-ch-05', ownerType: 'MCN', platform: 'youtube' });
    expect(it.displayName).toBe(it.kol!.displayName);
    expect(app.expiresAt).toBeGreaterThan(h.now());
  });

  test('Nhãn hàng khác / nhà cung cấp khác → 4804; chưa đăng nhập hoặc MCN chưa duyệt → 4806', async () => {
    as(AGENCY);
    await expect(svc.get(SEED_BOOKING.review)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    as(KOL2);
    await expect(svc.get(SEED_BOOKING.review)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    await expect(svc.accept(SEED_BOOKING.khanhVyInvite)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    as(h.mcnId);
    await expect(svc.get(SEED_BOOKING.review)).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    as(null);
    await expect(svc.listForSupplier()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.listForBrand()).rejects.toMatchObject({ code: 'KOLHUB-4016' });
    as(BRAND);
    await expect(svc.get('khong-co')).rejects.toMatchObject({ code: 'KOLHUB-4804' });
  });

  test('MCN thấy booking của mình, lọc theo nguồn / trạng thái; không thấy ngân sách chiến dịch', async () => {
    as(SAOVIET);
    const all = await svc.listForSupplier();
    // v13: + 2 past bookings (COMPLETED) from historySeed.
    expect(all).toHaveLength(8);
    expect((await svc.listForSupplier({ origin: 'APPLICATION' })).map((b) => b.id).sort()).toEqual(
      [SEED_BOOKING.application, SEED_RECRUIT_BOOKING.saoVietApplied, SEED_RECRUIT_BOOKING.saoVietVerified].sort(),
    );
    expect((await svc.listForSupplier({ status: ['VERIFIED', 'COMPLETED'] })).map((b) => b.status).sort()).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED', 'VERIFIED', 'VERIFIED']);
    const b = all[0];
    expect(b.viewer).toBe('SUPPLIER');
    expect(b.campaign).not.toHaveProperty('budget');
    expect(b.campaign.brand.company).toBe('Công ty Demo Sữa');
  });
});

describe('thương lượng', () => {
  test('KOL nhận lời mời theo thù lao cố định → ACCEPTED; không trả giá được', async () => {
    as(KHANHVY);
    const inv = await svc.get(SEED_BOOKING.khanhVyInvite);
    expect(inv.allowedActions).toEqual(expect.arrayContaining(['ACCEPT', 'DECLINE', 'ASSIGN_ITEMS']));
    expect(inv.allowedActions).not.toContain('COUNTER' as never);
    const a = await svc.accept(SEED_BOOKING.khanhVyInvite);
    // Kênh YouTube của Khánh Vy → nhóm YouTube của chiến dịch: 50.000.000 ₫ / kênh.
    expect(a).toMatchObject({ status: 'ACCEPTED', price: 50_000_000, acceptedAt: h.now() });
    expect(a.awaiting).toBeUndefined();
    expect(a.history.map((e) => [e.by, e.action])).toEqual([
      ['BRAND', 'INVITED'],
      ['SUPPLIER', 'ACCEPTED'],
    ]);
  });

  test('Booking 1 KOL: chốt 1 đơn → chiến dịch vẫn Đang tuyển, đơn khác vẫn chờ (không tự đóng, không tự từ chối); không chốt được người thứ 2', async () => {
    as(BRAND);
    const others = (await svc.listForBrand({ campaignId: SEED_CAMPAIGN.marketplace })).filter((b) => b.id !== SEED_BOOKING.application);
    expect(others.length).toBeGreaterThanOrEqual(2);
    const before = others.map((o) => stored(o.id).status);
    await svc.accept(SEED_BOOKING.application);
    const c = await campaigns.get(SEED_CAMPAIGN.marketplace);
    // Công bố lên sàn §9, §12.4: đủ người đã chọn → cảnh báo chủ chiến dịch, không tự đóng tuyển.
    expect(c.status).toBe('OPEN');
    expect((c.log ?? []).some((e) => e.action === 'CLOSED')).toBe(false);
    expect(others.map((o) => stored(o.id).status)).toEqual(before);
    // Đơn còn chờ: Nhãn hàng không còn nút chấp nhận; gọi thẳng vẫn bị chặn (4818).
    const pending = others.find((o) => stored(o.id).status === 'APPLIED')!;
    expect((await svc.get(pending.id)).allowedActions).not.toContain('ACCEPT');
    expect((await svc.get(pending.id)).allowedActions).toContain('DECLINE');
    await expect(svc.accept(pending.id)).rejects.toMatchObject({ code: 'KOLHUB-4818', meta: { slots: 1, remaining: 0 } });
  });

  test('chuyển trạng thái không hợp lệ → 4805', async () => {
    as(BRAND);
    await expect(svc.accept(SEED_BOOKING.khanhVyInvite)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(svc.decline(SEED_BOOKING.khanhVyInvite)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(svc.markPaid(SEED_BOOKING.review)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(svc.submitDraft(SEED_BOOKING.review, { title: 'x', file: video('a.mp4') })).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    as(SAOVIET);
    await expect(svc.reviewContent(SEED_BOOKING.review, 'ct-seed-review-2', 'APPROVE')).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(svc.submitPost(SEED_BOOKING.review, { url: 'https://youtube.com/watch?v=abc' })).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(svc.confirmPaid(SEED_BOOKING.verified)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(svc.cancel(SEED_BOOKING.completed, 'Lý do')).rejects.toMatchObject({ code: 'KOLHUB-4805' });
  });

  test('từ chối / huỷ: bên được chờ từ chối; bên kia rút lại; sau khi chốt huỷ phải có lý do', async () => {
    as(KHANHVY);
    expect((await svc.decline(SEED_BOOKING.khanhVyInvite, 'Lịch kín')).status).toBe('DECLINED');
    as(SAOVIET);
    expect((await svc.cancel(SEED_BOOKING.application)).status).toBe('CANCELLED');
    await expect(svc.cancel(SEED_BOOKING.review)).rejects.toMatchObject({ code: 'KOLHUB-4816' });
    const c = await svc.cancel(SEED_BOOKING.review, 'KOL bị ốm, không kịp tiến độ');
    expect(c.status).toBe('CANCELLED');
    expect(c.allowedActions).toEqual([]);
  });

  test('giá lời mời = thù lao của nhóm; nhóm chỉ tặng sản phẩm → giá 0, chốt vẫn được', async () => {
    as(BRAND);
    const cid = await createOpen({
      name: 'Thử',
      brief: 'Brief thử',
      startDate: '2099-01-01',
      endDate: '2099-02-01',
      platforms: ['tiktok'],
      deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }],
      groups: [{ platform: 'tiktok', slots: 2, reward: { cash: 0, product: { name: 'Bộ quà', value: 800_000 } } }],
    });
    const b = (await campaigns.inviteKols(cid, ['KOL-2026-0002'])).bookings[0];
    expect(b.price).toBe(0);
    as(KOL2);
    expect(await svc.accept(b.id)).toMatchObject({ status: 'ACCEPTED', price: 0, reward: { cash: 0, product: { name: 'Bộ quà' } } });
  });

  test('MCN gán KOL/kênh cho lời mời; hạng mục thiếu kênh thì không chốt được (4809)', async () => {
    as(BRAND);
    const cid = await createOpen({
      name: 'Chỉ Facebook',
      brief: 'Brief thử',
      startDate: '2099-01-01',
      endDate: '2099-02-01',
      platforms: ['facebook', 'tiktok'],
      deliverables: [
        { type: 'POST', platform: 'facebook', quantity: 1 },
        { type: 'VIDEO', platform: 'tiktok', quantity: 2 },
      ],
      groups: [
        { platform: 'facebook', slots: 2, reward: { cash: 5_000_000 } },
        { platform: 'tiktok', slots: 2, reward: { cash: 8_000_000 } },
      ],
    });
    // KOL 0014 chỉ có kênh MCN YouTube → không có kênh phù hợp.
    const b = (await campaigns.inviteKols(cid, ['KOL-2026-0014'])).bookings[0];
    expect(b.items[0].channelId).toBeUndefined();
    as(SAOVIET);
    await expect(svc.accept(b.id)).rejects.toMatchObject({ code: 'KOLHUB-4809' });
    await expect(
      svc.assignItems(b.id, [{ kolAccountId: 'acc-kol-2026-0014', channelId: 'MCN-2026-0001-ch-05', deliverableType: 'VIDEO', quantity: 1 }]),
    ).rejects.toMatchObject({ code: 'KOLHUB-4809' });
    const up = await svc.assignItems(b.id, [
      { kolAccountId: 'acc-kol-2026-0013', channelId: 'MCN-2026-0001-ch-04', deliverableType: 'VIDEO', quantity: 2 },
    ]);
    expect(up.items.map((i) => [i.kolId, i.channelId, i.quantity])).toEqual([['KOL-2026-0013', 'MCN-2026-0001-ch-04', 2]]);
    expect(up.history.at(-1)).toMatchObject({ by: 'SUPPLIER', action: 'ITEMS_ASSIGNED' });
    expect(up.price).toBe(8_000_000);
    expect(await svc.accept(b.id)).toMatchObject({ status: 'ACCEPTED', price: 8_000_000 });
  });
});

describe('hết hạn (tính khi đọc)', () => {
  test('SENT quá 7 ngày → EXPIRED, không thao tác được, không còn chiếm chỗ', async () => {
    h.clock.t += 8 * DAY;
    as(KHANHVY);
    const b = await svc.get(SEED_BOOKING.khanhVyInvite);
    expect(b.status).toBe('EXPIRED');
    expect(b.allowedActions).toEqual([]);
    expect(b.awaiting).toBeUndefined();
    await expect(svc.accept(SEED_BOOKING.khanhVyInvite)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    expect(stored(SEED_BOOKING.khanhVyInvite).status).toBe('SENT');
    as(BRAND);
    const r = await campaigns.inviteKols(SEED_CAMPAIGN.breakfast, ['KOL-2026-0001']);
    expect(r.created).toBe(1);
  });

  test('qua hạn ứng tuyển → chiến dịch tự Đã đóng tuyển; đơn APPLIED được giữ để Nhãn hàng xử lý', async () => {
    h.db.update((s) => {
      s.campaigns.find((c) => c.id === SEED_CAMPAIGN.marketplace)!.applyDeadline = new Date(h.now() - DAY).toISOString().slice(0, 10);
    });
    as(BRAND);
    expect((await campaigns.get(SEED_CAMPAIGN.marketplace)).status).toBe('CLOSED');
    expect((await svc.get(SEED_BOOKING.application)).status).toBe('APPLIED');
    expect((await svc.accept(SEED_BOOKING.application)).status).toBe('ACCEPTED');
  });
});

describe('nội dung: nháp → duyệt → đăng → xác minh → thanh toán → hoàn tất', () => {
  test('yêu cầu sửa (không giới hạn lần) rồi duyệt, đăng link, xác minh, thanh toán, đánh giá', async () => {
    const id = SEED_BOOKING.review;
    as(BRAND);
    await expect(svc.reviewContent(id, 'ct-seed-review-2', 'REQUEST_CHANGES')).rejects.toMatchObject({
      code: 'KOLHUB-4803',
      meta: { field: 'feedback' },
    });
    await expect(svc.reviewContent(id, 'ct-seed-review-1', 'APPROVE')).rejects.toMatchObject({ code: 'KOLHUB-4813' });
    const r1 = await svc.reviewContent(id, 'ct-seed-review-2', 'REQUEST_CHANGES', 'Rút ngắn phần mở đầu');
    expect(r1.status).toBe('IN_PRODUCTION');

    as(SAOVIET);
    await expect(svc.submitDraft(id, { title: ' ' , file: video('a.mp4') })).rejects.toMatchObject({ meta: { field: 'title' } });
    await expect(svc.submitDraft(id, { title: 'Bản 3' })).rejects.toMatchObject({ meta: { field: 'file' } });
    await expect(svc.submitDraft(id, { title: 'Bản 3', url: 'https://drive.example/x', itemId: 'nope' })).rejects.toMatchObject({ meta: { field: 'item' } });
    const d = await svc.submitDraft(id, { title: 'Bản 3', file: video('bua-sang-an-toan.mp4'), durationSec: 90, itemId: 'bk-seed-review-i1' });
    expect(d.status).toBe('CONTENT_REVIEW');
    const draft = d.contents.at(-1)!;
    expect(draft).toMatchObject({ kind: 'DRAFT', status: 'PENDING', safety: { verdict: 'SAFE' } });
    expect(draft.safety!.score).toBeGreaterThanOrEqual(80);

    as(BRAND);
    expect((await svc.brandCounts()).pendingReviews).toBe(1);
    const ok = await svc.reviewContent(id, draft.id, 'APPROVE');
    expect(ok.status).toBe('CONTENT_APPROVED');

    as(SAOVIET);
    await expect(svc.submitPost(id, { url: 'https://www.tiktok.com/@x/video/1' })).rejects.toMatchObject({ code: 'KOLHUB-4811' });
    await expect(svc.submitPost(id, { url: 'khong phai link' })).rejects.toMatchObject({ code: 'KOLHUB-4811' });
    await expect(svc.submitPost(id, { url: 'https://youtube.com/' })).rejects.toMatchObject({ code: 'KOLHUB-4811' });
    const p = await svc.submitPost(id, { url: 'https://www.youtube.com/watch?v=suahat01' });
    expect(p.status).toBe('VERIFIED');
    const post = p.contents.at(-1)!;
    expect(post).toMatchObject({ kind: 'POST', status: 'APPROVED', itemId: 'bk-seed-review-i1', verifiedAt: h.now() });
    expect(post.metrics!.views).toBeGreaterThan(0);
    expect(p.history.slice(-2).map((e) => [e.by, e.action])).toEqual([
      ['SUPPLIER', 'POST_SUBMITTED'],
      ['SYSTEM', 'POST_VERIFIED'],
    ]);
    await expect(svc.confirmPaid(id)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    as(BRAND);
    const paid = await svc.markPaid(id);
    expect(paid.payment.brandMarkedAt).toBe(h.now());
    expect(paid.status).toBe('VERIFIED');
    await expect(svc.markPaid(id)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await expect(svc.cancel(id, 'Đổi ý')).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    as(SAOVIET);
    expect((await svc.supplierCounts()).toConfirmPayment).toBe(1);
    const done = await svc.confirmPaid(id);
    expect(done).toMatchObject({ status: 'COMPLETED', completedAt: h.now() });
    expect(done.allowedActions).toEqual(['RATE']);

    await expect(svc.rate(id, 6)).rejects.toMatchObject({ code: 'KOLHUB-4814' });
    const rated = await svc.rate(id, 4, 'Duyệt nhanh');
    expect(rated.myRating).toMatchObject({ stars: 4, comment: 'Duyệt nhanh' });
    await expect(svc.rate(id, 5)).rejects.toMatchObject({ code: 'KOLHUB-4815' });
    as(BRAND);
    const brandView = await svc.get(id);
    expect(brandView.myRating).toBeUndefined();
    expect(brandView).not.toHaveProperty('ratings');
    expect(brandView.allowedActions).toEqual(['RATE']);
  });

  test('booking nhiều hạng mục: đủ nháp đã duyệt mới CONTENT_APPROVED, đủ bài đăng mới VERIFIED', async () => {
    const id = SEED_BOOKING.application;
    as(BRAND);
    await svc.accept(id);
    as(SAOVIET);
    const d1 = (await svc.submitDraft(id, { title: 'YouTube', url: 'https://drive.example/1', itemId: 'bk-seed-application-i1' })).contents.at(-1)!;
    expect(d1.safety).toBeUndefined();
    as(BRAND);
    expect((await svc.reviewContent(id, d1.id, 'APPROVE')).status).toBe('IN_PRODUCTION');
    as(SAOVIET);
    const d2 = (await svc.submitDraft(id, { title: 'TikTok', file: video('tiktok.mp4'), itemId: 'bk-seed-application-i2' })).contents.at(-1)!;
    as(BRAND);
    expect((await svc.reviewContent(id, d2.id, 'APPROVE')).status).toBe('CONTENT_APPROVED');
    as(SAOVIET);
    const p1 = await svc.submitPost(id, { url: 'youtu.be/bibido01' });
    expect(p1.status).toBe('PUBLISHED');
    expect(p1.contents.at(-1)!.itemId).toBe('bk-seed-application-i1');
    const p2 = await svc.submitPost(id, { url: 'https://vt.tiktok.com/ZSabc123/' });
    expect(p2.status).toBe('VERIFIED');
  });

  test('số liệu bài đăng xác định theo link', async () => {
    const m1 = stored(SEED_BOOKING.verified).contents.find((c) => c.kind === 'POST')!.metrics!;
    const h2 = makeHarness();
    const m2 = h2.db.read().bookings.find((b) => b.id === SEED_BOOKING.verified)!.contents.find((c) => c.kind === 'POST')!.metrics!;
    expect(m2).toEqual(m1);
    expect(m1.engagementRate).toBeGreaterThan(0);
  });
});

describe('hợp đồng, đếm huy hiệu, gói dịch vụ', () => {
  test('đính kèm / gỡ tệp hợp đồng (PDF/JPG/PNG/DOCX ≤ 10 MB)', async () => {
    as(BRAND);
    await expect(svc.setContractFile(SEED_BOOKING.review, { name: 'x.exe', type: 'application/x-msdownload', size: 10 })).rejects.toMatchObject({
      meta: { field: 'contractFile' },
    });
    const b = await svc.setContractFile(SEED_BOOKING.review, { name: 'hop-dong.pdf', type: 'application/pdf', size: 300_000 });
    expect(b.contractFile?.name).toBe('hop-dong.pdf');
    as(SAOVIET);
    expect((await svc.setContractFile(SEED_BOOKING.review, null)).contractFile).toBeUndefined();
    await expect(svc.setContractFile(SEED_BOOKING.completed, null)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
  });

  test('huy hiệu Nhãn hàng / MCN / KOL theo seed', async () => {
    as(BRAND);
    // 3 proposals on "Tuần lễ ẩm thực mùa thu" (Booking 1 KOL) + 4 applicants waiting on the open-recruitment campaign.
    expect(await svc.brandCounts()).toEqual({ newApplications: 7, awaitingBrand: 7, pendingReviews: 1, toPay: 1 });
    as(SAOVIET);
    expect(await svc.supplierCounts()).toEqual({ newInvites: 0, awaitingSupplier: 0, toDeliver: 0, toConfirmPayment: 0, openMarketplace: 8 });
    as(KHANHVY);
    expect(await svc.supplierCounts()).toMatchObject({ newInvites: 1, awaitingSupplier: 1 });
  });

  test('gói: 3 gói, mặc định Dùng thử; chỉ tài khoản BIZ', async () => {
    const plans = createPlanService({ db: h.db, delay: false });
    expect(plans.listPlans().map((p) => [p.key, p.name, p.priceLabel])).toEqual([
      ['TRIAL', 'Dùng thử', 'Miễn phí'],
      ['STANDARD', 'Tiêu chuẩn', 'Sẽ công bố'],
      ['ENTERPRISE', 'Doanh nghiệp', 'Sẽ công bố'],
    ]);
    as(BRAND);
    expect((await plans.getCurrentPlan()).plan.key).toBe('TRIAL');
    expect((await plans.getCurrentPlan(AGENCY)).since).toBeUndefined();
    await expect(plans.getCurrentPlan(SAOVIET)).rejects.toMatchObject({ code: 'KOLHUB-4016' });
    h.db.update((s) => {
      s.brandPlans[BRAND] = { plan: 'STANDARD', since: 123 };
    });
    expect(await plans.getCurrentPlan()).toMatchObject({ plan: { key: 'STANDARD' }, since: 123 });
    as(KHANHVY);
    await expect(plans.getCurrentPlan()).rejects.toMatchObject({ code: 'KOLHUB-4016' });
  });
});

describe('sửa đề xuất ứng tuyển (Sàn v2)', () => {
  const edit = {
    items: [{ kolAccountId: 'acc-kol-2026-0014', channelId: 'MCN-2026-0001-ch-05', deliverableType: 'VIDEO' as const, quantity: 1 }],
    note: 'Rút gọn còn 1 video YouTube',
  };

  test('NCC sửa hạng mục, lời nhắn khi còn APPLIED (giá theo thù lao nhóm); ghi lịch sử, không gia hạn hạn phản hồi', async () => {
    as(SAOVIET);
    const before = await svc.get(SEED_BOOKING.application);
    expect(before.allowedActions).toContain('EDIT_APPLICATION');
    h.clock.t += 1000;
    const b = await svc.updateApplication(SEED_BOOKING.application, edit);
    // Còn 1 kênh YouTube: 25.000.000 ₫ (trước đó YouTube + TikTok = 40.000.000 ₫).
    expect(b).toMatchObject({ status: 'APPLIED', awaiting: 'BRAND', price: 25_000_000, note: 'Rút gọn còn 1 video YouTube', updatedAt: h.now() });
    expect(b.items).toHaveLength(1);
    expect(b.items[0]).toMatchObject({ kolId: 'KOL-2026-0014', channelId: 'MCN-2026-0001-ch-05' });
    expect(b.history.at(-1)).toEqual({ at: h.now(), by: 'SUPPLIER', action: 'APPLICATION_UPDATED', price: 25_000_000, note: 'Rút gọn còn 1 video YouTube' });
    expect(b.expiresAt).toBe(before.expiresAt);
    expect(b.createdAt).toBe(before.createdAt);
    // Bỏ lời nhắn → lời nhắn rỗng
    expect((await svc.updateApplication(SEED_BOOKING.application, { ...edit, note: undefined })).note).toBe('');
  });

  test('Nhãn hàng không sửa được; sau khi Nhãn hàng chốt → 4805', async () => {
    as(BRAND);
    expect((await svc.get(SEED_BOOKING.application)).allowedActions).not.toContain('EDIT_APPLICATION');
    await expect(svc.updateApplication(SEED_BOOKING.application, edit)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    await svc.accept(SEED_BOOKING.application);
    as(SAOVIET);
    await expect(svc.updateApplication(SEED_BOOKING.application, edit)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
  });

  test('hết hạn hoặc đã rút → 4805; lời mời (INVITE) không có quyền sửa đề xuất', async () => {
    as(SAOVIET);
    await svc.cancel(SEED_BOOKING.application);
    await expect(svc.updateApplication(SEED_BOOKING.application, edit)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    as(KHANHVY);
    expect((await svc.get(SEED_BOOKING.khanhVyInvite)).allowedActions).not.toContain('EDIT_APPLICATION');
  });

  test('đề xuất sửa sai: trống (4812), kênh không hợp lệ (4809); không phải bên booking (4804)', async () => {
    as(SAOVIET);
    await expect(svc.updateApplication(SEED_BOOKING.application, { ...edit, items: [] })).rejects.toMatchObject({ code: 'KOLHUB-4812' });
    await expect(
      svc.updateApplication(SEED_BOOKING.application, { ...edit, items: [{ ...edit.items[0], channelId: 'MCN-2026-0001-ch-09' }] }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4809' });
    expect(stored(SEED_BOOKING.application).price).toBe(40_000_000);
    as(KHANHVY);
    await expect(svc.updateApplication(SEED_BOOKING.application, edit)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
  });

  test('hết hạn phản hồi → 4805', async () => {
    as(SAOVIET);
    h.clock.t += 8 * DAY;
    await expect(svc.updateApplication(SEED_BOOKING.application, edit)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
  });
});
