import type { DemoAccountKey } from '../services';
import { SAFETY_TOOL_URL } from '../features/apps/safetyTool';

/** One demo shortcut: sign in as `account` (demo account) and open `path`. */
export interface DemoLink {
  label: string;
  path: string;
  account: Exclude<DemoAccountKey, 'guest'>;
  /** Short hint of what to show there. */
  hint?: string;
}

export interface DemoLinkGroup {
  title: string;
  links: DemoLink[];
}

/** Shortcuts for a live demo, grouped by role (paths use the seeded demo data). */
export const DEMO_LINK_GROUPS: DemoLinkGroup[] = [
  {
    title: 'Nhãn hàng / Agency',
    links: [
      { label: 'Tìm kiếm KOL', path: '/tim-kiem-kol', account: 'biz-verified', hint: 'Lọc, xem hồ sơ, mời vào chiến dịch' },
      { label: 'Chiến dịch đang chạy', path: '/chien-dich/cmp-seed-sua-hat?tab=noi-dung', account: 'biz-verified', hint: 'Duyệt nội dung có KOL Safety' },
      { label: 'Tạo chiến dịch', path: '/chien-dich/tao', account: 'biz-verified', hint: 'Brief, đăng lên Sàn' },
      { label: 'Tài khoản & gói dịch vụ', path: '/tai-khoan-doanh-nghiep', account: 'biz-verified' },
    ],
  },
  {
    title: 'MCN',
    links: [
      { label: 'Sàn chiến dịch', path: '/san-chien-dich', account: 'mcn-verified', hint: 'Phù hợp với bạn, ứng tuyển' },
      { label: 'Booking cần xử lý', path: '/booking?tab=can-xu-ly', account: 'mcn-verified', hint: 'Nộp nháp, gửi link bài, xác nhận tiền' },
      { label: 'Quản lý KOL', path: '/ho-so-mcn/kol', account: 'mcn-verified', hint: 'Gán kênh cho KOL' },
      { label: 'Tổng quan hồ sơ MCN', path: '/ho-so-mcn/tong-quan', account: 'mcn-verified' },
    ],
  },
  {
    title: 'KOL',
    links: [
      { label: 'Tổng quan hồ sơ (đã xác thực)', path: '/ho-so-kol/tong-quan', account: 'kol-verified' },
      { label: 'Lời mời hợp tác', path: '/booking', account: 'kol-verified', hint: 'Lời mời gửi thẳng tới KOL lẻ' },
      { label: 'Hồ sơ mới → gửi xét duyệt', path: '/ho-so-kol/tong-quan', account: 'kol-new', hint: 'Dùng "Điền nhanh hồ sơ mẫu"' },
    ],
  },
];

export interface ExternalDemoLink {
  label: string;
  href: string;
}

/** Links outside the app (open in a new tab). */
export const EXTERNAL_DEMO_LINKS: ExternalDemoLink[] = [
  { label: 'Link demo (Vercel)', href: 'https://kolhub-demo.vercel.app' },
  { label: 'Công cụ KOL Safety / Brand Safety', href: SAFETY_TOOL_URL },
  { label: 'Mã nguồn (GitLab)', href: 'https://gitlab.com/quynhkencv/kolhub' },
];
