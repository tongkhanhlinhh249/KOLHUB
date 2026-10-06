// Content of "Hỗ trợ" (/ho-tro): step-by-step guide, FAQ and the support request topics. Placeholder contact only
// (no real phone number or email address).
import type { AccountType } from '../../services';

export interface GuideStep {
  title: string;
  text: string;
  /** In-app page for the step. */
  to?: string;
  cta?: string;
}

const creatorBase = (type: AccountType) => (type === 'MCN' ? '/ho-so-mcn' : '/ho-so-kol');

/** "Hướng dẫn sử dụng": KOL/MCN from connecting a channel to getting paid; brands from a brief to payment. */
export function guideSteps(type: AccountType): GuideStep[] {
  if (type === 'BIZ') {
    return [
      { title: 'Tìm KOL phù hợp', text: 'Lọc KOL có kênh đã xác thực theo lĩnh vực, nền tảng, lượt theo dõi; lưu vào danh sách.', to: '/tim-kiem-kol', cta: 'Tìm kiếm KOL' },
      { title: 'Tạo chiến dịch', text: 'Nhập brief, ngân sách, hạng mục nội dung. Chọn Booking riêng hoặc Tuyển nhiều KOL và đăng lên Sàn nếu muốn nhận đề xuất.', to: '/chien-dich/tao', cta: 'Tạo chiến dịch' },
      { title: 'Mời KOL hoặc chọn ứng viên', text: 'Gửi lời mời kèm giá, thương lượng; với Tuyển nhiều KOL, chọn ứng viên trong giai đoạn Chọn lọc.', to: '/chien-dich', cta: 'Chiến dịch của bạn' },
      { title: 'Duyệt nội dung', text: 'Xem bản nháp (kèm kết quả KOL Safety), duyệt hoặc yêu cầu chỉnh sửa. Trao đổi qua Tin nhắn của từng booking.', to: '/tin-nhan', cta: 'Tin nhắn' },
      { title: 'Xác minh bài đăng và thanh toán', text: 'Hệ thống xác minh link bài đăng và lấy số liệu. Bạn thanh toán ngoài KOL Hub rồi đánh dấu Đã thanh toán.' },
    ];
  }
  const base = creatorBase(type);
  return [
    { title: 'Kết nối kênh', text: 'Thêm kênh TikTok, YouTube hoặc Facebook kèm ảnh màn hình quản lý kênh để nhận dấu xác thực.', to: `${base}/kenh`, cta: 'Quản lý kênh' },
    {
      title: 'Xác thực hồ sơ',
      text: type === 'MCN' ? 'Điền thông tin tổ chức, Giấy chứng nhận ĐKDN, người liên hệ rồi gửi xét duyệt.' : 'Xác thực danh tính (eKYC), điền thông tin liên hệ rồi gửi hồ sơ xét duyệt.',
      to: `${base}/tong-quan`,
      cta: 'Tổng quan hồ sơ',
    },
    { title: 'Tìm chiến dịch trên Sàn', text: 'Lọc theo lĩnh vực, nền tảng, ngân sách; xem mức Khớp % với kênh của bạn và lưu chiến dịch quan tâm.', to: '/san', cta: 'Sàn chiến dịch' },
    { title: 'Ứng tuyển hoặc nhận lời mời', text: 'Gửi đề xuất ứng tuyển (giá, KOL, kênh) hoặc trả lời lời mời trong 7 ngày: nhận, đề xuất giá khác hay từ chối.', to: '/chien-dich-cua-toi', cta: 'Chiến dịch của tôi' },
    { title: 'Nộp nháp và đăng bài', text: 'Nộp bản nháp để Nhãn hàng duyệt (nếu chiến dịch yêu cầu), sau đó đăng bài và gửi link để hệ thống xác minh.', to: '/chien-dich-cua-toi?tab=dang-thuc-hien', cta: 'Việc đang thực hiện' },
    { title: 'Nhận thanh toán', text: 'Nhãn hàng thanh toán ngoài KOL Hub và đánh dấu đã trả; bạn xác nhận đã nhận để hoàn tất. Thu nhập được ghi lại theo tháng.', to: '/thu-nhap', cta: 'Thu nhập' },
  ];
}

export interface FaqItem {
  id: string;
  topic: 'Chiến dịch' | 'Thanh toán' | 'Sản phẩm' | 'KOL Safety' | 'MCN' | 'Vi phạm' | 'Tài khoản';
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    id: 'ung-tuyen',
    topic: 'Chiến dịch',
    q: 'Khi nào tôi ứng tuyển được chiến dịch trên Sàn?',
    a: 'Mọi KOL/MCN đã đăng nhập đều xem và lưu được chiến dịch. Để gửi đề xuất ứng tuyển hoặc nhận lời mời, hồ sơ của bạn cần được duyệt và có ít nhất một kênh đã xác thực thuộc nền tảng của chiến dịch.',
  },
  {
    id: 'loi-moi-het-han',
    topic: 'Chiến dịch',
    q: 'Lời mời hoặc đề xuất có thời hạn không?',
    a: 'Có. Lời mời và đề xuất chưa được trả lời sẽ hết hạn sau 7 ngày hoặc khi hết hạn nhận đề xuất của chiến dịch (tuỳ mốc nào đến trước). Bạn nhận thông báo khi lời mời còn dưới 48 giờ.',
  },
  {
    id: 'tuyen-nhieu',
    topic: 'Chiến dịch',
    q: '"Tuyển nhiều KOL" khác "Booking riêng" thế nào?',
    a: 'Tuyển nhiều KOL có phần thưởng cố định và lịch 4 giai đoạn (Ứng tuyển, Chọn lọc, Đăng bài, Đánh giá); Nhãn hàng chọn ứng viên trong giới hạn số suất, không thương lượng giá. Booking riêng là lời mời hoặc đề xuất có thể thương lượng giá.',
  },
  {
    id: 'thanh-toan',
    topic: 'Thanh toán',
    q: 'KOL Hub có giữ tiền hoặc chuyển tiền cho tôi không?',
    a: 'Không. Thanh toán diễn ra trực tiếp giữa Nhãn hàng và bạn theo thoả thuận, ngoài KOL Hub. KOL Hub chỉ ghi nhận: Nhãn hàng đánh dấu Đã thanh toán, bạn xác nhận Đã nhận để hoàn tất booking.',
  },
  {
    id: 'chua-nhan-tien',
    topic: 'Thanh toán',
    q: 'Nhãn hàng đã đánh dấu thanh toán nhưng tôi chưa nhận được tiền?',
    a: 'Đừng xác nhận Đã nhận. Hãy nhắn cho Nhãn hàng trong Tin nhắn của booking đó, kèm thông tin đối chiếu. Nếu không giải quyết được, gửi yêu cầu hỗ trợ ở cuối trang này.',
  },
  {
    id: 'san-pham',
    topic: 'Sản phẩm',
    q: 'Phần thưởng là sản phẩm được ghi nhận thế nào?',
    a: 'Nhãn hàng đánh dấu Đã gửi sản phẩm, bạn bấm Đã nhận sản phẩm khi nhận hàng. Giá trị sản phẩm được tính vào mục Giá trị sản phẩm trong Thu nhập, tách riêng với tiền mặt.',
  },
  {
    id: 'kol-safety',
    topic: 'KOL Safety',
    q: 'KOL Safety kiểm tra gì trong bản nháp?',
    a: 'Khi bạn nộp tệp video, KOL Safety quét các rủi ro nội dung (ví dụ ngôn từ, hình ảnh nhạy cảm) và gửi kết quả kèm bản nháp cho Nhãn hàng. Bạn cũng có thể tự kiểm tra trước trong Ứng dụng › KOL Safety.',
  },
  {
    id: 'mcn-dieu-phoi',
    topic: 'MCN',
    q: 'MCN nhận lời mời thay KOL như thế nào?',
    a: 'KOL đang phụ trách ít nhất một kênh của MCN đã duyệt sẽ được đặt qua MCN đó: lời mời chuyển về MCN. MCN chọn KOL và kênh cho từng hạng mục, thương lượng, nộp nội dung và nhận thanh toán thay KOL; KOL lẻ tự xử lý booking của mình.',
  },
  {
    id: 'vi-pham',
    topic: 'Vi phạm',
    q: 'Kênh của tôi bị ghi nhận vi phạm thì sao?',
    a: 'Vi phạm đã xác nhận hiển thị trong Danh sách vi phạm và Nhãn hàng có thể xem. Bạn có thể khắc phục nội dung hoặc gửi khiếu nại kèm giải thích ngay tại trang đó.',
  },
  {
    id: 'tin-nhan',
    topic: 'Tài khoản',
    q: 'Tôi có nhắn tin trực tiếp cho Nhãn hàng bất kỳ được không?',
    a: 'Không. Mỗi booking (lời mời hoặc đề xuất ứng tuyển) có một cuộc trò chuyện riêng giữa hai bên. Trước khi có booking, hãy dùng mục Hỏi đáp trên trang chiến dịch.',
  },
  {
    id: 'thong-bao',
    topic: 'Tài khoản',
    q: 'Tôi xem lại thông báo ở đâu?',
    a: 'Bấm biểu tượng chuông ở đầu trang để mở Thông báo: lời mời, kết quả chọn, duyệt nội dung, thanh toán, tin nhắn mới và câu trả lời Hỏi đáp. Bấm vào thông báo để mở đúng chỗ cần xử lý.',
  },
];

export const SUPPORT_TOPICS = ['Chiến dịch và booking', 'Thanh toán, thu nhập', 'Hồ sơ và xác thực kênh', 'Vi phạm, khiếu nại', 'Khác'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
export const SUPPORT_MESSAGE_MIN = 10;
export const SUPPORT_MESSAGE_MAX = 1000;

/** Request check: a known topic and 10–1000 characters; returns the trimmed text or an error message. */
export function checkSupportRequest(topic: string, message: string): { ok: true; text: string } | { ok: false; error: string } {
  if (!(SUPPORT_TOPICS as readonly string[]).includes(topic)) return { ok: false, error: 'Vui lòng chọn chủ đề.' };
  const text = message.normalize('NFC').trim();
  if ([...text].length < SUPPORT_MESSAGE_MIN) return { ok: false, error: `Vui lòng mô tả ít nhất ${SUPPORT_MESSAGE_MIN} ký tự.` };
  if ([...text].length > SUPPORT_MESSAGE_MAX) return { ok: false, error: `Nội dung tối đa ${SUPPORT_MESSAGE_MAX} ký tự.` };
  return { ok: true, text };
}
