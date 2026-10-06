import { useLocation, useNavigate } from 'react-router';
import { BadgeCheck, Building2, Loader2, Store, UserRound, Users, UserX, type LucideIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { IdentityAvatar } from '../components/IdentityAvatar';
import { useIdentity } from '../auth/useIdentity';
import { MARKETPLACE_PATH, isPublicPath } from '../auth/roles';
import type { DemoAccountKey } from '../services';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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

/**
 * Compact "Vai trò" header: who is signed in, a switch to the guest or any sample account (the only role switcher
 * in the app) and the public Sàn seen with the current role.
 */
export function DemoRoleBlock({ onDone }: { onDone?: () => void }) {
  const identity = useIdentity();
  const { options, current, busy, switchTo } = useRoleSwitch(onDone);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onSan = isPublicPath(pathname);

  return (
    <section aria-label="Vai trò" className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-2.5">
        <IdentityAvatar identity={identity} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{identity.name}</p>
          {identity.subtitle && <p className="truncate text-xs text-muted-foreground">{identity.subtitle}</p>}
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-full bg-primary/10 text-primary">
          {identity.roleLabel}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Select value={current?.key ?? 'guest'} onValueChange={(v) => void switchTo(v as DemoAccountKey)} disabled={busy !== null}>
          <SelectTrigger className="h-11 min-w-0 flex-1 bg-background md:h-9" aria-label="Đổi vai trò">
            {busy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Đang chuyển…
              </span>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => {
              const Icon = ICONS[o.key];
              return (
                <SelectItem key={o.key} value={o.key}>
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{o.label}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {/* Not a role: the public Sàn, seen as whoever is signed in now. */}
        <Button
          type="button"
          variant={onSan ? 'default' : 'outline'}
          aria-pressed={onSan}
          disabled={busy !== null}
          title={`Mở Sàn chiến dịch (trang công khai) với vai trò ${identity.roleLabel}`}
          className={cn('h-11 shrink-0 px-3 md:h-9', !onSan && 'bg-background')}
          onClick={() => {
            navigate(MARKETPLACE_PATH);
            onDone?.();
          }}
        >
          <Store aria-hidden />
          Mở Sàn
        </Button>
      </div>
    </section>
  );
}
