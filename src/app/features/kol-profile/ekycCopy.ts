import type { ErrorCode } from '../../services';

/** Retry tips shown under each eKYC error (§7.4). */
export const EKYC_TIPS: Partial<Record<ErrorCode, string[]>> = {
  'KOLHUB-4101': ['Đặt CCCD trên nền tối, đủ sáng, không bị lóa.', 'Giữ máy thẳng, chụp đủ 4 góc thẻ.'],
  'KOLHUB-4102': ['Chỉ chấp nhận CCCD gắn chip còn hạn. Chưa hỗ trợ VNeID.'],
  'KOLHUB-4105': ['Nhìn thẳng camera, bỏ kính và khẩu trang.', 'Quay ở nơi đủ sáng.'],
  'KOLHUB-4106': ['Làm theo hướng dẫn trên màn hình, không dùng ảnh hoặc video có sẵn.'],
  'KOLHUB-4107': ['Mở cài đặt trình duyệt → Quyền truy cập camera → Cho phép, rồi thử lại.'],
  'KOLHUB-5101': ['Thử lại sau ít phút. Lần này không bị tính vào số lần thử.'],
};

const PDPD_PLEDGE =
  'Tôi đồng ý cho KOL Hub xử lý dữ liệu cá nhân để xét duyệt hồ sơ theo quy định về bảo vệ dữ liệu cá nhân.';

export const KOL_PLEDGES: string[] = [
  'Tôi cam đoan thông tin đã khai là chính xác và là của chính tôi.',
  'Tôi là chủ sở hữu hoặc người được uỷ quyền quản lý các kênh đã khai.',
  PDPD_PLEDGE,
];

export const MCN_PLEDGES: string[] = [
  'Tôi cam đoan thông tin tổ chức và giấy tờ đã tải lên là chính xác, còn hiệu lực.',
  'Tôi được tổ chức uỷ quyền đăng ký và quản lý tài khoản này.',
  PDPD_PLEDGE,
];
