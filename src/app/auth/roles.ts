import {
  Bell,
  BookOpen,
  Heart,
  ClipboardCheck,
  Headset,
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
  Star,
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
  /** Path prefixes that mark the item active and that the role may open (default: `path`). */
  match?: string[];
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

/** "Cuộc trò chuyện" (KOL/MCN) / "Tin nhắn" (Brand): one thread per booking between the brand and the KOL/MCN. */
export const MESSAGES_PATH = '/tin-nhan';
/** "Thông báo": in-app notification center, opened from the header bell (every signed-in role; not a menu item). */
export const NOTIFICATIONS_PATH = '/thong-bao';
/** KOL/MCN "Chiến dịch yêu thích": saved Sàn campaigns + applications (was the Sàn's "Đã lưu" / "Đã ứng tuyển" tabs). */
export const INTERESTED_PATH = '/chien-dich-da-luu';
/** KOL/MCN "Câu hỏi của tôi": questions asked on Sàn campaigns (not a menu item; linked from Hỗ trợ › Liên hệ and Chiến dịch yêu thích). */
export const MY_QUESTIONS_PATH = '/cau-hoi-cua-toi';
/** "Hỗ trợ" (KOL/MCN and Brand): three pages under /ho-tro; /ho-tro itself redirects to the guide. */
export const SUPPORT_PATH = '/ho-tro';
export const SUPPORT_GUIDE_PATH = `${SUPPORT_PATH}/huong-dan`;
export const SUPPORT_FAQ_PATH = `${SUPPORT_PATH}/faq`;
export const SUPPORT_CONTACT_PATH = `${SUPPORT_PATH}/lien-he`;
export const SUPPORT_GROUP = 'Hỗ trợ';
/** KOL/MCN: one menu item per support page. */
const SUPPORT_MENU: MenuItem[] = [
  { icon: BookOpen, label: 'Hướng dẫn', shortLabel: 'Hướng dẫn', path: SUPPORT_GUIDE_PATH, group: SUPPORT_GROUP },
  { icon: MessageCircleQuestion, label: 'FAQ', shortLabel: 'FAQ', path: SUPPORT_FAQ_PATH, group: SUPPORT_GROUP },
  { icon: Headset, label: 'Liên hệ', shortLabel: 'Liên hệ', path: SUPPORT_CONTACT_PATH, group: SUPPORT_GROUP },
];
/** Icon of the header bell (Thông báo). */
export const NOTIFICATIONS_ICON = Bell;

/** Brand "Tài khoản doanh nghiệp": not a menu item — opened from the account (profile) menu. */
export const BIZ_ACCOUNT_PATH = '/tai-khoan-doanh-nghiep';
/** Brand "Nội dung chiến dịch": drafts waiting for review and verified posts across all campaigns. */
export const BRAND_CONTENT_PATH = '/noi-dung-chien-dich';

/** Brand: 12 menu items → 4 tabs + "Thêm" with the other items in sidebar order. */
const BRAND_BOTTOM_NAV: BottomNavConfig = {
  items: [
    { icon: Search, label: 'Tìm KOL', path: '/tim-kiem-kol' },
    { icon: Megaphone, label: 'Chiến dịch', path: CAMPAIGNS_PATH },
    { icon: MonitorPlay, label: 'Kênh', path: CHANNEL_DIRECTORY_PATH },
    { icon: BookMarked, label: 'Đã lưu', path: '/danh-sach-da-luu' },
  ],
  more: [BRAND_CONTENT_PATH, MESSAGES_PATH, APPS_PATH, BRAND_VIOLATIONS_PATH, SUPPORT_GUIDE_PATH, SUPPORT_FAQ_PATH, SUPPORT_CONTACT_PATH],
};

/**
 * KOL/MCN "Kiểm duyệt": app launcher + own violations ("Vi phạm"). Video/channel checks live in the external tool
 * (via "Ứng dụng"); the in-app mock pages stay routable only. Brands keep their own "Danh sách vi phạm" (other KOLs).
 */
const SAFETY_MENU: MenuItem[] = [
  { icon: LayoutGrid, label: 'Ứng dụng', shortLabel: 'Ứng dụng', path: APPS_PATH, group: SAFETY_GROUP },
  { icon: ShieldAlert, label: 'Vi phạm', shortLabel: 'Vi phạm', path: VIOLATIONS_PATH, group: SAFETY_GROUP },
];

/** KOL/MCN sidebar group of the profile pages (MCN: + "Quản lý KOL"). */
export const PROFILE_GROUP = 'Hồ sơ';

/** Profile overview ("Tổng quan hồ sơ") + "Thông tin hồ sơ" (identity + contact) + channel management (group "Hồ sơ"). */
function profileMenu(base: string, identityIcon: LucideIcon, group = PROFILE_GROUP): MenuItem[] {
  return [
    { icon: LayoutDashboard, label: 'Tổng quan hồ sơ', shortLabel: 'Tổng quan', path: `${base}/tong-quan`, group },
    { icon: identityIcon, label: 'Thông tin hồ sơ', shortLabel: 'Hồ sơ', path: `${base}/thong-tin`, group },
    { icon: MonitorPlay, label: 'Quản lý kênh', shortLabel: 'Kênh', path: `${base}/kenh`, group },
  ];
}

/** Brand sidebar groups: find KOLs ("Phát triển") · run campaigns ("Hoạt động"). */
export const BRAND_GROW_GROUP = 'Phát triển';
export const BRAND_ACTIVITY_GROUP = 'Hoạt động';
/** KOL/MCN sidebar groups: own campaigns, favourites and ratings · conversations, content and payments. */
export const ACTIVITY_GROUP = 'Hoạt động của tôi';
export const MANAGE_GROUP = 'Quản lý';
/** KOL/MCN "Chiến dịch của tôi" page (was /booking). The Sàn (/san) is not a menu item: it opens from the account menu. */
export const SUPPLIER_CAMPAIGNS_PATH = '/chien-dich-cua-toi';
/** Old path of the KOL/MCN page; redirects to SUPPLIER_CAMPAIGNS_PATH (query kept). */
export const LEGACY_SUPPLIER_BOOKING_PATH = '/booking';
/** KOL/MCN "Nội dung" (was "Bài đã đăng"): verified posts from bookings, each with "Hiện trên hồ sơ". */
export const PORTFOLIO_PATH = '/bai-da-dang';
/** KOL/MCN "Thanh toán" (was "Thu nhập"): record-only ledger of cash / product rewards (payment happens outside KOL Hub). */
export const EARNINGS_PATH = '/thu-nhap';
/** KOL/MCN "Đánh giá": ratings brands gave this account and ratings it gave brands (completed bookings). */
export const RATINGS_PATH = '/danh-gia';
const ACTIVITY_MENU: MenuItem[] = [
  { icon: Megaphone, label: 'Chiến dịch của tôi', shortLabel: 'Chiến dịch', path: SUPPLIER_CAMPAIGNS_PATH, group: ACTIVITY_GROUP },
  { icon: Heart, label: 'Chiến dịch yêu thích', shortLabel: 'Yêu thích', path: INTERESTED_PATH, group: ACTIVITY_GROUP },
  { icon: Star, label: 'Đánh giá', shortLabel: 'Đánh giá', path: RATINGS_PATH, group: ACTIVITY_GROUP },
];
const MANAGE_MENU: MenuItem[] = [
  { icon: MessagesSquare, label: 'Cuộc trò chuyện', shortLabel: 'Trò chuyện', path: MESSAGES_PATH, group: MANAGE_GROUP },
  { icon: Images, label: 'Nội dung', shortLabel: 'Nội dung', path: PORTFOLIO_PATH, group: MANAGE_GROUP },
  { icon: Wallet, label: 'Thanh toán', shortLabel: 'Thanh toán', path: EARNINGS_PATH, group: MANAGE_GROUP },
];

/** MCN only: KOLs the MCN's channels are assigned to (group "Hồ sơ MCN"). */
export const MCN_KOLS_PATH = '/ho-so-mcn/kol';
const MCN_KOLS_ITEM: MenuItem = { icon: Users, label: 'Quản lý KOL', shortLabel: 'KOL', path: MCN_KOLS_PATH, group: PROFILE_GROUP };

/**
 * 16–17 menu items do not fit a phone tab bar: 4 tabs (Tổng quan, Chiến dịch, Yêu thích, Ứng dụng) + "Thêm" with every
 * other menu item in sidebar (group) order.
 */
function creatorBottomNav(base: string, menu: MenuItem[]): BottomNavConfig {
  const items: BottomNavItem[] = [
    { icon: LayoutDashboard, label: 'Tổng quan', path: `${base}/tong-quan` },
    { icon: Megaphone, label: 'Chiến dịch', path: SUPPLIER_CAMPAIGNS_PATH },
    { icon: Heart, label: 'Yêu thích', path: INTERESTED_PATH },
    { icon: LayoutGrid, label: 'Ứng dụng', path: APPS_PATH },
  ];
  return { items, more: menu.map((m) => m.path).filter((p) => !items.some((i) => i.path === p)) };
}

/** Brand sidebar: Phát triển · Hoạt động · Kiểm duyệt · Hỗ trợ ("Tài khoản doanh nghiệp" is in the account menu). */
const BRAND_MENU: MenuItem[] = [
  { icon: Search, label: 'Tìm kiếm KOL', shortLabel: 'Tìm KOL', path: '/tim-kiem-kol', group: BRAND_GROW_GROUP },
  { icon: MonitorPlay, label: 'Danh sách kênh', shortLabel: 'Kênh', path: CHANNEL_DIRECTORY_PATH, group: BRAND_GROW_GROUP },
  { icon: BookMarked, label: 'Đã lưu', shortLabel: 'Đã lưu', path: '/danh-sach-da-luu', group: BRAND_GROW_GROUP },
  { icon: Megaphone, label: 'Quản lý chiến dịch', shortLabel: 'Chiến dịch', path: CAMPAIGNS_PATH, group: BRAND_ACTIVITY_GROUP },
  { icon: ClipboardCheck, label: 'Nội dung chiến dịch', shortLabel: 'Nội dung', path: BRAND_CONTENT_PATH, group: BRAND_ACTIVITY_GROUP },
  { icon: MessagesSquare, label: 'Cuộc trò chuyện', shortLabel: 'Trò chuyện', path: MESSAGES_PATH, group: BRAND_ACTIVITY_GROUP },
  { icon: LayoutGrid, label: 'Ứng dụng', shortLabel: 'Ứng dụng', path: APPS_PATH, group: SAFETY_GROUP },
  { icon: ShieldAlert, label: 'Vi phạm', shortLabel: 'Vi phạm', path: BRAND_VIOLATIONS_PATH, group: SAFETY_GROUP },
  ...SUPPORT_MENU,
];

/** KOL/MCN pages that are not menu items: KOL Safety pages, old paths, Thông báo, Câu hỏi của tôi, /ho-tro (redirect). */
const CREATOR_AREAS = [SAFETY_BASE, LEGACY_SAFETY_PATH, LEGACY_SUPPLIER_BOOKING_PATH, NOTIFICATIONS_PATH, MY_QUESTIONS_PATH, SUPPORT_PATH];

const KOL_MENU: MenuItem[] = [...profileMenu('/ho-so-kol', IdCard), ...ACTIVITY_MENU, ...MANAGE_MENU, ...SAFETY_MENU, ...SUPPORT_MENU];
const MCN_MENU: MenuItem[] = [...profileMenu('/ho-so-mcn', Building2), MCN_KOLS_ITEM, ...ACTIVITY_MENU, ...MANAGE_MENU, ...SAFETY_MENU, ...SUPPORT_MENU];

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
    menu: KOL_MENU,
    areas: ['/ho-so-kol', ...CREATOR_AREAS],
    bottomNav: creatorBottomNav('/ho-so-kol', KOL_MENU),
  },
  'kolhub.user.mcn': {
    label: 'Tổ chức/MCN',
    home: '/ho-so-mcn/tong-quan',
    menu: MCN_MENU,
    areas: ['/ho-so-mcn', ...CREATOR_AREAS],
    bottomNav: creatorBottomNav('/ho-so-mcn', MCN_MENU),
  },
  'kolhub.user.biz': {
    label: 'Nhãn hàng/Agency',
    home: '/tim-kiem-kol',
    menu: BRAND_MENU,
    areas: [NOTIFICATIONS_PATH, BIZ_ACCOUNT_PATH, SUPPORT_PATH],
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
  return [...menu.flatMap((m) => [m.path, ...(m.match ?? [])]), ...areas];
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
  '/danh-gia': 'Đánh giá Nhãn hàng dành cho bạn và đánh giá bạn gửi Nhãn hàng sau mỗi booking hoàn tất',
  '/tin-nhan': 'Trao đổi với đối tác theo từng booking',
  '/cau-hoi-cua-toi': 'Câu hỏi bạn đã gửi Nhãn hàng trên Sàn chiến dịch',
  '/thong-bao': 'Lời mời, đề xuất, duyệt nội dung, thanh toán và tin nhắn mới',
  '/tim-kiem-kol': 'Tìm KOL có kênh đã xác thực',
  '/chien-dich': 'Tạo chiến dịch, mời KOL/MCN, duyệt nội dung và theo dõi kết quả',
  '/danh-sach-kenh': 'Các kênh đã xác thực, tìm theo nền tảng và lĩnh vực',
  '/danh-sach-da-luu': 'Các KOL bạn đã lưu theo danh sách',
  '/noi-dung-chien-dich': 'Bản nháp chờ duyệt và bài đăng đã xác minh của mọi chiến dịch',
  '/tai-khoan-doanh-nghiep': 'Thông tin doanh nghiệp, email công ty và gói dịch vụ',
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
/** Signed-in pages that are not menu items (header bell; "Câu hỏi của tôi" linked from Liên hệ / Chiến dịch yêu thích). */
const AREA_TITLES: Record<string, string> = {
  [NOTIFICATIONS_PATH]: 'Thông báo',
  [MY_QUESTIONS_PATH]: 'Câu hỏi của tôi',
  [BIZ_ACCOUNT_PATH]: 'Tài khoản doanh nghiệp',
};

/** The three "Hỗ trợ" pages: own title for every role (the KOL/MCN menu labels are shorter). */
export const SUPPORT_PAGES: { path: string; label: string; title: string; description: string }[] = [
  { path: SUPPORT_GUIDE_PATH, label: 'Hướng dẫn', title: 'Hướng dẫn sử dụng', description: 'Các bước dùng KOL Hub, kèm đường dẫn tới đúng trang' },
  { path: SUPPORT_FAQ_PATH, label: 'FAQ', title: 'Câu hỏi thường gặp', description: 'Chiến dịch, thanh toán, phần thưởng sản phẩm, KOL Safety, MCN và vi phạm' },
  { path: SUPPORT_CONTACT_PATH, label: 'Liên hệ', title: 'Liên hệ hỗ trợ', description: 'Gửi yêu cầu hỗ trợ cho KOL Hub' },
];

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
  // The Sàn is its own public channel (no menu item): titled like before, group = the viewer's role.
  if (matches(p, MARKETPLACE_PATH))
    return { title: 'Sàn chiến dịch', group: ROLE_CONFIG[role && role !== 'kolhub.guest' ? role : 'kolhub.user.kol'].label, description: DESCRIPTIONS[MARKETPLACE_PATH] };
  const order = role ? [role, ...ROLE_KEYS.filter((r) => r !== role)] : ROLE_KEYS;
  const support = SUPPORT_PAGES.find((s) => matches(p, s.path));
  if (support) return { title: support.title, group: ROLE_CONFIG[role && role !== 'kolhub.guest' ? role : 'kolhub.user.kol'].label, description: support.description };
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
