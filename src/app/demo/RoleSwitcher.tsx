import { useState } from 'react';
import { ChevronDown, FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { ROLE_CONFIG, roleOf } from '../auth/roles';
import { authService, DEMO_ACCOUNTS, normalizeEmail, type DemoAccount, type DemoAccountKey } from '../services';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export const ROLE_SWITCH_TITLE = 'Chuyển vai trò (demo)';

/**
 * Shared state + handler of the prototype role switcher (design §2.3). Used by the topbar,
 * the mobile account menu, the guest screens and the Demo Panel "Vai trò" block.
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

type RoleSwitch = ReturnType<typeof useRoleSwitch>;

function RoleRadioItems({ rs }: { rs: RoleSwitch }) {
  return (
    <DropdownMenuRadioGroup value={rs.current?.key ?? ''} onValueChange={(v) => void rs.switchTo(v as DemoAccountKey)}>
      {rs.options.map((o) => (
        <DropdownMenuRadioItem key={o.key} value={o.key} disabled={rs.busy !== null} className="min-h-11 md:min-h-0">
          {o.label}
          {rs.busy === o.key && <Loader2 className="ml-auto size-3.5 animate-spin" aria-hidden />}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** Role options to embed in another dropdown (the account menu on mobile). */
export function RoleSwitchMenuGroup({ className }: { className?: string }) {
  const rs = useRoleSwitch();
  return (
    <DropdownMenuGroup className={className}>
      <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FlaskConical className="size-3.5" aria-hidden />
        {ROLE_SWITCH_TITLE}
      </DropdownMenuLabel>
      <RoleRadioItems rs={rs} />
    </DropdownMenuGroup>
  );
}

/**
 * Compact "Vai trò: …" dropdown with a Demo badge. `variant="topbar"` sits in the app header (≥ md),
 * `variant="guest"` is the small control at the top-right of the auth screens.
 */
export function RoleSwitcher({ variant = 'topbar', className }: { variant?: 'topbar' | 'guest'; className?: string }) {
  const rs = useRoleSwitch();
  const label = rs.current?.label ?? 'Tài khoản khác';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Vai trò: ${label}. ${ROLE_SWITCH_TITLE}`}
          className={cn(
            'inline-flex min-w-0 items-center gap-1.5 rounded-full border border-dashed border-panel text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            variant === 'topbar' ? 'h-8 px-2.5' : 'min-h-11 bg-card/80 px-3 md:min-h-8',
            className,
          )}
        >
          {rs.busy ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden /> : <FlaskConical className="size-3.5 shrink-0" aria-hidden />}
          <span className="truncate">
            Vai trò: <span className="font-medium text-foreground">{label}</span>
          </span>
          <Badge variant="outline" className="h-4 shrink-0 rounded-full px-1.5 text-[10px] font-medium text-muted-foreground">
            Demo
          </Badge>
          <ChevronDown className="size-3.5 shrink-0" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FlaskConical className="size-3.5" aria-hidden />
          {ROLE_SWITCH_TITLE}
        </DropdownMenuLabel>
        <RoleRadioItems rs={rs} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
