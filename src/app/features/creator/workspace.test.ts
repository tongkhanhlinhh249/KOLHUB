import { describe, expect, test } from 'vitest';
import type { BookingView } from '../../services';
import { compareTodos, deriveTodos, dueText, endOfDay, parseStageParam, pipelineCounts, stageOf, stagePath, todosOf, type TodoItem } from './workspace';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 6, 10, 0).getTime();

type B = Parameters<typeof todosOf>[0];
const bk = (id: string, status: BookingView['status'], extra: Partial<B> = {}): B => ({
  id,
  status,
  payment: {},
  allowedActions: [],
  campaign: { name: `Chiến dịch ${id}`, brand: { accountId: 'b', company: 'Công ty Demo Sữa' }, endDate: '2026-10-20' },
  ...extra,
});

describe('pipeline', () => {
  test('mỗi trạng thái thuộc đúng một giai đoạn; booking đã đóng không tính', () => {
    expect(stageOf({ status: 'SENT' })).toBe('loi-moi');
    expect(stageOf({ status: 'APPLIED' })).toBe('loi-moi');
    expect(stageOf({ status: 'NEGOTIATING' })).toBe('loi-moi');
    expect(stageOf({ status: 'ACCEPTED' })).toBe('dang-thuc-hien');
    expect(stageOf({ status: 'IN_PRODUCTION' })).toBe('dang-thuc-hien');
    expect(stageOf({ status: 'PUBLISHED' })).toBe('dang-thuc-hien');
    expect(stageOf({ status: 'CONTENT_REVIEW' })).toBe('cho-duyet');
    expect(stageOf({ status: 'VERIFIED' })).toBe('cho-thanh-toan');
    expect(stageOf({ status: 'COMPLETED' })).toBe('hoan-tat');
    for (const s of ['DECLINED', 'CANCELLED', 'EXPIRED'] as const) expect(stageOf({ status: s })).toBeNull();
  });

  test('đếm theo giai đoạn', () => {
    const list = (['SENT', 'APPLIED', 'ACCEPTED', 'CONTENT_REVIEW', 'VERIFIED', 'VERIFIED', 'COMPLETED', 'DECLINED', 'EXPIRED'] as const).map((status) => ({ status }));
    expect(pipelineCounts(list)).toEqual({ 'loi-moi': 2, 'dang-thuc-hien': 1, 'cho-duyet': 1, 'cho-thanh-toan': 2, 'hoan-tat': 1 });
    expect(pipelineCounts([])).toEqual({ 'loi-moi': 0, 'dang-thuc-hien': 0, 'cho-duyet': 0, 'cho-thanh-toan': 0, 'hoan-tat': 0 });
  });

  test('liên kết sâu tới /chien-dich-cua-toi?giai-doan= và đọc lại tham số', () => {
    expect(stagePath('cho-duyet')).toBe('/chien-dich-cua-toi?giai-doan=cho-duyet');
    expect(parseStageParam(new URLSearchParams('giai-doan=hoan-tat'))).toBe('hoan-tat');
    expect(parseStageParam(new URLSearchParams('giai-doan=abc'))).toBeNull();
    expect(parseStageParam(new URLSearchParams(''))).toBeNull();
  });
});

describe('Việc cần làm', () => {
  test('lời mời / đề xuất giá đang chờ KOL → trả lời trước hạn phản hồi', () => {
    const t = todosOf(bk('a', 'SENT', { awaiting: 'SUPPLIER', expiresAt: NOW + 2 * DAY, allowedActions: ['ACCEPT', 'DECLINE'] }));
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ kind: 'ANSWER_INVITE', label: 'Trả lời lời mời', dueAt: NOW + 2 * DAY, brandCompany: 'Công ty Demo Sữa' });
    expect(t[0].href).toBe('/chien-dich-cua-toi?tab=can-xu-ly&booking=a');
    expect(todosOf(bk('b', 'NEGOTIATING', { awaiting: 'SUPPLIER' }))[0].kind).toBe('ANSWER_OFFER');
    expect(todosOf(bk('c', 'APPLIED', { awaiting: 'BRAND' }))).toEqual([]);
  });

  test('nộp nháp (hạn: ngày bắt đầu đăng bài nếu tuyển nhiều KOL, ngày kết thúc nếu booking riêng); đang chờ duyệt thì không', () => {
    const draft = todosOf(bk('d', 'ACCEPTED', { allowedActions: ['SUBMIT_DRAFT'] }));
    expect(draft).toMatchObject([{ kind: 'SUBMIT_DRAFT', dueAt: endOfDay('2026-10-20') }]);
    const timeline = { applyStart: '', applyEnd: '', selectStart: '', selectEnd: '', postStart: '2026-10-10', postEnd: '2026-10-15', reviewStart: '', reviewEnd: '' };
    const recruit = bk('e', 'IN_PRODUCTION', {
      allowedActions: ['SUBMIT_DRAFT'],
      campaign: { name: 'R', brand: { accountId: 'b', company: 'X' }, recruitment: { slots: 1, reward: { cash: 1 }, timeline } },
    });
    expect(todosOf(recruit)[0].dueAt).toBe(endOfDay('2026-10-10'));
    expect(todosOf(bk('f', 'CONTENT_REVIEW', { allowedActions: ['SUBMIT_DRAFT'] }))).toEqual([]);
  });

  test('đăng bài + xác nhận sản phẩm cùng lúc; xác nhận thanh toán khi Nhãn hàng đã đánh dấu', () => {
    const both = todosOf(bk('g', 'ACCEPTED', { allowedActions: ['SUBMIT_POST', 'CONFIRM_PRODUCT_RECEIVED'] }));
    expect(both.map((t) => t.kind)).toEqual(['SUBMIT_POST', 'CONFIRM_PRODUCT']);
    expect(both[1].dueAt).toBeUndefined();
    const pay = todosOf(bk('h', 'VERIFIED', { payment: { brandMarkedAt: NOW }, allowedActions: ['CONFIRM_PAID'] }));
    expect(pay).toMatchObject([{ kind: 'CONFIRM_PAYMENT', href: '/chien-dich-cua-toi?tab=can-xu-ly&booking=h' }]);
    expect(todosOf(bk('i', 'VERIFIED'))).toEqual([]);
    expect(todosOf(bk('j', 'COMPLETED', { allowedActions: ['RATE'] }))).toEqual([]);
  });

  test('sắp xếp: quá hạn và gần hạn trước, việc không có hạn sau cùng; cùng hạn thì trả lời trước, tiền sau', () => {
    const list = deriveTodos([
      bk('pay', 'VERIFIED', { payment: { brandMarkedAt: NOW }, allowedActions: ['CONFIRM_PAID'] }),
      bk('late', 'CONTENT_APPROVED', { allowedActions: ['SUBMIT_POST'], campaign: { name: 'Trễ', brand: { accountId: 'b', company: 'X' }, endDate: '2026-10-01' } }),
      bk('invite', 'SENT', { awaiting: 'SUPPLIER', expiresAt: NOW + DAY }),
      bk('prod', 'ACCEPTED', { allowedActions: ['CONFIRM_PRODUCT_RECEIVED'] }),
      bk('draft', 'ACCEPTED', { allowedActions: ['SUBMIT_DRAFT'] }),
    ]);
    expect(list.map((t) => t.bookingId)).toEqual(['late', 'invite', 'draft', 'prod', 'pay']);
    const a = { kind: 'CONFIRM_PAYMENT', campaignName: 'A' } as TodoItem;
    const b = { kind: 'ANSWER_INVITE', campaignName: 'B' } as TodoItem;
    expect(compareTodos(a, b)).toBeGreaterThan(0);
  });

  test('chữ hạn chót', () => {
    expect(dueText(undefined, NOW)).toEqual({ text: 'Không có hạn', tone: 'none' });
    expect(dueText(NOW - 2 * DAY - 1, NOW)).toEqual({ text: 'Quá hạn 2 ngày', tone: 'overdue' });
    expect(dueText(endOfDay('2026-10-06'), NOW)).toEqual({ text: 'Hạn hôm nay', tone: 'urgent' });
    expect(dueText(NOW + 5 * 3_600_000, NOW)).toEqual({ text: 'Còn 5 giờ', tone: 'urgent' });
    expect(dueText(NOW + 3 * DAY, NOW)).toEqual({ text: 'Còn 3 ngày', tone: 'urgent' });
    expect(dueText(NOW + 10 * DAY, NOW)).toEqual({ text: 'Còn 10 ngày', tone: 'normal' });
  });
});
