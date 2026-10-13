// "Dữ liệu" mode of Tài liệu nghiệp vụ: data dictionary of a Campaign (services/campaign-types.ts › Campaign), with
// the validation of mock/campaignRules.ts / recruitment.ts and the label each surface uses for the field
// (null = not shown there). Keep in sync with the form (CampaignFormPage, FeatureCards), the Sàn detail
// (CampaignDetailBody), the KOL/MCN booking detail (BookingDetailSheet) and the brand detail (CampaignTabs).

export type SurfaceKey = 'form' | 'san' | 'supplier' | 'brand';

export const SURFACES: { key: SurfaceKey; short: string; label: string }[] = [
  { key: 'form', short: 'Form', label: 'Tạo / Sửa chiến dịch' },
  { key: 'san', short: 'Sàn', label: 'Chi tiết chiến dịch trên Sàn' },
  { key: 'supplier', short: 'KOL/MCN', label: 'Chi tiết booking của KOL/MCN' },
  { key: 'brand', short: 'Nhãn hàng', label: 'Chi tiết chiến dịch của Nhãn hàng' },
];

export interface DataField {
  /** Field path in Campaign. */
  key: string;
  /** Display name (form label). */
  label: string;
  type: string;
  /** When it is required (draft / publish). */
  required: string;
  rules: string;
  note?: string;
  /** Label used on each surface; null = not shown. */
  shown: Record<SurfaceKey, string | null>;
}

export interface DataGroup {
  group: string;
  description?: string;
  fields: DataField[];
}

const all = (label: string): Record<SurfaceKey, string> => ({ form: label, san: label, supplier: label, brand: label });

export const CAMPAIGN_DATA: DataGroup[] = [
  {
    group: 'Thông tin chung',
    fields: [
      {
        key: 'name',
        label: 'Tên chiến dịch',
        type: 'string',
        required: 'Bắt buộc cả khi lưu nháp',
        rules: '1–150 ký tự, gộp khoảng trắng thừa.',
        shown: { form: 'Ô tên lớn "Hãy đặt tên cho chiến dịch"', san: 'Tiêu đề trang', supplier: 'Tiêu đề', brand: 'Tiêu đề' },
      },
      {
        key: 'type',
        label: 'Loại chiến dịch',
        type: "'BOOKING' | 'OPEN_RECRUITMENT'",
        required: 'Mặc định BOOKING',
        rules: '"Booking 1 KOL" / "Booking nhiều KOL". Không đổi được khi chiến dịch đã có booking (4803 type).',
        shown: all('Nhãn "Booking 1 KOL" / "Booking nhiều KOL"'),
      },
      {
        key: 'cover',
        label: 'Ảnh chiến dịch',
        type: 'StoredFile { name, type, size, thumbnail }',
        required: 'Không bắt buộc',
        rules: 'JPG, PNG hoặc WebP, tối đa 10 MB; ảnh thu nhỏ cạnh dài ≤ 960 px; nên ảnh ngang 16:9. null = xoá ảnh.',
        shown: { form: 'Ảnh chiến dịch', san: 'Ảnh đầu trang', supplier: 'Ảnh thu nhỏ', brand: 'Ảnh thu nhỏ' },
      },
      {
        key: 'visibility',
        label: 'Hiển thị',
        type: "'PRIVATE' | 'MARKETPLACE'",
        required: 'Mặc định PRIVATE',
        rules: '"Riêng tư" (chỉ người được mời thấy) / "Trên Sàn chiến dịch". Booking nhiều KOL luôn MARKETPLACE.',
        shown: { form: 'Hiển thị', san: null, supplier: null, brand: 'Hiển thị' },
        note: 'Sàn chỉ có chiến dịch MARKETPLACE nên không cần ghi. Chi tiết booking dùng nó để chỉ hiện "Hạn ứng tuyển" với chiến dịch trên Sàn.',
      },
      {
        key: 'status',
        label: 'Trạng thái',
        type: "'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_FIX' | 'REJECTED' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'",
        required: 'Hệ thống đặt',
        rules: 'Bản nháp → Đang mở (đăng) → Đang chạy (booking đầu tiên được chốt) → Hoàn tất (Nhãn hàng đóng); Đã huỷ từ Nháp/Đang mở/Đang chạy.',
        shown: { form: 'Nhãn trạng thái (khi sửa)', san: null, supplier: '"Chiến dịch: <trạng thái>" khi đã Hoàn tất / Đã huỷ', brand: 'Nhãn trạng thái' },
        note: 'Sàn hiện nhãn giai đoạn / hạn ("D-n", "Đã đóng") thay cho trạng thái.',
      },
    ],
  },
  {
    group: 'Bản tóm tắt sáng tạo',
    description: 'Thẻ luôn bật trong "Tính năng của chiến dịch".',
    fields: [
      {
        key: 'objective',
        label: 'Mục tiêu',
        type: 'string',
        required: 'Không bắt buộc',
        rules: 'Tối đa 5.000 ký tự.',
        shown: { form: 'Bản tóm tắt sáng tạo › Mục tiêu', san: 'Bản tóm tắt sáng tạo › Mục tiêu', supplier: 'Chiến dịch › Mục tiêu', brand: 'Mục tiêu' },
      },
      {
        key: 'brief',
        label: 'Brief',
        type: 'string',
        required: 'Không bắt buộc (nhãn "Cần thiết lập" khi trống)',
        rules: 'Tối đa 5.000 ký tự.',
        shown: { form: 'Bản tóm tắt sáng tạo › Brief', san: 'Bản tóm tắt sáng tạo › Brief', supplier: 'Chiến dịch › Brief', brand: 'Brief' },
      },
    ],
  },
  {
    group: 'Ngân sách và thời gian',
    description: 'Booking 1 KOL nhập tay; Booking nhiều KOL tự tính từ số suất, phần thưởng và lịch.',
    fields: [
      {
        key: 'budget',
        label: 'Ngân sách / Tổng ngân sách dự kiến',
        type: 'number (VND, nguyên)',
        required: 'Khi đăng: > 0',
        rules: 'Tự tính. Booking 1 KOL: Σ nhóm (số suất × (thù lao + giá trị sản phẩm)). Booking nhiều KOL: số suất × (tiền mặt + giá trị quà).',
        shown: { form: 'Ngân sách dự kiến (tự tính)', san: 'Ngân sách / Tổng ngân sách dự kiến', supplier: null, brand: 'Ngân sách / Tổng ngân sách dự kiến (N suất)' },
        note: 'KOL/MCN thấy thù lao cố định của booking mình ("Thù lao cố định") thay cho ngân sách chiến dịch.',
      },
      {
        key: 'startDate · endDate',
        label: 'Thời gian chạy',
        type: "'YYYY-MM-DD' (ngày địa phương)",
        required: 'Khi đăng',
        rules: 'Ngày bắt đầu ≤ ngày kết thúc; ngày kết thúc chưa qua (tính cuối ngày). Booking nhiều KOL: = ngày đầu Ứng tuyển / ngày cuối Đánh giá.',
        shown: all('Thời gian chạy'),
      },
      {
        key: 'applyDeadline',
        label: 'Hạn ứng tuyển',
        type: "'YYYY-MM-DD' | null",
        required: 'Không bắt buộc (chỉ chiến dịch trên Sàn)',
        rules: '≤ ngày kết thúc và chưa qua. Trống = nhận tới khi kết thúc. Booking nhiều KOL: = ngày cuối Ứng tuyển. Lời mời/đề xuất hết hạn ở min(7 ngày, cuối ngày này).',
        shown: { form: 'Hạn ứng tuyển', san: 'Hạn ứng tuyển', supplier: 'Hạn ứng tuyển (chiến dịch trên Sàn)', brand: 'Hạn ứng tuyển' },
      },
    ],
  },
  {
    group: 'Nền tảng và hạng mục',
    fields: [
      {
        key: 'platforms',
        label: 'Nền tảng',
        type: "('tiktok' | 'youtube' | 'facebook' | 'instagram')[]",
        required: 'Khi đăng: ≥ 1',
        rules: 'TikTok, YouTube, Facebook, Instagram.',
        shown: { form: 'Nền tảng', san: 'Biểu tượng nền tảng ở đầu trang', supplier: 'Nền tảng', brand: 'Nền tảng' },
      },
      {
        key: 'categories',
        label: 'Lĩnh vực',
        type: 'KolCategory[]',
        required: 'Không bắt buộc',
        rules: '13 lĩnh vực (Giáo dục, Lifestyle, Du lịch, Ẩm thực, Làm đẹp, Thời trang, Công nghệ, Gaming, Thể thao, Giải trí, Gia đình, Tài chính, Khác). Dùng để tính mức phù hợp.',
        shown: { form: 'Lĩnh vực', san: 'Điều kiện tham gia › Lĩnh vực', supplier: 'Điều kiện tham gia › Lĩnh vực', brand: 'Điều kiện tham gia › Lĩnh vực' },
      },
      {
        key: 'deliverables',
        label: 'Hạng mục nội dung',
        type: "{ platform, type: 'VIDEO' | 'SHORTS' | 'REELS' | 'POST' | 'STORY' | 'LIVESTREAM', quantity }[]",
        required: 'Khi đăng: ≥ 1',
        rules: 'Chọn nền tảng trước, loại nội dung theo nền tảng: TikTok Video / Nhật ký; Facebook Bài đăng / Video / Reels / Story / Livestream; Instagram Bài đăng / Reels / Story / Livestream; YouTube Video / Shorts / Livestream (sai cặp → 4803 deliverables). Số lượng 1–100.',
        shown: { form: 'Hạng mục nội dung', san: 'Yêu cầu nội dung › Hạng mục nội dung', supplier: 'Hạng mục nội dung', brand: 'Hạng mục nội dung' },
      },
      {
        key: 'groups',
        label: 'Quyền lợi theo nhóm đầu việc',
        type: '{ platform, slots, reward: { cash, product? } }[]',
        required: 'Booking 1 KOL, khi đăng: mỗi nền tảng của hạng mục có 1 nhóm',
        rules: 'Số suất 1–1.000 (1 suất = 1 booking của 1 kênh trong nhóm); thù lao VND/booking > 0 hoặc có sản phẩm (tên + giá trị > 0). Không khoảng giá, không báo giá (4803 groups). Giá booking = Σ thù lao theo kênh × nhóm; chốt vượt số suất → 4818.',
        shown: { form: 'Quyền lợi theo nhóm đầu việc', san: 'Phần thưởng (nền tảng · số suất · thù lao / kênh)', supplier: 'Thù lao cố định', brand: 'Thù lao cố định' },
      },
    ],
  },
  {
    group: 'Booking nhiều KOL',
    description: 'Khối recruitment, chỉ có khi loại = Booking nhiều KOL.',
    fields: [
      {
        key: 'recruitment.slots',
        label: 'Số KOL cần tuyển',
        type: 'number',
        required: 'Khi đăng',
        rules: '1–500; khi sửa không nhỏ hơn số đã chọn (4803 slots).',
        shown: { form: 'Số KOL cần tuyển', san: 'Đã ứng tuyển · Đã chọn X / N suất', supplier: null, brand: 'Đã chọn X/N suất' },
      },
      {
        key: 'recruitment.reward.cash',
        label: 'Tiền mặt mỗi KOL',
        type: 'number (VND, ≥ 0)',
        required: 'Thẻ "Đề nghị trả phí"; cần tiền > 0 hoặc có quà',
        rules: 'Tắt thẻ = 0. Là giá của booking khi được chọn.',
        shown: { form: 'Đề nghị trả phí › Tiền mặt mỗi KOL', san: 'Phần thưởng / KOL', supplier: 'Phần thưởng', brand: 'Phần thưởng' },
      },
      {
        key: 'recruitment.reward.product',
        label: 'Sản phẩm tặng',
        type: '{ name, value, note? }',
        required: 'Thẻ "Tặng quà" (chỉ Booking nhiều KOL)',
        rules: 'Tên ≤ 150 ký tự, giá trị > 0, ghi chú ≤ 500. Người ứng tuyển phải nhập địa chỉ nhận hàng.',
        shown: { form: 'Tặng quà', san: 'Phần thưởng › Sản phẩm tặng', supplier: 'Sản phẩm tặng (kèm ghi chú)', brand: 'Phần thưởng › Sản phẩm tặng' },
      },
      {
        key: 'recruitment.timeline',
        label: 'Lịch trình 4 giai đoạn',
        type: '8 ngày applyStart … reviewEnd',
        required: 'Khi đăng: đủ 8 ngày',
        rules: 'Ứng tuyển ≤ < Chọn lọc ≤ < Đăng bài ≤ < Đánh giá, không chồng nhau; ngày cuối Ứng tuyển và Đánh giá chưa qua. Gợi ý 7 · 3 · 15 · 6 ngày.',
        shown: { form: 'Lịch trình 4 giai đoạn', san: 'Lịch trình', supplier: 'Lịch trình', brand: 'Lịch trình' },
      },
    ],
  },
  {
    group: 'Tính năng (bật/tắt)',
    description: 'Thẻ trong "Tính năng của chiến dịch"; tắt thẻ thì phần đó không áp dụng.',
    fields: [
      {
        key: 'draftReview',
        label: 'Duyệt nháp',
        type: 'boolean (thiếu = bật)',
        required: '—',
        rules: 'Tắt = KOL/MCN đăng thẳng rồi gửi link, không qua bước nháp.',
        shown: { form: 'Duyệt nháp', san: 'Workflow', supplier: 'Workflow', brand: 'Workflow · Tính năng › Duyệt nháp' },
      },
      {
        key: 'contract',
        label: 'Hợp đồng',
        type: 'boolean (thiếu = bật)',
        required: '—',
        rules: 'Tắt = không có điều khoản ứng tuyển, không đính kèm được tệp hợp đồng (tệp đã có vẫn xem được).',
        shown: { form: 'Hợp đồng', san: 'Hợp đồng', supplier: 'Hợp đồng', brand: 'Tính năng › Hợp đồng' },
      },
      {
        key: 'contentRules',
        label: 'Quy định nội dung',
        type: 'string',
        required: 'Thẻ "Sự tuân thủ"; rỗng = tắt',
        rules: 'Tối đa 5.000 ký tự (hashtag, ghi nhãn quảng cáo, nội dung không được dùng…).',
        shown: { form: 'Sự tuân thủ › Quy định nội dung', san: 'Yêu cầu nội dung › Quy định nội dung', supplier: 'Quy định nội dung', brand: 'Quy định nội dung' },
      },
    ],
  },
  {
    group: 'Điều kiện và ứng tuyển',
    fields: [
      {
        key: 'regions',
        label: 'Khu vực',
        type: 'string[]',
        required: 'Thẻ "Điều kiện tham gia"; rỗng = Toàn quốc',
        rules: 'Trong 34 tỉnh/thành.',
        shown: { form: 'Điều kiện tham gia › Khu vực', san: 'Khu vực', supplier: 'Điều kiện tham gia › Khu vực', brand: 'Điều kiện tham gia › Khu vực' },
      },
      {
        key: 'target',
        label: 'Điều kiện tham gia',
        type: "{ ageMin?, ageMax?, gender?: 'ANY' | 'FEMALE' | 'MALE', minFollowers? } | null",
        required: 'Thẻ "Điều kiện tham gia"',
        rules: 'Tuổi 16–80, "từ" ≤ "đến"; người theo dõi tối thiểu ≥ 0. Chỉ để hiển thị, chưa chặn ứng tuyển.',
        shown: all('Điều kiện tham gia'),
      },
      {
        key: 'survey',
        label: 'Câu hỏi khảo sát',
        type: '{ id, text, required }[]',
        required: 'Thẻ "Câu hỏi khảo sát"',
        rules: 'Tối đa 10 câu, mỗi câu ≤ 300 ký tự; câu trả lời ≤ 1.000 ký tự, câu bắt buộc phải trả lời.',
        shown: { form: 'Câu hỏi khảo sát', san: 'Số câu hỏi (nội dung trong hộp Ứng tuyển)', supplier: 'Thông tin ứng tuyển của bạn (câu trả lời)', brand: 'Câu hỏi khảo sát và điều khoản' },
      },
      {
        key: 'terms',
        label: 'Điều khoản',
        type: '{ id, text }[]',
        required: 'Thẻ "Hợp đồng"',
        rules: 'Tối đa 10, mỗi điều ≤ 300 ký tự; người ứng tuyển phải đồng ý tất cả. Chiến dịch mới có sẵn 2 điều khoản.',
        shown: { form: 'Hợp đồng › Điều khoản', san: 'Số điều khoản (nội dung trong hộp Ứng tuyển)', supplier: 'Đã đồng ý N điều khoản', brand: 'Câu hỏi khảo sát và điều khoản' },
      },
    ],
  },
  {
    group: 'Hệ thống',
    description: 'Do hệ thống ghi, người dùng không nhập.',
    fields: [
      {
        key: 'id · brandAccountId',
        label: 'Mã chiến dịch · tài khoản Nhãn hàng',
        type: 'string',
        required: 'Hệ thống',
        rules: 'brandAccountId không trả ra Sàn; KOL/MCN chỉ thấy tên công ty.',
        shown: { form: null, san: 'Tên công ty + khối "Nhãn hàng"', supplier: 'Tên công ty · người liên hệ', brand: null },
      },
      {
        key: 'publishedAt · closedAt',
        label: 'Ngày đăng · ngày đóng',
        type: 'epoch ms',
        required: 'Hệ thống',
        rules: 'publishedAt = lần đầu Đang mở (dùng để sắp xếp "Mới nhất"); closedAt = lúc Hoàn tất / Đã huỷ.',
        shown: { form: null, san: null, supplier: null, brand: null },
        note: 'Chưa màn hình nào hiện ngày đăng.',
      },
      {
        key: 'applicationCount · selectedCount',
        label: 'Số đề xuất · số đã chọn',
        type: 'number (tính khi đọc)',
        required: 'Hệ thống',
        rules: 'applicationCount = đề xuất ứng tuyển đang chiếm chỗ. selectedCount = đơn Booking nhiều KOL đã được chọn (đang làm hoặc hoàn tất).',
        shown: { form: null, san: 'Đề xuất đã nhận / Đã ứng tuyển · Đã chọn', supplier: null, brand: 'Đã chọn X/N suất · số trên tab' },
        note: '"Đã chọn" phía Nhãn hàng đếm mọi booking đang làm + hoàn tất, phía Sàn chỉ đếm đơn ứng tuyển — có thể lệch nếu có booking khác.',
      },
    ],
  },
];
