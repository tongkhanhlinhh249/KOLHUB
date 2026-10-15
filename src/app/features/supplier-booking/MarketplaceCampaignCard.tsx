import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Bookmark, Building2, Check, ChevronRight, CircleAlert, Gift, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import type { AppliedCampaign, MarketplaceCampaign, StoredFile } from '../../services';
import { CampaignCover } from '../shared/CampaignCover';
import { PhaseBadge, RecruitTypeBadge } from '../shared/RecruitParts';
import { ToneBadge } from '../shared/StatusBadges';
import { MatchPill, SaveIconButton } from './MarketplaceParts';
import { BookingStatusBadge, CountdownText, PlatformIcons } from './parts';
import { kolTargetText, rewardSummary } from './marketplaceView';
import { bookingDetailPath, cardMatchLine, expiryCountdown, formatDateTime, priceText, type MarketplaceViewer } from './supplierBooking';

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

/**
 * Bookmark on the card for viewers who cannot save: a guest signs in first (back to this list), a Brand is told that
 * only KOL/MCN keep saved campaigns.
 */
function PublicSaveIconButton({ viewer, name, className }: { viewer: MarketplaceViewer; name: string; className?: string }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Lưu chiến dịch ${name}`}
      title="Lưu chiến dịch"
      onClick={() => {
        if (viewer === 'guest') navigate(`/dang-nhap?returnTo=${encodeURIComponent(pathname + search)}`);
        else toast.info('Chỉ tài khoản KOL/MCN lưu được chiến dịch', { description: 'Đăng nhập bằng tài khoản KOL hoặc MCN để lưu và ứng tuyển.' });
      }}
      className={cn('relative z-10 size-11 shrink-0 text-muted-foreground md:size-8', className)}
    >
      <Bookmark aria-hidden />
    </Button>
  );
}

/** Brand being promoted (§6.2), the organisation when it promotes itself. */
function BrandLine({ campaign: c }: { campaign: Pick<MarketplaceCampaign, 'promotedBrand' | 'brand'> }) {
  const name = c.promotedBrand?.name ?? c.brand.company;
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground" title={c.promotedBrand?.viaAgency ? `${name} · vận hành bởi ${c.brand.company}` : name}>
      <Building2 className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate font-medium text-foreground">{name}</span>
    </p>
  );
}

/** Reward on the card: cash per booking and the gift on separate lines, or "Quyền lợi theo hạng mục" (§6.2). */
function RewardLines({ campaign }: { campaign: MarketplaceCampaign }) {
  const r = rewardSummary(campaign);
  if (r.byGroup) return <span className="font-semibold text-primary">Quyền lợi theo hạng mục</span>;
  if (!r.cash && !r.product) return <span className="text-muted-foreground">Chưa công bố</span>;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {r.cash && (
        <span className="flex items-center gap-1 font-semibold text-primary tabular-nums">
          <Wallet className="size-3.5 shrink-0" aria-hidden />
          {r.cash}
        </span>
      )}
      {r.product && (
        <span className="flex min-w-0 items-center gap-1 font-normal text-foreground" title={r.product}>
          <Gift className="size-3.5 shrink-0 text-chart-4" aria-hidden />
          <span className="truncate">{r.product}</span>
        </span>
      )}
    </span>
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
        <BrandLine campaign={c} />
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
        <Fact label="Quyền lợi">
          {recruit || !b.price ? <RewardLines campaign={c} /> : <span className="font-semibold tabular-nums">{priceText(b.price)}</span>}
        </Fact>
        <Fact label="Số KOL cần tuyển">
          <span className="tabular-nums">{kolTargetText(c)}</span>
        </Fact>
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
  const recruit = c.type === 'OPEN_RECRUITMENT' && !!c.recruitment;
  const line = c.match && c.accepting !== false ? cardMatchLine(c.match) : null;
  const saveClass = cn('rounded-full md:size-9', OVER_BG, 'hover:bg-background', !c.saved && 'text-foreground/80 hover:text-foreground');
  return (
    <CoverCard
      cover={c.cover}
      topLeft={c.myBooking && <MyBookingBadge myBooking={c.myBooking} className={OVER_IMAGE} />}
      topRight={
        viewer === 'supplier' ? (
          <SaveIconButton campaignId={c.id} saved={!!c.saved} name={c.name} className={saveClass} />
        ) : (
          <PublicSaveIconButton viewer={viewer} name={c.name} className={saveClass} />
        )
      }
    >
      <div className="space-y-1">
        {recruit && <RecruitTypeBadge className="h-5 px-1.5 text-[11px]" />}
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

      <PlatformIcons platforms={c.platforms} />

      <dl className="mt-auto border-t border-border pt-3">
        <Fact label="Quyền lợi">
          <RewardLines campaign={c} />
        </Fact>
      </dl>

      {c.myBooking && (
        <div className="-mt-1 flex flex-wrap gap-x-4">
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
