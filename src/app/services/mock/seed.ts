import type { DemoState } from './db';
// --- phase 2 ---
import type { Account } from '../types';
import type { KolProfile, McnProfile } from '../profile-types';

const SEED_CREATED_AT = '2026-09-01T08:00:00.000Z';
export const DEMO_PASSWORD = 'demo1234';

/** Demo data: one quick-login account per account type. */
export function seedState(): DemoState {
  return {
    version: 1,
    accounts: [
      {
        id: 'acc-kol-demo',
        type: 'KOL',
        email: 'kol@demo.kolhub.vn',
        phone: '0912000001',
        createdAt: SEED_CREATED_AT,
        password: DEMO_PASSWORD,
      },
      {
        id: 'acc-mcn-demo',
        type: 'MCN',
        email: 'mcn@demo.kolhub.vn',
        phone: '0912000002',
        createdAt: SEED_CREATED_AT,
        password: DEMO_PASSWORD,
      },
      {
        id: 'acc-biz-demo',
        type: 'BIZ',
        email: 'brand@vinamilk-demo.vn',
        fullName: 'Nguyễn Minh Anh',
        company: 'Công ty Demo Sữa',
        createdAt: SEED_CREATED_AT,
        password: DEMO_PASSWORD,
      },
    ],
    otps: [],
    registrations: [],
    loginFails: {},
    sessionAccountId: null,
    // --- phase 2 ---
    kolProfiles: [emptyKolProfile(SEED_KOL, SEED_T)],
    mcnProfiles: [emptyMcnProfile(SEED_MCN, SEED_T)],
    identities: [],
    ekycSessions: [],
    ekycScenario: 'SUCCESS',
    channels: [],
    reviewRequests: [],
    changeRequests: [],
    funnel: [],
  };
}

// --- phase 2 ---
const SEED_T = Date.parse(SEED_CREATED_AT);
const SEED_KOL: Account = { id: 'acc-kol-demo', type: 'KOL', email: 'kol@demo.kolhub.vn', phone: '0912000001', createdAt: SEED_CREATED_AT };
const SEED_MCN: Account = { id: 'acc-mcn-demo', type: 'MCN', email: 'mcn@demo.kolhub.vn', phone: '0912000002', createdAt: SEED_CREATED_AT };

function emptyBase(acc: Account, now: number) {
  return {
    accountId: acc.id,
    contact: {
      displayName: '',
      phone: acc.phone ?? '',
      email: acc.email,
      zalo: '',
      country: 'Việt Nam',
      province: '',
      address: '',
      category: '',
    },
    staff: { staffName: '', staffPhone: '', staffEmail: '' },
    status: 'DRAFT' as const,
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyKolProfile(acc: Account, now: number): KolProfile {
  return { ...emptyBase(acc, now), ownerType: 'KOL', ekycStatus: 'NOT_STARTED' };
}

export function emptyMcnProfile(acc: Account, now: number): McnProfile {
  return {
    ...emptyBase(acc, now),
    ownerType: 'MCN',
    org: { orgName: '', regNo: '', regDate: '', regBy: '', legalRep: '' },
  };
}
