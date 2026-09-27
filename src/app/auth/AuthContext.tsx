import { createContext, useCallback, useContext, useMemo, useRef, useState, type Context, type ReactNode } from 'react';
import { authService, type Account, type RoleKey } from '../services';
import { roleOf } from './roles';

interface AuthValue {
  account: Account | null;
  role: RoleKey;
  /**
   * Change the signed-in account. `redirectTo` is where AccessGuard sends the user
   * once the new role is applied (defaults: login page after sign-out, role home otherwise).
   * Callers should not navigate themselves: the guard would race the router.
   */
  setAccount(a: Account | null, redirectTo?: string): void;
  logout(redirectTo?: string): Promise<void>;
  /** Read by AccessGuard: target requested with the last setAccount, if any. */
  pendingRedirect(): string | null;
  clearPendingRedirect(): void;
}

// Keep one context object across Vite HMR re-evaluations of this module. Without it,
// editing a dependency re-creates the context while mounted consumers still hold the
// old one, and the app crashes with "useAuth must be used inside <AuthProvider>".
const globalKey = '__kolhubAuthContext__';
const store = globalThis as unknown as Record<string, Context<AuthValue | null> | undefined>;
const AuthContext = (store[globalKey] ??= createContext<AuthValue | null>(null));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<Account | null>(() => authService.currentAccount());
  const pending = useRef<string | null>(null);

  const setAccount = useCallback((a: Account | null, redirectTo?: string) => {
    pending.current = redirectTo ?? null;
    setAccountState(a);
  }, []);

  const logout = useCallback(
    async (redirectTo = '/dang-nhap') => {
      await authService.logout();
      setAccount(null, redirectTo);
    },
    [setAccount],
  );

  const pendingRedirect = useCallback(() => pending.current, []);
  const clearPendingRedirect = useCallback(() => {
    pending.current = null;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ account, role: roleOf(account), setAccount, logout, pendingRedirect, clearPendingRedirect }),
    [account, setAccount, logout, pendingRedirect, clearPendingRedirect],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
