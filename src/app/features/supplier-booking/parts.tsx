import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { cn } from '../../components/ui/utils';
import type { BookingItemView, BookingOrigin, BookingView, KolCategory, Platform } from '../../services';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { initials } from '../biz-search/format';
import { fieldIcon } from '../shared/fieldIcons';
import { ToneBadge } from '../shared/StatusBadges';
import { cardCategories, statusTone, supplierStatusLabel, type Countdown } from './supplierBooking';

export const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');

export function BookingStatusBadge({
  booking,
  className,
}: {
  booking: Pick<BookingView, 'status' | 'awaiting' | 'payment'> & Partial<Pick<BookingView, 'origin' | 'acceptedAt' | 'price' | 'campaign'>>;
  className?: string;
}) {
  return (
    <ToneBadge tone={statusTone(booking)} className={className}>
      {supplierStatusLabel(booking)}
    </ToneBadge>
  );
}

export function OriginBadge({ origin }: { origin: BookingOrigin }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-border px-2 text-xs font-medium whitespace-nowrap text-muted-foreground">
      {origin === 'INVITE' ? 'Lời mời' : 'Ứng tuyển'}
    </span>
  );
}

/** Small orange marker: the supplier has something to do on this booking. */
export function NeedsYouMarker({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-primary', className)}>
      <span className="size-2 rounded-full bg-primary" aria-hidden />
      Cần bạn xử lý
    </span>
  );
}

export function CountdownText({ countdown, prefix, className }: { countdown: Countdown | null; prefix?: string; className?: string }) {
  if (!countdown) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap',
        countdown.passed ? 'text-muted-foreground' : countdown.urgent ? 'text-destructive' : 'text-foreground',
        className,
      )}
    >
      <Clock className="size-3.5 shrink-0" aria-hidden />
      {prefix ? `${prefix} ${countdown.text}` : countdown.text}
    </span>
  );
}

/** Category chips; with `max`, only the first `max` then a "+n" chip (full list in its title / accessible label). */
export function CategoryChips({ categories, className, max }: { categories: KolCategory[]; className?: string; max?: number }) {
  if (categories.length === 0) return null;
  const { shown, more } = max === undefined ? { shown: categories, more: 0 } : cardCategories(categories, max);
  const rest = categories.slice(shown.length);
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label="Lĩnh vực">
      {shown.map((c) => {
        const Icon = fieldIcon(c);
        return (
          <li key={c} className="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium text-foreground">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{c}</span>
          </li>
        );
      })}
      {more > 0 && (
        <li className="inline-flex h-7 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground" title={rest.join(', ')}>
          <span aria-hidden>+{more}</span>
          <span className="sr-only">và {rest.join(', ')}</span>
        </li>
      )}
    </ul>
  );
}

export function PlatformIcons({ platforms, className, withLabel }: { platforms: Platform[]; className?: string; withLabel?: boolean }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {platforms.map((p) => (
        <span key={p} className="inline-flex items-center gap-1 text-xs text-foreground">
          <PlatformIcon platform={p} className="size-5 rounded-md" />
          {withLabel && platformLabel(p)}
        </span>
      ))}
    </span>
  );
}

export function KolAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <Avatar className={cn('size-8', className)}>
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

/** Overlapping KOL avatars of a booking's items (unique KOLs), "+N" beyond `max`. */
export function KolAvatarStack({ items, max = 4 }: { items: BookingItemView[]; max?: number }) {
  const kols = [...new Map(items.map((i) => [i.kolAccountId, i])).values()];
  const shown = kols.slice(0, max);
  return (
    <span className="flex -space-x-2" aria-label={`KOL: ${kols.map((k) => k.displayName).join(', ')}`}>
      {shown.map((k) => (
        <KolAvatar key={k.kolAccountId} name={k.displayName} src={k.kol?.avatar} className="size-8 ring-2 ring-card" />
      ))}
      {kols.length > max && (
        <span className="z-10 grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground ring-2 ring-card">
          +{kols.length - max}
        </span>
      )}
    </span>
  );
}

/** Label / value pair for fact grids. */
export function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words text-foreground">{children}</dd>
    </div>
  );
}

/** Titled section inside a detail sheet. */
export function SheetSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Multi-line text from the brand (brief, rules): keeps line breaks, "—" when empty. */
export function LongText({ text }: { text: string }) {
  return text.trim() ? (
    <p className="text-sm break-words whitespace-pre-line text-foreground">{text}</p>
  ) : (
    <p className="text-sm text-muted-foreground">Không có</p>
  );
}
