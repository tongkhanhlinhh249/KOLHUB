import { Bookmark, BookmarkCheck, ExternalLink, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { ChannelDirectoryItem } from '../../services';
import { formatFollowers, initials } from '../biz-search/format';
import { FieldBadges, VideoThumb } from '../biz-search/KolMedia';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { ChannelBadge } from '../biz-search/StatusBadges';

/**
 * One verified channel (list view only). Layout follows the row's own width:
 *   ≥ @4xl: tile · channel + owner · fields · followers/badge · video · actions on one line
 *   below:   tile + channel/owner on top, the rest wraps underneath; full-width actions on phones.
 */
export function ChannelDirectoryRow({
  item,
  saved,
  onOpenKol,
  onSave,
}: {
  item: ChannelDirectoryItem;
  saved: boolean;
  onOpenKol(): void;
  onSave(): void;
}) {
  const label = platformLabel(item.platform);
  return (
    <Card className="@container gap-0 p-4">
      <div className="flex flex-col gap-3 @4xl:flex-row @4xl:items-center @4xl:gap-5">
        <div className="flex min-w-0 items-start gap-3 @4xl:w-[34%] @4xl:shrink-0">
          <PlatformIcon platform={item.platform} mono className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 space-y-1">
            <a
              href={`https://${item.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 rounded-sm font-semibold text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="truncate">@{item.handle}</span>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">(kênh {label}, mở tab mới)</span>
            </a>
            <p className="truncate text-xs text-muted-foreground">{item.url}</p>
            <div className="flex min-w-0 items-center gap-2 pt-0.5">
              <Avatar className="size-6">
                {item.avatar && <AvatarImage src={item.avatar} alt="" className="object-cover" />}
                <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">{initials(item.displayName)}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={onOpenKol}
                className="truncate rounded-sm text-left text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Xem hồ sơ KOL ${item.displayName}`}
              >
                {item.displayName}
              </button>
              <span className="shrink-0 text-xs text-muted-foreground">{item.kolId}</span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3">
          <FieldBadges fields={item.fields} size="sm" className="min-w-0 @4xl:w-48 @4xl:shrink-0" />
          <div className="space-y-1">
            <p className="text-sm" title={`${item.followers.toLocaleString('vi-VN')} người theo dõi`}>
              <span className="font-semibold text-foreground">{formatFollowers(item.followers)}</span>{' '}
              <span className="text-muted-foreground">người theo dõi</span>
            </p>
            <ChannelBadge badge="VERIFIED" expiresAt={item.badgeExpiresAt} />
          </div>
          {item.region && (
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {item.region}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 @4xl:shrink-0">
          {item.latestVideo && <VideoThumb video={item.latestVideo} kolName={item.displayName} className="hidden w-14 @4xl:block" />}
          <Button type="button" className="h-11 flex-1 @4xl:flex-none @4xl:px-4" onClick={onOpenKol}>
            Xem hồ sơ KOL
          </Button>
          <Button
            type="button"
            variant={saved ? 'secondary' : 'outline'}
            size="icon"
            className="size-11 shrink-0"
            aria-label={`Lưu KOL ${item.displayName} vào danh sách`}
            aria-pressed={saved}
            onClick={onSave}
          >
            {saved ? <BookmarkCheck className="text-primary" aria-hidden /> : <Bookmark aria-hidden />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ChannelDirectoryRowSkeleton() {
  return (
    <Card className="gap-0 p-4" aria-hidden>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
        <div className="flex items-start gap-3 md:w-1/3">
          <Skeleton className="size-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
        <div className="flex flex-1 flex-wrap gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 md:w-32" />
          <Skeleton className="size-11" />
        </div>
      </div>
    </Card>
  );
}
