# KOL Hub Prototype — Đợt 3: Nhãn hàng/Agency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tài khoản Nhãn hàng/Agency tìm KOL đã xác thực (SCR-09), xem hồ sơ công khai (SCR-10), lưu vào nhiều danh sách (SCR-12), quản lý danh sách đã lưu (SCR-11) và sửa tài khoản doanh nghiệp, đổi email công ty có OTP (SCR-08).

**Architecture:** Thêm 2 khoá mới vào `DemoState` của Đợt 1 (`directory`, `savedLists`); luật nghiệp vụ nằm trong 3 factory thuần TypeScript (`createSearchService`, `createSavedListService`, `createBizAccountService`) nhận `db`, `now()` (và `otp`) để test bằng Vitest với `delay: false`. Mọi dịch vụ đọc danh bạ KOL qua **một** hàm `readDirectory(state)` — đây là chỗ duy nhất Task 12 nối thêm KOL do Đợt 2 duyệt. Màn hình chỉ import `src/app/services/index.ts`; hồ sơ công khai là một kiểu riêng (`KolPublicProfile`) không có trường nhạy cảm, nên UI không thể lỡ hiện chúng.

**Tech Stack:** React 18, react-router 7 (`useSearchParams`), Tailwind v4, kit trong `src/app/components/ui` (`Input`, `Select`, `ToggleGroup`, `Button`, `Badge`, `Card`, `Sheet`, `Dialog`, `AlertDialog`, `Checkbox`, `Table`, `Textarea`, `DropdownMenu`, `Pagination`, `Skeleton`, `Alert`), `sonner`, `lucide-react`, `date-fns`, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-27-kolhub-user-prototype-design.md` (§3 Đợt 3, §5, §6). Nghiệp vụ gốc: `../NS-KOLHUB-001-nguoi-dung-v1.0.md` (UC-11..14, FR-15..17, BR-45/46, BR-52..63, SCR-08..12, §9.3). Nền: `docs/superpowers/plans/2026-09-27-kolhub-dot1-role-auth.md` (dùng đúng các interface ở đó).

## Global Constraints

- Mọi ràng buộc trong "Global Constraints" của plan Đợt 1 vẫn áp dụng (import qua `services/index.ts`, `KolhubError`/`errorMessage`, `try/catch` localStorage, không chữ "NetSpace", component kit + token màu).
- `DemoState` chỉ **thêm** khoá `directory` và `savedLists`; không đổi kiểu/ý nghĩa khoá có sẵn.
- Chỉ nền tảng `facebook`, `youtube`, `tiktok`; không có Instagram ở bất kỳ đâu (BR-20).
- Kênh "mang dấu còn hiệu lực" ⇔ `status === 'VERIFIED'` **và** `Date.parse(badgeExpiresAt) > now()`. Kênh tìm được ⇔ mang dấu còn hiệu lực **và** `active === true`. KOL hiện trong tìm kiếm ⇔ có ≥ 1 kênh tìm được (BR-54, BR-23, quyết định §6.6).
- 20 kết quả/trang; luôn trả tổng số (BR-56, §6.9). Không xuất Excel, không giới hạn số danh sách/số KOL.
- Bộ lọc "thuộc MCN" ẩn (§6, BR-55). KOL không có tuỳ chọn ẩn; email hợp tác luôn hiện (§6.7).
- Hồ sơ góc nhìn Nhãn hàng không có SĐT, địa chỉ, Zalo, dữ liệu eKYC, vi phạm/KOL Safety, giá booking (BR-58).
- Tên danh sách: trim, gộp khoảng trắng, NFC; 1–100 ký tự (đếm code point); không trùng trong cùng tài khoản, so không phân biệt hoa thường (BR-60). Ghi chú ≤ 500 ký tự.
- Mọi hàm dịch vụ Đợt 3 chỉ chạy khi phiên là tài khoản `BIZ`; ngược lại `KOLHUB-4016` (BR-53, BR-59).
- Đổi email công ty: chặn email miễn phí như BR-45 (4015); chỉ áp dụng sau OTP gửi tới email **mới** (BR-63).
- Mỗi hàm dịch vụ `await delay()` trừ khi `deps.delay === false` (test luôn truyền `false`).
- Màu: chỉ token (`bg-primary`, `text-muted-foreground`, `bg-accent`, `border-border`, `text-destructive`…). Ngoại lệ duy nhất: logo nền tảng trong `PlatformIcon` giữ màu thương hiệu.
- Nhãn hàng desktop-first (lưới thẻ, bảng), vẫn dùng được ở 375 px, không cuộn ngang trang.

## Review Focus

1. **Phản hồi tìm kiếm về sai thứ tự:** trễ giả ngẫu nhiên 400–800 ms nên gõ nhanh/đổi lọc liên tục có thể để kết quả cũ đè kết quả mới → chỉ nhận phản hồi của lần gọi mới nhất. Test `latestOnly` ở Task 6.
2. **Từ khoá không dấu / hoa thường / nhiều khoảng trắng:** `"  CHAU   bui "` phải ra Châu Bùi; chuỗi toàn khoảng trắng = không lọc. Test ở Task 2.
3. **Dán nguyên link kênh:** `https://www.tiktok.com/@chaubui/?lang=vi` phải khớp kênh `tiktok.com/@chaubui`; link của kênh `INACTIVE` thì không tìm ra. Test ở Task 2.
4. **Tên danh sách "giống mà khác":** `" tết  2027 "`, `"TẾT 2027"`, dạng NFD của `"Tết 2027"` đều là trùng (4401); đổi tên chính nó sang khác hoa thường thì được. Test ở Task 4.
5. **Trang vượt phạm vi / đổi lọc khi đang ở trang 2:** `?page=9` hoặc `?page=abc` không làm trắng lưới — dịch vụ kẹp về trang hợp lệ; mọi thay đổi bộ lọc/sắp xếp/từ khoá đưa về trang 1. Test ở Task 2 và Task 6.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/app/services/bizTypes.ts` | Kiểu + hằng số Đợt 3 (danh bạ, tìm kiếm, hồ sơ công khai, danh sách) |
| `src/app/services/types.ts`, `errors.ts` | Sửa: thêm mã lỗi 4016–4018, 4401–4405; `OtpPurpose` thêm `'change-email'` |
| `src/app/services/mock/directory.ts` | Hàm thuần: chuẩn hoá chữ/link, trạng thái dấu, quy mô, `readDirectory` |
| `src/app/services/mock/directorySeed.ts` | `seedDirectory(now)` (40 KOL), `seedSavedLists(accounts, now)` |
| `src/app/services/mock/db.ts`, `seed.ts` | Sửa: 2 khoá mới; nạp dữ liệu cũ thiếu khoá thì bù từ seed |
| `src/app/services/mock/bizSession.ts` | `currentBizAccount(state)` — chặn 4016 |
| `src/app/services/mock/search.ts` | `createSearchService` — `search`, `getKolPublicProfile` |
| `src/app/services/mock/savedLists.ts` | `createSavedListService` |
| `src/app/services/mock/bizAccount.ts` | `createBizAccountService` |
| `src/app/services/mock/testing/bizFixtures.ts` | Fixture dùng chung cho test Task 2–5 |
| `src/app/services/index.ts` | Sửa: export 3 dịch vụ + kiểu/hằng |
| `src/app/features/biz-search/format.ts`, `searchParams.ts`, `latestOnly.ts` | Hàm thuần cho UI (có test) |
| `src/app/features/biz-search/PlatformIcon.tsx`, `StatusBadges.tsx`, `KolCard.tsx`, `SearchFilters.tsx`, `SearchPage.tsx` | SCR-09 |
| `src/app/features/biz-search/KolProfileSheet.tsx` | SCR-10 |
| `src/app/features/biz-search/SaveToListsDialog.tsx` | SCR-12 |
| `src/app/features/saved-lists/SavedListsPage.tsx`, `ListColumn.tsx`, `ListItemsTable.tsx`, `ListNameDialog.tsx`, `NoteDialog.tsx` | SCR-11 |
| `src/app/features/biz-account/BizAccountPage.tsx`, `EditBizProfileDialog.tsx`, `ChangeEmailDialog.tsx` | SCR-08 |
| `src/app/routes.tsx` | Sửa: thay `ComingSoon` ở 3 route Nhãn hàng |
| `src/app/demo/DemoPanel.tsx` | Sửa: khối "Giả định" cho các quyết định Đợt 3 |

`CreatorCard.tsx`, `FilterBar.tsx`, `InfluencerDrawer.tsx`, `InfluencerList.tsx` **giữ nguyên** (spec §2.3: giữ file cho KOL Safety). "Dùng lại sau khi rút gọn" = bản mới gọn trong `features/biz-search/`, lấy bố cục/SVG từ file cũ, bỏ Instagram, dropdown thao tác, huy chương, vi phạm, booking, email.

---

### Task 1: Kiểu, danh bạ KOL mẫu, khoá mới trong `DemoState`

**Files:**
- Create: `src/app/services/bizTypes.ts`, `src/app/services/mock/directory.ts`, `src/app/services/mock/directorySeed.ts`
- Modify: `src/app/services/types.ts`, `src/app/services/errors.ts`, `src/app/services/mock/db.ts`, `src/app/services/mock/seed.ts`
- Test: `src/app/services/mock/directory.test.ts`, `src/app/services/mock/directorySeed.test.ts`, `src/app/services/mock/db.test.ts` (thêm 1 test)

**Interfaces:**
- Consumes: `DemoState`, `createDb`, `seedState`, `StoredAccount`, `ErrorCode`, `errorMessage` (Đợt 1); `creators` từ `src/app/data/creators.ts`
- Produces (`bizTypes.ts`):
  - `type Platform = 'facebook' | 'youtube' | 'tiktok'`; `PLATFORMS: { key: Platform; label: string }[]` = Facebook, YouTube, TikTok
  - `KOL_CATEGORIES = ['Giáo dục','Lifestyle','Du lịch','Ẩm thực','Làm đẹp','Thời trang','Công nghệ','Gaming','Thể thao','Giải trí'] as const`; `type KolCategory`
  - `KOL_REGIONS = ['Hà Nội','TP. Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ'] as const`; `type KolRegion`
  - `type KolScale = 'nano' | 'micro' | 'mid' | 'macro' | 'mega'`; `KOL_SCALES: { key: KolScale; label: string; min: number; max: number }[]` = nano "Nano (< 10K)" 0–10 000 · micro "Micro (10K–100K)" 10 000–100 000 · mid "Mid (100K–500K)" 100 000–500 000 · macro "Macro (500K–1M)" 500 000–1 000 000 · mega "Mega (≥ 1M)" 1 000 000–`Infinity` (min gồm, max không gồm)
  - `type ChannelStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'NEEDS_FIX' | 'EXPIRED'`
  - `interface DirectoryChannel { id: string; platform: Platform; url: string; handle: string; followers: number; status: ChannelStatus; active: boolean; badgeExpiresAt: string | null; verifiedAt: string | null }` (ngày dạng ISO)
  - `interface KolPrivateData { phone: string; address: string; zalo: string; idNoMasked: string; violations: number; bookingPrice: string }`
  - `interface DirectoryKol { kolId: string; displayName: string; nickname: string; avatar?: string; bio: string; category?: KolCategory; region?: KolRegion; collabEmail: string | null; verifiedAt: string; channels: DirectoryChannel[]; private?: KolPrivateData }`
  - `type BadgeState = 'VERIFIED' | 'EXPIRED'`; `type KolListingStatus = 'VISIBLE' | 'BADGE_EXPIRED' | 'INACTIVE' | 'UNAVAILABLE'`
  - `interface SavedListItem { kolId: string; note: string; addedAt: string }`; `interface SavedList { id: string; accountId: string; name: string; createdAt: string; updatedAt: string; items: SavedListItem[] }`
  - (kiểu của Task 2–5 cũng khai báo ở file này, xem Interfaces từng task)
- Produces (`directory.ts`):
  - `normalizeText(s: string): string` — NFD, bỏ dấu `̀-ͯ`, `đ/Đ → d`, lowercase, trim, gộp khoảng trắng
  - `normalizeUrl(s: string): string` — `normalizeText` rồi bỏ `^https?://`, `^(www|m)\.`, phần `?…`/`#…`, `/` cuối
  - `isLinkKeyword(kw: string): boolean` — `/[./@]/.test(kw)`
  - `channelBadge(ch: DirectoryChannel, now: number): BadgeState | null` — `VERIFIED` còn hạn → `'VERIFIED'`; `EXPIRED`, hoặc `VERIFIED` có `badgeExpiresAt <= now` → `'EXPIRED'`; còn lại `null`
  - `isSearchableChannel(ch, now): boolean` — `channelBadge === 'VERIFIED' && ch.active`
  - `searchableChannels(k: DirectoryKol, now): DirectoryChannel[]`
  - `totalFollowers(k, now): number` — tổng `followers` của kênh tìm được
  - `scaleOf(followers: number): KolScale`
  - `listingStatus(k, now): Exclude<KolListingStatus, 'UNAVAILABLE'>` — có kênh tìm được → `VISIBLE`; có kênh `channelBadge === 'VERIFIED'` nhưng tất cả `active=false` → `INACTIVE`; còn lại `BADGE_EXPIRED`
  - `readDirectory(state: DemoState): DirectoryKol[]` — hiện trả `state.directory` (Task 12 mở rộng)
- Produces (`directorySeed.ts`): `seedDirectory(now: number): DirectoryKol[]`, `seedSavedLists(accounts: StoredAccount[], now: number): SavedList[]`, `parseFollowers(s: string): number`
- Produces (`db.ts`): `DemoState` thêm `directory: DirectoryKol[]; savedLists: SavedList[]`

- [ ] **Step 1: Viết test thất bại**

```ts
// directory.test.ts  (NOW = Date.UTC(2026, 8, 27, 3))
test('normalizeText bỏ dấu, đ, hoa thường, khoảng trắng', () =>
  expect(normalizeText('  CHÂU   Bùi Đạt ')).toBe('chau bui dat'));
test('normalizeUrl bỏ giao thức, www, query, / cuối', () =>
  expect(normalizeUrl('https://www.TikTok.com/@chaubui/?lang=vi#x')).toBe('tiktok.com/@chaubui'));
test('channelBadge: hết hạn đúng thời điểm now là EXPIRED', () => {
  expect(channelBadge(ch({ status: 'VERIFIED', badgeExpiresAt: iso(NOW) }), NOW)).toBe('EXPIRED');
  expect(channelBadge(ch({ status: 'VERIFIED', badgeExpiresAt: iso(NOW + 1) }), NOW)).toBe('VERIFIED');
  expect(channelBadge(ch({ status: 'PENDING_REVIEW' }), NOW)).toBeNull();
});
test('kênh VERIFIED nhưng INACTIVE không tìm được', () =>
  expect(isSearchableChannel(ch({ status: 'VERIFIED', active: false, badgeExpiresAt: iso(NOW + DAY) }), NOW)).toBe(false));
test.each([[9_999,'nano'],[10_000,'micro'],[99_999,'micro'],[100_000,'mid'],[500_000,'macro'],[1_000_000,'mega']])('scaleOf(%i) = %s', (n, s) => expect(scaleOf(n)).toBe(s));
test('listingStatus: VISIBLE / INACTIVE / BADGE_EXPIRED', () => { /* 3 KOL dựng bằng ch(); kỳ vọng đúng 3 giá trị */ });

// directorySeed.test.ts
const dir = seedDirectory(NOW);
test('40 KOL, KOL ID duy nhất KOL-2026-0001..0040', () => {
  expect(dir).toHaveLength(40);
  expect(new Set(dir.map(k => k.kolId)).size).toBe(40);
  expect(dir[0].kolId).toBe('KOL-2026-0001');
});
test('35 KOL tìm được; 0036–0037 INACTIVE; 0038–0040 BADGE_EXPIRED', () => {
  expect(dir.filter(k => listingStatus(k, NOW) === 'VISIBLE')).toHaveLength(35);
  expect(['KOL-2026-0036','KOL-2026-0037'].map(id => listingStatus(byId(id), NOW))).toEqual(['INACTIVE','INACTIVE']);
  expect(['KOL-2026-0038','KOL-2026-0039','KOL-2026-0040'].map(id => listingStatus(byId(id), NOW))).toEqual(['BADGE_EXPIRED','BADGE_EXPIRED','BADGE_EXPIRED']);
});
test('0040 hết hạn theo ngày dù status vẫn VERIFIED', () =>
  expect(byId('KOL-2026-0040').channels.every(c => c.status === 'VERIFIED')).toBe(true));
test('không có Instagram; mọi KOL có email hợp tác, lĩnh vực, khu vực, dữ liệu private', () => { /* every(...) */ });
test('KOL-2026-0001 là Khánh Vy lấy từ creators.ts, followers YouTube = 1 200 000', () => { /* … */ });
test('parseFollowers', () => { expect(parseFollowers('1.2M')).toBe(1_200_000); expect(parseFollowers('890K')).toBe(890_000); });
test('seedSavedLists: 2 danh sách của brand@vinamilk-demo.vn', () => {
  const lists = seedSavedLists(seedState().accounts, NOW);
  expect(lists.map(l => [l.name, l.items.map(i => i.kolId)])).toEqual([
    ['Chiến dịch Tết 2027', ['KOL-2026-0001','KOL-2026-0005','KOL-2026-0038']],
    ['KOL ẩm thực', ['KOL-2026-0005','KOL-2026-0036']],
  ]);
});

// db.test.ts (thêm)
test('dữ liệu cũ thiếu directory/savedLists → bù từ seed, giữ tài khoản đã có', () => {
  const old = { ...seedState(), accounts: [...seedState().accounts, extraAcc] } as any;
  delete old.directory; delete old.savedLists;
  const db = createDb(memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) }), seedState);
  expect(db.read().directory).toHaveLength(40);
  expect(db.read().accounts).toHaveLength(4);
});
```

- [ ] **Step 2: Chạy `npm test -- directory db` — FAIL (module chưa có)**
- [ ] **Step 3: Viết `bizTypes.ts`, `directory.ts`; thêm mã lỗi.** `types.ts`: `ErrorCode` thêm `'KOLHUB-4016' | 'KOLHUB-4017' | 'KOLHUB-4018' | 'KOLHUB-4401' | 'KOLHUB-4402' | 'KOLHUB-4403' | 'KOLHUB-4404' | 'KOLHUB-4405'`; `OtpPurpose` thêm `'change-email'`. `errors.ts` — nguyên văn:
  - 4016 `Tính năng này chỉ dành cho tài khoản Nhãn hàng/Agency đã xác thực email công ty.`
  - 4017 `Email mới trùng với email công ty hiện tại.`
  - 4018 `{label} không hợp lệ hoặc còn trống.` với `label` theo `meta.field`: `fullName` "Họ tên", `company` "Tên công ty", `email` "Email công ty"
  - 4401 `Bạn đã có danh sách tên này. Vui lòng chọn tên khác.`
  - 4402 `Tên danh sách phải có từ 1 đến 100 ký tự.`
  - 4403 `Không tìm thấy danh sách.`
  - 4404 `Không tìm thấy KOL hoặc hồ sơ không còn hiển thị.`
  - 4405 `Ghi chú tối đa 500 ký tự.`

  Nếu `smsBody` của Đợt 1 là `Record<OtpPurpose, string>` hoặc `switch` vét cạn, thêm nhánh `'change-email'` ném `Error('change-email chỉ gửi qua email')` (mục đích này không bao giờ đi SMS).
- [ ] **Step 4: Viết `directorySeed.ts`.** Quy tắc (mọi ngày tính từ `now`, `DAY = 86_400_000`):
  - KOL thứ `i` (1..40): `kolId = 'KOL-2026-' + pad4(i)`; `verifiedAt = now − ((i*7) % 40 + 1)·DAY` (40 ngày khác nhau); kênh hợp lệ: `status 'VERIFIED'`, `active true`, `verifiedAt` = của KOL, `badgeExpiresAt = verifiedAt + 365·DAY`.
  - i = 1..10: từ `creators[i-1]` — `displayName = name`, `nickname`, `bio`, `avatar = profileImage`, `region = location`; kênh = `stats` bỏ `instagram`, `url` = `socialLinks[platform]`, `followers = parseFollowers`; `category`: 1 Giáo dục · 2 Lifestyle · 3 Du lịch · 4 Du lịch · 5 Ẩm thực · 6 Thời trang · 7 Thời trang · 8 Làm đẹp · 9 Lifestyle · 10 Làm đẹp; `private.bookingPrice = averageBookingPrice`.
  - i = 11..40: 30 KOL tự tạo, bảng `[tên, lĩnh vực, khu vực]` theo thứ tự:
    An Nhiên Review·Lifestyle·Hà Nội · Bảo Ngọc Beauty·Làm đẹp·TP. Hồ Chí Minh · Cường Đi Phượt·Du lịch·Đà Nẵng · Diệu Linh Cooking·Ẩm thực·Hà Nội · Đức Anh Tech·Công nghệ·Hà Nội · Gia Huy Gaming·Gaming·TP. Hồ Chí Minh · Hải Yến Fitness·Thể thao·Đà Nẵng · Hoàng Nam Comedy·Giải trí·Hải Phòng · Khánh Linh Study·Giáo dục·Cần Thơ · Lan Chi Lifestyle·Lifestyle·TP. Hồ Chí Minh · Mai Anh Fashion·Thời trang·Hà Nội · Minh Khôi Tech·Công nghệ·TP. Hồ Chí Minh · Ngọc Trâm Makeup·Làm đẹp·Hải Phòng · Nhật Minh Travel·Du lịch·Cần Thơ · Phương Thảo Bếp Nhà·Ẩm thực·TP. Hồ Chí Minh · Quang Huy Esports·Gaming·Hà Nội · Quỳnh Như Yoga·Thể thao·TP. Hồ Chí Minh · Sơn Lâm Hài·Giải trí·Hà Nội · Thanh Hằng Mẹ Bỉm·Lifestyle·Hải Phòng · Thành Đạt English·Giáo dục·Hà Nội · Thu Trang Style·Thời trang·Đà Nẵng · Tiến Dũng Review·Công nghệ·Cần Thơ · Trà My Skincare·Làm đẹp·Hà Nội · Trung Kiên Food·Ẩm thực·Đà Nẵng · Tú Anh Dance·Giải trí·TP. Hồ Chí Minh · Vân Anh Books·Giáo dục·TP. Hồ Chí Minh · Việt Hoàng Camping·Du lịch·Hà Nội · Xuân Mai Kids·Giải trí·Đà Nẵng · Yến Nhi Vlog·Lifestyle·Cần Thơ · Hữu Phước Chạy Bộ·Thể thao·Hải Phòng.
    `nickname` = `normalizeText(tên)` bỏ khoảng trắng; `bio = '{lĩnh vực} · {khu vực}'`; không avatar (UI dùng chữ cái đầu). Với `j = i − 11`: `base = [4_500, 38_000, 72_000, 260_000, 640_000, 1_900_000][j % 6]`; nền tảng `[['tiktok'],['facebook','tiktok'],['youtube'],['facebook','youtube','tiktok']][j % 4]`; kênh thứ `k` có `followers = Math.round(base * [1, 0.6, 0.3][k])`.
  - URL kênh: `facebook.com/{nick}`, `youtube.com/@{nick}`, `tiktok.com/@{nick}`; `handle = '@' + nick`; `id = '{kolId}-{platform}'`.
  - `collabEmail = 'hoptac.{nick}@kolhub-demo.vn'`; `private = { phone: '0909' + pad6(i), address: 'Số {i} Đường Demo, {khu vực}', zalo: phone, idNoMasked: '0010******' + pad2(i), violations: 0, bookingPrice: bookingPrice ?? '50,000,000 VNĐ' }`.
  - Ngoại lệ: 0002 kênh `facebook` `status 'EXPIRED'`, `badgeExpiresAt = now − 20·DAY` (vẫn tìm được nhờ kênh khác); 0003 kênh `tiktok` `active false`; 0036–0037 mọi kênh `active false`; 0038–0039 mọi kênh `status 'EXPIRED'`, `verifiedAt = now − 400·DAY`, `badgeExpiresAt = now − 35·DAY`; 0040 mọi kênh `status 'VERIFIED'`, `verifiedAt = now − 366·DAY`, `badgeExpiresAt = now − DAY`. KOL 0038–0040 `verifiedAt` = `verifiedAt` kênh.
  - `seedSavedLists`: tìm tài khoản `brand@vinamilk-demo.vn`; 2 danh sách như test, `id` `'list-seed-1'`/`'list-seed-2'`, ghi chú của 0001 trong danh sách 1 là `Ưu tiên liên hệ tháng 11`, còn lại `''`.
- [ ] **Step 5: Sửa `db.ts` và `seed.ts`.** `DemoState` thêm 2 khoá; `seedState()` thêm `directory: seedDirectory(Date.now())`, `savedLists: seedSavedLists(accounts, Date.now())`. Trong `createDb`, sau khi parse và qua kiểm version: với mỗi khoá có trong `seed()` mà dữ liệu đã lưu thiếu, gán từ seed rồi ghi lại (không đổi `version`). Nếu Đợt 2 đã thêm đúng cơ chế này (grep `in parsed` / `Object.keys(fresh)` trong `db.ts`), chỉ thêm test.
- [ ] **Step 6: Chạy `npm test` — PASS toàn bộ (kể cả test Đợt 1)**
- [ ] **Step 7: Commit** — `git commit -m "feat(services): KOL directory seed and saved-list state for phase 3"`

---

### Task 2: Dịch vụ tìm kiếm KOL (FR-15, BR-53..57)

**Files:**
- Create: `src/app/services/mock/bizSession.ts`, `src/app/services/mock/search.ts`, `src/app/services/mock/testing/bizFixtures.ts`
- Modify: `src/app/services/bizTypes.ts`, `src/app/services/index.ts`
- Test: `src/app/services/mock/search.test.ts`

**Interfaces:**
- Consumes: Task 1 (`readDirectory`, `normalizeText`, `normalizeUrl`, `isLinkKeyword`, `searchableChannels`, `totalFollowers`, `scaleOf`, `KOL_SCALES`), `Db`, `KolhubError`, `delay`
- Produces:
  - `currentBizAccount(state: DemoState): StoredAccount` — không có phiên hoặc `type !== 'BIZ'` → `KolhubError('KOLHUB-4016')`
  - `type SearchSort = 'relevance' | 'followers' | 'newest'`; `SEARCH_PAGE_SIZE = 20`
  - `interface KolSearchQuery { keyword?: string; category?: KolCategory; region?: KolRegion; scale?: KolScale; platforms?: Platform[]; sort?: SearchSort; page?: number }`
  - `interface KolSearchItem { kolId: string; displayName: string; nickname: string; avatar?: string; category?: KolCategory; region?: KolRegion; totalFollowers: number; scale: KolScale; platforms: Platform[]; verifiedAt: string }`
  - `interface KolSearchResult { items: KolSearchItem[]; total: number; page: number; pageCount: number; pageSize: 20 }`
  - `createSearchService(deps: { db: Db; now: () => number; delay?: false })` → `{ search(q: KolSearchQuery): Promise<KolSearchResult>; getKolPublicProfile(kolId: string): Promise<KolPublicProfile> }` (hàm thứ 2 ở Task 3); `type SearchService = ReturnType<typeof createSearchService>`
  - `bizFixtures.ts`: `NOW`, `DAY`, `iso(ms)`, `makeKol(id: string, over?: Partial<DirectoryKol>): DirectoryKol`, `makeChannel(over?: Partial<DirectoryChannel>): DirectoryChannel`, `fixtureDirectory(): DirectoryKol[]`, `bizState(opts?: { directory?: DirectoryKol[]; session?: 'biz' | 'biz2' | 'kol' | null }): Db` (dùng `createDb(null, …)` với `seedState()` + thêm tài khoản BIZ thứ 2 `brand2@acme-demo.vn`, `directory` mặc định `fixtureDirectory()`, `savedLists: []`, phiên mặc định `'biz'`), `switchSession(db: Db, who: 'biz' | 'biz2' | 'kol' | null): void`
  - `services/index.ts` export `searchService = createSearchService({ db, now: Date.now })` và mọi kiểu/hằng của `bizTypes.ts`

`fixtureDirectory()` — mọi kênh mặc định `VERIFIED`, `active`, `badgeExpiresAt = NOW + 100·DAY`:

| kolId | displayName / nickname | category · region | kênh | verifiedAt |
|---|---|---|---|---|
| `KOL-T-0001` (A) | Châu Bùi / chaubui | Thời trang · TP. Hồ Chí Minh | tiktok `tiktok.com/@chaubui` 3 200 000; facebook `facebook.com/chaubui` 1 000 000 | NOW−5d |
| `KOL-T-0002` (B) | Chan La Cà / chanlaca | Du lịch · TP. Hồ Chí Minh | youtube 2 800 000 | NOW−1d |
| `KOL-T-0003` (C) | Bếp Nhà Chau / bepnhachau | Ẩm thực · Hà Nội | facebook 50 000 | NOW−10d |
| `KOL-T-0004` (D) | Hết Hạn Test / hethan | Gaming · Hà Nội | tiktok, `badgeExpiresAt = NOW` | NOW−365d |
| `KOL-T-0005` (E) | Tắt Hoạt Động / tathd | Gaming · Hà Nội | youtube `active false` | NOW−3d |
| `KOL-T-0006` (F) | Kênh Trộn / kenhtron | Gaming · Hải Phòng | tiktok `tiktok.com/@kenhtron` `active false`; facebook 20 000 | NOW−4d |
| `KOL-T-0007` (G) | Chờ Duyệt / choduyet | Gaming · Hà Nội | youtube `PENDING_REVIEW`, `badgeExpiresAt null` | NOW−2d |
| `KOL-T-0101..0125` | Filler 01..25 / filler01.. | Gaming · Đà Nẵng | youtube `10_000 + n` | NOW−(20+n)d |

A và C có `private = { phone: '0909000001', address: 'Số 1 Đường Bí Mật', zalo: '0909000001', idNoMasked: '0010******01', violations: 2, bookingPrice: '99,000,000 VNĐ' }`.

- [ ] **Step 1: Viết test thất bại** (`const svc = createSearchService({ db: bizState(), now: () => NOW, delay: false })`)

```ts
const ids = (r: KolSearchResult) => r.items.map(i => i.kolId);
test('BR-54: chỉ KOL có kênh VERIFIED còn hạn và ACTIVE; tổng 29', async () => {
  const r = await svc.search({});
  expect(r.total).toBe(29);
  expect(ids(r)).not.toEqual(expect.arrayContaining(['KOL-T-0004']));
  for (const id of ['KOL-T-0004','KOL-T-0005','KOL-T-0007']) expect((await svc.search({ keyword: id })).total).toBe(0);
});
test('20/trang: trang 1 có 20, trang 2 có 9', async () => {
  expect(await svc.search({ page: 1 })).toMatchObject({ pageSize: 20, pageCount: 2, page: 1 });
  expect((await svc.search({ page: 2 })).items).toHaveLength(9);
});
test.each([[9, 2], [0, 1], [-3, 1], [NaN, 1]])('page %s kẹp về %s', async (p, want) =>
  expect((await svc.search({ page: p })).page).toBe(want));
test('không có kết quả → page 1, pageCount 1, items rỗng', async () =>
  expect(await svc.search({ keyword: 'zzz' })).toMatchObject({ total: 0, page: 1, pageCount: 1, items: [] }));
test('từ khoá không dấu, hoa thường, thừa khoảng trắng', async () =>
  expect(ids(await svc.search({ keyword: '  CHAU   bui ' }))[0]).toBe('KOL-T-0001'));
test('từ khoá chỉ có khoảng trắng = không lọc', async () =>
  expect((await svc.search({ keyword: '   ' })).total).toBe(29));
test('liên quan: tên bắt đầu bằng từ khoá xếp trước tên chứa từ khoá', async () =>
  expect(ids(await svc.search({ keyword: 'chau' }))).toEqual(['KOL-T-0001', 'KOL-T-0003']));
test('KOL ID khớp chính xác', async () =>
  expect(ids(await svc.search({ keyword: 'kol-t-0002' }))).toEqual(['KOL-T-0002']));
test('dán nguyên link kênh có https, www, query, / cuối', async () =>
  expect(ids(await svc.search({ keyword: 'https://www.tiktok.com/@chaubui/?lang=vi' }))).toEqual(['KOL-T-0001']));
test('link của kênh INACTIVE không tìm ra KOL', async () =>
  expect((await svc.search({ keyword: 'tiktok.com/@kenhtron' })).total).toBe(0));
test('lọc lĩnh vực / khu vực', async () => {
  expect(ids(await svc.search({ category: 'Du lịch' }))).toEqual(['KOL-T-0002']);
  expect(ids(await svc.search({ region: 'Hà Nội' }))).toEqual(['KOL-T-0003']);
});
test('lọc quy mô theo tổng người theo dõi của kênh tìm được', async () => {
  expect(ids(await svc.search({ scale: 'mega' }))).toEqual(['KOL-T-0001', 'KOL-T-0002']);
  expect((await svc.search({ scale: 'micro' })).total).toBe(27); // C, F(20 000), 25 filler
});
test('chip nền tảng: OR giữa các chip, chỉ tính kênh tìm được', async () => {
  expect(ids(await svc.search({ platforms: ['tiktok'] }))).toEqual(['KOL-T-0001']);
  expect((await svc.search({ platforms: ['tiktok', 'youtube'] })).total).toBe(27); // A, B, 25 filler
});
test('sắp xếp: followers → A trước; newest → B trước; relevance không từ khoá = followers', async () => {
  expect(ids(await svc.search({ sort: 'followers' })).slice(0, 2)).toEqual(['KOL-T-0001', 'KOL-T-0002']);
  expect(ids(await svc.search({ sort: 'newest' }))[0]).toBe('KOL-T-0002');
  expect(ids(await svc.search({}))).toEqual(ids(await svc.search({ sort: 'followers' })));
});
test('kết quả chỉ có trường công khai; platforms bỏ kênh không tìm được', async () => {
  const f = (await svc.search({ keyword: 'kenh tron' })).items[0];
  expect(Object.keys(f).sort()).toEqual(['category','displayName','kolId','nickname','platforms','region','scale','totalFollowers','verifiedAt']); // fixture không có avatar → không có khoá avatar
  expect(f).not.toHaveProperty('private');
  expect(f.platforms).toEqual(['facebook']);
  expect(f.totalFollowers).toBe(20_000);
});
test.each(['kol', null] as const)('BR-53: phiên %s → 4016', async (session) => {
  const s = createSearchService({ db: bizState({ session }), now: () => NOW, delay: false });
  await expect(s.search({})).rejects.toMatchObject({ code: 'KOLHUB-4016' });
});
```

- [ ] **Step 2: Chạy `npm test -- search` — FAIL**
- [ ] **Step 3: Viết `bizSession.ts`, `search.ts`.** Thứ tự: `currentBizAccount` → lọc `listingStatus === 'VISIBLE'` → lọc category/region/scale (`scaleOf(totalFollowers)`)/platforms (giao `platforms` với nền tảng của kênh tìm được) → chấm điểm từ khoá → sắp xếp → dựng `KolSearchItem` (bỏ khoá `avatar` khi không có; không spread `DirectoryKol`) → kẹp trang (`page` không phải số nguyên ≥ 1 → 1; > `pageCount` → `pageCount`; `pageCount = max(1, ceil(total/20))`) → cắt trang. Chấm điểm (`kw = normalizeText(keyword)`, rỗng → mọi KOL điểm 0):

```
nếu isLinkKeyword(kw): 80 nếu có kênh tìm được mà normalizeUrl(url) chứa normalizeUrl(kw), ngược lại loại
ngược lại lấy max của: normalizeText(kolId) === kw → 100; kolId chứa kw → 70;
  tên bắt đầu bằng kw → 60; nickname bắt đầu → 50; tên chứa → 40; nickname chứa → 30; không khớp → loại
```
  Sắp xếp `relevance`: điểm giảm dần, rồi `totalFollowers` giảm dần, rồi `kolId` tăng dần; `followers`: `totalFollowers` giảm dần, rồi `kolId`; `newest`: `verifiedAt` giảm dần, rồi `kolId`.
- [ ] **Step 4: Thêm `searchService` vào `services/index.ts`.**
- [ ] **Step 5: Chạy `npm test` — PASS**
- [ ] **Step 6: Commit** — `feat(services): KOL search mock (BR-53..57)`

---

### Task 3: Hồ sơ KOL công khai (FR-16, BR-58)

**Files:**
- Modify: `src/app/services/mock/search.ts`, `src/app/services/bizTypes.ts`
- Test: `src/app/services/mock/search.test.ts` (thêm `describe('getKolPublicProfile')`)

**Interfaces:**
- Consumes: Task 1–2
- Produces:
  - `interface PublicChannel { platform: Platform; url: string; handle: string; followers: number; badge: BadgeState; badgeExpiresAt: string }`
  - `interface KolPublicProfile { kolId: string; displayName: string; nickname: string; avatar?: string; bio: string; category?: KolCategory; region?: KolRegion; collabEmail: string | null; totalFollowers: number; scale: KolScale; listingStatus: Exclude<KolListingStatus, 'UNAVAILABLE'>; verifiedAt: string; channels: PublicChannel[] }`
  - `searchService.getKolPublicProfile(kolId: string): Promise<KolPublicProfile>`

- [ ] **Step 1: Viết test thất bại**

```ts
test('BR-58: chỉ có trường công khai, không lộ dữ liệu private', async () => {
  const p = await svc.getKolPublicProfile('KOL-T-0001');
  expect(Object.keys(p).sort()).toEqual(['bio','category','channels','collabEmail','displayName','kolId','listingStatus','nickname','region','scale','totalFollowers','verifiedAt']);
  const json = JSON.stringify(p);
  for (const v of ['0909000001', 'Đường Bí Mật', '0010******01', '99,000,000']) expect(json).not.toContain(v);
});
test('kênh: bỏ kênh INACTIVE và kênh chưa từng có dấu; kênh hết hạn theo ngày hiện EXPIRED', async () => {
  expect((await svc.getKolPublicProfile('KOL-T-0006')).channels.map(c => c.platform)).toEqual(['facebook']);
  expect((await svc.getKolPublicProfile('KOL-T-0004')).channels).toMatchObject([{ platform: 'tiktok', badge: 'EXPIRED' }]);
});
test('KOL mất dấu / ngừng hoạt động vẫn mở được hồ sơ, kèm listingStatus', async () => {
  expect((await svc.getKolPublicProfile('KOL-T-0004')).listingStatus).toBe('BADGE_EXPIRED');
  expect((await svc.getKolPublicProfile('KOL-T-0005')).listingStatus).toBe('INACTIVE');
});
test.each(['KOL-T-9999', 'KOL-T-0007'])('%s (không tồn tại / chưa từng có dấu) → 4404', async (id) =>
  await expect(svc.getKolPublicProfile(id)).rejects.toMatchObject({ code: 'KOLHUB-4404' }));
test('phiên KOL → 4016', async () => { /* như Task 2 */ });
```

- [ ] **Step 2: Chạy `npm test -- search` — FAIL**
- [ ] **Step 3: Viết `getKolPublicProfile`.** Dựng object mới từng trường theo whitelist (không spread `DirectoryKol`). `channels` = kênh có `active && channelBadge(ch) !== null`, `badge = channelBadge(ch)`. KOL không có kênh nào từng có dấu (`status` VERIFIED/EXPIRED) → 4404. Bỏ khoá `avatar` khi không có (để test key list khớp fixture A không có avatar).
- [ ] **Step 4: Chạy `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(services): public KOL profile whitelist (BR-58)`

---

### Task 4: Dịch vụ danh sách đã lưu (FR-17, BR-59..62)

**Files:**
- Create: `src/app/services/mock/savedLists.ts`
- Modify: `src/app/services/bizTypes.ts`, `src/app/services/index.ts`
- Test: `src/app/services/mock/savedLists.test.ts`

**Interfaces:**
- Consumes: Task 1–2 (`currentBizAccount`, `readDirectory`, `listingStatus`, `searchableChannels`, fixtures)
- Produces:
  - `interface SavedListSummary { id: string; name: string; count: number; updatedAt: string }`
  - `interface SavedListRow { kolId: string; displayName: string; avatar?: string; category?: KolCategory; platforms: Platform[]; status: KolListingStatus; note: string; addedAt: string }`
  - `interface SavedListDetail { id: string; name: string; rows: SavedListRow[] }`
  - `interface ListMembership { listId: string; name: string; count: number; checked: boolean }`
  - `normalizeListName(name: string): string` — NFC, trim, gộp khoảng trắng
  - `createSavedListService(deps: { db: Db; now: () => number; delay?: false; genId?: () => string })` →
    - `listLists(): Promise<SavedListSummary[]>` — của tài khoản hiện tại, theo `createdAt` tăng dần
    - `createList(name: string): Promise<SavedListSummary>`
    - `renameList(listId: string, name: string): Promise<SavedListSummary>`
    - `deleteList(listId: string): Promise<void>`
    - `getList(listId: string): Promise<SavedListDetail>` — `rows` theo `addedAt` giảm dần
    - `getMembership(kolId: string): Promise<ListMembership[]>`
    - `setMembership(kolId: string, listIds: string[]): Promise<{ added: number; removed: number }>`
    - `removeFromList(listId: string, kolId: string): Promise<void>`
    - `updateNote(listId: string, kolId: string, note: string): Promise<void>`
    - `getSavedKolIds(): Promise<string[]>`
  - `type SavedListService = ReturnType<typeof createSavedListService>`; `services/index.ts` export `savedListService`

- [ ] **Step 1: Viết test thất bại** (`db = bizState({ session: 'biz' })`, `svc = createSavedListService({ db, now: () => clock, delay: false })`)

```ts
test('tạo danh sách: trim, gộp khoảng trắng, count 0', async () =>
  expect(await svc.createList('  Tết   2027 ')).toMatchObject({ name: 'Tết 2027', count: 0 }));
test.each([' tết  2027 ', 'TẾT 2027', 'Tết 2027'.normalize('NFD')])('BR-60: "%s" trùng → 4401', async (dup) => {
  await svc.createList('Tết 2027');
  await expect(svc.createList(dup)).rejects.toMatchObject({ code: 'KOLHUB-4401' });
});
test('BR-60: 100 ký tự được, 101 ký tự hoặc rỗng → 4402', async () => {
  await expect(svc.createList('ệ'.repeat(100))).resolves.toBeTruthy();
  await expect(svc.createList('a'.repeat(101))).rejects.toMatchObject({ code: 'KOLHUB-4402' });
  await expect(svc.createList('   ')).rejects.toMatchObject({ code: 'KOLHUB-4402' });
});
test('đổi tên chính nó khác hoa thường được; trùng danh sách khác → 4401', async () => {
  const a = await svc.createList('Tết 2027'); await svc.createList('Hè 2027');
  await expect(svc.renameList(a.id, 'TẾT 2027')).resolves.toMatchObject({ name: 'TẾT 2027' });
  await expect(svc.renameList(a.id, 'hè 2027')).rejects.toMatchObject({ code: 'KOLHUB-4401' });
});
test('cùng tên ở tài khoản khác không tính trùng', async () => { /* biz tạo 'A'; chuyển session biz2; createList('A') resolves */ });
test('BR-61: một KOL ở nhiều danh sách; bỏ chọn thì rời danh sách, giữ ghi chú ở danh sách còn lại', async () => {
  const a = await svc.createList('A'), b = await svc.createList('B');
  expect(await svc.setMembership('KOL-T-0001', [a.id, b.id])).toEqual({ added: 2, removed: 0 });
  await svc.updateNote(a.id, 'KOL-T-0001', 'Gọi lại thứ Hai');
  expect(await svc.setMembership('KOL-T-0001', [a.id])).toEqual({ added: 0, removed: 1 });
  expect((await svc.getMembership('KOL-T-0001')).map(m => [m.name, m.checked])).toEqual([['A', true], ['B', false]]);
  expect((await svc.getList(a.id)).rows[0].note).toBe('Gọi lại thứ Hai');
});
test('ghi chú 501 ký tự → 4405', async () => { /* … */ });
test('BR-62: KOL mất dấu / ngừng hoạt động sau khi lưu vẫn ở trong danh sách, hiện trạng thái mới', async () => {
  const a = await svc.createList('A');
  await svc.setMembership('KOL-T-0001', [a.id]);
  await svc.setMembership('KOL-T-0002', [a.id]);
  db.update(s => {
    s.directory.find(k => k.kolId === 'KOL-T-0001')!.channels.forEach(c => { c.badgeExpiresAt = iso(NOW - 1); });
    s.directory.find(k => k.kolId === 'KOL-T-0002')!.channels.forEach(c => { c.active = false; });
  });
  const rows = (await svc.getList(a.id)).rows;
  expect(rows.map(r => [r.kolId, r.status]).sort()).toEqual([['KOL-T-0001', 'BADGE_EXPIRED'], ['KOL-T-0002', 'INACTIVE']]);
});
test('chỉ lưu được KOL đang hiện trong tìm kiếm; KOL không tồn tại → 4404', async () => {
  const a = await svc.createList('A');
  await expect(svc.setMembership('KOL-T-0004', [a.id])).rejects.toMatchObject({ code: 'KOLHUB-4404' });
  await expect(svc.setMembership('KOL-T-9999', [a.id])).rejects.toMatchObject({ code: 'KOLHUB-4404' });
});
test('KOL đã lưu rồi mất dấu vẫn bỏ chọn / đổi danh sách được', async () => { /* lưu A, cho hết hạn, setMembership(kolId, []) resolves {removed: 1} */ });
test('KOL biến mất khỏi danh bạ → dòng UNAVAILABLE, không bị xoá', async () => { /* lưu, db.update xoá khỏi directory, getList row.status === 'UNAVAILABLE', displayName === kolId */ });
test('BR-59: tài khoản khác không đọc/sửa được danh sách → 4403', async () => {
  const a = await svc.createList('A');
  switchSession(db, 'biz2');
  expect(await svc.listLists()).toEqual([]);
  for (const call of [() => svc.getList(a.id), () => svc.renameList(a.id, 'X'), () => svc.deleteList(a.id), () => svc.setMembership('KOL-T-0001', [a.id])])
    await expect(call()).rejects.toMatchObject({ code: 'KOLHUB-4403' });
});
test('xoá danh sách; getSavedKolIds cập nhật', async () => { /* … */ });
test('phiên KOL → 4016', async () => { /* … */ });
```

- [ ] **Step 2: Chạy `npm test -- savedLists` — FAIL**
- [ ] **Step 3: Viết `savedLists.ts`.** Khoá so trùng: `normalizeListName(name).toLocaleLowerCase('vi')`; độ dài: `[...normalizeListName(name)].length`. `setMembership`: kiểm mọi `listId` thuộc tài khoản (4403) trước khi ghi; KOL chưa nằm trong danh sách nào của tài khoản thì phải `listingStatus === 'VISIBLE'` (4404), KOL đã nằm trong ít nhất một danh sách thì bỏ qua kiểm này (BR-62); thêm mới `{ note: '', addedAt: iso(now()) }`, giữ nguyên mục đã có; cập nhật `updatedAt` của danh sách bị đổi. `getList` dựng `rows` từ `readDirectory` tại thời điểm đọc (không chép dữ liệu KOL vào danh sách); KOL không còn trong danh bạ → `{ displayName: kolId, platforms: [], status: 'UNAVAILABLE' }`. `platforms` của dòng = nền tảng của kênh tìm được. `id` mới = `genId?.() ?? crypto.randomUUID()`.
- [ ] **Step 4: Thêm `savedListService` vào `services/index.ts`.**
- [ ] **Step 5: Chạy `npm test` — PASS**
- [ ] **Step 6: Commit** — `feat(services): saved lists mock (BR-59..62)`

---

### Task 5: Dịch vụ tài khoản doanh nghiệp (UC-06 cho Nhãn hàng, BR-45, BR-63)

**Files:**
- Create: `src/app/services/mock/bizAccount.ts`
- Modify: `src/app/services/index.ts`
- Test: `src/app/services/mock/bizAccount.test.ts`

**Interfaces:**
- Consumes: `currentBizAccount`, `OtpService` (`send`, `verify`, `isVerified`), `normalizeEmail`, `isValidEmail`, danh sách email miễn phí của Đợt 1 (BR-45 — import hằng/hàm Đợt 1 đã dùng cho 4015; nếu Đợt 1 để nội bộ trong `auth.ts`, chuyển nó ra `normalize.ts` thành `export const FREE_EMAIL_DOMAINS` và `isFreeEmail(email)` rồi cho `auth.ts` import lại), `authService.loginWithEmail` (chỉ trong test)
- Produces:
  - `createBizAccountService(deps: { db: Db; now: () => number; otp: OtpService; delay?: false })` →
    - `updateBizProfile(input: { fullName: string; company: string }): Promise<Account>` — trim; rỗng hoặc > 200 ký tự → `KOLHUB-4018` `meta.field` = `'fullName' | 'company'`
    - `startCompanyEmailChange(newEmail: string): Promise<{ email: string }>` — trả email đã chuẩn hoá; **không** gửi OTP, **không** đổi dữ liệu
    - `confirmCompanyEmailChange(input: { newEmail: string; otpRequestId: string }): Promise<Account>`
  - `services/index.ts` export `bizAccountService = createBizAccountService({ db, now: Date.now, otp: otpService })`

- [ ] **Step 1: Viết test thất bại** (`otp` là `createOtpService({ db, now, notify, genCode: () => '123456', delay: false })`; phiên `brand@vinamilk-demo.vn`)

```ts
test('sửa họ tên, tên công ty: trim và lưu', async () =>
  expect(await biz.updateBizProfile({ fullName: ' Trần B ', company: ' Công ty X ' })).toMatchObject({ fullName: 'Trần B', company: 'Công ty X' }));
test('tên công ty rỗng → 4018 field company', async () =>
  await expect(biz.updateBizProfile({ fullName: 'A', company: '  ' })).rejects.toMatchObject({ code: 'KOLHUB-4018', meta: { field: 'company' } }));
test.each([
  ['ai@gmail.com', 'KOLHUB-4015'], ['x@yahoo.com.vn', 'KOLHUB-4015'],
  [' BRAND@vinamilk-demo.vn ', 'KOLHUB-4017'],
  ['KOL@demo.kolhub.vn', 'KOLHUB-4002'],
  ['khong-phai-email', 'KOLHUB-4018'],
])('startCompanyEmailChange(%s) → %s', async (email, code) =>
  await expect(biz.startCompanyEmailChange(email)).rejects.toMatchObject({ code }));
test('BR-63: bắt đầu đổi chưa làm đổi email', async () => {
  await biz.startCompanyEmailChange('mua-hang@vinamilk-demo.vn');
  expect(auth.currentAccount()?.email).toBe('brand@vinamilk-demo.vn');
});
test('BR-63: xác nhận khi OTP chưa verify / verify cho email khác / sai mục đích → 4014', async () => {
  const a = await otp.send({ channel: 'email', target: 'mua-hang@vinamilk-demo.vn', purpose: 'change-email' });
  await expect(biz.confirmCompanyEmailChange({ newEmail: 'mua-hang@vinamilk-demo.vn', otpRequestId: a.requestId })).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  const b = await otp.send({ channel: 'email', target: 'khac@vinamilk-demo.vn', purpose: 'change-email' });
  await otp.verify({ requestId: b.requestId, code: '123456' });
  await expect(biz.confirmCompanyEmailChange({ newEmail: 'mua-hang@vinamilk-demo.vn', otpRequestId: b.requestId })).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  const c = await otp.send({ channel: 'email', target: 'mua-hang2@vinamilk-demo.vn', purpose: 'register' });
  await otp.verify({ requestId: c.requestId, code: '123456' });
  await expect(biz.confirmCompanyEmailChange({ newEmail: 'mua-hang2@vinamilk-demo.vn', otpRequestId: c.requestId })).rejects.toMatchObject({ code: 'KOLHUB-4014' });
});
test('BR-63: đủ OTP → đổi email; đăng nhập bằng email mới được, email cũ 4012', async () => {
  const r = await otp.send({ channel: 'email', target: 'Mua-Hang@vinamilk-demo.vn', purpose: 'change-email' });
  await otp.verify({ requestId: r.requestId, code: '123456' });
  expect(await biz.confirmCompanyEmailChange({ newEmail: 'Mua-Hang@vinamilk-demo.vn', otpRequestId: r.requestId })).toMatchObject({ email: 'mua-hang@vinamilk-demo.vn' });
  await expect(auth.loginWithEmail('mua-hang@vinamilk-demo.vn', 'demo1234')).resolves.toMatchObject({ type: 'BIZ' });
  await expect(auth.loginWithEmail('brand@vinamilk-demo.vn', 'demo1234')).rejects.toMatchObject({ code: 'KOLHUB-4012' });
});
test('email mới bị tài khoản khác lấy mất giữa chừng → confirm 4002', async () => { /* verify OTP, db.update đổi email kol thành email mới, confirm → 4002 */ });
test('danh sách đã lưu vẫn thuộc tài khoản sau khi đổi email', async () => { /* seed có 2 danh sách; sau confirm, savedListService.listLists() vẫn dài 2 */ });
test('phiên KOL → 4016', async () => { /* … */ });
```

- [ ] **Step 2: Chạy `npm test -- bizAccount` — FAIL**
- [ ] **Step 3: Viết `bizAccount.ts`.** Kiểm tra email theo thứ tự: định dạng (4018, `field 'email'`) → trùng email hiện tại (4017) → miễn phí (4015) → đã thuộc tài khoản khác (4002). `confirmCompanyEmailChange` chạy lại đủ kiểm tra rồi yêu cầu `otp.isVerified(otpRequestId, { channel: 'email', target: newEmail, purpose: 'change-email' })` (4014), sau đó ghi `email` chuẩn hoá vào tài khoản đang đăng nhập; phiên giữ nguyên. Trả `Account` không có `password`.
- [ ] **Step 4: Thêm `bizAccountService` vào `services/index.ts`.**
- [ ] **Step 5: Chạy `npm test` — PASS toàn bộ**
- [ ] **Step 6: Commit** — `feat(services): business account update and company email change (BR-45, BR-63)`

---

### Task 6: Màn Tìm kiếm KOL (SCR-09)

**Files:**
- Create: `src/app/features/biz-search/format.ts`, `searchParams.ts`, `latestOnly.ts`, `PlatformIcon.tsx`, `StatusBadges.tsx`, `KolCard.tsx`, `SearchFilters.tsx`, `SearchPage.tsx`
- Modify: `src/app/routes.tsx` (`tim-kiem-kol` → `<SearchPage />`)
- Test: `src/app/features/biz-search/format.test.ts`, `searchParams.test.ts`, `latestOnly.test.ts`

**Interfaces:**
- Consumes: `searchService.search`, `savedListService.getSavedKolIds`, `errorMessage`, `KolhubError`, `PLATFORMS`, `KOL_CATEGORIES`, `KOL_REGIONS`, `KOL_SCALES`, kiểu `KolSearchQuery`, `KolSearchItem`, `KolSearchResult`, `BadgeState`, `KolListingStatus`
- Produces:
  - `formatFollowers(n: number): string`; `formatDate(iso: string): string` (`dd/MM/yyyy`, `date-fns/format`)
  - `parseSearchParams(sp: URLSearchParams): KolSearchQuery` — khoá URL: `q`, `linhVuc`, `khuVuc`, `quyMo`, `nenTang` (phẩy), `sapXep`, `trang`; giá trị lạ bị bỏ; thiếu `sapXep` → `'relevance'`; thiếu/lạ `trang` → 1
  - `toSearchParams(q: KolSearchQuery): URLSearchParams` — bỏ giá trị mặc định (`sapXep=relevance`, `trang=1`, mảng rỗng, chuỗi rỗng); giữ các khoá khác đang có trên URL (như `kol` của Task 7) là việc của trang, không của hàm này
  - `applyQueryPatch(q: KolSearchQuery, patch: Partial<KolSearchQuery>): KolSearchQuery` — patch không có `page` thì `page = 1`
  - `hasActiveFilters(q: KolSearchQuery): boolean` — có từ khoá hoặc bất kỳ bộ lọc nào (sắp xếp không tính)
  - `createLatestOnly(): <T>(p: Promise<T>) => Promise<{ stale: false; value: T } | { stale: true }>`
  - `<PlatformIcon platform: Platform; className?: string />` — SVG YouTube/TikTok lấy từ `getPlatformIcon` trong `CreatorCard.tsx`, thêm Facebook; `aria-label` = nhãn nền tảng
  - `<ChannelBadge badge: BadgeState; expiresAt: string />` — `VERIFIED`: `Badge` default, icon `ShieldCheck`, "Đã xác thực · đến {dd/MM/yyyy}"; `EXPIRED`: `Badge` outline `text-muted-foreground`, "Hết hạn dấu"
  - `<ListingStatusBadge status: KolListingStatus />` — VISIBLE "Đã xác thực" (default) · BADGE_EXPIRED "Hết hạn dấu" (outline) · INACTIVE "Ngừng hoạt động" (secondary) · UNAVAILABLE "Không còn hiển thị" (outline)
  - `<KolCard kol: KolSearchItem; saved: boolean; onView(): void; onSave(): void />`, `<KolCardSkeleton />`
  - `<SearchFilters query: KolSearchQuery; onChange(patch: Partial<KolSearchQuery>): void; onClear(): void />`
  - `<SearchPage />` — route `/tim-kiem-kol`; Task 7–8 cắm drawer và hộp lưu vào

- [ ] **Step 1: Viết test thất bại**

```ts
// format.test.ts
test.each([[1_200_000,'1,2M'],[1_000_000,'1M'],[890_000,'890K'],[4_500,'4,5K'],[999,'999'],[0,'0']])('formatFollowers(%i)=%s', (n, s) => expect(formatFollowers(n)).toBe(s));
test('formatDate', () => expect(formatDate('2027-01-05T03:00:00.000Z')).toBe('05/01/2027'));
// searchParams.test.ts
test('parse đủ khoá', () => expect(parseSearchParams(new URLSearchParams('q=chau&linhVuc=Du%20l%E1%BB%8Bch&nenTang=tiktok,youtube&sapXep=newest&trang=2')))
  .toEqual({ keyword: 'chau', category: 'Du lịch', platforms: ['tiktok','youtube'], sort: 'newest', page: 2 }));
test('giá trị lạ bị bỏ', () => expect(parseSearchParams(new URLSearchParams('nenTang=instagram,tiktok&quyMo=huge&trang=abc&sapXep=x&khuVuc=Paris')))
  .toEqual({ platforms: ['tiktok'], sort: 'relevance', page: 1 }));
test('toSearchParams bỏ giá trị mặc định; round-trip', () => {
  expect(toSearchParams({ sort: 'relevance', page: 1, platforms: [] }).toString()).toBe('');
  const q = { keyword: 'chau', region: 'Hà Nội', scale: 'micro', platforms: ['facebook'], sort: 'followers', page: 3 } as const;
  expect(parseSearchParams(toSearchParams(q))).toEqual(q);
});
test('đổi bộ lọc → về trang 1; đổi trang giữ trang', () => {
  expect(applyQueryPatch({ page: 3, sort: 'relevance' }, { region: 'Hà Nội' }).page).toBe(1);
  expect(applyQueryPatch({ page: 3, sort: 'relevance' }, { sort: 'newest' }).page).toBe(1);
  expect(applyQueryPatch({ page: 1, sort: 'relevance' }, { page: 2 }).page).toBe(2);
});
// latestOnly.test.ts
test('phản hồi cũ về sau bị đánh dấu stale', async () => {
  const latest = createLatestOnly();
  let r1!: (v: string) => void; const p1 = latest(new Promise<string>(r => (r1 = r)));
  const p2 = latest(Promise.resolve('mới'));
  expect(await p2).toEqual({ stale: false, value: 'mới' });
  r1('cũ'); expect(await p1).toEqual({ stale: true });
});
test('lỗi của lần gọi cũ cũng bị nuốt thành stale; lỗi của lần mới được ném ra', async () => { /* … */ });
```

- [ ] **Step 2: Chạy `npm test -- biz-search` — FAIL**
- [ ] **Step 3: Viết `format.ts`, `searchParams.ts`, `latestOnly.ts`.** `formatFollowers`: ≥ 1 000 000 → chia 1e6, ≥ 1 000 → chia 1e3, làm tròn 1 chữ số thập phân, bỏ `,0`, dấu thập phân là `,`.
- [ ] **Step 4: Chạy test — PASS**
- [ ] **Step 5: Viết `PlatformIcon`, `StatusBadges`, `KolCard`.** `KolCard` = `Card` gọn, bố cục lấy từ khối thẻ trong `CreatorCard.tsx`: `Avatar` (ảnh hoặc chữ cái đầu `bg-muted`), tên + icon `ShieldCheck` `text-primary` (`aria-label="Đã xác thực"`), `@nickname` + KOL ID `text-muted-foreground text-xs`, `Badge` secondary lĩnh vực, `MapPin` khu vực, tổng người theo dõi `formatFollowers` + chữ "người theo dõi", hàng `PlatformIcon` của `platforms`; chân thẻ 2 nút: "Xem hồ sơ" (outline) và nút icon `Bookmark` (`BookmarkCheck` + `aria-pressed` khi `saved`), `aria-label` "Lưu vào danh sách". Không có dropdown, huy chương, engagement, báo cáo, nhắn tin. `KolCardSkeleton` cùng khung với `Skeleton`.
- [ ] **Step 6: Viết `SearchFilters`.** Hàng trên: `Input` có icon `Search`, placeholder "Tìm theo tên, nghệ danh, KOL ID hoặc link kênh", debounce 300 ms rồi `onChange({ keyword })`; `Select` sắp xếp: "Liên quan" · "Người theo dõi cao nhất" · "Mới xác thực". Từ `md`: cùng hàng thêm 3 `Select` (Lĩnh vực · Khu vực · Quy mô, mục đầu "Tất cả …" = bỏ lọc) và `ToggleGroup type="multiple"` 3 chip nền tảng (icon + nhãn, tiêu đề nhóm "Nền tảng có dấu"). Dưới `md`: 3 Select + chip nằm trong `Sheet side="bottom"` mở bằng nút "Bộ lọc" có đếm số lọc đang bật. Nút "Xoá bộ lọc" (ghost) hiện khi `hasActiveFilters`. Không có bộ lọc "thuộc MCN".
- [ ] **Step 7: Viết `SearchPage`.** `query = parseSearchParams(searchParams)`; thay đổi → `setSearchParams(toSearchParams(applyQueryPatch(query, patch)))` (giữ khoá `kol` nếu có). Mỗi lần `query` đổi gọi `searchService.search(query)` qua `createLatestOnly` (bỏ `stale`). Trạng thái:
  - Loading: 8 `KolCardSkeleton` (lần đầu và mỗi lần tìm lại); dòng tổng số giữ số cũ.
  - Default: dòng "`{total}` KOL đã xác thực" + "Hiển thị {from}–{to}"; lưới `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4`; `Pagination` kit (Trước/Sau + số trang, ẩn khi `pageCount === 1`), đổi trang cuộn lên đầu.
  - Empty: icon `SearchX`, "Không tìm thấy KOL phù hợp", "Thử bỏ bớt bộ lọc hoặc đổi từ khoá.", nút "Xoá bộ lọc" khi `hasActiveFilters`.
  - Error `KOLHUB-4016`: khối khoá (icon `Lock`) với `errorMessage` + nút "Đăng ký tài khoản Nhãn hàng" → `/dang-ky?loai=biz`. Lỗi khác: `Alert` destructive + nút "Thử lại".
  - `saved` của thẻ lấy từ `savedListService.getSavedKolIds()` gọi một lần khi mount.
  - Tạm thời `onView`/`onSave` chỉ `setSearchParams` khoá `kol` / mở state rỗng — Task 7–8 nối vào.
- [ ] **Step 8: Sửa `routes.tsx`** — route `tim-kiem-kol` dùng `<SearchPage />`.
- [ ] **Step 9: Kiểm tra trên trình duyệt** (đăng nhập `brand@vinamilk-demo.vn` / `demo1234`) ở 375, 768, 1280 px: mặc định "35 KOL đã xác thực", trang 2 có 15 thẻ; `chau bui` ra Châu Bùi đầu tiên; dán `https://www.tiktok.com/@chaubui` ra Châu Bùi; chip TikTok không có KOL-2026-0003 qua TikTok (mở `?q=KOL-2026-0003&nenTang=tiktok` → rỗng); không thấy KOL-2026-0036..0040; gõ nhanh "c-h-a-u" không nháy kết quả sai; `?trang=9` hiện trang cuối; đổi bộ lọc khi ở trang 2 về trang 1; nút Back của trình duyệt quay lại bộ lọc trước; không cuộn ngang ở 375 px; console không lỗi.
- [ ] **Step 10: Commit** — `feat(biz-search): SCR-09 KOL search page`

---

### Task 7: Drawer hồ sơ KOL (SCR-10)

**Files:**
- Create: `src/app/features/biz-search/KolProfileSheet.tsx`
- Modify: `src/app/features/biz-search/SearchPage.tsx`

**Interfaces:**
- Consumes: `searchService.getKolPublicProfile`, `KolPublicProfile`, `PlatformIcon`, `ChannelBadge`, `ListingStatusBadge`, `formatFollowers`, `formatDate`
- Produces: `<KolProfileSheet kolId: string | null; saved: boolean; onOpenChange(open: boolean): void; onSave(kolId: string): void />` — dùng lại ở SCR-11

- [ ] **Step 1: Viết `KolProfileSheet`.** `Sheet side="right"`, `className="w-full sm:max-w-lg"`, mở khi `kolId !== null`; mỗi lần `kolId` đổi thì tải lại. Bố cục lấy từ phần header + "Chi tiết từng kênh" của `InfluencerDrawer.tsx`, chỉ gồm:
  - Đầu: avatar lớn, tên + `ShieldCheck` (chỉ khi `listingStatus === 'VISIBLE'`), `@nickname`, "KOL ID: …" có nút copy, `Badge` lĩnh vực, khu vực. `listingStatus !== 'VISIBLE'` → `Alert` trên cùng: BADGE_EXPIRED "KOL hiện không còn kênh mang dấu còn hiệu lực." · INACTIVE "KOL đang tạm ngừng hoạt động các kênh đã xác thực.".
  - "Giới thiệu": `bio`; "Tổng người theo dõi (kênh đã xác thực)": `formatFollowers(totalFollowers)`; "Xác thực lần đầu": `formatDate(verifiedAt)`.
  - "Kênh": mỗi kênh một hàng — `PlatformIcon`, `handle`, link `https://{url}` (`target="_blank" rel="noopener noreferrer"`), `formatFollowers(followers)`, `ChannelBadge`. Không có kênh → "Chưa có kênh công khai.".
  - "Liên hệ hợp tác": `collabEmail` là link `mailto:` + nút copy (`toast.success('Đã sao chép email')`); `null` → "Chưa cung cấp".
  - Chân cố định: nút chính "Lưu vào danh sách" (`Bookmark`; khi `saved` đổi nhãn "Đã lưu · Sửa danh sách") gọi `onSave(kolId)`.
  - Loading: `Skeleton` cho đầu và 3 hàng kênh. Error: `errorMessage` trong `Alert` + nút "Thử lại"; 4404 thì không có nút thử lại.
  - Không tham chiếu trường nào ngoài `KolPublicProfile` (không SĐT, địa chỉ, Zalo, eKYC, vi phạm, booking, tab email/ghi chú/vi phạm của drawer cũ).
- [ ] **Step 2: Nối vào `SearchPage`** — `kolId = searchParams.get('kol')`; "Xem hồ sơ" đặt `kol`, đóng thì xoá `kol` (giữ các khoá khác, `replace: false`).
- [ ] **Step 3: Kiểm tra** — `grep -nE "phone|zalo|address|private|violation|booking" src/app/features/biz-search/KolProfileSheet.tsx` không ra dòng nào. Trên trình duyệt: mở hồ sơ Giang Ơi (KOL-2026-0002) thấy kênh Facebook "Hết hạn dấu" và các kênh khác "Đã xác thực · đến …"; KOL-2026-0003 không có TikTok; tải lại trang với `?kol=KOL-2026-0001` mở sẵn drawer; `?kol=KOL-X` hiện thông báo 4404; 375 px drawer full màn hình, nút Lưu luôn thấy.
- [ ] **Step 4: Commit** — `feat(biz-search): SCR-10 public KOL profile drawer (BR-58)`

---

### Task 8: Hộp Lưu vào danh sách (SCR-12)

**Files:**
- Create: `src/app/features/biz-search/SaveToListsDialog.tsx`
- Modify: `src/app/features/biz-search/SearchPage.tsx`

**Interfaces:**
- Consumes: `savedListService.getMembership`, `createList`, `setMembership`, `errorMessage`, `KolhubError`
- Produces: `<SaveToListsDialog kolId: string | null; kolName: string; onOpenChange(open: boolean): void; onSaved(kolId: string, inAnyList: boolean): void />` — dùng lại ở SCR-11

- [ ] **Step 1: Viết `SaveToListsDialog`.** `Dialog` (từ `sm`) tiêu đề "Lưu {kolName} vào danh sách". Khi mở: `getMembership(kolId)` → danh sách `Checkbox` (nhãn = tên, phụ = "{count} KOL"), trạng thái chọn cục bộ; vùng cuộn `max-h-72`. Dưới: ô "Tạo danh sách mới" (`Input` + đếm "{n}/100" + nút "Tạo"); Enter cũng tạo; gọi `createList` ngay, thành công → thêm vào đầu danh sách **đã tick**, xoá ô; lỗi 4401/4402 hiện dưới ô (`text-destructive`, `aria-describedby`). Không danh sách nào: "Bạn chưa có danh sách nào. Tạo danh sách đầu tiên bên dưới." và focus ô tạo mới. Chân: "Huỷ" và "Lưu" → `setMembership(kolId, checkedIds)` → `toast.success` "Đã lưu {kolName} vào {k} danh sách" (hoặc "Đã bỏ {kolName} khỏi mọi danh sách" khi `k = 0`) → `onSaved(kolId, k > 0)` → đóng. Loading: `Skeleton` 3 dòng; nút Lưu `disabled` + spinner khi đang gửi; lỗi tải → `Alert` + "Thử lại".
- [ ] **Step 2: Nối vào `SearchPage`** — nút Lưu của `KolCard` và của `KolProfileSheet` mở hộp; `onSaved` cập nhật tập `savedIds` cục bộ (thêm/bỏ `kolId`).
- [ ] **Step 3: Kiểm tra trên trình duyệt:** lưu Châu Bùi vào "Chiến dịch Tết 2027" và danh sách mới "Hè 2027" → icon thẻ đổi `BookmarkCheck`; mở lại hộp thấy cả 2 được tick (BR-61); tạo " chiến dịch  TẾT 2027 " → lỗi trùng; dán 101 ký tự → lỗi 4402; bỏ tick hết + Lưu → icon về `Bookmark`.
- [ ] **Step 4: Commit** — `feat(biz-search): SCR-12 save-to-lists dialog (BR-60, BR-61)`

---

### Task 9: Màn Danh sách đã lưu (SCR-11)

**Files:**
- Create: `src/app/features/saved-lists/SavedListsPage.tsx`, `ListColumn.tsx`, `ListItemsTable.tsx`, `ListNameDialog.tsx`, `NoteDialog.tsx`
- Modify: `src/app/routes.tsx` (`danh-sach-da-luu` → `<SavedListsPage />`)

**Interfaces:**
- Consumes: `savedListService` (mọi hàm trừ `getSavedKolIds`), `SavedListSummary`, `SavedListDetail`, `SavedListRow`, `ListingStatusBadge`, `PlatformIcon`, `formatDate`, `KolProfileSheet`, `SaveToListsDialog`
- Produces:
  - `<SavedListsPage />` — route `/danh-sach-da-luu`, danh sách đang chọn ở `?ds=<listId>`, drawer hồ sơ ở `?kol=`
  - `<ListColumn lists: SavedListSummary[]; selectedId: string | null; onSelect(id: string): void; onCreate(): void />`
  - `<ListItemsTable rows: SavedListRow[]; onView(kolId): void; onEditNote(row): void; onRemove(kolId): void />`
  - `<ListNameDialog open; mode: 'create' | 'rename'; initialName?: string; onSubmit(name: string): Promise<void>; onOpenChange />` — hiện lỗi 4401/4402 dưới ô tên, giữ hộp mở khi lỗi
  - `<NoteDialog open; kolName: string; initialNote: string; onSubmit(note: string): Promise<void>; onOpenChange />` — `Textarea`, đếm "{n}/500", lỗi 4405 dưới ô

- [ ] **Step 1: Viết `ListNameDialog`, `NoteDialog`.**
- [ ] **Step 2: Viết `ListColumn`** — tiêu đề "Danh sách của bạn" + nút "Tạo danh sách" (`Plus`); mỗi mục là nút full-width: tên (cắt 1 dòng, `title` đầy đủ) + `Badge` secondary số lượng; mục chọn `bg-accent text-accent-foreground`, `aria-current="true"`.
- [ ] **Step 3: Viết `ListItemsTable`** — từ `md`: `Table` kit, cột: KOL (avatar + tên + KOL ID), Lĩnh vực, Nền tảng (`PlatformIcon`), Trạng thái (`ListingStatusBadge`), Ghi chú (văn bản cắt 2 dòng hoặc "Thêm ghi chú" `text-muted-foreground`, bấm mở `NoteDialog`), Ngày lưu (`formatDate`), thao tác (`DropdownMenu`: Xem hồ sơ · Sửa ghi chú · Bỏ khỏi danh sách). Dưới `md`: danh sách `Card` mỗi KOL một thẻ cùng nội dung, thao tác ở `DropdownMenu` góc phải. Dòng `UNAVAILABLE` không có "Xem hồ sơ".
- [ ] **Step 4: Viết `SavedListsPage`.** Tải `listLists()`; `?ds` không hợp lệ/thiếu → chọn danh sách đầu (replace). Bố cục `grid gap-4 md:grid-cols-[280px_1fr]`: trái `ListColumn` trong `Card`; phải `Card` gồm đầu (tên danh sách, "{count} KOL", `DropdownMenu` "Đổi tên" · "Xoá danh sách") và `ListItemsTable`. Dưới `md`: cột trái thay bằng `Select` chọn danh sách + nút "Tạo danh sách", nội dung xếp dọc. Trạng thái:
  - Chưa có danh sách: icon `BookMarked`, "Bạn chưa có danh sách nào", nút "Tạo danh sách" và nút "Tìm kiếm KOL" → `/tim-kiem-kol`.
  - Danh sách trống (§9.3): "Danh sách trống" + nút "Tìm kiếm KOL".
  - Loading: `Skeleton` cho cột trái (4 dòng) và bảng (5 dòng).
  - Lỗi tải: `Alert` + "Thử lại"; `KOLHUB-4403` khi mở `?ds` lạ → chọn danh sách đầu + `toast.error(errorMessage)`.
  - Thành công: toast "Đã tạo danh sách", "Đã đổi tên", "Đã xoá danh sách", "Đã bỏ {tên KOL} khỏi danh sách", "Đã lưu ghi chú".
  - Xoá danh sách: `AlertDialog` "Xoá danh sách “{name}”?" / "Chỉ xoá danh sách, không ảnh hưởng tới KOL." / nút "Xoá" (destructive) → chọn danh sách đầu còn lại.
  - Bỏ KOL khỏi danh sách: làm ngay + toast có nút "Hoàn tác" gọi `setMembership(kolId, [...listIdsHiệnTại, listId])` (lấy từ `getMembership`); ghi chú cũ không khôi phục được — ghi rõ trong toast description "Ghi chú sẽ không được khôi phục" khi dòng có ghi chú.
  - "Xem hồ sơ" mở `KolProfileSheet` (`?kol=`), nút Lưu trong drawer mở `SaveToListsDialog`; `onSaved` tải lại `listLists()` và danh sách đang xem.
- [ ] **Step 5: Sửa `routes.tsx`.**
- [ ] **Step 6: Kiểm tra trên trình duyệt** (375, 768, 1280 px): dữ liệu mẫu có "Chiến dịch Tết 2027" (3) và "KOL ẩm thực" (2); KOL-2026-0038 hiện "Hết hạn dấu", KOL-2026-0036 hiện "Ngừng hoạt động" (BR-62); thêm/sửa ghi chú; đổi tên trùng → lỗi dưới ô, hộp không đóng; xoá danh sách; bỏ KOL rồi Hoàn tác; `?ds=khong-co` → chọn danh sách đầu + toast; đăng nhập tài khoản Nhãn hàng mới đăng ký thì thấy trạng thái "chưa có danh sách" (BR-59); console không lỗi.
- [ ] **Step 7: Commit** — `feat(saved-lists): SCR-11 saved lists page (BR-59..62)`

---

### Task 10: Màn Tài khoản doanh nghiệp (SCR-08)

**Files:**
- Create: `src/app/features/biz-account/BizAccountPage.tsx`, `EditBizProfileDialog.tsx`, `ChangeEmailDialog.tsx`
- Modify: `src/app/routes.tsx` (`tai-khoan-doanh-nghiep` → `<BizAccountPage />`)

**Interfaces:**
- Consumes: `bizAccountService`, `useAuth()` (`account`, `setAccount`), `<OtpStep channel target purpose onVerified onBack />` (Đợt 1), `errorMessage`
- Produces: `<BizAccountPage />` — route `/tai-khoan-doanh-nghiep`

- [ ] **Step 1: Viết `EditBizProfileDialog`** — `Input` "Họ tên", "Tên công ty"; lỗi 4018 dưới đúng trường theo `meta.field`; thành công → `setAccount(acc)` + `toast.success('Đã cập nhật thông tin doanh nghiệp')`.
- [ ] **Step 2: Viết `ChangeEmailDialog`** — trạng thái `'email' | 'otp'`. Bước `email`: `Input type="email"` "Email công ty mới", gợi ý "Dùng email theo tên miền công ty, không dùng Gmail, Yahoo, Outlook, Hotmail, iCloud, Live." → `startCompanyEmailChange`; lỗi 4015/4017/4002/4018 dưới ô. Bước `otp`: dòng "Mã xác thực đã gửi tới {email}. Email hiện tại vẫn dùng được cho tới khi bạn xác nhận." + `<OtpStep channel="email" target={email} purpose="change-email" onVerified={id => confirmCompanyEmailChange({ newEmail: email, otpRequestId: id })} onBack={() => về bước email, giữ giá trị} />`; thành công → `setAccount(acc)` + `toast.success('Đã đổi email công ty thành {email}')` + đóng; lỗi confirm → `Alert` trong hộp, cho quay lại bước email. Đóng hộp giữa chừng không đổi gì.
- [ ] **Step 3: Viết `BizAccountPage`** — `max-w-3xl`, 3 `Card`:
  - "Thông tin doanh nghiệp": Họ tên, Tên công ty (dạng `dl` 2 cột từ `sm`), nút "Sửa" (`Pencil`) mở `EditBizProfileDialog`.
  - "Email công ty": email + `Badge` "Đã xác thực" (icon `MailCheck`), dòng phụ "Email dùng để đăng nhập và nhận thông báo."; nút "Đổi email" mở `ChangeEmailDialog`.
  - "Loại tài khoản": "Nhãn hàng/Agency" + "Dùng Tìm kiếm KOL, Xem hồ sơ KOL và Danh sách đã lưu. Không cần eKYC hay giấy chứng nhận." (BR-46, BR-52).
- [ ] **Step 4: Sửa `routes.tsx`.**
- [ ] **Step 5: Kiểm tra trên trình duyệt:** sửa tên công ty, Header cập nhật ngay; đổi email sang `@gmail.com` → 4015; sang email của KOL mẫu → 4002; sang `mua-hang@vinamilk-demo.vn` → OTP hiện ở hộp thư giả → nhập → email mới hiện ở trang và menu Header; đăng xuất, đăng nhập bằng email mới được, email cũ báo 4012; bấm "Quay lại" ở bước OTP giữ email đã nhập; 375 px không tràn.
- [ ] **Step 6: Commit** — `feat(biz-account): SCR-08 business account with company email change (BR-63)`

---

### Task 11: Demo Panel — khối "Giả định" cho Đợt 3

**Files:**
- Modify: `src/app/demo/DemoPanel.tsx`

**Interfaces:**
- Consumes: `<DemoPanel />` (Đợt 1)
- Produces: khối "Giả định" (nếu Đợt 2 đã tạo khối này thì chỉ thêm dòng)

- [ ] **Step 1:** Thêm `Accordion` mục "Giả định" với các dòng nguyên văn:
  - "Kênh ngừng hoạt động giữ dấu nhưng ẩn khỏi tìm kiếm và hồ sơ công khai (câu hỏi 6)."
  - "KOL không có tuỳ chọn ẩn khỏi tìm kiếm; email hợp tác luôn hiện (câu hỏi 7)."
  - "Tìm kiếm 20 KOL/trang; không giới hạn số danh sách và số KOL mỗi danh sách; không xuất Excel (câu hỏi 9)."
  - "Bộ lọc “thuộc MCN” đang ẩn vì liên kết KOL–MCN ngoài phạm vi (BR-55)."
  - "Quy mô tính theo tổng người theo dõi của các kênh còn dấu: Nano < 10K · Micro 10K–100K · Mid 100K–500K · Macro 500K–1M · Mega ≥ 1M."
  - "Chỉ lưu được KOL đang hiện trong tìm kiếm; KOL đã lưu rồi mất dấu vẫn ở lại danh sách (BR-62)."
- [ ] **Step 2: Kiểm tra trên trình duyệt** — mở panel ở 375 px và 1280 px, khối hiện đủ 6 dòng, không che nút khác.
- [ ] **Step 3: Commit** — `feat(demo): phase 3 assumptions in demo panel`

---

### Task 12: Nối KOL do Đợt 2 duyệt vào danh bạ (có điều kiện)

**Files:**
- Modify: `src/app/services/mock/directory.ts`
- Test: `src/app/services/mock/directory.test.ts` (thêm `describe('readDirectory + Đợt 2')`)

**Interfaces:**
- Consumes: `listApprovedKols(state: DemoState): ApprovedKolSummary[]` của Đợt 2, `ApprovedKolSummary = { kolId; displayName; avatar?; category?; region?; channels: { platform: 'facebook'|'youtube'|'tiktok'; url; followers?; badgeExpiresAt }[]; verifiedAt }`
- Produces: `fromApprovedSummary(s: ApprovedKolSummary): DirectoryKol`; `readDirectory(state)` trả `state.directory` + KOL Đợt 2 chưa có `kolId` trong `state.directory`

- [ ] **Step 1: Kiểm tra điều kiện** — `grep -rnE "export (async )?function listApprovedKols|export const listApprovedKols" src/app/services`. Không có → đánh dấu task này `- [x] Bỏ qua: Đợt 2 chưa export listApprovedKols (ngày …)` trong file plan, commit `docs: note phase 3 task 12 skipped`, dừng task.
- [ ] **Step 2: Viết test thất bại** (`vi.mock('<đường dẫn tương đối từ file test tới module tìm được ở Step 1>', () => ({ listApprovedKols: () => [summary] }))`, `summary = { kolId: 'KOL-P2-0001', displayName: 'KOL Đợt Hai', category: 'Ẩm thực', region: 'Miền Tây', channels: [{ platform: 'youtube', url: 'https://www.youtube.com/@doihai', followers: 12_000, badgeExpiresAt: iso(NOW + 300*DAY) }], verifiedAt: iso(NOW - DAY) }`)

```ts
test('KOL Đợt 2 xuất hiện trong tìm kiếm', async () =>
  expect((await search.search({ keyword: 'KOL-P2-0001' })).items).toMatchObject([{ kolId: 'KOL-P2-0001', platforms: ['youtube'], scale: 'micro' }]));
test('khu vực ngoài danh mục → undefined; email hợp tác null', async () => {
  const p = await search.getKolPublicProfile('KOL-P2-0001');
  expect(p).toMatchObject({ collabEmail: null, category: 'Ẩm thực' });
  expect(p.region).toBeUndefined();
});
test('trùng kolId với danh bạ mẫu → giữ bản mẫu', () => { /* summary kolId 'KOL-T-0001' → readDirectory có đúng 1 bản, displayName 'Châu Bùi' */ });
test('kênh hết hạn theo badgeExpiresAt → không tìm được', async () => { /* … */ });
```
- [ ] **Step 3: Chạy `npm test -- directory` — FAIL**
- [ ] **Step 4: Viết `fromApprovedSummary` và sửa `readDirectory`.** Ánh xạ: `nickname` = phần sau `@` hoặc đoạn path cuối của URL kênh đầu (không có → `''`); `bio: ''`; `category`/`region` chỉ giữ khi thuộc `KOL_CATEGORIES`/`KOL_REGIONS`; `collabEmail: null`; kênh: `id = '{kolId}-{platform}-{i}'`, `url = normalizeUrl(url)`, `handle` như nickname, `followers ?? 0`, `status 'VERIFIED'`, `active true`, `verifiedAt` = của KOL; không có `private`. `readDirectory` bọc lời gọi Đợt 2 trong `try/catch` (lỗi → chỉ trả `state.directory`).
- [ ] **Step 5: Chạy `npm test` — PASS toàn bộ**
- [ ] **Step 6: Kiểm tra trên trình duyệt** — dùng Demo Panel duyệt một KOL ở Đợt 2, đăng nhập Nhãn hàng, tìm theo KOL ID của KOL đó thấy thẻ và mở được hồ sơ.
- [ ] **Step 7: Commit** — `feat(services): include phase-2 approved KOLs in brand search`

---

### Task 13: Kiểm tra cuối Đợt 3

- [ ] **Step 1:** `npm test` — toàn bộ PASS (Đợt 1, 2, 3).
- [ ] **Step 2:** `npm run build` — thành công.
- [ ] **Step 3:** Trên trình duyệt ở 375, 768, 1280 px, tài khoản `brand@vinamilk-demo.vn`: đi UC-11 → UC-14 và SCR-08 theo Step kiểm tra của Task 6–10; KOL/MCN gõ `/tim-kiem-kol`, `/danh-sach-da-luu`, `/tai-khoan-doanh-nghiep` → về màn mặc định + toast (BR-67); Reset dữ liệu demo đưa danh sách về 2 danh sách mẫu; console không lỗi mới.
- [ ] **Step 4:** Commit nếu còn thay đổi — `chore: đợt 3 verification fixes`
