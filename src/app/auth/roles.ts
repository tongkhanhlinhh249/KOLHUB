import {
  BookMarked,
  Building2,
  LogIn,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Account, AccountType, RoleKey } from '../services/types';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  path: string;
}

export interface RoleConfig {
  label: string;
  home: string;
  menu: MenuItem[];
}

export const GUEST_PATHS = ['/dang-ky', '/dang-nhap', '/quen-mat-khau'];

const KOL_SAFETY: MenuItem = { icon: ShieldCheck, label: 'KOL Safety', shortLabel: 'KOL Safety', path: '/kol-safety' };

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
    home: '/ho-so-kol',
    menu: [{ icon: UserRound, label: 'Hồ sơ KOL', shortLabel: 'Hồ sơ', path: '/ho-so-kol' }, KOL_SAFETY],
  },
  'kolhub.user.mcn': {
    label: 'Tổ chức/MCN',
    home: '/ho-so-mcn',
    menu: [{ icon: Users, label: 'Hồ sơ MCN', shortLabel: 'Hồ sơ', path: '/ho-so-mcn' }, KOL_SAFETY],
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
  return role === 'kolhub.guest' ? GUEST_PATHS : ROLE_CONFIG[role].menu.map((m) => m.path);
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
  '/ho-so-kol': 'Thông tin liên hệ, định danh và kênh của bạn',
  '/ho-so-mcn': 'Thông tin tổ chức, định danh và kênh',
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
