import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, ExternalLink, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import {
  channelService,
  countByFilter,
  matchesFilter,
  type Channel,
  type ChannelFilter,
  type ProfileStatus,
} from '../../services';
import { ChannelStatusBadge, PlatformIcon } from '../shared/StatusBadges';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ChannelFormSheet } from './ChannelFormSheet';

const FILTERS: { value: ChannelFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'verified', label: 'Đã xác thực' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'needs_fix', label: 'Cần bổ sung' },
];

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
}

function ChannelCard({
  channel,
  locked,
  onEdit,
  accountId,
}: {
  channel: Channel;
  locked: boolean;
  onEdit(): void;
  accountId: string;
}) {
  const [toggling, setToggling] = useState(false);
  const href = /^https?:\/\//.test(channel.url) ? channel.url : `https://${channel.url}`;

  const toggle = async (active: boolean) => {
    setToggling(true);
    try {
      await channelService.setActive(accountId, channel.id, active);
      toast.success(active ? 'Đã bật kênh' : 'Đã tắt kênh');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.');
    } finally {
      setToggling(false);
    }
  };

  const editButton = (
    <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" disabled={locked} onClick={onEdit}>
      Sửa
    </Button>
  );

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PlatformIcon platform={channel.platform} className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium text-foreground">{channel.handle || shortUrl(channel.url)}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            <span className="truncate">{shortUrl(channel.url)}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden />
          </a>
          <div>
            <ChannelStatusBadge channel={channel} />
          </div>
        </div>
        {channel.proofImage.thumbnail && (
          <img
            src={channel.proofImage.thumbnail}
            alt={`Ảnh quản lý kênh ${channel.handle}`}
            className="size-14 shrink-0 rounded-md border border-border object-cover"
          />
        )}
      </div>

      {channel.status === 'NEEDS_FIX' && (
        <Alert className="border-chart-5/50 bg-chart-5/10">
          <AlertTriangle className="size-4 text-chart-5" aria-hidden />
          <AlertDescription className="space-y-2">
            <p className="text-foreground">Cần bổ sung: {channel.note}</p>
            <Button type="button" size="sm" variant="outline" className="h-11 md:h-8" onClick={onEdit}>
              Sửa ảnh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-foreground md:min-h-0">
          <Switch
            checked={channel.active}
            disabled={toggling}
            onCheckedChange={(v) => void toggle(v)}
            aria-label={`Hoạt động: ${channel.handle}`}
          />
          Hoạt động
        </label>
        {locked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{editButton}</span>
            </TooltipTrigger>
            <TooltipContent>Kênh đang được xét duyệt</TooltipContent>
          </Tooltip>
        ) : (
          editButton
        )}
      </div>
    </Card>
  );
}

/** SCR-06 — channel list with status filters, active switch and add/edit sheet. There is no delete (BR-23). */
export function ChannelsTab({
  accountId,
  profileStatus,
  openAddRequest = false,
  onOpenAddConsumed,
}: {
  accountId: string;
  profileStatus: ProfileStatus;
  /** When true, open the add-channel sheet once, then call onOpenAddConsumed (e.g. header "Thêm kênh"). */
  openAddRequest?: boolean;
  onOpenAddConsumed?(): void;
}) {
  const q = useLiveQuery(() => channelService.list(accountId), [accountId]);
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [sheet, setSheet] = useState<{ open: boolean; channel?: Channel }>({ open: false });

  const channels = q.data ?? [];
  const counts = countByFilter(channels);
  const shown = channels.filter((c) => matchesFilter(c, filter));
  const openAdd = () => setSheet({ open: true });

  useEffect(() => {
    if (!openAddRequest) return;
    setSheet({ open: true });
    onOpenAddConsumed?.();
  }, [openAddRequest, onOpenAddConsumed]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as ChannelFilter)}>
            <TabsList className="h-11 md:h-10">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value} className="h-9 md:h-8">
                  {f.label} ({counts[f.value]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Button type="button" className="h-11 md:h-9" onClick={openAdd}>
          <Plus aria-hidden />
          Thêm kênh
        </Button>
      </div>

      {q.loading && !q.data ? (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải kênh">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : q.error && !q.data ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription className="space-y-2">
            <p>Không tải được danh sách kênh.</p>
            <Button type="button" size="sm" variant="outline" onClick={q.reload}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Bạn chưa khai báo kênh nào.</p>
          <Button type="button" className="h-11 md:h-9" onClick={openAdd}>
            <Plus aria-hidden />
            Thêm kênh đầu tiên
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Không có kênh nào ở trạng thái này
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shown.map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              accountId={accountId}
              locked={profileStatus === 'SUBMITTED' && c.status === 'PENDING_REVIEW'}
              onEdit={() => setSheet({ open: true, channel: c })}
            />
          ))}
        </div>
      )}

      <ChannelFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        accountId={accountId}
        channel={sheet.channel}
      />
    </div>
  );
}
