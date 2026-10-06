import {
  Bell,
  Bookmark,
  LifeBuoy,
  MessageCircleQuestion,
  MessagesSquare,
  LayoutDashboard,
  LayoutGrid,
  BookMarked,
  Building2,
  IdCard,
  Images,
  LogIn,
  Megaphone,
  MonitorPlay,
  Search,
  ShieldAlert,
  Store,
  UserPlus,
  Users,
  Wallet,
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

/** Sàn chiến dịch: public space with its own layout (outside the app shell), open to every role incl. guests. */
export const MARKETPLACE_PATH = '/san';
/** Old in-shell marketplace path; redirects to MARKETPLACE_PATH (query kept). */
export const LEGACY_MARKETPLACE_PATH = '/san-chien-dich';
/** Paths every role (guests included) may open, sub-paths included (/san/<id>); the guard never redirects them. */
export const PUBLIC_PATHS = [MARKETPLACE_PATH, LEGACY_MARKETPLACE_PATH];

/** Sidebar group of KOL/MCN: review apps (external KOL Safety / Brand Safety tool) + own violations. */
export const SAFETY_GROUP = 'Kiểm duyệt';
export const SAFETY_BASE = '/kiem-duyet';
/** Legacy path of the old "KOL Safety" placeholder; redirects to the video pre-check. */
export const LEGACY_SAFETY_PATH = '/kol-safety';
/** Violations of the signed-in KOL/MCN (manage) and of all approved KOLs for Brands (read-only). */
export const VIOLATIONS_PATH = `${SAFETY_BASE}/vi-pham`;
export const BRAND_VIOLATIONS_PATH = '/vi-pham-kol';
/** Brand list of verified channels (one row per channel). */
export const CHANNEL_DIRECTORY_PATH = '/danh-sach-kenh';

/** App launcher: KOL Safety / Brand Safety tiles that open the external review tool. */
export const APPS_PATH = '/ung-dung';
/** KOL Safety – Tổng hợp kênh (demo in-app page opened from "Ứng dụng"); KOL/MCN via the SAFETY_BASE area. */
export const KOL_SAFETY_PATH = `${SAFETY_BASE}/kol-safety`;

/** Brand campaigns (campaign booking beta): list, /tao, /:id, /:id/sua. */
export const CAMPAIGNS_PATH = '/chien-dich';

/** "Tin nhắn": one thread per booking between the brand and the KOL/MCN (KOL/MCN and Brand). */
export const MESSAGES_PATH = '/tin-nhan';
/** "Thông báo": in-app notification center, opened from the header bell (every signed-in role; not a menu item). */
export const NOTIFICATIONS_PATH = '/thong-bao';
/** KOL/MCN "Chiến dịch quan tâm": saved Sàn campaigns + applications (was the Sàn's "Đã lưu" / "Đã ứng tuyển" tabs). */
export const INTERESTED_PATH = '/chien-dich-da-luu';
/** KOL/MCN "Câu hỏi của tôi": questions asked on Sàn campaigns. */
export const MY_QUESTIONS_PATH = '/cau-hoi-cua-toi';
/** "Hỗ trợ": user guide, FAQ, contact form (KOL/MCN and Brand). */
export const SUPPORT_PATH = '/ho-tro';
export const SUPPORT_GROUP = 'Hỗ trợ';
const SUPPORT_ITEM: MenuItem = { icon: LifeBuoy, label: 'Hỗ trợ', shortLabel: 'Hỗ trợ', path: SUPPORT_PATH, group: SUPPORT_GROUP };
/** Icon of the header bell (Thông báo). */
export const NOTIFICATIONS_ICON = Bell;

/** Brand: 10 menu items → 4 tabs + "Thêm" (Sàn chiến dịch, Tin nhắn, Ứng dụng, Danh sách vi phạm, Tài khoản doanh nghiệp, Hỗ trợ). */
const BRAND_BOTTOM_NAV: BottomNavConfig = {
  items: [
    { icon: Search, label: 'Tìm KOL', path: '/tim-kiem-kol' },
    { icon: Megaphone, label: 'Chiến dịch', path: CAMPAIGNS_PATH },
    { icon: MonitorPlay, label: 'Kênh', path: CHANNEL_DIRECTORY_PATH },
    { icon: BookMarked, label: 'Đã lưu', path: '/danh-sach-da-luu' },
  ],
  more: [MARKETPLACE_PATH, MESSAGES_PATH, APPS_PATH, BRAND_VIOLATIONS_PATH, '/tai-khoan-doanh-nghiep', SUPPORT_PATH],
};

/** Video/channel checks now live in the external tool (via "Ứng dụng"); the in-app mock pages stay routable only. */
const SAFETY_MENU: MenuItem[] = [
  { icon: LayoutGrid, label: 'Ứng dụng', shortLabel: 'Ứng dụng', path: APPS_PATH, group: SAFETY_GROUP },
  { icon: ShieldAlert, label: 'Danh sách vi phạm', shortLabel: 'Vi phạm', path: VIOLATIONS_PATH, group: SAFETY_GROUP },
];

/** Profile overview ("Tổng quan hồ sơ") + "Thông tin hồ sơ" (identity + contact) + channel management (group "Hồ sơ KOL/MCN"). */
function profileMenu(base: string, group: string, identityIcon: LucideIcon): MenuItem[] {
  return [
    { icon: LayoutDashboard, label: 'Tổng quan hồ sơ', shortLabel: 'Tổng quan', path: `${base}/tong-quan`, group },
    { icon: identityIcon, label: 'Thông tin hồ sơ', shortLabel: 'Hồ sơ', path: `${base}/thong-tin`, group },
    { icon: MonitorPlay, label: 'Quản lý kênh', shortLabel: 'Kênh', path: `${base}/kenh`, group },
  ];
}

/**
 * "Hợp tác" group (campaign booking beta). KOL/MCN: "Chiến dịch" (invites, applications and bookings they work on)
 * + "Sàn chiến dịch" (leaves the shell for the public Sàn layout). Brand: own campaigns + the Sàn (read-only).
 */
export const COLLAB_GROUP = 'Hợp tác';
/** KOL/MCN "Chiến dịch" page (was /booking). */
export const SUPPLIER_CAMPAIGNS_PATH = '/chien-dich-cua-toi';
/** Old path of the KOL/MCN page; redirects to SUPPLIER_CAMPAIGNS_PATH (query kept). */
export const LEGACY_SUPPLIER_BOOKING_PATH = '/booking';
/** KOL/MCN "Bài đã đăng": verified posts from bookings, each with "Hiện trên hồ sơ". */
export const PORTFOLIO_PATH = '/bai-da-dang';
/** KOL/MCN "Thu nhập": record-only ledger of cash / product rewards (payment happens outside KOL Hub). */
export const EARNINGS_PATH = '/thu-nhap';
const MARKETPLACE_ITEM: MenuItem = { icon: Store, label: 'Sàn chiến dịch', shortLabel: 'Sàn', path: MARKETPLACE_PATH, group: COLLAB_GROUP };
const MESSAGES_ITEM: MenuItem = { icon: MessagesSquare, label: 'Tin nhắn', shortLabel: 'Tin nhắn', path: MESSAGES_PATH, group: COLLAB_GROUP };
const COLLAB_MENU: MenuItem[] = [
  { icon: Megaphone, label: 'Chiến dịch', shortLabel: 'Chiến dịch', path: SUPPLIER_CAMPAIGNS_PATH, group: COLLAB_GROUP },
  MARKETPLACE_ITEM,
  { icon: Bookmark, label: 'Chiến dịch quan tâm', shortLabel: 'Quan tâm', path: INTERESTED_PATH, group: COLLAB_GROUP },
  MESSAGES_ITEM,
  { icon: Images, label: 'Bài đã đăng', shortLabel: 'Bài đăng', path: PORTFOLIO_PATH, group: COLLAB_GROUP },
  { icon: Wallet, label: 'Thu nhập', shortLabel: 'Thu nhập', path: EARNINGS_PATH, group: COLLAB_GROUP },
  { icon: MessageCircleQuestion, label: 'Câu hỏi của tôi', shortLabel: 'Câu hỏi', path: MY_QUESTIONS_PATH, group: COLLAB_GROUP },
];

/** MCN only: KOLs the MCN's channels are assigned to (group "Hồ sơ MCN"). */
export const MCN_KOLS_PATH = '/ho-so-mcn/kol';
const MCN_KOLS_ITEM: MenuItem = { icon: Users, label: 'Quản lý KOL', shortLabel: 'KOL', path: MCN_KOLS_PATH, group: 'Hồ sơ MCN' };

/**
 * 17–18 menu items do not fit a phone tab bar: 4 tabs + "Thêm" (the rest; `extraMore` first, then the Hợp tác pages,
 * profile pages, violations and Hỗ trợ).
 * "Chiến dịch" takes the tab of "Kênh" (channel setup is reached from Tổng quan / Thêm).
 */
function creatorBottomNav(base: string, extraMore: string[] = []): BottomNavConfig {
  return {
    items: [
      { icon: LayoutDashboard, label: 'Tổng quan', path: `${base}/tong-quan` },
      { icon: Megaphone, label: 'Chiến dịch', path: SUPPLIER_CAMPAIGNS_PATH },
      { icon: Store, label: 'Sàn', path: MARKETPLACE_PATH },
      { icon: LayoutGrid, label: 'Ứng dụng', path: APPS_PATH },
    ],
    more: [
      ...extraMore,
      MESSAGES_PATH,
      INTERESTED_PATH,
      PORTFOLIO_PATH,
      EARNINGS_PATH,
      MY_QUESTIONS_PATH,
      `${base}/kenh`,
      `${base}/thong-tin`,
      VIOLATIONS_PATH,
      SUPPORT_PATH,
    ],
  };
}

/** Brand sidebar groups: find KOLs · collaborate · review · account. */
const BRAND_MENU: MenuItem[] = [
  { icon: Search, label: 'Tìm kiếm KOL', shortLabel: 'Tìm KOL', path: '/tim-kiem-kol', group: 'Tìm KOL' },
  { icon: MonitorPlay, label: 'Danh sách kênh', shortLabel: 'Kênh', path: CHANNEL_DIRECTORY_PATH, group: 'Tìm KOL' },
  { icon: BookMarked, label: 'Danh sách đã lưu', shortLabel: 'Đã lưu', path: '/danh-sach-da-luu', group: 'Tìm KOL' },
  { icon: Megaphone, label: 'Chiến dịch', shortLabel: 'Chiến dịch', path: CAMPAIGNS_PATH, group: COLLAB_GROUP },
  MARKETPLACE_ITEM,
  MESSAGES_ITEM,
  { icon: LayoutGrid, label: 'Ứng dụng', shortLabel: 'Ứng dụng', path: APPS_PATH, group: SAFETY_GROUP },
  { icon: ShieldAlert, label: 'Danh sách vi phạm', shortLabel: 'Vi phạm', path: BRAND_VIOLATIONS_PATH, group: SAFETY_GROUP },
  { icon: Building2, label: 'Tài khoản doanh nghiệp', shortLabel: 'Doanh nghiệp', path: '/tai-khoan-doanh-nghiep', group: 'Tài khoản' },
  SUPPORT_ITEM,
];

const CREATOR_AREAS = [SAFETY_BASE, LEGACY_SAFETY_PATH, LEGACY_SUPPLIER_BOOKING_PATH, NOTIFICATIONS_PATH];

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
    home: '/ho-so-kol/tong-quan',
    menu: [...profileMenu('/ho-so-kol', 'Hồ sơ KOL', IdCard), ...COLLAB_MENU, ...SAFETY_MENU, SUPPORT_ITEM],
    areas: ['/ho-so-kol', ...CREATOR_AREAS],
    bottomNav: creatorBottomNav('/ho-so-kol'),
  },
  'kolhub.user.mcn': {
    label: 'Tổ chức/MCN',
    home: '/ho-so-mcn/tong-quan',
    menu: [...profileMenu('/ho-so-mcn', 'Hồ sơ MCN', Building2), MCN_KOLS_ITEM, ...COLLAB_MENU, ...SAFETY_MENU, SUPPORT_ITEM],
    areas: ['/ho-so-mcn', ...CREATOR_AREAS],
    bottomNav: creatorBottomNav('/ho-so-mcn', [MCN_KOLS_PATH]),
  },
  'kolhub.user.biz': {
    label: 'Nhãn hàng/Agency',
    home: '/tim-kiem-kol',
    menu: BRAND_MENU,
    areas: [NOTIFICATIONS_PATH],
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

/** /san, its campaign pages /san/<id> (and the legacy /san-chien-dich): open to every role, never redirected by the guard. */
export function isPublicPath(path: string): boolean {
  return inPaths(cleanPath(path), PUBLIC_PATHS);
}

/** Access rule shared by route guard, sidebar and bottom navigation (BR-66..69). */
export function resolveAccess(role: RoleKey, path: string): Access {
  const p = cleanPath(path);
  const home = ROLE_CONFIG[role].home;
  if (isPublicPath(p) || inPaths(p, allowedPaths(role))) return { allow: true };

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
  '/ho-so-kol/tong-quan': 'Tình trạng các mục hồ sơ, gửi xét duyệt và theo dõi kết quả',
  '/ho-so-kol/thong-tin': 'Định danh (eKYC), thông tin liên hệ và nhân sự quản lý nội dung',
  '/ho-so-kol/kenh': 'Thêm kênh, ảnh quản lý kênh và trạng thái dấu xác thực',
  '/ho-so-mcn/tong-quan': 'Tình trạng các mục hồ sơ, gửi xét duyệt và theo dõi kết quả',
  '/ho-so-mcn/thong-tin': 'Thông tin tổ chức, Giấy chứng nhận ĐKDN, liên hệ và nhân sự quản lý',
  '/ho-so-mcn/kenh': 'Thêm kênh, ảnh quản lý kênh và trạng thái dấu xác thực',
  '/ho-so-mcn/kol': 'Gán kênh của MCN cho KOL và xem KOL đang phụ trách kênh',
  '/san': 'Chiến dịch Nhãn hàng đang tìm KOL: xem brief và gửi đề xuất ứng tuyển',
  '/chien-dich-cua-toi': 'Nhận lời mời, ứng tuyển và quản lý các chiến dịch đang thực hiện',
  '/bai-da-dang': 'Các bài đăng đã xác minh trong chiến dịch; chọn bài hiện trên hồ sơ cho Nhãn hàng xem',
  '/thu-nhap': 'Theo dõi tiền và sản phẩm nhận từ chiến dịch (chỉ ghi nhận, thanh toán ngoài KOL Hub)',
  '/chien-dich-da-luu': 'Chiến dịch đã lưu và đã ứng tuyển trên Sàn',
  '/tin-nhan': 'Trao đổi với đối tác theo từng booking',
  '/cau-hoi-cua-toi': 'Câu hỏi bạn đã gửi Nhãn hàng trên Sàn chiến dịch',
  '/ho-tro': 'Hướng dẫn sử dụng, câu hỏi thường gặp và liên hệ hỗ trợ',
  '/thong-bao': 'Lời mời, đề xuất, duyệt nội dung, thanh toán và tin nhắn mới',
  '/tim-kiem-kol': 'Tìm KOL có kênh đã xác thực',
  '/chien-dich': 'Tạo chiến dịch, mời KOL/MCN, duyệt nội dung và theo dõi kết quả',
  '/danh-sach-kenh': 'Các kênh đã xác thực, tìm theo nền tảng và lĩnh vực',
  '/danh-sach-da-luu': 'Các KOL bạn đã lưu theo danh sách',
  '/kiem-duyet/vi-pham': 'Vi phạm nội dung trên các kênh của bạn: xem chi tiết, khắc phục hoặc khiếu nại',
  '/vi-pham-kol': 'Vi phạm đã được xác nhận của các KOL có kênh xác thực',
  '/ung-dung': 'KOL Safety và Brand Safety: mở công cụ kiểm duyệt nội dung',
  '/kiem-duyet/video': 'Tải video lên để phát hiện vi phạm trước khi đăng',
  '/kiem-duyet/tiktok': 'Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.',
  '/kiem-duyet/facebook': 'Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.',
  '/kiem-duyet/youtube': 'Kết nối kênh, rồi bấm vào kênh để xem sức khoẻ và bắt đầu quét.',
};

/** /kiem-duyet/:platform/:monitorId — channel detail under a channel monitoring page. */
const MONITOR_DETAIL = /^\/kiem-duyet\/(tiktok|facebook|youtube)\/[^/]+$/;
const MONITOR_DETAIL_DESCRIPTION = 'Sức khoẻ kênh và kết quả quét video gần nhất';

/** Sub-pages of /chien-dich (title stays "Chiến dịch"). */
function campaignSubDescription(p: string): string | undefined {
  if (p === `${CAMPAIGNS_PATH}/tao`) return 'Nhập brief, ngân sách, thời gian và hạng mục; lưu nháp hoặc đăng';
  if (/^\/chien-dich\/[^/]+\/sua$/.test(p)) return 'Sửa thông tin chiến dịch (bản nháp hoặc đang mở)';
  if (/^\/chien-dich\/[^/]+$/.test(p)) return 'Booking, đề xuất ứng tuyển, duyệt nội dung và báo cáo của chiến dịch';
  return undefined;
}

const EXTRA_TITLES: Record<string, string> = { '/quen-mat-khau': 'Quên mật khẩu' };
/** Signed-in pages that are not menu items (header bell). */
const AREA_TITLES: Record<string, string> = { [NOTIFICATIONS_PATH]: 'Thông báo' };

/** In-app pages of "Ứng dụng" (not menu items): own title, group = the role's label. */
const APP_PAGES: Record<string, { title: string; description: string }> = {
  [KOL_SAFETY_PATH]: {
    title: 'KOL Safety – Tổng hợp kênh',
    description: 'Tổng hợp 30 nội dung đã quét gần nhất của kênh: điểm an toàn, vấn đề theo danh mục và khuyến nghị',
  },
};

/**
 * Page title/group for the header. `role` (optional) picks the owning group when
 * a path belongs to several roles (e.g. /kiem-duyet/video); otherwise the first owner wins.
 */
export function getPageMeta(path: string, role?: RoleKey): { title: string; group: string; description?: string } {
  const p = cleanPath(path);
  const app = APP_PAGES[p];
  if (app) return { ...app, group: ROLE_CONFIG[role && role !== 'kolhub.guest' ? role : 'kolhub.user.kol'].label };
  const order = role ? [role, ...ROLE_KEYS.filter((r) => r !== role)] : ROLE_KEYS;
  for (const r of order) {
    const item = ROLE_CONFIG[r].menu.find((m) => matches(p, m.path));
    if (item) {
      const description = MONITOR_DETAIL.test(p) ? MONITOR_DETAIL_DESCRIPTION : (campaignSubDescription(p) ?? DESCRIPTIONS[item.path]);
      return { title: item.label, group: ROLE_CONFIG[r].label, ...(description ? { description } : {}) };
    }
  }
  const area = Object.keys(AREA_TITLES).find((b) => matches(p, b));
  if (area) {
    const owner = role && role !== 'kolhub.guest' ? role : 'kolhub.user.kol';
    return { title: AREA_TITLES[area], group: ROLE_CONFIG[owner].label, description: DESCRIPTIONS[area] };
  }
  const extra = Object.keys(EXTRA_TITLES).find((b) => matches(p, b));
  if (extra) return { title: EXTRA_TITLES[extra], group: ROLE_CONFIG['kolhub.guest'].label };
  return { title: 'KOL Hub', group: '' };
}
