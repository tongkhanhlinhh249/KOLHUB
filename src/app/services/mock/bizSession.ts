import { KolhubError } from '../types';
import type { DemoState, StoredAccount } from './db';

/** Signed-in Brand/Agency account; anything else → KOLHUB-4016 (BR-53, BR-59). */
export function currentBizAccount(state: DemoState): StoredAccount {
  const acc = state.sessionAccountId ? state.accounts.find((a) => a.id === state.sessionAccountId) : undefined;
  if (!acc || acc.type !== 'BIZ') throw new KolhubError('KOLHUB-4016');
  return acc;
}
