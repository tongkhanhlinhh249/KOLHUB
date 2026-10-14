import { beforeEach, describe, expect, test } from 'vitest';
import type { Platform } from '../bizTypes';
import type { CampaignInput, RecruitmentTimeline } from '../campaign-types';
import { createBookingService } from './booking';
import { createCampaignService } from './campaign';
import { allowedActions, effectiveStatus, isoDay } from './campaignRules';
import { SEED_CAMPAIGN, SEED_RECRUIT_BOOKING } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { checkApplication, phaseOfTimeline, shiftIso } from './recruitment';
import { makeHarness, type Harness } from './testHarness';

const DAY = 86_400_000;
const BRAND = 'acc-biz-demo';
const AGENCY = 'acc-biz-new';
const KHANHVY = 'acc-kol-2026-0001';

let h: Harness;
let campaigns: ReturnType<typeof createCampaignService>;
let bookings: ReturnType<typeof createBookingService>;
let seq = 0;

const as = (id: string | null) =>
  h.db.update((s) => {
    s.sessionAccountId = id;
  });
/** "Gửi đăng" then Admin "Duyệt" (EP-02: kiểm duyệt trước đăng). */
const publishApproved = async (id: string) => {
  await campaigns.publish(id);
  return campaigns.approveReview(id);
};
const day = (n: number) => isoDay(h.now() + n * DAY);
const tl = (d: number[]): RecruitmentTimeline => ({
  applyStart: day(d[0]),
  applyEnd: day(d[1]),
  selectStart: day(d[2]),
  selectEnd: day(d[3]),
  postStart: day(d[4]),
  postEnd: day(d[5]),
  reviewStart: day(d[6]),
  reviewEnd: day(d[7]),
});

/** Khánh Vy's first verified, active own channel. */
function vyChannel(): { id: string; platform: Platform } {
  const ch = h.db.read().channels.find((c) => c.ownerType === 'KOL' && c.ownerId === KHANHVY && c.status === 'VERIFIED' && c.active)!;
  return { id: ch.id, platform: ch.platform };
}

function recruitInput(platform: Platform, extra: Partial<CampaignInput> = {}): CampaignInput {
  return {
    name: 'Tuyển KOL trải nghiệm sản phẩm',
    objective: 'Lan toả sản phẩm mới',
    brief: 'Quay video trải nghiệm thật.',
    type: 'OPEN_RECRUITMENT',
    platforms: [platform],
    categories: ['Lifestyle'],
    deliverables: [{ type: 'VIDEO', platform, quantity: 1 }],
    recruitment: {
      slots: 2,
      reward: { cash: 0, product: { name: 'Bộ quà tặng mẫu', value: 800_000 } },
      timeline: tl([0, 3, 4, 5, 6, 10, 11, 12]),
    },
    survey: [
      { text: 'Bạn sẽ quay ở đâu?', required: true },
      { text: 'Ghi chú thêm', required: false },
    ],
    terms: [{ text: 'Giữ bài công khai ≥ 6 tháng' }],
    draftReview: false,
    ...extra,
  };
}

beforeEach(() => {
  h = makeHarness();
  h.clock.t = Date.now();
  seq = 0;
  const genId = () => `id-${++seq}`;
  campaigns = createCampaignService({ db: h.db, now: h.now, delay: false, genId });
  bookings = createBookingService({ db: h.db, now: h.now, delay: false, genId });
});

describe('giai đoạn (4 mốc)', () => {
  const t = { applyStart: '2026-10-01', applyEnd: '2026-10-05', selectStart: '2026-10-08', selectEnd: '2026-10-09', postStart: '2026-10-10', postEnd: '2026-10-20', reviewStart: '2026-10-21', reviewEnd: '2026-10-25' };
  const at = (iso: string, h = 10) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), h).getTime();

  test('trước ngày mở → Sắp mở; khoảng trống giữa 2 mốc thuộc mốc sau; sau ngày cuối → Đã kết thúc', () => {
    expect(phaseOfTimeline(t, at('2026-09-30'))).toBe('UPCOMING');
    expect(phaseOfTimeline(t, at('2026-10-01', 0))).toBe('APPLY');
    expect(phaseOfTimeline(t, at('2026-10-05', 23))).toBe('APPLY');
    expect(phaseOfTimeline(t, at('2026-10-06'))).toBe('SELECT');
    expect(phaseOfTimeline(t, at('2026-10-09'))).toBe('SELECT');
    expect(phaseOfTimeline(t, at('2026-10-10'))).toBe('POST');
    expect(phaseOfTimeline(t, at('2026-10-21'))).toBe('REVIEW');
    expect(phaseOfTimeline(t, at('2026-10-26'))).toBe('ENDED');
    expect(shiftIso('2026-10-30', 3)).toBe('2026-11-02');
  });

  test('seed: 3 chiến dịch đang Ứng tuyển trên Sàn; 1 Chọn lọc, 1 Đăng bài đã đóng tuyển (rời Sàn, trang vẫn mở); thẻ có phase, số đã chọn, phần thưởng', async () => {
    as(null);
    const list = await campaigns.listMarketplace({ type: 'OPEN_RECRUITMENT' });
    const phase = Object.fromEntries(list.map((c) => [c.id, c.phase]));
    expect(phase).toEqual({
      [SEED_CAMPAIGN.livestream]: 'APPLY',
      [SEED_CAMPAIGN.agencyHeadphones]: 'APPLY',
      [SEED_CAMPAIGN.agencyChallenge]: 'APPLY',
    });
    const sel = await campaigns.getMarketplaceItem(SEED_CAMPAIGN.recruitSelecting);
    expect(sel).toMatchObject({ phase: 'SELECT', recruitmentClosed: true, accepting: false, selectedCount: 1, applicationCount: 5, draftReview: true });
    expect((await campaigns.getMarketplaceItem(SEED_CAMPAIGN.recruitPosting)).phase).toBe('POST');
    expect(sel.recruitment!.slots).toBe(3);
    expect(list.find((c) => c.id === SEED_CAMPAIGN.agencyChallenge)!.draftReview).toBe(false);
  });
});

describe('tạo và đăng chiến dịch Booking nhiều KOL', () => {
  test('ngân sách, thời gian, hạn ứng tuyển và hiển thị Sàn được suy ra từ suất + phần thưởng + lịch', async () => {
    as(BRAND);
    const c = await campaigns.create(recruitInput('tiktok', { recruitment: { slots: 4, reward: { cash: 1_000_000, product: { name: 'Quà', value: 500_000 } }, timeline: tl([0, 3, 4, 5, 6, 10, 11, 12]) } }));
    expect(c).toMatchObject({ type: 'OPEN_RECRUITMENT', visibility: 'MARKETPLACE', budget: 6_000_000, startDate: day(0), endDate: day(12), applyDeadline: day(3) });
    expect(c.survey!.map((q) => q.id)).toEqual(['q-1', 'q-2']);
    expect(c.terms).toEqual([{ id: 't-1', text: 'Giữ bài công khai ≥ 6 tháng' }]);
    expect((await campaigns.publish(c.id)).status).toBe('PENDING_REVIEW');
    const opened = await campaigns.approveReview(c.id);
    expect(opened.status).toBe('OPEN');
    // Tuyển nhiều KOL không mời riêng.
    await expect(campaigns.inviteKols(c.id, ['KOL-2026-0002'])).rejects.toMatchObject({ code: 'KOLHUB-4802' });
  });

  test('đăng cần số suất, phần thưởng và lịch đủ 4 mốc theo thứ tự, chưa qua giai đoạn ứng tuyển (4803)', async () => {
    as(BRAND);
    const make = async (patch: Partial<CampaignInput['recruitment'] & object>) => {
      const base = recruitInput('tiktok').recruitment!;
      const c = await campaigns.create(recruitInput('tiktok', { recruitment: { ...base, ...patch } }));
      return campaigns.publish(c.id);
    };
    await expect(make({ slots: 0 })).rejects.toMatchObject({ code: 'KOLHUB-4803', meta: { field: 'slots' } });
    await expect(make({ reward: { cash: 0 } })).rejects.toMatchObject({ meta: { field: 'reward' } });
    await expect(make({ timeline: tl([0, 3, 3, 5, 6, 10, 11, 12]) })).rejects.toMatchObject({ meta: { field: 'timeline' } });
    await expect(make({ timeline: { ...tl([0, 3, 4, 5, 6, 10, 11, 12]), postEnd: '' } })).rejects.toMatchObject({ meta: { field: 'timeline' } });
    await expect(make({ timeline: tl([-5, -1, 0, 5, 6, 10, 11, 12]) })).rejects.toMatchObject({ meta: { field: 'timeline' } });
    await expect(campaigns.create(recruitInput('tiktok', { recruitment: { slots: 1, reward: { cash: -1 }, timeline: tl([0, 1, 2, 3, 4, 5, 6, 7]) } }))).rejects.toMatchObject({ meta: { field: 'reward' } });
    await expect(campaigns.create(recruitInput('tiktok', { survey: [{ text: ' ', required: true }] }))).rejects.toMatchObject({ meta: { field: 'survey' } });
    await expect(campaigns.create(recruitInput('tiktok', { regions: ['Không có tỉnh này'] }))).rejects.toMatchObject({ meta: { field: 'regions' } });
    await expect(campaigns.create(recruitInput('tiktok', { target: { ageMin: 40, ageMax: 20 } }))).rejects.toMatchObject({ meta: { field: 'target' } });
  });

  test('không đổi loại chiến dịch khi đã có booking; không giảm số suất dưới số đã chọn', async () => {
    as(BRAND);
    await expect(campaigns.update(SEED_CAMPAIGN.marketplace, { type: 'OPEN_RECRUITMENT' })).rejects.toMatchObject({ meta: { field: 'type' } });
  });
});

describe('ứng tuyển (không báo giá): khảo sát, điều khoản, địa chỉ nhận sản phẩm', () => {
  test('kiểm tra form ứng tuyển thuần (checkApplication)', () => {
    const c = h.db.read().campaigns.find((x) => x.id === SEED_CAMPAIGN.livestream)!;
    const ok = { answers: { 'q-1': '20h tối thứ Bảy' }, acceptedTerms: ['t-1', 't-2'], shipping: { province: 'Hà Nội', address: 'Số 1 đường Mẫu, Hà Nội', phone: '0900000999' } };
    expect(checkApplication(c, ok, 1)).toMatchObject({ answers: [{ questionId: 'q-1', answer: '20h tối thứ Bảy' }], shipping: { province: 'Hà Nội' } });
    expect(() => checkApplication(c, { ...ok, answers: { 'q-1': '  ' } }, 1)).toThrow(expect.objectContaining({ meta: { field: 'answers' } }));
    expect(() => checkApplication(c, { ...ok, acceptedTerms: ['t-1'] }, 1)).toThrow(expect.objectContaining({ meta: { field: 'terms' } }));
    expect(() => checkApplication(c, { ...ok, shipping: undefined }, 1)).toThrow(expect.objectContaining({ meta: { field: 'shipping' } }));
    expect(() => checkApplication(c, { ...ok, shipping: { ...ok.shipping, province: 'Atlantis' } }, 1)).toThrow(expect.objectContaining({ meta: { field: 'shipping' } }));
    expect(() => checkApplication(c, { ...ok, shipping: { ...ok.shipping, phone: '12345' } }, 1)).toThrow(expect.objectContaining({ meta: { field: 'phone' } }));
  });

  test('KOL ứng tuyển không cần giá; Nhãn hàng thấy câu trả lời và địa chỉ; sửa được khi còn Ứng tuyển', async () => {
    const ch = vyChannel();
    as(BRAND);
    const c = await publishApproved((await campaigns.create(recruitInput(ch.platform))).id);
    as(KHANHVY);
    const items = [{ channelId: ch.id, deliverableType: 'VIDEO' as const, quantity: 1 }];
    await expect(campaigns.apply(c.id, { items, acceptedTerms: ['t-1'], shipping: { province: 'Huế', address: 'Số 2 đường Mẫu', phone: '0900000998' } })).rejects.toMatchObject({
      meta: { field: 'answers' },
    });
    const b = await campaigns.apply(c.id, {
      items,
      answers: { 'q-1': 'Tại nhà' },
      acceptedTerms: ['t-1'],
      shipping: { province: 'Huế', address: 'Số 2 đường Mẫu', phone: '090 000 0998' },
    });
    expect(b).toMatchObject({ status: 'APPLIED', price: 0 });
    expect(b.allowedActions).toEqual(expect.arrayContaining(['CANCEL', 'EDIT_APPLICATION']));
    expect(b.allowedActions).not.toContain('ACCEPT');
    expect(b.application!.shipping!.phone).toBe('0900000998');

    as(BRAND);
    const seen = await bookings.get(b.id);
    expect(seen.application!.answers[0]).toMatchObject({ question: 'Bạn sẽ quay ở đâu?', answer: 'Tại nhà' });
    // EP-02 §13 tuyển liên tục: chọn được ngay trong giai đoạn Ứng tuyển.
    expect(seen.allowedActions).toEqual(['SELECT', 'DECLINE', 'ATTACH_CONTRACT']);

    as(KHANHVY);
    const edited = await bookings.updateApplication(b.id, { items, answers: { 'q-1': 'Ở quán cà phê' }, acceptedTerms: ['t-1'], shipping: { province: 'Huế', address: 'Số 2 đường Mẫu', phone: '0900000998' } });
    expect(edited.application!.answers[0].answer).toBe('Ở quán cà phê');
  });
});

describe('chọn lọc: suất, chọn / không chọn hàng loạt, hết giai đoạn', () => {
  const waiting = () =>
    h.db
      .read()
      .bookings.filter((b) => b.campaignId === SEED_CAMPAIGN.recruitSelecting && b.status === 'APPLIED')
      .map((b) => b.id);

  test('chọn vượt số suất còn lại → 4818 (không chọn ai); chọn đủ → ACCEPTED theo phần thưởng cố định', async () => {
    as(BRAND);
    const ids = waiting();
    expect(ids).toHaveLength(4);
    await expect(campaigns.selectApplicants(SEED_CAMPAIGN.recruitSelecting, ids.slice(0, 3))).rejects.toMatchObject({
      code: 'KOLHUB-4818',
      meta: { slots: 3, remaining: 2 },
    });
    expect(waiting()).toHaveLength(4);
    const r = await campaigns.selectApplicants(SEED_CAMPAIGN.recruitSelecting, ids.slice(0, 2));
    expect(r).toMatchObject({ selected: 3, slots: 3 });
    for (const b of r.bookings) {
      expect(b).toMatchObject({ status: 'ACCEPTED', price: 3_000_000 });
      expect(b.reward!.product!.name).toBe('Máy làm sữa hạt mini');
      expect(b.history.at(-1)!.action).toBe('SELECTED');
    }
    // Đủ suất: chọn thêm từng người cũng bị chặn.
    await expect(bookings.select(ids[2])).rejects.toMatchObject({ code: 'KOLHUB-4818' });
    // Chốt danh sách: người còn lại → Không được chọn.
    const fin = await campaigns.finalizeSelection(SEED_CAMPAIGN.recruitSelecting);
    expect(fin.bookings.map((b) => b.status)).toEqual(['DECLINED', 'DECLINED']);
    expect(fin.bookings[0].history.at(-1)).toMatchObject({ action: 'NOT_SELECTED', note: 'Không được chọn' });
    expect(waiting()).toHaveLength(0);
  });

  test('không chọn hàng loạt; quá hạn Chọn lọc mà chưa chọn → Không được chọn (DECLINED)', async () => {
    as(BRAND);
    const ids = waiting();
    const r = await campaigns.rejectApplicants(SEED_CAMPAIGN.recruitSelecting, [ids[0]]);
    expect(r.bookings[0]).toMatchObject({ status: 'DECLINED' });
    await expect(campaigns.rejectApplicants(SEED_CAMPAIGN.recruitSelecting, [ids[0]])).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    const one = await bookings.select(ids[1]);
    expect(one.status).toBe('ACCEPTED');
    h.clock.t += 5 * DAY; // qua selectEnd (ngày +3)
    const s = h.db.read();
    const c = s.campaigns.find((x) => x.id === SEED_CAMPAIGN.recruitSelecting)!;
    expect(effectiveStatus(s.bookings.find((b) => b.id === ids[2])!, c, h.now())).toBe('DECLINED');
    await expect(campaigns.selectApplicants(SEED_CAMPAIGN.recruitSelecting, [ids[2]])).rejects.toMatchObject({ code: 'KOLHUB-4805' });
  });

  test('chỉ Nhãn hàng chủ chiến dịch chọn được; KOL/MCN rút đề xuất được trước khi được chọn', async () => {
    as(AGENCY);
    await expect(campaigns.selectApplicants(SEED_CAMPAIGN.recruitSelecting, waiting())).rejects.toMatchObject({ code: 'KOLHUB-4801' });
    as(SAOVIET);
    const b = await bookings.get(SEED_RECRUIT_BOOKING.saoVietApplied);
    expect(b.allowedActions).toContain('CANCEL');
    expect(b.allowedActions).not.toContain('EDIT_APPLICATION'); // hết giai đoạn Ứng tuyển
    await expect(bookings.select(b.id)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
  });
});

describe('Workflow tắt (đăng trực tiếp), sản phẩm, thanh toán', () => {
  test('KOL đã được chọn đăng thẳng (không nộp nháp, không chạy KOL Safety), xác nhận nhận sản phẩm', async () => {
    as(KHANHVY);
    const id = SEED_RECRUIT_BOOKING.khanhVyPicked;
    const b = await bookings.get(id);
    expect(b.status).toBe('ACCEPTED');
    expect(b.campaign).toMatchObject({ type: 'OPEN_RECRUITMENT', draftReview: false, phase: 'POST' });
    expect(b.allowedActions).toEqual(expect.arrayContaining(['SUBMIT_POST', 'CONFIRM_PRODUCT_RECEIVED']));
    expect(b.allowedActions).not.toContain('SUBMIT_DRAFT');
    await expect(bookings.submitDraft(id, { title: 'Nháp', url: 'https://drive.example/x' })).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    const got = await bookings.confirmProductReceived(id);
    expect(got.shipment!.receivedAt).toBe(h.now());
    expect(got.allowedActions).not.toContain('CONFIRM_PRODUCT_RECEIVED');
    const item = got.items[0];
    const host = item.platform === 'youtube' ? 'https://www.youtube.com/watch?v=abc' : item.platform === 'facebook' ? 'https://www.facebook.com/vy/videos/1' : 'https://www.tiktok.com/@vy/video/1';
    const posted = await bookings.submitPost(id, { url: host });
    expect(posted.status).toBe('VERIFIED');
    expect(posted.contents.every((c) => c.kind === 'POST' && !c.safety)).toBe(true);
  });

  test('Nhãn hàng đánh dấu đã gửi sản phẩm (chỉ khi có sản phẩm, một lần); KOL không tự đánh dấu', async () => {
    as(AGENCY);
    const s = h.db.read();
    const picked = s.bookings.find((b) => b.id === 'bk-seed-rc-dang-1')!;
    const v = await bookings.get(picked.id);
    expect(v.allowedActions).toContain('MARK_PRODUCT_SENT');
    const sent = await bookings.markProductSent(picked.id);
    expect(sent.shipment!.sentAt).toBe(h.now());
    await expect(bookings.markProductSent(picked.id)).rejects.toMatchObject({ code: 'KOLHUB-4805' });
    const c = s.campaigns.find((x) => x.id === SEED_CAMPAIGN.recruitPosting)!;
    expect(allowedActions(picked, 'ACCEPTED', 'SUPPLIER', { campaign: c, now: h.now() })).not.toContain('MARK_PRODUCT_SENT');
  });

  test('phần thưởng chỉ có sản phẩm (0 ₫): toàn bộ luồng chọn → đăng → Nhãn hàng xác nhận là Hoàn tất', async () => {
    const ch = vyChannel();
    as(BRAND);
    const c = await publishApproved((await campaigns.create(recruitInput(ch.platform))).id);
    as(KHANHVY);
    const b = await campaigns.apply(c.id, {
      items: [{ channelId: ch.id, deliverableType: 'VIDEO', quantity: 1 }],
      answers: { 'q-1': 'Tại nhà' },
      acceptedTerms: ['t-1'],
      shipping: { province: 'Huế', address: 'Số 2 đường Mẫu', phone: '0900000998' },
    });
    h.clock.t += 4 * DAY; // Chọn lọc
    as(BRAND);
    expect((await campaigns.get(c.id)).status).toBe('CLOSED'); // hết Ứng tuyển → tự Đã đóng tuyển, giữ đơn
    await campaigns.selectApplicants(c.id, [b.id]);
    expect((await campaigns.get(c.id)).status).toBe('CLOSED');
    await bookings.markProductSent(b.id);
    as(KHANHVY);
    const url = ch.platform === 'youtube' ? 'https://youtu.be/xyz123' : ch.platform === 'facebook' ? 'https://fb.watch/xyz123' : 'https://vt.tiktok.com/xyz123';
    expect((await bookings.submitPost(b.id, { url })).status).toBe('VERIFIED');
    as(BRAND);
    const done = await bookings.markPaid(b.id);
    expect(done).toMatchObject({ status: 'COMPLETED', price: 0 });
  });

  test('Workflow bật (mặc định): vẫn nộp nháp và duyệt như cũ', async () => {
    const s = h.db.read();
    const sel = s.campaigns.find((x) => x.id === SEED_CAMPAIGN.recruitSelecting)!;
    const picked = s.bookings.find((b) => b.campaignId === sel.id && b.status === 'ACCEPTED')!;
    const acts = allowedActions(picked, 'ACCEPTED', 'SUPPLIER', { campaign: sel, now: h.now() });
    expect(acts).toContain('SUBMIT_DRAFT');
    expect(acts).not.toContain('SUBMIT_POST');
  });
});

describe('Hỏi đáp công khai', () => {
  test('khách chỉ xem câu đã trả lời; KOL/MCN hỏi được; Nhãn hàng chủ chiến dịch trả lời; người khác thì không', async () => {
    as(null);
    const pub = await campaigns.listQuestions(SEED_CAMPAIGN.agencyHeadphones);
    expect(pub.every((q) => !!q.answer)).toBe(true);
    expect(pub).toHaveLength(1);
    await expect(campaigns.askQuestion(SEED_CAMPAIGN.agencyHeadphones, 'Khách hỏi')).rejects.toMatchObject({ code: 'KOLHUB-4806' });

    as(BRAND);
    await expect(campaigns.askQuestion(SEED_CAMPAIGN.agencyHeadphones, 'Nhãn hàng hỏi')).rejects.toMatchObject({ code: 'KOLHUB-4806' });

    as(SAOVIET);
    const mine = await campaigns.listQuestions(SEED_CAMPAIGN.agencyHeadphones);
    expect(mine).toHaveLength(2); // câu đã trả lời + câu của mình đang chờ
    expect(mine.find((q) => !q.answer)!.mine).toBe(true);
    await expect(campaigns.askQuestion(SEED_CAMPAIGN.agencyHeadphones, '   ')).rejects.toMatchObject({ meta: { field: 'question' } });
    await expect(campaigns.askQuestion(SEED_CAMPAIGN.draft, 'Hỏi bản nháp')).rejects.toMatchObject({ code: 'KOLHUB-4801' });

    as(KHANHVY);
    const q = await campaigns.askQuestion(SEED_CAMPAIGN.agencyHeadphones, 'Có cần mở hộp trên video không?');
    expect(q).toMatchObject({ mine: true, askerName: expect.any(String) });
    expect((await campaigns.listQuestions(SEED_CAMPAIGN.agencyHeadphones)).filter((x) => !x.answer)).toHaveLength(1); // không thấy câu chờ của Sao Việt

    await expect(campaigns.answerQuestion(q.id, 'KOL tự trả lời')).rejects.toMatchObject({ code: 'KOLHUB-4016' });
    as(BRAND);
    await expect(campaigns.answerQuestion(q.id, 'Không phải chiến dịch của tôi')).rejects.toMatchObject({ code: 'KOLHUB-4820' });

    as(AGENCY);
    const owner = await campaigns.listQuestions(SEED_CAMPAIGN.agencyHeadphones);
    expect(owner).toHaveLength(3);
    expect(owner[0].answer).toBeUndefined(); // câu chưa trả lời lên đầu
    await expect(campaigns.answerQuestion(q.id, ' ')).rejects.toMatchObject({ meta: { field: 'answer' } });
    const a = await campaigns.answerQuestion(q.id, 'Có, quay cảnh mở hộp trong 10 giây đầu.');
    expect(a.answer).toBe('Có, quay cảnh mở hộp trong 10 giây đầu.');

    as(null);
    expect((await campaigns.listQuestions(SEED_CAMPAIGN.agencyHeadphones)).map((x) => x.question)).toContain('Có cần mở hộp trên video không?');
  });
});
