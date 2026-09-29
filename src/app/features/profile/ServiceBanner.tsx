import type { ReactNode } from 'react';
import { ArrowUpRight, BadgeCheck, Phone, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { SAFETY_TOOL_URL } from '../apps/safetyTool';

const HOTLINE = '0888138888';
const HOTLINE_SHOWN = '0888 138 888';

/** One compact service card of the "Tổng quan hồ sơ" side column (8px radius, short copy, one CTA). */
function ServiceCard({
  id,
  eyebrow,
  title,
  text,
  icon: Icon,
  tone,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  icon: LucideIcon;
  tone: 'primary' | 'neutral';
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      // Soft tinted surfaces (light background, dark text); only the button carries the strong primary colour.
      className={cn(
        'relative overflow-hidden rounded-[8px] border p-4 text-foreground',
        tone === 'primary' ? 'border-primary/20 bg-gradient-to-br from-primary/10 to-primary/[0.03]' : 'border-border bg-muted/50',
      )}
    >
      <Icon
        className={cn('pointer-events-none absolute -right-4 -bottom-4 size-24', tone === 'primary' ? 'text-primary/15' : 'text-foreground/[0.07]')}
        aria-hidden
      />
      <p className={cn('text-[11px] font-semibold tracking-widest uppercase', tone === 'primary' ? 'text-primary' : 'text-muted-foreground')}>
        {eyebrow}
      </p>
      <h2 id={id} className="mt-1 text-base leading-snug font-bold">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="relative mt-3">{children}</div>
    </section>
  );
}

/** "Tổng quan hồ sơ" side column: KOL Safety (content checks) + Brand Safety (contact the team). */
export function ServiceBanner() {
  return (
    <div className="space-y-3">
      <ServiceCard
        id="svc-kol-safety"
        eyebrow="KOL Safety"
        title="Kiểm duyệt trước khi đăng"
        text="Phát hiện nội dung rủi ro, giữ dấu xác thực an toàn."
        icon={ShieldCheck}
        tone="primary"
      >
        <Button asChild className="h-11 rounded-[8px] md:h-9">
          <a href={SAFETY_TOOL_URL} target="_blank" rel="noopener noreferrer">
            Mở KOL Safety
            <ArrowUpRight aria-hidden />
            <span className="sr-only">(mở tab mới)</span>
          </a>
        </Button>
      </ServiceCard>
      <ServiceCard
        id="svc-brand-safety"
        eyebrow="Brand Safety"
        title="An toàn thương hiệu khi hợp tác"
        text="Tư vấn giải pháp bảo vệ thương hiệu cùng KOL xác thực."
        icon={BadgeCheck}
        tone="neutral"
      >
        <Button asChild variant="outline" className="h-11 rounded-[8px] bg-card md:h-9">
          <a href={`tel:${HOTLINE}`}>
            <Phone aria-hidden />
            Liên hệ ngay {HOTLINE_SHOWN}
          </a>
        </Button>
      </ServiceCard>
    </div>
  );
}
