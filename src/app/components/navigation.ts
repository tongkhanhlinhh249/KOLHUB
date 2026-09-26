import {
  Home,
  Search,
  Tv,
  ShieldAlert,
  BookMarked,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  path: string;
}

export const mainNavItems: NavItem[] = [
  { icon: Home, label: 'Tổng quan', shortLabel: 'Tổng quan', path: '/' },
  { icon: Search, label: 'Tìm kiếm Influencer', shortLabel: 'Tìm kiếm', path: '/influencers' },
  { icon: Tv, label: 'Danh sách kênh', shortLabel: 'Kênh', path: '/channels' },
  { icon: ShieldAlert, label: 'Danh sách vi phạm', shortLabel: 'Vi phạm', path: '/violations' },
];

export const secondaryNavItems: NavItem[] = [
  { icon: BookMarked, label: 'Đã lưu', shortLabel: 'Đã lưu', path: '/saved' },
  { icon: Settings, label: 'Cài đặt', shortLabel: 'Cài đặt', path: '/account' },
  { icon: HelpCircle, label: 'Hỗ trợ', shortLabel: 'Hỗ trợ', path: '/help' },
];

interface PageMeta {
  title: string;
  group: string;
  // Shown under the title in the topbar on desktop.
  description?: string;
}

const PAGE_META: Record<string, PageMeta> = {
  '/': { title: 'Tổng quan', group: 'Quản lý', description: 'Chỉ số tuân thủ và danh sách KOL/KOC nổi bật' },
  '/influencers': { title: 'Tìm kiếm Influencer', group: 'Quản lý', description: 'Tra cứu, đánh giá KOL/KOC theo nền tảng và lĩnh vực' },
  '/channels': { title: 'Danh sách kênh', group: 'Quản lý', description: 'Theo dõi các kênh và chỉ số tương tác' },
  '/violations': { title: 'Danh sách vi phạm', group: 'Quản lý', description: 'Quản lý và xử lý các vi phạm đã ghi nhận' },
  '/search': { title: 'Tìm kiếm', group: 'Quản lý' },
  '/saved': { title: 'Đã lưu', group: 'Tài khoản' },
  '/account': { title: 'Cài đặt', group: 'Tài khoản' },
  '/profile': { title: 'Thông tin cá nhân', group: 'Tài khoản' },
  '/email-settings': { title: 'Cài đặt Email', group: 'Tài khoản' },
  '/notifications': { title: 'Thông báo', group: 'Tài khoản' },
  '/help': { title: 'Hỗ trợ', group: 'Tài khoản' },
};

export function getPageMeta(pathname: string): PageMeta {
  return PAGE_META[pathname] ?? { title: 'Antifluence', group: 'Quản lý' };
}
