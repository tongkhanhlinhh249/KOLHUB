import { PLATFORMS, type Platform } from '../../services';
import { cn } from '../../components/ui/utils';

export function platformLabel(p: Platform): string {
  return PLATFORMS.find((x) => x.key === p)?.label ?? p;
}

/**
 * Platform logo. Brand colours are the one allowed exception to the token-only colour rule.
 * SVG paths for YouTube/TikTok come from CreatorCard's getPlatformIcon.
 */
export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const label = platformLabel(platform);
  const box = cn('inline-flex size-4 shrink-0 items-center justify-center rounded-sm', className);
  switch (platform) {
    case 'youtube':
      return (
        <span role="img" aria-label={label} className={cn(box, 'bg-[#FF0000]')}>
          <svg className="size-[62%] text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </span>
      );
    case 'tiktok':
      return (
        <span role="img" aria-label={label} className={cn(box, 'bg-black')}>
          <svg className="size-[62%]" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#25F4EE"
              d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
            />
          </svg>
        </span>
      );
    case 'facebook':
      return (
        <span role="img" aria-label={label} className={cn(box, 'bg-[#1877F2]')}>
          <svg className="size-[70%] text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M13.5 21.5v-8h2.7l.4-3.2h-3.1V8.3c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.5-.1c-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5v3.2h2.7v8h3.3z" />
          </svg>
        </span>
      );
  }
}
