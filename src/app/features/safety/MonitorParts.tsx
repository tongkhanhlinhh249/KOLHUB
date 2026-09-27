import { BadgeCheck, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../components/ui/utils';
import { MONITOR_PLATFORM_LABEL, type MonitorPlatform, type MonitorView } from '../../services';
import { formatFollowers } from '../biz-search/format';

export function monitorPath(platform: MonitorPlatform, id?: string): string {
  return id ? `/kiem-duyet/${platform}/${id}` : `/kiem-duyet/${platform}`;
}

export function monitorStatsLine(m: Pick<MonitorView, 'followers' | 'likes' | 'videoCount'>): string {
  return `${formatFollowers(m.followers)} follower · ${formatFollowers(m.likes)} like · ${m.videoCount.toLocaleString('vi-VN')} video`;
}

export function lastScanText(lastScanAt: number | null): string {
  return lastScanAt ? `Quét gần nhất ${format(lastScanAt, 'dd/MM/yyyy')}` : 'Chưa quét';
}

export function VerifiedChannelBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-4/15 px-2 py-0.5 text-xs font-medium text-foreground',
        className,
      )}
    >
      <BadgeCheck className="size-3.5 text-chart-4" aria-hidden />
      Kênh xác thực
    </span>
  );
}

/** Opens the channel on the platform in a new tab. */
export function ExternalChannelLink({ monitor, className }: { monitor: MonitorView; className?: string }) {
  return (
    <a
      href={`https://${monitor.url}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Mở kênh @${monitor.handle} trên ${MONITOR_PLATFORM_LABEL[monitor.platform]} (tab mới)`}
      className={cn(
        'inline-grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

export function MonitorAvatar({ monitor, className }: { monitor: MonitorView; className?: string }) {
  return (
    <img
      src={monitor.avatar}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn('size-12 shrink-0 rounded-full border border-border bg-muted object-cover', className)}
    />
  );
}
