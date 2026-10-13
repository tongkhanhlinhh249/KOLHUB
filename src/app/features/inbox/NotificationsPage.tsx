import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  BellOff,
  CheckCheck,
  CircleX,
  Clock,
  FileCheck2,
  FilePen,
  Flag,
  Gift,
  Handshake,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  Send,
  ShieldCheck,
  Tag,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { inboxService, type AppNotification, type NotificationKind } from '../../services';
import { useAuth } from '../../auth/AuthContext';
import { useLiveQuery } from '../shared/useLiveQuery';
import { errText } from '../supplier-booking/parts';
import { withParam } from '../supplier-booking/supplierBooking';
import { NOTIFICATION_FILTER_PARAM, parseNotificationFilter, shortTime } from './inboxView';

const ICON: Record<NotificationKind, { icon: LucideIcon; tone: string }> = {
  INVITE: { icon: Mail, tone: 'bg-primary/10 text-primary' },
  PICKED: { icon: Handshake, tone: 'bg-chart-4/15 text-chart-4' },
  NOT_PICKED: { icon: CircleX, tone: 'bg-muted text-muted-foreground' },
  OFFER: { icon: Tag, tone: 'bg-chart-5/20 text-foreground' },
  DRAFT_APPROVED: { icon: FileCheck2, tone: 'bg-chart-4/15 text-chart-4' },
  CHANGES_REQUESTED: { icon: FilePen, tone: 'bg-chart-5/20 text-foreground' },
  POST_VERIFIED: { icon: BadgeCheck, tone: 'bg-chart-4/15 text-chart-4' },
  PAID: { icon: Wallet, tone: 'bg-chart-4/15 text-chart-4' },
  PRODUCT_SENT: { icon: Gift, tone: 'bg-primary/10 text-primary' },
  QA_ANSWERED: { icon: MessageCircleQuestion, tone: 'bg-primary/10 text-primary' },
  INVITE_EXPIRING: { icon: Clock, tone: 'bg-destructive/10 text-destructive' },
  APPLICATION: { icon: Send, tone: 'bg-primary/10 text-primary' },
  ACCEPTED: { icon: Handshake, tone: 'bg-chart-4/15 text-chart-4' },
  DECLINED: { icon: CircleX, tone: 'bg-muted text-muted-foreground' },
  DRAFT_SUBMITTED: { icon: FilePen, tone: 'bg-primary/10 text-primary' },
  PAYMENT_CONFIRMED: { icon: Wallet, tone: 'bg-chart-4/15 text-chart-4' },
  PRODUCT_RECEIVED: { icon: PackageCheck, tone: 'bg-chart-4/15 text-chart-4' },
  QA_ASKED: { icon: MessageCircleQuestion, tone: 'bg-chart-5/20 text-foreground' },
  CANCELLED: { icon: CircleX, tone: 'bg-destructive/10 text-destructive' },
  MESSAGE: { icon: MessageSquare, tone: 'bg-primary/10 text-primary' },
  CAMPAIGN_REVIEW: { icon: ShieldCheck, tone: 'bg-chart-4/15 text-foreground' },
  CAMPAIGN_CLOSED: { icon: Flag, tone: 'bg-muted text-muted-foreground' },
  DEADLINE_SOON: { icon: Clock, tone: 'bg-chart-5/20 text-foreground' },
};

const chip = (active: boolean) =>
  cn(
    'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors md:h-8',
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted',
  );

function NotificationRow({ n, now, onOpen }: { n: AppNotification; now: number; onOpen(): void }) {
  const { icon: Icon, tone } = ICON[n.kind];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full min-w-0 items-start gap-3 rounded-[8px] px-3 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        !n.read && 'bg-primary/5',
      )}
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn('min-w-0 flex-1 text-sm text-foreground', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{shortTime(n.at, now)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm break-words text-muted-foreground">{n.body}</span>
        {n.email && (
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            Đã gửi kèm email tới {n.email}
          </span>
        )}
      </span>
      {!n.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" role="img" />
      )}
    </button>
  );
}

/**
 * /thong-bao — in-app notification center (every signed-in role; opened from the header bell). Notifications come
 * from booking / campaign events, messages and Q&A; each opens its target and becomes read. ?loc=chua-doc.
 */
export function NotificationsPage() {
  const { account } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = parseNotificationFilter(params);
  const q = useLiveQuery(() => inboxService.listNotifications(), [account?.id]);
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const all = q.data;
  const unread = all?.filter((n) => !n.read).length ?? 0;
  const list = all && (filter === 'unread' ? all.filter((n) => !n.read) : all);

  const open = async (n: AppNotification) => {
    try {
      if (!n.read) await inboxService.markNotificationRead(n.id);
    } finally {
      navigate(n.href);
    }
  };
  const readAll = async () => {
    setBusy(true);
    try {
      await inboxService.markAllNotificationsRead();
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  let body: ReactNode;
  if (q.loading && !all) {
    body = (
      <div className="space-y-2" aria-busy="true" aria-label="Đang tải thông báo">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  } else if (q.error && !all) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được thông báo.</span>
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (list && list.length === 0) {
    const Icon = filter === 'unread' ? CheckCheck : BellOff;
    body = (
      <div className="flex flex-col items-center gap-2 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">{filter === 'unread' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo'}</p>
        <p className="max-w-sm text-sm text-muted-foreground">Lời mời, đề xuất, kết quả duyệt nội dung, thanh toán và tin nhắn mới sẽ hiện ở đây.</p>
      </div>
    );
  } else if (list) {
    body = (
      <ul className="flex flex-col gap-1" aria-label="Thông báo">
        {list.map((n) => (
          <li key={n.id}>
            <NotificationRow n={n} now={now} onOpen={() => void open(n)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="group" aria-label="Lọc thông báo">
          <button type="button" className={chip(filter === 'all')} aria-pressed={filter === 'all'} onClick={() => setParams((p) => withParam(p, NOTIFICATION_FILTER_PARAM, null), { replace: true })}>
            <Bell className="size-4" aria-hidden />
            Tất cả
          </button>
          <button
            type="button"
            className={chip(filter === 'unread')}
            aria-pressed={filter === 'unread'}
            onClick={() => setParams((p) => withParam(p, NOTIFICATION_FILTER_PARAM, 'chua-doc'), { replace: true })}
          >
            Chưa đọc
            <span className={cn('text-xs tabular-nums', filter === 'unread' ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{unread}</span>
          </button>
        </div>
        <Button type="button" variant="outline" className="h-11 md:h-8" disabled={busy || unread === 0} onClick={() => void readAll()}>
          <CheckCheck aria-hidden />
          Đánh dấu tất cả đã đọc
        </Button>
      </div>
      {body}
    </div>
  );
}
