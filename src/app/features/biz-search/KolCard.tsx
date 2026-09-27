import { Bookmark, BookmarkCheck, MapPin, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import type { KolSearchItem } from '../../services';
import { formatFollowers, initials } from './format';
import { FieldBadges } from './KolMedia';
import { PlatformIcon } from './PlatformIcon';

/** Photo, or initials on a muted circle when the KOL has no avatar. */
export function KolAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <Avatar className={cn('size-12', className)}>
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback className="bg-muted text-sm font-semibold text-muted-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

interface KolCardProps {
  kol: KolSearchItem;
  saved: boolean;
  onView(): void;
  onSave(): void;
}

/** Compact search result card (trimmed from CreatorCard: field medals kept; no actions menu, engagement, reports). */
export function KolCard({ kol, saved, onView, onSave }: KolCardProps) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <KolAvatar name={kol.displayName} src={kol.avatar} />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={onView}
              className="truncate text-left font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {kol.displayName}
            </button>
            <ShieldCheck className="size-4 shrink-0 text-primary" role="img" aria-label="Đã xác thực" />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            @{kol.nickname} · {kol.kolId}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <FieldBadges fields={kol.fields} size="sm" />
        {kol.region && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {kol.region}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="text-lg font-semibold text-foreground">{formatFollowers(kol.totalFollowers)}</span> người theo dõi
        </p>
        <div className="flex items-center gap-1.5">
          {kol.platforms.map((p) => (
            <PlatformIcon key={p} platform={p} className="size-5" />
          ))}
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <Button type="button" variant="outline" className="h-10 flex-1" onClick={onView}>
          Xem hồ sơ
        </Button>
        <Button
          type="button"
          variant={saved ? 'secondary' : 'outline'}
          size="icon"
          className="size-10"
          aria-label="Lưu vào danh sách"
          aria-pressed={saved}
          onClick={onSave}
        >
          {saved ? <BookmarkCheck className="text-primary" aria-hidden /> : <Bookmark aria-hidden />}
        </Button>
      </div>
    </Card>
  );
}

export function KolCardSkeleton() {
  return (
    <Card className="gap-4 p-4" aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-6 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="size-10" />
      </div>
    </Card>
  );
}
