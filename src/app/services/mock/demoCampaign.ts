// Demo-only campaign simulator (Demo Panel "Quản lý chiến dịch"). Drives a booking one step at a time on behalf of
// either side WITHOUT switching the signed-in account: every step runs the real booking service against a db view
// whose session is the acting party, so all rules (allowedActions, 4805/4809/4810/4811…) and KOL Safety scans apply.
import type { Booking, BookingParty, BookingStatus, BookingView, CampaignStatus, Platform, ProposalItemInput } from '../campaign-types';
import { BOOKING_EXPIRY_DAYS } from '../campaign-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { createBookingService } from './booking';
import { allowedActions, brandRef, effectiveStatus, routeKol, toBookingView } from './campaignRules';
import { safetyHash } from './safety';
import { seedState } from './seed';

const DAY = 86_400_000;

/** Who performs a simulated step (SYSTEM: the clock, e.g. the 7-day expiry). */
export type DemoActor = BookingParty | 'SYSTEM';

export type DemoStepKey =
  | 'SUPPLIER_ACCEPT'
  | 'SUPPLIER_COUNTER'
  | 'BRAND_ACCEPT'
  | 'BRAND_COUNTER'
  | 'DECLINE'
  | 'EXPIRE'
  | 'SUBMIT_DRAFT'
  | 'APPROVE_CONTENT'
  | 'REQUEST_CHANGES'
  | 'SUBMIT_POST'
  | 'MARK_PAID'
  | 'CONFIRM_PAID'
  | 'RATE';

export interface DemoStep {
  key: DemoStepKey;
  actor: DemoActor;
  label: string;
}

export interface DemoSteps {
  /** The main "next step" button; absent when the booking is finished. */
  primary?: DemoStep;
  secondary: DemoStep[];
  /** Who must act now (null = nobody, the booking is closed). */
  next: BookingParty | null;
}

export interface DemoCampaignOption {
  id: string;
  name: string;
  status: CampaignStatus;
  brandName: string;
  brandEmail?: string;
  bookingCount: number;
}

export interface DemoBookingRow {
  view: BookingView;
  supplierEmail?: string;
  steps: DemoSteps;
}

/**
 * Steps the simulator offers for a booking, derived from the same `allowedActions` each side would get.
 * Pre-accept: the awaited side accepts (or counters when there is no price yet), counters or declines; SENT /
 * APPLIED can also be pushed past the 7-day expiry. After the deal, the single next step of the flow.
 */
export function demoSteps(b: Booking, status: BookingStatus): DemoSteps {
  const brand = allowedActions(b, status, 'BRAND');
  const supplier = allowedActions(b, status, 'SUPPLIER');
  const secondary: DemoStep[] = [];
  const done: DemoSteps = { secondary, next: null };

  if (['SENT', 'APPLIED', 'NEGOTIATING'].includes(status) && b.awaiting) {
    const who = b.awaiting;
    const sup = who === 'SUPPLIER';
    const accept: DemoStep = sup
      ? { key: 'SUPPLIER_ACCEPT', actor: who, label: b.origin === 'INVITE' && status === 'SENT' ? 'KOL/MCN nhận lời mời' : 'KOL/MCN đồng ý giá' }
      : { key: 'BRAND_ACCEPT', actor: who, label: status === 'APPLIED' ? 'Nhãn hàng duyệt ứng tuyển' : 'Nhãn hàng đồng ý giá' };
    const counter: DemoStep = sup
      ? { key: 'SUPPLIER_COUNTER', actor: who, label: b.price > 0 ? 'KOL/MCN trả giá (+10%)' : 'KOL/MCN báo giá' }
      : { key: 'BRAND_COUNTER', actor: who, label: 'Nhãn hàng trả giá (−10%)' };
    const noPrice = !(b.price > 0);
    const primary = noPrice && sup ? counter : accept;
    if (!noPrice) secondary.push(counter);
    else if (!sup) secondary.push(accept);
    secondary.push({ key: 'DECLINE', actor: who, label: sup ? 'KOL/MCN từ chối' : 'Nhãn hàng từ chối' });
    if (status === 'SENT' || status === 'APPLIED') secondary.push({ key: 'EXPIRE', actor: 'SYSTEM', label: 'Cho hết hạn' });
    return { primary, secondary, next: who };
  }
  if (supplier.includes('SUBMIT_DRAFT') && status !== 'CONTENT_REVIEW') {
    return { primary: { key: 'SUBMIT_DRAFT', actor: 'SUPPLIER', label: 'KOL/MCN nộp bản nháp mẫu' }, secondary, next: 'SUPPLIER' };
  }
  if (brand.includes('REVIEW_CONTENT')) {
    secondary.push({ key: 'REQUEST_CHANGES', actor: 'BRAND', label: 'Nhãn hàng yêu cầu sửa' });
    return { primary: { key: 'APPROVE_CONTENT', actor: 'BRAND', label: 'Nhãn hàng duyệt nội dung' }, secondary, next: 'BRAND' };
  }
  if (supplier.includes('SUBMIT_POST')) {
    return { primary: { key: 'SUBMIT_POST', actor: 'SUPPLIER', label: 'KOL/MCN gửi link bài mẫu' }, secondary, next: 'SUPPLIER' };
  }
  if (brand.includes('MARK_PAID')) {
    return { primary: { key: 'MARK_PAID', actor: 'BRAND', label: 'Nhãn hàng đánh dấu đã thanh toán' }, secondary, next: 'BRAND' };
  }
  if (supplier.includes('CONFIRM_PAID')) {
    return { primary: { key: 'CONFIRM_PAID', actor: 'SUPPLIER', label: 'KOL/MCN xác nhận đã nhận tiền' }, secondary, next: 'SUPPLIER' };
  }
  if (status === 'COMPLETED' && (brand.includes('RATE') || supplier.includes('RATE'))) {
    return { primary: { key: 'RATE', actor: brand.includes('RATE') ? 'BRAND' : 'SUPPLIER', label: 'Hai bên đánh giá 5 sao' }, secondary, next: null };
  }
  return done;
}

/** A db view whose session is `accountId` (reads and writes); the real session is left untouched. */
export function actingAs(db: Db, accountId: string): Db {
  return {
    read: () => ({ ...db.read(), sessionAccountId: accountId }),
    update: (fn) =>
      db.update((s) => {
        const real = s.sessionAccountId;
        s.sessionAccountId = accountId;
        try {
          fn(s);
        } finally {
          s.sessionAccountId = real;
        }
      }),
    reset: () => db.reset(),
  };
}

/** Pushes a SENT / APPLIED booking past its 7-day reply window (it then reads as EXPIRED everywhere). */
export function expireBooking(state: DemoState, bookingId: string, t: number): void {
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b) throw new KolhubError('KOLHUB-4804');
  const c = state.campaigns.find((x) => x.id === b.campaignId);
  if ((b.status !== 'SENT' && b.status !== 'APPLIED') || effectiveStatus(b, c, t) === 'EXPIRED') throw new KolhubError('KOLHUB-4805');
  b.createdAt = t - BOOKING_EXPIRY_DAYS * DAY - 60_000;
  b.updatedAt = t;
}

/** Replaces campaigns, bookings and Sàn bookmarks with fresh seed data; accounts, profiles and session stay. */
export function resetCampaignData(state: DemoState, fresh: DemoState = seedState()): void {
  state.campaigns = fresh.campaigns;
  state.bookings = fresh.bookings;
  state.savedCampaigns = fresh.savedCampaigns;
}

/** A link for `platform` that passes the mock post verification (host must match the platform). */
export function samplePostUrl(platform: Platform, handle: string | undefined, seed: string): string {
  const id = String(safetyHash(seed)).padStart(10, '0');
  const h = (handle ?? 'kenh.demo').replace(/^@/, '') || 'kenh.demo';
  if (platform === 'youtube') return `https://www.youtube.com/watch?v=demo${id}`;
  if (platform === 'facebook') return `https://www.facebook.com/${h}/videos/10${id}`;
  return `https://www.tiktok.com/@${h}/video/74${id}`;
}

const roundPrice = (n: number) => Math.max(1_000_000, Math.round(n / 500_000) * 500_000);

export interface DemoCampaignServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
  genId?: () => string;
}

export function createDemoCampaignService(deps: DemoCampaignServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay(200));
  const emailOf = (s: DemoState, id: string) => s.accounts.find((a) => a.id === id)?.email;

  /** Every campaign with at least one booking first, then the rest (drafts last), newest first within a group. */
  async function listCampaigns(): Promise<DemoCampaignOption[]> {
    const s = db.read();
    const count = (id: string) => s.bookings.filter((b) => b.campaignId === id).length;
    return s.campaigns
      .map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        brandName: brandRef(
          s.accounts.find((a) => a.id === c.brandAccountId),
          c.brandAccountId,
        ).company,
        brandEmail: emailOf(s, c.brandAccountId),
        bookingCount: count(c.id),
        updatedAt: c.updatedAt,
      }))
      .sort((a, b) => Number(b.bookingCount > 0) - Number(a.bookingCount > 0) || b.updatedAt - a.updatedAt)
      .map(({ updatedAt: _u, ...rest }) => rest);
  }

  /** Bookings of a campaign seen from the brand side (newest first), each with the steps the simulator can run. */
  async function listBookings(campaignId: string): Promise<DemoBookingRow[]> {
    const s = db.read();
    const t = now();
    const c = s.campaigns.find((x) => x.id === campaignId);
    return s.bookings
      .filter((b) => b.campaignId === campaignId)
      // Stable order (newest booking first) so rows do not jump while the presenter clicks through steps.
      .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
      .map((b) => ({
        view: toBookingView(s, b, 'BRAND', t),
        supplierEmail: emailOf(s, b.supplierAccountId),
        steps: demoSteps(b, effectiveStatus(b, c, t)),
      }));
  }

  /** Runs one simulated step through the booking service as the acting party. */
  async function run(bookingId: string, key: DemoStepKey): Promise<void> {
    const s = db.read();
    const b = s.bookings.find((x) => x.id === bookingId);
    if (!b) throw new KolhubError('KOLHUB-4804');
    const t = now();
    const c = s.campaigns.find((x) => x.id === b.campaignId);
    const offered = demoSteps(b, effectiveStatus(b, c, t));
    const step = [offered.primary, ...offered.secondary].find((x) => x?.key === key);
    if (!step) throw new KolhubError('KOLHUB-4805');
    if (step.actor === 'SYSTEM') {
      await wait();
      db.update((st) => expireBooking(st, bookingId, now()));
      return;
    }
    const svcFor = (party: BookingParty) =>
      createBookingService({
        db: actingAs(db, party === 'BRAND' ? b.brandAccountId : b.supplierAccountId),
        now,
        delay: deps.delay,
        genId: deps.genId,
      });
    const svc = svcFor(step.actor);

    switch (key) {
      case 'SUPPLIER_ACCEPT':
        await fillMissingChannels(b, svc);
        await svc.accept(bookingId);
        return;
      case 'BRAND_ACCEPT':
        await svc.accept(bookingId);
        return;
      case 'SUPPLIER_COUNTER':
        await fillMissingChannels(b, svc);
        await svc.counter(bookingId, b.price > 0 ? roundPrice(b.price * 1.1) : 30_000_000, 'Đề xuất giá từ chế độ demo.');
        return;
      case 'BRAND_COUNTER':
        await svc.counter(bookingId, roundPrice(b.price * 0.9), 'Đề xuất giá từ chế độ demo.');
        return;
      case 'DECLINE':
        await svc.decline(bookingId, 'Từ chối từ chế độ demo.');
        return;
      case 'SUBMIT_DRAFT':
        await svc.submitDraft(bookingId, {
          title: 'Bản nháp mẫu',
          file: { name: `ban-nhap-mau-${(b.contents.length + 1).toString()}.mp4`, type: 'video/mp4', size: 32_000_000 },
          durationSec: 60,
          note: 'Bản nháp tạo từ chế độ demo.',
        });
        return;
      case 'APPROVE_CONTENT':
      case 'REQUEST_CHANGES': {
        const pending = b.contents.filter((x) => x.kind === 'DRAFT' && x.status === 'PENDING');
        if (key === 'REQUEST_CHANGES') {
          await svc.reviewContent(bookingId, pending[0].id, 'REQUEST_CHANGES', 'Vui lòng gắn nhãn #QuangCao ở đầu video (góp ý mẫu).');
          return;
        }
        for (const d of pending) await svc.reviewContent(bookingId, d.id, 'APPROVE');
        return;
      }
      case 'SUBMIT_POST': {
        const posted = new Set(b.contents.filter((x) => x.kind === 'POST').map((x) => x.itemId));
        for (const it of b.items.filter((i) => !posted.has(i.id))) {
          const ch = it.channelId ? s.channels.find((x) => x.id === it.channelId) : undefined;
          const url = samplePostUrl(it.platform, ch?.handle, `${bookingId}:${it.id}:${t}`);
          await svc.submitPost(bookingId, { itemId: it.id, url, title: 'Bài đăng mẫu' });
        }
        return;
      }
      case 'MARK_PAID':
        await svc.markPaid(bookingId);
        return;
      case 'CONFIRM_PAID':
        await svc.confirmPaid(bookingId);
        return;
      case 'RATE': {
        if (!b.ratings?.brand) await svcFor('BRAND').rate(bookingId, 5, 'Hợp tác suôn sẻ (đánh giá mẫu).');
        if (!b.ratings?.supplier) await svcFor('SUPPLIER').rate(bookingId, 5, 'Brief rõ ràng (đánh giá mẫu).');
        return;
      }
    }
  }

  /** Supplier side: items still without a publishing channel get the first eligible one (via assignItems). */
  async function fillMissingChannels(b: Booking, svc: ReturnType<typeof createBookingService>): Promise<void> {
    if (b.items.every((i) => i.channelId)) return;
    const s = db.read();
    const t = now();
    const c = s.campaigns.find((x) => x.id === b.campaignId);
    const items: ProposalItemInput[] = b.items.map((it) => {
      const channelId =
        it.channelId ??
        routeKol(s, it.kolAccountId, t).channels.find(
          (ch) => ch.ownerId === b.supplierAccountId && ch.ownerType === b.supplierType && !!c?.platforms.includes(ch.platform),
        )?.id;
      if (!channelId) throw new KolhubError('KOLHUB-4809');
      return { kolAccountId: it.kolAccountId, channelId, deliverableType: it.deliverableType, quantity: it.quantity };
    });
    await svc.assignItems(b.id, items);
  }

  async function resetCampaigns(): Promise<void> {
    await wait();
    db.update((s) => resetCampaignData(s));
  }

  return { listCampaigns, listBookings, run, resetCampaigns };
}

export type DemoCampaignService = ReturnType<typeof createDemoCampaignService>;
