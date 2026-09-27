import { useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import { channelService, type Channel } from '../../services';
import { formatFollowers } from '../biz-search/format';
import { NoVideoTile, VideoThumb } from '../biz-search/KolMedia';

/** Props of one channel entry in the list (ChannelListRow). */
export interface ChannelItemProps {
  channel: Channel;
  accountId: string;
  /** Edit disabled (profile in review and channel pending). */
  locked: boolean;
  now: number;
  onEdit(): void;
}

/** Pieces used by ChannelListRow. */

export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

function hrefOf(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** Channel link, truncated, opening in a new tab. */
export function ChannelLink({ channel, className }: { channel: Channel; className?: string }) {
  return (
    <a
      href={hrefOf(channel.url)}
      target="_blank"
      rel="noopener noreferrer"
      title={channel.url}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <span className="truncate">{shortUrl(channel.url)}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">(mở tab mới)</span>
    </a>
  );
}

/** "12,3K người theo dõi" from the synced stats, "—" before the first sync. */
export function ChannelFollowers({ channel, className }: { channel: Channel; className?: string }) {
  const n = channel.stats?.followers;
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {n === undefined ? (
        <>
          <span className="font-semibold text-foreground" aria-hidden>
            —
          </span>
          <span className="sr-only">Chưa có số liệu</span> người theo dõi
        </>
      ) : (
        <>
          <span className="text-base font-semibold text-foreground" title={n.toLocaleString('vi-VN')}>
            {formatFollowers(n)}
          </span>{' '}
          người theo dõi
        </>
      )}
    </p>
  );
}

/** Up to two latest-video thumbnails, or a "Chưa có video" tile. */
export function ChannelVideos({
  channel,
  thumbClass,
  emptyClass,
  className,
}: {
  channel: Channel;
  thumbClass?: string;
  emptyClass?: string;
  className?: string;
}) {
  const videos = channel.stats?.latestVideos.slice(0, 2) ?? [];
  return (
    <div className={cn('flex gap-2', className)} role="group" aria-label="Video mới nhất">
      {videos.length === 0 ? (
        <NoVideoTile className={emptyClass ?? thumbClass} />
      ) : (
        videos.map((v, i) => (
          <VideoThumb key={`${v.thumbnail}-${i}`} video={v} kolName={channel.handle || shortUrl(channel.url)} className={thumbClass} />
        ))
      )}
    </div>
  );
}

/** Admin's reason when the channel needs changes. */
export function NeedsFixCallout({ channel, className }: { channel: Channel; className?: string }) {
  if (channel.status !== 'NEEDS_FIX') return null;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-chart-5/50 bg-chart-5/10 px-3 py-2 text-sm text-foreground',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-5" aria-hidden />
      <p className="min-w-0 break-words">
        <span className="font-medium">Cần bổ sung:</span> {channel.note || 'Vui lòng cập nhật link hoặc ảnh quản lý kênh.'}
      </p>
    </div>
  );
}

/** "Hoạt động" switch; turning a channel off hides it from Brand search. */
export function ActiveSwitch({ channel, accountId, className }: { channel: Channel; accountId: string; className?: string }) {
  const [toggling, setToggling] = useState(false);
  const name = channel.handle || shortUrl(channel.url);

  const toggle = async (active: boolean) => {
    setToggling(true);
    try {
      await channelService.setActive(accountId, channel.id, active);
      toast.success(active ? 'Đã bật kênh' : 'Đã tắt kênh');
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <label className={cn('flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground', className)}>
      <Switch
        checked={channel.active}
        disabled={toggling}
        onCheckedChange={(v) => void toggle(v)}
        aria-label={`Hoạt động: ${name}`}
      />
      Hoạt động
    </label>
  );
}

/** "Sửa" — disabled with a tooltip while the profile is in review and the channel is pending. */
export function EditChannelButton({
  channel,
  locked,
  onEdit,
  className,
}: {
  channel: Channel;
  locked: boolean;
  onEdit(): void;
  className?: string;
}) {
  const button = (
    <Button
      type="button"
      variant={channel.status === 'NEEDS_FIX' ? 'default' : 'outline'}
      className={cn('h-11 px-4', className)}
      disabled={locked}
      onClick={onEdit}
      aria-label={`Sửa kênh ${channel.handle || shortUrl(channel.url)}`}
    >
      Sửa
    </Button>
  );
  if (!locked) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>Kênh đang được xét duyệt</TooltipContent>
    </Tooltip>
  );
}
