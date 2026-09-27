import {
  BookMarked,
  Building2,
  Clapperboard,
  IdCard,
  LogIn,
  MonitorPlay,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Account, AccountType, RoleKey } from '../services/types';
import { FacebookGlyph, TikTokGlyph, YouTubeGlyph } from '../components/icons/brandGlyphs';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  path: string;
  /** Sidebar section heading; consecutive items with the same group are shown together. */
  group?: string;
}

export interface RoleConfig {
  label: string;
  home: string;
  menu: MenuItem[];
  /** Extra path prefixes the role may open that are not menu items (e.g. /ho-so-kol, which redirects). */
  areas?: string[];
  /** Mobile tab bar when the menu has too many items; without it every menu item is a tab. */
  bottomNav?: BottomNavConfig;
}

export interface BottomNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Path prefixes that mark the tab active (default: `path`). */
  match?: string[];
}

export interface BottomNavConfig {
  items: BottomNavItem[];
  /** Menu paths listed in the "Thêm" sheet, in this order. */
  more: string[];
}

export const GUEST_PATHS = ['/dang-ky', '/dang-nhap', '/quen-mat-khau'];

/** Second sidebar group of KOL/MCN: video pre-check and channel monitoring. */
export const SAFETY_GROUP = 'Kiểm duyệt (KOL Safety)';
export const SAFETY_BASE = '/kiem-duyet';
/** Legacy path of the old "KOL Safety" placeholder; redirects to the video pre-check. */
export const LEGACY_SAFETY_PATH = '/kol-safety';
/** Violations of the signed-in KOL/MCN (manage) and of all approved KOLs for Brands (read-only). */
export const VIOLATIONS_PATH = `${SAFETY_BASE}/vi-pham`;
export const BRAND_VIOLATIONS_PATH = '/vi-pham-kol';
/** Brand list of verified channels (one row per channel). */
export const CHANNEL_DIRECTORY_PATH = '/danh-sach-kenh';

/** Brand: 5 menu items → 4 tabs + "Thêm" (Tài khoản doanh nghiệp). */
const BRAND_BOTTOM_NAV: BottomNavConfig = {
  items: [
    { icon: Search, label: 'Tìm KOL', path: '/tim-kiem-kol' },
    { icon: MonitorPlay, label: 'Kênh', path: CHANNEL_DIRECTORY_PATH },
    { icon: BookMarked, label: 'Đã lưu', path: '/danh-sach-da-luu' },
    { icon: ShieldAlert, label: 'Vi phạm', path: BRAND_VIOLATIONS_PATH },
  ],
  more: ['/tai-khoan-doanh-nghiep'],
};

const SAFETY_MENU: MenuItem[] = [
  { icon: Clapperboard, label: 'Kiểm tra video trước khi đăng', shortLabel: 'Video', path: `${SAFETY_BASE}/video`, group: SAFETY_GROUP },
  { icon: TikTokGlyph, label: 'Kiểm duyệt kênh TikTok', shortLabel: 'TikTok', path: `${SAFETY_BASE}/tiktok`, group: SAFETY_GROUP },
  { icon: FacebookGlyph, label: 'Kiểm duyệt kênh Facebook', shortLabel: 'Facebook', path: `${SAFETY_BASE}/facebook`, group: SAFETY_GROUP },
  { icon: YouTubeGlyph, label: 'Kiểm duyệt kênh YouTube', shortLabel: 'YouTube', path: `${SAFETY_BASE}/youtube`, group: SAFETY_GROUP },
  { icon: ShieldAlert, label: 'Danh sách vi phạm', shortLabel: 'Vi phạm', path: VIOLATIONS_PATH, group: SAFETY_GROUP },
];

/** Profile sections + channel management (group "Hồ sơ KOL/MCN"). */
function profileMenu(base: string, group: string, identityIcon: LucideIcon): MenuItem[] {
  return [
    { icon: UserRound, label: 'Thông tin liên hệ', shortLabel: 'Liên hệ', path: `${base}/lien-he`, group },
    { icon: identityIcon, label: 'Thông tin định danh', shortLabel: 'Định danh', path: `${base}/dinh-danh`, group },
    { icon: MonitorPlay, label: 'Quản lý kênh', shortLabel: 'Kênh', path: `${base}/kenh`, group },
  ];
}

/** MCN only: KOLs the MCN manages (invites, management links; group "Hồ sơ MCN"). */
export const MCN_KOLS_PATH = '/ho-so-mcn/kol';
const MCN_KOLS_ITEM: MenuItem = { icon: Users, label: 'Quản lý KOL', shortLabel: 'KOL', path: MCN_KOLS_PATH, group: 'Hồ sơ MCN' };

/** 8–9 menu items do not fit a phone tab bar: 4 tabs + "Thêm" (the rest; `extraMore` listed first). */
function creatorBottomNav(base: string, extraMore: string[] = []): BottomNavConfig {
  return {
    items: [
      { icon: UserRound, label: 'Liên hệ', path: `${base}/lien-he` },
      { icon: MonitorPlay, label: 'Kênh', path: `${base}/kenh` },
      { icon: Clapperboard, label: 'Video', path: `${SAFETY_BASE}/video` },
      {
        icon: ShieldCheck,
        label: 'Kiểm duyệt',
        path: `${SAFETY_BASE}/tiktok`,
        match: [`${SAFETY_BASE}/tiktok`, `${SAFETY_BASE}/facebook`, `${SAFETY_BASE}/youtube`],
      },
    ],
    more: [...extraMore, `${base}/dinh-danh`, `${SAFETY_BASE}/facebook`, `${SAFETY_BASE}/youtube`, VIOLATIONS_PATH],
  };
}

const CREATOR_AREAS = [SAFETY_BASE, LEGACY_SAFETY_PATH];

export const ROLE_CONFIG: Record<RoleKey, RoleConfig> = {
  'kolhub.guest': {
    label: 'Khách',
    home: '/dang-ky',
    menu: [
      { icon: UserPlus, label: 'Đăng ký', shortLabel: 'Đăng ký', path: '/dang-ky' },
      { icon: LogIn, label: 'Đăng nhập', shortLabel: 'Đăng nhập', path: '/dang-nhap' },
    ],
  },
  'kolhub.user.kol': {
    label: 'Cá nhân/KOL',
    home: '/ho-so-kol/lien-he',
    menu: [...profileMenu('/ho-so-kol', 'Hồ sơ KOL', IdCard), ...SAFETY_MENU],
    areas: ['/ho-so-kol', ...CREATOR_AREAS],
    bottomNav: creatorBottomNav('/ho-so-kol'),
  },
  'kolhub.user.mcn': {
    label: 'Tổ chức/MCN',
    home: '/ho-so-mcn/lien-he',
    menu: [...profileMenu('/ho-so-mcn', 'Hồ sơ MCN', Building2), MCN_KOLS_ITEM, ...SAFETY_MENU],
    areas: ['/ho-so-mcn', ...CREATOR_AREAS],
    bottomNav: creatorBottomNav('/ho-so-mcn', [MCN_KOLS_PATH]),
  },
  'kolhub.user.biz': {
    label: 'Nhãn hàng/Agency',
    home: '/tim-kiem-kol',
    menu: [
      { icon: Search, label: 'Tìm kiếm KOL', shortLabel: 'Tìm KOL', path: '/tim-kiem-kol' },
      { icon: MonitorPlay, label: 'Danh sách kênh', shortLabel: 'Kênh', path: CHANNEL_DIRECTORY_PATH },
      { icon: BookMarked, label: 'Danh sách đã lưu', shortLabel: 'Đã lưu', path: '/danh-sach-da-luu' },
      { icon: ShieldAlert, label: 'Danh sách vi phạm', shortLabel: 'Vi phạm', path: BRAND_VIOLATIONS_PATH },
      { icon: Building2, label: 'Tài khoản doanh nghiệp', shortLabel: 'Doanh nghiệp', path: '/tai-khoan-doanh-nghiep' },
    ],
    bottomNav: BRAND_BOTTOM_NAV,
  },
};

const ROLE_KEYS = Object.keys(ROLE_CONFIG) as RoleKey[];
const USER_ROLES = ROLE_KEYS.filter((r) => r !== 'kolhub.guest');

const ROLE_BY_TYPE: Record<AccountType, RoleKey> = {
  KOL: 'kolhub.user.kol',
  MCN: 'kolhub.user.mcn',
  BIZ: 'kolhub.user.biz',
};

export function roleOf(account: Account | null): RoleKey {
  return account ? ROLE_BY_TYPE[account.type] : 'kolhub.guest';
}

export type Access = { allow: true } | { allow: false; redirect: string; reason: 'login' | 'forbidden' | 'home' };

function allowedPaths(role: RoleKey): string[] {
  if (role === 'kolhub.guest') return GUEST_PATHS;
  const { menu, areas = [] } = ROLE_CONFIG[role];
  return [...menu.map((m) => m.path), ...areas];
}

/** Strip query/hash and trailing slash ("/" stays "/"). */
function cleanPath(path: string): string {
  const p = path.split(/[?#]/)[0] || '/';
  return p.length > 1 ? p.replace(/\/+$/, '') || '/' : p;
}

/** A path matches a menu path exactly or as a sub-path (e.g. /ho-so-kol/kenh). */
function matches(path: string, base: string): boolean {
  return path === base || path.startsWith(base + '/');
}

function inPaths(path: string, paths: string[]): boolean {
  return paths.some((b) => matches(path, b));
}

/** Mobile tab bar of a role: configured tabs + "Thêm" items, or every menu item as a tab. */
export function bottomNavOf(role: RoleKey): { items: BottomNavItem[]; more: MenuItem[] } {
  const { menu, bottomNav } = ROLE_CONFIG[role];
  if (!bottomNav) return { items: menu.map((m) => ({ icon: m.icon, label: m.shortLabel, path: m.path })), more: [] };
  const more = bottomNav.more.map((p) => menu.find((m) => m.path === p)).filter((m): m is MenuItem => !!m);
  return { items: bottomNav.items, more };
}

/** Whether a tab bar item is the current page (its `match` prefixes, else its own path). */
export function isNavActive(pathname: string, item: Pick<BottomNavItem, 'path' | 'match'>): boolean {
  return inPaths(cleanPath(pathname), item.match ?? [item.path]);
}

/** Access rule shared by route guard, sidebar and bottom navigation (BR-66..69). */
export function resolveAccess(role: RoleKey, path: string): Access {
  const p = cleanPath(path);
  const home = ROLE_CONFIG[role].home;
  if (inPaths(p, allowedPaths(role))) return { allow: true };

  const isUserPath = USER_ROLES.some((r) => inPaths(p, allowedPaths(r)));
  if (role === 'kolhub.guest') {
    if (isUserPath) return { allow: false, redirect: `/dang-nhap?returnTo=${encodeURIComponent(p)}`, reason: 'login' };
    return { allow: false, redirect: home, reason: 'home' };
  }
  if (isUserPath) return { allow: false, redirect: home, reason: 'forbidden' };
  return { allow: false, redirect: home, reason: 'home' };
}

/** Only internal, role-permitted paths are honoured; anything else falls back to the role home. */
export function safeReturnTo(role: RoleKey, returnTo: string | null): string {
  const home = ROLE_CONFIG[role].home;
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\')) return home;
  return resolveAccess(role, returnTo).allow ? returnTo : home;
}

const DESCRIPTIONS: Record<string, string> = {
  '/ho-so-kol/lien-he': 'Thông tin liên hệ và nhân sự quản lý nội dung',
  '/ho-so-kol/dinh-danh': 'Xác thực danh tính bằng CCCD và gửi hồ sơ xét duyệt',
  '/ho-so-kol/kenh': 'Thêm kênh, ảnh quản lý kênh và trạng thái dấu xác thực',
  '/ho-so-mcn/lien-he': 'Thông tin liên hệ và nhân sự quản lý nội dung',
  '/ho-so-mcn/dinh-danh': 'Xác thực tổ chức bằng Giấy chứng nhận ĐKDN',
  '/ho-so-mcn/kenh': 'Thêm kênh, ảnh quản lý kênh và trạng thái dấu xác thực',
  '/ho-so-mcn/kol': 'Mời KOL, theo dõi lời mời và các KOL MCN đang quản lý',
  '/tim-kiem-kol': 'Tìm KOL có kênh đã xác thực',
  '/danh-sach-kenh': 'Các kênh đã xác thực, tìm theo nền tảng và lĩnh vực',
  '/danh-sach-da-luu': 'Các KOL bạn đã lưu theo danh sách',
  '/kiem-duyet/vi-pham': 'Vi phạm nội dung trên các kênh của bạn: xem chi tiết, khắc phục hoặc khiếu nại',
  '/vi-pham-kol': 'Vi phạm đã được xác nhận của các KOL có kênh xác thực',
  '/kiem-duyet/video': 'Tải video lên để phát hiện vi phạm trước khi đăng',
  '/kiem-duyet/tiktok': 'Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.',
  '/kiem-duyet/facebook': 'Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.',
  '/kiem-duyet/youtube': 'Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.',
};

/** /kiem-duyet/:platform/:monitorId — channel detail under a channel monitoring page. */
const MONITOR_DETAIL = /^\/kiem-duyet\/(tiktok|facebook|youtube)\/[^/]+$/;
const MONITOR_DETAIL_DESCRIPTION = 'Sức khoẻ kênh và kết quả quét video gần nhất';

const EXTRA_TITLES: Record<string, string> = { '/quen-mat-khau': 'Quên mật khẩu' };

/**
 * Page title/group for the header. `role` (optional) picks the owning group when
 * a path belongs to several roles (e.g. /kiem-duyet/video); otherwise the first owner wins.
 */
export function getPageMeta(path: string, role?: RoleKey): { title: string; group: string; description?: string } {
  const p = cleanPath(path);
  const order = role ? [role, ...ROLE_KEYS.filter((r) => r !== role)] : ROLE_KEYS;
  for (const r of order) {
    const item = ROLE_CONFIG[r].menu.find((m) => matches(p, m.path));
    if (item) {
      const description = MONITOR_DETAIL.test(p) ? MONITOR_DETAIL_DESCRIPTION : DESCRIPTIONS[item.path];
      return { title: item.label, group: ROLE_CONFIG[r].label, ...(description ? { description } : {}) };
    }
  }
  const extra = Object.keys(EXTRA_TITLES).find((b) => matches(p, b));
  if (extra) return { title: EXTRA_TITLES[extra], group: ROLE_CONFIG['kolhub.guest'].label };
  return { title: 'KOL Hub', group: '' };
}
