import { useLocation, useNavigate } from 'react-router';
import { BadgeCheck, Building2, Loader2, Store, UserRound, Users, UserX, type LucideIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { IdentityAvatar } from '../components/IdentityAvatar';
import { useIdentity } from '../auth/useIdentity';
import { MARKETPLACE_PATH, isPublicPath } from '../auth/roles';
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onSan = isPublicPath(pathname);

  return (
    <DemoPanelSection
      title="Vai trò"
      description="Đăng nhập nhanh bằng tài khoản mẫu của từng vai trò, hoặc mở Sàn chiến dịch (trang công khai) với tài khoản hiện tại."
    >
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
        {/* Not a role: the public Sàn, seen as whoever is signed in now (guest, KOL/MCN or Nhãn hàng). */}
        <Button
          type="button"
          variant={onSan ? 'default' : 'outline'}
          aria-pressed={onSan}
          disabled={busy !== null}
          onClick={() => {
            navigate(MARKETPLACE_PATH);
            onDone?.();
          }}
          className={cn(
            'col-span-2 h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left',
            !onSan && 'border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary',
          )}
        >
          <Store aria-hidden />
          <span className="min-w-0">
            <span className="block">Mở Sàn chiến dịch</span>
            <span className={cn('block text-xs font-normal', onSan ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
              Trang công khai · giữ vai trò {identity.roleLabel}
            </span>
          </span>
        </Button>
      </div>
    </DemoPanelSection>
  );
}
