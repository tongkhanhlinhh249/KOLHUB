import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { ChannelStatusBadge } from '../shared/StatusBadges';
import type { ChannelItemProps } from './ChannelCard';
import {
  ActiveSwitch,
  ChannelFollowers,
  ChannelLink,
  ChannelVideos,
  EditChannelButton,
  NeedsFixCallout,
  shortUrl,
} from './ChannelParts';

/**
 * Layout follows the list's own width (container queries on the parent `@container`),
 * because the profile sidebar already takes part of the screen:
 * - ≥ @4xl: one row — [icon | info] · 2 "Video mới nhất" · status · actions.
 * - @xl–@4xl: [icon | info] on top; videos + status, then actions, under the info column.
 * - < @xl: compact card — info, 2 thumbnails side by side, status, full-width actions.
 */
const INFO_GRID = 'grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-3 @xl:grid-cols-[4rem_minmax(0,1fr)] @xl:gap-x-4 @4xl:flex-1';
const SPAN_MIDDLE = 'col-span-2 @xl:col-span-1 @xl:col-start-2';
/** @xl: align with the info column (4rem icon + 1rem gap); @4xl: back in the row. */
const UNDER_INFO = '@xl:ml-20 @4xl:ml-0';
const MEDIA = `flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:gap-5 @4xl:shrink-0 ${UNDER_INFO}`;
/** < @xl: two tiles share the row; @xl+: fixed squares. */
const THUMB = 'w-[calc(50%-0.25rem)] max-w-40 shrink-0 @xl:w-24';
const STATUS = '@4xl:w-52';
const ACTIONS = `flex items-center justify-between gap-3 border-t border-border pt-3 @xl:justify-start @4xl:w-48 @4xl:shrink-0 @4xl:justify-end @4xl:border-t-0 @4xl:pt-0 ${UNDER_INFO}`;

/** Full-width row (list view) of one of the owner's channels, modelled on the Brand KolListRow. */
export function ChannelListRow({ channel, accountId, locked, now, onEdit }: ChannelItemProps) {
  return (
    <Card className="gap-0 p-4 @xl:p-5">
      <div className="flex flex-col gap-4 @4xl:flex-row @4xl:items-center @4xl:gap-6">
        <div className={INFO_GRID}>
          <span className="grid size-12 place-items-center rounded-xl bg-muted @xl:row-span-2 @xl:size-16">
            <PlatformIcon platform={channel.platform} className="size-7 @xl:size-9" />
          </span>
          <div className="min-w-0 space-y-0.5 self-center @xl:self-start">
            <h3 className="truncate font-semibold text-foreground @xl:text-lg" title={channel.handle}>
              {channel.handle || shortUrl(channel.url)}
            </h3>
            <ChannelLink channel={channel} />
          </div>
          <div className={`${SPAN_MIDDLE} space-y-2`}>
            <ChannelFollowers channel={channel} />
            <NeedsFixCallout channel={channel} />
          </div>
        </div>

        <div className={MEDIA}>
          <ChannelVideos channel={channel} className="w-full @xl:w-auto" thumbClass={THUMB} />
          <div className={STATUS}>
            <ChannelStatusBadge channel={channel} now={now} />
          </div>
        </div>

        <div className={ACTIONS}>
          <ActiveSwitch channel={channel} accountId={accountId} />
          <EditChannelButton channel={channel} locked={locked} onEdit={onEdit} />
        </div>
      </div>
    </Card>
  );
}

export function ChannelListRowSkeleton() {
  return (
    <Card className="gap-0 p-4 @xl:p-5" aria-hidden>
      <div className="flex flex-col gap-4 @4xl:flex-row @4xl:items-center @4xl:gap-6">
        <div className={INFO_GRID}>
          <Skeleton className="size-12 rounded-xl @xl:row-span-2 @xl:size-16" />
          <div className="space-y-2 self-center @xl:self-start">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className={`${SPAN_MIDDLE} h-5 w-1/3`} />
        </div>
        <div className={MEDIA}>
          <div className="flex w-full gap-2 @xl:w-auto">
            <Skeleton className={`${THUMB} aspect-square rounded-xl`} />
            <Skeleton className={`${THUMB} aspect-square rounded-xl`} />
          </div>
          <Skeleton className={`${STATUS} h-5 w-28 rounded-full`} />
        </div>
        <div className={ACTIONS}>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-11 w-16" />
        </div>
      </div>
    </Card>
  );
}
