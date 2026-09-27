import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { MonitorPlay, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { initialsOf } from '../../auth/useIdentity';
import { MCN_KOL_STATUS_LABEL, type McnKolLinkStatus, type McnKolRow } from '../../services';
import { formatFollowers } from '../biz-search/format';

// Same tones as shared/StatusBadges (chart-4 = success, chart-5 = warning).
const TONE: Record<McnKolLinkStatus, { badge: string; dot: string }> = {
  ACTIVE: { badge: 'bg-chart-4/15 text-foreground', dot: 'bg-chart-4' },
  PENDING: { badge: 'bg-chart-5/20 text-foreground', dot: 'bg-chart-5' },
  DECLINED: { badge: 'bg-secondary text-secondary-foreground', dot: 'bg-muted-foreground' },
  ENDED: { badge: 'bg-secondary text-secondary-foreground', dot: 'bg-muted-foreground' },
};

export function McnKolStatusBadge({ status, className }: { status: McnKolLinkStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 border-transparent font-medium whitespace-nowrap', TONE[status].badge, className)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', TONE[status].dot)} aria-hidden />
      {MCN_KOL_STATUS_LABEL[status]}
    </Badge>
  );
}

const day = (ms: number) => format(ms, 'dd/MM/yyyy');

/** Date line under the status: when the relation started / was proposed / closed. */
export function statusDate(r: McnKolRow): string {
  switch (r.status) {
    case 'ACTIVE':
      return `Quản lý từ ${day(r.respondedAt ?? r.invitedAt)}`;
    case 'PENDING':
      return `Đã mời ngày ${day(r.invitedAt)}`;
    case 'DECLINED':
      return `KOL từ chối ngày ${day(r.respondedAt ?? r.invitedAt)}`;
    case 'ENDED':
      return `${r.endedBy === 'KOL' ? 'KOL rời MCN' : 'Kết thúc'} ngày ${day(r.endedAt ?? r.invitedAt)}`;
  }
}

export function KolAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <Avatar className={cn('size-12', className)}>
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * One KOL of the MCN. Layout follows the list width (container queries on the parent `@container`):
 * ≥ @3xl one line — [avatar | name, KOL ID, field] · stats · status · actions; below, stacked.
 */
export function McnKolListRow({ row, actions }: { row: McnKolRow; actions: ReactNode }) {
  const meta = [row.category, row.region].filter(Boolean).join(' · ');
  return (
    <Card className="gap-0 p-4 @xl:p-5">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <KolAvatar name={row.displayName} src={row.avatar} className="@xl:size-14" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground" title={row.displayName}>
              {row.displayName}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              <span className="font-mono text-xs">{row.kolId}</span>
              {meta && <> · {meta}</>}
            </p>
          </div>
          {/* Phones: the menu stays next to the name. */}
          <div className="shrink-0 @3xl:hidden">{actions}</div>
        </div>

        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm @3xl:w-60 @3xl:shrink-0">
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Người theo dõi</dt>
            <dd>
              <span className="font-semibold text-foreground">{formatFollowers(row.totalFollowers)}</span>{' '}
              <span className="text-muted-foreground">người theo dõi</span>
            </dd>
          </div>
          {row.status === 'ACTIVE' && (
            <div className="flex items-center gap-1.5">
              <MonitorPlay className="size-4 text-muted-foreground" aria-hidden />
              <dt className="sr-only">Kênh MCN được gán</dt>
              <dd>
                <span className="font-semibold text-foreground">{row.assignedChannelCount}</span>{' '}
                <span className="text-muted-foreground">kênh MCN</span>
              </dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @3xl:w-56 @3xl:shrink-0 @3xl:flex-col @3xl:items-start">
          <McnKolStatusBadge status={row.status} />
          <span className="text-xs text-muted-foreground">{statusDate(row)}</span>
        </div>

        <div className="hidden shrink-0 @3xl:block">{actions}</div>
      </div>
    </Card>
  );
}

export function McnKolListRowSkeleton() {
  return (
    <Card className="gap-0 p-4 @xl:p-5" aria-hidden>
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-6">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="size-12 rounded-full @xl:size-14" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
    </Card>
  );
}
