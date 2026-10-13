import type { ReactNode } from 'react';
import { AlertCircle, BellDot, Globe2, Lock, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import {
  BOOKING_STATUS_LABEL,
  CAMPAIGN_STATUS_LABEL,
  deliverableLabel,
  type BookingStatus,
  type CampaignStatus,
  type CampaignVisibility,
  type Deliverable,
  type DeliverableType,
  type Platform,
  type SupplierType,
} from '../../services';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { ToneBadge } from '../shared/StatusBadges';
import { BOOKING_STATUS_TONE, CAMPAIGN_STATUS_TONE } from './campaignView';

export function CampaignStatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  return (
    <ToneBadge tone={CAMPAIGN_STATUS_TONE[status]} className={className}>
      {CAMPAIGN_STATUS_LABEL[status]}
    </ToneBadge>
  );
}

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <ToneBadge tone={BOOKING_STATUS_TONE[status]} className={className}>
      {BOOKING_STATUS_LABEL[status]}
    </ToneBadge>
  );
}

/** "Riêng tư" (lock) / "Trên Sàn chiến dịch" (globe) — same wording as the form and CAMPAIGN_VISIBILITY_LABEL. */
export function VisibilityLabel({ visibility, className }: { visibility: CampaignVisibility; className?: string }) {
  const market = visibility === 'MARKETPLACE';
  const Icon = market ? Globe2 : Lock;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {market ? 'Trên Sàn chiến dịch' : 'Riêng tư'}
    </span>
  );
}

export function SupplierTypeBadge({ type }: { type: SupplierType }) {
  return (
    <span className="inline-flex h-5 items-center rounded-[6px] border border-border px-1.5 text-[11px] font-medium text-muted-foreground">
      {type === 'MCN' ? 'MCN' : 'KOL độc lập'}
    </span>
  );
}

/** Orange "Cần bạn xử lý" marker for bookings waiting for the brand. */
export function TodoMarker({ label, className }: { label?: string | null; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary', className)}>
      <BellDot className="size-3.5 shrink-0" aria-hidden />
      Cần bạn xử lý{label ? ` · ${label}` : ''}
    </span>
  );
}

export function PlatformIcons({ platforms, className }: { platforms: Platform[]; className?: string }) {
  if (platforms.length === 0) return <span className="text-xs text-muted-foreground">Chưa chọn nền tảng</span>;
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={`Nền tảng: ${platforms.map(platformLabel).join(', ')}`}>
      {platforms.map((p) => (
        <PlatformIcon key={p} platform={p} className="size-4" />
      ))}
    </span>
  );
}

export function deliverableTypeLabel(t: DeliverableType, platform?: Platform): string {
  return deliverableLabel(t, platform);
}

/** "3 Video TikTok", "2 Nhật ký TikTok". */
export function deliverableText(d: Pick<Deliverable, 'type' | 'platform' | 'quantity'>): string {
  return `${d.quantity} ${deliverableTypeLabel(d.type, d.platform)} ${platformLabel(d.platform)}`;
}

/** Label/value pair used in cards and sheets. */
export function Meta({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?(): void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={onRetry}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyBlock({ icon, title, text, children }: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <p className="font-semibold text-foreground">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
