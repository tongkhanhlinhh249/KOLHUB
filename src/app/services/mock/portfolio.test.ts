import { beforeEach, describe, expect, test } from 'vitest';
import { SEED_BOOKING, SEED_HISTORY } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { createPortfolioService, isShownOnProfile, isVerifiedPost } from './portfolio';
import { makeHarness, type Harness } from './testHarness';
import type { ContentSubmission } from '../campaign-types';

const BRAND = 'acc-biz-demo';
const KHANHVY = 'acc-kol-2026-0001';

let h: Harness;
let svc: ReturnType<typeof createPortfolioService>;
const as = (id: string | null) =>
  h.db.update((s) => {
    s.sessionAccountId = id;
  });

beforeEach(() => {
  h = makeHarness();
  h.clock.t = Date.now();
  svc = createPortfolioService({ db: h.db, now: h.now, delay: false });
});

describe('isVerifiedPost / isShownOnProfile', () => {
  const post = (extra: Partial<ContentSubmission> = {}): ContentSubmission => ({
    id: 'c',
    kind: 'POST',
    title: 'x',
    status: 'APPROVED',
    submittedAt: 1,
    verifiedAt: 2,
    metrics: { views: 1, likes: 0, comments: 0, shares: 0, engagementRate: 0 },
    ...extra,
  });
  test('chỉ bài POST đã xác minh có số liệu, booking không bị huỷ', () => {
    expect(isVerifiedPost(post(), { status: 'COMPLETED' })).toBe(true);
    expect(isVerifiedPost(post({ kind: 'DRAFT' }), { status: 'COMPLETED' })).toBe(false);
    expect(isVerifiedPost(post({ verifiedAt: undefined }), { status: 'PUBLISHED' })).toBe(false);
    expect(isVerifiedPost(post({ metrics: undefined }), { status: 'VERIFIED' })).toBe(false);
    expect(isVerifiedPost(post(), { status: 'CANCELLED' })).toBe(false);
  });
  test('"Hiện trên hồ sơ" mặc định bật; bài đã ẩn không hiện cho Nhãn hàng', () => {
    expect(isShownOnProfile(post(), { status: 'VERIFIED' })).toBe(true);
    expect(isShownOnProfile(post({ hiddenOnProfile: true }), { status: 'VERIFIED' })).toBe(false);
    expect(isShownOnProfile(post(), { status: 'CANCELLED' })).toBe(false);
  });
});

describe('portfolioService', () => {
  test('KOL thấy mọi bài đã xác minh của mình, mới nhất trước, kèm chiến dịch, Nhãn hàng, số liệu và đánh giá', async () => {
    as(KHANHVY);
    const list = await svc.listMine();
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.map((p) => p.verifiedAt)).toEqual([...list.map((p) => p.verifiedAt)].sort((a, b) => b - a));
    expect(list.every((p) => p.kolId === 'KOL-2026-0001' && p.visible && p.metrics.views > 0)).toBe(true);
    const summer = list.find((p) => p.bookingId === SEED_HISTORY.vySummer)!;
    expect(summer).toMatchObject({ campaignName: 'Mùa hè mát lành cùng sữa hạt', brandCompany: 'Công ty Demo Sữa', platform: 'tiktok', brandRating: { stars: 5 } });
    expect(list.find((p) => p.bookingId === SEED_HISTORY.vyHomeOffice)!.brandRating).toBeUndefined();
  });

  test('MCN thấy bài của các KOL thuộc MCN (tên KOL theo từng bài), có 1 bài đã ẩn', async () => {
    as(SAOVIET);
    const list = await svc.listMine();
    expect(new Set(list.map((p) => p.kolName)).size).toBeGreaterThanOrEqual(3);
    expect(list.some((p) => p.bookingId === SEED_BOOKING.completed)).toBe(true);
    expect(list.filter((p) => !p.visible).map((p) => p.bookingId)).toEqual([SEED_HISTORY.saoVietShoes]);
  });

  test('ẩn / hiện bài trên hồ sơ; Nhãn hàng chỉ thấy bài đang hiện, không có giá, tên chiến dịch hay đánh giá', async () => {
    as(BRAND);
    const before = await svc.listPublic('KOL-2026-0001');
    expect(before.length).toBeGreaterThanOrEqual(3);
    const json = JSON.stringify(before);
    expect(json).not.toMatch(/stars|price|campaignName|Mùa hè mát lành/);

    as(KHANHVY);
    const target = (await svc.listMine()).find((p) => p.bookingId === SEED_HISTORY.vyShoes)!;
    await svc.setVisible(target.bookingId, target.contentId, false);
    expect((await svc.listMine()).find((p) => p.contentId === target.contentId)!.visible).toBe(false);

    as(BRAND);
    const after = await svc.listPublic('KOL-2026-0001');
    expect(after.map((p) => p.id)).not.toContain(target.contentId);
    expect(after).toHaveLength(before.length - 1);

    as(KHANHVY);
    await svc.setVisible(target.bookingId, target.contentId, true);
    as(BRAND);
    expect(await svc.listPublic('KOL-2026-0001')).toHaveLength(before.length);
  });

  test('bài của KOL thuộc MCN hiện trên hồ sơ KOL đó (bài đã ẩn thì không)', async () => {
    as(BRAND);
    expect((await svc.listPublic('KOL-2026-0012')).length).toBeGreaterThanOrEqual(1);
    const kol13 = await svc.listPublic('KOL-2026-0013');
    expect(kol13.every((p) => p.id !== `ct-${SEED_HISTORY.saoVietShoes}-1`)).toBe(true);
  });

  test('quyền: KOL không sửa bài của người khác (4804); Nhãn hàng không gọi được danh sách của KOL (4806); KOL không xem bản công khai (4016)', async () => {
    as(KHANHVY);
    await expect(svc.setVisible(SEED_HISTORY.saoVietSummer, `ct-${SEED_HISTORY.saoVietSummer}-1`, false)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    await expect(svc.setVisible(SEED_HISTORY.vySummer, 'khong-co', false)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    await expect(svc.listPublic('KOL-2026-0001')).rejects.toMatchObject({ code: 'KOLHUB-4016' });
    as(BRAND);
    await expect(svc.listMine()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });
});

describe('portfolioService.listRatings ("Đánh giá")', () => {
  test('KOL: booking hoàn tất của mình, mới nhất trước; một booking đã đánh giá Nhãn hàng, còn lại chờ đánh giá', async () => {
    as(KHANHVY);
    const rows = await svc.listRatings();
    expect(rows.map((r) => r.bookingId)).toEqual([SEED_HISTORY.vySummer, SEED_HISTORY.vyShoes]);
    expect(rows[0]).toMatchObject({
      campaignName: 'Mùa hè mát lành cùng sữa hạt',
      brandCompany: 'Công ty Demo Sữa',
      kolNames: ['Khánh Vy'],
      received: { stars: 5, comment: 'Video tự nhiên, gửi link đúng hạn.' },
      given: { stars: 4 },
    });
    expect(rows[1].received).toMatchObject({ stars: 4 });
    expect(rows[1].given).toBeUndefined();
    // Not completed yet (payment not confirmed) → not listed.
    expect(rows.some((r) => r.bookingId === SEED_HISTORY.vyHomeOffice)).toBe(false);
  });
  test('MCN: tên các KOL theo booking; đánh giá vừa gửi hiện ngay', async () => {
    as(SAOVIET);
    const rows = await svc.listRatings();
    expect(rows.length).toBe(3);
    const summer = rows.find((r) => r.bookingId === SEED_HISTORY.saoVietSummer)!;
    expect(summer.kolNames.length).toBe(2);
    expect(rows.find((r) => r.bookingId === SEED_BOOKING.completed)).toMatchObject({ received: { stars: 5 }, given: { stars: 5 } });
    h.db.update((s) => {
      s.bookings.find((b) => b.id === SEED_HISTORY.saoVietShoes)!.ratings!.supplier = { stars: 3, comment: 'Ổn', at: 1 };
    });
    expect((await svc.listRatings()).find((r) => r.bookingId === SEED_HISTORY.saoVietShoes)!.given).toEqual({ stars: 3, comment: 'Ổn', at: 1 });
  });
  test('quyền: Nhãn hàng không gọi được (4806)', async () => {
    as(BRAND);
    await expect(svc.listRatings()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });
});

