import type { ErrorCode, KolhubErrorMeta } from './types';
// --- phase 2 ---
import { format } from 'date-fns';

function attempts(meta?: KolhubErrorMeta): string {
  return meta?.attemptsLeft !== undefined ? ` Còn ${meta.attemptsLeft} lần thử.` : '';
}

function retryAfter(meta?: KolhubErrorMeta): string {
  const sec = meta?.retryAfterSec;
  if (sec === undefined) return '';
  if (sec < 60) return ` Thử lại sau ${sec} giây.`;
  return ` Thử lại sau ${Math.ceil(sec / 60)} phút.`;
}

/** Vietnamese user-facing message for a business error code (spec table 7.5). */
export function errorMessage(code: ErrorCode, meta?: KolhubErrorMeta): string {
  switch (code) {
    case 'KOLHUB-4001':
      return 'Số điện thoại này đã có tài khoản.';
    case 'KOLHUB-4002':
      return 'Email này đã có tài khoản.';
    case 'KOLHUB-4003':
      return 'Mật khẩu cần tối thiểu 8 ký tự, có cả chữ và số.';
    case 'KOLHUB-4004':
      return 'Mật khẩu nhập lại không khớp.';
    case 'KOLHUB-4005':
      return `Mã OTP không đúng.${attempts(meta)}`;
    case 'KOLHUB-4006':
      return 'Mã OTP đã hết hạn hoặc không còn hiệu lực. Vui lòng gửi lại mã.';
    case 'KOLHUB-4007':
      return `Bạn đã yêu cầu gửi mã quá nhiều lần.${retryAfter(meta)}`;
    case 'KOLHUB-4008':
      return 'Gửi tin nhắn SMS không thành công. Vui lòng thử lại.';
    case 'KOLHUB-4009':
      return 'Bạn đã nhập sai mã OTP 5 lần, mã đã bị huỷ. Vui lòng gửi lại mã mới.';
    case 'KOLHUB-4011':
      return `Email hoặc mật khẩu không đúng.${attempts(meta)}`;
    case 'KOLHUB-4012':
      return 'Tài khoản không tồn tại.';
    case 'KOLHUB-4013':
      return `Tài khoản tạm khoá do nhập sai mật khẩu 5 lần.${retryAfter(meta)}`;
    case 'KOLHUB-4014':
      return 'Tài khoản chưa xác nhận OTP. Vui lòng hoàn tất xác thực.';
    case 'KOLHUB-4015':
      return 'Nhãn hàng/Agency cần dùng email công ty, không dùng email miễn phí (Gmail, Yahoo, Outlook…).';
    // --- phase 3 ---
    case 'KOLHUB-4016':
      return 'Tính năng này chỉ dành cho tài khoản Nhãn hàng/Agency đã xác thực email công ty.';
    case 'KOLHUB-4017':
      return 'Email mới trùng với email công ty hiện tại.';
    case 'KOLHUB-4018':
      return `${bizFieldLabel(meta?.field)} không hợp lệ hoặc còn trống.`;
    case 'KOLHUB-4401':
      return 'Bạn đã có danh sách tên này. Vui lòng chọn tên khác.';
    case 'KOLHUB-4402':
      return 'Tên danh sách phải có từ 1 đến 100 ký tự.';
    case 'KOLHUB-4403':
      return 'Không tìm thấy danh sách.';
    case 'KOLHUB-4404':
      return 'Không tìm thấy KOL hoặc hồ sơ không còn hiển thị.';
    case 'KOLHUB-4405':
      return 'Ghi chú tối đa 500 ký tự.';
    case 'KOLHUB-4406':
      return 'Không tìm thấy kênh hoặc kênh không còn hiển thị.';
    // --- phase 2 ---
    default:
      return phase2Message(code, meta);
  }
}

// --- phase 3 ---
function bizFieldLabel(field?: string): string {
  switch (field) {
    case 'fullName':
      return 'Họ tên';
    case 'company':
      return 'Tên công ty';
    case 'email':
      return 'Email công ty';
    default:
      return 'Thông tin';
  }
}

// --- phase 2 ---
function lockTime(ms?: number): string {
  if (ms === undefined) return '';
  return format(ms, 'HH:mm dd/MM/yyyy');
}

function phase2Message(code: ErrorCode, meta?: KolhubErrorMeta): string {
  switch (code) {
    case 'KOLHUB-4101':
      return `Ảnh CCCD bị mờ hoặc lóa. Vui lòng chụp lại.${attempts(meta)}`;
    case 'KOLHUB-4102':
      return `CCCD đã hết hạn hoặc không gắn chip. Vui lòng dùng CCCD gắn chip còn hạn.${attempts(meta)}`;
    case 'KOLHUB-4103':
      return 'Họ tên trên CCCD khác với họ tên trong hồ sơ.';
    case 'KOLHUB-4104':
      return 'CCCD này đã được dùng cho một tài khoản khác.';
    case 'KOLHUB-4105':
      return `Khuôn mặt không khớp với ảnh trên CCCD. Vui lòng quay lại.${attempts(meta)}`;
    case 'KOLHUB-4106':
      return `Chưa xác nhận được người thật. Vui lòng quay lại theo hướng dẫn.${attempts(meta)}`;
    case 'KOLHUB-4107':
      return 'Trình duyệt chưa được cấp quyền camera.';
    case 'KOLHUB-4108':
      return `Bạn đã xác thực không thành công 5 lần trong 24 giờ. Vui lòng thử lại sau ${lockTime(meta?.lockedUntil)} hoặc liên hệ hỗ trợ.`;
    case 'KOLHUB-5101':
      return 'Dịch vụ xác thực đang bận. Vui lòng thử lại, lần này không bị tính.';
    case 'KOLHUB-4201':
      return `Link kênh này đã được đăng ký trên KOL Hub.${meta?.ownedByOther ? ' Chúng tôi đã ghi nhận để xử lý tranh chấp.' : ''}`;
    case 'KOLHUB-4202':
      return 'Chỉ hỗ trợ link kênh Facebook, YouTube hoặc TikTok.';
    case 'KOLHUB-4203':
      return 'Ảnh phải là JPG hoặc PNG, tối đa 10 MB.';
    case 'KOLHUB-4301':
      return 'File GCN phải là JPG, PNG hoặc PDF.';
    case 'KOLHUB-4302':
      return 'File GCN tối đa 10 MB.';
    case 'KOLHUB-4303':
      return 'Mã số doanh nghiệp này đã gắn với một MCN khác.';
    case 'KOLHUB-4304':
      return 'Doanh nghiệp đang tạm ngừng hoạt động, giải thể hoặc bị thu hồi giấy phép.';
    default:
      return safetyMessage(code, meta);
  }
}

// --- KOL Safety ---
function safetyMessage(code: ErrorCode, meta?: KolhubErrorMeta): string {
  const platform = meta?.platformLabel ?? 'mạng xã hội';
  switch (code) {
    case 'KOLHUB-4501':
      return 'Chỉ nhận video MP4, MOV hoặc WebM.';
    case 'KOLHUB-4502':
      return 'Video tối đa 500 MB.';
    case 'KOLHUB-4503':
      return 'Video tối đa 10 phút.';
    case 'KOLHUB-4504':
      return 'Video vi phạm chính sách nên không thể đăng. Hãy sửa theo các vấn đề đã nêu rồi kiểm tra lại.';
    case 'KOLHUB-4505':
      return `Vui lòng nhập @username hoặc link kênh ${platform} hợp lệ.`;
    case 'KOLHUB-4506':
      return `Link này không phải kênh ${platform}.`;
    case 'KOLHUB-4507':
      return 'Kênh này đã được kết nối.';
    case 'KOLHUB-4508':
      return 'Không tìm thấy video hoặc kênh. Có thể mục này đã bị xoá.';
    case 'KOLHUB-4509':
      return 'Video đang được kiểm tra, vui lòng đợi kết quả.';
    default:
      return violationMessage(code, meta);
  }
}

// --- violations ---
function violationMessage(code: ErrorCode, meta?: KolhubErrorMeta): string {
  switch (code) {
    case 'KOLHUB-4601':
      return 'Không tìm thấy vi phạm. Có thể mục này đã bị xoá.';
    case 'KOLHUB-4602':
      return 'Vi phạm không còn ở trạng thái cho phép thao tác này. Vui lòng tải lại.';
    case 'KOLHUB-4603':
      return 'Bạn không có quyền xử lý vi phạm này.';
    case 'KOLHUB-4604':
      return 'Vui lòng nhập lý do.';
    case 'KOLHUB-4605':
      return 'Lý do khiếu nại cần tối thiểu 20 ký tự.';
    case 'KOLHUB-4606':
      return 'Vi phạm này đã khiếu nại một lần. Bạn chỉ có thể khắc phục nội dung.';
    case 'KOLHUB-4607':
      return 'Vui lòng mô tả cách bạn đã khắc phục.';
    case 'KOLHUB-4608':
      return 'Bạn đã báo cáo nội dung này, đang chờ xác minh.';
    case 'KOLHUB-4609':
      return 'Mô tả vi phạm cần từ 20 đến 1000 ký tự.';
    case 'KOLHUB-4610':
      return 'Link nội dung không hợp lệ hoặc không thuộc nền tảng của kênh.';
    case 'KOLHUB-4611':
      return 'Không tìm thấy kênh. Có thể kênh đã bị gỡ khỏi danh sách.';
    case 'KOLHUB-4612':
      return 'Vui lòng chọn loại vi phạm.';
    default:
      return mcnKolMessage(code, meta);
  }
}

// --- MCN ↔ KOL ---
function mcnKolMessage(code: ErrorCode, meta?: KolhubErrorMeta): string {
  switch (code) {
    case 'KOLHUB-4701':
      return 'Không thể gán kênh khi hồ sơ MCN đang xét duyệt hoặc đã bị từ chối.';
    case 'KOLHUB-4702':
      return 'Không tìm thấy KOL đã được duyệt. Vui lòng chọn KOL khác.';
    case 'KOLHUB-4703':
      return 'Không tìm thấy kênh của MCN. Có thể kênh đã bị gỡ.';
    case 'KOLHUB-4704':
      return 'Vui lòng chọn ít nhất một kênh.';
    default:
      return campaignMessage(code, meta);
  }
}

// --- campaign booking (beta) ---
function campaignFieldLabel(field?: string): string {
  switch (field) {
    case 'name':
      return 'Tên chiến dịch';
    case 'objective':
      return 'Mục tiêu chiến dịch';
    case 'brief':
      return 'Brief';
    case 'budget':
      return 'Ngân sách';
    case 'dates':
      return 'Thời gian chạy';
    case 'platforms':
      return 'Nền tảng';
    case 'categories':
      return 'Lĩnh vực';
    case 'deliverables':
      return 'Hạng mục nội dung';
    case 'contentRules':
      return 'Quy định nội dung';
    case 'visibility':
      return 'Chế độ hiển thị';
    case 'applyDeadline':
      return 'Hạn nhận đề xuất';
    case 'note':
      return 'Ghi chú';
    case 'title':
      return 'Tiêu đề nội dung';
    case 'file':
      return 'Tệp hoặc link nội dung';
    case 'item':
      return 'Hạng mục của booking';
    case 'feedback':
      return 'Góp ý chỉnh sửa';
    case 'comment':
      return 'Nhận xét';
    case 'contractFile':
      return 'Tệp hợp đồng';
    default:
      return 'Thông tin';
  }
}

function campaignMessage(code: ErrorCode, meta?: KolhubErrorMeta): string {
  switch (code) {
    case 'KOLHUB-4801':
      return 'Không tìm thấy chiến dịch. Có thể chiến dịch đã bị huỷ hoặc không còn hiển thị.';
    case 'KOLHUB-4802':
      return 'Chiến dịch không còn ở trạng thái cho phép thao tác này. Vui lòng tải lại.';
    case 'KOLHUB-4803':
      return `${campaignFieldLabel(meta?.field)} không hợp lệ hoặc còn trống.`;
    case 'KOLHUB-4804':
      return 'Không tìm thấy booking. Có thể booking đã bị xoá hoặc bạn không có quyền xem.';
    case 'KOLHUB-4805':
      return 'Booking không còn ở trạng thái cho phép thao tác này. Vui lòng tải lại.';
    case 'KOLHUB-4806':
      return 'Tính năng này chỉ dành cho KOL/MCN có hồ sơ đã được duyệt.';
    case 'KOLHUB-4807':
      return 'Bạn đã có đề xuất hoặc lời mời đang hoạt động cho chiến dịch này.';
    case 'KOLHUB-4808':
      return 'Chiến dịch đã hết hạn nhận đề xuất.';
    case 'KOLHUB-4809':
      return 'KOL hoặc kênh không hợp lệ: kênh phải đã xác thực, đang hoạt động, thuộc nền tảng của chiến dịch và thuộc quyền quản lý của bạn.';
    case 'KOLHUB-4810':
      return 'Giá phải là số tiền lớn hơn 0 (VND).';
    case 'KOLHUB-4811':
      return 'Link bài đăng không hợp lệ hoặc không thuộc nền tảng đã chốt.';
    case 'KOLHUB-4812':
      return 'Vui lòng chọn ít nhất một KOL.';
    case 'KOLHUB-4813':
      return 'Không tìm thấy nội dung. Có thể nội dung đã được xử lý.';
    case 'KOLHUB-4814':
      return 'Vui lòng chọn từ 1 đến 5 sao.';
    case 'KOLHUB-4815':
      return 'Bạn đã đánh giá booking này.';
    case 'KOLHUB-4816':
      return 'Vui lòng nhập lý do huỷ.';
    case 'KOLHUB-4817':
      return 'Chiến dịch còn booking đang thực hiện. Hãy hoàn tất hoặc huỷ các booking đó trước.';
    default:
      return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}
