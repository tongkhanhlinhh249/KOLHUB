import { beforeEach, describe, expect, test } from 'vitest';
import type { BookingAction, BookingActor } from '../campaign-types';
import { createBookingService } from './booking';
import { createCampaignService } from './campaign';
import { SEED_BOOKING, SEED_CAMPAIGN } from './campaignSeed';
import { expiresAtOf } from './campaignRules';
import { buildNotifications, checkMessage, createInboxService, EXPIRING_WINDOW, filterNotifications, myQuestionsOf, threadParty } from './inbox';
import { SEED_THREADS } from './inboxSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { makeHarness, type Harness } from './testHarness';

const HOUR = 3_600_000;
const BRAND = 'acc-biz-demo';
const AGENCY = 'acc-biz-new';
const KHANHVY = 'acc-kol-2026-0001';
const KOL2 = 'acc-kol-2026-0002';

let h: Harness;
let inbox: ReturnType<typeof createInboxService>;
let bookings: ReturnType<typeof createBookingService>;
let campaigns: ReturnType<typeof createCampaignService>;
let seq = 0;

const as = (id: string | null) =>
  h.db.update((s) => {
    s.sessionAccountId = id;
  });

beforeEach(() => {
  h = makeHarness();
  h.clock.t = Date.now();
  seq = 0;
  const genId = () => `id-${++seq}`;
  inbox = createInboxService({ db: h.db, now: h.now, delay: false, genId });
  bookings = createBookingService({ db: h.db, now: h.now, delay: false, genId });
  campaigns = createCampaignService({ db: h.db, now: h.now, delay: false, genId });
});

describe('Tin nhắn: quyền truy cập luồng', () => {
  test('chỉ Nhãn hàng và KOL/MCN của booking đọc và gửi được; người khác → 4804', async () => {
    const id = SEED_THREADS.khanhVyInvite;
    expect(threadParty({ brandAccountId: BRAND, supplierAccountId: KHANHVY }, BRAND)).toBe('BRAND');
    expect(threadParty({ brandAccountId: BRAND, supplierAccountId: KHANHVY }, KHANHVY)).toBe('SUPPLIER');
    expect(threadParty({ brandAccountId: BRAND, supplierAccountId: KHANHVY }, AGENCY)).toBeNull();

    as(BRAND);
    expect((await inbox.getThread(id)).viewer).toBe('BRAND');
    as(KHANHVY);
    const t = await inbox.getThread(id);
    expect(t).toMatchObject({ viewer: 'SUPPLIER', counterpartType: 'BRAND', counterpartName: 'Công ty Demo Sữa' });

    for (const other of [AGENCY, KOL2, SAOVIET, null]) {
      as(other);
      await expect(inbox.getThread(id)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
      await expect(inbox.send(id, { text: 'Xin chào' })).rejects.toMatchObject({ code: 'KOLHUB-4804' });
      await expect(inbox.markThreadRead(id)).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    }
    await expect(inbox.getThread('khong-co')).rejects.toMatchObject({ code: 'KOLHUB-4804' });
    // Lists only hold the account's own bookings.
    as(AGENCY);
    expect((await inbox.listThreads()).some((x) => x.bookingId === id)).toBe(false);
    as(null);
    expect(await inbox.listThreads()).toEqual([]);
  });

  test('hộp thư: luồng của mình, mới nhất trước, có tìm kiếm không dấu', async () => {
    as(KHANHVY);
    const list = await inbox.listThreads();
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i++) expect(list[i - 1].lastAt).toBeGreaterThanOrEqual(list[i].lastAt);
    expect(list[0].bookingId).toBe(SEED_THREADS.khanhVyInvite);
    const found = await inbox.listThreads('sua hat');
    expect(found.map((x) => x.bookingId)).toContain(SEED_THREADS.khanhVyInvite);
    expect(found.every((x) => /sữa hạt|sua hat/i.test(`${x.campaignName} ${x.last?.text}`))).toBe(true);
    expect(await inbox.listThreads('khong-co-gi-ca-xyz')).toEqual([]);
  });

  test('tin nhắn hệ thống cho sự kiện chính của booking, nằm xen theo thời gian', async () => {
    as(KHANHVY);
    const t = await inbox.getThread(SEED_THREADS.khanhVyInvite);
    expect(t.messages[0]).toMatchObject({ kind: 'SYSTEM', from: 'BRAND', mine: false });
    expect(t.messages[0].text).toMatch(/^Công ty Demo Sữa gửi lời mời hợp tác với giá 50\.000\.000 ₫/);
    expect(t.messages.filter((m) => m.kind === 'USER')).toHaveLength(2);
    // Accepting adds a system message, written as "Bạn" for the actor.
    await bookings.accept(SEED_THREADS.khanhVyInvite);
    const after = await inbox.getThread(SEED_THREADS.khanhVyInvite);
    expect(after.messages.at(-1)).toMatchObject({ kind: 'SYSTEM', mine: true, text: 'Bạn chấp nhận, booking đã chốt' });
    as(BRAND);
    expect((await inbox.getThread(SEED_THREADS.khanhVyInvite)).messages.at(-1)!.text).toBe('Khánh Vy chấp nhận, booking đã chốt');
  });
});

describe('Tin nhắn: gửi và số chưa đọc', () => {
  test('Nhãn hàng gửi → KOL thấy chưa đọc (luồng, tổng, thông báo); mở luồng → đã đọc', async () => {
    as(KHANHVY);
    const before = await inbox.counts();
    expect(before.messages).toBe(3); // 2 from the demo brand + 1 from the agency (seed)

    as(BRAND);
    const sent = await inbox.send(SEED_THREADS.khanhVyInvite, { text: '  Bạn đã xem brief chưa?  ', link: 'https://example.com/brief' });
    expect(sent.messages.at(-1)).toMatchObject({ kind: 'USER', mine: true, authorName: 'Bạn', text: 'Bạn đã xem brief chưa?', link: 'https://example.com/brief' });
    expect(sent.unread).toBe(0);

    as(KHANHVY);
    expect((await inbox.counts()).messages).toBe(4);
    const thread = (await inbox.listThreads()).find((x) => x.bookingId === SEED_THREADS.khanhVyInvite)!;
    expect(thread.unread).toBe(3);
    expect(thread.last).toMatchObject({ kind: 'USER', mine: false, text: 'Bạn đã xem brief chưa?' });
    const n = (await inbox.listNotifications('unread')).find((x) => x.kind === 'MESSAGE' && x.body === 'Bạn đã xem brief chưa?');
    expect(n).toMatchObject({ title: 'Tin nhắn mới từ Công ty Demo Sữa', href: `/tin-nhan?thread=${SEED_THREADS.khanhVyInvite}`, read: false });

    h.clock.t += 1000;
    await inbox.markThreadRead(SEED_THREADS.khanhVyInvite);
    expect((await inbox.counts()).messages).toBe(1);
    expect((await inbox.listNotifications()).find((x) => x.id === n!.id)!.read).toBe(true);
    // The sender's own messages never count as unread for the sender.
    as(BRAND);
    expect((await inbox.listThreads()).find((x) => x.bookingId === SEED_THREADS.khanhVyInvite)!.unread).toBe(0);
  });

  test('kiểm tra nội dung: trống / quá dài / link không phải http(s) → 4803', () => {
    expect(checkMessage({ text: ' Chào ' })).toEqual({ text: 'Chào' });
    expect(() => checkMessage({ text: '   ' })).toThrow(expect.objectContaining({ code: 'KOLHUB-4803', meta: { field: 'message' } }));
    expect(() => checkMessage({ text: 'a'.repeat(2001) })).toThrow(expect.objectContaining({ meta: { field: 'message' } }));
    expect(() => checkMessage({ text: 'x', link: 'javascript:alert(1)' })).toThrow(expect.objectContaining({ meta: { field: 'link' } }));
    expect(() => checkMessage({ text: 'x', link: 'khong phai link' })).toThrow(expect.objectContaining({ meta: { field: 'link' } }));
    expect(checkMessage({ text: 'x', link: ' https://a.vn/b ' })).toEqual({ text: 'x', link: 'https://a.vn/b' });
  });

  test('booking đã đóng (từ chối) chỉ đọc → 4805', async () => {
    as(KHANHVY);
    await bookings.decline(SEED_THREADS.khanhVyInvite);
    const t = await inbox.getThread(SEED_THREADS.khanhVyInvite);
    expect(t.canPost).toBe(false);
    await expect(inbox.send(SEED_THREADS.khanhVyInvite, { text: 'Xin chào' })).rejects.toMatchObject({ code: 'KOLHUB-4805' });
  });
});

describe('Thông báo', () => {
  const kindsFor = (accountId: string) => buildNotifications(h.db.read(), accountId, h.now()).map((n) => n.kind);

  /** Push one event on the review booking (demo brand ↔ Sao Việt) and return the newest notification of `accountId`. */
  function emit(by: BookingActor, action: BookingAction, accountId: string, extra: { price?: number; note?: string } = {}) {
    h.clock.t += 60_000;
    h.db.update((s) => {
      s.bookings.find((b) => b.id === SEED_BOOKING.review)!.history.push({ at: h.clock.t, by, action, ...extra });
    });
    const top = buildNotifications(h.db.read(), accountId, h.now())[0];
    return top.at === h.clock.t ? top : null;
  }

  test.each([
    ['BRAND', 'COUNTERED', 'OFFER', /đề xuất giá mới/],
    ['BRAND', 'CONTENT_APPROVED', 'DRAFT_APPROVED', /duyệt/],
    ['BRAND', 'CHANGES_REQUESTED', 'CHANGES_REQUESTED', /chỉnh sửa/],
    ['SYSTEM', 'POST_VERIFIED', 'POST_VERIFIED', /xác minh/],
    ['BRAND', 'PAYMENT_MARKED', 'PAID', /thanh toán/],
    ['BRAND', 'PRODUCT_SENT', 'PRODUCT_SENT', /gửi/],
    ['BRAND', 'SELECTED', 'PICKED', /được chọn/],
    ['BRAND', 'NOT_SELECTED', 'NOT_PICKED', /Không được chọn/],
    ['BRAND', 'INVITED', 'INVITE', /Lời mời/],
  ] as const)('KOL/MCN: %s %s → %s', (by, action, kind, title) => {
    const n = emit(by, action, SAOVIET, { price: 5_000_000, note: 'Thêm phụ đề' });
    expect(n).toMatchObject({ kind, read: false, href: `/chien-dich-cua-toi?booking=${SEED_BOOKING.review}`, campaignName: 'Ra mắt sữa hạt vị mới' });
    expect(n!.title).toMatch(title);
  });

  test.each([
    ['SUPPLIER', 'APPLIED', 'APPLICATION'],
    ['SUPPLIER', 'ACCEPTED', 'ACCEPTED'],
    ['SUPPLIER', 'DECLINED', 'DECLINED'],
    ['SUPPLIER', 'DRAFT_SUBMITTED', 'DRAFT_SUBMITTED'],
    ['SUPPLIER', 'PAYMENT_CONFIRMED', 'PAYMENT_CONFIRMED'],
    ['SUPPLIER', 'PRODUCT_RECEIVED', 'PRODUCT_RECEIVED'],
    ['SUPPLIER', 'CANCELLED', 'CANCELLED'],
  ] as const)('Nhãn hàng: %s %s → %s (link mở booking trong chiến dịch)', (by, action, kind) => {
    const n = emit(by, action, BRAND);
    expect(n).toMatchObject({ kind, href: `/chien-dich/${SEED_CAMPAIGN.running}?tab=booking&booking=${SEED_BOOKING.review}` });
  });

  test('không báo cho chính người làm, không báo sự kiện nội bộ (đánh giá, hợp đồng)', () => {
    expect(emit('SUPPLIER', 'DRAFT_SUBMITTED', SAOVIET)).toBeNull();
    expect(emit('BRAND', 'RATED', SAOVIET)).toBeNull();
    expect(emit('BRAND', 'CONTRACT_ATTACHED', SAOVIET)).toBeNull();
    expect(emit('BRAND', 'COUNTERED', AGENCY)).toBeNull(); // not a party
  });

  test('thao tác thật của booking service tạo thông báo cho bên kia', async () => {
    as(KHANHVY);
    await bookings.accept(SEED_THREADS.khanhVyInvite);
    as(BRAND);
    const list = await inbox.listNotifications();
    const accepted = list.find((n) => n.kind === 'ACCEPTED')!;
    expect(accepted).toMatchObject({ read: false });
    expect(accepted.body).toContain('chấp nhận');
    // Booking 1 KOL: chọn xong thì chiến dịch tự đóng tuyển.
    expect(list.find((n) => n.kind === 'CAMPAIGN_CLOSED')?.body).toContain('đã chọn được KOL');
  });

  test('lời mời sắp hết hạn: chỉ trong 48 giờ cuối, khi lời mời còn mở', () => {
    const s = h.db.read();
    const b = s.bookings.find((x) => x.id === SEED_THREADS.khanhVyInvite)!;
    const exp = expiresAtOf(b, s.campaigns.find((c) => c.id === b.campaignId))!;
    expect(kindsFor(KHANHVY)).not.toContain('INVITE_EXPIRING');
    h.clock.t = exp - 10 * HOUR;
    const n = buildNotifications(h.db.read(), KHANHVY, h.now()).find((x) => x.kind === 'INVITE_EXPIRING')!;
    expect(n).toMatchObject({ id: `exp:${b.id}`, at: exp - EXPIRING_WINDOW });
    expect(n.body).toContain('10 giờ');
    h.clock.t = exp + 1;
    expect(kindsFor(KHANHVY)).not.toContain('INVITE_EXPIRING');
  });

  test('Hỏi đáp: KOL nhận "đã trả lời"; Nhãn hàng nhận câu hỏi mới, tự đã đọc khi đã trả lời', async () => {
    as(KHANHVY);
    const q = await campaigns.askQuestion(SEED_CAMPAIGN.yogurt, 'Có cần quay ở bếp không ạ?');
    as(BRAND);
    const asked = (await inbox.listNotifications()).find((n) => n.id === `qa-ask:${q.id}`)!;
    expect(asked).toMatchObject({ kind: 'QA_ASKED', read: false, href: `/chien-dich/${SEED_CAMPAIGN.yogurt}?tab=hoi-dap` });
    h.clock.t += 60_000;
    await campaigns.answerQuestion(q.id, 'Không bắt buộc, quay ở đâu cũng được.');
    expect((await inbox.listNotifications()).find((n) => n.id === `qa-ask:${q.id}`)!.read).toBe(true);
    as(KHANHVY);
    expect((await inbox.listNotifications('unread'))[0]).toMatchObject({ kind: 'QA_ANSWERED', id: `qa:${q.id}`, href: '/cau-hoi-cua-toi' });
  });

  test('đánh dấu đã đọc từng mục / tất cả; lọc Chưa đọc', async () => {
    as(KHANHVY);
    const unread = await inbox.listNotifications('unread');
    expect(unread.length).toBeGreaterThan(1);
    // Seed: notifications older than 2 days are read.
    expect((await inbox.listNotifications()).some((n) => n.read)).toBe(true);
    const first = unread.find((n) => n.kind !== 'MESSAGE')!;
    await inbox.markNotificationRead(first.id);
    expect((await inbox.listNotifications('unread')).map((n) => n.id)).not.toContain(first.id);
    expect((await inbox.counts()).notifications).toBe(unread.length - 1);
    await inbox.markAllNotificationsRead();
    expect(await inbox.listNotifications('unread')).toEqual([]);
    expect((await inbox.counts()).notifications).toBe(0);
    // A later event is unread again.
    h.clock.t += 60_000;
    as(BRAND);
    await inbox.send(SEED_THREADS.khanhVyInvite, { text: 'Nhắc nhẹ bạn nhé' });
    as(KHANHVY);
    expect((await inbox.counts()).notifications).toBe(1);
    expect(filterNotifications(await inbox.listNotifications(), 'unread')).toHaveLength(1);
  });

  test('trạng thái đọc riêng theo tài khoản; khách không có thông báo', async () => {
    as(SAOVIET);
    await inbox.markAllNotificationsRead();
    as(BRAND);
    expect((await inbox.counts()).notifications).toBeGreaterThan(0);
    as(null);
    expect(await inbox.listNotifications()).toEqual([]);
    expect(await inbox.counts()).toEqual({ messages: 0, notifications: 0 });
  });
});

describe('Câu hỏi của tôi', () => {
  test('câu hỏi của chính mình, chờ trả lời trước, có lọc', async () => {
    const all = myQuestionsOf(h.db.read(), KHANHVY);
    expect(all.map((q) => q.id).sort()).toEqual(['qa-seed-1', 'qa-seed-3']);
    expect(all.every((q) => q.status === 'ANSWERED' && !!q.answer && !!q.brandCompany)).toBe(true);

    as(KHANHVY);
    const asked = await campaigns.askQuestion(SEED_CAMPAIGN.yogurt, 'Sản phẩm có bản không đường không?');
    const list = await inbox.listMyQuestions();
    expect(list[0]).toMatchObject({ id: asked.id, status: 'PENDING', campaignId: SEED_CAMPAIGN.yogurt });
    expect(list[0].answer).toBeUndefined();
    expect((await inbox.listMyQuestions('pending')).map((q) => q.id)).toEqual([asked.id]);
    expect((await inbox.listMyQuestions('answered')).map((q) => q.id).sort()).toEqual(['qa-seed-1', 'qa-seed-3']);
    // Another supplier's questions are not included.
    expect(myQuestionsOf(h.db.read(), SAOVIET).some((q) => q.id === asked.id)).toBe(false);
    as(BRAND);
    await expect(inbox.listMyQuestions()).rejects.toMatchObject({ code: 'KOLHUB-4806' });
  });
});

describe('Chiến dịch đã lưu (tất cả, kể cả đã đóng)', () => {
  test('listSavedAll trả cả chiến dịch đã hết nhận đề xuất; trang chiến dịch đã đóng tuyển vẫn mở được', async () => {
    as(SAOVIET);
    const before = await campaigns.listSavedAll();
    expect(before.map((c) => c.id).sort()).toEqual([SEED_CAMPAIGN.agencyTravel, SEED_CAMPAIGN.yogurt].sort());
    // Push the yogurt campaign past its apply deadline: off the Sàn, but still saved.
    h.clock.t += 5 * 86_400_000;
    const after = await campaigns.listSavedAll();
    const yogurt = after.find((c) => c.id === SEED_CAMPAIGN.yogurt)!;
    expect(yogurt.accepting).toBe(false);
    expect((await campaigns.listSaved()).some((c) => c.id === SEED_CAMPAIGN.yogurt)).toBe(false);
    await expect(campaigns.getMarketplaceItem(SEED_CAMPAIGN.yogurt)).resolves.toMatchObject({ id: SEED_CAMPAIGN.yogurt, saved: true });
    await campaigns.unsaveCampaign(SEED_CAMPAIGN.yogurt);
    expect((await campaigns.listSavedAll()).map((c) => c.id)).not.toContain(SEED_CAMPAIGN.yogurt);
    // Đã đóng tuyển: trang công khai vẫn xem được (EP-02 §8), chỉ không ứng tuyển.
    await expect(campaigns.getMarketplaceItem(SEED_CAMPAIGN.yogurt)).resolves.toMatchObject({ saved: false, recruitmentClosed: true });
  });
});

describe('Thông báo chiến dịch (EP-02 US-14)', () => {
  test('Admin duyệt / yêu cầu bổ sung → thông báo cho Nhãn hàng, kèm email; người khác không nhận', async () => {
    as(BRAND);
    const s = h.db.read();
    const email = s.accounts.find((a) => a.id === BRAND)!.email;
    await campaigns.decideReview(SEED_CAMPAIGN.pendingReview, 'NEEDS_FIX', 'Thiếu căn cứ đại diện');
    let top = (await inbox.listNotifications())[0];
    expect(top).toMatchObject({ kind: 'CAMPAIGN_REVIEW', title: 'Chiến dịch cần bổ sung', email, read: false });
    expect(top.body).toContain('Thiếu căn cứ đại diện');
    expect(top.href).toBe(`/chien-dich/${SEED_CAMPAIGN.pendingReview}`);
    h.clock.t += 60_000;
    await campaigns.publish(SEED_CAMPAIGN.pendingReview);
    h.clock.t += 60_000;
    await campaigns.approveReview(SEED_CAMPAIGN.pendingReview);
    top = (await inbox.listNotifications())[0];
    expect(top).toMatchObject({ kind: 'CAMPAIGN_REVIEW', title: 'Chiến dịch đã được duyệt', email });
    as(AGENCY);
    expect((await inbox.listNotifications()).some((n) => n.kind === 'CAMPAIGN_REVIEW')).toBe(false);
  });

  test('nhắc 24 giờ trước hạn ứng tuyển một lần; tự đóng tuyển khi hết hạn có thông báo (không kèm email)', async () => {
    as(BRAND);
    const c = h.db.read().campaigns.find((x) => x.id === SEED_CAMPAIGN.marketplace)!;
    const deadline = Date.parse(`${c.applyDeadline}T23:59:00+07:00`);
    h.clock.t = deadline - 25 * HOUR;
    expect((await inbox.listNotifications()).some((n) => n.kind === 'DEADLINE_SOON')).toBe(false);
    h.clock.t = deadline - 2 * HOUR;
    const soon = (await inbox.listNotifications()).filter((n) => n.kind === 'DEADLINE_SOON');
    expect(soon).toHaveLength(1);
    expect(soon[0].at).toBe(deadline - 24 * HOUR);
    h.clock.t = deadline + HOUR;
    await campaigns.get(SEED_CAMPAIGN.marketplace); // đọc → hệ thống tự đóng tuyển
    const list = await inbox.listNotifications();
    expect(list.some((n) => n.kind === 'DEADLINE_SOON')).toBe(false);
    const closed = list.find((n) => n.kind === 'CAMPAIGN_CLOSED')!;
    expect(closed).toMatchObject({ title: 'Chiến dịch đã đóng tuyển' });
    expect(closed.email).toBeUndefined();
  });
});
