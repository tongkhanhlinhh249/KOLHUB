import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { Channel } from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { ChannelStatusBadge } from '../shared/StatusBadges';
import {
  ActiveSwitch,
  ChannelFollowers,
  ChannelLink,
  ChannelVideos,
  EditChannelButton,
  NeedsFixCallout,
  shortUrl,
} from './ChannelParts';

export interface ChannelItemProps {
  channel: Channel;
  accountId: string;
  /** Edit disabled (profile in review and channel pending). */
  locked: boolean;
  now: number;
  onEdit(): void;
}

/** Grid card of one of the owner's channels (modelled on the Brand KolCard). */
export function ChannelCard({ channel, accountId, locked, now, onEdit }: ChannelItemProps) {
  return (
    <Card className="h-full gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted">
          <PlatformIcon platform={channel.platform} className="size-7" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="truncate font-semibold text-foreground" title={channel.handle}>
            {channel.handle || shortUrl(channel.url)}
          </h3>
          <ChannelLink channel={channel} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChannelFollowers channel={channel} />
        <ChannelStatusBadge channel={channel} now={now} />
      </div>

      <ChannelVideos
        channel={channel}
        className="grid grid-cols-2"
        thumbClass="min-w-0"
        emptyClass="col-span-2 aspect-[2/1]"
      />

      <NeedsFixCallout channel={channel} />

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
        <ActiveSwitch channel={channel} accountId={accountId} />
        <EditChannelButton channel={channel} locked={locked} onEdit={onEdit} />
      </div>
    </Card>
  );
}

export function ChannelCardSkeleton() {
  return (
    <Card className="gap-4 p-4" aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="aspect-square rounded-xl" />
        <Skeleton className="aspect-square rounded-xl" />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-11 w-16" />
      </div>
    </Card>
  );
}
