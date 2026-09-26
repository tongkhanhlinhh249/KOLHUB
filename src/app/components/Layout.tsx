import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { TooltipProvider } from './ui/tooltip';

const DESKTOP_QUERY = '(min-width: 1024px)';

// Tablet (768–1023px) starts with the icon rail; desktop starts expanded.
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => !window.matchMedia(DESKTOP_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setCollapsed(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return [collapsed, () => setCollapsed((c) => !c)] as const;
}

/*
 * NetSpace admin dashboard shell:
 *   page bg (#f7faff) → sidebar (same tint) + 16px gutter → content card
 *   (rounded-[20px], panel border) → topbar (with page title) → scrollable content.
 * Mobile drops the gutter/card and uses the bottom tab bar instead of the sidebar.
 */
export function Layout() {
  const [collapsed, toggleSidebar] = useSidebarCollapsed();

  return (
    <TooltipProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-page">
        <div className="hidden md:flex">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:py-4 md:pr-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card md:rounded-[20px] md:border md:border-panel">
            <Header onToggleSidebar={toggleSidebar} />

            {/* Bottom padding keeps content clear of the mobile tab bar + home indicator */}
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
              <Outlet />
            </main>
          </div>
        </div>

        <BottomNavigation />
      </div>
    </TooltipProvider>
  );
}
