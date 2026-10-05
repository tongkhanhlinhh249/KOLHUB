import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { authService, DEMO_ACCOUNTS, normalizeEmail } from '../services';
import type { DemoLink } from './demoLinks';

/**
 * Opens a demo link as its demo account: navigates directly when already signed in as that account, otherwise
 * quick-logs in first (AccessGuard then navigates to `link.path`). `busy` is the label of the link being opened.
 */
export function useDemoOpen(onDone?: () => void) {
  const { account, setAccount } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const currentEmail = account?.email ? normalizeEmail(account.email) : '';

  const open = async (link: DemoLink) => {
    const target = DEMO_ACCOUNTS.find((d) => d.key === link.account);
    if (!target?.email || busy) return;
    if (normalizeEmail(target.email) === currentEmail) {
      navigate(link.path);
      onDone?.();
      return;
    }
    setBusy(link.label);
    try {
      const next = await authService.quickLogin(link.account);
      // AccessGuard navigates to `link.path` once the new role is applied.
      setAccount(next, link.path);
      toast.success(`Đã chuyển sang ${target.label}`);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không mở được đường dẫn.');
    } finally {
      setBusy(null);
    }
  };

  return { open, busy };
}
