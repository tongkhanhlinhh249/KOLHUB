import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Ellipsis } from 'lucide-react';
import { cn } from './ui/utils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { useAuth } from '../auth/AuthContext';
import { bottomNavOf, isNavActive } from '../auth/roles';

// Mobile-only tab bar (<768px). Items are 44px+ touch targets and clear the home indicator.
// Tabs come from the role's `bottomNav` config; menu items that do not fit go into "Thêm".
export function BottomNavigation() {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const { items, more } = bottomNavOf(role);
  const [moreOpen, setMoreOpen] = useState(false);

  const tabActive = items.map((item) => isNavActive(pathname, item));
  const moreActive = !tabActive.some(Boolean) && more.some((m) => isNavActive(pathname, m));

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
        {items.map((item, i) => (
          // Explicit name = the visible text, so the link is never announced nameless.
          <Link
            key={item.path}
            to={item.path}
            aria-label={item.label}
            aria-current={tabActive[i] ? 'page' : undefined}
            className={itemClass(tabActive[i])}
          >
            <item.icon className="size-5" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
        {more.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={itemClass(moreActive)}
          >
            <Ellipsis className="size-5" aria-hidden />
            <span className="truncate">Thêm</span>
          </button>
        )}
      </div>

      {more.length > 0 && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="gap-2 px-4 pt-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <SheetHeader className="text-left">
              <SheetTitle className="text-base">Thêm</SheetTitle>
              <SheetDescription className="sr-only">Các mục khác trong menu</SheetDescription>
            </SheetHeader>
            <ul className="flex flex-col gap-1">
              {more.map((m) => {
                const active = isNavActive(pathname, m);
                return (
                  <li key={m.path}>
                    <Link
                      to={m.path}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <m.icon className={cn('size-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  );
}
