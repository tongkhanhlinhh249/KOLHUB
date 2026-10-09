# User story cho Product Design — Xác thực kênh bằng KOL Safety

| Mục | Giá trị |
|---|---|
| **Sản phẩm** | KOL Hub |
| **Tính năng** | Xác thực kênh bằng quét nội dung KOL Safety |
| **Tài liệu nghiệp vụ** | `docs/nghiep-vu/xac-thuc-kenh-kol-safety.md` (Draft v0.1) — mã BR/EC trong file này trỏ về tài liệu đó |
| **Người nhận** | Product Design |
| **Phiên bản** | v0.1 · 08/10/2026 |

Bộ story gồm 24 user story, chia 6 nhóm theo vai trò, kèm phần chia task và story point ở cuối. Mỗi story có: màn hình cần thiết kế, trạng thái cần vẽ, tiêu chí chấp nhận (AC) và quy tắc nghiệp vụ liên quan. Story nào còn phụ thuộc điểm chưa chốt thì có dòng ⚠️, design nên vẽ theo phương án đề xuất và để chỗ dễ đổi.

## Bảng trạng thái hiển thị của kênh

Đây là bộ trạng thái dùng chung cho badge, tab lọc và nút hành động chính. Design cần vẽ đủ các biến thể dưới đây, nhất quán ở mọi màn có dòng kênh.

| Trạng thái | Ý nghĩa với chủ kênh | Thông tin phụ trên dòng kênh | Nút hành động chính | Nhãn hàng có thấy kênh không |
|---|---|---|---|---|
| Chờ xác thực KOL Safety (chưa bắt đầu) | Kênh vừa thêm, chưa quét | Quy tắc nền tảng: "Cần 20 nội dung gần nhất đạt" | Xác thực trên KOL Safety | Không |
| Chờ xác thực KOL Safety (đang quét) | Đã chốt danh sách, đang quét dở | Tiến độ "14/20 đạt" · hạn danh sách "còn 5 ngày" | Tiếp tục quét | Không |
| Chờ xác thực KOL Safety (có nội dung không đạt) | Có nội dung trượt | "3 nội dung chưa đạt" | Xem nội dung chưa đạt | Không |
| Chờ duyệt | Đạt KOL Safety, chờ Admin xét chủ sở hữu | "Đạt KOL Safety 20/20 · gửi ngày dd/mm" | — | Không |
| Cần bổ sung | Admin yêu cầu sửa ảnh/link | Lý do của Admin | Sửa và gửi lại | Không |
| Đã xác thực | Có dấu, đang hiệu lực | "Hết hạn dd/mm/yyyy" | — | Có |
| Đã xác thực · sắp hết hạn | Còn ≤ 14 ngày | "Còn 7 ngày" | Gia hạn | Có |
| Hết hạn | Quá hạn, chưa gia hạn | "Hết hạn từ dd/mm/yyyy" | Gia hạn | Không (trừ Danh sách đã lưu) |
| Tắt hoạt động (kết hợp với trạng thái trên) | Chủ kênh tự tắt kênh | Công tắc Hoạt động ở trạng thái tắt | Bật lại | Không |

## A. KOL/MCN — Thêm kênh và theo dõi xác thực

### US-01 · Thêm kênh, gồm cả Instagram

**[US] Là KOL/MCN, tôi muốn thêm kênh TikTok, Facebook, Instagram hoặc YouTube bằng link và ảnh quản lý kênh, để bắt đầu xác thực kênh đó trên KOL Hub.**

**Story point:** 2

- **Màn hình:** Quản lý kênh › Sheet Thêm kênh
- **Trạng thái cần vẽ:** form trống · đã nhận diện nền tảng (hiện icon nền tảng cạnh ô link) · lỗi link sai nền tảng (EC-01) · lỗi link trùng (EC-02) · lỗi ảnh (EC-03) · đang lưu · thêm thành công
- **AC:**
  1. Dán link xong, hệ thống tự nhận diện và hiện icon nền tảng. Instagram được hỗ trợ như 3 nền tảng còn lại.
  2. Lỗi hiện ngay dưới ô nhập, câu chữ theo bảng EC.
  3. Thêm thành công, kênh xuất hiện trong danh sách với trạng thái "Chờ xác thực KOL Safety" và nút "Xác thực trên KOL Safety".
- **Quy tắc:** BR-04, BR-13 · EC-01, EC-02, EC-03
- ⚠️ Câu lỗi EC-01 cần thêm "Instagram", đang chờ chốt.

### US-02 · Xem trạng thái xác thực của từng kênh

**[US] Là KOL/MCN có nhiều kênh, tôi muốn thấy trạng thái xác thực, tiến độ quét và hạn của từng kênh trên một danh sách, để biết kênh nào cần tôi xử lý tiếp.**

**Story point:** 5

- **Màn hình:** Quản lý kênh (danh sách)
- **Trạng thái cần vẽ:** mọi trạng thái ở bảng trên · danh sách trống ("Chưa có kênh nào") · đang tải (skeleton) · lỗi tải
- **AC:**
  1. Mỗi dòng kênh hiện: icon nền tảng, tên/link kênh, badge trạng thái, thông tin phụ, nút hành động chính.
  2. Tab lọc có số đếm: Tất cả · Chờ KOL Safety · Chờ duyệt · Cần bổ sung · Đã xác thực · Sắp hết hạn · Hết hạn.
  3. Kênh cần chủ kênh làm gì đó (đang quét dở, có nội dung chưa đạt, cần bổ sung, sắp hết hạn, hết hạn) được làm nổi hơn kênh đang ổn.
- **Quy tắc:** BR-01, BR-04, BR-06, BR-25

### US-03 · Hiểu quy tắc trước khi xác thực

**[US] Là KOL/MCN, tôi muốn biết trước kênh của tôi cần bao nhiêu nội dung đạt và KOL Safety kiểm tra những gì, để không tốn token quét những kênh chắc chắn chưa đủ điều kiện.**

**Story point:** 5

- **Màn hình:** Hộp "Xác thực trên KOL Safety"
- **Trạng thái cần vẽ:** TikTok (20 video) · Facebook/Instagram (20 nội dung, gồm ảnh, bài viết, story, ghi chú) · YouTube (5 video, gồm video thường và Shorts)
- **AC:**
  1. Hiện đúng quy tắc của nền tảng kênh đang xác thực, không hiện quy tắc của nền tảng khác.
  2. Hiện danh sách N nội dung gần nhất sẽ được quét (ảnh thu nhỏ, loại nội dung, ngày đăng, thời lượng nếu là video).
  3. Video dài hơn 3 phút có nhãn "Chỉ kiểm tra 3 phút đầu".
  4. Có một dòng ghi rõ: token tính và trừ trên KOL Safety.
- **Quy tắc:** BR-08, BR-09, BR-10, BR-11, BR-18
- ⚠️ Chưa rõ KOL Safety tự lấy danh sách N nội dung, hay KOL phải tự dán link từng nội dung. Design vẽ theo phương án hệ thống tự lấy.

### US-04 · Cam đoan trách nhiệm nội dung

**[US] Là KOL/MCN, tôi muốn được thông báo rõ phạm vi KOL Safety kiểm tra và xác nhận phần trách nhiệm của mình, để không hiểu nhầm rằng dấu xác thực bảo đảm toàn bộ nội dung.**

**Story point:** 1

- **Màn hình:** Hộp "Xác thực trên KOL Safety" và hộp "Gia hạn"
- **Trạng thái cần vẽ:** chưa tick (nút "Mở KOL Safety" bị khoá) · đã tick (nút mở)
- **AC:**
  1. Ô cam đoan nằm ngay trên nút "Mở KOL Safety", không nằm khuất trong phần cuộn.
  2. Chưa tick thì nút bị khoá (EC-05).
  3. Câu cam đoan đề xuất: "Tôi hiểu KOL Safety chỉ kiểm tra 3 phút đầu của mỗi video. Tôi chịu trách nhiệm về toàn bộ nội dung trên kênh, kể cả phần không được kiểm tra."
- **Quy tắc:** BR-39, BR-40 · EC-05
- ⚠️ Câu cam đoan đang chờ pháp chế duyệt.

### US-05 · Mở KOL Safety mà không phải đăng ký lại

**[US] Là KOL/MCN, tôi muốn bấm một nút là sang KOL Safety, đã đăng nhập sẵn và đúng kênh cần quét, để không phải tạo tài khoản mới hay nhập lại link kênh.**

**Story point:** 2

- **Màn hình:** Hộp "Xác thực trên KOL Safety" → tab mới KOL Safety · trạng thái chờ ở KOL Hub
- **Trạng thái cần vẽ:** đang chuyển sang KOL Safety · trình duyệt chặn tab mới (cung cấp link mở lại) · đã mở (KOL Hub hiện "Đang quét trên KOL Safety, kết quả sẽ tự cập nhật")
- **AC:**
  1. KOL Safety mở trong tab mới, KOL Hub vẫn giữ nguyên màn đang xem.
  2. Quay lại KOL Hub, dòng kênh đã chuyển sang trạng thái "đang quét".
- **Quy tắc:** BR-16, BR-20
- ⚠️ Cách liên kết tài khoản hai hệ thống chưa chốt.

### US-06 · Theo dõi tiến độ quét

**[US] Là KOL/MCN, tôi muốn thấy kênh đã đạt bao nhiêu trên số nội dung cần, để biết còn bao xa nữa mới được xác thực.**

**Story point:** 3

- **Màn hình:** Quản lý kênh (dòng kênh) · Chi tiết kênh
- **Trạng thái cần vẽ:** 0/20 · đang quét (14/20) · đủ 20/20 · chưa nhận được kết quả (EC-08, nút "Làm mới") · đang làm mới
- **AC:**
  1. Tiến độ hiện dạng "x/N đạt" kèm thanh tiến độ, ở cả dòng kênh lẫn chi tiết kênh.
  2. Có hạn của danh sách đã chốt ("còn 5 ngày").
  3. Có nút "Làm mới" khi kết quả chưa về.
- **Quy tắc:** BR-14, BR-16, BR-17 · EC-08

### US-07 · Xem nội dung chưa đạt và lý do

**[US] Là KOL/MCN, tôi muốn xem nội dung nào chưa đạt và vì sao, để gỡ hoặc chỉnh đúng nội dung đó rồi quét lại.**

**Story point:** 5

- **Màn hình:** Chi tiết kênh › danh sách nội dung đã quét
- **Trạng thái cần vẽ:** danh sách lẫn Đạt / Không đạt / Chưa quét · lọc "Chỉ nội dung chưa đạt" · một nội dung có lý do dài
- **AC:**
  1. Mỗi nội dung hiện: ảnh thu nhỏ, loại, ngày đăng, kết quả, và lý do nguyên văn do KOL Safety trả về.
  2. Có link "Xem chi tiết trên KOL Safety" cho từng nội dung.
  3. Phía trên danh sách có hướng dẫn: "3 nội dung chưa đạt. Gỡ hoặc chỉnh rồi quét lại." (câu đề xuất, EC-07).
  4. KOL Hub không tự diễn giải hay đổi lời lý do.
- **Quy tắc:** BR-07, BR-15, BR-19 · EC-07
- ⚠️ Nơi KOL khiếu nại kết quả "Không đạt" chưa chốt. Design chừa chỗ cho nút "Khiếu nại".

### US-08 · Kênh chưa đủ số nội dung

**[US] Là KOL/MCN có kênh mới, tôi muốn biết ngay khi kênh chưa đủ số nội dung tối thiểu, để đăng thêm trước khi xác thực thay vì quét rồi mới biết.**

**Story point:** 1

- **Màn hình:** Hộp "Xác thực trên KOL Safety"
- **Trạng thái cần vẽ:** kênh có 8/20 nội dung (TikTok) · 3/5 video (YouTube)
- **AC:**
  1. Không cho mở KOL Safety, hiện số nội dung hiện có so với số cần.
  2. Câu đề xuất: "Kênh cần ít nhất 20 nội dung. Đăng thêm rồi xác thực lại." (EC-04)
- **Quy tắc:** BR-08 · EC-04
- ⚠️ Chưa chốt có ngoại lệ cho KOC nhỏ hay không.

### US-09 · Danh sách nội dung đã chốt hết hạn

**[US] Là KOL/MCN quét dở, tôi muốn được báo trước khi danh sách nội dung đã chốt hết hạn, để quét xong kịp hoặc biết phải lấy danh sách mới.**

**Story point:** 2

- **Màn hình:** Quản lý kênh · Chi tiết kênh
- **Trạng thái cần vẽ:** còn ≥ 3 ngày · còn 1 ngày (nổi bật) · đã hết hạn (EC-09, nút "Xác thực lại")
- **AC:**
  1. Hiện đếm ngược hạn của danh sách đã chốt.
  2. Khi hết hạn, tiến độ cũ không còn giá trị; hiện rõ lý do và nút lấy danh sách mới.
- **Quy tắc:** BR-16 · EC-09
- ⚠️ Cơ chế chốt danh sách và hạn 7 ngày đang chờ KOL Safety đồng ý.

### US-10 · Nhận thông báo kết quả

**[US] Là KOL/MCN, tôi muốn nhận thông báo khi kênh đạt KOL Safety, khi Admin duyệt xong, hoặc khi kênh bị yêu cầu bổ sung, để không phải vào kiểm tra liên tục.**

**Story point:** 3

- **Màn hình:** Chuông Thông báo · trang Thông báo · email
- **Trạng thái cần vẽ:** 4 loại thông báo: Đạt KOL Safety (chuyển Chờ duyệt) · Đã xác thực · Cần bổ sung · Đã gia hạn
- **AC:**
  1. Mỗi thông báo có tên kênh, icon nền tảng, và bấm vào thì mở đúng chi tiết kênh.
  2. Thông báo Cần bổ sung có kèm lý do của Admin.
- **Quy tắc:** BR-17, BR-23

## B. Admin vận hành

### US-11 · Xem kênh chờ duyệt kèm kết quả KOL Safety

**[US] Là Admin vận hành, tôi muốn thấy kênh chờ duyệt kèm kết quả KOL Safety đã đạt, để chỉ tập trung xác minh chủ sở hữu kênh.**

**Story point:** 3

- **Màn hình:** Console Admin › Hàng chờ duyệt kênh
- **Trạng thái cần vẽ:** hàng chờ có dữ liệu · trống · đang tải
- **AC:**
  1. Mỗi kênh hiện: chủ kênh (KOL/MCN, ID), link, ảnh quản lý kênh, "Đạt KOL Safety N/N · ngày quét", link báo cáo KOL Safety.
  2. Hàng chờ xếp kênh chờ lâu nhất lên trước.
- **Quy tắc:** BR-05, BR-21

### US-12 · Đánh giá Đạt hoặc Cần bổ sung

**[US] Là Admin vận hành, tôi muốn đánh giá kênh Đạt hoặc Cần bổ sung kèm lý do, để chủ kênh biết chính xác cần sửa gì.**

**Story point:** 2

- **Màn hình:** Console Admin › Chi tiết kênh chờ duyệt
- **Trạng thái cần vẽ:** chọn Đạt · chọn Cần bổ sung khi chưa nhập lý do (EC-10, nút lưu bị khoá) · đã lưu
- **AC:**
  1. Cần bổ sung bắt buộc nhập lý do.
  2. Lưu xong, kênh rời hàng chờ và chủ kênh nhận thông báo (US-10).
- **Quy tắc:** BR-22, BR-23 · EC-10

### US-13 · Chủ kênh sửa theo yêu cầu bổ sung

**[US] Là KOL/MCN có kênh bị yêu cầu bổ sung, tôi muốn xem lý do và sửa ngay trên kênh đó, để gửi lại mà không phải quét KOL Safety lại từ đầu.**

**Story point:** 2

- **Màn hình:** Quản lý kênh › Sheet Sửa kênh
- **Trạng thái cần vẽ:** sửa ảnh quản lý (gửi lại thẳng sang Chờ duyệt) · sửa link (cảnh báo phải quét lại, xem US-18)
- **AC:**
  1. Lý do của Admin hiện ở đầu sheet.
  2. Chỉ sửa ảnh thì gửi lại về Chờ duyệt, giữ kết quả KOL Safety.
- **Quy tắc:** BR-24
- ⚠️ Quy tắc sửa ảnh không cần quét lại là đề xuất, chưa chốt.

## C. KOL/MCN — Gia hạn mỗi 3 tháng

### US-14 · Được nhắc trước khi hết hạn

**[US] Là KOL/MCN, tôi muốn được nhắc trước khi dấu xác thực kênh hết hạn, để gia hạn kịp và không bị ẩn khỏi tìm kiếm.**

**Story point:** 3

- **Màn hình:** Chuông Thông báo · email · banner ở Tổng quan hồ sơ · dòng kênh ở Quản lý kênh
- **Trạng thái cần vẽ:** còn 14 ngày · còn 7 ngày · còn 1 ngày (mức nổi bật tăng dần)
- **AC:**
  1. Nhắc ở 3 mốc 14, 7, 1 ngày trước hạn.
  2. Mọi lời nhắc có nút "Gia hạn" mở thẳng hộp gia hạn của đúng kênh.
- **Quy tắc:** BR-25, BR-29
- ⚠️ Mốc 14/7/1 là đề xuất.

### US-15 · Gia hạn kênh

**[US] Là KOL/MCN, tôi muốn gia hạn kênh bằng cách quét lại các nội dung gần nhất, để giữ dấu xác thực thêm 3 tháng mà không phải chờ Admin duyệt lại.**

**Story point:** 3

- **Màn hình:** Hộp "Gia hạn" (dùng lại khung hộp "Xác thực trên KOL Safety")
- **Trạng thái cần vẽ:** gia hạn khi còn hạn · gia hạn khi đã hết hạn · đang quét · gia hạn thành công (hiện hạn mới) · gia hạn chưa đạt
- **AC:**
  1. Hộp gia hạn nói rõ: đây là lần xác thực lại, xét N nội dung gần nhất **tại thời điểm này**.
  2. Có ô cam đoan như US-04.
  3. Thành công thì hiện ngày hết hạn mới, không qua bước Admin.
- **Quy tắc:** BR-26, BR-30, BR-40
- ⚠️ Chưa chốt: hạn mới nối tiếp hạn cũ hay tính lại từ ngày gia hạn; gia hạn sớm mà trượt thì có giữ dấu tới hết hạn cũ không. Design vẽ theo đề xuất (nối tiếp hạn cũ, giữ dấu tới hết hạn cũ).

### US-16 · Biết hậu quả khi kênh hết hạn

**[US] Là KOL/MCN có kênh đã hết hạn, tôi muốn biết kênh đang bị ảnh hưởng thế nào, để quyết định gia hạn ngay.**

**Story point:** 2

- **Màn hình:** Quản lý kênh · Chi tiết kênh · Tổng quan hồ sơ
- **Trạng thái cần vẽ:** kênh Hết hạn · kênh Hết hạn có booking đang chạy
- **AC:**
  1. Ghi rõ hậu quả: kênh không hiện trong tìm kiếm và không nhận lời mời hay ứng tuyển mới.
  2. Nếu có booking đang chạy trên kênh, ghi rõ booking đó vẫn tiếp tục.
  3. Có nút "Gia hạn".
- **Quy tắc:** BR-27, BR-31 · EC-11
- ⚠️ Booking đang chạy được tiếp tục là đề xuất.

### US-17 · Xem tổng quan xác thực ở Tổng quan hồ sơ

**[US] Là KOL/MCN, tôi muốn thấy ngay ở Tổng quan hồ sơ có bao nhiêu kênh đã xác thực, bao nhiêu sắp hết hạn và bao nhiêu đang chờ, để biết việc cần làm mà không phải mở từng kênh.**

**Story point:** 3

- **Màn hình:** Tổng quan hồ sơ › khối "Kênh đã xác thực" (thay khối "Badge Xác thực Kol.gov.vn" cũ)
- **Trạng thái cần vẽ:** chưa có kênh · có kênh chờ xác thực · có kênh sắp hết hạn · tất cả kênh đều ổn
- **AC:**
  1. Hiện số kênh đã xác thực trên tổng số kênh, kèm danh sách ngắn những kênh cần xử lý.
  2. Bấm một kênh thì mở chi tiết kênh đó.
- **Quy tắc:** BR-01, BR-25

### US-18 · Sửa link kênh đã xác thực

**[US] Là KOL/MCN, tôi muốn được cảnh báo trước khi sửa link của kênh đã xác thực, để không vô tình làm mất dấu xác thực.**

**Story point:** 1

- **Màn hình:** Sheet Sửa kênh › hộp xác nhận
- **Trạng thái cần vẽ:** hộp xác nhận khi đổi link · sau khi đổi (kênh về Chờ xác thực KOL Safety)
- **AC:**
  1. Đổi link thì hiện hộp xác nhận ghi rõ: kênh sẽ mất dấu, phải xác thực KOL Safety và chờ Admin duyệt lại.
  2. Chỉ đổi ảnh thì không hiện cảnh báo này.
- **Quy tắc:** BR-24
- ⚠️ Đề xuất, chưa chốt.

## D. Nhãn hàng/Agency

### US-19 · Thấy dấu xác thực và hạn của từng kênh

**[US] Là Nhãn hàng, tôi muốn thấy kênh nào của KOL đã được xác thực và còn hạn đến khi nào, để chọn đúng kênh an toàn khi mời hợp tác.**

**Story point:** 3

- **Màn hình:** Tìm kiếm KOL (thẻ KOL) · Hồ sơ KOL (danh sách kênh) · Danh sách kênh · kênh trong đề xuất của KOL/MCN
- **Trạng thái cần vẽ:** kênh có dấu · KOL có nhiều kênh, chỉ một số có dấu
- **AC:**
  1. Dấu xác thực gắn theo từng kênh, không gắn theo tên KOL.
  2. Hồ sơ KOL chỉ hiện kênh đã xác thực còn hạn.
- **Quy tắc:** BR-33, BR-34

### US-20 · Hiểu phạm vi kiểm tra của dấu xác thực

**[US] Là Nhãn hàng, tôi muốn biết dấu xác thực kiểm tra những gì, để tự đánh giá rủi ro với phần không được kiểm tra.**

**Story point:** 1

- **Màn hình:** Tooltip hoặc popover của dấu xác thực (mọi chỗ ở US-19)
- **Trạng thái cần vẽ:** desktop (rê chuột) · điện thoại (chạm)
- **AC:**
  1. Câu đề xuất: "Đã kiểm tra bởi KOL Safety: 3 phút đầu của mỗi video trong N nội dung gần nhất. Phần sau phút thứ 3 không được kiểm tra. Hiệu lực đến dd/mm/yyyy."
  2. Nhãn hàng không thấy kết quả quét của từng nội dung.
- **Quy tắc:** BR-35, BR-37
- ⚠️ Câu chú thích và việc có cho xem kết quả từng nội dung hay không đang chờ chốt.

### US-21 · KOL đã lưu có kênh hết hạn

**[US] Là Nhãn hàng, tôi muốn vẫn thấy KOL trong Danh sách đã lưu dù kênh của họ đã hết hạn xác thực, để không mất danh sách đã dày công chọn và biết lúc nào họ xác thực lại.**

**Story point:** 1

- **Màn hình:** Danh sách đã lưu
- **Trạng thái cần vẽ:** KOL có mọi kênh hết hạn · KOL còn ít nhất 1 kênh hợp lệ
- **AC:**
  1. KOL vẫn nằm trong danh sách, hiện trạng thái "Kênh hết hạn xác thực".
  2. Không mời được KOL qua kênh đã hết hạn.
- **Quy tắc:** BR-28

### US-22 · Cảnh báo khi duyệt nháp dài hơn 3 phút

**[US] Là Nhãn hàng duyệt nháp trong booking, tôi muốn được nhắc khi video dài hơn 3 phút, để tự xem phần KOL Safety không kiểm tra trước khi duyệt.**

**Story point:** 2

- **Màn hình:** Chi tiết booking › Duyệt nháp · Nội dung chiến dịch
- **Trạng thái cần vẽ:** nháp ≤ 3 phút (không cảnh báo) · nháp > 3 phút (có cảnh báo, tô vùng đã kiểm tra trên thanh thời gian)
- **AC:**
  1. Câu đề xuất: "Video dài 8:12. KOL Safety chỉ kiểm tra 0:00–3:00, vui lòng tự xem phần còn lại trước khi duyệt."
  2. Cảnh báo nằm cạnh nút "Duyệt".
- **Quy tắc:** BR-38
- ⚠️ Chưa chốt nháp trong booking có quét qua KOL Safety hay không.

## E. KOL/MCN — Dùng kênh trong booking

### US-23 · Chỉ chọn được kênh hợp lệ khi ứng tuyển hoặc nhận lời mời

**[US] Là KOL/MCN, tôi muốn thấy kênh nào dùng được cho chiến dịch và vì sao kênh khác không dùng được, để chọn đúng kênh mà không bị báo lỗi lúc gửi.**

**Story point:** 3

- **Màn hình:** Hộp Ứng tuyển (Sàn) · Nhận lời mời › giao kênh
- **Trạng thái cần vẽ:** kênh hợp lệ (chọn được) · kênh chưa xác thực / hết hạn / tắt hoạt động / sai nền tảng (khoá, kèm lý do ngắn và link "Gia hạn" hoặc "Xác thực")
- **AC:**
  1. Kênh không hợp lệ vẫn hiện trong danh sách nhưng bị khoá, kèm lý do.
  2. Nếu vẫn gửi được kênh không hợp lệ (dữ liệu cũ), hiện lỗi EC-12 nguyên văn.
- **Quy tắc:** BR-36 · EC-12

## F. MCN

### US-24 · Quản lý xác thực của nhiều kênh

**[US] Là MCN quản lý nhiều kênh giao cho nhiều KOL, tôi muốn lọc nhanh các kênh sắp hết hạn hoặc chưa xác thực theo từng KOL, để phân việc gia hạn và xác thực cho đúng người.**

**Story point:** 2

- **Màn hình:** Quản lý kênh (MCN) · Quản lý KOL
- **Trạng thái cần vẽ:** lọc "Sắp hết hạn" kết hợp lọc theo KOL · Quản lý KOL có cột số kênh sắp hết hạn
- **AC:**
  1. Bộ lọc trạng thái xác thực kết hợp được với bộ lọc chủ sở hữu đang có (Kênh riêng MCN / từng KOL).
  2. Dòng KOL ở Quản lý KOL hiện số kênh sắp hết hạn của KOL đó.
- **Quy tắc:** BR-03, BR-29

## Điểm chưa chốt ảnh hưởng tới thiết kế

| # | Điểm chưa chốt | Story bị ảnh hưởng | Phương án design vẽ tạm |
|---|---|---|---|
| 1 | KOL Safety tự lấy danh sách N nội dung hay KOL tự dán link | US-03, US-06, US-07 | Hệ thống tự lấy |
| 2 | Có chốt danh sách N nội dung và hạn 7 ngày không | US-06, US-09 | Có chốt, hạn 7 ngày |
| 3 | Kênh ít hơn N nội dung có ngoại lệ không | US-08 | Chặn, hướng dẫn đăng thêm |
| 4 | KOL khiếu nại kết quả "Không đạt" ở đâu | US-07 | Chừa chỗ nút "Khiếu nại" |
| 5 | Sửa ảnh có phải quét lại không, sửa link thì sao | US-13, US-18 | Sửa ảnh: không; sửa link: có |
| 6 | Hạn mới khi gia hạn sớm, giữ dấu khi gia hạn trượt | US-15 | Nối tiếp hạn cũ, giữ dấu tới hết hạn cũ |
| 7 | Mốc nhắc gia hạn | US-14 | 14 · 7 · 1 ngày |
| 8 | Booking đang chạy khi kênh hết hạn | US-16 | Vẫn tiếp tục |
| 9 | Câu cam đoan, câu chú thích, câu lỗi Instagram | US-01, US-04, US-20 | Dùng câu đề xuất |
| 10 | Nhãn hàng có xem kết quả từng nội dung không | US-20 | Không |
| 11 | Nháp trong booking có quét KOL Safety không | US-22 | Có, chỉ 3 phút đầu |

## Chia task và story point

**Thang điểm:** Fibonacci (1, 2, 3, 5, 8), ước lượng cho Product Designer **mid-level**. 1 point ≈ nửa ngày công, đã gồm bản desktop và mobile. Task nào lên 8 point phải chia nhỏ thêm.

| Point | Quy mô | Ví dụ trong bộ này |
|---|---|---|
| 1 | Một trạng thái hoặc một thành phần nhỏ trên màn đã có | Ô cam đoan, tooltip |
| 2 | Một màn/hộp đơn giản, hoặc vài trạng thái của một màn | Sheet Thêm kênh có Instagram |
| 3 | Một màn có nhiều trạng thái, hoặc một mẫu dùng ở nhiều nơi | Khối Tổng quan, mẫu thông báo |
| 5 | Một màn chính có danh sách, lọc và đủ trạng thái rỗng / tải / lỗi | Danh sách Quản lý kênh |

### Việc chung

| Mã task | Việc | Point |
|---|---|---|
| C-01 | Luồng tổng thể xác thực lần đầu, Admin duyệt và gia hạn (user flow trên FigJam), rà màn Quản lý kênh và Tổng quan hiện có | 3 |
| C-02 | Component dùng chung trong design system: badge 9 trạng thái kênh, thanh tiến độ x/N, đếm ngược hạn | 3 |
| C-03 | Thêm icon Instagram vào bộ icon nền tảng, rà mọi bộ lọc và hạng mục có danh sách nền tảng | 2 |
| C-04 | Review với PO và chỉnh sửa vòng 1 | 3 |
| C-05 | Bàn giao cho dev: ghi chú trạng thái, quy tắc hiển thị, review cùng dev | 3 |
| | **Cộng** | **14** |

### A. KOL/MCN — Thêm kênh và theo dõi xác thực

| Mã task | Story | Việc | Point |
|---|---|---|---|
| T-01.1 | US-01 | Thêm Instagram vào Sheet Thêm kênh, hiện icon nền tảng khi nhận diện link | 1 |
| T-01.2 | US-01 | Trạng thái lỗi EC-01, EC-02, EC-03, đang lưu, thêm thành công | 1 |
| T-02.1 | US-02 | Thiết kế lại dòng kênh: badge trạng thái, thông tin phụ, nút hành động chính | 2 |
| T-02.2 | US-02 | Tab lọc 7 tab có số đếm | 1 |
| T-02.3 | US-02 | Trạng thái trống, đang tải, lỗi tải và bản mobile của danh sách | 2 |
| T-03.1 | US-03 | Khung hộp "Xác thực trên KOL Safety", thiết kế để dùng lại cho hộp Gia hạn | 2 |
| T-03.2 | US-03 | Biến thể quy tắc cho 4 nền tảng | 1 |
| T-03.3 | US-03 | Danh sách N nội dung: ảnh thu nhỏ, loại, ngày đăng, thời lượng, nhãn "Chỉ kiểm tra 3 phút đầu" | 2 |
| T-04.1 | US-04 | Ô cam đoan và trạng thái khoá/mở của nút "Mở KOL Safety" | 1 |
| T-05.1 | US-05 | Trạng thái chờ ở KOL Hub sau khi mở KOL Safety | 1 |
| T-05.2 | US-05 | Trường hợp trình duyệt chặn tab mới | 1 |
| T-06.1 | US-06 | Thanh tiến độ x/N ở dòng kênh và chi tiết kênh, kèm hạn danh sách | 2 |
| T-06.2 | US-06 | Trạng thái chưa nhận kết quả, nút Làm mới, đang làm mới | 1 |
| T-07.1 | US-07 | Chi tiết kênh: danh sách nội dung đã quét với 3 kết quả Đạt / Không đạt / Chưa quét | 3 |
| T-07.2 | US-07 | Lọc nội dung chưa đạt, lý do dài, link sang KOL Safety, chừa chỗ nút Khiếu nại | 2 |
| T-08.1 | US-08 | Trạng thái kênh chưa đủ số nội dung (TikTok, YouTube) | 1 |
| T-09.1 | US-09 | Đếm ngược hạn danh sách đã chốt, 2 mức nổi bật | 1 |
| T-09.2 | US-09 | Trạng thái danh sách hết hạn và nút Xác thực lại | 1 |
| T-10.1 | US-10 | 4 mẫu thông báo trong app | 1 |
| T-10.2 | US-10 | 4 mẫu email | 2 |
| | | **Cộng** | **29** |

### B. Admin vận hành

| Mã task | Story | Việc | Point |
|---|---|---|---|
| T-11.1 | US-11 | Console Admin: hàng chờ duyệt kênh kèm kết quả KOL Safety | 2 |
| T-11.2 | US-11 | Trạng thái trống, đang tải | 1 |
| T-12.1 | US-12 | Chi tiết kênh chờ duyệt: đánh giá Đạt / Cần bổ sung, bắt buộc lý do | 2 |
| T-13.1 | US-13 | Sheet Sửa kênh có lý do của Admin ở đầu, luồng gửi lại | 2 |
| | | **Cộng** | **7** |

### C. KOL/MCN — Gia hạn mỗi 3 tháng

| Mã task | Story | Việc | Point |
|---|---|---|---|
| T-14.1 | US-14 | Banner Tổng quan và dòng kênh ở 3 mức nhắc 14 · 7 · 1 ngày | 2 |
| T-14.2 | US-14 | Mẫu thông báo và email nhắc gia hạn | 1 |
| T-15.1 | US-15 | Biến thể Gia hạn của hộp xác thực: còn hạn, đã hết hạn | 2 |
| T-15.2 | US-15 | Kết quả gia hạn thành công (hạn mới) và chưa đạt | 1 |
| T-16.1 | US-16 | Trạng thái kênh Hết hạn, hậu quả, trường hợp có booking đang chạy | 2 |
| T-17.1 | US-17 | Khối "Kênh đã xác thực" ở Tổng quan hồ sơ với 4 trạng thái | 3 |
| T-18.1 | US-18 | Hộp xác nhận khi đổi link kênh đã xác thực | 1 |
| | | **Cộng** | **12** |

### D. Nhãn hàng/Agency

| Mã task | Story | Việc | Point |
|---|---|---|---|
| T-19.1 | US-19 | Dấu xác thực theo kênh ở thẻ KOL (Tìm kiếm) và Hồ sơ KOL | 2 |
| T-19.2 | US-19 | Dấu xác thực ở Danh sách kênh và kênh trong đề xuất | 1 |
| T-20.1 | US-20 | Tooltip/popover phạm vi kiểm tra, bản desktop và mobile | 1 |
| T-21.1 | US-21 | Trạng thái "Kênh hết hạn xác thực" trong Danh sách đã lưu | 1 |
| T-22.1 | US-22 | Cảnh báo nháp dài hơn 3 phút, tô vùng đã kiểm tra trên thanh thời gian | 2 |
| | | **Cộng** | **7** |

### E. KOL/MCN — Dùng kênh trong booking

| Mã task | Story | Việc | Point |
|---|---|---|---|
| T-23.1 | US-23 | Danh sách kênh trong hộp Ứng tuyển: kênh bị khoá kèm lý do và link xử lý | 2 |
| T-23.2 | US-23 | Bước giao kênh khi nhận lời mời, cùng quy tắc khoá | 1 |
| | | **Cộng** | **3** |

### F. MCN

| Mã task | Story | Việc | Point |
|---|---|---|---|
| T-24.1 | US-24 | Lọc trạng thái xác thực kết hợp lọc chủ sở hữu ở Quản lý kênh MCN | 1 |
| T-24.2 | US-24 | Cột số kênh sắp hết hạn ở Quản lý KOL | 1 |
| | | **Cộng** | **2** |

### Tổng hợp

| Nhóm | Point |
|---|---|
| Việc chung | 14 |
| A. KOL/MCN — Thêm kênh và theo dõi xác thực | 29 |
| B. Admin vận hành | 7 |
| C. KOL/MCN — Gia hạn mỗi 3 tháng | 12 |
| D. Nhãn hàng/Agency | 7 |
| E. KOL/MCN — Dùng kênh trong booking | 3 |
| F. MCN | 2 |
| **Tổng** | **74** |

Với 1 point ≈ nửa ngày công, tổng 74 point tương đương khoảng 37 ngày công của một designer mid-level, tức khoảng 3.7 sprint 2 tuần nếu làm toàn thời gian (khoảng 20 point mỗi sprint).

**Đề xuất chia đợt** để dev bắt đầu sớm:

| Đợt | Story | Point | Kết quả |
|---|---|---|---|
| Đợt 1 | US-01…08, US-10…13, US-19, US-20, US-23 · C-01, C-02, C-03, C-05 | 52 | Đi trọn luồng xác thực lần đầu: thêm kênh → quét KOL Safety → Admin duyệt → Nhãn hàng thấy dấu |
| Đợt 2 | US-09, US-14…18, US-21, US-22, US-24 · C-04 | 22 | Gia hạn 3 tháng, hết hạn, MCN, cảnh báo nháp |

Ước lượng này chưa tính phần phải vẽ lại nếu các điểm chưa chốt (bảng phía trên) đổi khác phương án vẽ tạm. Nặng nhất là điểm 1 và 2: nếu KOL phải tự dán link từng nội dung, US-03 và US-07 tăng thêm khoảng 3–5 point.
