import { Bookmark, BookmarkCheck, MapPin, Megaphone, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { KolSearchItem } from '../../services';
import { formatFollowers, initials } from './format';
import { FieldBadges, NoVideoTile, VideoThumb } from './KolMedia';
import { PlatformIcon, platformLabel } from './PlatformIcon';

interface KolListRowProps {
  kol: KolSearchItem;
  saved: boolean;
  onView(): void;
  onSave(): void;
  /** "Mời vào chiến dịch" icon button; hidden when not given. */
  onInvite?(): void;
}

/**
 * Layout (modelled on the legacy CreatorCard row):
 * - ≥ lg: one row — [avatar | info] · 2 "Video mới nhất" · field badges (stacked) · actions.
 * - md: [avatar | info] on top; videos + badges, then actions, wrap under the info column.
 * - < md: compact — avatar + name, bio/stats full width, 2 thumbnails, badges as a wrap row, full-width actions.
 */
const INFO_GRID =
  'grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-3 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-x-5 lg:flex-1';
const SPAN_MIDDLE = 'col-span-2 md:col-span-1 md:col-start-2';
/** md: align with the info column (6rem avatar + 1.25rem gap); lg: back in the row. */
const UNDER_INFO = 'md:ml-[7.25rem] lg:ml-0';
const MEDIA = `flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:shrink-0 ${UNDER_INFO}`;
/** < sm: two tiles share the row; sm+: fixed squares like the reference. */
const THUMB = 'w-[calc(50%-0.25rem)] max-w-40 shrink-0 sm:w-24 md:w-28 lg:w-24 xl:w-28';
const ACTIONS = `flex gap-2 lg:w-52 lg:shrink-0 ${UNDER_INFO}`;

/** Full-width search result row (list view), modelled on the old CreatorCard horizontal layout. Public fields only (BR-58). */
export function KolListRow({ kol, saved, onView, onSave, onInvite }: KolListRowProps) {
  const videos = kol.latestVideos.slice(0, 2);
  return (
    <Card className="gap-0 p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className={INFO_GRID}>
          <Avatar className="size-16 rounded-xl md:row-span-3 md:size-24">
            {kol.avatar && <AvatarImage src={kol.avatar} alt="" className="object-cover" />}
            <AvatarFallback className="rounded-xl bg-muted text-base font-semibold text-muted-foreground md:text-xl">
              {initials(kol.displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1 self-center md:self-start">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={onView}
                className="truncate rounded-sm text-left font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-lg"
              >
                {kol.displayName}
              </button>
              <ShieldCheck className="size-4 shrink-0 text-primary" role="img" aria-label="Đã xác thực" />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              @{kol.nickname} · {kol.kolId}
            </p>
            {kol.region && (
              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {kol.region}
              </p>
            )}
          </div>

          <p className={`${SPAN_MIDDLE} line-clamp-2 text-sm ${kol.bio ? 'text-foreground/80' : 'italic text-muted-foreground'}`}>
            {kol.bio || 'Chưa có giới thiệu.'}
          </p>

          <div className={`${SPAN_MIDDLE} flex flex-wrap items-center gap-x-4 gap-y-2 text-sm`}>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Người theo dõi theo nền tảng">
              {kol.channels.map((c, i) => (
                <li
                  key={`${c.platform}-${i}`}
                  className="inline-flex items-center gap-1.5"
                  title={`${platformLabel(c.platform)}: ${c.followers.toLocaleString('vi-VN')} người theo dõi`}
                >
                  <PlatformIcon platform={c.platform} className="size-5" />
                  <span className="font-semibold text-foreground">{formatFollowers(c.followers)}</span>
                  <span className="sr-only">người theo dõi</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={MEDIA}>
          <div className="flex w-full gap-2 sm:w-auto" role="group" aria-label="Video mới nhất">
            {videos.length === 0 ? (
              <NoVideoTile className={THUMB} />
            ) : (
              videos.map((v, i) => <VideoThumb key={`${v.thumbnail}-${i}`} video={v} kolName={kol.displayName} className={THUMB} />)
            )}
          </div>
          <FieldBadges fields={kol.fields} layout="responsive" className="lg:w-36 xl:w-40" />
        </div>

        <div className={ACTIONS}>
          <Button type="button" className="h-11 flex-1 md:flex-none md:px-6 lg:flex-1 lg:px-4" onClick={onView}>
            Xem hồ sơ
          </Button>
          <Button
            type="button"
            variant={saved ? 'secondary' : 'outline'}
            size="icon"
            className="size-11 shrink-0"
            aria-label="Lưu vào danh sách"
            aria-pressed={saved}
            onClick={onSave}
          >
            {saved ? <BookmarkCheck className="text-primary" aria-hidden /> : <Bookmark aria-hidden />}
          </Button>
          {onInvite && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              aria-label={`Mời ${kol.displayName} vào chiến dịch`}
              title="Mời vào chiến dịch"
              onClick={onInvite}
            >
              <Megaphone aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function KolListRowSkeleton() {
  return (
    <Card className="gap-0 p-4 md:p-5" aria-hidden>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className={INFO_GRID}>
          <Skeleton className="size-16 rounded-xl md:row-span-3 md:size-24" />
          <div className="space-y-2 self-center md:self-start">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <div className={`${SPAN_MIDDLE} space-y-1.5`}>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
          <Skeleton className={`${SPAN_MIDDLE} h-5 w-2/3`} />
        </div>
        <div className={MEDIA}>
          <div className="flex w-full gap-2 sm:w-auto">
            <Skeleton className={`${THUMB} aspect-square rounded-xl`} />
            <Skeleton className={`${THUMB} aspect-square rounded-xl`} />
          </div>
          <div className="flex flex-wrap gap-1.5 lg:w-36 lg:flex-col xl:w-40">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className={ACTIONS}>
          <Skeleton className="h-11 flex-1 md:w-32 md:flex-none lg:flex-1" />
          <Skeleton className="size-11" />
        </div>
      </div>
    </Card>
  );
}
