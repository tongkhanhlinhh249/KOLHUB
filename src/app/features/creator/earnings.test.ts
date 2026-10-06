import { describe, expect, test } from 'vitest';
import { earningRows, earningsByKol, earningsByMonth, earningTotals, monthLabel } from './earnings';

type In = Parameters<typeof earningRows>[0][number];
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const item = (kol: string, name: string, quantity = 1) =>
  ({ id: `${kol}-${quantity}`, kolAccountId: kol, kolId: kol, displayName: name, platform: 'tiktok', deliverableType: 'VIDEO', quantity, kol: null }) as In['items'][number];
const bk = (id: string, status: In['status'], price: number, extra: Partial<In> = {}): In => ({
  id,
  status,
  price,
  payment: {},
  acceptedAt: at(2026, 9, 1),
  createdAt: at(2026, 8, 30),
  items: [item('k1', 'An')],
  campaign: { name: `Chiến dịch ${id}`, brand: { accountId: 'b', company: 'Công ty Demo Sữa' } },
  ...extra,
});

describe('earningRows', () => {
  test('chỉ booking đã chốt (đang thực hiện / hoàn tất); trạng thái tiền theo các mốc ghi nhận', () => {
    const rows = earningRows([
      bk('pending', 'IN_PRODUCTION', 10_000_000),
      bk('marked', 'VERIFIED', 20_000_000, { payment: { brandMarkedAt: at(2026, 9, 20) } }),
      bk('done', 'COMPLETED', 30_000_000, { payment: { brandMarkedAt: at(2026, 8, 10), supplierConfirmedAt: at(2026, 8, 11) } }),
      bk('invite', 'SENT', 5_000_000),
      bk('lost', 'DECLINED', 5_000_000),
      bk('gone', 'CANCELLED', 5_000_000),
    ]);
    expect(rows.map((r) => [r.bookingId, r.cashStatus, r.month])).toEqual([
      ['marked', 'MARKED', '2026-09'],
      ['pending', 'PENDING', '2026-09'],
      ['done', 'RECEIVED', '2026-08'],
    ]);
  });

  test('phần thưởng sản phẩm: chờ gửi / đã gửi / đã nhận; chỉ sản phẩm (giá 0) đã hoàn tất tính là đã nhận', () => {
    const product = { cash: 0, product: { name: 'Bình giữ nhiệt', value: 450_000 } };
    const rows = earningRows([
      bk('p1', 'ACCEPTED', 0, { reward: product }),
      bk('p2', 'ACCEPTED', 0, { reward: product, shipment: { sentAt: at(2026, 9, 2) } }),
      bk('p3', 'COMPLETED', 0, { reward: product, shipment: { sentAt: at(2026, 9, 2), receivedAt: at(2026, 9, 4) }, payment: { brandMarkedAt: at(2026, 9, 6) } }),
    ]);
    const by = Object.fromEntries(rows.map((r) => [r.bookingId, r]));
    expect(by.p1.product).toEqual({ name: 'Bình giữ nhiệt', value: 450_000, status: 'PENDING' });
    expect(by.p2.product!.status).toBe('SENT');
    expect(by.p3.product!.status).toBe('RECEIVED');
    expect(by.p3.cashStatus).toBe('RECEIVED');
  });

  test('chia phần theo số lượng hạng mục của từng KOL', () => {
    const [r] = earningRows([bk('m', 'ACCEPTED', 9_000_000, { items: [item('k1', 'An', 2), item('k2', 'Bình', 1)] })]);
    expect(r.shares.map((s) => [s.kolAccountId, Math.round(s.weight * 100)])).toEqual([
      ['k1', 67],
      ['k2', 33],
    ]);
  });
});

describe('tổng hợp thu nhập', () => {
  const rows = earningRows([
    bk('a', 'COMPLETED', 30_000_000, { payment: { brandMarkedAt: at(2026, 8, 10), supplierConfirmedAt: at(2026, 8, 11) } }),
    bk('b', 'VERIFIED', 20_000_000, { payment: { brandMarkedAt: at(2026, 9, 20) }, items: [item('k2', 'Bình')] }),
    bk('c', 'ACCEPTED', 10_000_000, {
      reward: { cash: 10_000_000, product: { name: 'Máy', value: 2_500_000 } },
      shipment: { sentAt: at(2026, 9, 3), receivedAt: at(2026, 9, 5) },
      items: [item('k1', 'An'), item('k2', 'Bình')],
    }),
  ]);

  test('thẻ tổng: Đã nhận, Đang chờ (gồm đã đánh dấu), Giá trị sản phẩm', () => {
    expect(earningTotals(rows)).toEqual({
      received: 30_000_000,
      pending: 30_000_000,
      marked: 20_000_000,
      productValue: 2_500_000,
      productReceived: 2_500_000,
      rows: 3,
    });
    expect(earningTotals([])).toMatchObject({ received: 0, pending: 0, productValue: 0, rows: 0 });
  });

  test('theo tháng, tháng mới nhất trước', () => {
    const m = earningsByMonth(rows);
    expect(m.map((x) => [x.month, x.received, x.pending, x.productValue])).toEqual([
      ['2026-09', 0, 30_000_000, 2_500_000],
      ['2026-08', 30_000_000, 0, 0],
    ]);
    expect(monthLabel('2026-09')).toBe('Tháng 9/2026');
  });

  test('MCN: theo KOL, booking nhiều KOL được chia và cộng lại đúng tổng', () => {
    const k = earningsByKol(rows);
    expect(k.map((x) => [x.kolAccountId, x.received, x.pending, x.productValue, x.rows])).toEqual([
      ['k1', 30_000_000, 5_000_000, 1_250_000, 2],
      ['k2', 0, 25_000_000, 1_250_000, 2],
    ]);
    const sum = k.reduce((s, x) => s + x.received + x.pending, 0);
    const t = earningTotals(rows);
    expect(sum).toBe(t.received + t.pending);
    // Odd split: remainder goes to the first KOL.
    const odd = earningsByKol(earningRows([bk('o', 'ACCEPTED', 100, { items: [item('x', 'X'), item('y', 'Y'), item('z', 'Z')] })]));
    expect(odd.reduce((s, x) => s + x.pending, 0)).toBe(100);
  });
});
