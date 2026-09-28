// Seed v8: Sao Việt Media assigns 6 of its 12 channels to sample KOLs; the other 6 stay "Kênh riêng MCN".
import type { Channel } from '../profile-types';
import { VERIFIED_MCN_ID } from './mcnSeed';

const DAY = 86_400_000;
const kolAcc = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;

/** [Sao Việt channel number (…-ch-NN), KOL number, assigned days ago]. KOL-2026-0011 holds two channels. */
const ASSIGN: [number, number, number][] = [
  [1, 11, 290],
  [6, 11, 30],
  [2, 12, 230],
  [4, 13, 170],
  [5, 14, 110],
  [9, 15, 1],
];

/** Sets `assignedKolAccountId` / `assignedAt` on Sao Việt channels. Khánh Vy (KOL-2026-0001) gets none. */
export function seedMcnChannelAssignments(channels: Channel[], now: number): void {
  for (const [ch, n, daysAgo] of ASSIGN) {
    const c = channels.find((x) => x.id === `${VERIFIED_MCN_ID}-ch-${String(ch).padStart(2, '0')}`);
    if (!c) continue;
    c.assignedKolAccountId = kolAcc(n);
    c.assignedAt = now - daysAgo * DAY;
  }
}
