import { useEffect, useState } from 'react';
import { db, identityOf, subscribeData, type Account, type DisplayIdentity } from '../services';
import { useAuth } from './AuthContext';

function compute(account: Account | null): DisplayIdentity {
  const state = db.read();
  // Re-read the account so edits made after sign-in (Brand full name / company) show up too.
  const fresh = account ? (state.accounts.find((a) => a.id === account.id) ?? account) : null;
  return identityOf(state, fresh);
}

const same = (a: DisplayIdentity, b: DisplayIdentity) =>
  a.name === b.name && a.subtitle === b.subtitle && a.avatar === b.avatar && a.roleLabel === b.roleLabel;

/**
 * Display identity of the signed-in user (design §2.2), kept live: it follows profile edits
 * (display name, avatar, org name) through the demo store subscription and role switches.
 */
export function useIdentity(): DisplayIdentity {
  const { account } = useAuth();
  const [identity, setIdentity] = useState(() => compute(account));

  useEffect(() => {
    const refresh = () => {
      const next = compute(account);
      setIdentity((prev) => (same(prev, next) ? prev : next));
    };
    refresh();
    return subscribeData(refresh);
  }, [account]);

  return identity;
}

/** Up to two initials for the avatar fallback. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const pick = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return pick.map((w) => [...w][0] ?? '').join('').toUpperCase();
}
