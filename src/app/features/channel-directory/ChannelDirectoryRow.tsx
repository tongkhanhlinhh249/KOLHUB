import type { MouseEvent } from 'react';
import { format } from 'date-fns';
import { Bookmark, BookmarkCheck, ExternalLink, Eye, Flag, MapPin, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import type { ChannelDirectoryItem } from '../../services';
import { formatFollowers, initials } from '../biz-search/format';
import { FieldBadges } from '../biz-search/KolMedia';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';

/** Clicks on these never open the detail sheet (links, buttons, the menu and its portal). */
const INTERACTIVE = 'a, button, input, [role="menu"], [role="menuitem"], [data-row-ignore]';

const menuItemCls = 'min-h-11 md:min-h-9';

/**
 * One verified channel (list view only). The whole row opens "Xem chi tiết"; the More menu holds
 * the other actions. Layout follows the row's own width:
 *   ≥ @4xl: channel + owner · fields · region · followers · menu on one line
 *   below:   channel + owner (menu top-right), then fields / region / followers wrap underneath.
 */
export function ChannelDirectoryRow({
  item,
  saved,
  onOpenKol,
  onSave,
  onReport,
}: {
  item: ChannelDirectoryItem;
  saved: boolean;
  onOpenKol(): void;
  onSave(): void;
  onReport(): void;
}) {
  const label = platformLabel(item.platform);
  const verifiedText = `Kênh đã xác thực, hiệu lực đến ${format(new Date(item.badgeExpiresAt), 'dd/MM/yyyy')}`;
  const onRowClick = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element | null;
    if (t?.closest(INTERACTIVE)) return;
    if (!e.currentTarget.contains(t)) return; // portalled content (menu, tooltip)
    onOpenKol();
  };

  return (
    <Card className="@container cursor-pointer gap-0 p-4 transition-colors hover:bg-accent/40" onClick={onRowClick}>
      <div className="flex items-start gap-2 @4xl:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3 @4xl:flex-row @4xl:items-center @4xl:gap-6">
          <div className="flex min-w-0 items-start gap-3 @4xl:flex-1">
            <PlatformIcon platform={item.platform} mono className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <a
                  href={`https://${item.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1 rounded-sm font-semibold text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="truncate">@{item.handle}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sr-only">(kênh {label}, mở tab mới)</span>
                </a>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      role="img"
                      tabIndex={0}
                      aria-label={verifiedText}
                      data-row-ignore
                      className="inline-flex shrink-0 rounded-sm text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <ShieldCheck className="size-4" aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{verifiedText}</TooltipContent>
                </Tooltip>
              </div>
              <p className="truncate text-xs text-muted-foreground">{item.url}</p>
              <div className="flex min-w-0 items-center gap-2 pt-0.5">
                <Avatar className="size-6">
                  {item.avatar && <AvatarImage src={item.avatar} alt="" className="object-cover" />}
                  <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">{initials(item.displayName)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium text-foreground">{item.displayName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.kolId}</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 @lg:pl-15 @4xl:flex-nowrap @4xl:gap-6 @4xl:pl-0">
            <div className="min-w-0 basis-full empty:hidden @4xl:block @4xl:w-56 @4xl:basis-auto @4xl:shrink-0">
              <FieldBadges fields={item.fields} size="sm" />
            </div>
            <p className="inline-flex min-w-0 items-center gap-1 text-sm text-muted-foreground @4xl:w-36 @4xl:shrink-0">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{item.region ?? 'Chưa cập nhật'}</span>
            </p>
            <p
              className="text-sm @4xl:w-32 @4xl:shrink-0 @4xl:text-right"
              title={`${item.followers.toLocaleString('vi-VN')} người theo dõi`}
            >
              <span className="font-semibold text-foreground tabular-nums">{formatFollowers(item.followers)}</span>{' '}
              <span className="text-muted-foreground">người theo dõi</span>
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mt-1 -mr-1 size-11 shrink-0 md:size-9 @4xl:mt-0"
              aria-label={`Thao tác với kênh @${item.handle}`}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem className={menuItemCls} onSelect={onOpenKol}>
              <Eye aria-hidden />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemCls} onSelect={onSave}>
              {saved ? <BookmarkCheck className="text-primary" aria-hidden /> : <Bookmark aria-hidden />}
              Lưu KOL vào danh sách
              {saved && <span className="ml-auto text-xs text-muted-foreground">Đã lưu</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={menuItemCls} variant="destructive" onSelect={onReport}>
              <Flag aria-hidden />
              Báo cáo vi phạm
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

export function ChannelDirectoryRowSkeleton() {
  return (
    <Card className="@container gap-0 p-4" aria-hidden>
      <div className="flex items-start gap-2 @4xl:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3 @4xl:flex-row @4xl:items-center @4xl:gap-6">
          <div className="flex items-start gap-3 @4xl:flex-1">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 max-w-48" />
              <Skeleton className="h-3 w-1/2 max-w-40" />
              <Skeleton className="h-5 w-3/4 max-w-56" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 @lg:pl-15 @4xl:pl-0">
            <Skeleton className="h-6 w-40 rounded-full @4xl:w-56" />
            <Skeleton className="h-5 w-24 @4xl:w-36" />
            <Skeleton className="h-5 w-28 @4xl:w-32" />
          </div>
        </div>
        <Skeleton className="size-11 shrink-0 md:size-9" />
      </div>
    </Card>
  );
}
