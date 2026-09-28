import logoImg from '../../assets/logo.svg';
import logoMarkImg from '../../assets/logo-mark.svg';
import { Link, useLocation } from 'react-router';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';
import { AccountMenu } from './AccountMenu';
import { useAuth } from '../auth/AuthContext';
import { ROLE_CONFIG, type MenuItem } from '../auth/roles';

interface SidebarProps {
  collapsed: boolean;
}

// NetSpace admin pattern: 256px rail, same tint as the page, 67px header.
export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const { role } = useAuth();
  const { home, label, menu } = ROLE_CONFIG[role];
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col bg-page transition-[width] duration-200 motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-[67px] shrink-0 items-center border-b border-panel-sidebar', collapsed ? 'justify-center px-2' : 'px-4')}>
        <Link to={home} aria-label="KOLHUB - Trang chính" className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {collapsed ? (
            <img src={logoMarkImg} alt="KOLHUB" className="h-8 w-auto object-contain" />
          ) : (
            <img src={logoImg} alt="KOLHUB" className="h-7 w-auto object-contain object-left" />
          )}
        </Link>
      </div>

      {/* Main nav */}
      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Role label only when the menu has no own groups (e.g. Nhãn hàng); KOL/MCN show their group headings. */}
        {!collapsed && !menu.some((m) => m.group) && (
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
        )}
        <div className="space-y-3">
          {sections(menu).map((section, i) => (
            <div key={section.group ?? `section-${i}`} role={section.group ? 'group' : undefined} aria-label={section.group}>
              {section.group && !collapsed && (
                <p className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {section.group}
                </p>
              )}
              {collapsed && i > 0 && <div className="mx-2 mb-3 h-px bg-border" aria-hidden />}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink key={item.path} item={item} active={isActive(item.path)} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Account (collapse/expand lives in the topbar) */}
      <div className="shrink-0 border-t border-panel-sidebar p-2">
        <AccountMenu variant="sidebar" collapsed={collapsed} />
      </div>
    </aside>
  );
}

/** Consecutive menu items sharing a `group` form one section (ungrouped runs form their own). */
function sections(menu: MenuItem[]): { group?: string; items: MenuItem[] }[] {
  const out: { group?: string; items: MenuItem[] }[] = [];
  for (const item of menu) {
    const last = out[out.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else out.push({ group: item.group, items: [item] });
  }
  return out;
}

function SidebarLink({ item, active, collapsed }: { item: MenuItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarTip label={collapsed ? item.label : undefined}>
      <Link
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-foreground/70 hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-0'
        )}
      >
        <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
      </Link>
    </SidebarTip>
  );
}

function SidebarTip({ label, children }: { label?: string; children: React.ReactElement }) {
  if (!label) return children;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
