import type { FunnelStep } from '../profile-types';
import type { DemoState } from './db';
import { normalizeEmail } from './normalize';

/** Record the first time `subject` reaches `step` (later repeats are ignored). Mutates `state`. */
export function trackFunnel(state: DemoState, subject: string, step: FunnelStep, at: number): void {
  const key = normalizeEmail(subject);
  if (!key) return;
  if (state.funnel.some((e) => e.subject === key && e.step === step)) return;
  state.funnel.push({ subject: key, step, at });
}
