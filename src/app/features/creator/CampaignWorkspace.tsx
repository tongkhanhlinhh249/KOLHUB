import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Bookmark, Building2, CalendarClock, CheckCircle2, ChevronRight, ListTodo, RotateCcw } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { bookingService, campaignService } from '../../services';
import { INTERESTED_PATH, MARKETPLACE_PATH, SUPPLIER_CAMPAIGNS_PATH } from '../../auth/roles';
import { CampaignCover } from '../shared/CampaignCover';
import { useLiveQuery } from '../shared/useLiveQuery';
import { phaseBadge } from '../shared/recruitView';
import { marketplaceCampaignPath } from '../supplier-booking/supplierBooking';
import { deriveTodos, dueText, PIPELINE_STAGES, pipelineCounts, stagePath, type DueTone } from './workspace';

const TODO_MAX = 5;
const SAVED_MAX = 3;

const DUE_CLASS: Record<DueTone, string> = {
  overdue: 'text-destructive',
  urgent: 'text-destructive',
  normal: 'text-foreground',
  none: 'text-muted-foreground',
};

function Section({ id, title, action, children, className }: { id: string; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn('rounded-[8px] border border-border bg-card p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={id} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const moreLink = 'inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-0';

/**
 * Campaign workspace on "Tổng quan hồ sơ" (approved KOL / MCN): stage pipeline with counts (each step opens
 * /chien-dich-cua-toi filtered by that stage) and "Việc cần làm" (next action per booking, most urgent first).
 */
export function CampaignWorkspace({ accountId }: { accountId: string }) {
  const q = useLiveQuery(() => bookingService.listForSupplier(), [accountId]);
  const list = q.data;
  const counts = useMemo(() => pipelineCounts(list ?? []), [list]);
  const todos = useMemo(() => deriveTodos(list ?? []), [list]);
  const now = Date.now();

  if (q.loading && !list) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải chiến dịch">
        <Skeleton className="h-24 w-full rounded-[8px]" />
        <Skeleton className="h-40 w-full rounded-[8px]" />
      </div>
    );
  }
  if (q.error && !list) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <span className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4" aria-hidden />
          Không tải được chiến dịch của bạn.
        </span>
        <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
          <RotateCcw aria-hidden />
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="@container space-y-4">
      <Section
        id="ws-pipeline"
        title="Chiến dịch của bạn"
        action={
          <Link to={SUPPLIER_CAMPAIGNS_PATH} className={moreLink}>
            Xem tất cả
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      >
        <ol className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @3xl:grid-cols-5">
          {PIPELINE_STAGES.map((s, i) => (
            <li key={s.key} className={cn(i === PIPELINE_STAGES.length - 1 && 'col-span-2 @lg:col-span-1')}>
              <Link
                to={stagePath(s.key)}
                className={cn(
                  'group flex h-full min-h-[4.5rem] flex-col justify-between gap-1 rounded-[8px] border px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  counts[s.key] > 0 ? 'border-border bg-background' : 'border-dashed border-border bg-muted/30',
                )}
                aria-label={`${s.label}: ${counts[s.key]} chiến dịch`}
              >
                <span className="text-xs leading-snug text-muted-foreground">
                  <span className="mr-1 font-semibold text-foreground/60 tabular-nums">{i + 1}.</span>
                  {s.label}
                </span>
                <span className={cn('text-2xl font-bold tabular-nums', counts[s.key] > 0 ? 'text-foreground' : 'text-muted-foreground')}>{counts[s.key]}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="ws-todo"
        title="Việc cần làm"
        action={
          todos.length > TODO_MAX ? (
            <Link to={`${SUPPLIER_CAMPAIGNS_PATH}?tab=can-xu-ly`} className={moreLink}>
              Xem cả {todos.length} việc
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : undefined
        }
      >
        {todos.length === 0 ? (
          <p className="flex items-center gap-2 rounded-[8px] bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-chart-4" aria-hidden />
            Bạn không có việc nào cần làm lúc này.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {todos.slice(0, TODO_MAX).map((t) => {
              const due = dueText(t.dueAt, now);
              return (
                <li key={t.id}>
                  <Link
                    to={t.href}
                    className="group -mx-2 flex min-h-11 items-center gap-3 rounded-[6px] px-2 py-2.5 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ListTodo className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{t.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.campaignName} · {t.brandCompany}
                      </span>
                    </span>
                    <span className={cn('flex shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap', DUE_CLASS[due.tone])}>
                      <CalendarClock className="size-3.5" aria-hidden />
                      {due.text}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** "Chiến dịch đã lưu" strip on "Tổng quan hồ sơ": a few saved Sàn campaigns + link to "Chiến dịch quan tâm". */
export function SavedCampaignsStrip({ accountId }: { accountId: string }) {
  const q = useLiveQuery(() => campaignService.listSaved(), [accountId]);
  const list = q.data ?? [];
  const now = Date.now();
  if (q.loading && !q.data) return <Skeleton className="h-40 w-full rounded-[8px]" aria-hidden />;
  if (q.error && !q.data) return null;
  return (
    <Section
      id="ws-saved"
      title="Chiến dịch đã lưu"
      action={
        list.length > 0 ? (
          <Link to={INTERESTED_PATH} className={moreLink}>
            Xem tất cả
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : undefined
      }
    >
      {list.length === 0 ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Lưu chiến dịch trên Sàn để xem lại nhanh ở đây.</p>
          <Link to={MARKETPLACE_PATH} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-11 md:h-8' })}>
            <Bookmark aria-hidden />
            Xem Sàn chiến dịch
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.slice(0, SAVED_MAX).map((c) => {
            const badge = phaseBadge(c, now);
            return (
              <li key={c.id}>
                <Link
                  to={marketplaceCampaignPath(c.id)}
                  className="group -mx-2 flex min-h-11 items-center gap-3 rounded-[6px] px-2 py-1.5 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <CampaignCover cover={c.cover} className="aspect-video w-16 shrink-0 rounded-[6px]" iconClassName="size-4" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm leading-snug font-medium text-foreground">{c.name}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Building2 className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{c.brand.company}</span>
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-xs font-semibold tabular-nums', badge.urgent ? 'text-destructive' : 'text-muted-foreground')} title={badge.label}>
                    {badge.text}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > SAVED_MAX && <p className="mt-2 text-xs text-muted-foreground">và {list.length - SAVED_MAX} chiến dịch khác</p>}
    </Section>
  );
}
