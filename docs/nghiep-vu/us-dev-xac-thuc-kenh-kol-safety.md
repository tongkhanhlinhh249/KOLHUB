# User story cho Dev — Xác thực kênh bằng KOL Safety

| Mục | Giá trị |
|---|---|
| **Sản phẩm** | KOL Hub |
| **Tính năng** | Xác thực kênh bằng quét nội dung KOL Safety |
| **Tài liệu nghiệp vụ** | `docs/nghiep-vu/xac-thuc-kenh-kol-safety.md` (Draft v0.1) — mã BR/EC trỏ về tài liệu này |
| **US Product Design** | `docs/nghiep-vu/us-xac-thuc-kenh-kol-safety.md` — mã US-xx trỏ về tài liệu này |
| **Người nhận** | Dev FE, Dev BE, QA |
| **Phiên bản** | v0.1 · 08/10/2026 |

Bộ gồm 23 story dev (DEV-01 đến DEV-23), chia 9 nhóm, cộng 3 việc chung. Story kỹ thuật không có người dùng cụ thể thì viết theo vai "hệ thống KOL Hub". Mỗi story có: US design tương ứng, API và dữ liệu, tiêu chí chấp nhận (AC), quy tắc nghiệp vụ, và bảng task FE/BE có story point.

**Điểm chưa chốt:** dev làm theo **phương án tạm** ở bảng cuối mục US Product Design (giống phương án design đang vẽ). Mọi chỗ phụ thuộc phương án tạm đều đánh ⚠️ và nên để thành cấu hình hoặc hằng số, không viết cứng rải rác.

## 0. Tham chiếu kỹ thuật dùng chung

### Hằng số

| Tên | Giá trị | Nguồn |
|---|---|---|
| `SAFETY_REQUIRED.TIKTOK` | 20 | QĐ-03 |
| `SAFETY_REQUIRED.FACEBOOK` | 20 | QĐ-04 |
| `SAFETY_REQUIRED.INSTAGRAM` | 20 | QĐ-04 |
| `SAFETY_REQUIRED.YOUTUBE` | 5 | QĐ-05 |
| `SAFETY_SCAN_SECONDS` | 180 | QĐ-06 |
| `BADGE_VALIDITY` | 3 tháng | QĐ-12 · ⚠️ tháng lịch hay 90 ngày chưa chốt |
| `SNAPSHOT_TTL_DAYS` | 7 | BR-16 ⚠️ đề xuất |
| `RENEW_WINDOW_DAYS` | 14 | BR-29 ⚠️ đề xuất |
| `RENEW_REMIND_DAYS` | [14, 7, 1] | BR-29 ⚠️ đề xuất |

### Dữ liệu thêm mới

| Thực thể | Trường | Ghi chú |
|---|---|---|
| `Channel` | `platform` thêm `INSTAGRAM` | BR-13 |
| `Channel` | `status` thêm `SAFETY_PENDING` | BR-04 |
| `Channel` | `badgeExpiresAt` | Đã có, đổi cách tính sang `BADGE_VALIDITY` |
| `SafetyVerification` | `id, channelId, purpose (VERIFY \| RENEW), status (IN_PROGRESS \| PASSED \| FAILED \| EXPIRED \| CANCELLED), required, scanned, passed, snapshotAt, snapshotExpiresAt, reportUrl, checkedAt, pledgedAt` | Một kênh có tối đa 1 phiên `IN_PROGRESS` |
| `SafetyItem` | `verificationId, contentId, url, type (VIDEO \| PHOTO \| POST \| STORY \| NOTE), postedAt, thumbnailUrl, verdict (PENDING \| PASSED \| FAILED), reason, scannedSeconds, durationSeconds` | `reason` lưu nguyên văn từ KOL Safety (BR-19) |
| `SafetyWebhookEvent` | `eventId, receivedAt, payload, processedAt` | Chống xử lý trùng |

### Chuyển trạng thái kênh

| Từ | Sự kiện | Sang | Điều kiện |
|---|---|---|---|
| — | Thêm kênh | `SAFETY_PENDING` | Link hợp lệ, không trùng |
| `SAFETY_PENDING` | Phiên VERIFY đạt N/N | `PENDING_REVIEW` | Phiên chưa hết hạn |
| `PENDING_REVIEW` | Admin đánh giá Đạt | `VERIFIED` | `badgeExpiresAt = ngày duyệt + BADGE_VALIDITY` |
| `PENDING_REVIEW` | Admin đánh giá Cần bổ sung | `NEEDS_FIX` | Có lý do |
| `NEEDS_FIX` | Sửa ảnh, gửi lại | `PENDING_REVIEW` | ⚠️ đề xuất: giữ kết quả KOL Safety |
| `VERIFIED` | Phiên RENEW đạt N/N | `VERIFIED` | Hạn mới nối tiếp hạn cũ ⚠️ |
| `VERIFIED` | Quá `badgeExpiresAt` | `EXPIRED` | Job hằng ngày |
| `EXPIRED` | Phiên RENEW đạt N/N | `VERIFIED` | Hạn mới tính từ ngày đạt ⚠️ |
| `VERIFIED`, `EXPIRED`, `NEEDS_FIX` | Sửa link kênh | `SAFETY_PENDING` | ⚠️ đề xuất; huỷ phiên đang chạy |

"Sắp hết hạn" **không phải trạng thái lưu DB**. API tính từ `badgeExpiresAt` khi trả về (`expiringSoon = còn ≤ RENEW_WINDOW_DAYS ngày`).

### Mã lỗi mới (đề xuất)

| Mã | Khi nào | Thông báo | EC |
|---|---|---|---|
| KOLHUB-4202 | Link không thuộc nền tảng hỗ trợ (sửa câu) | Đề xuất: Chỉ hỗ trợ link kênh Facebook, Instagram, YouTube hoặc TikTok. | EC-01 |
| KOLHUB-4520 | Kênh chưa đủ N nội dung | Đề xuất: Kênh cần ít nhất 20 nội dung. Đăng thêm rồi xác thực lại. | EC-04 |
| KOLHUB-4521 | Chưa tick cam đoan | ⚠️ chưa có câu | EC-05 |
| KOLHUB-4522 | Kênh đã có phiên xác thực đang chạy | ⚠️ chưa có câu | — |
| KOLHUB-4523 | Phiên đã hết hạn | ⚠️ chưa có câu | EC-09 |
| KOLHUB-4524 | Kênh không ở trạng thái cho phép xác thực / gia hạn | ⚠️ chưa có câu | — |
| KOLHUB-4525 | Admin chọn Cần bổ sung mà không nhập lý do | ⚠️ chưa có câu | EC-10 |

Dải 4520–4529 là đề xuất, tránh dải 4510–4514 R7 đang dùng (sẽ gỡ ở DEV-23). Câu thông báo do BA chốt; dev đọc từ file thông báo lỗi chung, không viết cứng trong màn hình.

## A. Nền tảng và dữ liệu

### DEV-01 · Mô hình dữ liệu và máy trạng thái kênh

**[US] Là hệ thống KOL Hub, tôi muốn lưu trạng thái xác thực KOL Safety và phiên quét của từng kênh theo một máy trạng thái duy nhất, để mọi màn hình và API đọc cùng một nguồn sự thật.**

**Story point:** 5 · **US design:** nền cho tất cả

- **AC:**
  1. Có `SafetyVerification`, `SafetyItem`, trạng thái `SAFETY_PENDING` như mục 0.
  2. Mọi chuyển trạng thái đi qua một hàm/service duy nhất; chuyển sai bảng mục 0 thì trả KOLHUB-4524.
  3. Một kênh không có quá 1 phiên `IN_PROGRESS` (KOLHUB-4522).
  4. Unit test phủ mọi dòng của bảng chuyển trạng thái.
- **Quy tắc:** BR-01, BR-04, BR-17, BR-25

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-01.1 | BE | Bảng `safety_verification`, `safety_item`, trạng thái `SAFETY_PENDING`, migration schema | 2 |
| T-01.2 | BE | Service chuyển trạng thái kênh có kiểm điều kiện, unit test theo bảng mục 0 | 3 |

### DEV-02 · Hỗ trợ Instagram

**[US] Là KOL/MCN có kênh Instagram, tôi muốn thêm, xác thực và dùng kênh Instagram trong chiến dịch như các nền tảng khác, để không bị loại khỏi sàn chỉ vì nền tảng.**

**Story point:** 8 · **US design:** US-01 · C-03

- **AC:**
  1. Link `instagram.com/<tên>` được nhận diện là `INSTAGRAM`, chuẩn hoá giống các nền tảng khác (bỏ query, `/` cuối, chữ hoa).
  2. Instagram có mặt ở: bộ lọc nền tảng Tìm kiếm KOL, Sàn, Danh sách kênh; nền tảng và hạng mục chiến dịch (Bài đăng, Reels, Story); xác minh link bài đăng.
  3. KOLHUB-4202 dùng câu mới có Instagram.
- **Quy tắc:** BR-13 · NS-BR-20 · EC-01
- ⚠️ Danh sách hạng mục Instagram (Bài đăng, Reels, Story) là đề xuất.

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-02.1 | BE | Enum `INSTAGRAM`, nhận diện và chuẩn hoá link, test | 2 |
| T-02.2 | BE | Hạng mục chiến dịch Instagram, xác minh host `instagram.com` cho link bài đăng | 2 |
| T-02.3 | FE | Icon Instagram, thêm vào mọi bộ lọc nền tảng và form chiến dịch | 3 |
| T-02.4 | FE | Cập nhật câu KOLHUB-4202 | 1 |

### DEV-03 · Chuyển dữ liệu kênh đã xác thực hiện có

**[US] Là hệ thống KOL Hub, tôi muốn chuyển các kênh đã có dấu trước khi có tính năng này sang quy tắc mới theo một phương án đã chốt, để không kênh nào bị mất dấu bất ngờ hay giữ dấu không qua KOL Safety.**

**Story point:** 3 · **US design:** —

- **AC:**
  1. Chạy thử (dry-run) ra báo cáo: số kênh `VERIFIED` theo nền tảng, số kênh sẽ đổi hạn.
  2. Chạy thật theo phương án chốt, ghi log từng kênh, chạy lại không gây sai lệch.
- **Quy tắc:** BR-25
- ⚠️ **Chưa chốt và chưa có trong tài liệu nghiệp vụ:** kênh đang có dấu thì (a) giữ dấu tới hạn cũ rồi gia hạn qua KOL Safety, (b) rút hạn còn tối đa 3 tháng, hay (c) bắt quét KOL Safety ngay. Dev tạm làm (a), cần BA chốt trước khi chạy thật.

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-03.1 | BE | Script chuyển dữ liệu theo phương án chốt, chạy lại an toàn | 2 |
| T-03.2 | BE | Chế độ dry-run và báo cáo số kênh bị ảnh hưởng | 1 |

## B. Tích hợp KOL Safety

### DEV-04 · Tạo phiên xác thực và mở KOL Safety

**[US] Là KOL/MCN, tôi muốn bấm "Mở KOL Safety" là hệ thống chốt danh sách nội dung cần quét và đưa tôi sang KOL Safety đã đăng nhập sẵn, để không phải đăng ký lại hay chọn nội dung.**

**Story point:** 5 · **US design:** US-03, US-04, US-05, US-08

- **API:** `POST /channels/{id}/safety-verifications` body `{ purpose: VERIFY | RENEW, pledged: true }` → `{ verification, launchUrl }`
- **AC:**
  1. Chỉ chủ kênh gọi được. Kênh phải ở trạng thái cho phép theo `purpose` (KOLHUB-4524).
  2. `pledged` khác `true` → KOLHUB-4521. Lưu `pledgedAt`.
  3. Lấy N nội dung mới nhất từ KOL Safety; ít hơn N → KOLHUB-4520, không tạo phiên.
  4. Tạo phiên `IN_PROGRESS` với `snapshotAt`, `snapshotExpiresAt = snapshotAt + SNAPSHOT_TTL_DAYS`, lưu N `SafetyItem` trạng thái `PENDING`.
  5. `launchUrl` chứa token dùng một lần, hết hạn sau 10 phút ⚠️ (đề xuất), kèm link kênh đã chuẩn hoá và `purpose`.
- **Quy tắc:** BR-08, BR-16, BR-20, BR-40 · EC-04, EC-05
- ⚠️ Phụ thuộc KOL Safety có API trả N nội dung mới nhất của kênh (điểm chưa chốt 1, 2). Nếu KOL phải tự dán link, story này phải viết lại.

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-04.1 | BE | API tạo phiên: kiểm quyền, trạng thái, cam đoan, lấy và chốt N nội dung | 3 |
| T-04.2 | BE | Token dùng một lần và `launchUrl` sang KOL Safety | 2 |

### DEV-05 · Nhận kết quả quét qua webhook

**[US] Là hệ thống KOL Hub, tôi muốn nhận kết quả quét từng nội dung từ KOL Safety ngay khi có, để tiến độ và trạng thái kênh luôn đúng mà KOL không phải tải lại.**

**Story point:** 5 · **US design:** US-06, US-07

- **API:** `POST /integrations/kol-safety/webhook` · payload theo mục 8 tài liệu nghiệp vụ
- **AC:**
  1. Kiểm chữ ký của KOL Safety; sai chữ ký → 401, không ghi gì.
  2. Cùng `eventId` gửi lại nhiều lần chỉ xử lý một lần.
  3. Cập nhật `SafetyItem` (verdict, reason nguyên văn, giây đã quét, thời lượng) và `scanned`, `passed` của phiên.
  4. Đủ N/N đạt và phiên chưa hết hạn: phiên `PASSED`; `VERIFY` → kênh `PENDING_REVIEW`, `RENEW` → gia hạn (DEV-15).
  5. Kết quả về cho phiên đã `EXPIRED` hoặc `CANCELLED`: lưu lại nhưng không đổi trạng thái kênh.
  6. Phát sự kiện nội bộ cho thông báo (DEV-12).
- **Quy tắc:** BR-07, BR-14, BR-17, BR-19

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-05.1 | BE | Endpoint webhook, kiểm chữ ký, chống xử lý trùng theo `eventId` | 2 |
| T-05.2 | BE | Cập nhật tiến độ, chuyển trạng thái phiên và kênh, phát sự kiện | 2 |
| T-05.3 | BE | Log và cảnh báo khi webhook lỗi hoặc payload sai | 1 |

### DEV-06 · Đối soát khi lỡ webhook

**[US] Là KOL/MCN, tôi muốn bấm "Làm mới" khi kết quả chưa cập nhật, để không bị kẹt chỉ vì một lần gửi kết quả bị lỗi.**

**Story point:** 3 · **US design:** US-06

- **API:** `POST /safety-verifications/{id}/refresh` → gọi `GET verification-status?channelUrl=` của KOL Safety
- **AC:**
  1. Kết quả từ refresh đi qua cùng logic cập nhật của DEV-05.
  2. Giới hạn 1 lần mỗi 30 giây cho mỗi phiên ⚠️ (đề xuất).
  3. Job đối soát mỗi giờ cho phiên `IN_PROGRESS` không có cập nhật quá 1 giờ ⚠️ (đề xuất).
- **Quy tắc:** EC-08

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-06.1 | BE | API refresh gọi KOL Safety, dùng chung logic cập nhật, giới hạn tần suất | 1 |
| T-06.2 | BE | Job đối soát định kỳ | 1 |
| T-06.3 | FE | Nút Làm mới, trạng thái đang làm mới | 1 |

## C. KOL/MCN — Xác thực lần đầu

### DEV-07 · Thêm kênh vào trạng thái chờ KOL Safety

**[US] Là KOL/MCN, tôi muốn thêm kênh và thấy ngay lỗi nếu link hay ảnh không hợp lệ, để kênh vào đúng hàng chờ xác thực KOL Safety.**

**Story point:** 3 · **US design:** US-01

- **AC:**
  1. Nhận diện nền tảng ngay khi dán link, hiện icon.
  2. Lỗi EC-01, EC-02, EC-03 hiện dưới ô nhập, câu từ file thông báo lỗi.
  3. Kênh mới tạo có trạng thái `SAFETY_PENDING` (không còn vào thẳng `PENDING_REVIEW`).
- **Quy tắc:** BR-04 · EC-01, EC-02, EC-03

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-07.1 | FE | Sheet Thêm kênh: nhận diện nền tảng khi nhập, lỗi inline | 2 |
| T-07.2 | BE | Kênh mới vào `SAFETY_PENDING` | 1 |

### DEV-08 · Danh sách Quản lý kênh có trạng thái xác thực

**[US] Là KOL/MCN có nhiều kênh, tôi muốn danh sách kênh hiện trạng thái, tiến độ và hạn của từng kênh kèm tab lọc có số đếm, để biết kênh nào cần xử lý.**

**Story point:** 5 · **US design:** US-02, US-06

- **API:** `GET /me/channels?tab=` → mỗi kênh có `status, expiringSoon, badgeExpiresAt, verification { status, required, scanned, passed, snapshotExpiresAt }`, kèm `counts` theo tab
- **AC:**
  1. 7 tab: Tất cả · Chờ KOL Safety · Chờ duyệt · Cần bổ sung · Đã xác thực · Sắp hết hạn · Hết hạn. Số đếm đúng.
  2. Badge đủ 9 biến thể theo bảng trạng thái của bộ US design.
  3. Tab lưu trên URL; có trạng thái trống, đang tải, lỗi.
- **Quy tắc:** BR-01, BR-04, BR-06, BR-25

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-08.1 | BE | API danh sách kênh kèm tiến độ, `expiringSoon`, số đếm theo tab | 2 |
| T-08.2 | FE | Dòng kênh: badge 9 biến thể, tiến độ x/N, nút hành động chính | 2 |
| T-08.3 | FE | Tab lọc trên URL, trạng thái trống / đang tải / lỗi | 1 |

### DEV-09 · Hộp "Xác thực trên KOL Safety"

**[US] Là KOL/MCN, tôi muốn xem quy tắc và danh sách nội dung sẽ quét, cam đoan rồi mở KOL Safety ngay trong một hộp, để xác thực kênh mà không phải đoán mình còn thiếu gì.**

**Story point:** 5 · **US design:** US-03, US-04, US-05, US-08

- **AC:**
  1. Hiện quy tắc đúng nền tảng (đọc từ `SAFETY_REQUIRED`, không viết cứng số).
  2. Hiện danh sách N nội dung; video có `durationSeconds > SAFETY_SCAN_SECONDS` có nhãn "Chỉ kiểm tra 3 phút đầu".
  3. Chưa tick cam đoan thì nút khoá. Bấm nút → gọi DEV-04 → mở `launchUrl` ở tab mới.
  4. Trình duyệt chặn tab mới → hiện link để KOL bấm mở lại.
  5. KOLHUB-4520 → hiện trạng thái chưa đủ nội dung (hiện có / cần).
- **Quy tắc:** BR-08, BR-09, BR-10, BR-11, BR-18, BR-40 · EC-04, EC-05

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-09.1 | FE | Hộp xác thực: quy tắc theo nền tảng, danh sách N nội dung, nhãn 3 phút | 2 |
| T-09.2 | FE | Cam đoan, gọi API, mở tab mới, xử lý tab bị chặn | 2 |
| T-09.3 | FE | Trạng thái chưa đủ nội dung | 1 |

### DEV-10 · Chi tiết kênh: nội dung đã quét

**[US] Là KOL/MCN, tôi muốn xem từng nội dung đã quét, kết quả và lý do nguyên văn, để biết cần gỡ hay chỉnh nội dung nào.**

**Story point:** 3 · **US design:** US-07

- **API:** `GET /safety-verifications/{id}/items?verdict=`
- **AC:**
  1. Mỗi nội dung có ảnh thu nhỏ, loại, ngày đăng, kết quả, lý do nguyên văn, link báo cáo KOL Safety.
  2. Lọc "Chỉ nội dung chưa đạt".
  3. FE hiển thị `reason` y như nhận được, không cắt sửa nội dung (chỉ được rút gọn hiển thị và có "Xem thêm").
- **Quy tắc:** BR-07, BR-19 · EC-07

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-10.1 | BE | API danh sách nội dung của phiên, lọc theo kết quả | 1 |
| T-10.2 | FE | Danh sách nội dung, lý do nguyên văn, lọc, link báo cáo | 2 |

### DEV-11 · Hạn của danh sách đã chốt

**[US] Là KOL/MCN quét dở, tôi muốn biết danh sách đã chốt còn bao lâu và được lấy danh sách mới khi hết hạn, để không quét vào một danh sách đã hết giá trị.**

**Story point:** 2 · **US design:** US-09

- **AC:**
  1. Job đánh dấu phiên `IN_PROGRESS` quá `snapshotExpiresAt` thành `EXPIRED`; kênh giữ `SAFETY_PENDING`.
  2. FE hiện đếm ngược; phiên `EXPIRED` hiện lý do và nút "Xác thực lại" (tạo phiên mới qua DEV-04).
- **Quy tắc:** BR-16 · EC-09
- ⚠️ Toàn bộ story phụ thuộc điểm chưa chốt 2.

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-11.1 | BE | Job hết hạn phiên | 1 |
| T-11.2 | FE | Đếm ngược, trạng thái hết hạn, nút Xác thực lại | 1 |

### DEV-12 · Thông báo trong app và email

**[US] Là KOL/MCN, tôi muốn nhận thông báo trong app và email khi kênh đạt KOL Safety, được duyệt, bị yêu cầu bổ sung, được gia hạn hoặc sắp hết hạn, để không phải vào kiểm tra liên tục.**

**Story point:** 5 · **US design:** US-10, US-14

- **AC:**
  1. 5 loại: Đạt KOL Safety · Đã xác thực · Cần bổ sung (kèm lý do) · Đã gia hạn · Sắp hết hạn (14/7/1 ngày).
  2. Mỗi thông báo có tên kênh, nền tảng, deep link mở đúng chi tiết kênh.
  3. Mỗi mốc nhắc chỉ gửi một lần cho mỗi kênh, kể cả khi job chạy lại.
- **Quy tắc:** BR-17, BR-23, BR-29

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-12.1 | BE | Sinh thông báo trong app từ sự kiện, chống gửi trùng | 2 |
| T-12.2 | BE | 5 mẫu email | 2 |
| T-12.3 | FE | Mục thông báo mới trong chuông và trang Thông báo, deep link | 1 |

## D. Admin vận hành

### DEV-13 · Hàng chờ duyệt kênh và đánh giá

**[US] Là Admin vận hành, tôi muốn xem hàng chờ kênh đã đạt KOL Safety và đánh giá Đạt hoặc Cần bổ sung, để cấp dấu xác thực cho đúng chủ sở hữu.**

**Story point:** 5 · **US design:** US-11, US-12

- **API:** `GET /admin/channels/review-queue` · `POST /admin/channels/{id}/review { result: APPROVED | NEEDS_FIX, reason? }`
- **AC:**
  1. Hàng chờ chỉ gồm kênh `PENDING_REVIEW`, xếp chờ lâu nhất trước, kèm kết quả KOL Safety (N/N, ngày quét, link báo cáo).
  2. `NEEDS_FIX` không có lý do → KOLHUB-4525.
  3. `APPROVED` → `VERIFIED`, `badgeExpiresAt = ngày duyệt + BADGE_VALIDITY`.
  4. Mỗi đánh giá phát sự kiện cho DEV-12.
- **Quy tắc:** BR-05, BR-21, BR-22, BR-23 · EC-10

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-13.1 | BE | API hàng chờ và chi tiết kèm kết quả KOL Safety | 2 |
| T-13.2 | BE | API đánh giá, bắt buộc lý do, tính hạn dấu | 1 |
| T-13.3 | FE | Console Admin: hàng chờ, chi tiết, form đánh giá | 2 |

### DEV-14 · Sửa kênh: ảnh khác link

**[US] Là KOL/MCN, tôi muốn sửa ảnh quản lý mà không phải quét lại, và được cảnh báo khi sửa link, để không mất dấu xác thực vì một chỉnh sửa nhỏ.**

**Story point:** 3 · **US design:** US-13, US-18

- **AC:**
  1. Sửa ảnh ở `NEEDS_FIX` → `PENDING_REVIEW`, giữ phiên KOL Safety đã `PASSED`.
  2. Sửa link ở `VERIFIED`, `EXPIRED`, `NEEDS_FIX` → `SAFETY_PENDING`, xoá `badgeExpiresAt`, huỷ phiên đang chạy (`CANCELLED`).
  3. FE hiện hộp xác nhận trước khi gửi thay đổi link; sheet sửa hiện lý do Admin nếu có.
- **Quy tắc:** BR-24
- ⚠️ Phụ thuộc điểm chưa chốt 5.

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-14.1 | BE | Quy tắc sửa ảnh và sửa link, huỷ phiên | 2 |
| T-14.2 | FE | Hộp xác nhận đổi link, lý do Admin trên sheet | 1 |

## E. Gia hạn mỗi 3 tháng

### DEV-15 · Gia hạn kênh

**[US] Là KOL/MCN, tôi muốn gia hạn kênh bằng một lần quét lại N nội dung gần nhất, để giữ dấu thêm 3 tháng mà không chờ Admin.**

**Story point:** 5 · **US design:** US-15

- **AC:**
  1. Mở gia hạn khi kênh `VERIFIED` còn ≤ `RENEW_WINDOW_DAYS` ngày, hoặc `EXPIRED`. Ngoài khoảng đó → KOLHUB-4524.
  2. Phiên `RENEW` đạt N/N: kênh `VERIFIED`, không qua Admin.
  3. Hạn mới: còn hạn → `badgeExpiresAt cũ + BADGE_VALIDITY`; đã hết hạn → `ngày đạt + BADGE_VALIDITY` ⚠️.
  4. Gia hạn trượt khi còn hạn: kênh giữ dấu tới `badgeExpiresAt` cũ ⚠️.
  5. FE dùng lại hộp DEV-09 với biến thể Gia hạn, hiện hạn mới khi thành công.
- **Quy tắc:** BR-26, BR-30 · ⚠️ điểm chưa chốt 6

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-15.1 | BE | Phiên RENEW, tính hạn mới, giữ dấu khi trượt, bỏ bước Admin | 3 |
| T-15.2 | FE | Biến thể Gia hạn của hộp xác thực, kết quả thành công và chưa đạt | 2 |

### DEV-16 · Job hết hạn dấu xác thực

**[US] Là hệ thống KOL Hub, tôi muốn tự chuyển kênh quá hạn sang Hết hạn và phát lời nhắc đúng mốc, để kênh hết hạn không còn hiện với Nhãn hàng.**

**Story point:** 3 · **US design:** US-14, US-16

- **AC:**
  1. Job hằng ngày: `VERIFIED` quá `badgeExpiresAt` → `EXPIRED`; phát sự kiện nhắc ở mốc `RENEW_REMIND_DAYS`.
  2. Kênh `EXPIRED` có booking đã chốt vẫn thao tác được trong booking đó; chặn booking mới (DEV-21).
  3. FE hiện trạng thái Hết hạn, hậu quả, và ghi chú nếu có booking đang chạy.
- **Quy tắc:** BR-27, BR-31 · EC-11
- ⚠️ BR-31 là đề xuất.

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-16.1 | BE | Job chuyển `EXPIRED`, phát nhắc theo mốc, chạy lại an toàn | 2 |
| T-16.2 | FE | Trạng thái Hết hạn, ghi chú booking đang chạy | 1 |

### DEV-17 · Khối "Kênh đã xác thực" ở Tổng quan hồ sơ

**[US] Là KOL/MCN, tôi muốn thấy ở Tổng quan hồ sơ số kênh đã xác thực, sắp hết hạn và đang chờ, để biết việc cần làm ngay khi đăng nhập.**

**Story point:** 3 · **US design:** US-17

- **API:** `GET /me/channels/summary` → số đếm theo trạng thái + tối đa 5 kênh cần xử lý
- **AC:**
  1. Khối mới thay khối "Badge Xác thực Kol.gov.vn".
  2. Bấm kênh mở chi tiết kênh.
- **Quy tắc:** BR-01, BR-25

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-17.1 | BE | API tóm tắt | 1 |
| T-17.2 | FE | Khối Tổng quan, 4 trạng thái | 2 |

## F. Nhãn hàng/Agency

### DEV-18 · Dấu xác thực theo kênh và chú thích phạm vi

**[US] Là Nhãn hàng, tôi muốn thấy dấu xác thực, hạn và phạm vi kiểm tra trên từng kênh, để chọn kênh và tự đánh giá rủi ro.**

**Story point:** 3 · **US design:** US-19, US-20

- **AC:**
  1. Tìm kiếm KOL, hồ sơ công khai, Danh sách kênh chỉ dùng kênh `VERIFIED`, đang hoạt động, `badgeExpiresAt` chưa qua.
  2. Mỗi kênh công khai trả `badgeExpiresAt`; không trả `SafetyItem` hay điểm từng nội dung.
  3. Tooltip/popover phạm vi kiểm tra chạy được bằng rê chuột và chạm.
- **Quy tắc:** BR-33, BR-34, BR-35, BR-37 · NS-BR-54, NS-BR-58

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-18.1 | BE | Lọc tìm kiếm và dữ liệu kênh công khai theo hạn mới, trả `badgeExpiresAt` | 1 |
| T-18.2 | FE | Dấu theo kênh ở 4 chỗ, tooltip/popover | 2 |

### DEV-19 · Kênh hết hạn trong Danh sách đã lưu

**[US] Là Nhãn hàng, tôi muốn KOL đã lưu vẫn còn trong danh sách khi kênh hết hạn, để không mất danh sách đã chọn.**

**Story point:** 1 · **US design:** US-21

- **AC:** KOL vẫn ở trong danh sách, hiện "Kênh hết hạn xác thực"; không mời được qua kênh hết hạn.
- **Quy tắc:** BR-28 · NS-BR-62

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-19.1 | FE | Trạng thái kênh hết hạn trong Danh sách đã lưu | 1 |

### DEV-20 · Cảnh báo nháp dài hơn 3 phút

**[US] Là Nhãn hàng duyệt nháp, tôi muốn được nhắc khi video dài hơn 3 phút, để tự xem phần không được kiểm tra.**

**Story point:** 2 · **US design:** US-22

- **AC:**
  1. Nháp có `durationSeconds > SAFETY_SCAN_SECONDS` hiện cảnh báo cạnh nút Duyệt, tô vùng 0:00–3:00 trên thanh thời gian.
  2. Không có thời lượng thì không hiện cảnh báo.
- **Quy tắc:** BR-38
- ⚠️ Phụ thuộc điểm chưa chốt 11.

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-20.1 | BE | Lưu thời lượng và số giây đã quét của nháp | 1 |
| T-20.2 | FE | Cảnh báo và tô vùng thanh thời gian | 1 |

## G. Dùng kênh trong booking

### DEV-21 · Chỉ chọn được kênh hợp lệ

**[US] Là KOL/MCN, tôi muốn chỉ chọn được kênh còn hạn khi ứng tuyển hoặc nhận lời mời và thấy lý do kênh bị khoá, để không bị báo lỗi lúc gửi.**

**Story point:** 3 · **US design:** US-23

- **AC:**
  1. BE kiểm tại ứng tuyển, sửa đề xuất, giao kênh, chốt: kênh phải `VERIFIED`, đang hoạt động, chưa quá `badgeExpiresAt`, đúng nền tảng; sai → KOLHUB-4809.
  2. FE hiện kênh không hợp lệ ở trạng thái khoá kèm lý do (chưa xác thực / hết hạn / tắt / sai nền tảng) và link xử lý.
- **Quy tắc:** BR-36 · EC-12

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-21.1 | BE | Kiểm kênh hợp lệ theo hạn mới ở mọi điểm dùng kênh | 1 |
| T-21.2 | FE | Danh sách kênh có trạng thái khoá và lý do | 2 |

## H. MCN

### DEV-22 · Lọc kênh sắp hết hạn theo KOL

**[US] Là MCN, tôi muốn lọc kênh sắp hết hạn hoặc chưa xác thực theo từng KOL, để giao việc gia hạn cho đúng người.**

**Story point:** 2 · **US design:** US-24

- **AC:**
  1. Bộ lọc trạng thái kết hợp được với `?kol=` đang có.
  2. Quản lý KOL có cột số kênh sắp hết hạn.
- **Quy tắc:** BR-03, BR-29

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-22.1 | BE | Lọc kết hợp, đếm kênh sắp hết hạn theo KOL | 1 |
| T-22.2 | FE | Bộ lọc và cột mới | 1 |

## I. Dọn phần R7 cũ

### DEV-23 · Gỡ Khiên An toàn và Badge cấp tài khoản

**[US] Là hệ thống KOL Hub, tôi muốn gỡ phần Khiên An toàn, bật/tắt KOL Safety, gói Miễn phí/Bảo vệ và Badge cấp tài khoản, để không còn hai cơ chế xác thực chồng nhau.**

**Story point:** 3 · **US design:** —

- **AC:**
  1. Không còn màn, menu, API của R7-1, R7-2, R7-3, R7-5. Link cũ chuyển về Quản lý kênh.
  2. Gỡ mã lỗi 4510–4514 khỏi file thông báo lỗi.
  3. R7-4 (khiếu nại) giữ nguyên cho tới khi chốt điểm chưa chốt 4.
- **Quy tắc:** mục 9 tài liệu nghiệp vụ

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| T-23.1 | FE | Gỡ màn, menu, khối Badge, chuyển hướng link cũ | 2 |
| T-23.2 | BE | Gỡ API, mã lỗi và dữ liệu R7 | 1 |

## Việc chung

| Mã task | Loại | Việc | Point |
|---|---|---|---|
| C-01 | BE | Giả lập KOL Safety (stub) cho môi trường dev/QA: trả N nội dung, gửi webhook theo kịch bản Đạt / Không đạt / Chưa đủ nội dung | 3 |
| C-02 | QA | Kịch bản kiểm thử end-to-end: xác thực lần đầu, Admin duyệt, gia hạn còn hạn, gia hạn khi hết hạn, sửa link | 3 |
| C-03 | FE + BE | Dự phòng sửa lỗi sau UAT | 5 |

## Chia task và story point

**Thang điểm:** Fibonacci (1, 2, 3, 5, 8), ước lượng cho dev **mid-level**. 1 point ≈ nửa ngày công, đã gồm unit test và tự kiểm. Story 8 point (DEV-02) đã được chia thành các task không quá 3 point.

| Point | Quy mô | Ví dụ |
|---|---|---|
| 1 | Sửa nhỏ trên API hoặc màn đã có | Cột mới, job đơn giản |
| 2 | Một API mới, hoặc một thành phần FE có vài trạng thái | API đánh giá, Sheet Thêm kênh |
| 3 | Logic nghiệp vụ có nhiều nhánh, hoặc thành phần FE dùng ở nhiều nơi | Service chuyển trạng thái, tạo phiên |
| 5 | Story trọn gói FE + BE có tích hợp hoặc nhiều quy tắc | Webhook, gia hạn |
| 8 | Story chạm nhiều module | Instagram |

### Tổng hợp theo nhóm

| Nhóm | Story | FE | BE | Tổng |
|---|---|---|---|---|
| A. Nền tảng và dữ liệu | DEV-01, DEV-02, DEV-03 | 4 | 12 | 16 |
| B. Tích hợp KOL Safety | DEV-04, DEV-05, DEV-06 | 1 | 12 | 13 |
| C. KOL/MCN — Xác thực lần đầu | DEV-07, DEV-08, DEV-09, DEV-10, DEV-11, DEV-12 | 14 | 9 | 23 |
| D. Admin vận hành | DEV-13, DEV-14 | 3 | 5 | 8 |
| E. Gia hạn mỗi 3 tháng | DEV-15, DEV-16, DEV-17 | 5 | 6 | 11 |
| F. Nhãn hàng/Agency | DEV-18, DEV-19, DEV-20 | 4 | 2 | 6 |
| G. Dùng kênh trong booking | DEV-21 | 2 | 1 | 3 |
| H. MCN | DEV-22 | 1 | 1 | 2 |
| I. Dọn phần R7 cũ | DEV-23 | 2 | 1 | 3 |
| Việc chung (gồm 3 QA, 5 dự phòng) | C-01, C-02, C-03 | — | 3 | 11 |
| **Tổng** | | **36** | **52** | **96** |

Ngoài phần trên còn 3 point QA (C-02) và 5 point dự phòng chia FE + BE (C-03). FE 36 point, BE 52 point. Với 1 point ≈ nửa ngày công, team 1 FE + 1 BE mid-level (khoảng 20 point mỗi người mỗi sprint 2 tuần) cần khoảng **2.6 sprint** cho phần việc của mình, chưa tính dự phòng; BE là phần nặng hơn và nằm trên đường găng vì FE cần API và stub KOL Safety (C-01) trước.

### Chia đợt

| Đợt | Story | Point | Kết quả |
|---|---|---|---|
| Đợt 1 | DEV-01, DEV-02, DEV-03, DEV-04, DEV-05, DEV-06, DEV-07, DEV-08, DEV-09, DEV-10, DEV-11, DEV-12, DEV-13, DEV-14, DEV-18, DEV-21, DEV-23 · C-01 | 72 | Đi trọn luồng xác thực lần đầu: thêm kênh (có Instagram) → quét KOL Safety → Admin duyệt → Nhãn hàng thấy dấu theo kênh, chọn kênh hợp lệ trong booking; gỡ R7 |
| Đợt 2 | DEV-15, DEV-16, DEV-17, DEV-19, DEV-20, DEV-22 · C-02, C-03 | 24 | Gia hạn, hết hạn, Tổng quan hồ sơ, Danh sách đã lưu, cảnh báo nháp, lọc MCN, kiểm thử E2E và dự phòng |

**Thứ tự trong đợt 1:** DEV-01 và C-01 trước (nền dữ liệu và stub KOL Safety), rồi DEV-04, DEV-05 song song với FE DEV-07 đến DEV-10 chạy trên stub.

### Phụ thuộc cần gỡ trước khi bắt đầu

| # | Phụ thuộc | Story bị chặn | Ai gỡ |
|---|---|---|---|
| 1 | KOL Safety có API trả N nội dung mới nhất của kênh, và webhook theo payload mục 8 | DEV-04, DEV-05, DEV-06 | Đội KOL Safety |
| 2 | Cách liên kết tài khoản (token dùng một lần) | DEV-04 | Đội KOL Safety + BE KOL Hub |
| 3 | Phương án cho kênh đã xác thực hiện có | DEV-03 | BA / anh Trọng |
| 4 | "3 tháng" là tháng lịch hay 90 ngày; hạn mới khi gia hạn | DEV-13, DEV-15 | BA |
| 5 | Câu thông báo cho KOLHUB-4520 đến 4525 | DEV-04, DEV-09, DEV-13 | BA |

Ước lượng chưa tính phần làm lại nếu các điểm chưa chốt đổi khác phương án tạm. Rủi ro lớn nhất là phụ thuộc 1: nếu KOL Safety không trả được danh sách N nội dung mà KOL phải tự dán link, DEV-04, DEV-09, DEV-10 tăng thêm khoảng 5–8 point.
