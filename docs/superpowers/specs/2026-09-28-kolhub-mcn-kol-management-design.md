# KOL Hub — MCN gán kênh cho KOL và Kênh riêng MCN

Ngày: 2026-09-28 · Trạng thái: đã làm.

Yêu cầu: "MCN sẽ phải quản lý cả Danh sách KOL + các Kênh riêng của MCN phát triển không gán KOL", sau đó chỉnh lại: "Không có mời KOL bỏ đi. Chỉ có gán nhiều kênh cho 1 KOL thôi".
Trước đây quan hệ KOL–MCN nằm ngoài phạm vi (xem `2026-09-27-kolhub-user-prototype-design.md` §Không làm và `2026-09-28-kolhub-role-switch-unified-profile-design.md` §3). Nay chỉ **gán kênh MCN cho KOL** được đưa vào phạm vi; lời mời, chấp nhận hay liên kết MCN–KOL **không có**.

## 1. Dữ liệu

- Quan hệ duy nhất: `Channel.assignedKolAccountId?` (+ `assignedAt?`), chỉ dùng cho kênh của MCN. Không có giá trị = **Kênh riêng MCN**.
- Không có bảng liên kết. Bản đầu (v7) có `mcnKolLinks` với lời mời PENDING/ACTIVE/DECLINED/ENDED; đã bỏ ở **DB_VERSION 8** (dữ liệu cũ được thay bằng seed).
- "Danh sách KOL" của MCN = các KOL đang giữ ≥ 1 kênh của MCN (suy ra từ kênh, không lưu riêng).

## 2. Quy tắc

| # | Quy tắc | Mã lỗi |
|---|---|---|
| R1 | Chỉ MCN **đã duyệt** mới gán kênh. Bỏ gán thì không cần. | KOLHUB-4701 |
| R2 | Gán cho **bất kỳ KOL đã duyệt (có KOL ID)**; tìm theo tên, KOL ID hoặc email đăng nhập (email không hiển thị trong kết quả). | KOLHUB-4702 |
| R3 | Chỉ gán / bỏ gán kênh **của chính MCN**; một lần gán là tất cả hoặc không. | KOLHUB-4703 |
| R4 | Phải chọn ít nhất một kênh. | KOLHUB-4704 |
| R5 | Nhiều kênh → một KOL; mỗi kênh tối đa một KOL. Gán kênh đang thuộc KOL khác = **chuyển** sang KOL mới; gán lại cho chính KOL đó không đổi gì (giữ `assignedAt`). | — |
| R6 | Bỏ gán → Kênh riêng MCN; dịch vụ trả về chủ cũ để giao diện "Hoàn tác". | — |
| R7 | Không có bước KOL chấp nhận, không gửi thông báo; KOL không thấy gì trong hồ sơ của mình. | — |
| R8 | Một KOL **có thể nhận kênh của nhiều MCN** (không giới hạn). | — |
| R9 | Kênh vẫn thuộc MCN (xác thực, bật/tắt, KOL Safety…). Gán chỉ là thông tin quản lý nội bộ của MCN: **không** cộng follower vào hồ sơ KOL và không hiện với Nhãn hàng. Riêng trong "Quản lý kênh" của MCN, dòng kênh đã gán hiện lĩnh vực và khu vực của KOL đó. | — |

Mã 4701–4704 là mã mới trong danh mục lỗi; bản đầu dùng 4701–4710 cho lời mời, nay đã bỏ.

## 3. Dịch vụ `mcnKolService`

`listKols(mcnAccountId)` (KOL đang giữ kênh: thông tin công khai, lĩnh vực, số kênh, danh sách kênh, `lastAssignedAt`) · `searchKols(query)` (KOL đã duyệt, A → Z, tối đa 20) · `assignChannels(mcnAccountId, channelIds[], kolAccountId)` · `unassignChannels(mcnAccountId, channelIds[])`.

## 4. Màn hình

- **MCN → "Quản lý KOL"** (`/ho-so-mcn/kol`, nhóm "Hồ sơ MCN", chỉ MCN; trên điện thoại nằm đầu mục "Thêm"). Không có tab, không có lời mời.
  - Thanh lọc chung (tìm tên / KOL ID, Lĩnh vực, Sắp xếp: Gán gần nhất / Nhiều kênh nhất / Nhiều người theo dõi / Tên), trạng thái ở URL (`?q=&linh-vuc=&sap-xep=`). Dòng đếm: N KOL · x kênh đã gán · y Kênh riêng MCN.
  - Nút **"Gán kênh cho KOL"** → hộp thoại: (1) chọn KOL (tìm tên / KOL ID / email; avatar, tên, KOL ID, lĩnh vực) → (2) chọn nhiều kênh của MCN (icon nền tảng, tên kênh, chủ hiện tại: "Kênh riêng MCN" hoặc "Đang gán: <KOL> — sẽ chuyển sang KOL mới"; kênh đã thuộc KOL đang chọn hiện sẵn và khoá), lối tắt "Chọn tất cả kênh riêng", xác nhận **"Gán N kênh"**.
  - Mỗi dòng: avatar, tên, KOL ID · lĩnh vực · khu vực, follower, "N kênh" + icon nền tảng, ngày gán gần nhất. Menu ⋯: Xem kênh được gán (`/ho-so-mcn/kenh?kol=<KOL ID>`) · Gán thêm kênh (hộp thoại chọn sẵn KOL) · Bỏ gán tất cả kênh (xác nhận; toast có Hoàn tác).
  - Trống: "Chưa gán kênh cho KOL nào" + nút gán. MCN chưa duyệt: thông báo và nút bị khoá.
- **MCN → "Quản lý kênh"** (dùng chung ChannelRow / OwnerChannelSheet):
  - Dưới link: trạng thái duyệt + chủ sở hữu ("KOL: <tên>" hoặc "Kênh riêng MCN").
  - Bộ lọc "Chủ sở hữu" cạnh tab trạng thái: Tất cả / Kênh riêng MCN / từng KOL đang giữ kênh (kèm số kênh). URL `?kol=rieng` hoặc `?kol=<KOL ID>`, kết hợp với `?trangThai=`; số đếm tab theo chủ sở hữu đang chọn.
  - Menu ⋯: Gán cho KOL / Đổi KOL được gán (cùng hộp thoại, tìm trong mọi KOL đã duyệt) · Chuyển về Kênh riêng MCN (toast Hoàn tác). "Chi tiết kênh" có mục "Chủ sở hữu" với cùng thao tác.
  - **Không làm** chọn nhiều dòng + thanh thao tác hàng loạt ở đây: ChannelRow dùng chung (cả Nhãn hàng) chưa có ô chọn, thêm vào sẽ làm phức tạp dòng; gán hàng loạt đã có ở hộp thoại của "Quản lý KOL".
- **KOL:** không có gì mới (không có thẻ "MCN quản lý").

## 5. Seed

Sao Việt Media (saoviet@demo.kolhub.vn): 6/12 kênh đã gán — ch-01, ch-06 → KOL-2026-0011 (2 kênh); ch-02 → 0012; ch-04 → 0013; ch-05 → 0014; ch-09 → 0015. 6 kênh còn lại là Kênh riêng MCN. Khánh Vy (KOL-2026-0001) không nhận kênh nào.

## 6. Ngoài phạm vi

Thông báo cho KOL, KOL xem kênh được gán, bộ lọc BR-55 "thuộc MCN" phía Nhãn hàng (vẫn ẩn), thông tin MCN trên hồ sơ KOL công khai.
