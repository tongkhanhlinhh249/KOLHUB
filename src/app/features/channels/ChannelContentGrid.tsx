import { ExternalLink, Eye, Heart, MessageCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import type { KolVideo, Platform } from '../../services';
import { formatCompactVi } from '../biz-search/format';
import { platformLabel } from '../biz-search/PlatformIcon';

/** Stable pseudo-random numbers for mock engagement (same video → same numbers). */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function engagementOf(video: KolVideo) {
  const seed = seedOf(video.url ?? video.thumbnail);
  const views = 5_000 + (seed % 2_500_000);
  const likes = Math.floor(views / (12 + (seed % 20)));
  const comments = Math.floor(likes / (20 + ((seed >>> 8) % 30)));
  return { views, likes, comments };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

function Metric({ icon, value, label, iconClass }: { icon: typeof Eye; value: number; label: string; iconClass: string }) {
  const Icon = icon;
  return (
    <span className="inline-flex items-center gap-1" title={`${value.toLocaleString('vi-VN')} ${label}`}>
      <span className="font-semibold text-foreground tabular-nums">{formatCompactVi(value)}</span>
      <Icon className={`size-3.5 shrink-0 ${iconClass}`} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Square content card: thumbnail, views / likes / comments, "handle caption" (2 lines) and the post date. */
function ContentCard({ video, handle }: { video: KolVideo; handle: string }) {
  const { views, likes, comments } = engagementOf(video);
  const body = (
    <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow group-hover:shadow-md">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={video.thumbnail}
          alt={`${video.title ?? 'Nội dung'} — ${platformLabel(video.platform)} ${handle}`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border pb-3 text-xs whitespace-nowrap @md:text-[13px]">
          <Metric icon={Eye} value={views} label="lượt xem" iconClass="text-muted-foreground" />
          <Metric icon={Heart} value={likes} label="lượt thích" iconClass="text-destructive" />
          <Metric icon={MessageCircle} value={comments} label="bình luận" iconClass="text-primary" />
        </div>
        <p className="line-clamp-2 text-sm break-words text-foreground" title={video.title}>
          <span className="font-semibold">{handle}</span> {video.title ?? `Nội dung trên ${platformLabel(video.platform)}`}
        </p>
        {video.publishedAt && (
          <p className="mt-auto text-sm text-muted-foreground tabular-nums">{formatDate(video.publishedAt)}</p>
        )}
      </div>
    </Card>
  );
  if (!video.url) return <div className="h-full">{body}</div>;
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {body}
      <span className="sr-only">(mở tab mới)</span>
    </a>
  );
}

/**
 * "Nội dung gần nhất" of one channel in the channel detail: a grid of square content cards
 * (2 columns, 3 from @xl). `url` is the channel link without protocol; `handle` has no "@".
 */
export function ChannelContentGrid({
  videos,
  url,
  platform,
  handle,
}: {
  videos: KolVideo[];
  url: string;
  platform: Platform;
  handle: string;
}) {
  const label = platformLabel(platform);
  const name = handle.replace(/^@/, '') || url;
  return (
    <section className="@container space-y-3" aria-label={`Nội dung gần nhất trên ${label}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">Nội dung gần nhất</h3>
        <a
          href={`https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
        >
          Mở kênh
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">{label} (mở tab mới)</span>
        </a>
      </div>
      {videos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có nội dung nào được đồng bộ.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @xl:gap-4">
          {videos.map((v, i) => (
            <li key={`${v.url ?? v.thumbnail}-${i}`} className="min-w-0">
              <ContentCard video={v} handle={name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
