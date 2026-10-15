import { describe, expect, test } from 'vitest';
import type { BookingView, CampaignView, ContentSubmission, InviteResult } from '../../services';
import {
  applyCampaignQuery,
  brandTodoLabel,
  campaignActions,
  campaignCta,
  todoCta,
  campaignProgress,
  campaignTodos,
  countCampaignGroups,
  kolProgress,
  parseCollabSection,
  collectDrafts,
  collectPosts,
  countByBookingStatus,
  CAMPAIGN_COLUMN_SORT,
  countCampaignTabs,
  countCampaignTypes,
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
    expect(formatPrice(0)).toBe('Chỉ sản phẩm');
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
  const c = (id: string, status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED', over: Record<string, unknown> = {}) => ({
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
    c('d', 'CLOSED', { brief: 'Sữa hạt vị mới', updatedAt: 1, budget: 100 }),
  ];

  test('URL params round-trip, unknown values ignored', () => {
    const q = { tab: 'OPEN' as const, keyword: 'am thuc', visibility: 'MARKETPLACE' as const };
    const sp = toCampaignListParams(q);
    expect(sp.toString()).toBe('trang-thai=dang-tuyen&q=am+thuc&hien-thi=tren-san');
    expect(parseCampaignListParams(sp)).toEqual(q);
    expect(parseCampaignListParams(new URLSearchParams('trang-thai=xyz&hien-thi=abc&q=%20'))).toEqual({ tab: 'all' });
    expect(toCampaignListParams({ tab: 'all' }).toString()).toBe('');
    expect(toCampaignListParams({ tab: 'all', sort: 'updated' }).toString()).toBe('');
    expect(parseCampaignListParams(new URLSearchParams('sap-xep=budget'))).toEqual({ tab: 'all', sort: 'budget' });
  });

  test('tab counts follow keyword + visibility, not the tab', () => {
    expect(countCampaignTabs(list, { tab: 'DRAFT' })).toEqual({ all: 4, DRAFT: 1, PENDING_REVIEW: 0, NEEDS_FIX: 0, REJECTED: 0, OPEN: 2, CLOSED: 1, COMPLETED: 0, CANCELLED: 0 });
    expect(countCampaignTabs(list, { tab: 'all', visibility: 'MARKETPLACE' })).toMatchObject({ all: 1, OPEN: 1, DRAFT: 0 });
    // accent-insensitive keyword on name / brief
    expect(applyCampaignQuery(list, { tab: 'all', keyword: 'am thuc' }).map((x) => x.id)).toEqual(['b']);
    expect(applyCampaignQuery(list, { tab: 'all', keyword: 'SỮA HẠT' }).map((x) => x.id)).toEqual(['d']);
    expect(applyCampaignQuery(list, { tab: 'OPEN' }).map((x) => x.id)).toEqual(['b', 'c']);
    expect(applyCampaignQuery(list, { tab: 'all' }).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(applyCampaignQuery(list, { tab: 'all', sort: 'budget' }).map((x) => x.id)).toEqual(['c', 'd', 'b', 'a']);
    expect(applyCampaignQuery(list, { tab: 'all', sort: 'start' }).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd']);
    // Trạng thái chi tiết nằm trong "Bộ lọc" nên được tính là bộ lọc.
    expect(hasCampaignFilters({ tab: 'OPEN' })).toBe(true);
    expect(hasCampaignFilters({ tab: 'all', group: 'ACTIVE' })).toBe(false);
    expect(hasCampaignFilters({ tab: 'all', visibility: 'PRIVATE' })).toBe(true);
  });

  test('type filter: URL round-trip, counts per type and per status', () => {
    const typed = [
      ...list,
      c('e', 'OPEN', { type: 'OPEN_RECRUITMENT', updatedAt: 5, visibility: 'MARKETPLACE' }),
      c('f', 'CLOSED', { type: 'OPEN_RECRUITMENT', updatedAt: 6, visibility: 'MARKETPLACE' }),
    ];
    const q = { tab: 'all' as const, type: 'OPEN_RECRUITMENT' as const };
    expect(toCampaignListParams(q).toString()).toBe('loai=tuyen-nhieu');
    expect(parseCampaignListParams(new URLSearchParams('loai=booking'))).toEqual({ tab: 'all', type: 'BOOKING' });
    expect(parseCampaignListParams(new URLSearchParams('loai=xyz'))).toEqual({ tab: 'all' });
    expect(hasCampaignFilters(q)).toBe(true);
    // type counts ignore the type filter but follow the tab (missing type = Booking riêng)
    expect(countCampaignTypes(typed, q)).toEqual({ all: 6, BOOKING: 4, OPEN_RECRUITMENT: 2 });
    expect(countCampaignTypes(typed, { tab: 'OPEN' })).toEqual({ all: 3, BOOKING: 2, OPEN_RECRUITMENT: 1 });
    expect(countCampaignTypes(typed, { tab: 'all', visibility: 'MARKETPLACE' })).toEqual({ all: 3, BOOKING: 1, OPEN_RECRUITMENT: 2 });
    // status counts follow the type filter
    expect(countCampaignTabs(typed, q)).toEqual({ all: 2, DRAFT: 0, PENDING_REVIEW: 0, NEEDS_FIX: 0, REJECTED: 0, OPEN: 1, CLOSED: 1, COMPLETED: 0, CANCELLED: 0 });
    expect(countCampaignTabs(typed, { tab: 'all', type: 'BOOKING' })).toMatchObject({ all: 4, OPEN: 2 });
    expect(applyCampaignQuery(typed, q).map((x) => x.id)).toEqual(['f', 'e']);
    expect(applyCampaignQuery(typed, { tab: 'OPEN', type: 'BOOKING' }).map((x) => x.id)).toEqual(['b', 'c']);
  });

  test('sortable columns map onto the list sort', () => {
    expect(CAMPAIGN_COLUMN_SORT.updated).toEqual({ sort: 'updated', dir: 'descending' });
    expect(CAMPAIGN_COLUMN_SORT.budget).toEqual({ sort: 'budget', dir: 'descending' });
    expect(CAMPAIGN_COLUMN_SORT.time).toEqual({ sort: 'start', dir: 'ascending' });
    // every column sort is one of the sort-menu options
    for (const col of Object.values(CAMPAIGN_COLUMN_SORT)) expect(['updated', 'start', 'budget']).toContain(col.sort);
  });

  test('campaignActions per status', () => {
    const none = { edit: false, publish: false, withdraw: false, closeRecruitment: false, close: false, cancel: false, invite: false };
    expect(campaignActions('DRAFT')).toEqual({ ...none, edit: true, publish: true });
    expect(campaignActions('PENDING_REVIEW')).toEqual({ ...none, withdraw: true, cancel: true });
    expect(campaignActions('NEEDS_FIX')).toEqual({ ...none, edit: true, publish: true, cancel: true });
    expect(campaignActions('OPEN')).toEqual({ ...none, edit: true, closeRecruitment: true, cancel: true, invite: true });
    expect(campaignActions('CLOSED')).toEqual({ ...none, close: true, cancel: true });
    expect(campaignActions('COMPLETED')).toEqual(none);
    expect(campaignActions('CANCELLED').cancel).toBe(false);
    expect(campaignActions('OPEN', 'OPEN_RECRUITMENT').invite).toBe(false);
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
    const applied = bk({ id: '1', status: 'APPLIED', origin: 'APPLICATION', allowedActions: ['ACCEPT', 'DECLINE', 'ATTACH_CONTRACT'] });
    const sent = bk({ id: '2', status: 'SENT', allowedActions: ['CANCEL', 'ATTACH_CONTRACT'] });
    const review = bk({ id: '3', campaignId: 'c2', status: 'CONTENT_REVIEW', allowedActions: ['CANCEL', 'REVIEW_CONTENT'] });
    const pay = bk({ id: '4', status: 'VERIFIED', allowedActions: ['CANCEL', 'MARK_PAID'] });
    const rate = bk({ id: '5', status: 'COMPLETED', allowedActions: ['RATE'] });
    const invite = bk({ id: '6', status: 'SENT', allowedActions: ['ACCEPT', 'DECLINE'] });
    expect([applied, sent, review, pay, rate].map(needsBrandAction)).toEqual([true, false, true, true, false]);
    expect(brandTodoLabel(applied)).toBe('Xem đề xuất');
    expect(brandTodoLabel(invite)).toBe('Trả lời lời mời');
    expect(brandTodoLabel(review)).toBe('Duyệt nội dung');
    expect(brandTodoLabel(pay)).toBe('Xác nhận thanh toán');
    expect(brandTodoLabel(sent)).toBeNull();
    expect(pendingByCampaign([applied, sent, review, pay, rate])).toEqual({ c1: 2, c2: 1 });
    expect(sortBookings([sent, { ...rate, updatedAt: 9 }, applied]).map((b) => b.id)).toEqual(['1', '5', '2']);
    expect(openApplications([applied, sent, invite, bk({ id: '7', origin: 'APPLICATION', status: 'ACCEPTED' })]).map((b) => b.id)).toEqual(['1']);
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
    expect(parseDetailTab('hoi-dap', true)).toBe('hoi-dap');
    expect(parseDetailTab('hoi-dap', false)).toBe('tong-quan');
    // 4 tab mới; link cũ vẫn mở đúng chỗ.
    expect(parseDetailTab('thong-tin', false)).toBe('thong-tin');
    expect(parseDetailTab('booking', false)).toBe('hop-tac');
    expect(parseDetailTab('noi-dung', false)).toBe('hop-tac');
    expect(parseDetailTab('ung-tuyen', false)).toBe('ung-vien');
    expect(parseDetailTab('xyz', true)).toBe('tong-quan');
    expect(parseCollabSection(new URLSearchParams('tab=noi-dung'))).toBe('noi-dung');
    expect(parseCollabSection(new URLSearchParams('tab=hop-tac&muc=bao-cao'))).toBe('bao-cao');
    expect(parseCollabSection(new URLSearchParams('tab=hop-tac'))).toBe('danh-sach');
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

describe('tiến độ chiến dịch (EP-02 US-13)', () => {
  const item = (channelId: string, platform: 'tiktok' | 'youtube') => ({ channelId, platform, kolAccountId: `k-${channelId}` }) as BookingView['items'][number];
  const b = (status: BookingView['status'], origin: BookingView['origin'], items: BookingView['items'], awaiting?: BookingView['awaiting']) =>
    ({ status, origin, items, awaiting }) as BookingView;
  const list = [
    b('APPLIED', 'APPLICATION', [item('a', 'tiktok')], 'BRAND'),
    b('ACCEPTED', 'APPLICATION', [item('b', 'tiktok'), item('c', 'youtube')]),
    b('COMPLETED', 'INVITE', [item('d', 'tiktok')]),
    b('CANCELLED', 'INVITE', [item('e', 'youtube')]),
    b('SENT', 'INVITE', [item('f', 'youtube')], 'SUPPLIER'),
    b('CONTENT_REVIEW', 'INVITE', [item('b', 'tiktok')]),
  ];

  test('đơn ≠ booking xác nhận ≠ suất: mỗi chỉ số một tên', () => {
    // Booking 1 KOL: một KOL được chọn là đủ (1/1).
    expect(campaignProgress({ type: 'BOOKING' }, list)).toEqual({
      applications: 2,
      toHandle: 1,
      invites: 4,
      invitesWaiting: 1,
      confirmed: 3,
      slotsUsed: 1,
      slots: 1,
      contentToReview: 1,
      completed: 1,
    });
    expect(campaignProgress({ type: 'BOOKING' }, [])).toMatchObject({ slots: 1, slotsUsed: 0 });
    expect(campaignProgress({ type: 'OPEN_RECRUITMENT', recruitment: { slots: 5 } as never }, list)).toMatchObject({ slots: 5, slotsUsed: 1 });
  });
});

describe('quản lý chiến dịch — UI/UX tối ưu', () => {
  const row = (id: string, status: CampaignView['status'], over: Partial<CampaignView> = {}) =>
    ({ id, name: id, objective: '', brief: '', visibility: 'MARKETPLACE', status, updatedAt: 0, budget: 0, ...over }) as CampaignView;
  const rows = [
    row('nhap', 'DRAFT', { updatedAt: 5 }),
    row('bo-sung', 'NEEDS_FIX', { updatedAt: 4 }),
    row('tuyen-xa', 'OPEN', { updatedAt: 3, applyDeadline: '2099-12-30' }),
    row('tuyen-gan', 'OPEN', { updatedAt: 2, applyDeadline: '2099-01-02' }),
    row('dong', 'CLOSED', { updatedAt: 6 }),
    row('xong', 'COMPLETED', { updatedAt: 1 }),
    row('huy', 'CANCELLED', { updatedAt: 0 }),
  ];

  test('4 nhóm điều hướng: Chuẩn bị · Đang hoạt động (gồm Đã đóng tuyển) · Đã kết thúc; URL ?nhom= & ?can-xu-ly=1', () => {
    expect(countCampaignGroups(rows, { tab: 'all' })).toEqual({ all: 7, PREP: 2, ACTIVE: 3, DONE: 2 });
    expect(applyCampaignQuery(rows, { tab: 'all', group: 'ACTIVE' }).map((c) => c.id)).toEqual(['dong', 'tuyen-xa', 'tuyen-gan']);
    const q = { tab: 'all' as const, group: 'DONE' as const, todo: true };
    expect(toCampaignListParams(q).toString()).toBe('nhom=da-ket-thuc&can-xu-ly=1');
    expect(parseCampaignListParams(new URLSearchParams('nhom=da-ket-thuc&can-xu-ly=1'))).toEqual(q);
    // "Cần xử lý": chỉ chiến dịch có việc.
    expect(applyCampaignQuery(rows, { tab: 'all', todo: true }, new Set(['bo-sung'])).map((c) => c.id)).toEqual(['bo-sung']);
  });

  test('sắp xếp "Sắp hết hạn tuyển": chiến dịch đang tuyển có hạn gần nhất lên đầu', () => {
    expect(applyCampaignQuery(rows, { tab: 'all', sort: 'deadline' }).map((c) => c.id).slice(0, 2)).toEqual(['tuyen-gan', 'tuyen-xa']);
  });

  const b = (status: BookingView['status'], origin: BookingView['origin'], allowedActions: BookingView['allowedActions'], kols: string[] = ['k1']) =>
    ({ status, origin, allowedActions, items: kols.map((k) => ({ kolAccountId: k, platform: 'tiktok' })) }) as unknown as BookingView;

  test('việc cần xử lý ghi rõ hành động, việc chặn lên đầu; CTA theo trạng thái', () => {
    const list = [b('APPLIED', 'APPLICATION', ['ACCEPT', 'DECLINE']), b('APPLIED', 'APPLICATION', ['ACCEPT', 'DECLINE']), b('CONTENT_REVIEW', 'INVITE', ['REVIEW_CONTENT'])];
    // Booking 1 KOL đã có KOL đang làm: nhắc "Đã chọn đủ KOL" thay vì tự đóng tuyển (Công bố lên sàn §9).
    expect(campaignTodos({ status: 'OPEN', type: 'BOOKING' }, list).map((t) => t.text)).toEqual([
      '2 đơn chưa xử lý',
      '1 nội dung chờ duyệt',
      'Đã chọn đủ KOL: cân nhắc đóng tuyển',
    ]);
    expect(campaignTodos({ status: 'NEEDS_FIX', type: 'BOOKING' }, [])[0]).toMatchObject({ key: 'fix', urgent: true, to: 'edit' });
    expect(campaignTodos({ status: 'CLOSED', type: 'BOOKING' }, [b('COMPLETED', 'INVITE', [])]).map((t) => t.key)).toEqual(['complete']);
    expect(campaignCta({ id: 'c1', status: 'DRAFT' }, []).label).toBe('Tiếp tục tạo');
    expect(campaignCta({ id: 'c1', status: 'OPEN' }, [])).toEqual({ label: 'Xem ứng viên', to: '/chien-dich/c1?tab=ung-vien' });
    expect(campaignCta({ id: 'c1', status: 'CLOSED' }, list).label).toBe('Xem ứng viên');
    expect(campaignCta({ id: 'c1', status: 'CLOSED' }, [b('ACCEPTED', 'INVITE', [])]).label).toBe('Quản lý hợp tác');
    expect(campaignCta({ id: 'c1', status: 'COMPLETED' }, []).label).toBe('Xem kết quả');
    // Nút chính (có việc) dùng động từ riêng, không trùng nhãn "Xem …" của nút phụ.
    const [apps, content] = campaignTodos({ status: 'OPEN', type: 'BOOKING' }, list);
    expect(todoCta({ id: 'c1' }, apps)).toEqual({ label: 'Xét duyệt ứng viên', to: '/chien-dich/c1?tab=ung-vien' });
    expect(todoCta({ id: 'c1' }, content)).toEqual({ label: 'Duyệt nội dung', to: '/chien-dich/c1?tab=hop-tac&muc=noi-dung' });
    expect(todoCta({ id: 'c1' }, campaignTodos({ status: 'NEEDS_FIX', type: 'BOOKING' }, [])[0]).to).toBe('/chien-dich/c1/sua');
  });

  test('"Đã chọn x/y KOL": Booking 1 KOL tối đa 1; Booking nhiều KOL đếm mỗi KOL một lần (MCN đại diện nhiều KOL)', () => {
    expect(kolProgress({ type: 'BOOKING' }, [])).toEqual({ chosen: 0, target: 1 });
    expect(kolProgress({ type: 'BOOKING' }, [b('ACCEPTED', 'INVITE', [], ['k1', 'k2'])])).toEqual({ chosen: 1, target: 1 });
    const recruit = { type: 'OPEN_RECRUITMENT' as const, recruitment: { slots: 5 } as never };
    expect(kolProgress(recruit, [b('ACCEPTED', 'APPLICATION', [], ['k1', 'k2']), b('COMPLETED', 'APPLICATION', [], ['k2']), b('APPLIED', 'APPLICATION', [])])).toEqual({ chosen: 2, target: 5 });
    expect(campaignTodos({ status: 'OPEN', type: 'OPEN_RECRUITMENT', recruitment: { slots: 2 } as never }, [b('ACCEPTED', 'APPLICATION', [], ['k1', 'k2'])]).map((t) => t.key)).toEqual(['full']);
  });
});
