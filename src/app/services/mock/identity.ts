// Who is signed in, as shown in the header / account menu / demo panel (design §2.2).
import type { Account, AccountType } from '../types';
import type { DemoState } from './db';
import { findProfile } from './profileRules';
import { VERIFIED_KOL_EMAIL } from './kolSeed';
import { VERIFIED_MCN_EMAIL } from './mcnSeed';

export interface DisplayIdentity {
  name: string;
  subtitle?: string;
  avatar?: string;
  roleLabel: string;
}

export const ROLE_LABELS: Record<AccountType | 'GUEST', string> = {
  GUEST: 'Khách',
  KOL: 'Cá nhân/KOL',
  MCN: 'Tổ chức/MCN',
  BIZ: 'Nhãn hàng/Agency',
};

const clean = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ');

function build(name: string, roleLabel: string, subtitle?: string, avatar?: string): DisplayIdentity {
  const out: DisplayIdentity = { name, roleLabel };
  if (subtitle) out.subtitle = subtitle;
  if (avatar) out.avatar = avatar;
  return out;
}

/**
 * Display identity from the registration profile: KOL = displayName (→ email), subtitle KOL ID once
 * approved; MCN = orgName (→ displayName → email), subtitle business reg. no.; Brand = fullName (→ email),
 * subtitle company; `null` = guest.
 */
export function identityOf(state: DemoState, account: Account | null): DisplayIdentity {
  if (!account) return build(ROLE_LABELS.GUEST, ROLE_LABELS.GUEST);
  const email = account.email;
  const label = ROLE_LABELS[account.type];
  if (account.type === 'BIZ') return build(clean(account.fullName) || email, label, clean(account.company));

  const p = findProfile(state, account.id);
  if (!p) return build(email, label);
  const avatar = p.avatar?.thumbnail;
  if (p.ownerType === 'KOL') {
    const subtitle = p.status === 'APPROVED' && p.kolId ? p.kolId : undefined;
    return build(clean(p.contact.displayName) || email, label, subtitle, avatar);
  }
  return build(clean(p.org.orgName) || clean(p.contact.displayName) || email, label, clean(p.org.regNo), avatar);
}

export type DemoAccountKey =
  | 'guest'
  | 'kol-new'
  | 'kol-verified'
  | 'mcn-new'
  | 'mcn-verified'
  | 'biz-new'
  | 'biz-verified';

/** Older role-switcher keys still accepted by `authService.quickLogin`. */
export const DEMO_ACCOUNT_ALIASES: Record<'mcn' | 'biz', DemoAccountKey> = {
  mcn: 'mcn-new',
  biz: 'biz-verified',
};

export interface DemoAccount {
  key: DemoAccountKey;
  label: string;
  /** Seed login used by `authService.quickLogin(key)`; absent for the guest. */
  email?: string;
}

/** Options of the prototype role switcher (NS-KOLHUB-001 §2.3), in display order: a new and a verified account per role. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { key: 'guest', label: 'Khách' },
  { key: 'kol-new', label: 'Cá nhân/KOL (hồ sơ mới)', email: 'kol@demo.kolhub.vn' },
  { key: 'kol-verified', label: 'Cá nhân/KOL (đã xác thực)', email: VERIFIED_KOL_EMAIL },
  { key: 'mcn-new', label: 'Tổ chức/MCN (hồ sơ mới)', email: 'mcn@demo.kolhub.vn' },
  { key: 'mcn-verified', label: 'Tổ chức/MCN (đã xác thực)', email: VERIFIED_MCN_EMAIL },
  { key: 'biz-new', label: 'Nhãn hàng/Agency (tài khoản mới)', email: 'agency@newbrand-demo.vn' },
  { key: 'biz-verified', label: 'Nhãn hàng/Agency (đã xác thực)', email: 'brand@vinamilk-demo.vn' },
];
