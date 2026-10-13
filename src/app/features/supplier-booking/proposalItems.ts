// Pure logic of the proposal item editor (Ứng tuyển / Giao KOL-kênh): eligible channels, initial rows,
// client-side checks and conversion to ProposalItemInput. The service re-checks everything (4809/4812/4803).
import {
  channelBadge,
  DELIVERABLE_QTY_MAX,
  PLATFORM_DELIVERABLES,
  type BookingItem,
  type Channel,
  type Deliverable,
  type DeliverableType,
  type Platform,
  type ProposalItemInput,
  type SupplierType,
} from '../../services';

export interface ItemDraft {
  key: string;
  /** MCN: the managed KOL; KOL: unused (always itself). */
  kolAccountId?: string;
  channelId: string;
  deliverableType: DeliverableType;
  /** Text of the quantity field. */
  quantity: string;
}

export interface ItemErrors {
  kol?: string;
  channel?: string;
  quantity?: string;
}

/**
 * Channels usable in a proposal (spec §6): verified badge, active, on a campaign platform; for an MCN also
 * assigned to `kolAccountId`. `channels` are the supplier's own channels (channelService.list).
 */
export function eligibleChannels(
  channels: Channel[],
  platforms: Platform[],
  now: number,
  supplierType: SupplierType,
  kolAccountId?: string,
): Channel[] {
  return channels.filter(
    (c) =>
      c.active &&
      channelBadge(c, now) === 'VERIFIED' &&
      platforms.includes(c.platform) &&
      (supplierType === 'KOL' || (!!kolAccountId && c.assignedKolAccountId === kolAccountId)),
  );
}

let seq = 0;
export const newRowKey = () => `row-${++seq}`;

/**
 * Starting rows for "Ứng tuyển". KOL: one row per campaign deliverable that has a matching own channel
 * (type and quantity from the deliverable). MCN: one empty row with the first deliverable's type/quantity.
 */
/** `type` if the platform offers it, else the platform's first content type (unknown platform: unchanged). */
export function fitType(type: DeliverableType, platform: Platform | undefined): DeliverableType {
  const allowed = platform ? PLATFORM_DELIVERABLES[platform] : undefined;
  return !allowed || allowed.includes(type) ? type : allowed[0];
}

export function initialRows(supplierType: SupplierType, deliverables: Deliverable[], ownChannels: Channel[]): ItemDraft[] {
  const first = deliverables[0];
  const blank = (): ItemDraft => ({
    key: newRowKey(),
    channelId: '',
    deliverableType: first?.type ?? 'VIDEO',
    quantity: String(first?.quantity ?? 1),
  });
  if (supplierType === 'MCN') return [blank()];
  const rows = deliverables
    .map((d) => {
      const ch = ownChannels.find((c) => c.platform === d.platform);
      return ch ? { key: newRowKey(), channelId: ch.id, deliverableType: d.type, quantity: String(d.quantity) } : null;
    })
    .filter((r): r is ItemDraft => r !== null);
  if (rows.length) return rows;
  const row = blank();
  if (ownChannels[0]) {
    row.channelId = ownChannels[0].id;
    row.deliverableType = fitType(row.deliverableType, ownChannels[0].platform);
  }
  return [row];
}

/** Rows from existing booking items (assign dialog). */
export function rowsFromItems(items: Pick<BookingItem, 'kolAccountId' | 'channelId' | 'deliverableType' | 'quantity'>[]): ItemDraft[] {
  return items.map((i) => ({
    key: newRowKey(),
    kolAccountId: i.kolAccountId,
    channelId: i.channelId ?? '',
    deliverableType: i.deliverableType,
    quantity: String(i.quantity),
  }));
}

function parseQty(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= DELIVERABLE_QTY_MAX ? n : null;
}

/** Per-row errors (empty object = valid). */
export function validateRows(rows: ItemDraft[], supplierType: SupplierType): ItemErrors[] {
  return rows.map((r) => {
    const e: ItemErrors = {};
    if (supplierType === 'MCN' && !r.kolAccountId) e.kol = 'Chọn KOL';
    if (!r.channelId) e.channel = 'Chọn kênh đăng';
    if (parseQty(r.quantity) === null) e.quantity = `Từ 1 đến ${DELIVERABLE_QTY_MAX}`;
    return e;
  });
}

export const rowsValid = (errors: ItemErrors[]) => errors.every((e) => !e.kol && !e.channel && !e.quantity);

export function toProposalItems(rows: ItemDraft[], supplierType: SupplierType): ProposalItemInput[] {
  return rows.map((r) => ({
    ...(supplierType === 'MCN' && r.kolAccountId ? { kolAccountId: r.kolAccountId } : {}),
    channelId: r.channelId,
    deliverableType: r.deliverableType,
    quantity: parseQty(r.quantity) ?? 0,
  }));
}
