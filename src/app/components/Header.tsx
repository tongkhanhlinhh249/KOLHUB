import { ChevronDown, LogOut, Briefcase, PanelLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useUser } from '../contexts/UserContext';
import logoMarkImg from '../../assets/logo-mark.svg';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { secondaryNavItems, getPageMeta } from './navigation';

interface HeaderProps {
  onToggleSidebar: () => void;
}

// Topbar row inside the content card (NetSpace pattern: h-[61px]).
export function Header({ onToggleSidebar }: HeaderProps) {
  const { user } = useUser();
  const { pathname } = useLocation();
  const meta = getPageMeta(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-panel px-3 md:h-[61px] md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile: logo mark (sidebar is replaced by bottom nav) */}
        <Link to="/" className="flex shrink-0 items-center md:hidden" aria-label="KOLHUB - Tổng quan">
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
            <Badge variant="secondary" className="hidden h-5 shrink-0 px-1.5 text-[10px] sm:inline-flex">{meta.group}</Badge>
          </div>
          {meta.description && (
            <p className="mt-0.5 hidden truncate text-xs text-muted-foreground lg:block">{meta.description}</p>
          )}
        </div>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Tài khoản"
            className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm font-normal transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0 md:border md:border-panel md:pr-3"
          >
            <Badge variant="secondary" className="hidden gap-1 rounded-full bg-primary/10 text-primary md:inline-flex">
              <Briefcase className="size-3" />
              Nhãn hàng
            </Badge>
            <Avatar className="size-8">
              <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
            <Avatar className="size-10">
              <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          {/* On mobile these live in the bottom nav "Thêm" sheet */}
          <div className="hidden md:block">
            <DropdownMenuSeparator />
            {secondaryNavItems.map((item) => (
              <DropdownMenuItem key={item.path} asChild>
                <Link to={item.path}>
                  <item.icon />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
