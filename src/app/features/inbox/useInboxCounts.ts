import { inboxService, type InboxCounts } from '../../services';
import { useAuth } from '../../auth/AuthContext';
import { useLiveQuery } from '../shared/useLiveQuery';

const ZERO: InboxCounts = { messages: 0, notifications: 0 };

/** Unread messages / notifications of the signed-in account, live (reloads after any data change). */
export function useInboxCounts(): InboxCounts {
  const { account } = useAuth();
  const q = useLiveQuery(() => (account ? inboxService.counts() : Promise.resolve(ZERO)), [account?.id]);
  return q.data ?? ZERO;
}

/** Menu path → unread count shown as a badge (sidebar, "Thêm" sheet). */
export function useMenuBadges(): Record<string, number> {
  const { messages } = useInboxCounts();
  return { '/tin-nhan': messages };
}
