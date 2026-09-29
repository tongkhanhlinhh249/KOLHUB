// Brand plans (beta): a constant catalog and the brand's current plan (default TRIAL). No enforcement yet.
import { DEFAULT_PLAN, PLANS, type CurrentPlan, type PlanInfo } from '../campaign-types';
import { KolhubError } from '../types';
import type { Db } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';

export interface PlanServiceDeps {
  db: Db;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
}

export function createPlanService(deps: PlanServiceDeps) {
  const { db } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  /** The 3 plans in display order ("Dùng thử" · "Tiêu chuẩn" · "Doanh nghiệp"). */
  function listPlans(): PlanInfo[] {
    return structuredClone(PLANS);
  }

  /** Plan of a brand account (default: the signed-in one, 4016 unless BIZ). Unknown / non-BIZ id → 4016. */
  async function getCurrentPlan(accountId?: string): Promise<CurrentPlan> {
    await wait();
    const state = db.read();
    const id = accountId ?? currentBizAccount(state).id;
    if (state.accounts.find((a) => a.id === id)?.type !== 'BIZ') throw new KolhubError('KOLHUB-4016');
    const stored = state.brandPlans[id];
    const plan = PLANS.find((p) => p.key === (stored?.plan ?? DEFAULT_PLAN))!;
    return stored ? { plan: structuredClone(plan), since: stored.since } : { plan: structuredClone(plan) };
  }

  return { listPlans, getCurrentPlan };
}

export type PlanService = ReturnType<typeof createPlanService>;
