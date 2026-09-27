import type { FunnelEvent, FunnelStep } from '../profile-types';
import type { Db, DemoState } from './db';
import { normalizeEmail } from './normalize';

export const FUNNEL_STEPS: { step: FunnelStep; label: string }[] = [
  { step: 'register_started', label: 'Bắt đầu đăng ký' },
  { step: 'otp_email_verified', label: 'Xác thực OTP email' },
  { step: 'otp_sms_verified', label: 'Xác thực OTP SMS' },
  { step: 'ekyc_ocr_passed', label: 'eKYC bước 1 — CCCD' },
  { step: 'ekyc_face_passed', label: 'eKYC bước 2 — khuôn mặt' },
  { step: 'channel_added', label: 'Thêm kênh đầu tiên' },
  { step: 'profile_submitted', label: 'Gửi hồ sơ' },
];

/** Record the first time `subject` reaches `step` (later repeats are ignored). Mutates `state`. */
export function trackFunnel(state: DemoState, subject: string, step: FunnelStep, at: number): void {
  const key = normalizeEmail(subject);
  if (!key) return;
  if (state.funnel.some((e) => e.subject === key && e.step === step)) return;
  state.funnel.push({ subject: key, step, at });
}

export interface FunnelRow {
  step: FunnelStep;
  label: string;
  at?: number;
  /** Time since the closest earlier step that was reached. */
  sincePrevMs?: number;
}

export function buildFunnel(events: FunnelEvent[], subject: string): FunnelRow[] {
  const key = normalizeEmail(subject);
  const mine = events.filter((e) => e.subject === key);
  let prev: number | undefined;
  return FUNNEL_STEPS.map(({ step, label }) => {
    const at = mine.find((e) => e.step === step)?.at;
    if (at === undefined) return { step, label };
    const row: FunnelRow = { step, label, at, ...(prev !== undefined ? { sincePrevMs: at - prev } : {}) };
    prev = at;
    return row;
  });
}

/** "dưới 1 giây", "45 giây", "2 phút 5 giây", "1 giờ 3 phút" (two largest non-zero units). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return 'dưới 1 giây';
  const total = Math.floor(ms / 1000);
  const parts: [number, string][] = [
    [Math.floor(total / 3600), 'giờ'],
    [Math.floor((total % 3600) / 60), 'phút'],
    [total % 60, 'giây'],
  ];
  const first = parts.findIndex(([n]) => n > 0);
  return parts
    .slice(first, first + 2)
    .filter(([n]) => n > 0)
    .map(([n, u]) => `${n} ${u}`)
    .join(' ');
}

export function createFunnelService(deps: { db: Db; now: () => number }) {
  const { db, now } = deps;
  return {
    track(subject: string, step: FunnelStep): void {
      const s = db.read();
      const key = normalizeEmail(subject);
      if (!key || s.funnel.some((e) => e.subject === key && e.step === step)) return;
      db.update((st) => trackFunnel(st, subject, step, now()));
    },
    /** Subjects, most recent activity first. */
    subjects(): string[] {
      const latest = new Map<string, number>();
      for (const e of db.read().funnel) latest.set(e.subject, Math.max(latest.get(e.subject) ?? 0, e.at));
      return [...latest.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
    },
    get(subject: string): FunnelRow[] {
      return buildFunnel(db.read().funnel, subject);
    },
  };
}

export type FunnelService = ReturnType<typeof createFunnelService>;
