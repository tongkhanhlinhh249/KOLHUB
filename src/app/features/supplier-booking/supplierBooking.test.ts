import { describe, expect, test } from 'vitest';
import type { BookingView } from '../../services';
import {
  bookingDetailPath,
  countByTab,
  defaultBookingTab,
  deadlineCountdown,
  deliverablesSummary,
  eventLabel,
  expiryCountdown,
  formatDay,
  formatDayRange,
  formatVnd,
  formatVndInput,
  formatVndShort,
  cardCategories,
  cardMatchLine,
  marketplaceCampaignPath,
  marketplaceBackLabel,
  marketplaceBackPath,
  legacyMarketplaceRedirect,
  loginToApplyPath,
  brandCampaignPath,
  marketplaceViewerOf,
  matchLabel,
  matchTone,
  memberSinceText,
  mergeMarketplaceParams,
  needsSupplier,
  nextStepText,
  parseBookingTab,
  parseMarketplaceParams,
  parseVndInput,
  priceText,
  statusTone,
  supplierStatusLabel,
  supplierTimeline,
  tabOf,
  toMarketplaceFilters,
  withParam,
} from './supplierBooking';

const CATS = ['Ẩm thực', 'Thời trang'];
// 29/09/2026 10:00 local
const NOW = new Date(2026, 8, 29, 10, 0).getTime();
const HOUR = 3_600_000;

type B = Pick<BookingView, 'status' | 'awaiting' | 'payment'>;
const b = (status: BookingView['status'], extra: Partial<B> = {}): B => ({ status, payment: {}, ...extra });

describe('tiền', () => {
  test('formatVnd / priceText', () => {
    expect(formatVnd(120_000_000)).toBe('120.000.000 ₫');
    expect(formatVnd(999)).toBe('999 ₫');
    expect(formatVnd(-5)).toBe('0 ₫');
    expect(priceText(0)).toBe('Chờ báo giá');
    expect(priceText(15_000_000)).toBe('15.000.000 ₫');
  });
  test('formatVndShort: triệu / tỷ gọn cho thẻ Sàn 3 cột', () => {
    expect(formatVndShort(150_000_000)).toBe('150 triệu ₫');
    expect(formatVndShort(12_500_000)).toBe('12,5 triệu ₫');
    expect(formatVndShort(1_000_000)).toBe('1 triệu ₫');
    expect(formatVndShort(1_250_000_000)).toBe('1,25 tỷ ₫');
    expect(formatVndShort(2_000_000_000)).toBe('2 tỷ ₫');
    expect(formatVndShort(999_999)).toBe('999.999 ₫');
    expect(formatVndShort(0)).toBe('0 ₫');
  });
  test('ô nhập giá: nhóm chữ số, bỏ ký tự khác, parse lại', () => {
    expect(formatVndInput('12000000')).toBe('12.000.000');
    expect(formatVndInput('12.000.0005')).toBe('120.000.005');
    expect(formatVndInput('abc')).toBe('');
    expect(formatVndInput('007')).toBe('7');
    expect(parseVndInput('12.000.000 ₫')).toBe(12_000_000);
    expect(parseVndInput('')).toBe(0);
  });
});

describe('thẻ Sàn', () => {
  test('cardCategories: tối đa 2 lĩnh vực + số còn lại', () => {
    expect(cardCategories([])).toEqual({ shown: [], more: 0 });
    expect(cardCategories(['Ẩm thực', 'Lifestyle'])).toEqual({ shown: ['Ẩm thực', 'Lifestyle'], more: 0 });
    expect(cardCategories(['Ẩm thực', 'Lifestyle', 'Gia đình', 'Du lịch'])).toEqual({ shown: ['Ẩm thực', 'Lifestyle'], more: 2 });
    expect(cardCategories(['Ẩm thực', 'Lifestyle', 'Gia đình'], 1)).toEqual({ shown: ['Ẩm thực'], more: 2 });
  });
  test('cardMatchLine: lý do đầu tiên, không có thì điều còn thiếu, không có nữa thì câu mặc định', () => {
    expect(cardMatchLine({ score: 80, reasons: ['Khớp lĩnh vực Ẩm thực', 'B'], missing: ['X'] })).toEqual({ text: 'Khớp lĩnh vực Ẩm thực', kind: 'reason' });
    expect(cardMatchLine({ score: 10, reasons: [], missing: ['Chưa có kênh YouTube đã xác thực'] })).toEqual({
      text: 'Chưa có kênh YouTube đã xác thực',
      kind: 'missing',
    });
    expect(cardMatchLine({ score: 0, reasons: [], missing: [] })).toEqual({ text: 'Chưa đủ dữ liệu để đánh giá mức phù hợp.', kind: 'missing' });
  });
});

describe('ngày và đếm ngược', () => {
  test('formatDay / formatDayRange', () => {
    expect(formatDay('2026-10-01')).toBe('01/10/2026');
    expect(formatDay('x')).toBe('');
    expect(formatDayRange('2026-10-01', '2026-10-31')).toBe('01/10/2026 – 31/10/2026');
    expect(formatDayRange(undefined, '2026-10-31')).toBe('31/10/2026');
  });
  test('hạn nhận đề xuất: còn N ngày / hôm nay / đã hết hạn', () => {
    expect(deadlineCountdown(undefined, NOW)).toBeNull();
    expect(deadlineCountdown('2026-10-04', NOW)).toEqual({ text: 'còn 5 ngày', urgent: false, passed: false });
    expect(deadlineCountdown('2026-10-01', NOW)).toEqual({ text: 'còn 2 ngày', urgent: true, passed: false });
    expect(deadlineCountdown('2026-09-29', NOW)).toEqual({ text: 'Hạn chót hôm nay', urgent: true, passed: false });
    expect(deadlineCountdown('2026-09-28', NOW)?.passed).toBe(true);
  });
  test('hết hạn lời mời: ngày / giờ / đã hết hạn', () => {
    expect(expiryCountdown(undefined, NOW)).toBeNull();
    expect(expiryCountdown(NOW + 3 * 24 * HOUR + HOUR, NOW)?.text).toBe('còn 3 ngày');
    expect(expiryCountdown(NOW + 5 * HOUR + 10, NOW)).toEqual({ text: 'còn 5 giờ', urgent: true, passed: false });
    expect(expiryCountdown(NOW + 60_000, NOW)?.text).toBe('còn 1 giờ');
    expect(expiryCountdown(NOW - 1, NOW)?.passed).toBe(true);
  });
});

test('deliverablesSummary', () => {
  expect(
    deliverablesSummary([
      { type: 'VIDEO', platform: 'tiktok', quantity: 2 },
      { type: 'POST', platform: 'facebook', quantity: 1 },
    ]),
  ).toBe('2 Video TikTok · 1 Bài đăng Facebook');
});

describe('nhóm tab và trạng thái', () => {
  test('mỗi booking thuộc đúng một tab', () => {
    expect(tabOf(b('SENT', { awaiting: 'SUPPLIER' }))).toBe('can-xu-ly');
    expect(tabOf(b('NEGOTIATING', { awaiting: 'SUPPLIER' }))).toBe('can-xu-ly');
    expect(tabOf(b('APPLIED', { awaiting: 'BRAND' }))).toBe('dang-trao-doi');
    expect(tabOf(b('NEGOTIATING', { awaiting: 'BRAND' }))).toBe('dang-trao-doi');
    // Something to deliver now → Cần xử lý (same rule as the "cần bạn xử lý" count); waiting on the brand → by stage.
    for (const s of ['ACCEPTED', 'IN_PRODUCTION', 'CONTENT_APPROVED', 'PUBLISHED'] as const) expect(tabOf(b(s))).toBe('can-xu-ly');
    expect(tabOf(b('CONTENT_REVIEW'))).toBe('dang-thuc-hien');
    expect(tabOf(b('VERIFIED'))).toBe('cho-thanh-toan');
    expect(tabOf(b('VERIFIED', { payment: { brandMarkedAt: 1 } }))).toBe('can-xu-ly');
    expect(tabOf(b('COMPLETED'))).toBe('hoan-tat');
    for (const s of ['DECLINED', 'CANCELLED', 'EXPIRED'] as const) expect(tabOf(b(s))).toBe('da-dong');
  });
  test('countByTab', () => {
    const c = countByTab([b('SENT', { awaiting: 'SUPPLIER' }), b('VERIFIED'), b('VERIFIED'), b('EXPIRED')]);
    expect(c).toEqual({ 'can-xu-ly': 1, 'dang-trao-doi': 0, 'dang-thuc-hien': 0, 'cho-thanh-toan': 2, 'hoan-tat': 0, 'da-dong': 1 });
  });
  test('tab mặc định: booking được liên kết → Cần xử lý → tab đầu tiên có booking', () => {
    const list = [
      { id: 'a', ...b('CONTENT_REVIEW') },
      { id: 'c', ...b('COMPLETED') },
    ];
    expect(defaultBookingTab(list)).toBe('dang-thuc-hien');
    expect(defaultBookingTab(list, 'c')).toBe('hoan-tat');
    expect(defaultBookingTab([...list, { id: 's', ...b('SENT', { awaiting: 'SUPPLIER' }) }], 'x')).toBe('can-xu-ly');
    expect(defaultBookingTab([])).toBe('can-xu-ly');
  });
  test('cần bạn xử lý', () => {
    expect(needsSupplier(b('SENT', { awaiting: 'SUPPLIER' }))).toBe(true);
    expect(needsSupplier(b('APPLIED', { awaiting: 'BRAND' }))).toBe(false);
    expect(needsSupplier(b('ACCEPTED'))).toBe(true);
    expect(needsSupplier(b('CONTENT_REVIEW'))).toBe(false);
    expect(needsSupplier(b('VERIFIED'))).toBe(false);
    expect(needsSupplier(b('VERIFIED', { payment: { brandMarkedAt: 1 } }))).toBe(true);
    expect(needsSupplier(b('VERIFIED', { payment: { brandMarkedAt: 1, supplierConfirmedAt: 2 } }))).toBe(false);
    expect(needsSupplier(b('COMPLETED'))).toBe(false);
  });
  test('nhãn và tông trạng thái theo góc nhìn nhà cung cấp', () => {
    expect(supplierStatusLabel(b('SENT', { awaiting: 'SUPPLIER' }))).toBe('Lời mời mới');
    expect(supplierStatusLabel(b('NEGOTIATING', { awaiting: 'SUPPLIER' }))).toBe('Nhãn hàng trả giá');
    expect(supplierStatusLabel(b('VERIFIED', { payment: { brandMarkedAt: 1 } }))).toBe('Nhãn hàng đã thanh toán');
    expect(supplierStatusLabel(b('CONTENT_REVIEW'))).toBe('Chờ duyệt nội dung');
    expect(statusTone(b('SENT', { awaiting: 'SUPPLIER' }))).toBe('warning');
    expect(statusTone(b('DECLINED'))).toBe('error');
    expect(statusTone(b('EXPIRED'))).toBe('neutral');
    expect(statusTone(b('COMPLETED'))).toBe('success');
    expect(statusTone(b('CONTENT_REVIEW'))).toBe('info');
  });
  test('bước tiếp theo', () => {
    const base = { payment: {}, price: 10, items: [{ channelId: 'c' }], allowedActions: [] } as unknown as BookingView;
    expect(nextStepText({ ...base, status: 'SENT', awaiting: 'SUPPLIER' })).toMatch(/^Nhãn hàng mời bạn/);
    expect(nextStepText({ ...base, status: 'SENT', awaiting: 'SUPPLIER', price: 0 })).toMatch(/chưa đưa giá/);
    expect(nextStepText({ ...base, status: 'SENT', awaiting: 'SUPPLIER', items: [{}] } as BookingView)).toMatch(/giao KOL\/kênh/);
    expect(nextStepText({ ...base, status: 'APPLIED', awaiting: 'BRAND' })).toMatch(/chờ Nhãn hàng/);
    expect(nextStepText({ ...base, status: 'COMPLETED' })).toBeNull();
    expect(nextStepText({ ...base, status: 'COMPLETED', allowedActions: ['RATE'] })).toMatch(/đánh giá/);
    expect(nextStepText({ ...base, status: 'ACCEPTED', allowedActions: ['SUBMIT_POST'] })).toMatch(/không cần duyệt nháp/);
    const q = parseMarketplaceParams(new URLSearchParams('loai=tuyen-nhieu'), CATS);
    expect(q.type).toBe('tuyen-nhieu');
    expect(toMarketplaceFilters(q).type).toBe('OPEN_RECRUITMENT');
    expect(mergeMarketplaceParams(new URLSearchParams(), q).get('loai')).toBe('tuyen-nhieu');
    expect(parseMarketplaceParams(new URLSearchParams('loai=khac'), CATS).type).toBeUndefined();
  });
  test('Tuyển nhiều KOL: Đã ứng tuyển → Đã được chọn → Đang thực hiện → Hoàn tất / Không được chọn', () => {
    const r = (status: BookingView['status'], extra: Partial<BookingView> = {}) =>
      ({ ...b(status), origin: 'APPLICATION', campaign: { type: 'OPEN_RECRUITMENT' }, ...extra }) as unknown as BookingView;
    expect(supplierStatusLabel(r('APPLIED', { awaiting: 'BRAND' }))).toBe('Đã ứng tuyển');
    expect(supplierStatusLabel(r('ACCEPTED'))).toBe('Đã được chọn');
    expect(supplierStatusLabel(r('CONTENT_REVIEW'))).toBe('Đang thực hiện');
    expect(supplierStatusLabel(r('COMPLETED'))).toBe('Hoàn tất');
    expect(supplierStatusLabel(r('DECLINED'))).toBe('Không được chọn');
    expect(supplierStatusLabel(r('CANCELLED'))).toBe('Đã rút ứng tuyển');
    expect(statusTone(r('DECLINED'))).toBe('error');
    const base = { payment: {}, price: 0, items: [{ channelId: 'c' }], origin: 'APPLICATION' } as unknown as BookingView;
    const camp = { type: 'OPEN_RECRUITMENT', phase: 'SELECT', recruitment: { timeline: { selectStart: '2026-10-12', selectEnd: '2026-10-14' } } } as BookingView['campaign'];
    expect(nextStepText({ ...base, status: 'APPLIED', awaiting: 'BRAND', allowedActions: [], campaign: camp })).toMatch(/đang chọn KOL.*14\/10/);
    expect(nextStepText({ ...base, status: 'ACCEPTED', allowedActions: ['SUBMIT_POST', 'CONFIRM_PRODUCT_RECEIVED'], campaign: camp })).toMatch(
      /được chọn.*Đã nhận sản phẩm/,
    );
    expect(nextStepText({ ...base, status: 'DECLINED', allowedActions: [], campaign: camp })).toMatch(/không được chọn/);
    expect(supplierStatusLabel({ ...b('VERIFIED'), price: 0 })).toBe('Chờ Nhãn hàng xác nhận hoàn tất');
  });
});

test('timeline: mới nhất trước, ẩn đánh giá của Nhãn hàng', () => {
  const t = supplierTimeline([
    { at: 1, by: 'BRAND', action: 'INVITED' },
    { at: 3, by: 'BRAND', action: 'RATED' },
    { at: 2, by: 'SUPPLIER', action: 'COUNTERED', price: 5 },
  ]);
  expect(t.map((e) => eventLabel(e))).toEqual(['Bạn đề xuất giá', 'Nhãn hàng gửi lời mời']);
});

describe('tham số URL', () => {
  test('Sàn: đọc / ghi, giá trị lạ → mặc định, giữ tham số khác', () => {
    const q = parseMarketplaceParams(
      new URLSearchParams('q=%20trà%20&linh-vuc=Ẩm thực&nen-tang=tiktok&ngan-sach=50-100&sap-xep=budget'),
      CATS,
    );
    expect(q).toEqual({ keyword: 'trà', category: 'Ẩm thực', platform: 'tiktok', budget: '50-100', sort: 'budget' });
    expect(parseMarketplaceParams(new URLSearchParams('linh-vuc=X&nen-tang=ig&ngan-sach=1&sap-xep=z'), CATS)).toEqual({ sort: 'match' });
    const next = mergeMarketplaceParams(new URLSearchParams('x=c1&q=a&tab=da-luu'), { sort: 'match', platform: 'youtube' });
    expect(next.toString()).toBe('x=c1&tab=da-luu&nen-tang=youtube');
    expect(mergeMarketplaceParams(new URLSearchParams(), { sort: 'newest' }).toString()).toBe('sap-xep=newest');
  });
  test('Sàn: nhãn mức phù hợp', () => {
    expect(withParam(new URLSearchParams('q=a&tab=x'), 'tab', null).toString()).toBe('q=a');
    expect(matchLabel(86)).toBe('Khớp 86%');
    expect([matchTone(86), matchTone(70), matchTone(55), matchTone(40), matchTone(12)]).toEqual(['success', 'success', 'info', 'info', 'neutral']);
  });
  test('Sàn: ngày tham gia KOLHUB', () => {
    expect(memberSinceText('2026-09-01T08:00:00.000Z')).toBe('Tháng 9/2026');
    expect(memberSinceText('')).toBe('');
  });
  test('Sàn: query → bộ lọc dịch vụ (khoảng ngân sách)', () => {
    expect(toMarketplaceFilters({ sort: 'deadline', budget: '50-100', keyword: 'x' })).toEqual({
      sort: 'deadline',
      keyword: 'x',
      budgetMin: 50_000_000,
      budgetMax: 100_000_000,
    });
    expect(toMarketplaceFilters({ sort: 'newest', budget: 'duoi-50' })).toEqual({ sort: 'newest', budgetMax: 49_999_999 });
    expect(toMarketplaceFilters({ sort: 'newest', budget: 'tren-200' }).budgetMin).toBe(200_000_001);
  });
  test('Booking: tab, link chi tiết', () => {
    expect(parseBookingTab(new URLSearchParams('tab=hoan-tat'))).toBe('hoan-tat');
    expect(parseBookingTab(new URLSearchParams('tab=x'))).toBe('can-xu-ly');
    expect(bookingDetailPath('bk-1')).toBe('/chien-dich-cua-toi?booking=bk-1');
    expect(bookingDetailPath('bk-1', 'hoan-tat')).toBe('/chien-dich-cua-toi?tab=hoan-tat&booking=bk-1');
    expect(loginToApplyPath('cmp-1')).toBe('/dang-nhap?returnTo=%2Fsan%2Fcmp-1');
    expect(brandCampaignPath('cmp-1')).toBe('/chien-dich/cmp-1');
  });
  test('Sàn: trang chi tiết /san/<id>, quay lại danh sách giữ bộ lọc', () => {
    expect(marketplaceCampaignPath('cmp-1')).toBe('/san/cmp-1');
    expect(marketplaceCampaignPath('c 1/x')).toBe('/san/c%201%2Fx');
    expect(marketplaceBackPath({ from: '/san?linh-vuc=Du%20l%E1%BB%8Bch&q=tra' })).toBe('/san?linh-vuc=Du%20l%E1%BB%8Bch&q=tra');
    expect(marketplaceBackPath({ from: '/san' })).toBe('/san');
    // "Chiến dịch quan tâm" is a list too (its tab / filter kept).
    expect(marketplaceBackPath({ from: '/chien-dich-da-luu?trang-thai=da-dong' })).toBe('/chien-dich-da-luu?trang-thai=da-dong');
    expect(marketplaceBackLabel('/chien-dich-da-luu?trang-thai=da-dong')).toBe('Chiến dịch quan tâm');
    expect(marketplaceBackLabel('/san?q=a')).toBe('Sàn chiến dịch');
    // Only those lists; anything else (another page, a campaign page, junk) → /san.
    for (const s of [null, undefined, {}, { from: 1 }, { from: '/chien-dich-cua-toi' }, { from: '/san/cmp-1' }, { from: 'https://x.io/san' }, { from: '/sanxyz' }])
      expect(marketplaceBackPath(s)).toBe('/san');
  });
  test('Sàn: link cũ ?chien-dich= → /san/<id>, giữ tham số khác cho nút quay lại', () => {
    expect(legacyMarketplaceRedirect('?chien-dich=cmp-1')).toEqual({ to: '/san/cmp-1', from: '/san' });
    expect(legacyMarketplaceRedirect('?tab=da-luu&chien-dich=c%201&q=tra')).toEqual({ to: '/san/c%201', from: '/san?tab=da-luu&q=tra' });
    expect(legacyMarketplaceRedirect('?chien-dich=')).toBeNull();
    expect(legacyMarketplaceRedirect('?tab=da-luu')).toBeNull();
    expect(legacyMarketplaceRedirect('')).toBeNull();
  });
  test('marketplaceViewerOf: khách, KOL/MCN, Nhãn hàng', () => {
    expect(marketplaceViewerOf('kolhub.guest')).toBe('guest');
    expect(marketplaceViewerOf('kolhub.user.kol')).toBe('supplier');
    expect(marketplaceViewerOf('kolhub.user.mcn')).toBe('supplier');
    expect(marketplaceViewerOf('kolhub.user.biz')).toBe('brand');
    expect(withParam(new URLSearchParams('tab=a&booking=b'), 'booking', null).toString()).toBe('tab=a');
  });
});
