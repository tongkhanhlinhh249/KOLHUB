import { beforeEach, describe, expect, test } from 'vitest';
import type { CampaignInput } from '../campaign-types';
import { createBookingService } from './booking';
import { createCampaignService } from './campaign';
import { isoDay } from './campaignRules';
import { SEED_BOOKING, SEED_CAMPAIGN, SEED_HISTORY } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { makeHarness, type Harness } from './testHarness';

const DAY = 86_400_000;
const BRAND = 'acc-biz-demo';
const AGENCY = 'acc-biz-new';
const KHANHVY = 'acc-kol-2026-0001';
const KOL2 = 'acc-kol-2026-0002';
const kolId = (n: number) => `KOL-2026-${String(n).padStart(4, '0')}`;

let h: Harness;
let svc: ReturnType<typeof createCampaignService>;
let bookings: ReturnType<typeof createBookingService>;
let seq = 0;

const as = (id: string | null) =>
  h.db.update((s) => {
    s.sessionAccountId = id;
  });
const day = (n: number) => isoDay(h.now() + n * DAY);

function complete(extra: Partial<CampaignInput> = {}): CampaignInput {
  return {
    name: 'Chiến dịch thử nghiệm',
    objective: 'Tăng nhận biết',
    brief: 'Brief thử nghiệm',
    budget: 100_000_000,
    startDate: day(1),
    endDate: day(30),
    platforms: ['tiktok', 'youtube'],
    categories: ['Ẩm thực'],
    deliverables: [{ type: 'VIDEO', platform: 'youtube', quantity: 1 }],
    contentRules: 'Gắn nhãn #QuangCao',
    ...extra,
  };
}

beforeEach(() => {
  h = makeHarness();
  h.clock.t = Date.now();
  seq = 0;
  const genId = () => `id-${++seq}`;
  svc = createCampaignService({ db: h.db, now: h.now, delay: false, genId });
  bookings = createBookingService({ db: h.db, now: h.now, delay: false, genId });
});

describe('quyền truy cập', () => {
  test('chức năng Nhãn hàng cần tài khoản BIZ (4016)', async () => {
    as(null);
    await expect(svc.listMine()).rejects.toMatchObject({ code: 'KOLHUB-4016' });
    as(SAOVIET);
    await expect(svc.create({ name: 'X' })).rejects.toMatchObject({ code: 'KOLHUB-4016' });
  });

  test('ứng tuyển cần MCN/KOL đã duyệt (4806); xem Sàn: mọi người, kể cả khách', async () => {
    as(null);
    expect((await svc.listMarketplace()).length).toBeGreaterThan(0);
    await expect(svc.apply(SEED_CAMPAIGN.agencyTravel, { items: [], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    as(h.mcnId); // MCN hồ sơ DRAFT: xem Sàn (chỉ đọc) được, ứng tuyển thì không
    expect((await svc.listMarketplace()).length).toBeGreaterThan(0);
    expect((await svc.getMarketplaceItem(SEED_CAMPAIGN.agencyTravel)).myBooking).toBeUndefined();
    await expect(svc.apply(SEED_CAMPAIGN.agencyTravel, { items: [], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    as(h.kolId); // KOL hồ sơ DRAFT
    await expect(svc.apply(SEED_CAMPAIGN.agencyFashion, { items: [], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });

  test('Nhãn hàng chỉ thấy và sửa chiến dịch của mình (4801)', async () => {
    as(AGENCY);
    expect((await svc.listMine()).map((c) => c.id).sort()).toEqual(
      [
        SEED_CAMPAIGN.agencyEnglish,
        SEED_CAMPAIGN.agencyFashion,
        SEED_CAMPAIGN.agencyTravel,
        SEED_CAMPAIGN.agencyHeadphones,
        SEED_CAMPAIGN.agencyChallenge,
        SEED_CAMPAIGN.recruitPosting,
      ].sort(),
    );
    await expect(svc.get(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    await expect(svc.update(SEED_CAMPAIGN.draft, { name: 'Đổi' })).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    await expect(svc.inviteKols(SEED_CAMPAIGN.running, [kolId(2)])).rejects.toMatchObject({ code: 'KOLHUB-4801' });
  });
});

describe('tạo, sửa, đăng chiến dịch', () => {
  beforeEach(() => as(BRAND));

  test('tạo bản nháp chỉ cần tên; tên trống → 4803 name', async () => {
    const c = await svc.create({ name: '  Ra mắt   vị mới ' });
    expect(c).toMatchObject({ name: 'Ra mắt vị mới', status: 'DRAFT', visibility: 'PRIVATE', budget: 0, brandAccountId: BRAND });
    expect(c.stats.total).toBe(0);
    await expect(svc.create({ name: ' ' })).rejects.toMatchObject({ code: 'KOLHUB-4803', meta: { field: 'name' } });
    await expect(svc.create({ name: 'A', startDate: '2026-02-30' })).rejects.toMatchObject({ meta: { field: 'dates' } });
    await expect(svc.create({ name: 'A', platforms: ['instagram' as never] })).rejects.toMatchObject({ meta: { field: 'platforms' } });
  });

  test('đăng: thiếu thông tin → 4803 theo trường; đủ → OPEN, có publishedAt', async () => {
    const c = await svc.create({ name: 'Nháp' });
    await expect(svc.publish(c.id)).rejects.toMatchObject({ code: 'KOLHUB-4803', meta: { field: 'budget' } });
    await svc.update(c.id, complete({ endDate: day(-1), startDate: day(-5) }));
    await expect(svc.publish(c.id)).rejects.toMatchObject({ meta: { field: 'dates' } });
    await svc.update(c.id, { endDate: day(30), deliverables: [{ type: 'POST', platform: 'facebook', quantity: 1 }] });
    await expect(svc.publish(c.id)).rejects.toMatchObject({ meta: { field: 'deliverables' } });
    await svc.update(c.id, { deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 2 }], applyDeadline: day(40) });
    await expect(svc.publish(c.id)).rejects.toMatchObject({ meta: { field: 'applyDeadline' } });
    await svc.update(c.id, { applyDeadline: null });
    const open = await svc.publish(c.id);
    expect(open.status).toBe('OPEN');
    expect(open.publishedAt).toBe(h.now());
    expect(open.applyDeadline).toBeUndefined();
    await expect(svc.publish(c.id)).rejects.toMatchObject({ code: 'KOLHUB-4802' });
  });

  test('sửa: OPEN phải còn đủ thông tin; RUNNING/COMPLETED không sửa được (4802)', async () => {
    await expect(svc.update(SEED_CAMPAIGN.marketplace, { platforms: [] })).rejects.toMatchObject({ meta: { field: 'platforms' } });
    const up = await svc.update(SEED_CAMPAIGN.marketplace, { budget: 180_000_000 });
    expect(up.budget).toBe(180_000_000);
    await expect(svc.update(SEED_CAMPAIGN.running, { name: 'Đổi tên' })).rejects.toMatchObject({ code: 'KOLHUB-4802' });
  });

  test('ảnh chiến dịch: JPG/PNG/WebP ≤ 10 MB; sai định dạng / quá lớn → 4803 cover; null xoá ảnh', async () => {
    const cover = { name: 'bia.webp', type: 'image/webp', size: 2_000_000, thumbnail: 'data:image/jpeg;base64,AAA' };
    const c = await svc.create({ name: 'Có ảnh', cover });
    expect(c.cover).toEqual(cover);
    expect((await svc.get(c.id)).cover).toEqual(cover);
    await expect(svc.create({ name: 'A', cover: { name: 'a.gif', type: 'image/gif', size: 10 } })).rejects.toMatchObject({
      code: 'KOLHUB-4803',
      meta: { field: 'cover' },
    });
    await expect(
      svc.update(c.id, { cover: { name: 'a.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 } }),
    ).rejects.toMatchObject({ meta: { field: 'cover' } });
    const png = { name: 'b.png', type: 'image/png', size: 10 * 1024 * 1024 };
    expect((await svc.update(c.id, { cover: png })).cover).toEqual(png);
    expect((await svc.update(c.id, { name: 'Đổi tên' })).cover).toEqual(png);
    const cleared = await svc.update(c.id, { cover: null });
    expect(cleared.cover).toBeUndefined();
    expect('cover' in cleared).toBe(false);
  });

  test('ảnh chiến dịch hiện trên Sàn (danh sách + chi tiết)', async () => {
    const cover = { name: 'moi.jpg', type: 'image/jpeg', size: 500_000, thumbnail: 'data:image/jpeg;base64,BBB' };
    await svc.update(SEED_CAMPAIGN.marketplace, { cover });
    as(null);
    expect((await svc.listMarketplace()).find((m) => m.id === SEED_CAMPAIGN.marketplace)!.cover).toEqual(cover);
    expect((await svc.getMarketplaceItem(SEED_CAMPAIGN.marketplace)).cover).toEqual(cover);
  });

  test('danh sách: lọc trạng thái, từ khoá không dấu, thống kê booking', async () => {
    const all = await svc.listMine();
    expect(all.map((c) => c.id).sort()).toEqual(
      [
        SEED_CAMPAIGN.draft,
        SEED_CAMPAIGN.marketplace,
        SEED_CAMPAIGN.running,
        SEED_CAMPAIGN.yogurt,
        SEED_CAMPAIGN.livestream,
        SEED_CAMPAIGN.recruitSelecting,
        SEED_HISTORY.summerCampaign,
        SEED_HISTORY.runningShoesCampaign,
        SEED_HISTORY.homeOfficeCampaign,
      ].sort(),
    );
    expect((await svc.listMine({ status: ['OPEN', 'RUNNING'] })).map((c) => c.status).sort()).toEqual(['OPEN', 'OPEN', 'OPEN', 'RUNNING', 'RUNNING', 'RUNNING']);
    expect((await svc.listMine({ keyword: 'sua hat' })).map((c) => c.id).sort()).toEqual(
      [SEED_CAMPAIGN.running, SEED_CAMPAIGN.recruitSelecting, SEED_HISTORY.summerCampaign].sort(),
    );
    const running = all.find((c) => c.id === SEED_CAMPAIGN.running)!;
    expect(running.stats).toMatchObject({ total: 4, invited: 1, inProgress: 2, pendingReview: 1, completed: 1, committed: 105_000_000 });
    expect(running.brand).toMatchObject({ company: 'Công ty Demo Sữa' });
  });
});

describe('mời KOL — quy tắc định tuyến', () => {
  let cid: string;
  beforeEach(async () => {
    as(BRAND);
    cid = (await svc.create(complete())).id;
  });

  test('KOL do MCN quản lý → gom vào 1 booking của MCN; KOL độc lập → booking riêng; bản nháp mở ra OPEN', async () => {
    const r = await svc.inviteKols(cid, [kolId(12), kolId(13), kolId(2)], { price: 10_000_000, note: 'Mời hợp tác' });
    expect(r).toMatchObject({ created: 2, updated: 0, skipped: [] });
    const mcn = r.bookings.find((b) => b.supplierType === 'MCN')!;
    expect(mcn).toMatchObject({ supplierAccountId: SAOVIET, origin: 'INVITE', status: 'SENT', awaiting: 'SUPPLIER', price: 20_000_000 });
    expect(mcn.items.map((i) => i.kolId)).toEqual([kolId(12), kolId(13)]);
    // Kênh MCN gán cho KOL 12 là YouTube (khớp hạng mục mặc định), KOL 13 chỉ có TikTok.
    expect(mcn.items.map((i) => [i.channelId, i.platform])).toEqual([
      ['MCN-2026-0001-ch-02', 'youtube'],
      ['MCN-2026-0001-ch-04', 'tiktok'],
    ]);
    const kol = r.bookings.find((b) => b.supplierType === 'KOL')!;
    expect(kol).toMatchObject({ supplierAccountId: KOL2, price: 10_000_000 });
    expect(kol.items[0]).toMatchObject({ kolAccountId: KOL2, channelId: 'KOL-2026-0002-youtube' });
    expect((await svc.get(cid)).status).toBe('OPEN');
  });

  test('mời thêm KOL cùng MCN → nối vào booking SENT; KOL đã mời / không tồn tại → bỏ qua', async () => {
    await svc.inviteKols(cid, [kolId(12)], { price: 10_000_000 });
    const r = await svc.inviteKols(cid, [kolId(14), kolId(12), 'KOL-9999-0000']);
    expect(r).toMatchObject({ created: 0, updated: 1 });
    expect(r.skipped).toEqual([
      { kolId: kolId(12), reason: 'ALREADY_INVITED' },
      { kolId: 'KOL-9999-0000', reason: 'NOT_FOUND' },
    ]);
    expect(r.bookings[0].items.map((i) => i.kolId)).toEqual([kolId(12), kolId(14)]);
    // Một lời mời không có giá → cả booking chờ MCN báo giá.
    expect(r.bookings[0].price).toBe(0);
    expect(r.bookings[0].history.map((e) => e.action)).toEqual(['INVITED', 'ITEMS_ADDED']);
  });

  test('booking MCN đã sang thương lượng → lời mời mới tạo booking khác', async () => {
    const first = (await svc.inviteKols(cid, [kolId(12)], { price: 10_000_000 })).bookings[0];
    as(SAOVIET);
    await bookings.counter(first.id, 12_000_000);
    as(BRAND);
    const r = await svc.inviteKols(cid, [kolId(13)]);
    expect(r.created).toBe(1);
    expect(r.bookings[0].id).not.toBe(first.id);
  });

  test('MCN chưa được duyệt thì không nhận booking thay KOL', async () => {
    h.db.update((s) => {
      s.mcnProfiles.find((p) => p.accountId === SAOVIET)!.status = 'NEEDS_FIX';
    });
    const r = await svc.inviteKols(cid, [kolId(12)]);
    expect(r.bookings[0]).toMatchObject({ supplierType: 'KOL', supplierAccountId: 'acc-kol-2026-0012' });
  });

  test('Khánh Vy (không có kênh MCN) → booking gửi thẳng KOL', async () => {
    const r = await svc.inviteKols(cid, [kolId(1)]);
    expect(r.bookings[0]).toMatchObject({ supplierType: 'KOL', supplierAccountId: KHANHVY });
  });

  test('đầu vào sai: rỗng 4812, giá 4810, chiến dịch đã kết thúc 4802', async () => {
    await expect(svc.inviteKols(cid, [])).rejects.toMatchObject({ code: 'KOLHUB-4812' });
    await expect(svc.inviteKols(cid, [kolId(2)], { price: -5 })).rejects.toMatchObject({ code: 'KOLHUB-4810' });
    await svc.cancel(cid);
    await expect(svc.inviteKols(cid, [kolId(2)])).rejects.toMatchObject({ code: 'KOLHUB-4802' });
  });

  test('bản nháp chưa đủ thông tin thì không mời được (4803)', async () => {
    const d = await svc.create({ name: 'Thiếu' });
    await expect(svc.inviteKols(d.id, [kolId(2)])).rejects.toMatchObject({ code: 'KOLHUB-4803' });
  });
});

describe('Sàn chiến dịch', () => {
  beforeEach(() => as(SAOVIET));

  test('chỉ hiện chiến dịch MARKETPLACE đang nhận đề xuất (+ Tuyển nhiều KOL đang chọn lọc / đăng bài, xếp sau); sort newest = mới nhất trước', async () => {
    const list = await svc.listMarketplace({ sort: 'newest' });
    expect(list.map((c) => c.id)).toEqual([
      SEED_CAMPAIGN.agencyHeadphones,
      SEED_CAMPAIGN.livestream,
      SEED_CAMPAIGN.agencyFashion,
      SEED_CAMPAIGN.agencyChallenge,
      SEED_CAMPAIGN.marketplace,
      SEED_CAMPAIGN.agencyEnglish,
      SEED_CAMPAIGN.yogurt,
      SEED_CAMPAIGN.agencyTravel,
      SEED_CAMPAIGN.recruitSelecting,
      SEED_CAMPAIGN.recruitPosting,
    ]);
    expect(list.filter((c) => c.accepting === false).map((c) => c.phase)).toEqual(['SELECT', 'POST']);
    const mine = list.find((c) => c.id === SEED_CAMPAIGN.marketplace)!;
    expect(mine.myBooking).toEqual({ id: SEED_BOOKING.application, status: 'APPLIED', origin: 'APPLICATION' });
    expect(mine.applicationCount).toBe(1);
    expect(mine.brand).toEqual({ company: 'Công ty Demo Sữa' });
    expect(mine).not.toHaveProperty('brandAccountId');
  });

  test('lọc lĩnh vực, nền tảng, ngân sách, từ khoá; sắp xếp ngân sách / hạn', async () => {
    expect((await svc.listMarketplace({ category: 'Giáo dục', sort: 'newest' })).map((c) => c.id)).toEqual([
      SEED_CAMPAIGN.agencyChallenge,
      SEED_CAMPAIGN.agencyEnglish,
    ]);
    expect((await svc.listMarketplace({ platform: 'facebook' })).map((c) => c.id).sort()).toEqual(
      [
        SEED_CAMPAIGN.agencyFashion,
        SEED_CAMPAIGN.agencyTravel,
        SEED_CAMPAIGN.livestream,
        SEED_CAMPAIGN.agencyChallenge,
        SEED_CAMPAIGN.recruitSelecting,
        SEED_CAMPAIGN.recruitPosting,
      ].sort(),
    );
    expect((await svc.listMarketplace({ budgetMin: 100_000_000, budgetMax: 160_000_000 })).map((c) => c.budget).sort()).toEqual([
      120_000_000, 150_000_000,
    ]);
    expect((await svc.listMarketplace({ keyword: 'mien trung' })).map((c) => c.id)).toEqual([SEED_CAMPAIGN.agencyTravel]);
    expect((await svc.listMarketplace({ keyword: 'newbrand' })).length).toBe(6);
    // Open recruitment budget = slots × (cash + product value): 5 × 14M, 6 × 15M, 10 × 25M; 3 × 5.5M and 4 × 2.45M (past "Ứng tuyển", last).
    expect((await svc.listMarketplace({ sort: 'budget' })).map((c) => c.budget)).toEqual([
      250_000_000, 200_000_000, 150_000_000, 120_000_000, 90_000_000, 80_000_000, 70_000_000, 45_000_000, 16_500_000, 9_800_000,
    ]);
    const byDeadline = (await svc.listMarketplace({ sort: 'deadline' })).map((c) => c.id);
    expect(byDeadline[0]).toBe(SEED_CAMPAIGN.yogurt);
    expect(byDeadline[1]).toBe(SEED_CAMPAIGN.agencyFashion);
    expect(byDeadline.slice(-3)).toEqual([SEED_CAMPAIGN.agencyTravel, SEED_CAMPAIGN.recruitSelecting, SEED_CAMPAIGN.recruitPosting]);
    expect((await svc.listMarketplace({ type: 'OPEN_RECRUITMENT' })).map((c) => c.id).sort()).toEqual(
      [
        SEED_CAMPAIGN.livestream,
        SEED_CAMPAIGN.agencyHeadphones,
        SEED_CAMPAIGN.agencyChallenge,
        SEED_CAMPAIGN.recruitSelecting,
        SEED_CAMPAIGN.recruitPosting,
      ].sort(),
    );
    expect((await svc.listMarketplace({ type: 'BOOKING' })).every((c) => c.type === 'BOOKING')).toBe(true);
  });

  test('hết hạn nhận đề xuất / riêng tư / bản nháp → không hiện, chi tiết 4801', async () => {
    h.clock.t += 6 * DAY; // qua hạn chiến dịch thời trang (5 ngày)
    expect((await svc.listMarketplace()).map((c) => c.id)).not.toContain(SEED_CAMPAIGN.agencyFashion);
    await expect(svc.getMarketplaceItem(SEED_CAMPAIGN.agencyFashion)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    await expect(svc.getMarketplaceItem(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    await expect(svc.getMarketplaceItem(SEED_CAMPAIGN.draft)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    expect((await svc.getMarketplaceItem(SEED_CAMPAIGN.agencyTravel)).name).toBe('Khám phá du lịch miền Trung');
  });

  test('MCN ứng tuyển: chọn KOL mình quản lý + kênh MCN gán cho KOL đó', async () => {
    const b = await svc.apply(SEED_CAMPAIGN.agencyFashion, {
      items: [{ kolAccountId: 'acc-kol-2026-0013', channelId: 'MCN-2026-0001-ch-04', deliverableType: 'VIDEO', quantity: 3 }],
      price: 90_000_000,
      note: 'Đề xuất 3 video phối đồ',
    });
    expect(b).toMatchObject({ status: 'APPLIED', awaiting: 'BRAND', origin: 'APPLICATION', supplierType: 'MCN', viewer: 'SUPPLIER' });
    expect(b.items[0]).toMatchObject({ kolId: kolId(13), platform: 'tiktok', quantity: 3 });
    expect(b.items[0].kol?.kolId).toBe(kolId(13));
    expect(b.allowedActions).toContain('CANCEL');
    await expect(svc.apply(SEED_CAMPAIGN.agencyFashion, { items: b.items.map((i) => ({ ...i, kolAccountId: i.kolAccountId, channelId: i.channelId! })), price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4807' });
  });

  test('một đề xuất đang hoạt động / chiến dịch; rút lại thì ứng tuyển lại được', async () => {
    const input = { items: [{ kolAccountId: 'acc-kol-2026-0014', channelId: 'MCN-2026-0001-ch-05', deliverableType: 'VIDEO' as const, quantity: 1 }], price: 5_000_000 };
    await expect(svc.apply(SEED_CAMPAIGN.marketplace, input)).rejects.toMatchObject({ code: 'KOLHUB-4807' });
    await bookings.cancel(SEED_BOOKING.application);
    const again = await svc.apply(SEED_CAMPAIGN.marketplace, input);
    expect(again.status).toBe('APPLIED');
  });

  test('đề xuất sai: KOL không thuộc MCN / kênh sai nền tảng / kênh chưa xác thực (4809), giá (4810), trống (4812)', async () => {
    const c = SEED_CAMPAIGN.agencyEnglish; // chỉ YouTube
    const item = (kolAccountId: string, channelId: string) => ({ kolAccountId, channelId, deliverableType: 'VIDEO' as const, quantity: 1 });
    await expect(svc.apply(c, { items: [item('acc-kol-2026-0002', 'MCN-2026-0001-ch-02')], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4809' });
    await expect(svc.apply(c, { items: [item('acc-kol-2026-0013', 'MCN-2026-0001-ch-04')], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4809' });
    await expect(svc.apply(c, { items: [item('acc-kol-2026-0015', 'MCN-2026-0001-ch-09')], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4809' });
    await expect(svc.apply(c, { items: [item('acc-kol-2026-0012', 'MCN-2026-0001-ch-02')], price: 0 })).rejects.toMatchObject({ code: 'KOLHUB-4810' });
    await expect(svc.apply(c, { items: [], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4812' });
    expect((await svc.apply(c, { items: [item('acc-kol-2026-0012', 'MCN-2026-0001-ch-02')], price: 1 })).status).toBe('APPLIED');
  });

  test('KOL độc lập ứng tuyển bằng kênh của mình; không dùng được kênh người khác; quá hạn → 4808', async () => {
    as(KHANHVY);
    const own = { channelId: 'KOL-2026-0001-youtube', deliverableType: 'VIDEO' as const, quantity: 1 };
    await expect(svc.apply(SEED_CAMPAIGN.agencyEnglish, { items: [{ ...own, channelId: 'KOL-2026-0002-youtube' }], price: 1 })).rejects.toMatchObject({
      code: 'KOLHUB-4809',
    });
    const b = await svc.apply(SEED_CAMPAIGN.agencyEnglish, { items: [own], price: 15_000_000 });
    expect(b).toMatchObject({ supplierType: 'KOL', supplierAccountId: KHANHVY });
    expect(b.items[0].kolAccountId).toBe(KHANHVY);
    h.clock.t += 6 * DAY;
    await expect(svc.apply(SEED_CAMPAIGN.agencyFashion, { items: [{ ...own, channelId: 'KOL-2026-0001-tiktok' }], price: 1 })).rejects.toMatchObject({
      code: 'KOLHUB-4808',
    });
    await expect(svc.apply(SEED_CAMPAIGN.running, { items: [own], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4801' });
  });
});

describe('Sàn v2 — phù hợp với bạn', () => {
  test('mặc định sắp xếp theo điểm phù hợp; mỗi chiến dịch có match (điểm, lý do, còn thiếu)', async () => {
    as(SAOVIET);
    const list = await svc.listMarketplace();
    expect(list).toHaveLength(10);
    const accepting = list.filter((c) => c.accepting);
    expect(accepting).toHaveLength(8);
    const scores = accepting.map((c) => c.match!.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    const yogurt = list.find((c) => c.id === SEED_CAMPAIGN.yogurt)!;
    expect(yogurt.match).toEqual({
      score: 100,
      reasons: ['Khớp lĩnh vực Lifestyle, Ẩm thực', 'Có 3 kênh TikTok đã xác thực', 'Đáp ứng đủ số lượng hạng mục', 'Quy mô kênh phù hợp với ngân sách'],
      missing: [],
    });
    const live = list.find((c) => c.id === SEED_CAMPAIGN.livestream)!;
    expect(live.match!.score).toBe(0);
    expect(live.match!.missing).toContain('Chưa có kênh Facebook đã xác thực');
    expect(accepting.at(-1)!.id).toBe(SEED_CAMPAIGN.livestream);
    // Cùng điểm → mới hơn trước
    expect(list[0].match!.score).toBe(100);
  });

  test('KOL độc lập: chiến dịch Giáo dục lên đầu', async () => {
    as(KHANHVY);
    const list = await svc.listMarketplace({ sort: 'match' });
    expect(list[0].id).toBe(SEED_CAMPAIGN.agencyEnglish);
    expect(list[0].match!.reasons[0]).toBe('Khớp lĩnh vực Giáo dục');
    const challenge = list.find((c) => c.id === SEED_CAMPAIGN.agencyChallenge)!;
    expect(challenge.match!.missing).toContain('Cần 4 Video TikTok, bạn có 1 kênh');
  });

  test('MCN hồ sơ chưa duyệt, chưa có kênh → điểm 0, vẫn xem được', async () => {
    as(h.mcnId);
    const list = await svc.listMarketplace();
    expect(list.every((c) => c.match!.score === 0)).toBe(true);
  });

  test('chi tiết có match và khối Nhãn hàng (không lộ dữ liệu riêng tư)', async () => {
    as(SAOVIET);
    const c = await svc.getMarketplaceItem(SEED_CAMPAIGN.agencyTravel);
    expect(c.match!.score).toBeGreaterThan(0);
    expect(c.brandInfo).toEqual({
      company: 'Công ty TNHH Newbrand Agency',
      businessEmailVerified: true,
      campaignsPosted: 6,
      completedBookings: 0,
      memberSince: h.db.read().accounts.find((a) => a.id === AGENCY)!.createdAt,
    });
    const own = await svc.getMarketplaceItem(SEED_CAMPAIGN.marketplace);
    expect(own.brandInfo).toMatchObject({ company: 'Công ty Demo Sữa', campaignsPosted: 8, completedBookings: 5 });
    expect(JSON.stringify(own.brandInfo)).not.toMatch(/@|password|acc-biz/);
    expect((await svc.listMarketplace())[0]).not.toHaveProperty('brandInfo');
  });
});

describe('Sàn v2 — chiến dịch đã lưu', () => {
  test('seed: Sao Việt đã lưu 2 chiến dịch, cờ saved trên danh sách', async () => {
    as(SAOVIET);
    expect((await svc.listSaved()).map((c) => c.id).sort()).toEqual([SEED_CAMPAIGN.agencyTravel, SEED_CAMPAIGN.yogurt].sort());
    const list = await svc.listMarketplace();
    expect(list.filter((c) => c.saved).map((c) => c.id).sort()).toEqual([SEED_CAMPAIGN.agencyTravel, SEED_CAMPAIGN.yogurt].sort());
    expect(list.find((c) => c.id === SEED_CAMPAIGN.agencyEnglish)!.saved).toBe(false);
  });

  test('lưu / bỏ lưu theo từng tài khoản, lặp lại không nhân đôi', async () => {
    as(SAOVIET);
    await svc.saveCampaign(SEED_CAMPAIGN.agencyEnglish);
    await svc.saveCampaign(SEED_CAMPAIGN.agencyEnglish);
    expect(h.db.read().savedCampaigns.filter((x) => x.accountId === SAOVIET && x.campaignId === SEED_CAMPAIGN.agencyEnglish)).toHaveLength(1);
    expect((await svc.getMarketplaceItem(SEED_CAMPAIGN.agencyEnglish)).saved).toBe(true);
    const saved = await svc.listSaved({ sort: 'newest' });
    expect(saved.map((c) => c.id)).toContain(SEED_CAMPAIGN.agencyEnglish);
    await svc.unsaveCampaign(SEED_CAMPAIGN.agencyEnglish);
    await svc.unsaveCampaign(SEED_CAMPAIGN.agencyEnglish);
    expect((await svc.listSaved()).map((c) => c.id)).not.toContain(SEED_CAMPAIGN.agencyEnglish);
    as(KHANHVY);
    expect((await svc.listSaved()).map((c) => c.id)).toEqual([SEED_CAMPAIGN.agencyEnglish]);
  });

  test('bộ lọc áp dụng cho danh sách đã lưu; chiến dịch hết hạn nhận đề xuất rời khỏi danh sách', async () => {
    as(SAOVIET);
    expect((await svc.listSaved({ platform: 'youtube' })).map((c) => c.id)).toEqual([SEED_CAMPAIGN.agencyTravel]);
    h.clock.t += 2 * DAY; // qua hạn chiến dịch sữa chua (1 ngày)
    expect((await svc.listSaved()).map((c) => c.id)).toEqual([SEED_CAMPAIGN.agencyTravel]);
  });

  test('không lưu được chiến dịch không hiện trên Sàn (4801); Nhãn hàng / khách → 4806', async () => {
    as(SAOVIET);
    await expect(svc.saveCampaign(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    await expect(svc.saveCampaign('khong-co')).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    as(BRAND);
    await expect(svc.saveCampaign(SEED_CAMPAIGN.agencyTravel)).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.listSaved()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    as(null);
    await expect(svc.unsaveCampaign(SEED_CAMPAIGN.agencyTravel)).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });

  test('MCN hồ sơ chưa duyệt vẫn lưu được (Sàn chỉ đọc)', async () => {
    as(h.mcnId);
    await svc.saveCampaign(SEED_CAMPAIGN.agencyTravel);
    expect((await svc.listSaved()).map((c) => c.id)).toEqual([SEED_CAMPAIGN.agencyTravel]);
  });
});

describe('Sàn — góc nhìn Nhãn hàng (chỉ đọc)', () => {
  test('Nhãn hàng xem được danh sách: không match / saved / myBooking; mine = chiến dịch của mình', async () => {
    as(BRAND);
    const list = await svc.listMarketplace();
    expect(list.map((c) => c.id)).toEqual([
      SEED_CAMPAIGN.agencyHeadphones,
      SEED_CAMPAIGN.livestream,
      SEED_CAMPAIGN.agencyFashion,
      SEED_CAMPAIGN.agencyChallenge,
      SEED_CAMPAIGN.marketplace,
      SEED_CAMPAIGN.agencyEnglish,
      SEED_CAMPAIGN.yogurt,
      SEED_CAMPAIGN.agencyTravel,
      SEED_CAMPAIGN.recruitSelecting,
      SEED_CAMPAIGN.recruitPosting,
    ]); // sort mặc định 'match' → mới nhất (chiến dịch đã qua giai đoạn ứng tuyển xếp sau)
    for (const c of list) {
      expect(c.match).toBeUndefined();
      expect(c.saved).toBe(false);
      expect(c.myBooking).toBeUndefined();
      expect(c).not.toHaveProperty('brandAccountId');
    }
    expect(list.filter((c) => c.mine).map((c) => c.id).sort()).toEqual(
      [SEED_CAMPAIGN.livestream, SEED_CAMPAIGN.marketplace, SEED_CAMPAIGN.yogurt, SEED_CAMPAIGN.recruitSelecting].sort(),
    );
    expect(list.find((c) => c.id === SEED_CAMPAIGN.marketplace)!.applicationCount).toBe(1);
    expect((await svc.listMarketplace({ sort: 'budget' })).map((c) => c.budget)).toEqual(
      [...list.map((c) => c.budget)].sort((a, b) => b - a),
    );
  });

  test('chi tiết: khối Nhãn hàng, mine đúng; chiến dịch không trên Sàn → 4801', async () => {
    as(AGENCY);
    const other = await svc.getMarketplaceItem(SEED_CAMPAIGN.marketplace);
    expect(other).toMatchObject({ mine: false, saved: false });
    expect(other.match).toBeUndefined();
    expect(other.myBooking).toBeUndefined();
    expect(other.brandInfo?.company).toBe('Công ty Demo Sữa');
    expect((await svc.getMarketplaceItem(SEED_CAMPAIGN.agencyTravel)).mine).toBe(true);
    await expect(svc.getMarketplaceItem(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    await expect(svc.getMarketplaceItem(SEED_CAMPAIGN.draft)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
  });

  test('Nhãn hàng không lưu / ứng tuyển / xem Đã lưu, Đã ứng tuyển (4806)', async () => {
    as(BRAND);
    await expect(svc.saveCampaign(SEED_CAMPAIGN.agencyTravel)).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.unsaveCampaign(SEED_CAMPAIGN.agencyTravel)).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.listSaved()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.listApplied()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.apply(SEED_CAMPAIGN.agencyTravel, { items: [], price: 1 })).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });

  test('khách (chưa đăng nhập): xem danh sách + chi tiết công khai, không match / saved / myBooking / mine', async () => {
    as(BRAND);
    const brandView = (await svc.listMarketplace()).map((c) => c.id);
    as(null);
    const list = await svc.listMarketplace();
    expect(list.map((c) => c.id)).toEqual(brandView);
    for (const c of list) {
      expect(c.match).toBeUndefined();
      expect(c.saved).toBe(false);
      expect(c.mine).toBe(false);
      expect(c.myBooking).toBeUndefined();
      expect(c).not.toHaveProperty('brandAccountId');
    }
    const item = await svc.getMarketplaceItem(SEED_CAMPAIGN.marketplace);
    expect(item).toMatchObject({ mine: false, saved: false, budget: expect.any(Number) });
    expect(item.match).toBeUndefined();
    expect(item.myBooking).toBeUndefined();
    expect(item.brandInfo?.company).toBe('Công ty Demo Sữa');
    // Public facts only: no contact data of the brand.
    for (const k of Object.keys(item.brandInfo!))
      expect(['businessEmailVerified', 'campaignsPosted', 'company', 'completedBookings', 'memberSince']).toContain(k);
    await expect(svc.getMarketplaceItem(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    await expect(svc.getMarketplaceItem(SEED_CAMPAIGN.draft)).rejects.toMatchObject({ code: 'KOLHUB-4801' });
  });

  test('khách không lưu / ứng tuyển / xem Đã lưu, Đã ứng tuyển (4806)', async () => {
    as(null);
    await expect(svc.saveCampaign(SEED_CAMPAIGN.agencyTravel)).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.unsaveCampaign(SEED_CAMPAIGN.agencyTravel)).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.listSaved()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
    await expect(svc.listApplied()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });

  test('nhà cung cấp: mine luôn false', async () => {
    as(SAOVIET);
    expect((await svc.listMarketplace()).every((c) => c.mine === false)).toBe(true);
  });
});

describe('Sàn v2 — đã ứng tuyển', () => {
  test('đề xuất của tôi trên mọi chiến dịch, kèm trạng thái booking; không gồm lời mời', async () => {
    as(SAOVIET);
    const all = await svc.listApplied();
    // + 2 open-recruitment applications (one waiting in "Chọn lọc", one picked and verified).
    expect(all).toHaveLength(3);
    const list = all.filter((x) => x.campaign.type === 'BOOKING');
    expect(list[0].booking).toMatchObject({ id: SEED_BOOKING.application, status: 'APPLIED', origin: 'APPLICATION', price: 60_000_000 });
    expect(list[0].booking.allowedActions).toContain('EDIT_APPLICATION');
    expect(list[0].campaign).toMatchObject({ id: SEED_CAMPAIGN.marketplace, accepting: true });
    expect(list[0].campaign.match).toBeDefined();
  });

  test('đề xuất đã rút vẫn hiện (Đã huỷ); chiến dịch đã đóng vẫn hiện với accepting=false; lọc theo từ khoá', async () => {
    as(SAOVIET);
    await bookings.cancel(SEED_BOOKING.application);
    const b = await svc.apply(SEED_CAMPAIGN.agencyEnglish, {
      items: [{ kolAccountId: 'acc-kol-2026-0012', channelId: 'MCN-2026-0001-ch-02', deliverableType: 'VIDEO', quantity: 1 }],
      price: 20_000_000,
    });
    let list = await svc.listApplied({ sort: 'newest' });
    expect(list.map((x) => [x.booking.id, x.booking.status])).toEqual(
      expect.arrayContaining([
        [SEED_BOOKING.application, 'CANCELLED'],
        [b.id, 'APPLIED'],
      ]),
    );
    expect((await svc.listApplied({ keyword: 'tieng anh' })).map((x) => x.booking.id)).toEqual([b.id]);
    h.clock.t += 20 * DAY;
    list = await svc.listApplied();
    expect(list.find((x) => x.booking.id === b.id)).toMatchObject({ booking: { status: 'EXPIRED' }, campaign: { accepting: false } });
  });

  test('chưa ứng tuyển / hồ sơ chưa duyệt → danh sách rỗng; Nhãn hàng → 4806', async () => {
    as(h.mcnId);
    expect(await svc.listApplied()).toEqual([]);
    as(BRAND);
    await expect(svc.listApplied()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });
});

describe('kết thúc / huỷ chiến dịch', () => {
  beforeEach(() => as(BRAND));

  test('còn booking đang thực hiện → 4817', async () => {
    await expect(svc.close(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4817' });
    await expect(svc.cancel(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4817' });
  });

  test('huỷ chiến dịch OPEN → đề xuất đang chờ bị hệ thống huỷ, biến khỏi Sàn', async () => {
    const c = await svc.cancel(SEED_CAMPAIGN.marketplace);
    expect(c).toMatchObject({ status: 'CANCELLED', closedAt: h.now() });
    const b = h.db.read().bookings.find((x) => x.id === SEED_BOOKING.application)!;
    expect(b.status).toBe('CANCELLED');
    expect(b.history.at(-1)).toMatchObject({ by: 'SYSTEM', action: 'CANCELLED' });
    as(SAOVIET);
    expect((await svc.listMarketplace()).map((x) => x.id)).not.toContain(SEED_CAMPAIGN.marketplace);
  });

  test('kết thúc chiến dịch RUNNING khi mọi booking đã xong → COMPLETED; huỷ lại → 4802', async () => {
    h.db.update((s) => {
      s.bookings = s.bookings.filter((b) => b.id === SEED_BOOKING.completed || b.campaignId !== SEED_CAMPAIGN.running);
    });
    expect((await svc.close(SEED_CAMPAIGN.running)).status).toBe('COMPLETED');
    await expect(svc.cancel(SEED_CAMPAIGN.running)).rejects.toMatchObject({ code: 'KOLHUB-4802' });
  });
});
