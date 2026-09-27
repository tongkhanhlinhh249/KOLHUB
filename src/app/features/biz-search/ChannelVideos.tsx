import { useState } from 'react';
import { ChevronDown, ExternalLink, MessageCircle, ShieldCheck } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../components/ui/carousel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { cn } from '../../components/ui/utils';
import type { KolVideo, PublicChannel } from '../../services';
import { formatCompactVi, formatDate } from './format';
import { PlatformIcon, platformLabel } from './PlatformIcon';
import { ChannelBadge } from './StatusBadges';

/** 1.2 cards visible on mobile, 3 from sm (the sheet is ≥ 640px wide there). */
const SLIDE = 'basis-[83.333%] pl-3 sm:basis-1/3';
const NAV =
  'size-9 rounded-full bg-background/95 shadow-md disabled:invisible [&_svg]:size-4 top-[38%] sm:top-[40%]';

function handleOf(c: PublicChannel): string {
  const h = c.handle.trim().replace(/^@/, '');
  return h ? `@${h}` : c.url;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="block min-w-0 text-left sm:text-right" title={`${label}: ${value.toLocaleString('vi-VN')}`}>
      <span className="block truncate text-xs text-muted-foreground">{label}</span>
      <span className="block text-sm font-semibold text-foreground sm:text-base">{formatCompactVi(value)}</span>
    </span>
  );
}

/** Tall 9:16 video card; links out when the video has a URL. */
function VideoCard({ video, kolName }: { video: KolVideo; kolName: string }) {
  const body = (
    <>
      <span className="relative block aspect-[9/16] overflow-hidden rounded-xl border border-border bg-muted">
        <img
          src={video.thumbnail}
          alt={`${video.title ?? 'Video'} — ${platformLabel(video.platform)} của ${kolName}`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </span>
      <span className="mt-2 block space-y-0.5">
        <span className="line-clamp-2 block text-sm font-medium text-foreground">{video.title || 'Video không có tiêu đề'}</span>
        {video.publishedAt && <span className="block text-xs text-muted-foreground">{formatDate(video.publishedAt)}</span>}
      </span>
    </>
  );
  if (!video.url) return <div>{body}</div>;
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {body}
      <span className="sr-only">(mở tab mới)</span>
    </a>
  );
}

function NoVideoCard() {
  return (
    <div className="w-[83.333%] sm:w-[calc((100%-1.5rem)/3)]">
      <div className="flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-3 text-center text-sm text-muted-foreground">
        <MessageCircle className="size-6" aria-hidden />
        Chưa có video
      </div>
    </div>
  );
}

function ChannelCard({
  channel: c,
  kolName,
  open,
  onOpenChange,
}: {
  channel: PublicChannel;
  kolName: string;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const label = platformLabel(c.platform);
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="overflow-hidden rounded-xl border border-border bg-card">
      <CollapsibleTrigger
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,18rem)_auto] sm:gap-x-4 sm:p-4"
      >
        <PlatformIcon platform={c.platform} mono className="size-11 rounded-xl" />
        <span className="block min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-foreground">{label}</span>
            {c.badge === 'VERIFIED' ? (
              <ShieldCheck className="size-4 shrink-0 text-primary" role="img" aria-label="Đã xác thực" />
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">· Hết hạn dấu</span>
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{handleOf(c)}</span>
        </span>
        <span className="col-span-3 col-start-1 row-start-2 grid grid-cols-3 gap-3 border-t border-border pt-3 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:border-0 sm:pt-0">
          <Stat label={c.platform === 'youtube' ? 'Người đăng ký' : 'Người theo dõi'} value={c.followers} />
          <Stat label="Lượt xem" value={c.views} />
          <Stat label="Video" value={c.videoCount} />
        </span>
        <ChevronDown
          className={cn('size-5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border bg-muted/40 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Video mới nhất</h4>
          <div className="flex flex-wrap items-center gap-2">
            <ChannelBadge badge={c.badge} expiresAt={c.badgeExpiresAt} />
            <a
              href={`https://${c.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Mở kênh
              <ExternalLink className="size-3" aria-hidden />
              <span className="sr-only">{label} (mở tab mới)</span>
            </a>
          </div>
        </div>

        {c.latestVideos.length === 0 ? (
          <NoVideoCard />
        ) : (
          <Carousel
            opts={{ align: 'start', containScroll: 'trimSnaps' }}
            aria-label={`Video mới nhất trên ${label}`}
          >
            <CarouselContent className="-ml-3">
              {c.latestVideos.map((v, i) => (
                <CarouselItem
                  key={`${v.url ?? v.thumbnail}-${i}`}
                  className={SLIDE}
                  aria-label={`${i + 1} / ${c.latestVideos.length}`}
                >
                  <VideoCard video={v} kolName={kolName} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className={cn(NAV, 'left-1 sm:-left-2')} aria-label="Video trước" title="Video trước" />
            <CarouselNext className={cn(NAV, 'right-1 sm:-right-2')} aria-label="Video tiếp theo" title="Video tiếp theo" />
          </Carousel>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** "Video mới nhất" grouped per channel: collapsible channel cards (first one open) with a video carousel each. */
export function ChannelVideos({ channels, kolName }: { channels: PublicChannel[]; kolName: string }) {
  const keyOf = (c: PublicChannel) => `${c.platform}-${c.url}`;
  const [open, setOpen] = useState<Set<string>>(() => new Set(channels[0] ? [keyOf(channels[0])] : []));

  if (channels.length === 0) return <p className="text-sm text-muted-foreground">Chưa có kênh công khai.</p>;

  return (
    <ul className="space-y-3">
      {channels.map((c) => {
        const key = keyOf(c);
        return (
          <li key={key}>
            <ChannelCard
              channel={c}
              kolName={kolName}
              open={open.has(key)}
              onOpenChange={(next) =>
                setOpen((prev) => {
                  const s = new Set(prev);
                  if (next) s.add(key);
                  else s.delete(key);
                  return s;
                })
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
