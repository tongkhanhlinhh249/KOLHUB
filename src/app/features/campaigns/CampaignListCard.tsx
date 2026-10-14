import { Link } from 'react-router';
import { AlertCircle, ArrowRight, MoreHorizontal } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { cn } from '../../components/ui/utils';
import { applyDeadlineAt, CAMPAIGN_TYPE_LABEL, type BookingView, type CampaignView } from '../../services';
import { CampaignCover } from '../shared/CampaignCover';
import { CampaignStatusBadge } from './CampaignParts';
import { CampaignMenuItems, type CampaignBulkKind } from './CampaignListViews';
import { campaignCta, campaignPath, campaignTodos, collectPosts, formatDayMs, kolProgress, todoCta, type CampaignTodo } from './campaignView';

const DAY = 86_400_000;

/** "Hạn ứng tuyển: 24/10" — highlighted only within the last 2 days of an open campaign (§4.1). */
function DeadlineText({ c, now }: { c: CampaignView; now: number }) {
  const at = applyDeadlineAt(c);
  if (c.status !== 'OPEN' || at === undefined) return null;
  const left = at - now;
  const soon = left > 0 && left <= 2 * DAY;
  const d = new Date(at);
  const day = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return (
    <span className={cn('tabular-nums', soon ? 'font-medium text-chart-5' : 'text-muted-foreground')}>
      Hạn ứng tuyển: {day}
      {soon && ` · còn ${Math.max(1, Math.ceil(left / 3_600_000))} giờ`}
    </span>
  );
}

/** Status-specific facts (§4.3): progress while recruiting, admin feedback before, result after. */
function StatusLine({ c, bookings, now }: { c: CampaignView; bookings: BookingView[]; now: number }) {
  const last = (action: string) => [...(c.log ?? [])].reverse().find((e) => e.action === action)?.at;
  const marketplace = c.type === 'OPEN_RECRUITMENT' || c.visibility === 'MARKETPLACE';
  const k = kolProgress(c, bookings);
  const apps = bookings.filter((b) => b.origin === 'APPLICATION').length;
  const invites = bookings.filter((b) => b.origin === 'INVITE').length;
  const chosen = (
    <span>
      Đã chọn <strong className="font-semibold text-foreground tabular-nums">{k.chosen}/{k.target}</strong> KOL
    </span>
  );
  switch (c.status) {
    case 'DRAFT':
      return null;
    case 'PENDING_REVIEW': {
      const at = last('SUBMITTED');
      return <span>Đang chờ Admin duyệt{at ? ` · gửi ngày ${formatDayMs(at)}` : ''}</span>;
    }
    case 'NEEDS_FIX':
    case 'REJECTED':
      return c.reviewNote ? <span className="line-clamp-1">Admin: {c.reviewNote}</span> : null;
    case 'OPEN':
      return (
        <>
          <span className="tabular-nums">{marketplace ? `${apps} đơn ứng tuyển` : `${invites} lời mời`}</span>
          <span aria-hidden>·</span>
          {chosen}
          {applyDeadlineAt(c) !== undefined && <span aria-hidden>·</span>}
          <DeadlineText c={c} now={now} />
        </>
      );
    case 'CLOSED':
      return chosen;
    case 'COMPLETED': {
      const posts = collectPosts(bookings).length;
      return (
        <span>
          Hoàn tất {c.closedAt ? formatDayMs(c.closedAt) : ''} · {c.noCollaboration ? 'Không phát sinh hợp tác' : `${posts} bài đăng đã xác minh`}
        </span>
      );
    }
    case 'CANCELLED':
      return <span>Đã huỷ {c.closedAt ? formatDayMs(c.closedAt) : ''}</span>;
    default:
      return null;
  }
}

function TodoLine({ todo }: { todo: CampaignTodo }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-sm font-medium', todo.urgent ? 'text-destructive' : 'text-primary')}>
      <AlertCircle className="size-4 shrink-0" aria-hidden />
      {todo.text}
    </p>
  );
}

/**
 * One campaign of the management list (UI/UX tối ưu §4): which campaign, where it stands, how many KOL, what to do
 * next — with one primary action and a ⋯ menu (edit, view on the Sàn, close recruitment, cancel). Brief, budget,
 * dates and booking details stay on the campaign page.
 */
export function CampaignListCard({
  c,
  bookings,
  now,
  onAction,
}: {
  c: CampaignView;
  bookings: BookingView[];
  now: number;
  onAction(kind: CampaignBulkKind, ids: string[]): void;
}) {
  const todos = campaignTodos(c, bookings);
  // Filled = a to-do with its own verb; outline = just open the campaign. The two never share a label.
  const cta = todos[0] ? todoCta(c, todos[0]) : campaignCta(c, bookings);
  const brand = c.promotedBrand?.name ?? c.brand.company;
  return (
    <Card className="@container gap-0 p-0 transition-colors hover:border-primary/40">
      <div className="flex flex-col gap-3 p-4 @2xl:flex-row @2xl:items-center @2xl:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <CampaignCover cover={c.cover} className="aspect-square w-14 shrink-0 rounded-[6px] border border-border @2xl:w-20" iconClassName="size-4" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="text-base leading-snug font-semibold text-foreground">
              <Link
                to={campaignPath(c.id)}
                className="line-clamp-2 hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {c.name}
              </Link>
            </h3>
            <p className="text-sm break-words text-muted-foreground">
              {brand} · {CAMPAIGN_TYPE_LABEL[c.type ?? 'BOOKING']}
            </p>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
              <CampaignStatusBadge status={c.status} className="mr-0.5 shrink-0" />
              <StatusLine c={c} bookings={bookings} now={now} />
            </div>
            {todos[0] && <TodoLine todo={todos[0]} />}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 @2xl:shrink-0">
          <Link to={cta.to} className={buttonVariants({ variant: todos.length ? 'default' : 'outline', className: 'h-11 md:h-9' })}>
            {cta.label}
            <ArrowRight aria-hidden />
          </Link>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground md:size-9" aria-label={`Thao tác khác với ${c.name}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <CampaignMenuItems c={c} onAction={onAction} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
