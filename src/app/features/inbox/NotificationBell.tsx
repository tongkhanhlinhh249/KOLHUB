import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { buttonVariants } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import { NOTIFICATIONS_PATH } from '../../auth/roles';
import { badgeText } from './inboxView';
import { useInboxCounts } from './useInboxCounts';

/** Header bell → /thong-bao, with the unread count. */
export function NotificationBell({ active }: { active?: boolean }) {
  const { notifications } = useInboxCounts();
  const text = badgeText(notifications);
  const label = notifications > 0 ? `Thông báo, ${notifications} chưa đọc` : 'Thông báo';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={NOTIFICATIONS_PATH}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative size-11 md:size-9', active ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
        >
          <Bell className="size-5" aria-hidden />
          {text && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums md:top-0.5 md:right-0.5" aria-hidden>
              {text}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent>Thông báo</TooltipContent>
    </Tooltip>
  );
}
