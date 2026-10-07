// "Khiên An toàn nội dung" (per channel): pure rules. The shield is evaluated on the SHIELD_WINDOW newest
// scanned contents not marked "Đã gỡ bài": no "Vi phạm" and at most SHIELD_MAX_GRAY "Cần xem lại".
// Lifecycle: request → ACTIVE | FAILED; a later failing window suspends an ACTIVE shield (SHIELD_SUSPEND_DAYS to
// remove the content or appeal), then it is REVOKED; a passing window (new scan, content removed) restores it;
// the KOLHUB operations team decides appeals.
import {
  SHIELD_MAX_GRAY,
  SHIELD_SUSPEND_DAYS,
  SHIELD_WINDOW,
  type PublicShield,
  type ScannedContent,
  type ShieldState,
  type ShieldStatus,
  type ShieldView,
  type ShieldWindow,
} from '../kol-safety-report-types';

const DAY = 86_400_000;

/** Counts of the newest SHIELD_WINDOW contents (newest first) that are not marked removed. */
export function shieldWindow(items: ScannedContent[], removedIds: string[] = []): ShieldWindow {
  const removed = new Set(removedIds);
  const win = items.filter((c) => !removed.has(c.id)).slice(0, SHIELD_WINDOW);
  const w: ShieldWindow = { total: win.length, safe: 0, gray: 0, violation: 0, flaggedIds: [] };
  for (const c of win) {
    if (c.verdict === 'VIOLATION') w.violation++;
    else if (c.verdict === 'GRAY') w.gray++;
    else w.safe++;
    if (c.verdict !== 'SAFE') w.flaggedIds.push(c.id);
  }
  return w;
}

export const windowPasses = (w: ShieldWindow) => w.total >= SHIELD_WINDOW && w.violation === 0 && w.gray <= SHIELD_MAX_GRAY;

export function shieldReasons(w: ShieldWindow): string[] {
  const out: string[] = [];
  if (w.total < SHIELD_WINDOW) out.push(`Cần đủ ${SHIELD_WINDOW} nội dung đã quét (hiện có ${w.total}).`);
  if (w.violation > 0) out.push(`${w.violation} nội dung Vi phạm trong ${SHIELD_WINDOW} nội dung gần nhất (cần 0).`);
  if (w.gray > SHIELD_MAX_GRAY) out.push(`${w.gray} nội dung Cần xem lại (tối đa ${SHIELD_MAX_GRAY}).`);
  return out;
}

/** Status as of `now`: a pending appeal reads APPEALED; SUSPENDED past its deadline (no pending appeal) reads REVOKED. */
export function effectiveShieldStatus(st: ShieldState | undefined, now: number): ShieldStatus {
  if (!st) return 'NONE';
  if (st.appeal?.status === 'PENDING') return 'APPEALED';
  if (st.status === 'SUSPENDED' && st.deadline !== undefined && now > st.deadline) return 'REVOKED';
  return st.status;
}

/** "Xin Khiên An toàn": granted when the window passes, otherwise FAILED (reasons shown). */
export function requestedShield(passes: boolean, now: number): ShieldState {
  return passes ? { status: 'ACTIVE', evaluatedAt: now, grantedAt: now } : { status: 'FAILED', evaluatedAt: now };
}

/**
 * After the window changed (new scan, content marked removed): ACTIVE + failing → SUSPENDED with a deadline;
 * FAILED / SUSPENDED + passing → ACTIVE (a pending appeal is closed as no longer needed). REVOKED stays revoked
 * until requested again. Never requested → unchanged.
 */
export function reevaluatedShield(st: ShieldState | undefined, passes: boolean, now: number): ShieldState | undefined {
  if (!st) return undefined;
  const eff = effectiveShieldStatus(st, now);
  if (eff === 'REVOKED') return { ...st, status: 'REVOKED', evaluatedAt: now };
  if (passes) {
    if (st.status === 'ACTIVE') return { ...st, evaluatedAt: now };
    const { suspendedAt: _s, deadline: _d, ...rest } = st;
    return { ...rest, status: 'ACTIVE', evaluatedAt: now, grantedAt: st.grantedAt ?? now, ...(st.appeal ? { appeal: closeAppeal(st.appeal, now) } : {}) };
  }
  if (st.status === 'ACTIVE') {
    const { appeal: _a, ...rest } = st;
    return { ...rest, status: 'SUSPENDED', evaluatedAt: now, suspendedAt: now, deadline: now + SHIELD_SUSPEND_DAYS * DAY };
  }
  return { ...st, evaluatedAt: now };
}

function closeAppeal(a: NonNullable<ShieldState['appeal']>, now: number): NonNullable<ShieldState['appeal']> {
  return a.status === 'PENDING' ? { ...a, status: 'ACCEPTED', decidedAt: now, decisionNote: 'Nội dung đã đạt lại, không cần xét.' } : a;
}

/** Operations decision on a pending appeal: accepted → ACTIVE; rejected → stays (the suspension deadline keeps running). */
export function decidedShield(st: ShieldState, accept: boolean, note: string | undefined, now: number): ShieldState {
  const appeal = { ...st.appeal!, status: accept ? ('ACCEPTED' as const) : ('REJECTED' as const), decidedAt: now, ...(note ? { decisionNote: note } : {}) };
  if (!accept) return { ...st, appeal };
  const { suspendedAt: _s, deadline: _d, ...rest } = st;
  return { ...rest, status: 'ACTIVE', evaluatedAt: now, grantedAt: st.grantedAt ?? now, appeal };
}

/** Full view of the shield for its owner. */
export function shieldViewOf(
  st: ShieldState | undefined,
  items: ScannedContent[],
  removedIds: string[] | undefined,
  channelVerified: boolean,
  now: number,
): ShieldView {
  const window = shieldWindow(items, removedIds);
  const passes = windowPasses(window);
  const status = effectiveShieldStatus(st, now);
  return {
    status,
    window,
    passes,
    reasons: passes ? [] : shieldReasons(window),
    channelVerified,
    ...(st?.grantedAt !== undefined ? { grantedAt: st.grantedAt } : {}),
    ...(status === 'SUSPENDED' && st?.deadline !== undefined ? { deadline: st.deadline } : {}),
    ...(st?.appeal ? { appeal: { ...st.appeal } } : {}),
    canRequest: channelVerified && (status === 'NONE' || status === 'REVOKED'),
    canAppeal: status === 'SUSPENDED' || status === 'FAILED',
    canMarkRemoved: status !== 'NONE' && status !== 'ACTIVE' && window.flaggedIds.length > 0,
  };
}

/** What brands see: ACTIVE, or SUSPENDED while suspended / under appeal; nothing otherwise. */
export function publicShieldOf(st: ShieldState | undefined, now: number): PublicShield | undefined {
  const s = effectiveShieldStatus(st, now);
  if (s === 'ACTIVE') return 'ACTIVE';
  if (s === 'SUSPENDED' || (s === 'APPEALED' && st?.status === 'SUSPENDED')) return 'SUSPENDED';
  return undefined;
}
