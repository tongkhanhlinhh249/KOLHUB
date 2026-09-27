import type { DemoState } from './db';
import type { Account } from '../types';
import { seedKols, seedSavedLists } from './kolSeed';
import { emptyKolProfile, emptyMcnProfile } from './profileRules';

const SEED_CREATED_AT = '2026-09-01T08:00:00.000Z';
const SEED_T = Date.parse(SEED_CREATED_AT);
export const DEMO_PASSWORD = 'demo1234';
export { VERIFIED_KOL_EMAIL } from './kolSeed';

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
 * Demo data v2: the three quick-login accounts (KOL + MCN with empty DRAFT profiles, one Brand),
 * then 40 approved sample KOLs registered like any other KOL (Khánh Vy logs in as khanhvy@demo.kolhub.vn).
 */
export function seedState(): DemoState {
  const now = Date.now();
  const kols = seedKols(now, DEMO_PASSWORD);
  const accounts = [
    { ...SEED_KOL, password: DEMO_PASSWORD },
    { ...SEED_MCN, password: DEMO_PASSWORD },
    { ...SEED_BIZ, password: DEMO_PASSWORD },
    ...kols.accounts,
  ];
  return {
    version: 2,
    accounts,
    otps: [],
    registrations: [],
    loginFails: {},
    sessionAccountId: null,
    savedLists: seedSavedLists(accounts, now),
    kolProfiles: [emptyKolProfile(SEED_KOL, SEED_T), ...kols.kolProfiles],
    mcnProfiles: [emptyMcnProfile(SEED_MCN, SEED_T)],
    identities: kols.identities,
    ekycSessions: [],
    ekycScenario: 'SUCCESS',
    channels: kols.channels,
    reviewRequests: [],
    changeRequests: [],
    funnel: [],
  };
}
