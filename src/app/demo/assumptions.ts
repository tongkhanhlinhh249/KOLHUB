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
    decision: 'Nhóm "Kiểm duyệt (KOL Safety)": kiểm tra video trước khi đăng + kiểm duyệt kênh TikTok/Facebook/Instagram/YouTube (kết quả mô phỏng)',
  },
  {
    question: 'Danh sách vi phạm cho Nhãn hàng',
    decision:
      'Nhãn hàng xem được vi phạm đã xác nhận — ngoại lệ BR-58, cần khách xác nhận. Chỉ hiện vi phạm Đã xác nhận/Đã khắc phục của KOL đã duyệt; không hiện ghi chú, khiếu nại, báo cáo đang chờ hay đã bác bỏ',
  },
  {
    question: 'Vòng đời vi phạm',
    decision:
      'Báo cáo/KOL Safety → Chờ xác minh → Admin xác nhận hoặc bác bỏ (có lý do); chủ kênh khắc phục hoặc khiếu nại 1 lần (≥ 20 ký tự); Admin chấp nhận (bác bỏ vi phạm) hoặc từ chối (chỉ còn khắc phục)',
  },
  { question: '2, 3, 4, 8, 10', decision: 'Không ảnh hưởng prototype (nhà cung cấp, API, đa tài khoản)' },
];

/** Phase-3 (Nhãn hàng/Agency) decisions not already covered by ASSUMPTIONS above. */
export const PHASE_3_ASSUMPTIONS = [
  'Quy mô tính theo tổng người theo dõi của các kênh còn dấu: Nano < 10K · Micro 10K–100K · Mid 100K–500K · Macro 500K–1M · Mega ≥ 1M.',
  'Danh sách kênh: mỗi kênh đã xác thực (còn dấu, đang hoạt động, KOL đã duyệt) là một dòng; quy mô tính theo người theo dõi của chính kênh đó; kênh của MCN không hiện.',
  'Chỉ lưu được KOL đang hiện trong tìm kiếm; KOL đã lưu rồi mất dấu vẫn ở lại danh sách (BR-62).',
];
