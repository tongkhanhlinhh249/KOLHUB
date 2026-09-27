import type { ErrorCode, KolhubErrorMeta } from './types';

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
