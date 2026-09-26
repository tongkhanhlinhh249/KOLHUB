import { Link, useLocation } from 'react-router';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { cn } from './ui/utils';
import { mainNavItems, secondaryNavItems } from './navigation';

// Mobile-only tab bar (<768px). Items are 44px+ touch targets and clear the home indicator.
export function BottomNavigation() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const moreActive = secondaryNavItems.some((item) => item.path === pathname);

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
        {mainNavItems.map((item) => {
          const active = pathname === item.path;
          return (
            <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={itemClass(active)}>
              <item.icon className="size-5" />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button type="button" className={itemClass(moreActive)}>
              <Menu className="size-5" />
              <span>Thêm</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="gap-0 rounded-t-2xl pb-safe">
            <SheetHeader className="pb-2">
              <SheetTitle>Thêm</SheetTitle>
              <SheetDescription className="sr-only">Các mục điều hướng khác</SheetDescription>
            </SheetHeader>
            <div className="space-y-1 px-4 pb-4">
              {secondaryNavItems.map((item) => {
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
