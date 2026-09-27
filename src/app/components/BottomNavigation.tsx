import { Link, useLocation } from 'react-router';
import { cn } from './ui/utils';
import { useAuth } from '../auth/AuthContext';
import { ROLE_CONFIG } from '../auth/roles';

// Mobile-only tab bar (<768px). Items are 44px+ touch targets and clear the home indicator.
export function BottomNavigation() {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const { menu } = ROLE_CONFIG[role];

  const itemClass = (active: boolean) =>
    cn(
      'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
    );

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-panel bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
    >
      <div className="flex items-stretch gap-1 px-2 py-1.5">
        {menu.map((item) => {
          const active = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={itemClass(active)}>
              <item.icon className="size-5" />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
