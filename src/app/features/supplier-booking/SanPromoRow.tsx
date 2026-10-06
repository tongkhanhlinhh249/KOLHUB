import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpenCheck, Building2, Gift, Lightbulb, Megaphone } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import type { KolCategory, OwnerType } from '../../services';
import { fieldIcon } from '../shared/fieldIcons';
import { BRAND_TILE_TONE, GUIDE_TILE_TONE, SAN_CATEGORY_TILES, sanPromo } from './sanPromo';
import type { MarketplaceViewer } from './supplierBooking';

/** Decorative circles / sparkles drawn over a banner (no external images). */
function Decor({ light }: { light?: boolean }) {
  const fill = light ? '#f15a29' : '#ffffff';
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <circle cx="360" cy="30" r="70" fill={fill} opacity={light ? 0.08 : 0.12} />
      <circle cx="300" cy="190" r="56" fill={fill} opacity={light ? 0.06 : 0.1} />
      <circle cx="395" cy="150" r="26" fill={fill} opacity={light ? 0.1 : 0.16} />
      <path d="M250 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill={fill} opacity={light ? 0.35 : 0.5} />
      <path d="M215 150 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill={fill} opacity={light ? 0.3 : 0.4} />
    </svg>
  );
}

function Banner({
  tone,
  eyebrow,
  title,
  text,
  cta,
  illustration,
  children,
}: {
  tone: 'solid' | 'deep' | 'light';
  eyebrow: string;
  title: string;
  text: string;
  cta: { label: string; to: string };
  illustration: ReactNode;
  children?: ReactNode;
}) {
  const light = tone === 'light';
  return (
    <article
      className={cn(
        'relative flex h-full min-h-[11.5rem] flex-col overflow-hidden rounded-[8px] p-4 md:p-5',
        tone === 'solid' && 'bg-[linear-gradient(135deg,#f15a29_0%,#ff8a4c_100%)] text-white',
        tone === 'deep' && 'bg-[linear-gradient(135deg,#8a2c0c_0%,#c8441b_55%,#f15a29_100%)] text-white',
        light && 'border border-[#f15a29]/20 bg-[linear-gradient(135deg,#fff4ee_0%,#ffe1d2_100%)] text-[#3b1a0d] dark:bg-[linear-gradient(135deg,#3a1d12_0%,#4a2214_100%)] dark:text-orange-50',
      )}
    >
      <Decor light={light} />
      <div
        className={cn(
          'absolute right-3 bottom-3 flex size-16 items-center justify-center rounded-2xl md:size-[4.5rem]',
          light ? 'bg-[#f15a29]/12 text-[#f15a29]' : 'bg-white/18 text-white',
        )}
        aria-hidden
      >
        {illustration}
      </div>
      <p className={cn('relative text-[11px] font-semibold tracking-wide uppercase', light ? 'text-[#c8441b] dark:text-orange-300' : 'text-white/85')}>{eyebrow}</p>
      <h2 className="relative mt-1 max-w-[17rem] text-lg leading-snug font-bold">{title}</h2>
      <p className={cn('relative mt-1 max-w-[16rem] text-sm', light ? 'text-[#3b1a0d]/75 dark:text-orange-50/80' : 'text-white/90')}>{text}</p>
      {children}
      <Link
        to={cta.to}
        className={cn(
          'relative mt-auto inline-flex min-h-11 w-fit items-center gap-1.5 self-start rounded-full px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:min-h-9',
          light ? 'bg-[#f15a29] text-white hover:bg-[#d94a1d] focus-visible:ring-[#f15a29]' : 'bg-white text-[#c8441b] hover:bg-orange-50 focus-visible:ring-white',
        )}
      >
        {cta.label}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}

/**
 * Promo row on top of the Sàn (REVU-style): 3 banners in a row from md, a horizontal snap carousel on phones.
 * CTAs depend on the viewer (sanPromo).
 */
export function SanBanners({ viewer, ownerType, openCount }: { viewer: MarketplaceViewer; ownerType?: OwnerType; openCount?: number }) {
  const p = sanPromo(viewer, ownerType);
  return (
    <section aria-label="Giới thiệu Sàn chiến dịch" className="-mx-4 md:mx-0">
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        <li className="w-[85%] max-w-[22rem] shrink-0 snap-start md:w-auto md:max-w-none">
          <Banner
            tone="solid"
            eyebrow="Dành cho KOL/MCN"
            title="Ứng tuyển chiến dịch – nhận thưởng ngay"
            text="Tiền mặt hoặc sản phẩm từ Nhãn hàng, ghi nhận rõ ràng trên KOL Hub."
            cta={p.apply}
            illustration={<Gift className="size-8 md:size-9" />}
          />
        </li>
        <li className="w-[85%] max-w-[22rem] shrink-0 snap-start md:w-auto md:max-w-none">
          <Banner
            tone="deep"
            eyebrow="Dành cho Nhãn hàng"
            title="Triển khai chiến dịch cùng KOLHUB"
            text="Đăng brief lên Sàn, nhận đề xuất từ KOL/MCN đã xác thực."
            cta={p.brand}
            illustration={<Megaphone className="size-8 md:size-9" />}
          />
        </li>
        <li className="w-[85%] max-w-[22rem] shrink-0 snap-start md:w-auto md:max-w-none">
          <Banner
            tone="light"
            eyebrow="Hướng dẫn"
            title="Hướng dẫn & mẹo nhận nhiều chiến dịch hơn"
            text="Từ kết nối kênh tới nhận thanh toán."
            cta={p.guide}
            illustration={<Lightbulb className="size-8 md:size-9" />}
          >
            <ul className="relative mt-2 mb-3 flex max-w-[15rem] flex-wrap gap-1.5" aria-label="Điểm nổi bật">
              {[openCount !== undefined ? `${openCount} chiến dịch trên Sàn` : null, '6 bước dễ làm', 'Hỏi đáp với Nhãn hàng']
                .filter((x): x is string => !!x)
                .map((t) => (
                  <li key={t} className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-[#c8441b] dark:bg-black/25 dark:text-orange-200">
                    {t}
                  </li>
                ))}
            </ul>
          </Banner>
        </li>
      </ul>
    </section>
  );
}

const TILE =
  'flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-[12px] p-1 text-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:w-24 lg:w-full';
const ICON_BOX = 'flex size-14 items-center justify-center rounded-[18px] transition-transform md:size-[4.5rem] md:rounded-[22px] lg:size-16 lg:rounded-[20px]';
const LABEL = 'line-clamp-2 text-xs leading-tight font-medium text-foreground md:text-[13px]';

/**
 * Category icon row (REVU-style) under the banners: "Hướng dẫn sử dụng", each campaign category (toggles the Sàn's
 * ?linh-vuc= filter, active one highlighted) and "Dành cho Nhãn hàng". Scrolls sideways on narrow screens.
 */
export function SanCategoryRow({
  viewer,
  ownerType,
  active,
  onPick,
}: {
  viewer: MarketplaceViewer;
  ownerType?: OwnerType;
  active?: KolCategory;
  onPick(c: KolCategory | undefined): void;
}) {
  const p = sanPromo(viewer, ownerType);
  return (
    <nav aria-label="Lĩnh vực chiến dịch" className="-mx-4 md:mx-0">
      <ul className="flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:gap-2 md:px-0 lg:gap-1 lg:overflow-visible [&::-webkit-scrollbar]:hidden lg:[&>li]:min-w-0 lg:[&>li]:flex-1">
        <li>
          <Link to={p.guideTile} className={TILE}>
            <span className={cn(ICON_BOX, GUIDE_TILE_TONE)}>
              <BookOpenCheck className="size-6 md:size-7" aria-hidden />
            </span>
            <span className={LABEL}>Hướng dẫn sử dụng</span>
          </Link>
        </li>
        {SAN_CATEGORY_TILES.map(({ category, tone }) => {
          const Icon = fieldIcon(category);
          const on = active === category;
          return (
            <li key={category}>
              <button type="button" aria-pressed={on} onClick={() => onPick(on ? undefined : category)} className={cn(TILE, 'group')}>
                <span className={cn(ICON_BOX, tone, on ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'group-hover:-translate-y-0.5')}>
                  <Icon className="size-6 md:size-7" aria-hidden />
                </span>
                <span className={cn(LABEL, on && 'font-semibold text-primary')}>{category}</span>
              </button>
            </li>
          );
        })}
        <li>
          <Link to={p.brandTile} className={TILE}>
            <span className={cn(ICON_BOX, BRAND_TILE_TONE)}>
              <Building2 className="size-6 md:size-7" aria-hidden />
            </span>
            <span className={LABEL}>Dành cho Nhãn hàng</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
