import type { DemoState } from './db';
import type { Account } from '../types';
import { seedKols, seedSavedLists } from './kolSeed';
import { seedVerifiedMcn } from './mcnSeed';
import { emptyKolProfile, emptyMcnProfile } from './profileRules';

const SEED_CREATED_AT = '2026-09-01T08:00:00.000Z';
const SEED_T = Date.parse(SEED_CREATED_AT);
export const DEMO_PASSWORD = 'demo1234';
export { VERIFIED_KOL_EMAIL } from './kolSeed';
export { VERIFIED_MCN_EMAIL } from './mcnSeed';

const SEED_KOL: Account = { id: 'acc-kol-demo', type: 'KOL', email: 'kol@demo.kolhub.vn', phone: '0912000001', createdAt: SEED_CREATED_AT };
const SEED_MCN: Account = { id: 'acc-mcn-demo', type: 'MCN', email: 'mcn@demo.kolhub.vn', phone: '0912000002', createdAt: SEED_CREATED_AT };
const SEED_BIZ: Account = {
  id: 'acc-biz-demo',
  type: 'BIZ',
  email: 'brand@vinamilk-demo.vn',
  fullName: 'Nguyễn Minh Anh',
  company: 'Công ty Demo Sữa',
  createdAt: SEED_CREATED_AT,
};
/**
 * Brand-new Brand/Agency account: it exists only after the company-email OTP (BR-04a/BR-46), so the
 * email is verified, but it has no saved lists yet.
 */
const SEED_BIZ_NEW: Account = {
  id: 'acc-biz-new',
  type: 'BIZ',
  email: 'agency@newbrand-demo.vn',
  fullName: 'Trần Thu Hà',
  company: 'Công ty TNHH Newbrand Agency',
  createdAt: '2026-09-27T08:00:00.000Z',
};

/**
 * Demo data v3: the quick-login accounts (KOL + MCN with empty DRAFT profiles, the approved MCN
 * "Sao Việt Media" with 12 managed channels, a verified Brand with saved lists and a brand-new Brand),
 * then 40 approved sample KOLs registered like any other KOL (Khánh Vy logs in as khanhvy@demo.kolhub.vn).
 */
export function seedState(): DemoState {
  const now = Date.now();
  const kols = seedKols(now, DEMO_PASSWORD);
  const mcn = seedVerifiedMcn(now, DEMO_PASSWORD);
  // The first account of each type is what quickLogin('KOL' | 'MCN' | 'BIZ') picks.
  const accounts = [
    { ...SEED_KOL, password: DEMO_PASSWORD },
    { ...SEED_MCN, password: DEMO_PASSWORD },
    { ...SEED_BIZ, password: DEMO_PASSWORD },
    mcn.account,
    { ...SEED_BIZ_NEW, password: DEMO_PASSWORD },
    ...kols.accounts,
  ];
  return {
    version: 3,
    accounts,
    otps: [],
    registrations: [],
    loginFails: {},
    sessionAccountId: null,
    savedLists: seedSavedLists(accounts, now),
    kolProfiles: [emptyKolProfile(SEED_KOL, SEED_T), ...kols.kolProfiles],
    mcnProfiles: [emptyMcnProfile(SEED_MCN, SEED_T), mcn.profile],
    identities: kols.identities,
    ekycSessions: [],
    ekycScenario: 'SUCCESS',
    channels: [...kols.channels, ...mcn.channels],
    reviewRequests: [],
    changeRequests: [],
    funnel: [],
  };
}
