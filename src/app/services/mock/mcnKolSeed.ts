// Seed v7: Sao Việt Media manages 6 sample KOLs, has one invite waiting for Khánh Vy, and assigns half its channels.
import type { McnKolLink } from '../mcn-kol-types';
import type { Channel } from '../profile-types';
import { VERIFIED_MCN_ACCOUNT_ID, VERIFIED_MCN_ID } from './mcnSeed';

const DAY = 86_400_000;
const kolAcc = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;

/** KOL-2026-0011…0016 accepted Sao Việt's invite `[invitedDaysAgo, acceptedDaysAgo]`. */
const ACTIVE: [number, number, number][] = [
  [11, 300, 298],
  [12, 240, 239],
  [13, 180, 176],
  [14, 120, 119],
  [15, 60, 58],
  [16, 20, 19],
];

/** Sao Việt channel number (…-ch-NN) → KOL; the other 6 channels stay "Kênh riêng MCN". */
const ASSIGN: [number, number][] = [
  [1, 11],
  [2, 12],
  [4, 13],
  [5, 14],
  [6, 11],
  [9, 15],
];

/**
 * Links of Sao Việt Media (mutates `channels` to set `assignedKolAccountId`). Khánh Vy (KOL-2026-0001)
 * only has a PENDING invite, so the verified KOL demo stays independent until she accepts.
 */
export function seedMcnKolLinks(channels: Channel[], now: number): McnKolLink[] {
  const links: McnKolLink[] = ACTIVE.map(([n, invited, accepted]) => ({
    id: `mk-seed-${String(n).padStart(4, '0')}`,
    mcnAccountId: VERIFIED_MCN_ACCOUNT_ID,
    kolAccountId: kolAcc(n),
    status: 'ACTIVE',
    invitedAt: now - invited * DAY,
    respondedAt: now - accepted * DAY,
  }));
  links.push({
    id: 'mk-seed-0001',
    mcnAccountId: VERIFIED_MCN_ACCOUNT_ID,
    kolAccountId: kolAcc(1),
    status: 'PENDING',
    invitedAt: now - 2 * DAY,
  });

  for (const [ch, n] of ASSIGN) {
    const id = `${VERIFIED_MCN_ID}-ch-${String(ch).padStart(2, '0')}`;
    const c = channels.find((x) => x.id === id);
    if (c) c.assignedKolAccountId = kolAcc(n);
  }
  return links;
}
