import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Building2, Check, ChevronRight, CircleAlert } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import type { AppliedCampaign, MarketplaceCampaign, StoredFile } from '../../services';
import { CampaignCover } from '../shared/CampaignCover';
import { PhaseBadge, RecruitTypeBadge, RegionLine } from '../shared/RecruitParts';
import { rewardShort, workflowLabel } from '../shared/recruitView';
import { ToneBadge } from '../shared/StatusBadges';
import { MatchPill, SaveIconButton } from './MarketplaceParts';
import { BookingStatusBadge, CategoryChips, CountdownText, PlatformIcons } from './parts';
import {
  bookingDetailPath,
  brandCampaignPath,
  cardMatchLine,
  deadlineCountdown,
  expiryCountdown,
  formatDateTime,
  formatDay,
  formatVnd,
  formatVndShort,
  priceText,
  type MarketplaceViewer,
} from './supplierBooking';

/** Solid pill for badges laid over the cover image (tone tint replaced by a near-opaque background; dot keeps the tone). */
const OVER_BG = 'bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85';
const OVER_IMAGE = `${OVER_BG} text-foreground`;

/**
 * Shared 3-column card frame: 16:9 cover on top (placeholder when none) with overlays, then a body that
 * fills the rest so cards in a row share one height (the grid item stretches, see MarketplacePage).
 */
function CoverCard({
  cover,
  topLeft,
  topRight,
  children,
}: {
  cover?: StoredFile;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="relative h-full gap-0 overflow-hidden rounded-[8px] py-0 transition-colors hover:border-primary/40">
      <div className="relative">
        <CampaignCover cover={cover} className="aspect-video w-full" />
        {topLeft && <div className="pointer-events-none absolute top-2 left-2 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5">{topLeft}</div>}
        {topRight && <div className="absolute top-1.5 right-1.5 z-10">{topRight}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">{children}</div>
    </Card>
  );
}

function BrandLine({ company }: { company: string }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <Building2 className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate font-medium text-foreground">{company}</span>
    </p>
  );
}

/** Title heading; the name inside is clamped to 2 lines (full name in the tooltip / accessible name). */
const TITLE = 'text-base leading-snug font-semibold break-words text-foreground';
/** Stretched hit area over the whole card (image included); controls above it use `relative z-10`. */
const STRETCHED =
  "block w-full text-left after:absolute after:inset-0 after:z-[1] after:rounded-[8px] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset";

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * "Đã ứng tuyển" card: the marketplace card frame with the booking status over the image, the proposed price,
 * campaign budget, response deadline (or last update) and when it was sent. Links to the booking on the
 * "Chiến dịch" page (/chien-dich-cua-toi?booking=…).
 */
export function AppliedCampaignCard({ item, now }: { item: AppliedCampaign; now: number }) {
  const { booking: b, campaign: c } = item;
  const recruit = c.type === 'OPEN_RECRUITMENT' && !!c.recruitment;
  const pending = b.status === 'APPLIED' || b.status === 'NEGOTIATING';
  const expiry = pending && !recruit ? expiryCountdown(b.expiresAt, now) : null;
  return (
    <CoverCard
      cover={c.cover}
      topLeft={
        <>
          <BookingStatusBadge booking={b} className={OVER_IMAGE} />
          {recruit && <PhaseBadge campaign={c} now={now} className={OVER_IMAGE} />}
        </>
      }
    >
      <div className="space-y-1">
        <BrandLine company={c.brand.company} />
        <h2 className={TITLE}>
          <Link to={bookingDetailPath(b.id)} className={STRETCHED} title={c.name}>
            <span className="line-clamp-2">{c.name}</span>
          </Link>
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {c.match && <MatchPill match={c.match} />}
        <PlatformIcons platforms={c.platforms} />
      </div>
      {c.accepting === false && (!recruit || c.recruitmentClosed) && (
        <p className="text-xs text-muted-foreground">{c.recruitmentClosed ? 'Đã đóng tuyển' : c.paused ? 'Đang cập nhật, tạm ngừng nhận đơn' : 'Chiến dịch đã ngừng nhận đề xuất'}</p>
      )}

      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border pt-3">
        {recruit ? (
          <>
            <Fact label="Phần thưởng">
              <span className="font-semibold text-primary tabular-nums">{rewardShort(c.recruitment!.reward)}</span>
            </Fact>
            <Fact label="Đã ứng tuyển">
              <span className="tabular-nums">
                {c.applicationCount} / {c.recruitment!.slots}
              </span>
            </Fact>
          </>
        ) : (
          <>
            <Fact label="Giá đề xuất">
              <span className="font-semibold tabular-nums">{priceText(b.price)}</span>
            </Fact>
            <Fact label="Ngân sách">
              <span className="text-primary tabular-nums" title={formatVnd(c.budget)}>
                {formatVndShort(c.budget)}
              </span>
            </Fact>
          </>
        )}
        <Fact label={expiry ? 'Hạn phản hồi' : 'Cập nhật'}>
          {expiry ? <CountdownText countdown={expiry} className="text-sm" /> : <span className="tabular-nums">{formatDateTime(b.updatedAt)}</span>}
        </Fact>
        <Fact label="Gửi đề xuất">
          <span className="tabular-nums">{formatDateTime(b.createdAt)}</span>
        </Fact>
      </dl>

      <span className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary md:min-h-8" aria-hidden>
        Xem booking
        <ChevronRight className="size-4" />
      </span>
    </CoverCard>
  );
}

/** "Đã ứng tuyển" / "Đã được mời" state of the viewer on a campaign. */
export function MyBookingBadge({ myBooking, className }: { myBooking: NonNullable<MarketplaceCampaign['myBooking']>; className?: string }) {
  return (
    <ToneBadge tone="success" className={className}>
      {myBooking.origin === 'APPLICATION' ? 'Đã ứng tuyển' : 'Đã được mời'}
    </ToneBadge>
  );
}

/** Brand viewer: the campaign is one of theirs. */
export function MineBadge({ className }: { className?: string }) {
  return (
    <ToneBadge tone="info" className={className}>
      Của bạn
    </ToneBadge>
  );
}

/**
 * One marketplace campaign, sized for the 3-column grid: 16:9 cover (state badges top-left, bookmark top-right
 * for KOL/MCN), brand, 2-line title, "Khớp N%" + top reason (KOL/MCN), up to 2 categories + "+n", platforms,
 * budget and apply deadline with "còn N ngày". The title is a stretched link to the campaign page /san/<id>
 * (whole card clickable, opens in a new tab with Ctrl/Cmd-click, shareable).
 */
export function MarketplaceCampaignCard({
  campaign: c,
  now,
  to,
  linkState,
  viewer = 'supplier',
}: {
  campaign: MarketplaceCampaign;
  now: number;
  /** Campaign page (marketplaceCampaignPath). */
  to: string;
  /** Router state for the page (e.g. the list URL to go back to). */
  linkState?: unknown;
  /** Bookmark button for any signed-in KOL / MCN; Brand: "Của bạn" on own campaigns; guest: public card only. */
  viewer?: MarketplaceViewer;
}) {
  const canSave = viewer === 'supplier';
  const recruit = c.type === 'OPEN_RECRUITMENT' && !!c.recruitment;
  const countdown = deadlineCountdown(c.applyDeadline, now);
  const line = c.match && c.accepting !== false ? cardMatchLine(c.match) : null;
  const badges = (
    <>
      <PhaseBadge campaign={c} now={now} className={OVER_IMAGE} />
      {c.myBooking && <MyBookingBadge myBooking={c.myBooking} className={OVER_IMAGE} />}
      {c.mine && <MineBadge className={OVER_IMAGE} />}
    </>
  );
  return (
    <CoverCard
      cover={c.cover}
      topLeft={badges}
      topRight={
        canSave && (
          <SaveIconButton
            campaignId={c.id}
            saved={!!c.saved}
            name={c.name}
            className={cn('rounded-full md:size-9', OVER_BG, 'hover:bg-background', !c.saved && 'text-foreground/80 hover:text-foreground')}
          />
        )
      }
    >
      <div className="space-y-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <BrandLine company={c.brand.company} />
          {recruit && <RecruitTypeBadge className="h-5 shrink-0 px-1.5 text-[11px]" />}
        </div>
        <h2 className={TITLE}>
          <Link to={to} state={linkState} className={STRETCHED} title={c.name}>
            <span className="line-clamp-2">{c.name}</span>
          </Link>
        </h2>
      </div>

      {c.match && line && (
        <div className="flex min-w-0 items-center gap-2">
          <MatchPill match={c.match} className="shrink-0" />
          <p className={cn('flex min-w-0 items-center gap-1 text-xs', line.kind === 'reason' ? 'text-foreground' : 'text-muted-foreground')} title={line.text}>
            {line.kind === 'reason' ? (
              <Check className="size-3.5 shrink-0 text-chart-4" aria-hidden />
            ) : (
              <CircleAlert className="size-3.5 shrink-0 text-chart-5" aria-hidden />
            )}
            <span className="truncate">{line.text}</span>
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <CategoryChips categories={c.categories} max={2} className="min-w-0" />
        <PlatformIcons platforms={c.platforms} className="ml-auto" />
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border pt-3">
        {recruit ? (
          <>
            <Fact label="Phần thưởng">
              <span className="font-semibold text-primary tabular-nums">{rewardShort(c.recruitment!.reward)}</span>
            </Fact>
            <Fact label="Đã ứng tuyển">
              <span className="tabular-nums">
                {c.applicationCount} / {c.recruitment!.slots}
              </span>
              {c.phase !== 'APPLY' && c.phase !== 'UPCOMING' && (
                <span className="block text-xs font-normal text-muted-foreground tabular-nums">Đã chọn {c.selectedCount ?? 0}</span>
              )}
            </Fact>
          </>
        ) : (
          <>
            <Fact label="Ngân sách">
              <span className="font-semibold text-primary tabular-nums" title={formatVnd(c.budget)}>
                {formatVndShort(c.budget)}
              </span>
            </Fact>
            <Fact label="Hạn ứng tuyển">
              {c.applyDeadline ? (
                <span className="flex flex-col">
                  <span className="tabular-nums">{formatDay(c.applyDeadline)}</span>
                  <CountdownText countdown={countdown} />
                </span>
              ) : (
                'Không giới hạn'
              )}
            </Fact>
          </>
        )}
        <Fact label="Khu vực">
          <RegionLine regions={c.regions} className="max-w-full" />
        </Fact>
        <Fact label="Workflow">{workflowLabel(c.draftReview)}</Fact>
      </dl>

      {(c.mine || c.myBooking) && (
        <div className="-mt-1 flex flex-wrap gap-x-4">
          {c.mine && (
            <Link
              to={brandCampaignPath(c.id)}
              className="relative z-10 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-8"
            >
              Quản lý chiến dịch
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
          {c.myBooking && (
            <Link
              to={bookingDetailPath(c.myBooking.id)}
              className="relative z-10 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-8"
            >
              Xem booking của bạn
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </CoverCard>
  );
}

export function MarketplaceCampaignCardSkeleton() {
  return (
    <Card className="h-full gap-0 overflow-hidden rounded-[8px] py-0" aria-hidden>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </div>
    </Card>
  );
}
