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
  /** Demo panel tab showing this group. */
  tab: 'biz' | 'kol' | 'mcn';
  links: DemoLink[];
}

/** Shortcuts for a live demo, grouped by role (paths use the seeded demo data). */
export const DEMO_LINK_GROUPS: DemoLinkGroup[] = [
  {
    title: 'Nhãn hàng / Agency',
    tab: 'biz',
    links: [
      { label: 'Tìm kiếm KOL', path: '/tim-kiem-kol', account: 'biz-verified', hint: 'Lọc, xem hồ sơ, mời vào chiến dịch' },
      { label: 'Hồ sơ KOL có Bài đã đăng', path: '/tim-kiem-kol?kol=KOL-2026-0001', account: 'biz-verified', hint: 'Khánh Vy: mục Bài đã đăng trong Chi tiết' },
      { label: 'Chiến dịch đang chạy', path: '/chien-dich/cmp-seed-sua-hat?tab=hop-tac&muc=noi-dung', account: 'biz-verified', hint: 'Duyệt nội dung có KOL Safety' },
      { label: 'Tạo chiến dịch', path: '/chien-dich/tao', account: 'biz-verified', hint: 'Booking 1 KOL hoặc Booking nhiều KOL' },
      {
        label: 'Chọn ứng viên (Booking nhiều KOL)',
        path: '/chien-dich/cmp-seed-tuyen-chon?tab=ung-vien',
        account: 'biz-verified',
        hint: 'Giai đoạn Chọn lọc: chọn hàng loạt trong giới hạn suất',
      },
      { label: 'Sàn chiến dịch (góc nhìn Nhãn hàng)', path: '/san', account: 'biz-verified', hint: 'Chỉ xem; chiến dịch của bạn có nhãn "Của bạn"' },
      { label: 'Tin nhắn với Sao Việt Media', path: '/tin-nhan?thread=bk-seed-review', account: 'biz-verified', hint: 'Một cuộc trò chuyện cho mỗi booking, có tin hệ thống' },
      { label: 'Thông báo', path: '/thong-bao', account: 'biz-verified', hint: 'Đề xuất mới, bản nháp chờ duyệt, câu hỏi Hỏi đáp' },
      { label: 'Tài khoản & gói dịch vụ', path: '/tai-khoan-doanh-nghiep', account: 'biz-verified' },
    ],
  },
  {
    title: 'MCN',
    tab: 'mcn',
    links: [
      { label: 'Sàn chiến dịch', path: '/san', account: 'mcn-verified', hint: 'Phù hợp với bạn, ứng tuyển' },
      { label: 'Chiến dịch cần xử lý', path: '/chien-dich-cua-toi?tab=can-xu-ly', account: 'mcn-verified', hint: 'Nộp nháp, gửi link bài, xác nhận tiền' },
      { label: 'Quản lý KOL', path: '/ho-so-mcn/kol', account: 'mcn-verified', hint: 'Gán kênh cho KOL' },
      { label: 'Nội dung', path: '/bai-da-dang', account: 'mcn-verified', hint: 'Bài của các KOL thuộc MCN, bật/tắt Hiện trên hồ sơ' },
      { label: 'Thanh toán', path: '/thu-nhap', account: 'mcn-verified', hint: 'Theo tháng và theo KOL' },
      { label: 'Cuộc trò chuyện với Nhãn hàng', path: '/tin-nhan?thread=bk-seed-review', account: 'mcn-verified', hint: 'Trao đổi về bản nháp đang chờ duyệt' },
      { label: 'Chiến dịch yêu thích', path: '/chien-dich-da-luu', account: 'mcn-verified', hint: 'Đã lưu (còn nhận / đã đóng) và Đã ứng tuyển' },
      { label: 'Đánh giá', path: '/danh-gia', account: 'mcn-verified', hint: 'Đánh giá theo từng KOL, 2 booking chờ bạn đánh giá' },
      { label: 'Tổng quan hồ sơ MCN', path: '/ho-so-mcn/tong-quan', account: 'mcn-verified' },
    ],
  },
  {
    title: 'KOL',
    tab: 'kol',
    links: [
      { label: 'Tổng quan hồ sơ (đã xác thực)', path: '/ho-so-kol/tong-quan', account: 'kol-verified', hint: 'Giai đoạn chiến dịch, việc cần làm, đã lưu' },
      {
        label: 'Trang chiến dịch trên Sàn',
        path: '/san/cmp-seed-du-lich',
        account: 'kol-verified',
        hint: 'Chi tiết đầy đủ, Khớp %, lưu và ứng tuyển; chia sẻ được đường dẫn',
      },
      { label: 'Nội dung', path: '/bai-da-dang', account: 'kol-verified', hint: 'Số liệu, đánh giá, Hiện trên hồ sơ' },
      { label: 'Thanh toán', path: '/thu-nhap', account: 'kol-verified', hint: 'Đã nhận, đang chờ, giá trị sản phẩm' },
      {
        label: 'KOL Safety – tổng hợp 30 nội dung',
        path: '/kiem-duyet/kol-safety',
        account: 'kol-verified',
        hint: 'Điểm an toàn kênh, vấn đề theo danh mục, quét lại, xuất CSV',
      },
      { label: 'Lời mời hợp tác', path: '/chien-dich-cua-toi', account: 'kol-verified', hint: 'Lời mời gửi thẳng tới KOL lẻ' },
      {
        label: 'Đã được chọn (Booking nhiều KOL)',
        path: '/chien-dich-cua-toi?booking=bk-seed-rc-khanhvy',
        account: 'kol-verified',
        hint: 'Xác nhận đã nhận sản phẩm, đăng bài trực tiếp',
      },
      { label: 'Cuộc trò chuyện (2 tin chưa đọc)', path: '/tin-nhan?thread=bk-seed-khanhvy', account: 'kol-verified', hint: 'Nhãn hàng nhắn kèm link ảnh sản phẩm' },
      { label: 'Thông báo', path: '/thong-bao', account: 'kol-verified', hint: 'Lời mời mới, sản phẩm đã gửi, tin nhắn' },
      { label: 'Câu hỏi của tôi', path: '/cau-hoi-cua-toi', account: 'kol-verified', hint: 'Câu hỏi trên Sàn và câu trả lời của Nhãn hàng' },
      { label: 'Hỗ trợ › Hướng dẫn', path: '/ho-tro/huong-dan', account: 'kol-verified', hint: 'Hướng dẫn 6 bước; FAQ và Liên hệ ở mục Hỗ trợ' },
      { label: 'Đánh giá', path: '/danh-gia', account: 'kol-verified', hint: 'Nhãn hàng đánh giá bạn, Bạn đánh giá, Chờ bạn đánh giá' },
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
