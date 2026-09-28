import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { initialsOf } from '../../auth/useIdentity';
import type { McnKolRow, Platform } from '../../services';
import { formatFollowers } from '../biz-search/format';
import { PlatformIcon } from '../biz-search/PlatformIcon';

export function KolAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <Avatar className={cn('size-12', className)}>
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}

/** "KOL-2026-0011 · Lifestyle · Hà Nội". */
export function kolMeta(k: { kolId: string; category?: string; region?: string }): string {
  return [k.kolId, k.category, k.region].filter(Boolean).join(' · ');
}

/** Distinct platforms of the assigned channels, first-seen order. */
function platformsOf(row: McnKolRow): Platform[] {
  const out: Platform[] = [];
  for (const c of row.channels) if (!out.includes(c.platform)) out.push(c.platform);
  return out;
}

/**
 * One KOL holding channels of the MCN. Layout follows the list width (container queries on the parent `@container`):
 * ≥ @3xl one line — [avatar | name, KOL ID, field] · followers · assigned channels · actions; below, stacked.
 */
export function McnKolListRow({ row, actions }: { row: McnKolRow; actions: ReactNode }) {
  return (
    <Card className="gap-0 p-4 @xl:p-5">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <KolAvatar name={row.displayName} src={row.avatar} className="@xl:size-14" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground" title={row.displayName}>
              {row.displayName}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{kolMeta(row)}</p>
          </div>
          {/* Phones: the menu stays next to the name. */}
          <div className="shrink-0 @3xl:hidden">{actions}</div>
        </div>

        <p className="flex items-center gap-1.5 text-sm @3xl:w-44 @3xl:shrink-0">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          <span className="font-semibold text-foreground">{formatFollowers(row.totalFollowers)}</span>
          <span className="text-muted-foreground">người theo dõi</span>
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @3xl:w-56 @3xl:shrink-0 @3xl:flex-col @3xl:items-start">
          <p
            className="flex items-center gap-2 text-sm"
            title={row.channels.map((c) => c.handle || c.url).join(', ')}
          >
            <span className="font-semibold text-foreground">{row.assignedChannelCount} kênh</span>
            <span className="flex items-center gap-1">
              {platformsOf(row).map((p) => (
                <PlatformIcon key={p} platform={p} />
              ))}
            </span>
          </p>
          {row.lastAssignedAt !== undefined && (
            <span className="text-xs text-muted-foreground">Gán gần nhất {format(row.lastAssignedAt, 'dd/MM/yyyy')}</span>
          )}
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
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-5 w-28" />
      </div>
    </Card>
  );
}
