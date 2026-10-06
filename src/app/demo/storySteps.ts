// Plain-language view of the user stories ("Dễ hiểu" mode of Tài liệu nghiệp vụ): for every story, one summary line
// and a short checklist per screen, in the order a person walks through them. No status codes, error codes or API
// names here — those stay in userStories.ts ("Cho dev" mode). Button and message texts are quoted as in the prototype.
import type { ReleaseKey } from './userStories';

export interface PlainStep {
  screen: string;
  checks: string[];
}

export interface PlainStory {
  title: string;
  summary: string;
  steps: PlainStep[];
}

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'Nhãn hàng', meaning: 'Công ty hoặc agency thuê KOL làm nội dung.' },
  { term: 'KOL', meaning: 'Người làm nội dung, có kênh TikTok, YouTube hoặc Facebook.' },
  { term: 'MCN', meaning: 'Công ty quản lý nhiều KOL.' },
  { term: 'Sàn chiến dịch', meaning: 'Nơi đăng chiến dịch công khai để KOL/MCN vào xem và ứng tuyển.' },
  { term: 'Đề xuất', meaning: 'KOL/MCN tự xin tham gia một chiến dịch.' },
  { term: 'Lời mời', meaning: 'Nhãn hàng chủ động mời KOL tham gia.' },
  { term: 'Hợp tác (booking)', meaning: 'Một thoả thuận giữa Nhãn hàng và một KOL/MCN trong một chiến dịch.' },
  { term: 'Hạng mục', meaning: 'Việc cần làm, ví dụ "2 video TikTok".' },
  { term: 'Nháp', meaning: 'Bản nội dung gửi Nhãn hàng duyệt trước khi đăng thật.' },
];

export const RELEASE_PLAIN: Record<ReleaseKey, { name: string; goal: string }> = {
  R0: { name: 'Một vòng hoàn chỉnh', goal: 'Nhãn hàng đăng chiến dịch → KOL/MCN ứng tuyển → hai bên chốt → làm nội dung → đăng bài → thanh toán.' },
  R1: { name: 'Nhãn hàng mời KOL', goal: 'Nhãn hàng tự mời KOL; KOL/MCN nhận hoặc từ chối; có thông báo khi có việc mới.' },
  R2: { name: 'Trả giá và nhắn tin', goal: 'Hai bên trả giá qua lại, nhắn tin, huỷ khi có sự cố; Nhãn hàng tự đóng chiến dịch.' },
  R3: { name: 'Kiểm soát nội dung', goal: 'Sửa nháp nhiều lần, kiểm tra vi phạm, hợp đồng, số liệu bài đăng, điều kiện ứng tuyển.' },
  R4: { name: 'Sàn dễ tìm hơn', goal: 'Gợi ý chiến dịch hợp với bạn, tìm và lọc, lưu, hỏi đáp, ảnh bìa.' },
  R5: { name: 'Dùng hằng ngày', goal: 'Mở app là biết việc cần làm; theo dõi tiền, đánh giá và bài đã đăng.' },
  R6: { name: 'Tuyển nhiều KOL', goal: 'Một chiến dịch tuyển nhiều KOL với phần thưởng cố định, Nhãn hàng chọn người theo đợt.' },
};

export const STORY_STEPS: Record<string, PlainStory> = {
  // R0 — Một vòng hoàn chỉnh
  'R0-1': {
    title: 'Tạo và đăng chiến dịch',
    summary: 'Nhãn hàng tạo chiến dịch, lưu nháp, rồi đăng để KOL/MCN thấy.',
    steps: [
      { screen: 'Menu "Chiến dịch" → "Tạo chiến dịch"', checks: ['Gõ tên vào ô lớn "Hãy đặt tên cho chiến dịch" (tối đa 150 ký tự)', 'Chưa có tên thì chưa lưu được', 'Có thể lưu nháp ngay, các ô khác điền sau; lưu xong hiện "Đã lưu bản nháp"'] },
      {
        screen: 'Điền đủ để đăng',
        checks: [
          'Ngân sách lớn hơn 0',
          'Ngày bắt đầu không sau ngày kết thúc; ngày kết thúc chưa qua',
          'Chọn ít nhất 1 nền tảng: TikTok, YouTube hoặc Facebook',
          'Thêm ít nhất 1 hạng mục (Video, Bài đăng hoặc Livestream), số lượng 1–100',
          'Chọn "Đăng lên Sàn chiến dịch" hoặc "Riêng tư" (chỉ mời)',
        ],
      },
      { screen: 'Phần "Tính năng của chiến dịch"', checks: ['Bật/tắt từng phần cần dùng (xem R3-5)'] },
      { screen: 'Bấm "Đăng chiến dịch"', checks: ['Thiếu gì → báo đỏ ngay dưới ô đó và tự cuộn tới', 'Đủ → hiện "Đã đăng chiến dịch" và mở trang chiến dịch', 'Sau khi đăng vẫn sửa được ("Lưu thay đổi") nhưng phải giữ đủ thông tin'] },
    ],
  },
  'R0-2': {
    title: 'Xem chiến dịch trên Sàn',
    summary: 'KOL/MCN xem các chiến dịch đang tìm người trên Sàn.',
    steps: [
      { screen: 'Sàn chiến dịch', checks: ['Chỉ thấy chiến dịch còn nhận đề xuất, còn hạn', 'Mỗi thẻ có ảnh, tên, nhãn hàng, ngân sách, hạn ứng tuyển, nền tảng', 'Chiến dịch mới đăng nằm trên'] },
      { screen: 'Bấm một thẻ → trang chiến dịch', checks: ['Xem brief, yêu cầu nội dung, phần thưởng, điều kiện', 'Bên phải (điện thoại: dưới đáy) có thời gian, hạn và nút "Ứng tuyển"', 'Hồ sơ chưa được duyệt: chỉ xem và lưu, chưa ứng tuyển được'] },
      { screen: 'Chiến dịch đã ứng tuyển hoặc được mời', checks: ['Thẻ hiện "Đã ứng tuyển" hoặc "Đã được mời"', 'Có link "Xem booking của bạn"'] },
    ],
  },
  'R0-3': {
    title: 'Ứng tuyển chiến dịch',
    summary: 'KOL/MCN gửi đề xuất: ai làm, đăng ở kênh nào, làm gì, giá bao nhiêu.',
    steps: [
      { screen: 'Trang chiến dịch → nút "Ứng tuyển"', checks: ['Chỉ hiện khi hồ sơ đã được duyệt và chiến dịch còn hạn', 'Mỗi chiến dịch chỉ có 1 đề xuất đang chờ'] },
      {
        screen: 'Hộp "Ứng tuyển chiến dịch"',
        checks: [
          'MCN: chọn KOL mình quản lý và kênh đã giao cho KOL đó',
          'KOL: chọn kênh của mình (đã xác thực, đúng nền tảng)',
          'Thêm ít nhất 1 hạng mục, số lượng 1–100',
          'Nhập tổng giá (lớn hơn 0), lời nhắn nếu muốn',
          'Trả lời câu hỏi bắt buộc, tích đủ điều khoản',
        ],
      },
      { screen: 'Bấm "Gửi đề xuất"', checks: ['Thiếu hoặc sai → báo lỗi, chưa gửi', 'Thành công → "Đã gửi đề xuất ứng tuyển", chờ Nhãn hàng trả lời', 'Nhãn hàng không trả lời sau 7 ngày → đề xuất tự hết hạn'] },
    ],
  },
  'R0-4': {
    title: 'Nhãn hàng chốt hoặc từ chối đề xuất',
    summary: 'Nhãn hàng xem ai ứng tuyển rồi đồng ý hoặc từ chối.',
    steps: [
      { screen: 'Trang chiến dịch → tab "Ứng tuyển"', checks: ['Thấy từng đề xuất: ai gửi, giá, lời nhắn, còn bao lâu hết hạn', 'Bấm "Xem hồ sơ" để xem từng KOL trước khi quyết định'] },
      {
        screen: 'Bấm "Chấp nhận đề xuất"',
        checks: ['Hỏi lại "Chốt booking?" → bấm "Chốt booking"', 'Không chốt được nếu giá bằng 0 hoặc còn hạng mục chưa có kênh', 'Xong: "Đã chốt booking", KOL/MCN bắt đầu làm nội dung', 'Chiến dịch chuyển sang "Đang chạy"'],
      },
      { screen: 'Hoặc bấm "Từ chối"', checks: ['Có thể ghi lý do (không bắt buộc)', 'Đề xuất đóng lại, KOL/MCN được báo'] },
    ],
  },
  'R0-5': {
    title: 'Gửi nháp và duyệt nháp',
    summary: 'KOL/MCN gửi bản nháp, Nhãn hàng duyệt trước khi đăng thật.',
    steps: [
      {
        screen: 'KOL/MCN: Chiến dịch của tôi → mở hợp tác → "Nộp bản nháp"',
        checks: ['Đặt tiêu đề (tối đa 150 ký tự)', 'Tải video (tối đa 500 MB) hoặc ảnh (tối đa 20 MB), hoặc dán link xem trước', 'Chọn nháp này cho hạng mục nào (nếu cần)', 'Gửi xong: "Đã nộp bản nháp"'],
      },
      { screen: 'Nhãn hàng: trang chiến dịch → tab "Nội dung"', checks: ['Thấy các nháp đang chờ duyệt', 'Bấm "Duyệt" → "Đã duyệt nội dung"'] },
      { screen: 'Khi mọi hạng mục đều có nháp được duyệt', checks: ['KOL/MCN được đăng bài và gửi link', 'Chiến dịch tắt "Duyệt nháp" thì bỏ qua cả bước này'] },
    ],
  },
  'R0-6': {
    title: 'Gửi link bài đã đăng',
    summary: 'Đăng bài xong, KOL/MCN gửi link để hệ thống kiểm tra.',
    steps: [
      { screen: 'Chiến dịch của tôi → mở hợp tác → "Gửi link bài đăng"', checks: ['Chỉ bấm được sau khi nháp đã được duyệt (hoặc chiến dịch không cần duyệt nháp)', 'Dán link bài; nhiều hạng mục thì chọn hạng mục'] },
      { screen: 'Bấm "Gửi và xác minh"', checks: ['Link phải là TikTok, YouTube hoặc Facebook, đúng nền tảng đã chốt', 'Link sai → báo "Link bài đăng không hợp lệ hoặc không thuộc nền tảng đã chốt."', 'Đúng → "Bài đăng đã được xác minh", kèm lượt xem, thích…'] },
      { screen: 'Sau khi gửi', checks: ['Còn hạng mục chưa có bài → nhắc gửi tiếp', 'Đủ bài → chuyển sang chờ Nhãn hàng thanh toán'] },
    ],
  },
  'R0-7': {
    title: 'Thanh toán và hoàn tất',
    summary: 'Nhãn hàng trả tiền bên ngoài rồi đánh dấu; KOL/MCN xác nhận đã nhận.',
    steps: [
      { screen: 'Nhãn hàng: mở hợp tác → khối "Thanh toán"', checks: ['Trả tiền ngoài hệ thống (KOL Hub không giữ tiền)', 'Bấm "Đánh dấu đã thanh toán" → "Đã ghi nhận thanh toán"'] },
      { screen: 'KOL/MCN: Chiến dịch của tôi → mở hợp tác', checks: ['Bấm "Xác nhận đã nhận tiền"', 'Xong: "Booking đã hoàn tất"'] },
      { screen: 'Lưu ý', checks: ['Đã đánh dấu thanh toán thì không bên nào huỷ được nữa', 'Hợp tác không có tiền (chỉ tặng sản phẩm): Nhãn hàng bấm "Xác nhận hoàn tất" là xong'] },
    ],
  },
  'R0-8': {
    title: 'Trang Chiến dịch của tôi',
    summary: 'KOL/MCN xem mọi hợp tác của mình, chia theo từng bước.',
    steps: [
      { screen: 'Menu → "Chiến dịch của tôi"', checks: ['Các tab: Cần xử lý · Đang trao đổi · Đang thực hiện · Chờ thanh toán · Hoàn tất · Đã đóng', 'Mỗi hợp tác chỉ nằm ở 1 tab', 'Có việc đang chờ thì mở sẵn tab "Cần xử lý"'] },
      { screen: 'Danh sách', checks: ['Xem dạng bảng hoặc thẻ', 'Mỗi dòng: chiến dịch, lời mời hay ứng tuyển, trạng thái, việc cần làm, giá, hạn', 'Sắp xếp theo hạn hoặc giá'] },
      { screen: 'Bấm một dòng', checks: ['Mở chi tiết hợp tác ở bên phải', 'Có "Nhắn tin" và "Xem trên Sàn"'] },
    ],
  },
  'R0-9': {
    title: 'Danh sách chiến dịch của Nhãn hàng',
    summary: 'Nhãn hàng xem tất cả chiến dịch của mình ở một trang.',
    steps: [
      { screen: 'Menu → "Chiến dịch"', checks: ['Tab: Tất cả · Nháp · Đang mở · Đang chạy · Hoàn tất · Đã huỷ, kèm số lượng', 'Tìm theo tên; lọc theo loại chiến dịch và Riêng tư / Trên sàn', 'Máy tính xem dạng bảng, điện thoại xem dạng thẻ'] },
      { screen: 'Mỗi chiến dịch', checks: ['Cột "Cần xử lý" đếm việc đang chờ bạn', 'Menu ⋮: Xem chi tiết · Sửa · Xem trên Sàn · Đóng · Huỷ'] },
      { screen: 'Chưa có chiến dịch', checks: ['Hiện "Chưa có chiến dịch nào" và nút "Tạo chiến dịch"'] },
    ],
  },
  'R0-10': {
    title: 'Trang chi tiết một chiến dịch',
    summary: 'Mọi thông tin của một chiến dịch nằm trên một trang, chia theo tab.',
    steps: [
      { screen: 'Trang chiến dịch', checks: ['Tab: Tổng quan · Booking · Ứng tuyển · Nội dung · Báo cáo · Hỏi đáp', 'Tab có số khi có việc chờ (đề xuất mới, nháp chờ duyệt)'] },
      { screen: 'Tab "Tổng quan"', checks: ['4 con số: số hợp tác, tiền đã chốt, bài đã xác minh, lượt xem / thích', 'Mục tiêu, brief, yêu cầu nội dung, hạng mục'] },
      { screen: 'Tab "Booking"', checks: ['Hợp tác đang chờ bạn nằm trên cùng', 'Bấm vào để mở chi tiết'] },
    ],
  },
  'R0-11': {
    title: 'Mở Sàn chiến dịch',
    summary: 'Sàn là trang công khai riêng, ai cũng mở được, kể cả chưa đăng nhập.',
    steps: [
      { screen: 'Mở Sàn', checks: ['Menu tài khoản → "Mở Sàn chiến dịch" (mở tab mới)', 'Hoặc gửi link Sàn cho người khác'] },
      { screen: 'Đầu trang Sàn', checks: ['Ô tìm chiến dịch', 'Chưa đăng nhập: "Đăng nhập" / "Đăng ký"', 'Đã đăng nhập: "Vào KOLHUB" để quay về; Nhãn hàng có thêm "Đăng chiến dịch"'] },
      { screen: 'Lưu ý', checks: ['Đăng xuất hay đổi vai trò khi đang ở Sàn thì vẫn ở lại Sàn'] },
    ],
  },

  // R1 — Nhãn hàng mời KOL
  'R1-1': {
    title: 'Mời KOL vào chiến dịch',
    summary: 'Nhãn hàng chủ động mời KOL thay vì chờ ứng tuyển.',
    steps: [
      { screen: 'Trang chiến dịch → tab "Booking" → "Mời KOL"', checks: ['Chọn KOL từ danh sách đã lưu, hoặc tìm theo tên / KOL ID', 'Chọn hạng mục, giá mỗi KOL (để trống = để KOL/MCN báo giá), lời nhắn'] },
      { screen: 'Hoặc từ Tìm KOL / Danh sách đã lưu → "Mời vào chiến dịch"', checks: ['Chọn chiến dịch muốn mời vào', 'Chiến dịch "Tuyển nhiều KOL" không mời được'] },
      { screen: 'Bấm "Gửi lời mời"', checks: ['Kết quả: bao nhiêu lời mời mới, bao nhiêu KOL bị bỏ qua và vì sao', 'Mời từ chiến dịch nháp → chiến dịch tự được đăng (phải đủ thông tin)', 'Chiến dịch tắt "Đàm phán" → phải nhập giá mới gửi được'] },
    ],
  },
  'R1-2': {
    title: 'Lời mời tự đến đúng người',
    summary: 'Hệ thống tự gửi lời mời đến người đang quản lý KOL.',
    steps: [
      { screen: 'Khi Nhãn hàng gửi lời mời', checks: ['KOL thuộc MCN → lời mời đến MCN đó', 'KOL tự do → lời mời đến thẳng KOL', 'KOL đã có trong chiến dịch → bỏ qua, báo "KOL đã có trong chiến dịch"'] },
      { screen: 'Gộp lời mời', checks: ['Mời thêm KOL cùng MCN khi lời mời cũ chưa được trả lời → gộp vào lời mời cũ', 'Lời mời cũ đã được trả lời → tạo lời mời mới'] },
      { screen: 'Kênh đăng', checks: ['Hệ thống tự chọn kênh hợp lệ cùng nền tảng', 'Không có → để trống cho KOL/MCN tự chọn'] },
    ],
  },
  'R1-3': {
    title: 'KOL/MCN nhận hoặc từ chối lời mời',
    summary: 'KOL/MCN xem lời mời rồi nhận hoặc từ chối.',
    steps: [
      { screen: 'Chiến dịch của tôi → tab "Cần xử lý" → mở lời mời', checks: ['Xem giá, hạng mục, hạn trả lời', 'MCN: "Giao KOL/kênh" — chọn KOL và kênh sẽ đăng', 'KOL: "Chọn kênh đăng"'] },
      { screen: 'Bấm "Chấp nhận"', checks: ['Chỉ bấm được khi đã có giá và mọi hạng mục đã có kênh', 'Lời mời chưa có giá → phải "Báo giá" trước', 'Xong: "Đã chốt booking", bắt đầu làm nội dung'] },
      { screen: 'Hoặc "Từ chối"', checks: ['Lý do không bắt buộc', 'Nhãn hàng được báo'] },
    ],
  },
  'R1-4': {
    title: 'Rút lời mời',
    summary: 'Nhãn hàng rút lời mời khi KOL/MCN chưa trả lời.',
    steps: [
      { screen: 'Mở hợp tác → "Rút lời mời"', checks: ['Chỉ rút được khi đang chờ KOL/MCN trả lời', 'Có thể ghi lý do (không bắt buộc)'] },
      { screen: 'Sau khi rút', checks: ['Hiện "Đã rút lời mời"; KOL/MCN không trả lời được nữa', 'Có thể mời lại KOL đó sau'] },
    ],
  },
  'R1-5': {
    title: 'Thông báo',
    summary: 'Có việc mới thì chuông báo, bấm vào là tới đúng chỗ.',
    steps: [
      { screen: 'Chuông ở đầu trang', checks: ['Số đỏ = số thông báo chưa đọc (quá 99 hiện "99+")', 'Bấm để xem'] },
      { screen: 'Trang "Thông báo"', checks: ['Lọc "Tất cả" / "Chưa đọc"', 'Bấm một thông báo → mở đúng hợp tác, tin nhắn hoặc câu hỏi', '"Đánh dấu tất cả đã đọc"'] },
      {
        screen: 'Khi nào có thông báo',
        checks: ['Có lời mời, đề xuất, báo giá mới', 'Nháp được duyệt hoặc cần sửa, bài được xác minh, đã thanh toán', 'Tin nhắn mới, câu hỏi mới', 'Lời mời sắp hết hạn (còn 2 ngày)'],
      },
    ],
  },

  // R2 — Trả giá và nhắn tin
  'R2-1': {
    title: 'Trả giá qua lại',
    summary: 'Hai bên trả giá qua lại tới khi đồng ý.',
    steps: [
      { screen: 'Mở hợp tác → "Báo giá khác" (Nhãn hàng) / "Trả giá" (KOL/MCN)', checks: ['Chỉ bên đang đến lượt mới báo giá được', 'Nhập tổng giá mới (lớn hơn 0), lời nhắn nếu muốn'] },
      { screen: 'Sau khi gửi', checks: ['Đến lượt bên kia: chấp nhận, trả giá tiếp hoặc từ chối', 'Bên vừa gửi chỉ có thể huỷ', 'Đang trả giá thì không bị hết hạn'] },
      { screen: 'Lưu ý', checks: ['Chiến dịch "Tuyển nhiều KOL" không trả giá', 'Chiến dịch tắt "Đàm phán" → không có nút trả giá, chỉ chấp nhận hoặc từ chối'] },
    ],
  },
  'R2-2': {
    title: 'Lời mời, đề xuất tự hết hạn',
    summary: 'Lời mời hoặc đề xuất không ai trả lời sẽ tự đóng.',
    steps: [
      { screen: 'Lời mời / đề xuất mới gửi', checks: ['Hết hạn sau 7 ngày, hoặc theo hạn ứng tuyển của chiến dịch nếu sớm hơn', 'Luôn hiện "còn N ngày" / "còn N giờ"'] },
      { screen: 'Khi hết hạn', checks: ['Chuyển "Đã hết hạn", không bấm gì được nữa', 'KOL/MCN có thể ứng tuyển lại'] },
      { screen: 'Lưu ý', checks: ['Đang trả giá qua lại thì không hết hạn', 'Còn 2 ngày thì có thông báo nhắc'] },
    ],
  },
  'R2-3': {
    title: 'Huỷ hợp tác đã chốt',
    summary: 'Đã chốt mà có sự cố thì một trong hai bên huỷ, phải ghi lý do.',
    steps: [
      { screen: 'Mở hợp tác → "Huỷ booking"', checks: ['Bắt buộc ghi lý do', 'Huỷ được cho tới khi Nhãn hàng đánh dấu đã thanh toán'] },
      { screen: 'Sau khi huỷ', checks: ['Hiện "Đã huỷ booking", bên kia thấy lý do', 'Nháp và bài đã đăng vẫn giữ để xem lại'] },
    ],
  },
  'R2-4': {
    title: 'Sửa hoặc rút đề xuất',
    summary: 'KOL/MCN sửa hoặc rút đề xuất khi Nhãn hàng chưa trả lời.',
    steps: [
      { screen: 'Trang chiến dịch trên Sàn → "Sửa đề xuất"', checks: ['Chỉ sửa được khi Nhãn hàng chưa trả lời', 'Thông tin cũ điền sẵn, sửa xong bấm "Lưu thay đổi"', 'Sửa không làm kéo dài hạn'] },
      { screen: '"Rút đề xuất"', checks: ['Hỏi lại trước khi rút; lý do không bắt buộc', 'Rút xong vẫn ứng tuyển lại được nếu chiến dịch còn nhận'] },
    ],
  },
  'R2-5': {
    title: 'Đóng hoặc huỷ chiến dịch',
    summary: 'Nhãn hàng tự đóng chiến dịch khi xong, hoặc huỷ nếu không chạy nữa.',
    steps: [
      { screen: 'Trang chiến dịch → "Đóng chiến dịch" hoặc "Huỷ"', checks: ['Luôn hỏi lại trước khi làm', 'Không đóng/huỷ được khi còn hợp tác đang làm dở'] },
      { screen: 'Sau khi đóng hoặc huỷ', checks: ['Lời mời, đề xuất chưa chốt tự huỷ', 'Chiến dịch rời Sàn; không sửa, mời hay mở lại được', 'Chiến dịch không tự đóng khi hết ngày — phải bấm'] },
      { screen: 'Làm nhiều chiến dịch một lúc', checks: ['Ở dạng bảng: tích chọn rồi bấm "Đóng chiến dịch (N)"'] },
    ],
  },
  'R2-6': {
    title: 'Lịch sử hợp tác',
    summary: 'Mọi việc hai bên đã làm đều được ghi lại.',
    steps: [
      { screen: 'Mở hợp tác → khối "Lịch sử"', checks: ['Mỗi dòng: ai làm, làm gì, lúc nào, giá bao nhiêu (nếu có)', 'Mới nhất ở trên', 'Lý do huỷ, góp ý, link bài hiện nguyên văn'] },
      { screen: 'Lưu ý', checks: ['Không ai sửa hay xoá được lịch sử'] },
    ],
  },
  'R2-7': {
    title: 'Nhắn tin trong hợp tác',
    summary: 'Hai bên nhắn tin ngay trong từng hợp tác.',
    steps: [
      { screen: 'Mở hợp tác → "Nhắn tin"', checks: ['Mỗi hợp tác một cuộc trò chuyện, chỉ 2 bên thấy', 'Tin tối đa 2.000 ký tự, có thể kèm 1 đường dẫn', 'Enter để gửi, Shift + Enter xuống dòng'] },
      { screen: 'Trang "Tin nhắn"', checks: ['Mọi cuộc trò chuyện, mới nhất ở trên', 'Các bước của hợp tác (chốt, duyệt, thanh toán…) tự hiện xen trong trò chuyện'] },
      { screen: 'Hợp tác đã đóng', checks: ['Chỉ xem lại, không gửi thêm được'] },
    ],
  },

  // R3 — Kiểm soát nội dung
  'R3-1': {
    title: 'Yêu cầu sửa nháp',
    summary: 'Nhãn hàng chưa ưng nháp thì yêu cầu sửa, kèm góp ý.',
    steps: [
      { screen: 'Trang chiến dịch → tab "Nội dung" → "Yêu cầu sửa"', checks: ['Bắt buộc ghi góp ý (tối đa 1.000 ký tự)', 'Gửi xong: "Đã gửi yêu cầu chỉnh sửa"'] },
      { screen: 'KOL/MCN: mở hợp tác', checks: ['Thấy góp ý của Nhãn hàng dưới bản nháp', 'Bấm "Nộp lại bản nháp" — sửa bao nhiêu lần cũng được'] },
    ],
  },
  'R3-2': {
    title: 'Tự kiểm tra vi phạm trong nháp',
    summary: 'Hệ thống tự kiểm tra video nháp có vi phạm không (KOL Safety).',
    steps: [
      { screen: 'Khi KOL/MCN nộp nháp có tệp', checks: ['Hệ thống kiểm tra ngay: an toàn, cần xem lại, hoặc vi phạm', 'KOL/MCN thấy kết quả liền; vi phạm thì nên sửa và nộp lại'] },
      { screen: 'Nhãn hàng: tab "Nội dung"', checks: ['Thấy kết quả, điểm và các vấn đề của từng nháp', 'Vẫn tự quyết duyệt hay không', 'Nháp chỉ có link thì không kiểm tra được'] },
    ],
  },
  'R3-3': {
    title: 'Đính kèm hợp đồng',
    summary: 'Đính kèm tệp hợp đồng để hai bên cùng xem.',
    steps: [
      { screen: 'Nhãn hàng: mở hợp tác → khối "Hợp đồng"', checks: ['"Đính kèm hợp đồng": PDF, JPG, PNG hoặc DOCX, tối đa 10 MB', 'Mỗi hợp tác 1 tệp; tải tệp mới sẽ thay tệp cũ', 'Gỡ bằng "Gỡ tệp hợp đồng"'] },
      { screen: 'KOL/MCN: mở hợp tác', checks: ['Thấy tên tệp hợp đồng', 'Không bắt buộc — KOL Hub không ký hợp đồng điện tử'] },
      { screen: 'Chiến dịch tắt "Hợp đồng"', checks: ['Không đính kèm được tệp nào; tệp đã có vẫn xem được'] },
    ],
  },
  'R3-4': {
    title: 'Số liệu bài đăng',
    summary: 'Xem bài đăng được bao nhiêu lượt xem, thích, bình luận, chia sẻ.',
    steps: [
      { screen: 'Mở hợp tác → "Bài đăng"', checks: ['Mỗi bài: lượt xem, thích, bình luận, chia sẻ, tỉ lệ tương tác', 'Số liệu lấy lúc bài được xác minh'] },
      { screen: 'Trang chiến dịch → tab "Báo cáo"', checks: ['Tổng số bài và tổng từng con số của cả chiến dịch', 'Bảng liệt kê từng bài đã xác minh'] },
    ],
  },
  'R3-5': {
    title: 'Bật/tắt từng phần của chiến dịch',
    summary: 'Nhãn hàng bật phần cần dùng, tắt phần không cần; phần nào tắt thì không áp dụng cho chiến dịch.',
    steps: [
      { screen: 'Trang Tạo/Sửa chiến dịch → "Tính năng của chiến dịch"', checks: ['Mỗi phần là một thẻ có công tắc bật/tắt', 'Bật lên là mở phần thiết lập ngay bên dưới', 'Thẻ hiện "Cần thiết lập" nếu bật mà chưa điền'] },
      {
        screen: 'Các thẻ',
        checks: [
          'Bản tóm tắt sáng tạo (luôn bật): mục tiêu và brief',
          'Đề nghị trả phí, Tặng quà: phần thưởng tiền và quà (Tặng quà chỉ có ở "Tuyển nhiều KOL")',
          'Đàm phán: tắt thì giá cố định — chỉ chấp nhận hoặc từ chối',
          'Duyệt nháp: tắt thì KOL/MCN đăng luôn rồi gửi link',
          'Sự tuân thủ: quy định bài đăng (hashtag, ghi nhãn quảng cáo…)',
          'Hợp đồng: điều khoản người ứng tuyển phải đồng ý, và tệp hợp đồng trong từng hợp tác',
          'Điều kiện tham gia: khu vực, độ tuổi, giới tính, số người theo dõi',
          'Câu hỏi khảo sát: tối đa 10 câu hỏi khi ứng tuyển',
        ],
      },
      { screen: 'Sau khi lưu', checks: ['Tắt một phần thì dữ liệu của phần đó bị xoá', 'Trang chiến dịch → tab "Tổng quan" → khối "Tính năng" cho biết phần nào đang bật'] },
    ],
  },

  // R4 — Sàn dễ tìm hơn
  'R4-1': {
    title: 'Mức độ phù hợp',
    summary: 'Sàn chấm điểm mỗi chiến dịch hợp với bạn bao nhiêu phần trăm.',
    steps: [
      { screen: 'Sàn chiến dịch (KOL/MCN đã đăng nhập)', checks: ['Mỗi thẻ có nhãn "Khớp N%": xanh từ 70, cam từ 40, xám dưới 40', 'Kèm 1 dòng lý do, ví dụ "Có 3 kênh TikTok đã xác thực"', 'Mặc định chiến dịch hợp nhất nằm trên'] },
      { screen: 'Trang chiến dịch → "Phù hợp với bạn"', checks: ['Liệt kê lý do hợp và những gì còn thiếu', 'Điểm dựa trên: nền tảng, lĩnh vực, số kênh, quy mô kênh'] },
      { screen: 'Lưu ý', checks: ['Điểm thấp vẫn ứng tuyển được'] },
    ],
  },
  'R4-2': {
    title: 'Tìm và lọc chiến dịch',
    summary: 'Tìm và lọc chiến dịch trên Sàn.',
    steps: [
      { screen: 'Ô tìm ở đầu Sàn', checks: ['Gõ tên chiến dịch, nhãn hàng hoặc nội dung brief (không cần dấu)'] },
      { screen: 'Thanh lọc', checks: ['Loại chiến dịch · Lĩnh vực · Nền tảng · Ngân sách', 'Sắp xếp: Phù hợp nhất · Mới nhất · Ngân sách cao nhất · Sắp hết hạn', 'Bộ lọc đang dùng hiện thành nút nhỏ, bấm để bỏ'] },
      { screen: 'Kết quả', checks: ['Hiện "N chiến dịch trên Sàn"', 'Không có: "Không có chiến dịch phù hợp"', 'Mở chiến dịch rồi bấm "← Sàn chiến dịch" quay lại đúng bộ lọc'] },
    ],
  },
  'R4-3': {
    title: 'Lưu chiến dịch yêu thích',
    summary: 'Lưu chiến dịch để xem lại sau.',
    steps: [
      { screen: 'Sàn: biểu tượng lưu trên thẻ, hoặc nút "Lưu" trong trang chiến dịch', checks: ['Bấm → "Đã lưu chiến dịch"; bấm lại → bỏ lưu', 'Chỉ KOL/MCN có nút này'] },
      { screen: 'Menu → "Chiến dịch yêu thích" → tab "Đã lưu"', checks: ['Mọi chiến dịch đã lưu, kể cả đã đóng', 'Lọc: Tất cả · Còn nhận ứng tuyển · Đã đóng'] },
      { screen: 'Trang Tổng quan', checks: ['Hiện 3 chiến dịch đã lưu còn mở, có "Xem tất cả"'] },
    ],
  },
  'R4-4': {
    title: 'Xem lại đề xuất đã gửi',
    summary: 'Xem lại mọi đề xuất mình đã gửi và tình trạng của chúng.',
    steps: [
      { screen: 'Chiến dịch yêu thích → tab "Đã ứng tuyển"', checks: ['Mọi đề xuất đã gửi, kể cả đã rút, hết hạn, không được chọn', 'Mỗi thẻ: tình trạng, giá đã đề xuất, hạn Nhãn hàng phải trả lời'] },
      { screen: 'Bấm "Xem booking"', checks: ['Mở hợp tác trong "Chiến dịch của tôi"'] },
      { screen: 'Lưu ý', checks: ['Lời mời của Nhãn hàng không nằm ở đây mà ở "Chiến dịch của tôi"'] },
    ],
  },
  'R4-5': {
    title: 'Thông tin Nhãn hàng',
    summary: 'Xem nhãn hàng có đáng tin trước khi ứng tuyển.',
    steps: [
      { screen: 'Trang chiến dịch → mục "Nhãn hàng"', checks: ['Tên công ty', 'Dấu "Email doanh nghiệp đã xác thực" (nếu có)', 'Số chiến dịch đã đăng, số hợp tác đã hoàn tất, tham gia từ tháng nào'] },
      { screen: 'Lưu ý', checks: ['Không hiện email, số điện thoại hay người liên hệ'] },
    ],
  },
  'R4-6': {
    title: 'Khách chưa đăng nhập xem Sàn',
    summary: 'Người chưa đăng nhập vẫn xem được Sàn.',
    steps: [
      { screen: 'Sàn chiến dịch (chưa đăng nhập)', checks: ['Xem danh sách và chi tiết chiến dịch', 'Không có điểm phù hợp, không lưu được', 'Mặc định chiến dịch mới nhất nằm trên'] },
      { screen: 'Trang chiến dịch → "Đăng nhập để ứng tuyển"', checks: ['Đăng nhập xong quay lại đúng chiến dịch đó', 'Có link "Chưa có tài khoản? Đăng ký"', 'Chiến dịch hết hạn → không hiện nút này'] },
    ],
  },
  'R4-7': {
    title: 'Nhãn hàng xem Sàn',
    summary: 'Nhãn hàng xem Sàn để tham khảo, không ứng tuyển được.',
    steps: [
      { screen: 'Sàn chiến dịch (Nhãn hàng)', checks: ['Chỉ xem; không lưu, không ứng tuyển', 'Chiến dịch của mình có nhãn "Của bạn"'] },
      { screen: 'Mở chiến dịch của mình', checks: ['Nút "Quản lý chiến dịch" về trang quản lý', 'Thấy mọi câu hỏi, có nút "Trả lời câu hỏi"'] },
      { screen: 'Đầu trang Sàn', checks: ['"Đăng chiến dịch" để tạo mới, "Vào KOLHUB" để quay về'] },
    ],
  },
  'R4-8': {
    title: 'Hỏi đáp công khai',
    summary: 'KOL/MCN hỏi công khai, Nhãn hàng trả lời cho mọi người cùng xem.',
    steps: [
      { screen: 'Trang chiến dịch trên Sàn → "Hỏi đáp"', checks: ['KOL/MCN gõ câu hỏi (tối đa 500 ký tự) → "Đã gửi câu hỏi"', 'Câu chưa trả lời chỉ người hỏi thấy', 'Câu đã trả lời ai cũng thấy, kể cả khách'] },
      { screen: 'Nhãn hàng: trang chiến dịch → tab "Hỏi đáp"', checks: ['Câu chưa trả lời nằm trên', 'Trả lời tối đa 1.000 ký tự, sửa lại được'] },
      { screen: 'KOL/MCN: trang "Câu hỏi của tôi"', checks: ['Lọc Chờ trả lời / Đã trả lời', 'Có thông báo khi được trả lời'] },
    ],
  },
  'R4-9': {
    title: 'Banner và ô lĩnh vực trên Sàn',
    summary: 'Đầu Sàn có banner và ô lĩnh vực để đi nhanh.',
    steps: [
      { screen: 'Đầu Sàn: 3 banner', checks: ['Ứng tuyển nhận thưởng · Triển khai chiến dịch · Hướng dẫn & mẹo', 'Nút trên banner đổi theo người xem (khách, KOL/MCN, Nhãn hàng)'] },
      { screen: 'Hàng ô lĩnh vực', checks: ['Bấm một lĩnh vực → lọc ngay chiến dịch lĩnh vực đó', 'Bấm lại để bỏ lọc', 'Có ô "Hướng dẫn sử dụng" và "Dành cho Nhãn hàng"'] },
    ],
  },
  'R4-10': {
    title: 'Ảnh bìa chiến dịch',
    summary: 'Thêm ảnh bìa cho chiến dịch nổi bật hơn.',
    steps: [
      { screen: 'Trang Tạo/Sửa chiến dịch → "Ảnh chiến dịch"', checks: ['Không bắt buộc', 'JPG, PNG hoặc WebP, tối đa 10 MB; nên dùng ảnh ngang 16:9', 'Bấm chọn hoặc kéo thả; "Đổi ảnh" / "Xoá ảnh"'] },
      { screen: 'Ảnh hiện ở đâu', checks: ['Thẻ chiến dịch trên Sàn và trong danh sách', 'Đầu trang chiến dịch'] },
    ],
  },

  // R5 — Dùng hằng ngày
  'R5-1': {
    title: 'Tab "Cần xử lý"',
    summary: 'Một tab gom mọi việc đang chờ KOL/MCN làm.',
    steps: [
      {
        screen: 'Chiến dịch của tôi → tab "Cần xử lý"',
        checks: ['Gồm: trả lời lời mời, trả lời giá, nộp nháp, gửi link bài, xác nhận đã nhận tiền hoặc hàng', 'Số trên tab = số việc đang chờ bạn', 'Không có gì: "Không có lời mời hay đề xuất giá nào đang chờ bạn."'],
      },
      { screen: 'Mỗi dòng', checks: ['Cột "Cần bạn" ghi rõ việc phải làm', 'Có dấu "Cần bạn xử lý" để dễ thấy'] },
    ],
  },
  'R5-2': {
    title: 'Trang Tổng quan của KOL/MCN',
    summary: 'Mở app là thấy số chiến dịch theo từng bước và việc sắp tới hạn.',
    steps: [
      { screen: 'Tổng quan → "Chiến dịch của tôi"', checks: ['5 ô: Lời mời/Đã ứng tuyển · Đang thực hiện · Chờ duyệt nội dung · Chờ thanh toán · Hoàn tất', 'Bấm một ô → mở danh sách đã lọc theo bước đó'] },
      { screen: '"Việc cần làm"', checks: ['Tối đa 5 việc, gấp nhất trên cùng', 'Mỗi việc ghi hạn: "Quá hạn", "Hạn hôm nay", "Còn N ngày"', 'Bấm một việc → mở thẳng hợp tác đó'] },
    ],
  },
  'R5-3': {
    title: 'Việc đang chờ Nhãn hàng',
    summary: 'Nhãn hàng thấy ngay mình còn bao nhiêu việc.',
    steps: [
      { screen: 'Trang "Chiến dịch" → dòng "Cần bạn xử lý"', checks: ['Số hợp tác chờ bạn trả lời', 'Số nội dung chờ duyệt', 'Số hợp tác chờ thanh toán', 'Hết việc thì dòng này ẩn đi'] },
    ],
  },
  'R5-4': {
    title: 'Chấm sao cho nhau',
    summary: 'Hoàn tất xong, hai bên chấm sao cho nhau.',
    steps: [
      { screen: 'Mở hợp tác đã hoàn tất → "Đánh giá"', checks: ['Chọn 1–5 sao, nhận xét nếu muốn (tối đa 1.000 ký tự)', 'Mỗi bên chỉ chấm 1 lần', 'Chưa chọn sao thì chưa gửi được'] },
      { screen: 'Sau khi gửi', checks: ['Nhãn hàng: "Đã lưu đánh giá"; KOL/MCN: "Đã gửi đánh giá"', 'Nhãn hàng không thấy KOL/MCN chấm mình'] },
    ],
  },
  'R5-5': {
    title: 'Theo dõi tiền và quà',
    summary: 'KOL/MCN theo dõi tiền và quà nhận từ các chiến dịch.',
    steps: [
      { screen: 'Menu → "Thanh toán"', checks: ['Mỗi hợp tác đã chốt là 1 dòng', 'Tiền: Chờ thanh toán → Nhãn hàng đã đánh dấu → Đã nhận', 'Quà: Chờ gửi → Đã gửi → Đã nhận'] },
      { screen: 'Xem theo', checks: ['Tháng · Chiến dịch · KOL (chỉ MCN)', '3 ô tổng: Đã nhận · Đang chờ · Giá trị sản phẩm'] },
      { screen: 'Lưu ý', checks: ['Đây chỉ là sổ ghi nhận, không phải ví tiền'] },
    ],
  },
  'R5-6': {
    title: 'Trang Đánh giá',
    summary: 'KOL/MCN xem các đánh giá và chấm nốt những hợp tác chưa chấm.',
    steps: [
      { screen: 'Menu → "Đánh giá"', checks: ['"Chờ bạn đánh giá": hợp tác chưa chấm, bấm để chấm', 'Tab "Nhãn hàng đánh giá bạn" và "Bạn đánh giá"'] },
      { screen: 'Phần tóm tắt', checks: ['Điểm trung bình (ví dụ 4,5), số lượt, tỉ lệ từng mức sao'] },
    ],
  },
  'R5-7': {
    title: 'Bài đã đăng trên hồ sơ',
    summary: 'KOL/MCN xem bài đã đăng và chọn bài hiện trên hồ sơ.',
    steps: [
      { screen: 'Menu → "Nội dung"', checks: ['Mọi bài đã xác minh, mới nhất trên', 'Tổng: số bài, lượt xem, tương tác, tỉ lệ tương tác', 'Lọc theo nền tảng và 30 ngày / 90 ngày / 12 tháng'] },
      { screen: 'Công tắc "Hiện trên hồ sơ"', checks: ['Bật (mặc định): Nhãn hàng thấy bài này trên hồ sơ', 'Nhãn hàng không thấy giá, tên chiến dịch hay đánh giá'] },
    ],
  },

  // R6 — Tuyển nhiều KOL
  'R6-1': {
    title: 'Tạo chiến dịch Tuyển nhiều KOL',
    summary: 'Nhãn hàng tuyển nhiều KOL cùng lúc với phần thưởng cố định.',
    steps: [
      { screen: 'Trang Tạo chiến dịch → chọn "Tuyển nhiều KOL"', checks: ['Đã có người tham gia thì không đổi loại được'] },
      { screen: '"Suất và phần thưởng"', checks: ['Số KOL cần tuyển: 1–500', 'Tiền mỗi KOL, và/hoặc tặng sản phẩm (tên, giá trị)', 'Phải có tiền hoặc sản phẩm', 'Tổng ngân sách tự tính = số suất × phần thưởng'] },
      { screen: '"Lịch trình 4 giai đoạn"', checks: ['Ứng tuyển → Chọn lọc → Đăng bài → Đánh giá, nối tiếp nhau', 'Nút "Gợi ý lịch" điền sẵn 7 · 3 · 15 · 6 ngày', 'Chiến dịch luôn hiện trên Sàn, không mời riêng'] },
    ],
  },
  'R6-2': {
    title: 'Các giai đoạn tự chuyển theo lịch',
    summary: 'Chiến dịch Tuyển nhiều KOL tự chuyển giai đoạn theo lịch.',
    steps: [
      { screen: 'Trên Sàn và trang chiến dịch', checks: ['Nhãn: Sắp mở · D-n (còn n ngày ứng tuyển) · Tuyển chọn · Đang đăng bài · Đang đánh giá · Đã kết thúc', 'Lịch trình 4 bước, bước hiện tại ghi "Đang diễn ra"'] },
      { screen: 'Giai đoạn quyết định việc gì làm được', checks: ['Chỉ ứng tuyển được trong giai đoạn Ứng tuyển', 'Chỉ chọn người trong giai đoạn Chọn lọc', 'Hết lịch thì rời Sàn, nhưng Nhãn hàng vẫn phải bấm đóng chiến dịch'] },
    ],
  },
  'R6-3': {
    title: 'Ứng tuyển không cần báo giá',
    summary: 'KOL/MCN ứng tuyển chiến dịch Tuyển nhiều KOL, không cần báo giá.',
    steps: [
      { screen: 'Trang chiến dịch trên Sàn → "Ứng tuyển ngay"', checks: ['Chỉ có trong giai đoạn Ứng tuyển', 'Thấy "Phần thưởng cố định mỗi KOL… Bạn không cần báo giá."'] },
      { screen: 'Hộp ứng tuyển', checks: ['Chọn kênh, trả lời câu hỏi, tích điều khoản', 'Có tặng sản phẩm → nhập tỉnh/thành, địa chỉ, số điện thoại nhận hàng', 'Gửi xong: "Đã ứng tuyển"'] },
      { screen: 'Chờ kết quả', checks: ['Nhãn hàng chọn trong giai đoạn Chọn lọc', 'Được chọn → bắt đầu làm nội dung như bình thường', 'Không được chọn → "Rất tiếc, bạn không được chọn ở chiến dịch này…"'] },
    ],
  },
  'R6-4': {
    title: 'Chọn người cho đủ suất',
    summary: 'Nhãn hàng chọn nhiều người một lúc cho đủ số suất.',
    steps: [
      { screen: 'Trang chiến dịch → tab "Ứng viên"', checks: ['Đầu trang: "Đã chọn X/N suất · còn Z suất"', 'Mỗi ứng viên: kênh, lời nhắn, câu trả lời, địa chỉ nhận hàng'] },
      { screen: 'Chọn', checks: ['Tích nhiều người hoặc "Đánh dấu tất cả"', '"Chọn (n)" chỉ bấm được trong giai đoạn Chọn lọc', 'Chọn quá số suất còn lại → không cho chọn'] },
      { screen: 'Không chọn và chốt danh sách', checks: ['"Không chọn (n)" cho người không phù hợp', '"Chốt danh sách": mọi người còn lại thành "không được chọn"'] },
    ],
  },
  'R6-5': {
    title: 'Gửi và nhận quà tặng',
    summary: 'Ghi lại việc gửi và nhận sản phẩm tặng.',
    steps: [
      { screen: 'Nhãn hàng: mở hợp tác → "Sản phẩm tặng"', checks: ['Thấy địa chỉ, số điện thoại người nhận', 'Gửi hàng xong bấm "Đã gửi sản phẩm"'] },
      { screen: 'KOL/MCN: mở hợp tác', checks: ['Nhận hàng xong bấm "Đã nhận sản phẩm"'] },
      { screen: 'Lưu ý', checks: ['Chỉ ghi nhận, KOL Hub không vận chuyển hàng', 'Không chặn việc làm nội dung hay thanh toán'] },
    ],
  },
};
