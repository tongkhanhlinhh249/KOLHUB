import type { DemoState } from './db';
// --- phase 3 ---
import { seedDirectory, seedSavedLists } from './directorySeed';

const SEED_CREATED_AT = '2026-09-01T08:00:00.000Z';
export const DEMO_PASSWORD = 'demo1234';

/** Demo data: one quick-login account per account type. */
export function seedState(): DemoState {
  const state: Omit<DemoState, 'directory' | 'savedLists'> = {
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
  };
  // --- phase 3 ---
  const now = Date.now();
  return {
    ...state,
    directory: seedDirectory(now),
    savedLists: seedSavedLists(state.accounts, now),
  };
}
