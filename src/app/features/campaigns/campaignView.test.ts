import { describe, expect, test } from 'vitest';
import type { BookingView, ContentSubmission, InviteResult } from '../../services';
import {
  applyCampaignQuery,
  brandTodoLabel,
  campaignActions,
  collectDrafts,
  collectPosts,
  countByBookingStatus,
  countCampaignTabs,
  expiryText,
  formatDateRange,
  formatIsoDay,
  formatPercent,
  formatPrice,
  formatVnd,
  formatVndInput,
  hasCampaignFilters,
  inviteRoutes,
  inviteSummary,
  metricTotals,
  needsBrandAction,
  openApplications,
  parseCampaignListParams,
  parseDetailTab,
  parseVndInput,
  pendingByCampaign,
  sortBookings,
  toCampaignListParams,
  withParam,
} from './campaignView';

describe('money', () => {
  test('formatVnd / formatPrice', () => {
    expect(formatVnd(120_000_000)).toBe('120.000.000 ₫');
    expect(formatVnd(999)).toBe('999 ₫');
    expect(formatPrice(0)).toBe('Chờ báo giá');
    expect(formatPrice(5_000_000)).toBe('5.000.000 ₫');
  });
  test('parseVndInput / formatVndInput', () => {
    expect(parseVndInput('')).toBeUndefined();
    expect(parseVndInput('abc')).toBeUndefined();
    expect(parseVndInput('1.200.000 ₫')).toBe(1_200_000);
    expect(formatVndInput('1200000')).toBe('1.200.000');
    expect(formatVndInput('')).toBe('');
    expect(parseVndInput('9'.repeat(30))).toBeUndefined();
  });
  test('formatPercent', () => {
    expect(formatPercent(4.256)).toBe('4,26%');
    expect(formatPercent(3)).toBe('3%');
  });
});

describe('dates', () => {
  test('formatIsoDay / formatDateRange', () => {
    expect(formatIsoDay('2026-10-01')).toBe('01/10/2026');
    expect(formatIsoDay(undefined)).toBe('');
    expect(formatIsoDay('01/10/2026')).toBe('');
    expect(formatDateRange('2026-10-01', '2026-10-31')).toBe('01/10/2026 – 31/10/2026');
    expect(formatDateRange('2026-10-01')).toBe('Từ 01/10/2026');
    expect(formatDateRange(undefined, '2026-10-31')).toBe('Đến 31/10/2026');
    expect(formatDateRange()).toBe('Chưa đặt lịch');
  });
  test('expiryText', () => {
    const now = 1_000_000_000_000;
    expect(expiryText(now - 1, now)).toBe('Đã hết hạn');
    expect(expiryText(now + 3 * 86_400_000 + 5, now)).toBe('Hết hạn sau 3 ngày');
    expect(expiryText(now + 5 * 3_600_000, now)).toBe('Hết hạn sau 5 giờ');
    expect(expiryText(now + 60_000, now)).toBe('Hết hạn sau 1 giờ');
  });
});

describe('campaign list', () => {
  const c = (id: string, status: 'DRAFT' | 'OPEN' | 'RUNNING' | 'COMPLETED' | 'CANCELLED', over: Record<string, unknown> = {}) => ({
    id,
    name: `Chiến dịch ${id}`,
    objective: '',
    brief: '',
    visibility: 'PRIVATE' as const,
    status,
    updatedAt: 0,
    budget: 0,
    startDate: undefined as string | undefined,
    ...over,
  });
  const list = [
    c('a', 'DRAFT', { updatedAt: 4 }),
    c('b', 'OPEN', { visibility: 'MARKETPLACE', name: 'Tuần lễ ẩm thực', updatedAt: 3, budget: 50, startDate: '2026-10-05' }),
    c('c', 'OPEN', { updatedAt: 2, budget: 300, startDate: '2026-10-01' }),
    c('d', 'RUNNING', { brief: 'Sữa hạt vị mới', updatedAt: 1, budget: 100 }),
  ];

  test('URL params round-trip, unknown values ignored', () => {
    const q = { tab: 'OPEN' as const, keyword: 'am thuc', visibility: 'MARKETPLACE' as const };
    const sp = toCampaignListParams(q);
    expect(sp.toString()).toBe('trang-thai=dang-mo&q=am+thuc&hien-thi=tren-san');
    expect(parseCampaignListParams(sp)).toEqual(q);
    expect(parseCampaignListParams(new URLSearchParams('trang-thai=xyz&hien-thi=abc&q=%20'))).toEqual({ tab: 'all' });
    expect(toCampaignListParams({ tab: 'all' }).toString()).toBe('');
    expect(toCampaignListParams({ tab: 'all', sort: 'updated' }).toString()).toBe('');
    expect(parseCampaignListParams(new URLSearchParams('sap-xep=budget'))).toEqual({ tab: 'all', sort: 'budget' });
  });

  test('tab counts follow keyword + visibility, not the tab', () => {
    expect(countCampaignTabs(list, { tab: 'DRAFT' })).toEqual({ all: 4, DRAFT: 1, OPEN: 2, RUNNING: 1, COMPLETED: 0, CANCELLED: 0 });
    expect(countCampaignTabs(list, { tab: 'all', visibility: 'MARKETPLACE' })).toMatchObject({ all: 1, OPEN: 1, DRAFT: 0 });
    // accent-insensitive keyword on name / brief
    expect(applyCampaignQuery(list, { tab: 'all', keyword: 'am thuc' }).map((x) => x.id)).toEqual(['b']);
    expect(applyCampaignQuery(list, { tab: 'all', keyword: 'SỮA HẠT' }).map((x) => x.id)).toEqual(['d']);
    expect(applyCampaignQuery(list, { tab: 'OPEN' }).map((x) => x.id)).toEqual(['b', 'c']);
    expect(applyCampaignQuery(list, { tab: 'all' }).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(applyCampaignQuery(list, { tab: 'all', sort: 'budget' }).map((x) => x.id)).toEqual(['c', 'd', 'b', 'a']);
    expect(applyCampaignQuery(list, { tab: 'all', sort: 'start' }).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(hasCampaignFilters({ tab: 'OPEN' })).toBe(false);
    expect(hasCampaignFilters({ tab: 'all', visibility: 'PRIVATE' })).toBe(true);
  });

  test('campaignActions per status', () => {
    expect(campaignActions('DRAFT')).toEqual({ edit: true, publish: true, close: false, cancel: true, invite: true });
    expect(campaignActions('OPEN')).toEqual({ edit: true, publish: false, close: true, cancel: true, invite: true });
    expect(campaignActions('RUNNING')).toEqual({ edit: false, publish: false, close: true, cancel: true, invite: true });
    expect(campaignActions('COMPLETED')).toEqual({ edit: false, publish: false, close: false, cancel: false, invite: false });
    expect(campaignActions('CANCELLED').cancel).toBe(false);
  });
});

// Minimal BookingView factory: only the fields the helpers read.
function bk(over: Partial<BookingView>): BookingView {
  return {
    id: 'b',
    campaignId: 'c1',
    brandAccountId: 'brand',
    supplierType: 'MCN',
    supplierAccountId: 'mcn',
    origin: 'INVITE',
    items: [],
    price: 0,
    note: '',
    status: 'SENT',
    history: [],
    contents: [],
    payment: {},
    createdAt: 0,
    updatedAt: 0,
    viewer: 'BRAND',
    allowedActions: [],
    supplier: { type: 'MCN', accountId: 'mcn', name: 'Sao Việt Media' },
    campaign: {} as BookingView['campaign'],
    ...over,
  } as BookingView;
}

const draft = (id: string, status: ContentSubmission['status'], at: number, itemId?: string): ContentSubmission => ({
  id,
  kind: 'DRAFT',
  title: id,
  status,
  submittedAt: at,
  ...(itemId ? { itemId } : {}),
});
const post = (id: string, at: number, views: number, likes: number, comments = 0, shares = 0): ContentSubmission => ({
  id,
  kind: 'POST',
  title: id,
  status: 'APPROVED',
  submittedAt: at,
  verifiedAt: at,
  metrics: { views, likes, comments, shares, engagementRate: 0 },
});

describe('bookings', () => {
  test('needsBrandAction / brandTodoLabel / pendingByCampaign', () => {
    const applied = bk({ id: '1', status: 'APPLIED', origin: 'APPLICATION', allowedActions: ['ACCEPT', 'COUNTER', 'DECLINE', 'ATTACH_CONTRACT'] });
    const sent = bk({ id: '2', status: 'SENT', allowedActions: ['CANCEL', 'ATTACH_CONTRACT'] });
    const review = bk({ id: '3', campaignId: 'c2', status: 'CONTENT_REVIEW', allowedActions: ['CANCEL', 'REVIEW_CONTENT'] });
    const pay = bk({ id: '4', status: 'VERIFIED', allowedActions: ['CANCEL', 'MARK_PAID'] });
    const rate = bk({ id: '5', status: 'COMPLETED', allowedActions: ['RATE'] });
    const counter = bk({ id: '6', status: 'NEGOTIATING', allowedActions: ['ACCEPT', 'COUNTER', 'DECLINE'] });
    expect([applied, sent, review, pay, rate].map(needsBrandAction)).toEqual([true, false, true, true, false]);
    expect(brandTodoLabel(applied)).toBe('Xem đề xuất');
    expect(brandTodoLabel(counter)).toBe('Trả lời báo giá');
    expect(brandTodoLabel(review)).toBe('Duyệt nội dung');
    expect(brandTodoLabel(pay)).toBe('Xác nhận thanh toán');
    expect(brandTodoLabel(sent)).toBeNull();
    expect(pendingByCampaign([applied, sent, review, pay, rate])).toEqual({ c1: 2, c2: 1 });
    expect(sortBookings([sent, { ...rate, updatedAt: 9 }, applied]).map((b) => b.id)).toEqual(['1', '5', '2']);
    expect(openApplications([applied, sent, counter, bk({ id: '7', origin: 'APPLICATION', status: 'ACCEPTED' })]).map((b) => b.id)).toEqual(['1']);
  });

  test('countByBookingStatus keeps lifecycle order', () => {
    const list = [bk({ status: 'COMPLETED' }), bk({ status: 'SENT' }), bk({ status: 'COMPLETED' }), bk({ status: 'CONTENT_REVIEW' })];
    expect(countByBookingStatus(list)).toEqual([
      { status: 'SENT', label: 'Đã gửi lời mời', count: 1 },
      { status: 'CONTENT_REVIEW', label: 'Chờ duyệt nội dung', count: 1 },
      { status: 'COMPLETED', label: 'Hoàn tất', count: 2 },
    ]);
  });

  test('collectDrafts / collectPosts / metricTotals', () => {
    const item = { id: 'it1', kolAccountId: 'k', kolId: 'KOL-1', platform: 'tiktok' as const, deliverableType: 'VIDEO' as const, quantity: 1, kol: null, displayName: 'An' };
    const a = bk({ id: 'a', items: [item], contents: [draft('d1', 'CHANGES_REQUESTED', 1, 'it1'), draft('d2', 'PENDING', 3, 'it1'), post('p1', 5, 1000, 50, 5, 5)] });
    const b = bk({ id: 'b', contents: [draft('d3', 'PENDING', 2), post('p2', 6, 3000, 100)] });
    const cancelled = bk({ id: 'x', status: 'CANCELLED', contents: [post('p3', 7, 999, 1)] });
    expect(collectDrafts([a, b]).map((d) => d.draft.id)).toEqual(['d2', 'd3', 'd1']);
    const pending = collectDrafts([a, b], true);
    expect(pending.map((d) => d.draft.id)).toEqual(['d2', 'd3']);
    expect(pending[0].item?.displayName).toBe('An');
    const posts = collectPosts([a, b, cancelled]);
    expect(posts.map((p) => p.post.id)).toEqual(['p2', 'p1']);
    expect(metricTotals(posts.map((p) => p.post))).toEqual({ posts: 2, views: 4000, likes: 150, comments: 5, shares: 5, engagementRate: 4 });
    expect(metricTotals([]).engagementRate).toBe(0);
  });
});

describe('detail URL', () => {
  test('parseDetailTab', () => {
    expect(parseDetailTab(null, false)).toBe('tong-quan');
    expect(parseDetailTab('booking', false)).toBe('booking');
    expect(parseDetailTab('ung-tuyen', false)).toBe('tong-quan');
    expect(parseDetailTab('ung-tuyen', true)).toBe('ung-tuyen');
    expect(parseDetailTab('xyz', true)).toBe('tong-quan');
  });
  test('withParam copies and sets / removes', () => {
    const prev = new URLSearchParams('tab=booking&kol=KOL-1');
    const next = withParam(prev, 'booking', 'bk-1');
    expect(next.toString()).toBe('tab=booking&kol=KOL-1&booking=bk-1');
    expect(prev.has('booking')).toBe(false);
    expect(withParam(next, 'kol', null).toString()).toBe('tab=booking&booking=bk-1');
  });
});

describe('invite result', () => {
  const item = (kolId: string, name: string) => ({ id: kolId, kolAccountId: kolId, kolId, platform: 'tiktok' as const, deliverableType: 'VIDEO' as const, quantity: 1, kol: null, displayName: name });
  const result: InviteResult = {
    bookings: [
      bk({ id: 'm', supplierType: 'MCN', items: [item('K0', 'Cũ'), item('K1', 'An'), item('K2', 'Bình')], history: [{ at: 0, by: 'BRAND', action: 'INVITED' }, { at: 1, by: 'BRAND', action: 'ITEMS_ADDED' }] }),
      bk({ id: 'k', supplierType: 'KOL', supplier: { type: 'KOL', accountId: 'k3', name: 'Chi' }, items: [item('K3', 'Chi')], history: [{ at: 1, by: 'BRAND', action: 'INVITED' }] }),
    ],
    created: 1,
    updated: 1,
    skipped: [{ kolId: 'K9', reason: 'NOT_FOUND' }],
  };
  test('inviteRoutes lists only the KOLs of this call', () => {
    expect(inviteRoutes(result, ['K1', 'K2', 'K3', 'K9'])).toEqual([
      { bookingId: 'm', supplierType: 'MCN', supplierName: 'Sao Việt Media', kols: ['An', 'Bình'], created: false },
      { bookingId: 'k', supplierType: 'KOL', supplierName: 'Chi', kols: ['Chi'], created: true },
    ]);
  });
  test('inviteSummary', () => {
    expect(inviteSummary(result)).toBe('1 lời mời mới · 1 lời mời được bổ sung KOL · 1 KOL bỏ qua');
    expect(inviteSummary({ bookings: [], created: 0, updated: 0, skipped: [] })).toBe('Không có lời mời nào được gửi');
  });
});
