// Pure helpers of "Thu nhập" (record-only ledger, not a wallet): one row per booking with a deal (cash and product
// reward), summary cards, monthly totals and, for MCNs, totals per KOL. Payment itself happens outside KOL Hub.
import type { BookingView } from '../../services';
import { IN_PROGRESS_STATUSES } from '../../services';

/** Cash: Chờ thanh toán → Nhãn hàng đã đánh dấu đã trả → Đã nhận (supplier confirmed). */
export type CashStatus = 'PENDING' | 'MARKED' | 'RECEIVED';
export const CASH_STATUS_LABEL: Record<CashStatus, string> = {
  PENDING: 'Chờ thanh toán',
  MARKED: 'Nhãn hàng đã đánh dấu đã trả',
  RECEIVED: 'Đã nhận',
};

/** Product reward: Chờ gửi → Nhãn hàng đã gửi → Đã nhận. */
export type ProductStatus = 'PENDING' | 'SENT' | 'RECEIVED';
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  PENDING: 'Chờ Nhãn hàng gửi',
  SENT: 'Nhãn hàng đã gửi',
  RECEIVED: 'Đã nhận',
};

export interface EarningShare {
  kolAccountId: string;
  kolName: string;
  /** Share of the booking (0–1) by deliverable quantity. */
  weight: number;
}

export interface EarningRow {
  bookingId: string;
  campaignName: string;
  brandCompany: string;
  /** VND; 0 = product only. */
  cash: number;
  cashStatus: CashStatus;
  product?: { name: string; value: number; status: ProductStatus };
  /** 'YYYY-MM' the row is counted in: received → confirmation, marked → brand's mark, else the deal date. */
  month: string;
  /** Epoch ms behind `month`. */
  at: number;
  shares: EarningShare[];
}

type EarningInput = Pick<BookingView, 'id' | 'status' | 'price' | 'payment' | 'reward' | 'shipment' | 'acceptedAt' | 'createdAt' | 'items'> & {
  campaign: Pick<BookingView['campaign'], 'name' | 'brand'>;
};

const monthKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** "2026-09" → "Tháng 9/2026". */
export const monthLabel = (key: string) => `Tháng ${Number(key.slice(5, 7))}/${key.slice(0, 4)}`;

/** Bookings with a deal (in progress or completed) → ledger rows, newest first. */
export function earningRows(list: EarningInput[]): EarningRow[] {
  const rows: EarningRow[] = [];
  for (const b of list) {
    if (b.status !== 'COMPLETED' && !IN_PROGRESS_STATUSES.includes(b.status)) continue;
    const cashStatus: CashStatus = b.payment.supplierConfirmedAt ? 'RECEIVED' : b.payment.brandMarkedAt ? 'MARKED' : 'PENDING';
    const p = b.reward?.product;
    const product = p
      ? { name: p.name, value: p.value, status: (b.shipment?.receivedAt ? 'RECEIVED' : b.shipment?.sentAt ? 'SENT' : 'PENDING') as ProductStatus }
      : undefined;
    const at = b.payment.supplierConfirmedAt ?? b.payment.brandMarkedAt ?? b.acceptedAt ?? b.createdAt;
    // Product-only reward the brand closed (price 0, COMPLETED without a confirmation) counts as received.
    const status: CashStatus = b.price === 0 && b.status === 'COMPLETED' ? 'RECEIVED' : cashStatus;
    const qty = new Map<string, { name: string; q: number }>();
    for (const it of b.items) {
      const cur = qty.get(it.kolAccountId) ?? { name: it.displayName, q: 0 };
      cur.q += Math.max(1, it.quantity);
      qty.set(it.kolAccountId, cur);
    }
    const total = [...qty.values()].reduce((s, x) => s + x.q, 0) || 1;
    rows.push({
      bookingId: b.id,
      campaignName: b.campaign.name,
      brandCompany: b.campaign.brand.company,
      cash: Math.max(0, b.price),
      cashStatus: status,
      ...(product ? { product } : {}),
      month: monthKey(at),
      at,
      shares: [...qty.entries()].map(([kolAccountId, x]) => ({ kolAccountId, kolName: x.name, weight: x.q / total })),
    });
  }
  return rows.sort((a, b) => b.at - a.at);
}

export interface EarningTotals {
  /** Cash confirmed received. */
  received: number;
  /** Cash not received yet (pending + marked by the brand). */
  pending: number;
  /** Of `pending`: marked paid by the brand, waiting for the supplier's confirmation. */
  marked: number;
  /** Value of product rewards (any status). */
  productValue: number;
  /** Of `productValue`: products received. */
  productReceived: number;
  rows: number;
}

export function earningTotals(rows: Pick<EarningRow, 'cash' | 'cashStatus' | 'product'>[]): EarningTotals {
  const t: EarningTotals = { received: 0, pending: 0, marked: 0, productValue: 0, productReceived: 0, rows: rows.length };
  for (const r of rows) {
    if (r.cashStatus === 'RECEIVED') t.received += r.cash;
    else t.pending += r.cash;
    if (r.cashStatus === 'MARKED') t.marked += r.cash;
    if (r.product) {
      t.productValue += r.product.value;
      if (r.product.status === 'RECEIVED') t.productReceived += r.product.value;
    }
  }
  return t;
}

/** Totals per month, newest month first. */
export function earningsByMonth(rows: EarningRow[]): ({ month: string } & EarningTotals)[] {
  const groups = new Map<string, EarningRow[]>();
  for (const r of rows) groups.set(r.month, [...(groups.get(r.month) ?? []), r]);
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, rs]) => ({ month, ...earningTotals(rs) }));
}

/**
 * MCN: totals per KOL. A booking with several KOLs is split by deliverable quantity (rounded; the remainder goes to
 * the first KOL so the per-KOL totals add up to the booking). Sorted by received + pending, highest first.
 */
export function earningsByKol(rows: EarningRow[]): ({ kolAccountId: string; kolName: string } & EarningTotals)[] {
  const out = new Map<string, { kolAccountId: string; kolName: string } & EarningTotals>();
  for (const r of rows) {
    const split = (v: number) => {
      const parts = r.shares.map((s) => Math.round(v * s.weight));
      parts[0] += v - parts.reduce((a, b) => a + b, 0);
      return parts;
    };
    const cash = split(r.cash);
    const prod = split(r.product?.value ?? 0);
    r.shares.forEach((s, i) => {
      const cur = out.get(s.kolAccountId) ?? {
        kolAccountId: s.kolAccountId,
        kolName: s.kolName,
        received: 0,
        pending: 0,
        marked: 0,
        productValue: 0,
        productReceived: 0,
        rows: 0,
      };
      if (r.cashStatus === 'RECEIVED') cur.received += cash[i];
      else cur.pending += cash[i];
      if (r.cashStatus === 'MARKED') cur.marked += cash[i];
      if (r.product) {
        cur.productValue += prod[i];
        if (r.product.status === 'RECEIVED') cur.productReceived += prod[i];
      }
      cur.rows++;
      out.set(s.kolAccountId, cur);
    });
  }
  return [...out.values()].sort((a, b) => b.received + b.pending - (a.received + a.pending) || a.kolName.localeCompare(b.kolName, 'vi'));
}
