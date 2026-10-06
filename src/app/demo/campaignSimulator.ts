import { CAMPAIGNS_PATH } from '../auth/roles';
import { bookingDetailPath } from '../features/supplier-booking/supplierBooking';
import { DEMO_ACCOUNTS, normalizeEmail, type DemoAccountKey, type DemoBookingRow, type DemoCampaignOption } from '../services';
import type { DemoLink } from './demoLinks';

type SignedInKey = Exclude<DemoAccountKey, 'guest'>;

/** Demo account (Đường dẫn nhanh) signed in with `email`, if any. */
export function demoAccountKeyOf(email: string | undefined): SignedInKey | null {
  if (!email) return null;
  const e = normalizeEmail(email);
  const d = DEMO_ACCOUNTS.find((x) => x.key !== 'guest' && x.email && normalizeEmail(x.email) === e);
  return (d?.key as SignedInKey | undefined) ?? null;
}

/** "Mở chiến dịch" as the brand: the campaign's Booking (or Ứng viên) tab. Null when the brand is not a demo account. */
export function brandCampaignLink(campaignId: string, brandEmail: string | undefined, tab: 'booking' | 'ung-tuyen' = 'booking'): DemoLink | null {
  const account = demoAccountKeyOf(brandEmail);
  if (!account) return null;
  return { label: 'Góc nhìn Nhãn hàng', path: `${CAMPAIGNS_PATH}/${encodeURIComponent(campaignId)}?tab=${tab}`, account };
}

/** "Mở" a booking as its KOL/MCN: the booking sheet on /chien-dich-cua-toi. Null when not a demo account. */
export function supplierBookingLink(bookingId: string, supplierEmail: string | undefined, supplierName: string): DemoLink | null {
  const account = demoAccountKeyOf(supplierEmail);
  if (!account) return null;
  return { label: `Góc nhìn ${supplierName}`, path: bookingDetailPath(bookingId), account };
}

export interface CampaignEntry {
  campaign: DemoCampaignOption;
  rows: DemoBookingRow[];
}

/**
 * Campaigns shown in a role section: the brand sees every campaign and booking; a KOL / MCN only its own bookings
 * (supplier email = signed-in email), and only campaigns that have some.
 */
export function entriesFor(entries: CampaignEntry[], brand: boolean, email: string | undefined): CampaignEntry[] {
  if (brand) return entries;
  const me = email ? normalizeEmail(email) : '';
  return entries
    .map((e) => ({ ...e, rows: e.rows.filter((r) => !!me && !!r.supplierEmail && normalizeEmail(r.supplierEmail) === me) }))
    .filter((e) => e.rows.length > 0);
}
