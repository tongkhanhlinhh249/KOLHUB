import { PanelLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ROLE_CONFIG, getPageMeta } from '../auth/roles';
import logoMarkImg from '../../assets/logo-mark.svg';
import { AccountMenu } from './AccountMenu';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface HeaderProps {
  onToggleSidebar: () => void;
}

// Topbar row inside the content card (NetSpace pattern: h-[61px]).
export function Header({ onToggleSidebar }: HeaderProps) {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const meta = getPageMeta(pathname, role);
  const { home } = ROLE_CONFIG[role];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-panel px-3 md:h-[61px] md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile: logo mark (sidebar is replaced by bottom nav) */}
        <Link to={home} className="flex min-h-11 shrink-0 items-center md:hidden" aria-label="KOLHUB - Trang chính">
          <img src={logoMarkImg} alt="KOLHUB" className="h-7 w-auto object-contain" />
        </Link>

        {/* Tablet/desktop: sidebar toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden size-8 text-muted-foreground md:inline-flex" onClick={onToggleSidebar} aria-label="Bật/tắt sidebar">
              <PanelLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bật/tắt sidebar</TooltipContent>
        </Tooltip>
        <div className="hidden h-4 w-px bg-border md:block" />

        {/* Page title replaces the breadcrumb and the separate description bar */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">{meta.title}</h1>
          </div>
          {meta.description && (
            <p className="mt-0.5 hidden truncate text-xs text-muted-foreground lg:block">{meta.description}</p>
          )}
        </div>
      </div>

      {/* Phones only: the account lives at the bottom of the sidebar on tablet/desktop. */}
      <div className="flex shrink-0 items-center md:hidden">
        <AccountMenu variant="header" />
      </div>
    </header>
  );
}
