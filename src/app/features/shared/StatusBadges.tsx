import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Facebook, Music2, Youtube, type LucideProps } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { channelBadge, type Channel, type Platform, type ProfileStatus } from '../../services';

// The kit has no success/warning tokens: chart-4 (green) and chart-5 (amber) stand in for them.
const TONE = {
  neutral: 'border-transparent bg-secondary text-secondary-foreground',
  info: 'border-transparent bg-primary/10 text-primary',
  success: 'border-transparent bg-chart-4/15 text-foreground',
  warning: 'border-transparent bg-chart-5/20 text-foreground',
  error: 'border-transparent bg-destructive/15 text-destructive',
} as const;

const DOT = {
  neutral: 'bg-muted-foreground',
  info: 'bg-primary',
  success: 'bg-chart-4',
  warning: 'bg-chart-5',
  error: 'bg-destructive',
} as const;

type Tone = keyof typeof TONE;

function ToneBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 whitespace-nowrap font-medium', TONE[tone], className)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT[tone])} aria-hidden />
      {children}
    </Badge>
  );
}

const PROFILE: Record<ProfileStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Chưa gửi', tone: 'neutral' },
  SUBMITTED: { label: 'Đang xét duyệt', tone: 'info' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  NEEDS_FIX: { label: 'Cần bổ sung', tone: 'warning' },
  REJECTED: { label: 'Không được duyệt', tone: 'error' },
};

export function ProfileStatusBadge({ status, className }: { status: ProfileStatus; className?: string }) {
  const s = PROFILE[status];
  return (
    <ToneBadge tone={s.tone} className={className}>
      {s.label}
    </ToneBadge>
  );
}

/** Brand/Agency account header status: the login email is OTP-verified (styled like "Đã duyệt"). */
export function EmailVerifiedBadge({ className }: { className?: string }) {
  return (
    <ToneBadge tone="success" className={className}>
      Email đã xác thực
    </ToneBadge>
  );
}

/**
 * Verification state of one of the owner's channels. A VERIFIED channel whose badge date has passed
 * shows "Hết hạn dấu" even before the service sweep flips its status.
 */
export function ChannelStatusBadge({ channel, now = Date.now() }: { channel: Channel; now?: number }) {
  let main: ReactNode;
  switch (channel.status) {
    case 'PENDING_REVIEW':
      main = <ToneBadge tone="info">Chờ duyệt</ToneBadge>;
      break;
    case 'NEEDS_FIX':
      main = <ToneBadge tone="warning">Cần bổ sung</ToneBadge>;
      break;
    default:
      main =
        channelBadge(channel, now) === 'VERIFIED' ? (
          <ToneBadge tone="success">
            Đã xác thực{channel.badgeExpiresAt ? ` · đến ${format(channel.badgeExpiresAt, 'dd/MM/yyyy')}` : ''}
          </ToneBadge>
        ) : (
          <ToneBadge tone="error">Hết hạn dấu</ToneBadge>
        );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {main}
      {channel.badgeSuspended && <ToneBadge tone="warning">Dấu tạm ngừng</ToneBadge>}
    </span>
  );
}

const PLATFORM_ICON = { facebook: Facebook, youtube: Youtube, tiktok: Music2 };
export const PLATFORM_LABEL: Record<Platform, string> = { facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok' };

export function PlatformIcon({ platform, ...props }: { platform: Platform } & LucideProps) {
  const Icon = PLATFORM_ICON[platform];
  return <Icon aria-label={PLATFORM_LABEL[platform]} {...props} />;
}
