# KOL Hub — Prototype Phân hệ Người dùng (thiết kế triển khai)

| Trường | Giá trị |
|---|---|
| Nguồn nghiệp vụ | `NS-KOLHUB-001-nguoi-dung-v1.0.md` (Draft v1.0, 27/09/2026) |
| Repo | `Kols-Brand` (Vite + React 18 + Tailwind v4 + shadcn/NetSpace kit) |
| Loại | Prototype frontend, dữ liệu và dịch vụ giả lập |
| Trạng thái | Chờ duyệt |
| Ngày | 27/09/2026 |

---

## 1. Mục tiêu và tiêu chí thành công

**Mục tiêu:** một prototype bấm thử được đủ 3 role người dùng của NS-KOLHUB-001 để demo, UAT và chốt các câu hỏi `[CẦN XÁC NHẬN]` với khách, trước khi làm frontend thật.

**Thành công khi:**
1. Một người không đọc tài liệu có thể đi hết UC-01 → UC-14 trên trình duyệt (desktop và điện thoại).
2. Mọi trạng thái hồ sơ/kênh trong state machine 7.2 và 7.3 đều demo được, gồm `APPROVED`, `NEEDS_FIX`, `REJECTED`, `EXPIRED`.
3. Mọi case eKYC ở bảng 7.4 và mọi mã lỗi ở bảng 7.5 thuộc phạm vi đều tái hiện được bằng thao tác, không cần sửa code.
4. Các màn có đủ 5 trạng thái UI bắt buộc ở mục 9.3 (Default, Empty, Loading, Error, Success).
5. Thay tầng dịch vụ giả lập bằng API thật mà không phải sửa màn hình.

**Không làm:** backend, lưu trữ thật, gửi OTP thật, eKYC thật, đồng bộ kol.gov.vn thật, Console Admin đầy đủ, KOL Safety, tra cứu QR, liên kết KOL–MCN, mời KOL, nhập Excel, liên hệ/đặt hợp tác.

---

## 2. Kiến trúc

```
src/app/
  auth/            AuthContext, RequireRole, roles.ts (role key, menu, màn mặc định)
  services/
    types.ts       Kiểu dữ liệu theo Data Model 7.1 + mã lỗi KOLHUB-xxxx
    index.ts       Điểm import duy nhất cho màn hình (hiện trỏ tới mock)
    mock/          db.ts (localStorage) · delay.ts · auth · otp · ekyc · profile · channel · review · search · savedList · seed.ts
  demo/            DemoPanel (chuyển role, giả lập Admin, chọn case eKYC, reset, phễu)
  layouts/         GuestLayout (không sidebar) · AppLayout (khung Admin Dashboard hiện có)
  features/
    register/  login/  kol-profile/  mcn-profile/  channels/  review-status/  biz-search/  saved-lists/  biz-account/
```

### 2.1 Tầng dịch vụ

- Màn hình **chỉ** import từ `services/index.ts`, không import `mock/` trực tiếp. Đổi sang API thật = đổi file này.
- Mỗi hàm trả `Promise`, trễ giả 400–800 ms (`delay.ts`) để hiện trạng thái Loading.
- Lỗi nghiệp vụ trả về dạng `{ code: 'KOLHUB-4001', message, meta? }` (ví dụ `meta.attemptsLeft`). Bảng thông điệp tiếng Việt nằm ở một file `errors.ts`.
- `db.ts` lưu toàn bộ dữ liệu demo trong một khoá `localStorage` (`kolhub-demo-v1`), bọc `try/catch`. Nếu localStorage không dùng được thì chạy trong bộ nhớ. `seed.ts` tạo dữ liệu ban đầu.

### 2.2 Phiên và phân quyền

- `AuthContext` giữ `{ roleKey, account }`. Phiên lưu trong `db.ts` để tải lại trang không bị đăng xuất.
- `roles.ts` là nguồn duy nhất cho menu và màn mặc định (mục 2.3 của tài liệu nghiệp vụ). Sidebar, thanh điều hướng dưới và `RequireRole` đều đọc từ đây.
- `RequireRole` áp dụng:
  - **BR-66:** sau đăng ký/đăng nhập mở màn mặc định theo role.
  - **BR-67:** guest vào URL cần đăng nhập → chuyển Đăng nhập, lưu `returnTo`, đăng nhập xong quay lại nếu hợp quyền. Role khác → chuyển màn mặc định + toast "Bạn không có quyền truy cập trang này".
  - **BR-69:** một tài khoản đúng một role key.
- Role `kolhub.ops.*` không có màn hình; phần duyệt được giả lập trong Demo Panel (mục 4).

### 2.3 Route

| Route | Role | Màn |
|---|---|---|
| `/dang-ky?loai=kol\|mcn\|biz` | guest | SCR-01 |
| `/dang-nhap` | guest | SCR-02 |
| `/quen-mat-khau` | guest | SCR-02 (nhánh khôi phục) |
| `/ho-so-kol` | kol | SCR-03/04/05/06 (3 tab) |
| `/ho-so-mcn` | mcn | SCR-03/04/06/07 (3 tab) |
| `/kol-safety` | kol, mcn | Trang "Sắp ra mắt" |
| `/tim-kiem-kol` | biz | SCR-09, mở SCR-10 dạng drawer |
| `/danh-sach-da-luu` | biz | SCR-11 |
| `/tai-khoan-doanh-nghiep` | biz | SCR-08 |

Các trang hiện có (Tổng quan, Danh sách kênh, Danh sách vi phạm, Account…) **gỡ khỏi route và menu, giữ file**, để dùng lại khi làm KOL Safety.

---

## 3. Chức năng theo đợt

### Đợt 1 — Nền role, Đăng ký, Đăng nhập

- `roles.ts`, `AuthContext`, `RequireRole`, `GuestLayout`; `AppLayout` đọc menu theo role.
- **SCR-01 Đăng ký:** 3 thẻ loại tài khoản (Cá nhân/KOL · Tổ chức/MCN · Nhãn hàng/Agency, như ảnh tham chiếu), chọn sẵn theo `?loai=`.
  - KOL/MCN: SĐT, email, mật khẩu ×2, đồng ý điều khoản → OTP email → OTP SMS → tạo tài khoản (BR-02, BR-03, BR-04, BR-04a).
  - Nhãn hàng/Agency: họ tên, tên công ty, email công ty, mật khẩu ×2 → chặn email miễn phí (BR-45, KOLHUB-4015) → OTP email → mở Tìm kiếm KOL.
- **OTP dùng chung** (`OtpStep`): 6 ô số, đếm ngược 60 giây, "Gửi lại mã", "Quay lại" (giữ dữ liệu form). Mã hiện trong **thông báo giả SMS/email** với đúng nội dung MẪU-01/02/03. Áp dụng BR-04, BR-49, lỗi 4005–4009.
- **SCR-02 Đăng nhập:** tab Email (mặc định) / Số điện thoại (OTP SMS, chỉ KOL/MCN). Sai 5 lần khoá 15 phút (BR-08, 4011–4013). Quên mật khẩu qua Email hoặc SMS (BR-10).

### Đợt 2 — Hồ sơ KOL và MCN

- **SCR-03 Phần đầu hồ sơ:** ảnh bìa, avatar, tên + khiên (chỉ khi `APPROVED`), số kênh, nút chính theo trạng thái, thẻ "Hồ sơ hoàn thiện x%".
  - Công thức x% (5 mốc × 20%): liên hệ đủ trường bắt buộc · có nhân sự quản lý nội dung · eKYC `PASSED` (MCN: có file GCN) · ≥1 kênh `ACTIVE` có ảnh · đã gửi xét duyệt.
- **SCR-04 Thông tin liên hệ:** 2 khối (Liên hệ · Nhân sự quản lý nội dung), sửa qua Dialog, lưu ngay. Trường "Họ tên KOL/KOC" sau khi gửi hồ sơ → `PENDING_CHANGE` (BR-43, FR-18).
- **SCR-05 Thông tin định danh (KOL):**
  - Box 1, 3 bước: Chụp CCCD 2 mặt (`<input type="file" accept="image/*" capture="environment">`) → Quay video khuôn mặt (`capture="user"`) → Xem thông tin CCCD (chỉ xem, số CCCD che, BR-14) + danh sách điều kiện BR-64 (✓/✕) + 3 cam đoan → Gửi xét duyệt.
  - Trạng thái Loading "Đang đọc thông tin CCCD…" và "Đang đối chiếu khuôn mặt…". Lỗi hiện callout, mẹo, số lần còn lại. 5 lần thất bại/24 giờ → khoá (4108).
  - Case 4103 (họ tên khác): 2 nút "Cập nhật hồ sơ theo giấy tờ" / "Gửi yêu cầu xem xét". Case 4104: "Đăng nhập tài khoản đó" / "Báo cáo bị mạo danh".
  - Box 2 Trạng thái xét duyệt: timeline 3 mốc, chỉ xem (BR-19).
- **SCR-07 Thông tin định danh (MCN):** 5 trường tổ chức → tải GCN (JPG/PNG/PDF ≤ 10 MB, 4301/4302) → xem lại, cam đoan, gửi. Sửa sau khi gửi → bản nháp `PENDING_CHANGE`, dữ liệu hiển thị giữ nguyên (BR-27).
- **SCR-06 Quản lý kênh (dùng chung KOL/MCN, BR-24):** tab lọc có số lượng (Tất cả · Đã xác thực · Chờ duyệt · Cần bổ sung), thêm/sửa bằng Sheet (link + ảnh quản lý), tự nhận diện Facebook/YouTube/TikTok (BR-20, 4202), ảnh ≤ 10 MB (4203), link trùng (4201), công tắc Hoạt động (BR-23), không có nút xoá. Kênh `NEEDS_FIX` hiện lý do.

### Đợt 3 — Nhãn hàng/Agency

- **SCR-09 Tìm kiếm KOL:** ô tìm (tên, nghệ danh, KOL ID, link kênh), bộ lọc lĩnh vực · khu vực · quy mô · chip nền tảng có dấu, sắp xếp (liên quan · người theo dõi · mới xác thực), tổng số, 20 kết quả/trang, skeleton khi tải, trạng thái rỗng. Chỉ hiện KOL có ≥1 kênh `VERIFIED` còn hạn và `ACTIVE` (BR-54). Dùng lại `CreatorCard`/`FilterBar` sau khi rút gọn.
- **SCR-10 Hồ sơ KOL (góc nhìn Nhãn hàng):** drawer dựa trên `InfluencerDrawer`: thông tin công khai, kênh + trạng thái dấu, email hợp tác, nút Lưu. **Không hiện** SĐT, địa chỉ, Zalo, dữ liệu eKYC, vi phạm/KOL Safety, giá booking (BR-58).
- **SCR-12 Hộp Lưu vào danh sách:** checkbox nhiều danh sách + tạo mới, tên không trùng, ≤ 100 ký tự (BR-60, BR-61).
- **SCR-11 Danh sách đã lưu:** cột trái danh sách + số lượng, bảng KOL + ghi chú, bỏ khỏi danh sách, đổi tên, xoá. KOL mất dấu vẫn ở trong danh sách, hiện trạng thái mới (BR-62).
- **SCR-08 Tài khoản doanh nghiệp:** tên công ty, email công ty đã xác thực, sửa thông tin; đổi email công ty phải OTP lại (BR-63).

---

## 4. Demo Panel

Nút nổi góc dưới phải, mở `Sheet`; hiện ở mọi màn, kể cả khi chưa đăng nhập.

| Khối | Chức năng |
|---|---|
| Chuyển role | Đăng nhập nhanh bằng tài khoản mẫu của từng role, hoặc về guest |
| Giả lập Admin | Liệt kê hồ sơ `SUBMITTED`: Duyệt hồ sơ · đánh giá từng kênh Đạt / Cần bổ sung (lý do bắt buộc, BR-15) · Từ chối (lý do). Duyệt / từ chối `PENDING_CHANGE` (BR-44). Đẩy nhanh kênh sang `EXPIRED` |
| Case eKYC | Chọn kết quả cho lần gửi tiếp theo: Thành công · 4101 · 4102 · 4103 · 4104 · 4105 · 4106 · 4107 · 5101 |
| Phễu | Thời điểm từng bước KOL đi qua (đăng ký → OTP email → OTP SMS → eKYC bước 1/2 → thêm kênh → gửi hồ sơ), thời gian giữa các bước |
| Dữ liệu | Reset về dữ liệu mẫu |

Kết quả duyệt: hiện toast giả lập email/SMS gửi người dùng (BR-17).

---

## 5. Dữ liệu mẫu (`seed.ts`)

- 3 tài khoản đăng nhập nhanh: 1 KOL (hồ sơ `DRAFT`), 1 MCN (`DRAFT`), 1 Nhãn hàng (email công ty đã xác thực).
- ~40 KOL đã xác thực cho tìm kiếm, chuyển từ `data/creators.ts`: chỉ giữ Facebook/YouTube/TikTok (bỏ Instagram), gán `badge_expires_at`, KOL ID, lĩnh vực, khu vực, số người theo dõi.
- Vài KOL có kênh `EXPIRED` hoặc `INACTIVE` để kiểm tra BR-54 và BR-62.

---

## 6. Quyết định tạm cho câu hỏi mở

| Câu hỏi (mục 11.1) | Quyết định cho prototype |
|---|---|
| 1. Tiền tố mã lỗi | `KOLHUB-xxxx` |
| 5. Họ tên CCCD khác hồ sơ | Hiện cả 2 lựa chọn theo UC-07 3a |
| 6. Kênh `INACTIVE` / sửa kênh có dấu | `INACTIVE` giữ dấu nhưng ẩn khỏi tìm kiếm; sửa link/ảnh kênh có dấu → dấu tạm ngừng, kênh về `PENDING_REVIEW` |
| 7. KOL ẩn khỏi tìm kiếm / email hợp tác | Không có tuỳ chọn ẩn; email hợp tác luôn hiện |
| 9. Phân trang / giới hạn / xuất Excel | 20/trang; không giới hạn danh sách; không xuất Excel |
| BR-55 lọc "thuộc MCN" | Ẩn, vì liên kết KOL–MCN ngoài phạm vi |
| KOL Safety trong menu | Hiện mục, trang "Sắp ra mắt" |
| 2, 3, 4, 8, 10 | Không ảnh hưởng prototype (nhà cung cấp, API, đa tài khoản) |

Các quyết định này hiện trong Demo Panel dưới mục "Giả định" để khách xác nhận khi xem demo.

---

## 7. Giao diện

- Theo NetSpace kit đã áp dụng: token trong `theme.css`, component trong `components/ui`, khung Admin Dashboard.
- **KOL/MCN mobile-first:** trên mobile dùng thanh điều hướng dưới (Hồ sơ · KOL Safety), các bước eKYC full màn hình. **Nhãn hàng desktop-first:** lưới thẻ và bảng.
- Màn mới dùng component kit (`Button`, `Input`, `Tabs`, `Dialog`, `Sheet`, `Table`, `Badge`, `Checkbox`, `Switch`, `Progress`, `Skeleton`, `sonner`), không viết lại thẻ HTML thô.
- Không dùng chữ "NetSpace" trong giao diện khi nói về xét duyệt (Constraint 1.5).

---

## 8. Kiểm thử

- **Vitest** cho tầng dịch vụ mock: luật OTP (BR-04, BR-49), khoá đăng nhập (BR-08), đếm lần eKYC (BR-13), điều kiện gửi hồ sơ (BR-64, BR-65), state machine kênh/hồ sơ, lọc tìm kiếm (BR-54), danh sách đã lưu (BR-60–62), `RequireRole` (BR-66, BR-67).
- **Kiểm tra trên trình duyệt** sau mỗi đợt: đi hết các UC của đợt ở 375 px, 768 px và 1280 px; không lỗi console.
- Dự án chưa có test runner; đợt 1 thêm `vitest` vào `devDependencies`.

---

## 9. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| `capture` không mở camera trên một số trình duyệt desktop | Chấp nhận: rơi về chọn file, vẫn đi hết luồng |
| localStorage bị chặn (tab ẩn danh) | Chạy trong bộ nhớ, mất dữ liệu khi tải lại |
| Spec v1.0 thay đổi trong lúc làm | Mọi luật nằm trong `services/mock`; màn hình không tự kiểm luật |
| Project nằm trong thư mục từng đồng bộ iCloud | Đã tắt đồng bộ Documents; khuyến nghị khởi tạo git trước khi bắt đầu đợt 1 |
