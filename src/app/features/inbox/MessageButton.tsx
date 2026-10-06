import { Link } from 'react-router';
import { MessageSquare } from 'lucide-react';
import { buttonVariants } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { INBOX_PATHS } from '../../services';

/** "Nhắn tin": opens the booking's thread in /tin-nhan (both sides). */
export function MessageButton({ bookingId, className }: { bookingId: string; className?: string }) {
  return (
    <Link to={INBOX_PATHS.thread(bookingId)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-11 md:h-8', className)}>
      <MessageSquare aria-hidden />
      Nhắn tin
    </Link>
  );
}
