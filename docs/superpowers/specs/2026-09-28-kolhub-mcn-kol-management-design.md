# KOL Hub — MCN quản lý KOL và Kênh riêng MCN

Ngày: 2026-09-28 · Trạng thái: đã làm Đợt 1 (dữ liệu, dịch vụ, màn MCN "Quản lý KOL", thẻ "MCN quản lý" của KOL) và Đợt 2 (chủ sở hữu kênh trong "Quản lý kênh" của MCN).

Yêu cầu: "MCN sẽ phải quản lý cả Danh sách KOL + các Kênh riêng của MCN phát triển không gán KOL".
Trước đây liên kết KOL–MCN nằm ngoài phạm vi (xem `2026-09-27-kolhub-user-prototype-design.md` §Không làm và `2026-09-28-kolhub-role-switch-unified-profile-design.md` §3); nay **đưa vào phạm vi**.

## 1. Dữ liệu

- `McnKolLink { id, mcnAccountId, kolAccountId, status: PENDING | ACTIVE | DECLINED | ENDED, invitedAt, respondedAt?, endedAt?, endedBy?: 'MCN' | 'KOL' }` — `DemoState.mcnKolLinks` (`services/mcn-kol-types.ts`).
- `Channel.assignedKolAccountId?` — chỉ dùng cho kênh của MCN. Không có giá trị = **Kênh riêng MCN**.
- DB_VERSION 7 (dữ liệu cũ được thay bằng seed).

## 2. Quy tắc

| # | Quy tắc | Mã lỗi |
|---|---|---|
| R1 | Chỉ MCN **đã duyệt** mới mời KOL. | KOLHUB-4701 |
| R2 | Mời bằng KOL ID (không phân biệt hoa thường) hoặc email đăng nhập của KOL; ô trống bị chặn. | KOLHUB-4702 |
| R3 | Chỉ mời KOL **đã duyệt, có KOL ID**; tài khoản không tồn tại / chưa duyệt / không phải KOL đều báo chung một lỗi. | KOLHUB-4703 |
| R4 | Không trùng: đã có lời mời đang chờ từ MCN này / KOL đang do MCN này quản lý. | KOLHUB-4704 / 4705 |
| R5 | Một KOL có **tối đa một MCN ACTIVE**: không mời được KOL đang thuộc MCN khác; KOL đang có MCN không chấp nhận được lời mời khác (phải rời trước). | KOLHUB-4706 / 4708 |
| R6 | MCN huỷ lời mời PENDING (bản ghi bị **xoá** vì quan hệ chưa bắt đầu); MCN kết thúc liên kết ACTIVE → ENDED (endedBy MCN). | KOLHUB-4707 khi sai trạng thái / không phải của mình |
| R7 | KOL chấp nhận / từ chối lời mời PENDING; rời MCN (ACTIVE → ENDED, endedBy KOL). | KOLHUB-4707 |
| R8 | Khi KOL chấp nhận một lời mời, các lời mời PENDING khác của KOL tự chuyển **DECLINED**. | — |
| R9 | Mời lại sau DECLINED/ENDED được: tạo bản ghi mới; danh sách của MCN chỉ hiện bản ghi mới nhất mỗi KOL. | — |
| R10 | Chỉ gán kênh MCN cho KOL đang ACTIVE với chính MCN đó; kênh phải thuộc MCN. `null` = trả về Kênh riêng MCN. | KOLHUB-4709 / 4710 |
| R11 | Kết thúc / rời liên kết → mọi kênh MCN đã gán cho KOL đó trở về Kênh riêng MCN. | — |
| R12 | Kênh MCN vẫn thuộc MCN (xác thực, bật/tắt, KOL Safety…); gán chỉ là thông tin quản lý nội bộ, **không** cộng follower vào hồ sơ KOL và không hiện với Nhãn hàng. | — |

## 3. Màn hình (Đợt 1)

- **MCN → "Quản lý KOL"** (`/ho-so-mcn/kol`, nhóm "Hồ sơ MCN", chỉ MCN; trên điện thoại nằm đầu mục "Thêm"). Trang riêng (không có đầu trang Hồ sơ).
  Thanh lọc chung (tìm tên / KOL ID, Lĩnh vực, Sắp xếp) + tab Đang quản lý / Chờ xác nhận / Đã kết thúc (gồm Đã từ chối) có số đếm; trạng thái lọc ở URL (`?tab=cho-xac-nhan&q=&linh-vuc=&sap-xep=`).
  Mỗi dòng: avatar, tên, KOL ID, lĩnh vực · khu vực, tổng follower các kênh xác thực của KOL, "N kênh MCN" (khi đang quản lý), trạng thái + ngày.
  Menu ⋯: Xem kênh được gán (`/ho-so-mcn/kenh?kol=<KOL ID>`) · Kết thúc quản lý (xác nhận) — hoặc Huỷ lời mời (xác nhận).
  "Mời KOL" mở hộp thoại nhập KOL ID/email; MCN chưa duyệt thấy thông báo và nút bị khoá.
- **KOL → Thông tin liên hệ**: thẻ "MCN quản lý" phía trên nội dung: lời mời chờ (Chấp nhận / Từ chối) hoặc MCN hiện tại (Rời MCN, có xác nhận). Không có gì thì không hiện thẻ.

## 4. Seed

Sao Việt Media (saoviet@demo.kolhub.vn) quản lý KOL-2026-0011…0016; 6/12 kênh được gán (ch-01, 06 → 0011; 02 → 0012; 04 → 0013; 05 → 0014; 09 → 0015; 0016 chưa có kênh), 6 kênh còn lại là Kênh riêng MCN. Có một lời mời chờ gửi Khánh Vy (khanhvy@demo.kolhub.vn) để demo luồng Chấp nhận; Khánh Vy không thuộc MCN nào khi bắt đầu.

## 5. Quyết định khác

- Không gửi thông báo email/SMS cho lời mời (chỉ hiện trong hồ sơ KOL); có thể thêm sau qua noticeInbox.
- Không cho KOL xem danh sách kênh MCN gán cho mình, chỉ hiện số kênh.
- **Nhãn hàng:** bộ lọc BR-55 "thuộc MCN" và thông tin MCN trên hồ sơ KOL công khai **vẫn ẩn** ở đợt này.

## 6. Đợt 2 — chủ sở hữu kênh trong "Quản lý kênh" của MCN

- Dòng kênh (ChannelRow dùng chung, không tách bản riêng): dưới link hiện trạng thái duyệt + chủ sở hữu — "KOL: <tên>" (avatar nhỏ) hoặc "Kênh riêng MCN".
- Bộ lọc "Chủ sở hữu" cạnh các tab trạng thái: Tất cả / Kênh riêng MCN / từng KOL đang quản lý (A → Z, kèm số kênh). URL `?kol=rieng` hoặc `?kol=<KOL ID>`; kết hợp với `?trangThai=`; số đếm trên tab trạng thái tính theo chủ sở hữu đang chọn. KOL ID không còn được quản lý → danh sách rỗng + "Xem tất cả chủ sở hữu".
- Menu ⋯ của dòng: "Gán cho KOL" / "Đổi KOL được gán" (hộp thoại chọn Kênh riêng MCN hoặc một KOL ACTIVE) và "Chuyển về Kênh riêng MCN" (thực hiện ngay, toast có Hoàn tác).
- "Chi tiết kênh" (OwnerChannelSheet): mục "Chủ sở hữu" với cùng thông tin và nút Gán / Đổi KOL / Bỏ gán.
- Kênh gán cho KOL đã kết thúc (dữ liệu cũ) được coi là Kênh riêng MCN. Màn "Quản lý kênh" của KOL không đổi.
