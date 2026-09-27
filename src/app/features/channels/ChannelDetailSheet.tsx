import { useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { AlertCircle, ArrowRight, MapPin, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import type { ActivityField, KolVideo, Platform } from '../../services';
import { ChannelVideoCarousel } from '../biz-search/ChannelVideos';
import { formatCompactVi, formatFollowers } from '../biz-search/format';
import { KolAvatar } from '../biz-search/KolCard';
import { FieldBadges } from '../biz-search/KolMedia';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { ChannelLink, channelName, shortUrl } from './ChannelParts';
import { VerifiedMark } from './ChannelRow';

/** URL key of the open channel detail (`?kenh=<channelId>`), like `?kol=` for the KOL sheet. */
export const CHANNEL_PARAM = 'kenh';

/** Open / close "Chi tiết kênh" through the URL, keeping every other search param. */
export function useChannelParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const channelId = searchParams.get(CHANNEL_PARAM);
  const openChannel = useCallback(
    (id: string) =>
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        sp.set(CHANNEL_PARAM, id);
        return sp;
      }),
    [setSearchParams],
  );
  const closeChannel = useCallback(
    () =>
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        sp.delete(CHANNEL_PARAM);
        return sp;
      }),
    [setSearchParams],
  );
  return { channelId, openChannel, closeChannel };
}

/** What the sheet shows about the channel itself (same for owner and Brand). */
export interface ChannelDetailData {
  platform: Platform;
  handle: string;
  url: string;
  /** Badge valid-until (ISO or ms) when the badge is currently valid. */
  verifiedUntil?: string | number;
  /** undefined = not synced yet. */
  followers?: number;
  views?: number;
  videoCount?: number;
  videos: KolVideo[];
  /** Used in video alt texts. */
  ownerName: string;
}

function Stat({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-primary/20 bg-primary/5 p-3" title={title}>
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-lg font-bold text-foreground sm:text-xl">{value}</dd>
    </div>
  );
}

const num = (n: number | undefined, f: (n: number) => string) => (n === undefined ? '—' : f(n));
const full = (label: string, n: number | undefined) => (n === undefined ? undefined : `${label}: ${n.toLocaleString('vi-VN')}`);

/** "Chủ kênh": compact owner card with a link to the KOL profile (Brand view). */
export function ChannelOwnerSection({
  displayName,
  kolId,
  avatar,
  fields,
  region,
  onOpenKol,
}: {
  displayName: string;
  kolId: string;
  avatar?: string;
  fields: ActivityField[];
  region?: string | null;
  onOpenKol(): void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">Chủ kênh</h3>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <KolAvatar name={displayName} src={avatar} className="size-12 rounded-xl [&>*]:rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-semibold text-foreground">{displayName}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>KOL ID: {kolId}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {region || 'Chưa cập nhật'}
              </span>
            </p>
            {fields.length > 0 && <FieldBadges fields={fields} size="sm" className="pt-1" />}
          </div>
        </div>
        <Button type="button" variant="outline" className="h-11 w-full sm:h-9 sm:w-auto" onClick={onOpenKol}>
          Xem hồ sơ KOL
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </section>
  );
}

/**
 * "Chi tiết kênh" — one channel: header (platform, handle, link, badge), stats, latest videos,
 * then `children` (e.g. "Chủ kênh") and the footer `actions`. Shared by the owner's "Quản lý kênh"
 * and the Brand's "Danh sách kênh"; callers load the data and pass the role-specific parts.
 */
export function ChannelDetailSheet({
  open,
  onOpenChange,
  loading,
  error,
  onRetry,
  data,
  status,
  notice,
  children,
  actions,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  loading?: boolean;
  /** Message to show instead of the content. */
  error?: string | null;
  /** Omit to hide "Thử lại" (e.g. not found). */
  onRetry?(): void;
  data: ChannelDetailData | null;
  /** Under the link (e.g. owner's review status). */
  status?: ReactNode;
  /** Above the stats (e.g. "Cần bổ sung"). */
  notice?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const ready = !loading && !error ? data : null;
  const name = data ? channelName(data.handle, data.url) : 'Chi tiết kênh';
  const followersLabel = data?.platform === 'youtube' ? 'Người đăng ký' : 'Người theo dõi';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-[800px]">
        <SheetHeader className="sr-only">
          <SheetTitle>{data ? `Chi tiết kênh ${name}` : 'Chi tiết kênh'}</SheetTitle>
          <SheetDescription>Thông tin, số liệu và video mới nhất của kênh.</SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="min-h-0 flex-1 overflow-y-auto" aria-busy="true" aria-label="Đang tải kênh">
            <div className="flex items-start gap-4 border-b border-border bg-muted/50 px-4 pt-12 pb-6 sm:px-6 sm:pt-6">
              <Skeleton className="size-14 rounded-xl sm:size-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
              <div className="flex gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="aspect-[2/3] w-[30%] rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-12 sm:p-6 sm:pt-12">
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden />
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                {onRetry && (
                  <Button type="button" variant="outline" className="h-11 md:h-8" onClick={onRetry}>
                    <RotateCcw aria-hidden />
                    Thử lại
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {ready && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-border bg-muted/50 px-4 pt-12 pb-5 sm:px-6 sm:pt-6">
              <div className="flex items-start gap-4 pr-8 sm:pr-10">
                <PlatformIcon platform={ready.platform} mono className="size-14 shrink-0 rounded-xl sm:size-16" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-foreground sm:text-xl" title={name}>
                      {name}
                    </h2>
                    {ready.verifiedUntil !== undefined && <VerifiedMark until={ready.verifiedUntil} />}
                  </div>
                  <p className="text-xs text-muted-foreground">Kênh {platformLabel(ready.platform)}</p>
                  <ChannelLink url={ready.url} />
                  {ready.verifiedUntil !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Dấu xác thực hiệu lực đến{' '}
                      <span className="font-medium text-foreground">{format(new Date(ready.verifiedUntil), 'dd/MM/yyyy')}</span>
                    </p>
                  )}
                  {status && <div className="pt-1">{status}</div>}
                </div>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              {notice}
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">Số liệu kênh</h3>
                <dl className="grid grid-cols-3 gap-2 sm:gap-3">
                  <Stat
                    label={followersLabel}
                    value={num(ready.followers, formatFollowers)}
                    title={full(followersLabel, ready.followers)}
                  />
                  <Stat label="Lượt xem" value={num(ready.views, formatCompactVi)} title={full('Lượt xem', ready.views)} />
                  <Stat label="Video" value={num(ready.videoCount, formatCompactVi)} title={full('Video', ready.videoCount)} />
                </dl>
              </section>

              <section className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
                <ChannelVideoCarousel
                  videos={ready.videos}
                  url={shortUrl(ready.url)}
                  platform={ready.platform}
                  kolName={ready.ownerName}
                />
              </section>

              {children}
            </div>
          </div>
        )}

        {actions && open && !error && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {actions}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
