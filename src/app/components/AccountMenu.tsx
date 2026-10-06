import { Link } from 'react-router';
import { Building2, ChevronsUpDown, ExternalLink, LogOut, Store } from 'lucide-react';
import { BIZ_ACCOUNT_PATH, MARKETPLACE_PATH } from '../auth/roles';
import { useAuth } from '../auth/AuthContext';
import { useIdentity } from '../auth/useIdentity';
import { IdentityAvatar } from './IdentityAvatar';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from './ui/utils';

/**
 * Signed-in account (profile-driven identity, design §2.2) with "Đăng xuất"; brands also reach "Tài khoản doanh nghiệp" here.
 * `sidebar`: bottom of the sidebar (tablet/desktop) — name, ID and role, or only the avatar when collapsed.
 * `header`: avatar in the topbar on phones, where there is no sidebar.
 * `market`: Sàn header — avatar, plus the account name from lg.
 */
export function AccountMenu({
  variant,
  collapsed = false,
  logoutTo = '/dang-nhap',
}: {
  variant: 'sidebar' | 'header' | 'market';
  collapsed?: boolean;
  /** Where to land after "Đăng xuất" (the Sàn keeps the user on the public Sàn). */
  logoutTo?: string;
}) {
  const { logout, account } = useAuth();
  const isBiz = account?.type === 'BIZ';
  const identity = useIdentity();
  // AccessGuard sends the user to `logoutTo` once the role becomes guest.
  const handleLogout = () => void logout(logoutTo);
  const compact = variant !== 'sidebar' || collapsed;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Tài khoản: ${identity.name}`}
          className={cn(
            'flex items-center gap-2.5 rounded-md text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            variant === 'header' && 'min-h-11 rounded-full p-1',
            variant === 'market' && 'min-h-11 rounded-full p-1 lg:pr-3',
            variant === 'sidebar' && (collapsed ? 'mx-auto size-10 justify-center' : 'w-full p-2'),
          )}
        >
          <IdentityAvatar identity={identity} className={variant === 'sidebar' && !collapsed ? 'size-9' : undefined} />
          {variant === 'market' && <span className="hidden max-w-40 truncate text-sm font-medium text-foreground lg:block">{identity.name}</span>}
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{identity.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{identity.subtitle || identity.roleLabel}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={variant === 'sidebar' ? (collapsed ? 'right' : 'top') : 'bottom'}
        align={variant === 'sidebar' ? 'start' : 'end'}
        className="w-64"
      >
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <IdentityAvatar identity={identity} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{identity.name}</p>
            {identity.subtitle && <p className="truncate text-xs text-muted-foreground">{identity.subtitle}</p>}
            <Badge variant="secondary" className="mt-1 h-5 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
              {identity.roleLabel}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isBiz && (
          <>
            <DropdownMenuItem asChild className="min-h-11 md:min-h-0">
              <Link to={BIZ_ACCOUNT_PATH}>
                <Building2 />
                Tài khoản doanh nghiệp
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {variant !== 'market' && (
          <>
            <DropdownMenuItem asChild className="min-h-11 md:min-h-0">
              <a href={MARKETPLACE_PATH} target="_blank" rel="noopener noreferrer">
                <Store />
                <span className="flex-1">Mở Sàn chiến dịch</span>
                <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="sr-only">(mở tab mới)</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem variant="destructive" onSelect={handleLogout} className="min-h-11 md:min-h-0">
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
