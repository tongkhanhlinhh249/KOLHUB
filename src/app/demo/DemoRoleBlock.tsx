import { BadgeCheck, Building2, Loader2, UserRound, Users, UserX, type LucideIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { IdentityAvatar } from '../components/IdentityAvatar';
import { useIdentity } from '../auth/useIdentity';
import type { DemoAccountKey } from '../services';
import { DemoPanelSection } from './DemoPanelSection';
import { useRoleSwitch } from './RoleSwitcher';

/** Role icon for a new account, a check badge for every verified one. */
const ICONS: Record<DemoAccountKey, LucideIcon> = {
  guest: UserX,
  'kol-new': UserRound,
  'kol-verified': BadgeCheck,
  'mcn-new': Users,
  'mcn-verified': BadgeCheck,
  'biz-new': Building2,
  'biz-verified': BadgeCheck,
};

/** Who is signed in + quick switch between the guest and the sample accounts (the only role switcher in the app). */
export function DemoRoleBlock({ onDone }: { onDone?: () => void }) {
  const identity = useIdentity();
  const { options, current, busy, switchTo } = useRoleSwitch(onDone);

  return (
    <DemoPanelSection title="Vai trò" description="Đăng nhập nhanh bằng tài khoản mẫu của từng vai trò.">
      <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5">
        <IdentityAvatar identity={identity} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{identity.name}</p>
          {identity.subtitle && <p className="truncate text-xs text-muted-foreground">{identity.subtitle}</p>}
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full bg-primary/10 text-primary">
          {identity.roleLabel}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = o.key === current?.key;
          const Icon = ICONS[o.key];
          return (
            <Button
              key={o.key}
              type="button"
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              disabled={busy !== null}
              onClick={() => void switchTo(o.key)}
              className={cn(
                'h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left',
                o.key === 'guest' && 'col-span-2',
                !active && 'border-primary/30 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary',
              )}
            >
              {busy === o.key ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />}
              {o.label}
            </Button>
          );
        })}
      </div>
    </DemoPanelSection>
  );
}
