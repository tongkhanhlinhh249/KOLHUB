import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { ROLE_CONFIG, roleOf } from '../auth/roles';
import { authService, DEMO_ACCOUNTS, normalizeEmail, type DemoAccount, type DemoAccountKey } from '../services';

/**
 * State + handler of the prototype role switcher (design §2.3), shown in the Demo Panel "Vai trò" block.
 */
export function useRoleSwitch(onDone?: () => void) {
  const { account, setAccount, logout } = useAuth();
  const [busy, setBusy] = useState<DemoAccountKey | null>(null);

  const email = account?.email ? normalizeEmail(account.email) : '';
  const current: DemoAccount | undefined = account
    ? DEMO_ACCOUNTS.find((d) => d.email && normalizeEmail(d.email) === email)
    : DEMO_ACCOUNTS.find((d) => d.key === 'guest');

  const switchTo = async (key: DemoAccountKey) => {
    if (busy || key === current?.key) return;
    const target = DEMO_ACCOUNTS.find((d) => d.key === key);
    if (!target) return;
    setBusy(key);
    try {
      if (key === 'guest') {
        await logout(ROLE_CONFIG['kolhub.guest'].home);
      } else {
        const next = await authService.quickLogin(key);
        // AccessGuard navigates to the role home once the new role is applied.
        setAccount(next, ROLE_CONFIG[roleOf(next)].home);
      }
      toast.success(`Đã chuyển sang vai trò ${target.label}`);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không chuyển được vai trò.');
    } finally {
      setBusy(null);
    }
  };

  return { options: DEMO_ACCOUNTS, current, busy, switchTo };
}
