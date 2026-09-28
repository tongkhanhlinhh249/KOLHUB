import { useState, type ReactNode } from 'react';
import { ChevronDown, ExternalLink, Heart, MessageCircle, Play, ShieldCheck } from 'lucide-react';
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
import { platformMetrics } from '../shared/platformMetrics';
import { formatCompactVi } from './format';
import { PlatformIcon, platformLabel } from './PlatformIcon';

/** ~1.3 cards visible on mobile, ~3.3 from sm — the partly visible last card hints that the row scrolls. */
const SLIDE = 'basis-[76%] pl-3 sm:basis-[30%]';
/** Square outline prev/next buttons in the section header (not overlaid on the cards). */
const NAV =
  'static size-9 translate-x-0 translate-y-0 rounded-lg border-border bg-card shadow-none disabled:opacity-40 [&_svg]:size-4';

/** Label pill per platform content type. */
const CONTENT_TYPE: Record<string, string> = { youtube: 'Video', tiktok: 'Video', facebook: 'Reel' };

/** Stable pseudo-random numbers for mock engagement (same video → same numbers). */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** "3 ngày trước", "2 tuần trước", "1 tháng trước"… */
function timeAgo(iso: string | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const days = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return 'Hôm nay';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}

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

/** Portrait 2:3 content card: type pill, play button, engagement footer; links out when the video has a URL. */
function VideoCard({ video, kolName }: { video: KolVideo; kolName: string }) {
  const seed = seedOf(video.url ?? video.thumbnail);
  const likes = 20 + (seed % 48_000);
  const comments = Math.floor(likes / (15 + (seed % 40)));
  const ago = timeAgo(video.publishedAt);
  const body = (
    <span className="block overflow-hidden rounded-xl border border-border bg-card">
      <span className="relative block aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={video.thumbnail}
          alt={`${video.title ?? 'Video'} — ${platformLabel(video.platform)} của ${kolName}`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <span className="absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {CONTENT_TYPE[video.platform] ?? 'Video'}
        </span>
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <Play className="size-5 translate-x-px fill-current" />
          </span>
        </span>
      </span>
      <span className="flex items-center gap-3 whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" title={`${likes.toLocaleString('vi-VN')} lượt thích`}>
          <Heart className="size-3.5" aria-hidden />
          <span className="font-medium text-foreground">{formatCompactVi(likes)}</span>
          <span className="sr-only">lượt thích</span>
        </span>
        <span className="inline-flex items-center gap-1" title={`${comments.toLocaleString('vi-VN')} bình luận`}>
          <MessageCircle className="size-3.5" aria-hidden />
          <span className="font-medium text-foreground">{formatCompactVi(comments)}</span>
          <span className="sr-only">bình luận</span>
        </span>
        {ago && <span className="ml-auto truncate">{ago}</span>}
      </span>
      {video.title && <span className="sr-only">{video.title}</span>}
    </span>
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
    <div className="w-[76%] sm:w-[30%]">
      <div className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-3 text-center text-sm text-muted-foreground">
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
  const metrics = platformMetrics(c.platform, c);
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
          {metrics.length < 3 && <span className="hidden sm:block" aria-hidden />}
          {metrics.map((m) => (
            <Stat key={m.key} label={m.label} value={m.value ?? 0} />
          ))}
        </span>
        <ChevronDown
          className={cn('size-5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border bg-muted/40 p-3 sm:p-4">
        <ChannelVideoCarousel videos={c.latestVideos} url={c.url} platform={c.platform} kolName={kolName} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * "Video mới nhất" of one channel: 2:3 cards in a carousel (prev/next in the header), or a
 * "Chưa có video" card. `url` is the channel link without protocol.
 */
export function ChannelVideoCarousel({
  videos,
  url,
  platform,
  kolName,
}: {
  videos: KolVideo[];
  url: string;
  platform: PublicChannel['platform'];
  kolName: string;
}) {
  const label = platformLabel(platform);
  if (videos.length === 0) {
    return (
      <>
        <VideoSectionHeader url={url} label={label} />
        <NoVideoCard />
      </>
    );
  }
  return (
    <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} aria-label={`Video mới nhất trên ${label}`}>
      <VideoSectionHeader url={url} label={label}>
        <CarouselPrevious variant="outline" className={NAV} aria-label="Video trước" title="Video trước" />
        <CarouselNext variant="outline" className={NAV} aria-label="Video tiếp theo" title="Video tiếp theo" />
      </VideoSectionHeader>
      <CarouselContent className="-ml-3">
        {videos.map((v, i) => (
          <CarouselItem key={`${v.url ?? v.thumbnail}-${i}`} className={SLIDE} aria-label={`${i + 1} / ${videos.length}`}>
            <VideoCard video={v} kolName={kolName} />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

/** Section title, "Mở kênh" link and (inside a carousel) the prev/next buttons. */
function VideoSectionHeader({ url, label, children }: { url: string; label: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <h4 className="text-base font-semibold text-foreground">Video mới nhất</h4>
        <a
          href={`https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Mở kênh
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only">{label} (mở tab mới)</span>
        </a>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
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
