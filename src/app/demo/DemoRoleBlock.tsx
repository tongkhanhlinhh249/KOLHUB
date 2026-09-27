import { useState } from 'react';
import { Building2, Loader2, UserRound, Users, UserX, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { ROLE_CONFIG, roleOf } from '../auth/roles';
import { authService, type AccountType, type RoleKey } from '../services';
import { DemoPanelSection } from './DemoPanelSection';

const ROLES: { role: RoleKey; type?: AccountType; icon: LucideIcon }[] = [
  { role: 'kolhub.guest', icon: UserX },
  { role: 'kolhub.user.kol', type: 'KOL', icon: UserRound },
  { role: 'kolhub.user.mcn', type: 'MCN', icon: Users },
  { role: 'kolhub.user.biz', type: 'BIZ', icon: Building2 },
];

/** Quick switch between the guest role and the three sample accounts. */
export function DemoRoleBlock({ onDone }: { onDone?: () => void }) {
  const { role, setAccount, logout } = useAuth();
  const [busy, setBusy] = useState<RoleKey | null>(null);

  const switchTo = async (target: (typeof ROLES)[number]) => {
    if (target.role === role) return;
    setBusy(target.role);
    try {
      if (target.type) {
        const account = await authService.quickLogin(target.type);
        // AccessGuard navigates to the role home once the new role is applied.
        setAccount(account, ROLE_CONFIG[roleOf(account)].home);
      } else {
        await logout(ROLE_CONFIG['kolhub.guest'].home);
      }
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không chuyển được vai trò.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DemoPanelSection title="Vai trò" description="Đăng nhập nhanh bằng tài khoản mẫu của từng vai trò.">
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => {
          const active = r.role === role;
          return (
            <Button
              key={r.role}
              type="button"
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              disabled={busy !== null}
              onClick={() => switchTo(r)}
              className="h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left"
            >
              {busy === r.role ? <Loader2 className="animate-spin" aria-hidden /> : <r.icon aria-hidden />}
              {ROLE_CONFIG[r.role].label}
            </Button>
          );
        })}
      </div>
    </DemoPanelSection>
  );
}
