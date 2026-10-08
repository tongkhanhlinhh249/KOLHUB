# KOL Hub — Xác thực kênh qua KOL Safety

| Trường | Giá trị |
|---|---|
| Ngày | 07/10/2026 |
| Trạng thái | Đã chốt nghiệp vụ, chưa làm prototype |
| Thay thế | R7 "Badge Xác thực & Khiên An toàn" trong `demo/userStories.ts` và `services/mock/contentShield.ts` |
| Liên quan | `2026-09-27-kolhub-user-prototype-design.md` (SCR-06 Quản lý kênh), `2026-09-29-kolhub-campaign-booking-beta-design.md` (lỗi 4809) |

## 1. Quyết định

1. **Xác thực theo kênh, không theo tài khoản.** Một KOL/MCN có nhiều kênh; mỗi kênh tự đạt hoặc không đạt.
2. **Hồ sơ (tài khoản) vẫn xét như cũ**: thông tin, eKYC (MCN: GCN ĐKDN), cam đoan, Admin duyệt. KOL Safety không phải điều kiện duyệt hồ sơ.
3. **Dấu xác thực kênh** = Đạt KOL Safety **và** Admin duyệt chủ sở hữu (link + ảnh quản lý kênh).
4. **Tiêu chí đạt, đơn vị token và ví token thuộc nghiệp vụ KOL Safety.** KOL Hub chỉ nhận kết quả và hiển thị.
5. **Quét theo từng video/nội dung**, không quét cả kênh một lần. Kênh chỉ được cấp xác thực khi đủ số nội dung đạt theo bảng §2.
6. **Quét lại không giới hạn**, mỗi lần trừ token phía KOL Safety.
7. **Hiệu lực 3 tháng**, hết hạn phải xác thực lại KOL Safety (như gia hạn visa).
8. **Làm Instagram trong đợt này** (thêm nền tảng thứ 4).

## 2. Quy tắc xác thực KOL Safety (nguồn: KOL Safety)

| Nền tảng | Nội dung xét | Điều kiện | Giới hạn quét |
|---|---|---|---|
| TikTok | 20 video gần nhất | Cả 20 đạt | 3 phút đầu mỗi video |
| Facebook | 20 nội dung gần nhất: ảnh, bài viết, story, ghi chú | Cả 20 đạt | 3 phút đầu mỗi video |
| Instagram | 20 nội dung gần nhất: ảnh, bài viết, story, ghi chú | Cả 20 đạt | 3 phút đầu mỗi video |
| YouTube | 5 video gần nhất, gồm video thường và Shorts | Cả 5 đạt | 3 phút đầu mỗi video |

- Nội dung từ phút thứ 4 trở đi **KOL Safety không kiểm tra và không chịu trách nhiệm**. Chủ kênh chịu trách nhiệm toàn bộ nội dung (§6).
- Trong prototype, các số 20 / 5 và 3 phút là hằng số theo nền tảng (`SAFETY_REQUIRED`, `SAFETY_SCAN_SECONDS`), không nhập tay.

## 3. Vòng đời kênh

```
Thêm kênh (link + ảnh quản lý)
 → SAFETY_PENDING   Chờ xác thực KOL Safety (x/N nội dung đạt)
      │  KOL quét từng nội dung, quét lại không giới hạn
      ▼  đủ N/N đạt
 → PENDING_REVIEW   Chờ Admin duyệt chủ sở hữu ──Cần bổ sung──→ NEEDS_FIX → sửa, gửi lại
 → VERIFIED         Đã xác thực, hiệu lực 3 tháng (badgeExpiresAt = duyệt + 90 ngày)
      ├─ còn ≤ 14 ngày → nhắc gia hạn (thông báo + email ở 14, 7, 1 ngày)
      ├─ KOL bấm "Gia hạn" → quét lại N nội dung gần nhất tại thời điểm gia hạn
      │     đủ N/N đạt → gia hạn thêm 3 tháng, KHÔNG cần Admin duyệt lại
      ├─ quá hạn → EXPIRED: ẩn khỏi tìm kiếm, không nhận booking mới
      │     gia hạn đạt → VERIFIED (không cần Admin)
      └─ sửa link kênh → SAFETY_PENDING (xác thực lại từ đầu, cần Admin)
```

- `ChannelStatus` thêm `SAFETY_PENDING`. `EXPIRED` dùng lại trạng thái có sẵn, chỉ đổi thời hạn từ 365 ngày xuống 90 ngày.
- **Danh sách N nội dung cần quét được chốt khi KOL bấm "Xác thực"** (ảnh chụp danh sách). Nội dung đăng sau thời điểm đó không làm dịch danh sách. Lý do: story Facebook/Instagram hết hạn sau 24 giờ và bài mới đăng liên tục; nếu danh sách trượt theo thời gian, KOL sẽ không bao giờ quét xong. Danh sách chốt giữ tối đa 7 ngày; quá hạn phải lấy danh sách mới. *(Cần KOL Safety xác nhận cách làm này.)*
- Chỉ xét lại khi gia hạn. Giữa hai lần gia hạn không tự quét lại; vi phạm phát sinh đi theo luồng "Vi phạm" hiện có (báo cáo → Admin xác nhận).
- Kênh không được chọn theo ý KOL: danh sách N nội dung luôn là N nội dung **mới nhất** trên kênh, để tránh chọn lọc bài sạch.

## 4. Màn hình

### 4.1 Quản lý kênh (KOL/MCN)
- Tab lọc thêm "Chờ KOL Safety", "Sắp hết hạn".
- Mỗi dòng kênh: trạng thái + tiến độ "TikTok · 14/20 nội dung đạt" + hạn dấu ("Hết hạn 07/01/2027").
- Nút chính theo trạng thái: "Xác thực trên KOL Safety" · "Tiếp tục quét (14/20)" · "Gửi Admin duyệt" · "Gia hạn" (khi ≤ 14 ngày hoặc đã hết hạn).
- Nội dung không đạt: hiện nguyên văn lý do KOL Safety trả về + "Xem chi tiết trên KOL Safety". KOL Hub không tự diễn giải.
- Hai tình huống chưa đạt hướng dẫn khác nhau:
  - **Chưa đủ nội dung** (kênh có 8/20): "Kênh cần ít nhất 20 nội dung. Đăng thêm rồi xác thực lại."
  - **Có nội dung không đạt**: "3 nội dung chưa đạt. Gỡ hoặc chỉnh rồi quét lại."

### 4.2 Hộp "Xác thực trên KOL Safety"
- Tóm tắt quy tắc của nền tảng (bảng §2), danh sách N nội dung sẽ quét.
- Ô cam đoan bắt buộc (§6). Bấm "Mở KOL Safety" → tab mới, đã đăng nhập sẵn bằng token, điền sẵn kênh.
- Token, giá, số dư: hiển thị và trừ trên KOL Safety, KOL Hub không xử lý.

### 4.3 Tổng quan hồ sơ
- Khối "Kênh đã xác thực": số kênh đã xác thực / tổng, kênh sắp hết hạn, kênh chờ KOL Safety. Thay khối "Badge Xác thực Kol.gov.vn" cấp tài khoản.

### 4.4 Nhãn hàng
- Dấu xác thực hiện theo từng kênh (hồ sơ KOL, Danh sách kênh, kênh trong đề xuất), tooltip: "Đã kiểm tra bởi KOL Safety: 3 phút đầu của mỗi video trong N nội dung gần nhất. Phần sau phút thứ 3 không được kiểm tra. Hiệu lực đến dd/mm/yyyy."
- Duyệt nháp trong booking: nháp dài hơn 3 phút → cảnh báo "Video dài 8:12. KOL Safety chỉ kiểm tra 0:00–3:00, vui lòng tự xem phần còn lại."

## 5. Ảnh hưởng tới phần đã có

| Phần | Thay đổi |
|---|---|
| Tìm kiếm KOL, Danh sách kênh (BR-54) | Không đổi luật: chỉ hiện kênh VERIFIED còn hạn, đang hoạt động. Hạn ngắn lại 90 ngày |
| Ứng tuyển, nhận lời mời (4809) | Không đổi: chỉ chọn được kênh VERIFIED còn hạn |
| Booking đang chạy khi kênh hết hạn | Làm tiếp đến hoàn tất; chỉ chặn booking mới |
| Danh sách đã lưu (BR-62) | KOL có kênh hết hạn vẫn ở lại, hiện trạng thái mới |
| MCN | Áp dụng như KOL cho từng kênh của MCN. Gán kênh cho KOL không cần KOL Safety |
| R7 hiện tại | **Bỏ**: Khiên An toàn tự tính (10 nội dung, 0 vi phạm, ≤ 2 cần xem lại), tạm treo 7 ngày, khiếu nại khiên, công tắc bật/tắt KOL Safety, gói Miễn phí/Bảo vệ, 3 lượt quét lại/tháng, Badge cấp tài khoản |
| Instagram | Thêm nền tảng: nhận diện link `instagram.com`, icon, bộ lọc, hạng mục chiến dịch (Bài đăng, Reels, Story), xác minh link bài đăng, seed kênh mẫu |

## 6. Trách nhiệm nội dung

- Cam đoan khi bấm "Xác thực trên KOL Safety": "Tôi hiểu KOL Safety chỉ kiểm tra 3 phút đầu của mỗi video. Tôi chịu trách nhiệm về toàn bộ nội dung trên kênh, kể cả phần không được kiểm tra."
- Điều khoản sử dụng KOL Hub cần điều khoản phạm vi trách nhiệm tương ứng — **cần pháp chế duyệt**, nhất là khi dấu mang tên Kol.gov.vn.

## 7. Tích hợp KOL Hub ↔ KOL Safety

| Việc | Cách làm |
|---|---|
| Mở KOL Safety | KOL Hub tạo token dùng một lần → `…/verify?token=…&channel=<url đã chuẩn hoá>&purpose=verify\|renew` |
| Khoá chung | Link kênh đã chuẩn hoá + `kolhubAccountId` |
| Trả kết quả | Webhook mỗi khi tiến độ đổi: `{ kolhubAccountId, channelUrl, platform, purpose, required, scanned, passed, items[{ contentId, url, type, verdict, reason, scannedSeconds, durationSeconds }], status: IN_PROGRESS \| PASSED \| FAILED, reportUrl, checkedAt }` |
| Đối soát | `GET /verification-status?channelUrl=` khi lỡ webhook, và cho nút "Làm mới" |
| KOL Hub lưu | `Channel.safety = { status, required, scanned, passed, reportUrl, checkedAt, snapshotAt }`, chỉ phản chiếu |

## 8. Prototype (mock)

- `services/mock/safetyVerification.ts`: hằng số §2, `startVerification(channelId)` (chốt danh sách N nội dung), `scanItem`, `renew`, chuyển trạng thái §3; sinh kết quả xác định theo link như `safetyHash`.
- Demo Panel, khối "KOL Safety": chọn kết quả cho lần quét tiếp theo (Đạt · Không đạt · Chưa đủ nội dung), "Quét đủ ngay", đẩy kênh tới "còn 7 ngày" / "hết hạn".
- Tài liệu nghiệp vụ: viết lại R7 theo spec này.
- Seed: DB_VERSION tăng; kênh mẫu VERIFIED có hạn rải trong 90 ngày (vài kênh sắp hết hạn), vài kênh SAFETY_PENDING 14/20, thêm kênh Instagram.

## 9. Còn mở

1. Cách chốt danh sách N nội dung (§3) — KOL Safety xác nhận.
2. Kênh có ít hơn N nội dung (KOC mới) bị chặn hoàn toàn — chấp nhận hay có ngoại lệ.
3. Mốc nhắc gia hạn 14/7/1 ngày và kênh gia hạn khi đã hết hạn có cần Admin duyệt lại không (spec đang để: không).
4. Điều khoản trách nhiệm (§6) — pháp chế.
