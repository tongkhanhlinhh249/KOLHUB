// Pure data of the Sàn's promo row (3 banners) and category icon row: CTA targets per viewer and the category tiles.
import { KOL_CATEGORIES, type KolCategory, type OwnerType } from '../../services';
import { CAMPAIGNS_PATH, SUPPORT_CONTACT_PATH, SUPPORT_GUIDE_PATH } from '../../auth/roles';
import type { MarketplaceViewer } from './supplierBooking';

export interface PromoCta {
  label: string;
  to: string;
}

export interface SanPromo {
  apply: PromoCta;
  brand: PromoCta;
  guide: PromoCta;
  /** "Hướng dẫn sử dụng" tile. */
  guideTile: string;
  /** "Dành cho Nhãn hàng" tile. */
  brandTile: string;
}

const login = (to: string) => `/dang-nhap?returnTo=${encodeURIComponent(to)}`;

/**
 * Where the promo CTAs go: guests register / sign in first (Hỗ trợ needs an account), KOL/MCN finish their profile
 * and contact support, brands create a campaign.
 */
export function sanPromo(viewer: MarketplaceViewer, ownerType: OwnerType = 'KOL'): SanPromo {
  const profile = ownerType === 'MCN' ? '/ho-so-mcn/tong-quan' : '/ho-so-kol/tong-quan';
  const guide = viewer === 'guest' ? login(SUPPORT_GUIDE_PATH) : SUPPORT_GUIDE_PATH;
  return {
    apply:
      viewer === 'guest'
        ? { label: 'Đăng ký tài khoản KOL', to: '/dang-ky?loai=kol' }
        : viewer === 'brand'
          ? { label: 'Tìm KOL phù hợp', to: '/tim-kiem-kol' }
          : { label: 'Hoàn thiện hồ sơ', to: profile },
    brand:
      viewer === 'brand'
        ? { label: 'Tạo chiến dịch', to: `${CAMPAIGNS_PATH}/tao` }
        : viewer === 'guest'
          ? { label: 'Liên hệ tư vấn', to: '/dang-ky?loai=biz' }
          : { label: 'Liên hệ tư vấn', to: SUPPORT_CONTACT_PATH },
    guide: { label: 'Xem hướng dẫn', to: guide },
    guideTile: guide,
    brandTile: viewer === 'brand' ? CAMPAIGNS_PATH : viewer === 'guest' ? '/dang-ky?loai=biz' : SUPPORT_CONTACT_PATH,
  };
}

/** Pastel background + icon colour pairs (light / dark). */
const TILE_TONES = [
  'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
];

/** Category tiles of the Sàn (every campaign category except "Khác"), each with a pastel tone. */
export const SAN_CATEGORY_TILES: { category: KolCategory; tone: string }[] = KOL_CATEGORIES.filter((c) => c !== 'Khác').map((category, i) => ({
  category,
  tone: TILE_TONES[i % TILE_TONES.length],
}));

/** Tone of the first / last tiles (guide, brands). */
export const GUIDE_TILE_TONE = 'bg-primary/10 text-primary';
export const BRAND_TILE_TONE = 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200';
