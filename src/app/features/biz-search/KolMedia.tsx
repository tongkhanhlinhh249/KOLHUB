import { Film, Trophy } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import type { FieldMedal, KolField, KolVideo } from '../../services';
import { formatDate } from './format';
import { PlatformIcon, platformLabel } from './PlatformIcon';

/**
 * Medal tint of a "Lĩnh vực hoạt động" pill (from the legacy CreatorCard getMedalStyle).
 * Amber is the one allowed non-token colour, used only for the gold medal.
 */
const MEDAL: Record<FieldMedal, { pill: string; icon: string; label: string }> = {
  gold: {
    pill: 'bg-amber-50 text-foreground ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:ring-amber-500/30',
    icon: 'text-amber-500',
    label: 'huy chương vàng',
  },
  silver: {
    pill: 'bg-muted text-foreground ring-1 ring-inset ring-border',
    icon: 'text-muted-foreground',
    label: 'huy chương bạc',
  },
  none: {
    pill: 'bg-muted/60 text-muted-foreground',
    icon: 'text-muted-foreground/50',
    label: '',
  },
};

interface FieldBadgesProps {
  fields: KolField[];
  /** `stack` = vertical column (list row ≥ lg); `wrap` = inline wrapping row. */
  layout?: 'wrap' | 'stack' | 'responsive';
  size?: 'sm' | 'md';
  className?: string;
}

/** 1–3 "Lĩnh vực hoạt động" pills with a trophy tinted by medal. */
export function FieldBadges({ fields, layout = 'wrap', size = 'md', className }: FieldBadgesProps) {
  if (fields.length === 0) return null;
  return (
    <ul
      aria-label="Lĩnh vực hoạt động"
      className={cn(
        'flex gap-1.5',
        layout === 'wrap' && 'flex-wrap',
        layout === 'stack' && 'flex-col items-start',
        layout === 'responsive' && 'flex-wrap lg:flex-col lg:flex-nowrap lg:items-start',
        className,
      )}
    >
      {fields.map((f) => {
        const m = MEDAL[f.medal];
        return (
          <li
            key={f.name}
            title={f.name}
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-full font-medium',
              size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
              m.pill,
            )}
          >
            <Trophy className={cn('size-3 shrink-0', m.icon)} aria-hidden />
            <span className="truncate">{f.name}</span>
            {m.label && <span className="sr-only">({m.label})</span>}
          </li>
        );
      })}
    </ul>
  );
}

function videoAlt(v: KolVideo, name: string) {
  return `Video mới nhất trên ${platformLabel(v.platform)} của ${name}`;
}

interface VideoThumbProps {
  video: KolVideo;
  kolName: string;
  className?: string;
  /** Show title + date under the image (profile grid). */
  showMeta?: boolean;
}

/** Square "Video mới nhất" thumbnail with the platform logo top-right; links out when the video has a URL. */
export function VideoThumb({ video, kolName, className, showMeta = false }: VideoThumbProps) {
  const image = (
    <span className="relative block aspect-square overflow-hidden rounded-xl border border-border bg-muted">
      <img
        src={video.thumbnail}
        alt={videoAlt(video, kolName)}
        loading="lazy"
        decoding="async"
        className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <PlatformIcon
        platform={video.platform}
        className="absolute top-1.5 right-1.5 size-5 rounded-full shadow-sm ring-2 ring-background"
      />
    </span>
  );
  const meta = showMeta && (video.title || video.publishedAt) && (
    <span className="mt-1.5 block space-y-0.5">
      {video.title && <span className="line-clamp-2 block text-sm font-medium text-foreground">{video.title}</span>}
      {video.publishedAt && <span className="block text-xs text-muted-foreground">{formatDate(video.publishedAt)}</span>}
    </span>
  );
  if (!video.url) {
    return (
      <div className={className}>
        {image}
        {meta}
      </div>
    );
  }
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      {image}
      {meta}
      <span className="sr-only">(mở tab mới)</span>
    </a>
  );
}

/** Placeholder tile when a KOL has no recent video. */
export function NoVideoTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 p-2 text-center text-xs text-muted-foreground',
        className,
      )}
    >
      <Film className="size-5" aria-hidden />
      Chưa có video
    </div>
  );
}
