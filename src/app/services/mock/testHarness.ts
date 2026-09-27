// Test helper (not used by the app): in-memory db, fake clock, sample account ids.
import type { NoticeMessage } from '../profile-types';
import { createDb, type Db } from './db';
import { seedState } from './seed';

export interface Harness {
  db: Db;
  clock: { t: number };
  now: () => number;
  kolId: string;
  mcnId: string;
  notices: NoticeMessage[];
}

export function makeHarness(): Harness {
  const db = createDb(null, seedState);
  const clock = { t: new Date(2026, 8, 27, 9, 0).getTime() };
  const s = db.read();
  const idOf = (email: string) => {
    const acc = s.accounts.find((a) => a.email === email);
    if (!acc) throw new Error(`seed account ${email} missing`);
    return acc.id;
  };
  return {
    db,
    clock,
    now: () => clock.t,
    kolId: idOf('kol@demo.kolhub.vn'),
    mcnId: idOf('mcn@demo.kolhub.vn'),
    notices: [],
  };
}
