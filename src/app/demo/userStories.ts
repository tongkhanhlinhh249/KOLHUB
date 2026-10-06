// "Tài liệu nghiệp vụ" of the demo: user stories for Chiến dịch của tôi + Sàn chiến dịch, cut into releases R0 → R5
// (story map: epics = lifecycle stages, releases = end-to-end slices). Source of every rule: the campaign/booking spec
// docs/superpowers/specs/2026-09-29-kolhub-campaign-booking-beta-design.md (§ = its sections). Open points are kept
// in `confirm` ("Cần BA xác nhận"), never filled in by guess.

export type EpicKey = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'EK';
export type StoryRole = 'Nhãn hàng' | 'KOL' | 'MCN' | 'Khách' | 'Hệ thống';
export type ReleaseKey = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface Epic {
  key: EpicKey;
  name: string;
}

export interface UserStory {
  id: string;
  epic: EpicKey;
  roles: StoryRole[];
  title: string;
  /** "Là …, tôi muốn … để …". */
  story: string;
  criteria: string[];
  /** Section(s) of the spec, or the source file when the rule lives in code. */
  source: string;
  /** "Cần BA xác nhận": what the spec does not settle. */
  confirm?: string;
}

export interface Release {
  key: ReleaseKey;
  name: string;
  goal: string;
  stories: UserStory[];
}

export const EPICS: Epic[] = [
  { key: 'E1', name: 'Tạo & đăng chiến dịch' },
  { key: 'E2', name: 'Khám phá trên Sàn' },
  { key: 'E3', name: 'Kết nối: ứng tuyển & mời' },
  { key: 'E4', name: 'Thương lượng & chốt' },
  { key: 'E5', name: 'Sản xuất & duyệt nội dung' },
  { key: 'E6', name: 'Đăng bài, thanh toán & đánh giá' },
  { key: 'E7', name: 'Không gian làm việc của NCC' },
  { key: 'EK', name: 'Nền tảng kỹ thuật' },
];

export const STORY_ROLES: StoryRole[] = ['Nhãn hàng', 'KOL', 'MCN', 'Khách', 'Hệ thống'];

export const RELEASES: Release[] = [
  {
    key: 'R0',
    name: 'Lát cắt xuyên suốt',
    goal: 'Một booking ứng tuyển từ Sàn đi trọn tới Hoàn tất với giao diện tối thiểu: một kiểu hạng mục, chốt giá đề xuất, duyệt nháp một lần, Sàn sắp xếp Mới nhất.',
    stories: [
      {
        id: 'R0-1',
        epic: 'E1',
        roles: ['Nhãn hàng'],
        title: 'Tạo và đăng chiến dịch lên Sàn',
        story: 'Là Nhãn hàng, tôi muốn tạo chiến dịch và đăng lên Sàn để KOL/MCN biết và ứng tuyển.',
        criteria: [
          'Tạo nháp chỉ bắt buộc tên; chiến dịch ở trạng thái DRAFT.',
          'Đăng chuyển DRAFT → OPEN khi đủ: tên, ngân sách > 0, ngày bắt đầu ≤ ngày kết thúc, ngày kết thúc chưa qua, ≥ 1 nền tảng, ≥ 1 hạng mục thuộc nền tảng của chiến dịch, hạn ứng tuyển (nếu có) ≤ ngày kết thúc và chưa qua.',
          'Trường không hợp lệ → lỗi 4803 kèm tên trường.',
          'Chỉ sửa được khi DRAFT hoặc OPEN (4802); sửa khi OPEN phải giữ đủ điều kiện đăng.',
          'Chỉ tài khoản Nhãn hàng/Agency thao tác được (4016).',
        ],
        source: '§2, §3',
      },
      {
        id: 'R0-2',
        epic: 'E2',
        roles: ['KOL', 'MCN'],
        title: 'Xem danh sách và chi tiết chiến dịch trên Sàn',
        story: 'Là KOL/MCN, tôi muốn xem các chiến dịch đang nhận đề xuất để chọn chiến dịch phù hợp.',
        criteria: [
          'Sàn chỉ hiện chiến dịch hiển thị trên Sàn, trạng thái OPEN hoặc RUNNING, ngày kết thúc và hạn ứng tuyển (cuối ngày) chưa qua.',
          'Sắp xếp Mới nhất (ngày đăng giảm dần); mức phù hợp làm ở R4.',
          'Chi tiết ở trang riêng /san/<id>, chia sẻ được; có số đề xuất, không lộ tài khoản Nhãn hàng hay thống kê nội bộ.',
          'KOL/MCN hồ sơ chưa duyệt vẫn xem được (chỉ đọc).',
        ],
        source: '§2, §3, §6, §12',
      },
      {
        id: 'R0-3',
        epic: 'E3',
        roles: ['KOL', 'MCN'],
        title: 'Ứng tuyển vào chiến dịch',
        story: 'Là KOL/MCN, tôi muốn gửi đề xuất gồm hạng mục, kênh và giá để Nhãn hàng xem xét.',
        criteria: [
          'Tạo booking nguồn APPLICATION ở trạng thái APPLIED (chờ Nhãn hàng).',
          'MCN chọn KOL mình đang quản lý + kênh MCN đã gán cho KOL đó; KOL độc lập chọn kênh của mình.',
          'Kênh phải đã xác thực, đang hoạt động, còn hạn, thuộc nền tảng chiến dịch (4809); chưa chọn hạng mục → 4812; giá phải > 0 (4810).',
          'Chỉ hồ sơ đã duyệt được ứng tuyển (4806).',
          'Mỗi NCC chỉ có một đề xuất/lời mời đang hoạt động trên mỗi chiến dịch (4807); hết hạn nhận đề xuất → 4808.',
        ],
        source: '§2, §5, §6, §8',
        confirm: 'Lát cắt R0 đi luồng MCN (đối tác chính theo §1, phải làm phần chọn KOL + kênh đã gán) hay KOL độc lập (đơn giản hơn)? Chưa chốt.',
      },
      {
        id: 'R0-4',
        epic: 'E4',
        roles: ['Nhãn hàng'],
        title: 'Xem đề xuất và chốt',
        story: 'Là Nhãn hàng, tôi muốn xem đề xuất cùng hồ sơ KOL và chốt để bắt đầu sản xuất nội dung.',
        criteria: [
          'Đề xuất hiện trong chi tiết chiến dịch /chien-dich/<id>, kèm hồ sơ công khai đầy đủ của từng KOL trong đề xuất (BR-58).',
          'Chốt: APPLIED → ACCEPTED (= được bắt đầu sản xuất); booking đầu tiên được chốt tự chuyển chiến dịch sang RUNNING.',
          'Chốt cần giá > 0 (4810) và mọi hạng mục có kênh (4809).',
          'Thao tác không nằm trong danh sách được phép của booking → 4805.',
        ],
        source: '§1, §2, §3, §5',
      },
      {
        id: 'R0-5',
        epic: 'E5',
        roles: ['KOL', 'MCN', 'Nhãn hàng'],
        title: 'Nộp nháp và duyệt nháp',
        story: 'Là NCC, tôi muốn nộp nháp để Nhãn hàng duyệt; là Nhãn hàng, tôi muốn duyệt nháp trước khi đăng.',
        criteria: [
          'NCC nộp nháp (tiêu đề + tệp và/hoặc link xem trước) khi ACCEPTED hoặc IN_PRODUCTION → CONTENT_REVIEW.',
          'Nhãn hàng duyệt; khi mọi hạng mục có nháp đã duyệt → CONTENT_APPROVED.',
          'Yêu cầu sửa và nhiều vòng nháp làm ở R3.',
        ],
        source: '§5',
      },
      {
        id: 'R0-6',
        epic: 'E6',
        roles: ['KOL', 'MCN'],
        title: 'Nộp link bài đăng',
        story: 'Là NCC, tôi muốn nộp link bài đã đăng để hệ thống xác minh và chuyển sang thanh toán.',
        criteria: [
          'Nộp được khi CONTENT_APPROVED hoặc PUBLISHED.',
          'Host của link phải thuộc nền tảng hạng mục và có đường dẫn — TikTok: tiktok.com, vt./vm.tiktok.com · YouTube: youtube.com, youtu.be · Facebook: facebook.com, fb.com, fb.watch; sai → 4811.',
          'Mọi hạng mục có bài đã xác minh → VERIFIED, ngược lại → PUBLISHED.',
        ],
        source: '§5',
        confirm: 'Bản thật chỉ kiểm tra link hay phải gọi API nền tảng để xác minh bài tồn tại? Mock xác minh ngay và tự sinh số liệu; §10 để "đồng bộ số liệu bài đăng định kỳ" ngoài phạm vi beta.',
      },
      {
        id: 'R0-7',
        epic: 'E6',
        roles: ['Nhãn hàng', 'KOL', 'MCN'],
        title: 'Ghi nhận thanh toán và hoàn tất',
        story: 'Là Nhãn hàng, tôi muốn ghi nhận đã thanh toán; là NCC, tôi muốn xác nhận đã nhận để khép booking.',
        criteria: [
          'Khi VERIFIED: Nhãn hàng bấm "Đã thanh toán", sau đó NCC bấm "Đã nhận" → COMPLETED.',
          'Không ký quỹ, không cổng thanh toán: hệ thống chỉ ghi nhận.',
        ],
        source: '§1, §5',
      },
      {
        id: 'R0-8',
        epic: 'E7',
        roles: ['KOL', 'MCN'],
        title: 'Danh sách Chiến dịch của tôi theo giai đoạn',
        story: 'Là KOL/MCN, tôi muốn thấy mọi booking của mình theo giai đoạn để biết chiến dịch nào đang ở đâu.',
        criteria: [
          'Trang /chien-dich-cua-toi có các tab: Cần xử lý · Đang trao đổi · Đang thực hiện · Chờ thanh toán · Hoàn tất · Đã đóng.',
          'Mỗi booking nằm ở đúng một tab; ?tab= giữ giai đoạn, ?booking=<id> mở chi tiết.',
        ],
        source: '§12 · supplierBooking.ts (tabOf)',
      },
    ],
  },
  {
    key: 'R1',
    name: 'Nhãn hàng chủ động mời',
    goal: 'Thêm chiều ngược lại của Sàn: Nhãn hàng mời KOL, lời mời tự đi tới MCN đang quản lý KOL, NCC nhận hoặc từ chối. Kèm thông báo để hai bên biết đến lượt mình.',
    stories: [
      {
        id: 'R1-1',
        epic: 'E3',
        roles: ['Nhãn hàng'],
        title: 'Mời KOL vào chiến dịch',
        story: 'Là Nhãn hàng, tôi muốn mời KOL từ Tìm kiếm hoặc Danh sách đã lưu để không phải chờ ứng tuyển.',
        criteria: [
          'Mời nhiều KOL một lần, kèm giá mỗi KOL, lời nhắn, hạng mục (tuỳ chọn).',
          'KOL không có hồ sơ công khai → bỏ qua (NOT_FOUND); KOL đã có booking đang chiếm chỗ trong chiến dịch → bỏ qua (ALREADY_INVITED).',
          'Gửi lời mời đầu tiên từ DRAFT chuyển chiến dịch sang OPEN (phải đủ điều kiện đăng).',
          'Không truyền giá → giá 0 ("chờ báo giá"), NCC phải báo giá trước khi chốt; gộp một KOL không giá vào booking có giá → cả booking về 0.',
        ],
        source: '§3, §4',
      },
      {
        id: 'R1-2',
        epic: 'E3',
        roles: ['Hệ thống'],
        title: 'Định tuyến và gom lời mời',
        story: 'Là hệ thống, tôi gửi lời mời tới đúng bên đang quản lý KOL để MCN không bị bỏ qua.',
        criteria: [
          'KOL đang giữ ≥ 1 kênh của MCN đã duyệt → booking gửi MCN đó (nhiều MCN: MCN có lần gán gần nhất); ngược lại gửi chính KOL.',
          'Chiến dịch đã có booking lời mời của cùng NCC đang SENT → thêm hạng mục vào booking đó; booking đã sang thương lượng/chốt → tạo booking mới.',
          'Kênh tự chọn: kênh hợp lệ cùng nền tảng → kênh hợp lệ khác thuộc nền tảng chiến dịch → để trống cho NCC chọn.',
        ],
        source: '§4',
      },
      {
        id: 'R1-3',
        epic: 'E4',
        roles: ['KOL', 'MCN'],
        title: 'Nhận, chọn kênh và chốt hoặc từ chối lời mời',
        story: 'Là KOL/MCN, tôi muốn chốt ngay lời mời hợp lý hoặc từ chối lời mời không phù hợp.',
        criteria: [
          'Lời mời SENT: NCC chốt → ACCEPTED, hoặc từ chối → DECLINED.',
          'NCC chọn/đổi kênh cho hạng mục trước khi chốt; chốt cần giá > 0 (4810) và mọi hạng mục có kênh (4809).',
        ],
        source: '§4, §5',
      },
      {
        id: 'R1-4',
        epic: 'E3',
        roles: ['Nhãn hàng'],
        title: 'Rút lời mời',
        story: 'Là Nhãn hàng, tôi muốn rút lời mời đang chờ NCC trả lời khi đổi kế hoạch.',
        criteria: ['Bên không bị chờ được huỷ khi booking chưa chốt (Nhãn hàng rút lời mời).'],
        source: '§5',
      },
      {
        id: 'R1-5',
        epic: 'EK',
        roles: ['Nhãn hàng', 'KOL', 'MCN'],
        title: 'Thông báo khi đến lượt mình',
        story: 'Là một bên của booking, tôi muốn được báo khi bên kia vừa hành động để trả lời kịp hạn.',
        criteria: [
          'Có lời mời hoặc đề xuất mới.',
          'Đến lượt tôi phản hồi (báo giá, chốt, từ chối).',
          'Có nháp chờ duyệt; Nhãn hàng đã bấm "Đã thanh toán".',
        ],
        source: '§10 (ngoài phạm vi beta)',
        confirm: '§10 để "thông báo realtime" ngoài phạm vi beta. Đề xuất đưa vào R1 vì sàn hai phía không có thông báo thì lời mời/đề xuất dễ hết hạn 7 ngày mà không ai biết. Cần chốt kênh (trong app /thong-bao, email) và danh sách sự kiện.',
      },
    ],
  },
  {
    key: 'R2',
    name: 'Thương lượng đầy đủ',
    goal: 'Hai bên trả giá qua lại, đề xuất tự hết hạn, huỷ có lý do và Nhãn hàng tự khép chiến dịch.',
    stories: [
      {
        id: 'R2-1',
        epic: 'E4',
        roles: ['Nhãn hàng', 'KOL', 'MCN'],
        title: 'Báo giá qua lại',
        story: 'Là một bên của booking, tôi muốn đưa giá khác để hai bên đi tới thoả thuận.',
        criteria: [
          'Lời mời: SENT → NCC báo giá → NEGOTIATING (chờ Nhãn hàng) ⇄ báo giá; bên được chờ chốt → ACCEPTED.',
          'Ứng tuyển: APPLIED → Nhãn hàng báo giá → NEGOTIATING (chờ NCC).',
          'Chỉ bên được chờ được chốt, báo giá, từ chối (NCC thêm chọn kênh); bên kia chỉ được huỷ.',
        ],
        source: '§5',
      },
      {
        id: 'R2-2',
        epic: 'E4',
        roles: ['Hệ thống'],
        title: 'Hết hạn lời mời / đề xuất',
        story: 'Là hệ thống, tôi đóng các lời mời/đề xuất không được trả lời để danh sách không bị treo.',
        criteria: [
          'SENT/APPLIED hết hạn sau ngày tạo + 7 ngày hoặc cuối ngày hạn ứng tuyển, mốc nào đến trước → EXPIRED.',
          'NEGOTIATING không hết hạn.',
          'Giao diện đếm ngược tới thời điểm hết hạn.',
        ],
        source: '§5',
        confirm: 'Mock tính hết hạn khi đọc, không ghi DB. Bản thật có cần job định kỳ (để ghi trạng thái và gửi thông báo "sắp hết hạn") không?',
      },
      {
        id: 'R2-3',
        epic: 'E4',
        roles: ['Nhãn hàng', 'KOL', 'MCN'],
        title: 'Huỷ booking sau khi chốt',
        story: 'Là một bên của booking, tôi muốn huỷ hợp tác đã chốt khi có sự cố, kèm lý do.',
        criteria: [
          'Cả hai bên huỷ được, bắt buộc lý do (4816).',
          'Chỉ huỷ được cho đến khi Nhãn hàng đã bấm "Đã thanh toán".',
        ],
        source: '§5, §8',
      },
      {
        id: 'R2-4',
        epic: 'E3',
        roles: ['KOL', 'MCN'],
        title: 'Sửa hoặc rút đề xuất',
        story: 'Là KOL/MCN, tôi muốn sửa đề xuất khi Nhãn hàng chưa phản hồi, hoặc rút nếu đổi ý.',
        criteria: [
          'Chỉ sửa khi đề xuất ở APPLIED; thay toàn bộ hạng mục/giá/lời nhắn, kiểm tra như ứng tuyển (4812, 4809, 4803, 4810); sai trạng thái → 4805.',
          'Sửa không gia hạn hạn phản hồi (vẫn tính từ ngày tạo).',
          'Rút đề xuất: có hộp xác nhận, lý do không bắt buộc.',
        ],
        source: '§11.4',
      },
      {
        id: 'R2-5',
        epic: 'E1',
        roles: ['Nhãn hàng'],
        title: 'Kết thúc hoặc huỷ chiến dịch',
        story: 'Là Nhãn hàng, tôi muốn tự kết thúc chiến dịch khi đủ KOL, hoặc huỷ khi không chạy nữa.',
        criteria: [
          'COMPLETED chỉ khi Nhãn hàng bấm kết thúc (từ OPEN/RUNNING), không tự động.',
          'Huỷ được từ DRAFT, OPEN, RUNNING.',
          'Kết thúc/huỷ bị chặn khi còn booking ACCEPTED…VERIFIED (4817); booking chưa chốt bị hệ thống huỷ kèm ghi chú.',
        ],
        source: '§3, §8',
      },
      {
        id: 'R2-6',
        epic: 'E4',
        roles: ['Nhãn hàng', 'KOL', 'MCN'],
        title: 'Lịch sử booking',
        story: 'Là một bên của booking, tôi muốn xem lại ai đã làm gì, giá bao nhiêu, để tránh tranh cãi.',
        criteria: ['Mọi bước được ghi: thời điểm, bên thực hiện (Nhãn hàng / NCC / Hệ thống), hành động, giá và ghi chú (nếu có).'],
        source: '§5',
      },
    ],
  },
  {
    key: 'R3',
    name: 'Nội dung chặt chẽ',
    goal: 'Vòng sửa nháp không giới hạn, quét KOL Safety cho tệp nháp, hợp đồng đính kèm và số liệu bài đăng.',
    stories: [
      {
        id: 'R3-1',
        epic: 'E5',
        roles: ['Nhãn hàng'],
        title: 'Yêu cầu sửa nháp',
        story: 'Là Nhãn hàng, tôi muốn yêu cầu sửa từng nháp kèm góp ý để nội dung đúng brief.',
        criteria: [
          'Yêu cầu sửa bắt buộc góp ý.',
          'Khi hết nháp chờ duyệt: mọi hạng mục có nháp đã duyệt → CONTENT_APPROVED, ngược lại → IN_PRODUCTION.',
          'Không giới hạn số vòng sửa.',
        ],
        source: '§1, §5',
      },
      {
        id: 'R3-2',
        epic: 'EK',
        roles: ['Hệ thống', 'Nhãn hàng'],
        title: 'Lưu tệp nháp và quét KOL Safety',
        story: 'Là Nhãn hàng, tôi muốn thấy kết quả quét an toàn của nháp để quyết định duyệt.',
        criteria: [
          'Tệp nháp được quét bằng KOL Safety → kết luận, điểm, danh sách vấn đề.',
          'Không chặn nháp VIOLATION: Nhãn hàng quyết định.',
        ],
        source: '§5',
        confirm: 'Spec không nêu giới hạn định dạng/dung lượng tệp video nháp (chỉ hợp đồng ≤ 10 MB). Bản thật quét bất đồng bộ — trạng thái "đang quét" hiển thị thế nào, Nhãn hàng có duyệt được trước khi có kết quả không?',
      },
      {
        id: 'R3-3',
        epic: 'E5',
        roles: ['Nhãn hàng', 'KOL', 'MCN'],
        title: 'Đính kèm hợp đồng',
        story: 'Là một bên của booking, tôi muốn đính kèm tệp hợp đồng để hai bên cùng tra cứu.',
        criteria: [
          'PDF/JPG/PNG/DOCX, tối đa 10 MB; cả hai bên đính kèm/gỡ được khi booking chưa kết thúc.',
          'Không có hợp đồng điện tử.',
        ],
        source: '§1, §5',
      },
      {
        id: 'R3-4',
        epic: 'EK',
        roles: ['Hệ thống', 'Nhãn hàng'],
        title: 'Số liệu bài đăng',
        story: 'Là Nhãn hàng, tôi muốn thấy lượt xem, thích, bình luận, chia sẻ, tỉ lệ tương tác của bài đã đăng.',
        criteria: ['Số liệu gắn với từng bài đã xác minh.'],
        source: '§5, §10',
        confirm: 'Mock tự sinh số liệu theo link; §10 để đồng bộ số liệu định kỳ ngoài phạm vi beta. Cần spike API TikTok/YouTube/Facebook trước khi ước lượng.',
      },
    ],
  },
  {
    key: 'R4',
    name: 'Sàn thông minh',
    goal: 'Sàn gợi ý chiến dịch phù hợp, lọc, lưu, theo dõi đề xuất đã gửi, và có góc nhìn riêng cho Khách và Nhãn hàng.',
    stories: [
      {
        id: 'R4-1',
        epic: 'E2',
        roles: ['KOL', 'MCN'],
        title: 'Mức phù hợp',
        story: 'Là KOL/MCN, tôi muốn thấy chiến dịch hợp với kênh của mình trước để ứng tuyển đúng chỗ.',
        criteria: [
          'Điểm 0–100 = nền tảng (40) + lĩnh vực (30) + số lượng (15) + quy mô (15); không có kênh liên quan → 0.',
          'Nhãn "Khớp 86%": xanh ≥ 70, cam ≥ 40, xám dưới 40; thẻ hiện 2 lý do đầu, chi tiết hiện mọi lý do và mục còn thiếu.',
          'Sắp xếp mặc định "Phù hợp nhất" (bằng điểm thì mới đăng trước). Chỉ để gợi ý, không chặn ứng tuyển.',
          'MCN: chỉ tính kênh đã giao cho KOL đã duyệt.',
        ],
        source: '§11.1',
      },
      {
        id: 'R4-2',
        epic: 'E2',
        roles: ['KOL', 'MCN', 'Khách', 'Nhãn hàng'],
        title: 'Tìm kiếm, lọc và sắp xếp',
        story: 'Là người xem Sàn, tôi muốn lọc theo lĩnh vực, nền tảng, ngân sách để thu hẹp danh sách.',
        criteria: [
          'Từ khoá không dấu trên tên, mục tiêu, brief, tên công ty.',
          'Lọc lĩnh vực, nền tảng, ngân sách; sắp xếp: Phù hợp nhất · Mới nhất · Ngân sách · Hạn gần nhất (không hạn ở cuối).',
          'Bộ lọc giữ nguyên khi đổi tab.',
        ],
        source: '§6, §11.3',
      },
      {
        id: 'R4-3',
        epic: 'E2',
        roles: ['KOL', 'MCN'],
        title: 'Lưu chiến dịch',
        story: 'Là KOL/MCN, tôi muốn lưu chiến dịch để xem lại trước khi quyết định ứng tuyển.',
        criteria: [
          'Chỉ lưu chiến dịch đang nhận đề xuất; lưu lại không nhân đôi.',
          'Tab "Đã lưu" chỉ hiện chiến dịch còn nhận đề xuất (hết hạn tự rời danh sách).',
          'Toast "Đã lưu chiến dịch" / "Đã bỏ lưu chiến dịch".',
        ],
        source: '§11.2',
      },
      {
        id: 'R4-4',
        epic: 'E2',
        roles: ['KOL', 'MCN'],
        title: 'Tab Đã ứng tuyển',
        story: 'Là KOL/MCN, tôi muốn xem mọi đề xuất đã gửi và trạng thái của chúng.',
        criteria: [
          'Gồm mọi booking ứng tuyển của tôi, mọi trạng thái (kể cả đã rút/hết hạn); lời mời không nằm ở đây.',
          'Thẻ hiện trạng thái, giá đề xuất, ngân sách, hạn phản hồi (khi còn chờ) hoặc thời điểm cập nhật; bấm mở /chien-dich-cua-toi?booking=<id>.',
        ],
        source: '§11.3',
      },
      {
        id: 'R4-5',
        epic: 'E2',
        roles: ['KOL', 'MCN'],
        title: 'Khối thông tin Nhãn hàng',
        story: 'Là KOL/MCN, tôi muốn biết Nhãn hàng có đáng tin trước khi ứng tuyển.',
        criteria: [
          'Hiện tên công ty, email doanh nghiệp đã xác thực (BR-45), số chiến dịch đã đăng, số booking đã hoàn tất, ngày tham gia "Tháng M/YYYY".',
          'Không hiện email, số điện thoại, người liên hệ hay đánh giá.',
        ],
        source: '§11.5',
      },
      {
        id: 'R4-6',
        epic: 'E2',
        roles: ['Khách'],
        title: 'Góc nhìn Khách trên Sàn',
        story: 'Là khách chưa đăng nhập, tôi muốn xem Sàn để quyết định đăng ký.',
        criteria: [
          'Xem danh sách và chi tiết; không có mức phù hợp, lưu, tab; sắp xếp mặc định Mới nhất.',
          'Nút "Đăng nhập để ứng tuyển" → /dang-nhap?returnTo=/san/<id>, đăng nhập xong quay lại đúng chiến dịch.',
        ],
        source: '§12',
      },
      {
        id: 'R4-7',
        epic: 'E2',
        roles: ['Nhãn hàng'],
        title: 'Góc nhìn Nhãn hàng trên Sàn',
        story: 'Là Nhãn hàng, tôi muốn xem Sàn để tham khảo và quản lý nhanh chiến dịch của mình.',
        criteria: [
          'Chỉ đọc, chỉ tab "Tất cả".',
          'Chiến dịch của mình có nhãn "Của bạn" và nút "Quản lý chiến dịch" → /chien-dich/<id>; header có "Đăng chiến dịch" → /chien-dich/tao.',
        ],
        source: '§12',
      },
    ],
  },
  {
    key: 'R5',
    name: 'Vận hành hằng ngày',
    goal: 'Mỗi bên mở app là biết việc nào cần làm trước; khép vòng bằng đánh giá.',
    stories: [
      {
        id: 'R5-1',
        epic: 'E7',
        roles: ['KOL', 'MCN'],
        title: 'Tab Cần xử lý',
        story: 'Là KOL/MCN, tôi muốn gom mọi booking đang chờ tôi vào một chỗ để không bỏ sót.',
        criteria: [
          'Gồm booking NCC phải hành động ngay: trả lời lời mời/báo giá, nộp nháp hoặc bài đăng, xác nhận đã nhận tiền.',
          'Số đếm của tab khớp dòng "N cần bạn xử lý".',
        ],
        source: 'supplierBooking.ts (tabOf, needsSupplier)',
      },
      {
        id: 'R5-2',
        epic: 'E7',
        roles: ['KOL', 'MCN'],
        title: 'Tổng quan: pipeline và Việc cần làm',
        story: 'Là KOL/MCN, tôi muốn thấy tổng quan các giai đoạn và việc kế tiếp có hạn gần nhất.',
        criteria: [
          'Pipeline: Lời mời / Đã ứng tuyển · Đã được chọn / Đang thực hiện · Chờ duyệt nội dung · Chờ thanh toán · Hoàn tất; bấm mở /chien-dich-cua-toi?giai-doan=…',
          '"Việc cần làm": hành động kế tiếp của từng booking kèm hạn, gấp nhất trước.',
        ],
        source: 'creator/workspace.ts',
      },
      {
        id: 'R5-3',
        epic: 'E7',
        roles: ['Nhãn hàng'],
        title: 'Bộ đếm việc của Nhãn hàng',
        story: 'Là Nhãn hàng, tôi muốn biết có bao nhiêu đề xuất mới, việc chờ mình, nháp chờ duyệt, khoản cần thanh toán.',
        criteria: ['Bốn số đếm: đề xuất mới · chờ Nhãn hàng · nháp chờ duyệt · cần thanh toán.'],
        source: '§7 (brandCounts)',
      },
      {
        id: 'R5-4',
        epic: 'E6',
        roles: ['Nhãn hàng', 'KOL', 'MCN'],
        title: 'Đánh giá sau hoàn tất',
        story: 'Là một bên của booking, tôi muốn chấm điểm bên kia sau khi hoàn tất.',
        criteria: [
          '1–5 sao (4814), mỗi bên một lần sau COMPLETED (4815).',
          'Không bên nào thấy đánh giá của bên kia; chưa hiển thị công khai.',
        ],
        source: '§5, §10',
      },
    ],
  },
];

export const ALL_STORIES: UserStory[] = RELEASES.flatMap((r) => r.stories);

export function epicName(key: EpicKey): string {
  return EPICS.find((e) => e.key === key)?.name ?? key;
}

/** Stories of a release involving `role` (all when null). */
export function storiesFor(release: Release, role: StoryRole | null): UserStory[] {
  return role ? release.stories.filter((s) => s.roles.includes(role)) : release.stories;
}
