import { Bookmark, BookmarkCheck, MapPin, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { KolSearchItem } from '../../services';
import { formatFollowers, initials } from './format';
import { PlatformIcon, platformLabel } from './PlatformIcon';

interface KolListRowProps {
  kol: KolSearchItem;
  saved: boolean;
  onView(): void;
  onSave(): void;
}

/**
 * Grid layout shared by the row and its skeleton:
 * - < md: compact card — avatar + name side by side, then bio, stats and actions full width.
 * - md: avatar column + middle column; the right column (category, actions) stacks under the middle.
 * - ≥ lg: one horizontal row with the right column on the far right.
 */
const ROW_GRID =
  'grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-3 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-x-5 lg:grid-cols-[6rem_minmax(0,1fr)_auto]';
const SPAN_MIDDLE = 'col-span-2 md:col-span-1 md:col-start-2';
const RIGHT_COL =
  'col-span-2 flex flex-col gap-3 md:col-span-1 md:col-start-2 md:flex-row md:items-center md:justify-between lg:col-start-3 lg:row-span-3 lg:row-start-1 lg:w-56 lg:flex-col lg:items-stretch lg:justify-between';

/** Full-width search result row (list view), modelled on the old CreatorCard horizontal layout. Public fields only (BR-58). */
export function KolListRow({ kol, saved, onView, onSave }: KolListRowProps) {
  return (
    <Card className="gap-0 p-4 md:p-5">
      <div className={ROW_GRID}>
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
          <span className="text-muted-foreground">
            Tổng <span className="font-semibold text-foreground">{formatFollowers(kol.totalFollowers)}</span> người theo dõi
          </span>
        </div>

        <div className={RIGHT_COL}>
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            {kol.category && <Badge variant="secondary">{kol.category}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button type="button" className="h-11 flex-1 md:h-10 md:flex-none md:px-5 lg:flex-1" onClick={onView}>
              Xem hồ sơ
            </Button>
            <Button
              type="button"
              variant={saved ? 'secondary' : 'outline'}
              size="icon"
              className="size-11 md:size-10"
              aria-label="Lưu vào danh sách"
              aria-pressed={saved}
              onClick={onSave}
            >
              {saved ? <BookmarkCheck className="text-primary" aria-hidden /> : <Bookmark aria-hidden />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function KolListRowSkeleton() {
  return (
    <Card className="gap-0 p-4 md:p-5" aria-hidden>
      <div className={ROW_GRID}>
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
        <div className={RIGHT_COL}>
          <Skeleton className="h-5 w-20 lg:self-end" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 md:h-10 md:w-28 md:flex-none lg:flex-1" />
            <Skeleton className="size-11 md:size-10" />
          </div>
        </div>
      </div>
    </Card>
  );
}
