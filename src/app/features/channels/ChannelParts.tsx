import { useState, type ReactNode } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import { channelService, type Channel } from '../../services';

export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

export function hrefOf(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** "@handle", or the short link when the channel has no handle. */
export function channelName(handle: string, url: string): string {
  const h = handle.trim().replace(/^@/, '');
  return h ? `@${h}` : shortUrl(url);
}

/** Channel link, truncated, opening in a new tab. */
export function ChannelLink({ url, className }: { url: string; className?: string }) {
  return (
    <a
      href={hrefOf(url)}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <span className="truncate">{shortUrl(url)}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">(mở tab mới)</span>
    </a>
  );
}

/** Admin's reason when the channel needs changes. */
export function NeedsFixCallout({ channel, action, className }: { channel: Channel; action?: ReactNode; className?: string }) {
  if (channel.status !== 'NEEDS_FIX') return null;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-chart-5/50 bg-chart-5/10 px-3 py-2 text-sm text-foreground',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-5" aria-hidden />
      <p className="min-w-0 flex-1 break-words">
        <span className="font-medium">Cần bổ sung:</span> {channel.note || 'Vui lòng cập nhật link hoặc ảnh quản lý kênh.'}
      </p>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

/** "Hoạt động" switch; turning a channel off hides it from Brand search. */
export function ActiveSwitch({ channel, accountId, className }: { channel: Channel; accountId: string; className?: string }) {
  const [toggling, setToggling] = useState(false);
  const name = channelName(channel.handle, channel.url);

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
      aria-label={`Sửa kênh ${channelName(channel.handle, channel.url)}`}
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
