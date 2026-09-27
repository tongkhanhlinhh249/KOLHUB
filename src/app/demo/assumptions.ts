/** Temporary decisions for the open questions (design spec §6), shown for client confirmation. */
export const ASSUMPTIONS: { question: string; decision: string }[] = [
  { question: '1. Tiền tố mã lỗi', decision: 'KOLHUB-xxxx' },
  { question: '5. Họ tên CCCD khác hồ sơ', decision: 'Hiện cả 2 lựa chọn theo UC-07 3a' },
  {
    question: '6. Kênh INACTIVE / sửa kênh có dấu',
    decision:
      'INACTIVE giữ dấu nhưng ẩn khỏi tìm kiếm; sửa link/ảnh kênh có dấu → dấu tạm ngừng, kênh về PENDING_REVIEW',
  },
  { question: '7. KOL ẩn khỏi tìm kiếm / email hợp tác', decision: 'Không có tuỳ chọn ẩn; email hợp tác luôn hiện' },
  { question: '9. Phân trang / giới hạn / xuất Excel', decision: '20/trang; không giới hạn danh sách; không xuất Excel' },
  { question: 'BR-55 lọc "thuộc MCN"', decision: 'Ẩn, vì liên kết KOL–MCN ngoài phạm vi' },
  {
    question: 'KOL Safety trong menu',
    decision: 'Nhóm "Kiểm duyệt (KOL Safety)": kiểm tra video trước khi đăng + kiểm duyệt kênh TikTok/Facebook/YouTube (kết quả mô phỏng)',
  },
  { question: '2, 3, 4, 8, 10', decision: 'Không ảnh hưởng prototype (nhà cung cấp, API, đa tài khoản)' },
];
