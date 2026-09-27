import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { authService, type Account, type RoleKey } from '../services';
import { roleOf } from './roles';

interface AuthValue {
  account: Account | null;
  role: RoleKey;
  setAccount(a: Account | null): void;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(() => authService.currentAccount());

  const logout = useCallback(async () => {
    await authService.logout();
    setAccount(null);
  }, []);

  const value = useMemo<AuthValue>(() => ({ account, role: roleOf(account), setAccount, logout }), [account, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
