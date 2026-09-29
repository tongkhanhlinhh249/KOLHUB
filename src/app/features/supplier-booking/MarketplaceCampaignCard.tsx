import { Link } from 'react-router';
import { Building2, ChevronRight, Users } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { MarketplaceCampaign } from '../../services';
import { ToneBadge } from '../shared/StatusBadges';
import { CategoryChips, CountdownText, PlatformIcons } from './parts';
import { bookingDetailPath, deadlineCountdown, deliverablesSummary, formatDay, formatDayRange, formatVnd } from './supplierBooking';

/** "Đã ứng tuyển" / "Đã được mời" state of the viewer on a campaign. */
export function MyBookingBadge({ myBooking }: { myBooking: NonNullable<MarketplaceCampaign['myBooking']> }) {
  return <ToneBadge tone="success">{myBooking.origin === 'APPLICATION' ? 'Đã ứng tuyển' : 'Đã được mời'}</ToneBadge>;
}

/**
 * One marketplace campaign: brand, name, categories, platforms, deliverables, budget, dates, apply deadline
 * countdown and applications. The title is a stretched button that opens the detail sheet.
 */
export function MarketplaceCampaignCard({ campaign: c, now, onOpen }: { campaign: MarketplaceCampaign; now: number; onOpen(): void }) {
  const countdown = deadlineCountdown(c.applyDeadline, now);
  return (
    <Card className="relative gap-3 p-4 transition-colors hover:border-primary/40 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate font-medium text-foreground">{c.brand.company}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {c.myBooking && <MyBookingBadge myBooking={c.myBooking} />}
          <PlatformIcons platforms={c.platforms} />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-base leading-snug font-semibold break-words text-foreground">
          <button
            type="button"
            onClick={onOpen}
            className="text-left after:absolute after:inset-0 after:rounded-[8px] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {c.name}
          </button>
        </h2>
        {c.objective && <p className="line-clamp-2 text-sm break-words text-muted-foreground">{c.objective}</p>}
      </div>

      <CategoryChips categories={c.categories} />

      <p className="text-sm text-foreground">
        <span className="text-muted-foreground">Hạng mục: </span>
        {deliverablesSummary(c.deliverables)}
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 @2xl:grid-cols-4">
        <div className="min-w-0 space-y-0.5">
          <dt className="text-xs text-muted-foreground">Ngân sách</dt>
          <dd className="text-sm font-semibold text-primary tabular-nums">{formatVnd(c.budget)}</dd>
        </div>
        <div className="min-w-0 space-y-0.5">
          <dt className="text-xs text-muted-foreground">Thời gian</dt>
          <dd className="text-sm font-medium text-foreground">{formatDayRange(c.startDate, c.endDate)}</dd>
        </div>
        <div className="min-w-0 space-y-0.5">
          <dt className="text-xs text-muted-foreground">Hạn ứng tuyển</dt>
          <dd className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-foreground">
            {c.applyDeadline ? (
              <>
                {formatDay(c.applyDeadline)}
                <CountdownText countdown={countdown} />
              </>
            ) : (
              'Không giới hạn'
            )}
          </dd>
        </div>
        <div className="min-w-0 space-y-0.5">
          <dt className="text-xs text-muted-foreground">Đề xuất đã nhận</dt>
          <dd className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Users className="size-3.5 text-muted-foreground" aria-hidden />
            {c.applicationCount}
          </dd>
        </div>
      </dl>

      {c.myBooking && (
        <Link
          to={bookingDetailPath(c.myBooking.id)}
          className="relative z-10 inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-8"
        >
          Xem booking của bạn
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </Card>
  );
}

export function MarketplaceCampaignCardSkeleton() {
  return (
    <Card className="gap-3 p-4 md:p-5" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    </Card>
  );
}
