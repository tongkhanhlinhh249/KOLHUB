import {
  BookMarked,
  Building2,
  IdCard,
  LogIn,
  MonitorPlay,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { Account, AccountType, RoleKey } from '../services/types';

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
}

export const GUEST_PATHS = ['/dang-ky', '/dang-nhap', '/quen-mat-khau'];

const KOL_SAFETY: MenuItem = { icon: ShieldCheck, label: 'KOL Safety', shortLabel: 'Safety', path: '/kol-safety' };

/** Profile sections, each its own sidebar page (formerly the 3 tabs of the profile page). */
function profileMenu(base: string, group: string, identityIcon: LucideIcon): MenuItem[] {
  return [
    { icon: UserRound, label: 'Thông tin liên hệ', shortLabel: 'Liên hệ', path: `${base}/lien-he`, group },
    { icon: identityIcon, label: 'Thông tin định danh', shortLabel: 'Định danh', path: `${base}/dinh-danh`, group },
    { icon: MonitorPlay, label: 'Quản lý kênh', shortLabel: 'Kênh', path: `${base}/kenh`, group },
  ];
}

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
    menu: [...profileMenu('/ho-so-kol', 'Hồ sơ KOL', IdCard), KOL_SAFETY],
    areas: ['/ho-so-kol'],
  },
  'kolhub.user.mcn': {
    label: 'Tổ chức/MCN',
    home: '/ho-so-mcn/lien-he',
    menu: [...profileMenu('/ho-so-mcn', 'Hồ sơ MCN', Building2), KOL_SAFETY],
    areas: ['/ho-so-mcn'],
  },
  'kolhub.user.biz': {
    label: 'Nhãn hàng/Agency',
    home: '/tim-kiem-kol',
    menu: [
      { icon: Search, label: 'Tìm kiếm KOL', shortLabel: 'Tìm KOL', path: '/tim-kiem-kol' },
      { icon: BookMarked, label: 'Danh sách đã lưu', shortLabel: 'Đã lưu', path: '/danh-sach-da-luu' },
      { icon: Building2, label: 'Tài khoản doanh nghiệp', shortLabel: 'Doanh nghiệp', path: '/tai-khoan-doanh-nghiep' },
    ],
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
  '/tim-kiem-kol': 'Tìm KOL có kênh đã xác thực',
  '/danh-sach-da-luu': 'Các KOL bạn đã lưu theo danh sách',
};

const EXTRA_TITLES: Record<string, string> = { '/quen-mat-khau': 'Quên mật khẩu' };

/**
 * Page title/group for the header. `role` (optional) picks the owning group when
 * a path belongs to several roles (e.g. /kol-safety); otherwise the first owner wins.
 */
export function getPageMeta(path: string, role?: RoleKey): { title: string; group: string; description?: string } {
  const p = cleanPath(path);
  const order = role ? [role, ...ROLE_KEYS.filter((r) => r !== role)] : ROLE_KEYS;
  for (const r of order) {
    const item = ROLE_CONFIG[r].menu.find((m) => matches(p, m.path));
    if (item) {
      const description = DESCRIPTIONS[item.path];
      return { title: item.label, group: ROLE_CONFIG[r].label, ...(description ? { description } : {}) };
    }
  }
  const extra = Object.keys(EXTRA_TITLES).find((b) => matches(p, b));
  if (extra) return { title: EXTRA_TITLES[extra], group: ROLE_CONFIG['kolhub.guest'].label };
  return { title: 'KOL Hub', group: '' };
}
