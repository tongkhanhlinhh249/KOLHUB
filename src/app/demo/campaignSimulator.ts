import { CAMPAIGNS_PATH } from '../auth/roles';
import { bookingDetailPath } from '../features/supplier-booking/supplierBooking';
import { DEMO_ACCOUNTS, normalizeEmail, type DemoActor, type DemoAccountKey } from '../services';
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

/** Who acts, in words: "Nhãn hàng", the supplier's name, or "Hệ thống". */
export function actorName(actor: DemoActor, supplierName: string): string {
  if (actor === 'BRAND') return 'Nhãn hàng';
  if (actor === 'SUPPLIER') return supplierName;
  return 'Hệ thống';
}
