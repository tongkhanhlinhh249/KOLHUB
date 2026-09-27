import type { MouseEvent, ReactNode } from 'react';
import { format } from 'date-fns';
import { MapPin, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import type { ActivityField, Platform } from '../../services';
import { formatFollowers } from '../biz-search/format';
import { FieldBadges } from '../biz-search/KolMedia';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { ChannelLink, channelName } from './ChannelParts';

/** Clicks on these never open the detail (links, buttons, switches, the menu and its portal). */
const INTERACTIVE = 'a, button, input, label, [role="menu"], [role="menuitem"], [role="switch"], [data-row-ignore]';

/** Menu items: 44px tap targets below md. */
export const ROW_MENU_ITEM = 'min-h-11 md:min-h-9';

/** "Kênh đã xác thực, hiệu lực đến dd/MM/yyyy". */
export function verifiedText(until: string | number): string {
  return `Kênh đã xác thực, hiệu lực đến ${format(new Date(until), 'dd/MM/yyyy')}`;
}

/** Shield icon with the badge's valid-until date in a tooltip (no "Đã xác thực" pill). */
export function VerifiedMark({ until, className }: { until: string | number; className?: string }) {
  const text = verifiedText(until);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          tabIndex={0}
          aria-label={text}
          data-row-ignore
          className={cn(
            'inline-flex shrink-0 rounded-sm text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            className,
          )}
        >
          <ShieldCheck className="size-4" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export interface ChannelRowProps {
  platform: Platform;
  /** With or without "@"; falls back to the link when empty. */
  handle: string;
  /** Channel link, with or without protocol. */
  url: string;
  /** Badge valid-until (ISO or ms) when the channel currently has a valid badge. */
  verifiedUntil?: string | number;
  /** Line under the link — owner KOL (Brand) or review status (KOL/MCN). */
  subline?: ReactNode;
  fields: ActivityField[];
  region?: string | null;
  /** undefined = not synced yet ("—"). */
  followers?: number;
  /** Extra control shown with the stats (e.g. the "Hoạt động" switch). */
  trailing?: ReactNode;
  /** DropdownMenuItem elements of the More menu. */
  menu: ReactNode;
  /** Full-width block under the row (e.g. "Cần bổ sung" callout). */
  footer?: ReactNode;
  /** Opens the channel detail (row click, handle button). */
  onOpen(): void;
}

/**
 * One channel row, shared by "Quản lý kênh" (KOL/MCN) and "Danh sách kênh" (Brand). The whole row
 * opens "Chi tiết kênh"; the handle is a button for keyboard users. Layout follows the row width:
 *   ≥ @4xl: channel · fields · region · followers · [trailing] · menu on one line
 *   below:   channel (menu top-right), then fields / region / followers / trailing wrap underneath.
 */
export function ChannelRow({
  platform,
  handle,
  url,
  verifiedUntil,
  subline,
  fields,
  region,
  followers,
  trailing,
  menu,
  footer,
  onOpen,
}: ChannelRowProps) {
  const name = channelName(handle, url);
  const onRowClick = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element | null;
    if (t?.closest(INTERACTIVE)) return;
    if (!e.currentTarget.contains(t)) return; // portalled content (menu, tooltip)
    onOpen();
  };

  return (
    <Card className="@container cursor-pointer gap-0 p-4 transition-colors hover:bg-accent/40" onClick={onRowClick}>
      <div className="flex items-start gap-2 @4xl:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3 @4xl:flex-row @4xl:items-center @4xl:gap-6">
          <div className="flex min-w-0 items-start gap-3 @4xl:flex-1">
            <PlatformIcon platform={platform} mono className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpen}
                  className="min-w-0 truncate rounded-sm text-left font-semibold text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  title={name}
                >
                  {name}
                  <span className="sr-only"> — kênh {platformLabel(platform)}, xem chi tiết kênh</span>
                </button>
                {verifiedUntil !== undefined && <VerifiedMark until={verifiedUntil} />}
              </div>
              <ChannelLink url={url} />
              {subline && <div className="min-w-0 pt-0.5">{subline}</div>}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 @lg:pl-15 @4xl:flex-nowrap @4xl:gap-6 @4xl:pl-0">
            <div className="min-w-0 basis-full empty:hidden @4xl:block @4xl:w-44 @4xl:basis-auto @4xl:shrink-0">
              <FieldBadges fields={fields} size="sm" />
            </div>
            <p className="inline-flex min-w-0 items-center gap-1 text-sm text-muted-foreground @4xl:w-32 @4xl:shrink-0">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{region || 'Chưa cập nhật'}</span>
            </p>
            <ChannelFollowers followers={followers} className="whitespace-nowrap @4xl:w-36 @4xl:shrink-0 @4xl:text-right" />
            {trailing && <div className="ml-auto shrink-0 @4xl:ml-0">{trailing}</div>}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mt-1 -mr-1 size-11 shrink-0 md:size-9 @4xl:mt-0"
              aria-label={`Thao tác với kênh ${name}`}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  );
}

/** "12,3K người theo dõi", or "—" before the first sync. */
export function ChannelFollowers({ followers, className }: { followers?: number; className?: string }) {
  return (
    <p
      className={cn('text-sm', className)}
      title={followers === undefined ? undefined : `${followers.toLocaleString('vi-VN')} người theo dõi`}
    >
      {followers === undefined ? (
        <>
          <span className="font-semibold text-foreground" aria-hidden>
            —
          </span>
          <span className="sr-only">Chưa có số liệu</span>
        </>
      ) : (
        <span className="font-semibold text-foreground tabular-nums">{formatFollowers(followers)}</span>
      )}{' '}
      <span className="text-muted-foreground">người theo dõi</span>
    </p>
  );
}

export function ChannelRowSkeleton() {
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
