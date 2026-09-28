import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BadgeCheck, Phone, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { SAFETY_BASE } from '../../auth/roles';

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
  tone: 'primary' | 'dark';
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'relative overflow-hidden rounded-[8px] p-4 shadow-sm',
        tone === 'primary'
          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
          : 'bg-foreground text-background',
      )}
    >
      <Icon className="pointer-events-none absolute -right-4 -bottom-4 size-24 opacity-15" aria-hidden />
      <p className="text-[11px] font-semibold tracking-widest uppercase opacity-85">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-base leading-snug font-bold">
        {title}
      </h2>
      <p className="mt-1 text-sm opacity-90">{text}</p>
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
        <Button asChild variant="secondary" className="h-11 rounded-[8px] bg-white text-primary hover:bg-white/90 md:h-9">
          <Link to={`${SAFETY_BASE}/video`}>
            Kiểm tra video
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </ServiceCard>
      <ServiceCard
        id="svc-brand-safety"
        eyebrow="Brand Safety"
        title="An toàn thương hiệu khi hợp tác"
        text="Tư vấn giải pháp bảo vệ thương hiệu cùng KOL xác thực."
        icon={BadgeCheck}
        tone="dark"
      >
        <Button asChild className="h-11 rounded-[8px] md:h-9">
          <a href={`tel:${HOTLINE}`}>
            <Phone aria-hidden />
            Liên hệ ngay {HOTLINE_SHOWN}
          </a>
        </Button>
      </ServiceCard>
    </div>
  );
}
