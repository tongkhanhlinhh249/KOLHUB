# KOL Hub prototype — Chuyển 3 quyền & đồng nhất dữ liệu theo Hồ sơ đăng ký

| Trường | Giá trị |
|---|---|
| Nguồn | NS-KOLHUB-001 §2.3 (prototype có thanh chuyển role), §7.1 Data Model |
| Liên quan | `2026-09-27-kolhub-user-prototype-design.md` |
| Ngày | 28/09/2026 |

## 1. Vấn đề

1. **Hai mô hình KOL song song.** 40 KOL mẫu nằm trong `DemoState.directory` (`DirectoryKol`), còn KOL đăng ký thật đi qua `KolProfile` + `Channel` + `IdentityRecord`. KOL được duyệt ở Đợt 2 được chiếu sang `DirectoryKol` qua `listApprovedKols` → `fromApprovedSummary` và mất giới thiệu, lĩnh vực phụ, video.
2. **Topbar không dùng hồ sơ.** Tên hiển thị lấy `account.fullName | company | email`; KOL/MCN chỉ thấy email, không thấy tên/ảnh trong hồ sơ.
3. **Chuyển quyền chỉ nằm trong Demo Panel.**

## 2. Quyết định

### 2.1 Một nguồn dữ liệu: Hồ sơ đăng ký
- Mọi KOL (mẫu hay đăng ký mới) = `Account(type KOL)` + `KolProfile` + `Channel[]` (+ `IdentityRecord` nếu đã eKYC). Bỏ `DemoState.directory`.
- `KolProfile.contact` bổ sung trường công khai do KOL tự khai: `bio?: string` (≤ 300 ký tự) và `fields: ActivityField[]` = "Lĩnh vực hoạt động" 1–3 mục, mục đầu luôn = `contact.category` (bộ lọc dùng `category`). `ActivityField = { name: KolCategory; medal: 'gold' | 'silver' | 'none' }` — medal chỉ do dữ liệu mẫu/Admin gán, KOL tự khai mặc định `none`.
- Số liệu kênh (người theo dõi, video mới nhất) là dữ liệu **social listening giả lập**, gắn theo `Channel`: `Channel.stats?: { followers: number; latestVideos: LatestVideo[]; syncedAt: number }`. Khi Admin duyệt một kênh đạt, mock social listening sinh `stats` (xác định theo URL, không ngẫu nhiên mỗi lần đọc).
- Tìm kiếm / hồ sơ công khai = **một phép chiếu duy nhất** `toPublicKol(profile, channels, now)` áp BR-54 (kênh VERIFIED, active, còn hạn) và BR-58 (danh sách trắng trường). `KolSearchItem` và hồ sơ công khai lấy từ phép chiếu này.
- `seed.ts` sinh 40 KOL mẫu thành tài khoản KOL APPROVED đầy đủ (hồ sơ, kênh VERIFIED có `stats`, identity che số), dùng lại dữ liệu `data/creators.ts`. KolId giữ `KOL-2026-0001…0040` để danh sách đã lưu mẫu còn đúng.
- Tài khoản demo `kol@demo.kolhub.vn` vẫn DRAFT (để demo onboarding); thêm tài khoản KOL mẫu đã duyệt để demo góc nhìn KOL có dấu (email `khanhvy@demo.kolhub.vn`, mật khẩu `demo1234`).
- `DemoState.version` tăng lên 2; dữ liệu v1 trong trình duyệt được thay bằng seed v2 (prototype, chấp nhận mất dữ liệu demo cũ).

### 2.2 Danh tính hiển thị theo hồ sơ
`identityOf(state, account)` trả `{ name, subtitle, avatar?, roleLabel }`:
- KOL: `contact.displayName` (rỗng → email), phụ đề = KOL ID nếu đã duyệt, avatar hồ sơ.
- MCN: `contact.displayName` (rỗng → `org.orgName` → email) — cùng tên với đầu trang Hồ sơ; phụ đề = MCN ID nếu đã duyệt (như KOL ID), chưa duyệt thì mã số DN (nếu có); avatar hồ sơ.
- Nhãn hàng/Agency: `fullName`, phụ đề = `company`.
Tên KOL/MCN lấy từ một hàm chung `profileDisplayName(profile)`; chữ cái viết tắt trên avatar (khi chưa có ảnh) dùng chung `initialsOf(name)`.
Dùng cho Header, DemoPanel, menu tài khoản, đầu trang Hồ sơ (ProfileHeader) và đầu trang Tài khoản Nhãn hàng/Agency (cùng bố cục thẻ đầu trang + thẻ mục như Hồ sơ KOL/MCN).

### 2.3 Chuyển 3 quyền (prototype)
- Nút "Vai trò" trên topbar (desktop + tablet), trong menu tài khoản trên mobile: Khách · Cá nhân/KOL (hồ sơ mới) · Cá nhân/KOL (đã xác thực) · Tổ chức/MCN · Nhãn hàng/Agency. Chọn → `authService.quickLogin` → màn mặc định của role (BR-66). Đánh dấu rõ "Chế độ demo".
- Demo Panel giữ khối Vai trò, dùng chung component.

## 3. Ngoài phạm vi
Liên kết KOL–MCN, Admin gán medal qua UI, đồng bộ kol.gov.vn thật.
