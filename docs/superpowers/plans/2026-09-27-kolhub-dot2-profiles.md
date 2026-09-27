# KOL Hub Prototype — Đợt 2: Hồ sơ KOL và MCN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KOL và MCN hoàn thiện hồ sơ (liên hệ, định danh bằng eKYC/GCN, kênh), gửi xét duyệt và theo dõi kết quả; Demo Panel giả lập Admin, chọn case eKYC, xem phễu và danh sách giả định để mọi trạng thái ở §7.2/7.3/7.4 tái hiện được bằng thao tác.

**Architecture:** Mọi luật nằm trong 5 dịch vụ mock thuần TypeScript (`profile`, `ekyc`, `channel`, `review`, `funnel`) theo đúng khuôn Đợt 1: factory nhận `{ db, now, delay?: false, notify? }`, dữ liệu nằm trong `DemoState` (chỉ thêm khoá mới). Các luật dùng chung (tính %, điều kiện gửi, timeline, che số CCCD, nhận diện nền tảng) là hàm thuần trong `profileRules.ts` và `channelRules.ts`. Màn hình đọc dữ liệu qua `useLiveQuery`, tự làm mới khi `db` đổi (ví dụ Admin duyệt trong Demo Panel) nhờ lớp `observeDb`.

**Tech Stack:** React 18, react-router 7, Tailwind v4, NetSpace kit (`src/app/components/ui`), `sonner`, `lucide-react`, `date-fns` 3.6 (`addMonths`, `format`), Vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-27-kolhub-user-prototype-design.md` (§3 Đợt 2; §4 khối Giả lập Admin, Case eKYC, Phễu, Giả định; §6). Nghiệp vụ gốc: `../NS-KOLHUB-001-nguoi-dung-v1.0.md` (UC-06…10, UC-15…19, FR-07…14, FR-18, BR-11…29, BR-42…44, BR-64/65, §7.2–7.5, SCR-03…07). Nền: `docs/superpowers/plans/2026-09-27-kolhub-dot1-role-auth.md` (phải xong trước).

## Global Constraints

- Mọi Global Constraint của Đợt 1 vẫn áp dụng (màn hình chỉ import `src/app/services/index.ts`; lỗi nghiệp vụ là `KolhubError`; không chữ "NetSpace"; component kit + token màu; `localStorage` bọc `try/catch`).
- `DemoState` chỉ **thêm** khoá: `kolProfiles`, `mcnProfiles`, `identities`, `ekycSessions`, `ekycScenario`, `channels`, `reviewRequests`, `changeRequests`, `funnel`. Không đổi tên khoá Đợt 1, `version` giữ `1`. Đợt 3 làm song song cũng thêm khoá/ export vào `db.ts`, `seed.ts`, `services/index.ts`: chỉ thêm dòng, không sắp xếp lại.
- Thời điểm trong state là số mili giây (`number`); riêng `ApprovedKolSummary` dùng chuỗi ISO.
- Nền tảng: chỉ `'facebook' | 'youtube' | 'tiktok'` (chữ thường, khớp `data/creators.ts`); link khác → KOLHUB-4202 (BR-20).
- Ảnh quản lý kênh / avatar / ảnh bìa: `image/jpeg` hoặc `image/png`, ≤ `10 * 1024 * 1024` byte, sai → KOLHUB-4203 (BR-21). File GCN: `image/jpeg | image/png | application/pdf` (sai → 4301, kiểm trước) và ≤ 10 MB (→ 4302) (BR-26).
- Không lưu nội dung file gốc hay video vào state; chỉ `StoredFile = { name, type, size, thumbnail? }`, `thumbnail` là JPEG dataURL cạnh dài ≤ 480 px (PDF/video không có thumbnail).
- eKYC: mã **tính lần thử** là 4101, 4102, 4105, 4106; 4103, 4104, 4107, 5101 và thoát giữa chừng **không tính**. Đủ 5 lần tính trong 24 giờ trượt → KOLHUB-4108, khoá tới `lần thất bại thứ 5 + 24 giờ` (BR-13, §7.4).
- Định danh chỉ hiện họ tên, ngày sinh, ngày cấp và số CCCD che dạng `079*******45` (3 số đầu + `*` + 2 số cuối) (BR-14, FR-09). Không đưa dữ liệu `identities` ra `ApprovedKolSummary`.
- Hồ sơ: `DRAFT → SUBMITTED → APPROVED | NEEDS_FIX | REJECTED`, `NEEDS_FIX → SUBMITTED` (§7.2). Kênh: `PENDING_REVIEW → VERIFIED | NEEDS_FIX`, `NEEDS_FIX → PENDING_REVIEW`, `VERIFIED → EXPIRED`; `active` độc lập (§7.3). Không có thao tác xoá kênh (BR-23).
- Dấu theo từng kênh, hạn `addMonths(duyệt, 12)`; khiên cạnh tên chỉ khi hồ sơ `APPROVED` (BR-16).
- "Cần bổ sung" cho kênh, từ chối hồ sơ, từ chối thay đổi đều bắt buộc lý do (sau `trim()` khác rỗng) (BR-15, BR-44).
- Hồ sơ hoàn thiện = 5 mốc × 20%: liên hệ đủ trường bắt buộc · có nhân sự quản lý nội dung · KOL: eKYC `PASSED` / MCN: có file GCN · ≥ 1 kênh `active` có ảnh · đã gửi xét duyệt (`status !== 'DRAFT'`).
- Trường liên hệ bắt buộc (KOL và MCN): `displayName`, `phone` (hợp `isValidPhone`), `email` (hợp `isValidEmail`), `province`, `address`, `category`. Nhân sự: `staffName` và `staffPhone` (hợp `isValidPhone`).
- Thay đổi cần duyệt (BR-27, BR-43, FR-18): KOL đổi `displayName` hoặc MCN đổi định danh tổ chức/GCN khi hồ sơ ở `SUBMITTED` hoặc `APPROVED` → tạo/ghi đè một `ChangeRequest` `PENDING_CHANGE` cho trường đó, dữ liệu hiển thị giữ nguyên. Ở `DRAFT`/`NEEDS_FIX` lưu thẳng. Ở `REJECTED` định danh chỉ xem.
- Box Trạng thái xét duyệt không có nút nào (BR-19). SLA hiển thị: "1–2 ngày làm việc" (BR-17).
- KOL/MCN mobile-first: kiểm ở 375 px trước; các bước eKYC full màn hình dưới `md`.

## Review Focus

1. **Dữ liệu demo của Đợt 1 còn trong trình duyệt:** state `version: 1` thiếu các khoá Đợt 2 → phải tự bổ sung từ seed, giữ nguyên tài khoản đã đăng ký, không trắng trang. Test ở Task 1.
2. **Cùng một kênh viết khác kiểu:** `https://www.facebook.com/abc/`, `facebook.com/abc?ref=x`, `m.facebook.com/abc#top` là một kênh → lần thứ hai báo 4201. Test ở Task 5.
3. **Mở Sửa kênh đã xác thực rồi bấm Lưu mà không đổi gì:** kênh giữ `VERIFIED` và hạn dấu (UC-09 2a). Test ở Task 5.
4. **Bấm "Gửi xét duyệt" hai lần / gửi khi đang `SUBMITTED`:** lần hai bị chặn, chỉ có một `ReviewRequest`. Test ở Task 6.
5. **Biên thời gian:** khoá eKYC mở đúng lúc `lần thứ 5 + 24h`, xen giữa là 5101 không tính; kênh có `badgeExpiresAt === now` coi như hết hạn (không vào `listApprovedKols`). Test ở Task 4 và Task 6.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/app/services/profile-types.ts` | Kiểu Đợt 2: hồ sơ, kênh, eKYC, review, change request, funnel, view, `ApprovedKolSummary`, `ValidationError`, hằng số danh mục |
| `src/app/services/types.ts` | Sửa: mở rộng `ErrorCode` và `KolhubError['meta']` |
| `src/app/services/errors.ts` | Sửa: thông điệp 4101–4108, 5101, 4201–4203, 4301–4304 |
| `src/app/services/mock/db.ts` | Sửa: thêm khoá vào `DemoState`; bổ sung khoá thiếu khi nạp |
| `src/app/services/mock/seed.ts` | Sửa: hồ sơ `DRAFT` rỗng cho tài khoản KOL/MCN mẫu |
| `src/app/services/mock/observeDb.ts` | `observeDb(db)` — `Db` kèm `subscribe` |
| `src/app/services/noticeInbox.ts` | Pub/sub thông báo giả (email/SMS kết quả xét duyệt) |
| `src/app/services/mock/testHarness.ts` | Helper test: db bộ nhớ, đồng hồ giả, id tài khoản mẫu |
| `src/app/services/mock/profileRules.ts` | Hàm thuần: hồ sơ rỗng, trường bắt buộc, %, checklist, timeline, che CCCD, chuẩn hoá tên, quét hết hạn |
| `src/app/services/mock/channelRules.ts` | Hàm thuần: `detectPlatform`, `normalizeChannelUrl`, `channelHandle`, `validateProofImage`, `validateGcnFile`, `countByFilter` |
| `src/app/services/mock/profile.ts` | `createProfileService` |
| `src/app/services/mock/ekyc.ts` | `createEkycService` |
| `src/app/services/mock/channel.ts` | `createChannelService` |
| `src/app/services/mock/review.ts` | `createReviewService`, `listApprovedKols` |
| `src/app/services/mock/funnel.ts` | `createFunnelService`, `trackFunnel`, `buildFunnel`, `formatDuration` |
| `src/app/services/index.ts` | Sửa: nối dịch vụ mới qua `observeDb(db)`, export |
| `src/app/features/shared/useLiveQuery.ts` | Hook tải + tự làm mới khi dữ liệu đổi |
| `src/app/features/shared/files.ts` | `toStoredFile(file)` (tạo thumbnail bằng canvas) |
| `src/app/features/shared/StatusBadges.tsx` | `ProfileStatusBadge`, `ChannelStatusBadge`, `PlatformIcon` |
| `src/app/features/notice/NoticeInboxToaster.tsx` | Toast email/SMS giả khi có kết quả xét duyệt |
| `src/app/features/profile/primaryAction.ts` | Nút chính SCR-03 theo trạng thái (thuần, có test) |
| `src/app/features/profile/ProfileHeader.tsx` | SCR-03 |
| `src/app/features/profile/ProfilePage.tsx` | Khung trang 3 tab dùng chung KOL/MCN, tab theo `?tab=` |
| `src/app/features/profile/ContactTab.tsx` | SCR-04 |
| `src/app/features/channels/ChannelsTab.tsx`, `ChannelFormSheet.tsx` | SCR-06 |
| `src/app/features/review-status/ReviewStatusBox.tsx` | Box 2 — timeline 3 mốc, chỉ xem |
| `src/app/features/kol-profile/KolIdentityTab.tsx`, `EkycStepper.tsx`, `ekycCopy.ts` | SCR-05 |
| `src/app/features/mcn-profile/McnIdentityTab.tsx` | SCR-07 |
| `src/app/features/profile/SubmitPanel.tsx` | Checklist BR-64/65 + 3 cam đoan + Gửi xét duyệt (dùng chung) |
| `src/app/demo/AdminSimulator.tsx`, `EkycScenarioPicker.tsx`, `FunnelView.tsx`, `assumptions.ts`, `AssumptionsList.tsx` | Khối Demo Panel mới |
| `src/app/demo/DemoPanel.tsx`, `src/app/routes.tsx`, `src/app/App.tsx`, `src/app/features/register/RegisterPage.tsx` | Sửa: gắn khối mới, route thật, toaster, ghi phễu đăng ký |

---

### Task 1: Kiểu Đợt 2, mở rộng DemoState, seed, db quan sát được

**Files:**
- Create: `src/app/services/profile-types.ts`, `src/app/services/mock/observeDb.ts`, `src/app/services/noticeInbox.ts`, `src/app/services/mock/testHarness.ts`
- Modify: `src/app/services/types.ts`, `src/app/services/errors.ts`, `src/app/services/mock/db.ts`, `src/app/services/mock/seed.ts`
- Test: `src/app/services/mock/db.test.ts` (thêm case), `src/app/services/mock/observeDb.test.ts`

**Interfaces:**
- Consumes: `DemoState`, `createDb`, `Db`, `seedState`, `Account`, `ErrorCode`, `KolhubError`, `errorMessage` (Đợt 1)
- Produces (trong `profile-types.ts`, trừ khi ghi khác):
  - `type OwnerType = 'KOL' | 'MCN'`; `type ProfileStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_FIX' | 'REJECTED'`
  - `type Platform = 'facebook' | 'youtube' | 'tiktok'`; `type ChannelStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'NEEDS_FIX' | 'EXPIRED'`
  - `type EkycStatus = 'NOT_STARTED' | 'OCR_PASSED' | 'PASSED' | 'MANUAL_REVIEW' | 'REPORTED'`
  - `type EkycScenario = 'SUCCESS' | 'KOLHUB-4101' | 'KOLHUB-4102' | 'KOLHUB-4103' | 'KOLHUB-4104' | 'KOLHUB-4105' | 'KOLHUB-4106' | 'KOLHUB-4107' | 'KOLHUB-5101'`
  - `interface StoredFile { name: string; type: string; size: number; thumbnail?: string }`
  - `interface ContactInfo { displayName: string; phone: string; email: string; zalo: string; country: string; province: string; address: string; category: string }`
  - `interface StaffInfo { staffName: string; staffPhone: string; staffEmail: string }`
  - `interface ProfileBase { accountId: string; contact: ContactInfo; staff: StaffInfo; avatar?: StoredFile; cover?: StoredFile; status: ProfileStatus; submittedAt?: number; decidedAt?: number; decisionReason?: string; approvedAt?: number; createdAt: number; updatedAt: number }`
  - `interface OcrData { fullName: string; dob: string; idNoMasked: string; issueDate: string }`
  - `interface KolProfile extends ProfileBase { ownerType: 'KOL'; kolId?: string; ekycStatus: EkycStatus; ekycDraft?: OcrData & { nameMismatch: boolean } }`
  - `interface OrgIdentity { orgName: string; regNo: string; regDate: string; regBy: string; legalRep: string }`
  - `interface McnProfile extends ProfileBase { ownerType: 'MCN'; mcnId?: string; org: OrgIdentity; gcnFile?: StoredFile }`
  - `interface IdentityRecord { accountId: string; fullName: string; dob: string; idNoMasked: string; issueDate: string; ekycSessionId: string; verifiedAt: number }`
  - `interface EkycSession { id: string; accountId: string; step: 'OCR' | 'FACE'; resultCode: 'OK' | ErrorCode; counted: boolean; createdAt: number; lockedUntil?: number }` (`lockedUntil` chỉ có ở lần thất bại gây khoá)
  - `interface Channel { id: string; ownerType: OwnerType; ownerId: string; platform: Platform; url: string; handle: string; proofImage: StoredFile; status: ChannelStatus; active: boolean; badgeExpiresAt?: number; verifiedAt?: number; badgeSuspended?: boolean; note?: string; followers?: number; createdAt: number; updatedAt: number }`
  - `interface ReviewRequest { id: string; ownerType: OwnerType; ownerId: string; submittedAt: number; status: 'SUBMITTED' | 'APPROVED' | 'NEEDS_FIX' | 'REJECTED'; decidedAt?: number; reason?: string }`
  - `type OrgChange = { org: OrgIdentity; gcnFile?: StoredFile }`; `type ChangeField = 'displayName' | 'orgIdentity'`
  - `interface ChangeRequest { id: string; ownerType: OwnerType; ownerId: string; field: ChangeField; oldValue: string | OrgChange; newValue: string | OrgChange; status: 'PENDING_CHANGE' | 'APPROVED' | 'REJECTED'; reason?: string; createdAt: number; decidedAt?: number }`
  - `type FunnelStep = 'register_started' | 'otp_email_verified' | 'otp_sms_verified' | 'ekyc_ocr_passed' | 'ekyc_face_passed' | 'channel_added' | 'profile_submitted'`; `interface FunnelEvent { subject: string; step: FunnelStep; at: number }`
  - `interface NoticeMessage { channel: 'email' | 'sms'; target: string; title: string; body: string }`
  - `class ValidationError extends Error { field: string }` (lỗi định dạng trường, không có mã trong spec)
  - `interface ApprovedKolSummary { kolId: string; displayName: string; avatar?: string; category?: string; region?: string; channels: { platform: Platform; url: string; followers?: number; badgeExpiresAt: string }[]; verifiedAt: string }`
  - Hằng: `KOL_CATEGORIES = ['Giáo dục','Làm đẹp','Thời trang','Ẩm thực','Du lịch','Công nghệ','Giải trí','Thể thao','Gia đình','Tài chính','Khác']`, `PROVINCES = ['Hà Nội','TP. Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','Khác']`, `MAX_FILE_BYTES = 10 * 1024 * 1024`
  - `types.ts`: `ErrorCode` thêm `'KOLHUB-4101'…'KOLHUB-4108'`, `'KOLHUB-5101'`, `'KOLHUB-4201' | 'KOLHUB-4202' | 'KOLHUB-4203'`, `'KOLHUB-4301'…'KOLHUB-4304'`; `meta` thêm `lockedUntil?: number; ownedByOther?: boolean`
  - `db.ts`: `DemoState` thêm `kolProfiles: KolProfile[]; mcnProfiles: McnProfile[]; identities: IdentityRecord[]; ekycSessions: EkycSession[]; ekycScenario: EkycScenario; channels: Channel[]; reviewRequests: ReviewRequest[]; changeRequests: ChangeRequest[]; funnel: FunnelEvent[]`
  - `observeDb(db: Db): LiveDb` với `interface LiveDb extends Db { subscribe(fn: () => void): () => void }` — gọi listener sau mỗi `update` và `reset`
  - `noticeInbox: { publish(m: NoticeMessage): void; subscribe(fn: (m: NoticeMessage) => void): () => void }`
  - `testHarness.ts`: `makeHarness(): { db: Db; clock: { t: number }; now: () => number; kolId: string; mcnId: string; notices: NoticeMessage[] }` — `createDb(null, seedState)`, `clock.t = new Date(2026, 8, 27, 9, 0).getTime()`, id tìm theo email `kol@demo.kolhub.vn` / `mcn@demo.kolhub.vn`

- [ ] **Step 1: Viết test thất bại** (thêm vào `db.test.ts`; `memoryStorage` là helper sẵn có của Đợt 1)

```ts
test('state v1 cũ thiếu khoá Đợt 2 → bổ sung từ seed, giữ tài khoản', () => {
  const old = seedState(); old.accounts.push({ ...old.accounts[0], id: 'new1', email: 'x@y.vn' });
  for (const k of ['kolProfiles','mcnProfiles','identities','ekycSessions','ekycScenario','channels','reviewRequests','changeRequests','funnel']) delete (old as any)[k];
  const db = createDb(memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) }), seedState);
  expect(db.read().accounts.map(a => a.id)).toContain('new1');
  expect(db.read().channels).toEqual([]);
  expect(db.read().ekycScenario).toBe('SUCCESS');
});
test('seed: KOL và MCN mẫu có hồ sơ DRAFT rỗng', () => {
  const s = seedState();
  expect(s.kolProfiles).toHaveLength(1);
  expect(s.kolProfiles[0]).toMatchObject({ status: 'DRAFT', ekycStatus: 'NOT_STARTED', contact: { displayName: '', email: 'kol@demo.kolhub.vn', phone: '0912000001' } });
  expect(s.mcnProfiles[0]).toMatchObject({ status: 'DRAFT', org: { orgName: '', regNo: '' } });
  expect(s.mcnProfiles[0].gcnFile).toBeUndefined();
});
test('setItem ném lỗi (hết quota) → vẫn đọc được thay đổi trong bộ nhớ', () => {
  const bad = { ...memoryStorage({}), setItem: () => { throw new Error('QuotaExceededError'); } };
  const db = createDb(bad, seedState);
  db.update(s => { s.ekycScenario = 'KOLHUB-4101'; });
  expect(db.read().ekycScenario).toBe('KOLHUB-4101');
});
// observeDb.test.ts
test('subscribe nhận tín hiệu sau update và reset, huỷ được', () => {
  const live = observeDb(createDb(null, seedState)); const fn = vi.fn();
  const off = live.subscribe(fn);
  live.update(s => { s.funnel = []; }); live.reset();
  expect(fn).toHaveBeenCalledTimes(2);
  off(); live.update(() => {}); expect(fn).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Chạy `npm test -- db observeDb` — FAIL**
- [ ] **Step 3: Viết `profile-types.ts`, sửa `types.ts`, `db.ts`, `seed.ts`, viết `observeDb.ts`, `noticeInbox.ts`, `testHarness.ts`.** Khi nạp state `version === 1`: `Object.assign(seed(), parsed)` (khoá có trong storage thắng). Seed dùng `emptyKolProfile`/`emptyMcnProfile` — khai báo tạm trong `seed.ts`, Task 2 chuyển sang `profileRules.ts` và `seed.ts` import lại. Hồ sơ rỗng: `contact` lấy `phone`, `email` từ tài khoản, `country: 'Việt Nam'`, các chuỗi khác `''`; `staff` toàn `''`; `status: 'DRAFT'`; KOL `ekycStatus: 'NOT_STARTED'`; MCN `org` toàn `''`.
- [ ] **Step 4: Thêm thông điệp vào `errors.ts`** (nguyên văn):
  - 4101 "Ảnh CCCD bị mờ hoặc lóa. Vui lòng chụp lại." · 4102 "CCCD đã hết hạn hoặc không gắn chip. Vui lòng dùng CCCD gắn chip còn hạn." · 4103 "Họ tên trên CCCD khác với họ tên trong hồ sơ." · 4104 "CCCD này đã được dùng cho một tài khoản khác." · 4105 "Khuôn mặt không khớp với ảnh trên CCCD. Vui lòng quay lại." · 4106 "Chưa xác nhận được người thật. Vui lòng quay lại theo hướng dẫn." · 4107 "Trình duyệt chưa được cấp quyền camera." · 4108 "Bạn đã xác thực không thành công 5 lần trong 24 giờ. Vui lòng thử lại sau {HH:mm dd/MM/yyyy của lockedUntil} hoặc liên hệ hỗ trợ." · 5101 "Dịch vụ xác thực đang bận. Vui lòng thử lại, lần này không bị tính."
  - 4201 "Link kênh này đã được đăng ký trên KOL Hub." (+ " Chúng tôi đã ghi nhận để xử lý tranh chấp." khi `meta.ownedByOther`) · 4202 "Chỉ hỗ trợ link kênh Facebook, YouTube hoặc TikTok." · 4203 "Ảnh phải là JPG hoặc PNG, tối đa 10 MB."
  - 4301 "File GCN phải là JPG, PNG hoặc PDF." · 4302 "File GCN tối đa 10 MB." · 4303 "Mã số doanh nghiệp này đã gắn với một MCN khác." · 4304 "Doanh nghiệp đang tạm ngừng hoạt động, giải thể hoặc bị thu hồi giấy phép."
  - Các mã tính lần thử (4101, 4102, 4105, 4106) nối " Còn {attemptsLeft} lần thử." khi có `attemptsLeft`.
- [ ] **Step 5: Chạy `npm test` — toàn bộ PASS (kể cả test Đợt 1)**
- [ ] **Step 6: Commit** — `feat(services): phase 2 types, demo state keys, observable db`

---

### Task 2: Luật hồ sơ thuần (`profileRules.ts`)

**Files:**
- Create: `src/app/services/mock/profileRules.ts`
- Modify: `src/app/services/mock/seed.ts` (import `emptyKolProfile`, `emptyMcnProfile`)
- Test: `src/app/services/mock/profileRules.test.ts`

**Interfaces:**
- Consumes: kiểu Task 1, `isValidPhone`, `isValidEmail` (Đợt 1)
- Produces:
  - `emptyKolProfile(acc: Account, now: number): KolProfile`; `emptyMcnProfile(acc: Account, now: number): McnProfile`
  - `REQUIRED_CONTACT: (keyof ContactInfo)[] = ['displayName','phone','email','province','address','category']`
  - `contactComplete(c: ContactInfo): boolean`; `hasStaff(s: StaffInfo): boolean`; `orgComplete(o: OrgIdentity): boolean` (5 trường khác rỗng sau trim)
  - `interface Milestone { key: 'contact' | 'staff' | 'identity' | 'channel' | 'submitted'; label: string; done: boolean }`; `interface Completeness { percent: number; milestones: Milestone[] }`
  - `completeness(state: DemoState, accountId: string): Completeness`
  - `interface ChecklistItem { key: 'ekyc' | 'org' | 'gcn' | 'contact' | 'staff' | 'channel' | 'pledges'; label: string; ok: boolean }`
  - `submitChecklist(state: DemoState, accountId: string, pledges: boolean[]): ChecklistItem[]` — KOL (BR-64): ekyc, contact, staff, channel, pledges; MCN (BR-65): org, gcn, contact, pledges
  - `interface TimelineStep { key: 'submitted' | 'reviewing' | 'result'; label: string; state: 'done' | 'current' | 'todo' | 'success' | 'warning' | 'error'; at?: number; note?: string }`
  - `buildTimeline(profile: KolProfile | McnProfile): TimelineStep[]`
  - `normalizeName(s: string): string` (NFC, trim, gộp khoảng trắng, `toLocaleUpperCase('vi')`); `maskIdNo(id: string): string`
  - `findProfile(state: DemoState, accountId: string): KolProfile | McnProfile | undefined`
  - `sweepExpired(state: DemoState, now: number): void` — kênh `VERIFIED` có `badgeExpiresAt <= now` → `EXPIRED`
  - `activeWithProof(ch: Channel): boolean` (`active && !!ch.proofImage`)

Nhãn mốc (nguyên văn): contact "Thông tin liên hệ đầy đủ"; staff "Có nhân sự quản lý nội dung"; identity KOL "Xác thực danh tính (eKYC)", MCN "Tải Giấy chứng nhận ĐKDN"; channel "Có ít nhất 1 kênh hoạt động kèm ảnh"; submitted "Đã gửi xét duyệt". Nhãn checklist: ekyc "Đã xác thực danh tính (eKYC)"; org "Đủ 5 trường định danh tổ chức"; gcn "Đã tải Giấy chứng nhận ĐKDN"; contact "Thông tin liên hệ đủ trường bắt buộc"; staff "Có nhân sự quản lý nội dung"; channel "Có ít nhất 1 kênh đang hoạt động kèm ảnh"; pledges "Đã tick đủ 3 cam đoan". Timeline nhãn: "Đã gửi hồ sơ", "Đang xét duyệt" (note "Thời gian xét duyệt 1–2 ngày làm việc"), kết quả: "Kết quả" (todo) / "Đã duyệt" (success) / "Cần bổ sung" (warning) / "Không được duyệt" (error), `note = decisionReason`.

- [ ] **Step 1: Viết test thất bại**

```ts
test('hồ sơ KOL rỗng = 0%, đủ 5 mốc = 100%', () => {
  const h = makeHarness(); let s = h.db.read();
  expect(completeness(s, h.kolId).percent).toBe(0);
  s = fillKolReady(s, h.kolId); // helper trong file test: điền contact, staff, ekycStatus PASSED, 1 kênh active có ảnh, status SUBMITTED
  expect(completeness(s, h.kolId)).toMatchObject({ percent: 100 });
});
test('mỗi mốc 20%: chỉ có liên hệ + nhân sự = 40%', () => { /* điền contact + staff → 40 */ });
test('MCN: mốc định danh là có file GCN', () => { /* gcnFile set → milestone identity done, percent 20 */ });
test('kênh INACTIVE không tính mốc kênh', () => { /* 1 kênh active:false → channel milestone false */ });
test('checklist KOL thiếu eKYC và 1 cam đoan', () => {
  const items = submitChecklist(readyExceptEkyc, h.kolId, [true, true, false]);
  expect(items.filter(i => !i.ok).map(i => i.key)).toEqual(['ekyc', 'pledges']);
});
test('checklist MCN không đòi kênh và nhân sự', () =>
  expect(submitChecklist(s, h.mcnId, [true,true,true]).map(i => i.key)).toEqual(['org','gcn','contact','pledges']));
test('contactComplete từ chối SĐT sai định dạng', () => expect(contactComplete({ ...full, phone: '12345' })).toBe(false));
test('maskIdNo', () => expect(maskIdNo('079096012345')).toBe('079*******45'));
test('normalizeName so khớp không phân biệt hoa và khoảng trắng', () =>
  expect(normalizeName('  nguyễn   văn an ')).toBe(normalizeName('NGUYỄN VĂN AN')));
test('timeline DRAFT: cả 3 mốc todo', () => expect(buildTimeline(draft).map(t => t.state)).toEqual(['todo','todo','todo']));
test('timeline SUBMITTED: done, current, todo', () => expect(buildTimeline(submitted).map(t => t.state)).toEqual(['done','current','todo']));
test('timeline REJECTED hiện lý do', () =>
  expect(buildTimeline({ ...submitted, status: 'REJECTED', decisionReason: 'Giấy tờ giả' })[2]).toMatchObject({ state: 'error', label: 'Không được duyệt', note: 'Giấy tờ giả' }));
test('sweepExpired: badgeExpiresAt === now → EXPIRED', () => { /* kênh VERIFIED hạn = now → status EXPIRED */ });
```

- [ ] **Step 2: Chạy `npm test -- profileRules` — FAIL**
- [ ] **Step 3: Viết `profileRules.ts`; chuyển hàm hồ sơ rỗng khỏi `seed.ts`.**
- [ ] **Step 4: Chạy `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(services): profile rules (completeness, BR-64/65 checklist, timeline)`

---

### Task 3: Dịch vụ hồ sơ (liên hệ, nhân sự, ảnh, định danh MCN, change request)

**Files:**
- Create: `src/app/services/mock/profile.ts`
- Test: `src/app/services/mock/profile.test.ts`

**Interfaces:**
- Consumes: `Db`, `profileRules.*`, `validateProofImage`, `validateGcnFile` (Task 5 — nếu làm Task 3 trước, tạo sẵn hai hàm này trong `channelRules.ts` theo chữ ký ở Task 5), `ValidationError`, `KolhubError`
- Produces:
  - `interface ProfileView { profile: KolProfile | McnProfile; completeness: Completeness; channelCount: number; pendingChanges: ChangeRequest[]; checklist: ChecklistItem[] }` — `checklist = submitChecklist(state, accountId, [true,true,true])` bỏ mục `pledges` (màn hình tự thêm mục cam đoan)
  - `createProfileService(deps: { db: Db; now: () => number; delay?: false })` trả:
    - `getProfile(accountId: string): Promise<ProfileView>` — tạo hồ sơ `DRAFT` nếu tài khoản KOL/MCN chưa có (tài khoản vừa đăng ký ở Đợt 1); gọi `sweepExpired`
    - `updateContact(accountId: string, patch: Partial<ContactInfo>): Promise<ProfileView>`
    - `updateStaff(accountId: string, staff: StaffInfo): Promise<ProfileView>`
    - `updateImages(accountId: string, images: { avatar?: StoredFile; cover?: StoredFile }): Promise<ProfileView>`
    - `updateOrgIdentity(accountId: string, org: OrgIdentity): Promise<ProfileView>` (MCN)
    - `uploadGcn(accountId: string, file: StoredFile): Promise<ProfileView>` (MCN)
  - `applyDisplayName(state: DemoState, p: KolProfile, name: string, now: number): 'applied' | 'pending'` (export để `ekyc.ts` dùng cho case 4103)

- [ ] **Step 1: Viết test thất bại** (`profile = createProfileService({ db: h.db, now: h.now, delay: false })`)

```ts
test('tài khoản KOL mới chưa có hồ sơ → getProfile tạo DRAFT', async () => { /* thêm account KOL vào db, getProfile → status DRAFT, contact.email = email tài khoản */ });
test('checklist trong view theo BR-64/BR-65, không có pledges', async () => {
  expect((await profile.getProfile(h.kolId)).checklist.map(i => i.key)).toEqual(['ekyc', 'contact', 'staff', 'channel']);
  expect((await profile.getProfile(h.mcnId)).checklist.map(i => i.key)).toEqual(['org', 'gcn', 'contact']);
});
test('SĐT liên hệ sai → ValidationError field phone, không lưu', async () =>
  await expect(profile.updateContact(h.kolId, { phone: '0212345678' })).rejects.toMatchObject({ field: 'phone' }));
test('DRAFT: đổi Họ tên KOL lưu ngay', async () =>
  expect((await profile.updateContact(h.kolId, { displayName: 'Khánh Vy' })).profile.contact.displayName).toBe('Khánh Vy'));
test('SUBMITTED: đổi Họ tên KOL → PENDING_CHANGE, hiển thị giữ nguyên; các trường khác lưu ngay', async () => {
  setStatus(h, h.kolId, 'SUBMITTED', { displayName: 'Khánh Vy' });
  const v = await profile.updateContact(h.kolId, { displayName: 'Vy Khánh', address: '12 Lý Thường Kiệt' });
  expect(v.profile.contact).toMatchObject({ displayName: 'Khánh Vy', address: '12 Lý Thường Kiệt' });
  expect(v.pendingChanges).toEqual([expect.objectContaining({ field: 'displayName', oldValue: 'Khánh Vy', newValue: 'Vy Khánh', status: 'PENDING_CHANGE' })]);
});
test('sửa lần hai khi đang chờ → ghi đè cùng một change request', async () => { /* 2 lần updateContact → pendingChanges.length === 1, newValue lần 2 */ });
test('đổi về đúng tên đang hiển thị → không tạo change request', async () => { /* newValue === displayName → pendingChanges [] */ });
test('MCN DRAFT: định danh lưu ngay; SUBMITTED: PENDING_CHANGE kèm GCN mới', async () => {
  await profile.updateOrgIdentity(h.mcnId, org1);
  setStatus(h, h.mcnId, 'SUBMITTED');
  await profile.uploadGcn(h.mcnId, pdf(2_000_000));
  const v = await profile.updateOrgIdentity(h.mcnId, { ...org1, legalRep: 'Trần B' });
  expect(v.profile).toMatchObject({ org: org1 });
  expect(v.pendingChanges).toHaveLength(1);
  expect(v.pendingChanges[0].newValue).toMatchObject({ org: { legalRep: 'Trần B' }, gcnFile: { type: 'application/pdf' } });
});
test('GCN .docx → 4301; PDF 10 MB + 1 byte → 4302; đúng 10 MB → nhận', async () => {
  await expect(profile.uploadGcn(h.mcnId, { name: 'a.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 10 })).rejects.toMatchObject({ code: 'KOLHUB-4301' });
  await expect(profile.uploadGcn(h.mcnId, pdf(10 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: 'KOLHUB-4302' });
  await expect(profile.uploadGcn(h.mcnId, pdf(10 * 1024 * 1024))).resolves.toBeTruthy();
});
test('mã số DN trùng MCN khác → 4303', async () => { /* thêm MCN thứ 2 có regNo '0312345678' → updateOrgIdentity cùng regNo → 4303 */ });
test('REJECTED: sửa định danh MCN bị chặn', async () => { /* status REJECTED → updateOrgIdentity rejects (Error 'IDENTITY_LOCKED') */ });
test('avatar GIF → 4203', async () => { /* updateImages avatar type image/gif → KOLHUB-4203 */ });
```

- [ ] **Step 2: Chạy `npm test -- profile` — FAIL**
- [ ] **Step 3: Viết `profile.ts`.** Chế độ ghi của định danh: `DRAFT | NEEDS_FIX` → lưu thẳng; `SUBMITTED | APPROVED` → change request (một bản `PENDING_CHANGE` cho mỗi `(ownerId, field)`, ghi đè `newValue`; nếu `newValue` bằng giá trị đang hiển thị thì xoá bản chờ); `REJECTED` → `Error('IDENTITY_LOCKED')`. `uploadGcn` sau khi gửi gộp vào change request `orgIdentity` (`newValue.org` lấy từ bản chờ nếu có, không thì từ hồ sơ). So trùng `regNo` sau khi bỏ khoảng trắng, với MCN khác có `org.regNo` hoặc bản chờ trùng. Mỗi hàm `await delay()` trừ khi `delay: false`.
- [ ] **Step 4: Chạy `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(services): profile service with pending changes (BR-27, BR-43)`

---

### Task 4: Dịch vụ eKYC theo kịch bản

**Files:**
- Create: `src/app/services/mock/ekyc.ts`
- Test: `src/app/services/mock/ekyc.test.ts`

**Interfaces:**
- Consumes: `Db`, `KolProfile`, `EkycSession`, `IdentityRecord`, `applyDisplayName` (Task 3), `normalizeName`, `maskIdNo`, `trackFunnel` (Task 8 — nếu chưa có, tạm no-op cùng chữ ký `trackFunnel(state, subject, step, at)`)
- Produces:
  - `interface IdentityView { fullName: string; dob: string; idNoMasked: string; issueDate: string; verifiedAt: number }`
  - `interface EkycView { status: EkycStatus; attemptsLeft: number; lockedUntil?: number; draft?: OcrData & { nameMismatch: boolean; profileName: string }; identity?: IdentityView }`
  - `COUNTED_CODES: ErrorCode[] = ['KOLHUB-4101','KOLHUB-4102','KOLHUB-4105','KOLHUB-4106']`; `OCR_CODES = ['KOLHUB-4101','KOLHUB-4102','KOLHUB-4103','KOLHUB-4104']`; `FACE_CODES = ['KOLHUB-4105','KOLHUB-4106']`; 4107 và 5101 áp dụng cho cả hai bước
  - `createEkycService(deps: { db: Db; now: () => number; delay?: false })` trả:
    - `getState(accountId: string): Promise<EkycView>`
    - `submitIdCard(accountId: string, files: { front: StoredFile; back: StoredFile }): Promise<EkycView>` — thành công → `OCR_PASSED`
    - `submitFaceVideo(accountId: string, video: StoredFile): Promise<EkycView>` — thành công → `PASSED`, ghi `identities`
    - `resolveNameMismatch(accountId: string, choice: 'update-profile' | 'request-review'): Promise<EkycView>`
    - `reportImpersonation(accountId: string): Promise<EkycView>` → `REPORTED`
    - `getScenario(): EkycScenario`; `setScenario(s: EkycScenario): void` (đồng bộ, cho Demo Panel)

Dữ liệu OCR giả: `fullName` = họ tên hồ sơ viết hoa (`normalizeName`) nếu có, ngược lại `'NGUYỄN VĂN AN'`; với kịch bản 4103 dùng `'TRẦN THỊ BÌNH'`. `dob: '14/05/1996'`, `issueDate: '10/08/2021'`, `idNoMasked = maskIdNo('079096' + 6 số cuối lấy từ hash accountId)`. `nameMismatch` = hồ sơ có `displayName` và `normalizeName` khác nhau.

- [ ] **Step 1: Viết test thất bại**

```ts
test('SUCCESS: CCCD → OCR_PASSED, video → PASSED, vault có số CCCD đã che', async () => {
  await ekyc.submitIdCard(h.kolId, cards);
  const v = await ekyc.submitFaceVideo(h.kolId, video);
  expect(v.status).toBe('PASSED');
  expect(v.identity?.idNoMasked).toMatch(/^079\*{7}\d{2}$/);
  expect(JSON.stringify(h.db.read().identities)).not.toMatch(/079096\d{6}/);
});
test('4101 bốn lần: attemptsLeft 4,3,2,1; lần 5 → 4108 kèm lockedUntil = +24h', async () => {
  ekyc.setScenario('KOLHUB-4101');
  for (let i = 1; i <= 4; i++) { await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-4101', meta: { attemptsLeft: 5 - i } }); h.clock.t += 60_000; }
  const fifthAt = h.clock.t;
  await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-4108', meta: { lockedUntil: fifthAt + 86_400_000 } });
});
test('đang khoá: kịch bản SUCCESS vẫn 4108; mở đúng lúc +24h', async () => {
  await failTimes(5, 'KOLHUB-4105'); // qua OCR rồi fail bước video 5 lần, cách nhau 0 ms
  ekyc.setScenario('SUCCESS');
  await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toMatchObject({ code: 'KOLHUB-4108' });
  h.clock.t += 86_400_000 - 1;
  await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toMatchObject({ code: 'KOLHUB-4108' });
  h.clock.t += 1;
  await expect(ekyc.submitFaceVideo(h.kolId, video)).resolves.toMatchObject({ status: 'PASSED' });
});
test.each(['KOLHUB-5101', 'KOLHUB-4107', 'KOLHUB-4104'])('%s không tính lần thử', async (code) => {
  ekyc.setScenario(code as EkycScenario);
  for (let i = 0; i < 6; i++) await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code });
  expect((await ekyc.getState(h.kolId)).attemptsLeft).toBe(5);
});
test('xen 5101 giữa các lần 4102 không làm khoá sớm', async () => { /* 4102 x4, 5101 x3 → getState attemptsLeft 1, không lockedUntil */ });
test('4103 → draft nameMismatch, chọn cập nhật hồ sơ → tên hồ sơ theo CCCD, OCR_PASSED', async () => {
  await setDisplayName('Khánh Vy'); ekyc.setScenario('KOLHUB-4103');
  await expect(ekyc.submitIdCard(h.kolId, cards)).rejects.toMatchObject({ code: 'KOLHUB-4103' });
  expect((await ekyc.getState(h.kolId)).draft).toMatchObject({ nameMismatch: true, fullName: 'TRẦN THỊ BÌNH', profileName: 'Khánh Vy' });
  const v = await ekyc.resolveNameMismatch(h.kolId, 'update-profile');
  expect(v.status).toBe('OCR_PASSED');
  expect(findProfile(h.db.read(), h.kolId)!.contact.displayName).toBe('TRẦN THỊ BÌNH');
});
test('4103 chọn gửi xem xét → MANUAL_REVIEW, submitFaceVideo bị chặn', async () => { /* status MANUAL_REVIEW; submitFaceVideo rejects Error('EKYC_STEP') */ });
test('4104 → báo mạo danh → REPORTED', async () => { /* reportImpersonation → status REPORTED */ });
test('video trước khi qua bước CCCD → bị chặn', async () =>
  await expect(ekyc.submitFaceVideo(h.kolId, video)).rejects.toThrow('EKYC_STEP'));
test('thoát giữa chừng (tải lại) sau OCR → vẫn OCR_PASSED, không tính lần thử', async () => {
  await ekyc.submitIdCard(h.kolId, cards);
  const again = createEkycService({ db: h.db, now: h.now, delay: false });
  expect(await again.getState(h.kolId)).toMatchObject({ status: 'OCR_PASSED', attemptsLeft: 5 });
});
test('kịch bản giữ nguyên qua nhiều lần gửi cho tới khi đổi', () => { ekyc.setScenario('KOLHUB-4106'); expect(ekyc.getScenario()).toBe('KOLHUB-4106'); });
```

- [ ] **Step 2: Chạy `npm test -- ekyc` — FAIL**
- [ ] **Step 3: Viết `ekyc.ts`.** Khoá và đếm (theo tài khoản): `lastLock` = phiên mới nhất có `lockedUntil`; đang khoá khi `lastLock.lockedUntil > now` → 4108 kèm `lockedUntil`. Số lần đã tính = phiên `counted` có `createdAt > now - 86_400_000` **và** `createdAt > lastLock.createdAt` (nếu có) — hết khoá thì đếm lại từ 0. `attemptsLeft = 5 - số lần đã tính`. Thứ tự mỗi lần gửi: kiểm khoá → kiểm bước hợp lệ (`submitIdCard` cho `NOT_STARTED | OCR_PASSED`; `submitFaceVideo` chỉ khi `OCR_PASSED`; sai → `Error('EKYC_STEP')`) → áp kịch bản của bước → ghi `EkycSession` (`counted = COUNTED_CODES.includes(code)`) → nếu lần tính này là lần thứ 5 thì ghi `lockedUntil = now + 86_400_000` vào chính phiên đó và ném 4108 thay cho mã gốc; ngược lại ném mã kèm `attemptsLeft` (chỉ với mã tính). Kịch bản không thuộc bước đang làm thì bước đó thành công. Thành công bước CCCD ghi `ekycDraft`; bước video tạo `IdentityRecord`, xoá `ekycDraft`, `ekycStatus = 'PASSED'`. `trackFunnel` với `ekyc_ocr_passed` / `ekyc_face_passed`, subject = email tài khoản chuẩn hoá. Hồ sơ đã `PASSED` gọi lại `submitIdCard` → `Error('EKYC_STEP')` (định danh khoá, BR-14).
- [ ] **Step 4: Chạy `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(services): scenario-driven eKYC with BR-13 attempt lock`

---

### Task 5: Dịch vụ kênh

**Files:**
- Create: `src/app/services/mock/channelRules.ts`, `src/app/services/mock/channel.ts`
- Test: `src/app/services/mock/channelRules.test.ts`, `src/app/services/mock/channel.test.ts`

**Interfaces:**
- Consumes: `Db`, `Channel`, `StoredFile`, `KolhubError`, `sweepExpired`, `findProfile`, `trackFunnel`
- Produces:
  - `detectPlatform(url: string): Platform | null` — thêm `https://` nếu thiếu; host bỏ tiền tố `www.`, `m.`, `web.`, `vm.`, `vt.`; `facebook.com`, `fb.com`, `fb.watch` → facebook; `youtube.com`, `youtu.be` → youtube; `tiktok.com` → tiktok; đường dẫn rỗng (`facebook.com/`) → `null`
  - `normalizeChannelUrl(url: string): string` — `https://` + host chuẩn hoá + path, bỏ query, hash, `/` cuối, path chữ thường
  - `channelHandle(url: string): string` — đoạn path đầu tiên (`@khanhvy`, `khanhvy.official`)
  - `validateProofImage(f: StoredFile): void` (4203); `validateGcnFile(f: StoredFile): void` (4301 rồi 4302)
  - `type ChannelFilter = 'all' | 'verified' | 'pending' | 'needs_fix'`; `countByFilter(chs: Channel[]): Record<ChannelFilter, number>`; `matchesFilter(ch: Channel, f: ChannelFilter): boolean`
  - `createChannelService(deps: { db: Db; now: () => number; delay?: false })` trả:
    - `list(accountId: string): Promise<Channel[]>` (mới nhất trước, gọi `sweepExpired`)
    - `add(accountId: string, input: { url: string; proofImage: StoredFile }): Promise<Channel>`
    - `update(accountId: string, channelId: string, input: { url: string; proofImage: StoredFile }): Promise<Channel>`
    - `setActive(accountId: string, channelId: string, active: boolean): Promise<Channel>`
    - (không có `remove` — BR-23)

- [ ] **Step 1: Viết test thất bại**

```ts
// channelRules.test.ts
test.each([
  ['https://www.facebook.com/khanhvy.official', 'facebook'], ['fb.com/khanhvy', 'facebook'], ['m.facebook.com/abc', 'facebook'],
  ['youtube.com/@khanhvy', 'youtube'], ['https://youtu.be/abc', 'youtube'],
  ['tiktok.com/@khanhvy', 'tiktok'], ['vt.tiktok.com/ZS123', 'tiktok'],
  ['instagram.com/khanhvy', null], ['https://facebook.com/', null], ['khong phai link', null],
])('detectPlatform %s', (u, p) => expect(detectPlatform(u)).toBe(p));
test('normalizeChannelUrl gộp các cách viết', () => {
  const n = normalizeChannelUrl('https://www.facebook.com/abc/');
  expect(normalizeChannelUrl('facebook.com/abc?ref=x')).toBe(n);
  expect(normalizeChannelUrl('m.facebook.com/ABC#top')).toBe(n);
});
test('ảnh 10 MB nhận, 10 MB + 1 và GIF → 4203', () => { /* validateProofImage */ });
test('countByFilter: EXPIRED chỉ tính ở Tất cả', () => { /* 1 VERIFIED, 1 PENDING, 1 NEEDS_FIX, 1 EXPIRED → {all:4, verified:1, pending:1, needs_fix:1} */ });
// channel.test.ts
test('thêm kênh → PENDING_REVIEW, active, handle, platform', async () =>
  expect(await ch.add(h.kolId, { url: 'tiktok.com/@khanhvy', proofImage: png })).toMatchObject({ status: 'PENDING_REVIEW', active: true, platform: 'tiktok', handle: '@khanhvy', ownerType: 'KOL' }));
test('link Instagram → 4202, không tạo kênh', async () => { /* rejects 4202; list [] */ });
test('link trùng trong cùng tài khoản → 4201', async () => { /* add 'https://www.facebook.com/abc/' rồi 'facebook.com/abc?ref=x' → 4201, ownedByOther falsy */ });
test('link đã thuộc tài khoản khác → 4201 kèm ownedByOther', async () => { /* KOL thêm, MCN thêm cùng link → meta.ownedByOther true */ });
test('sửa kênh VERIFIED không đổi gì → giữ nguyên VERIFIED và hạn dấu', async () => {
  const c = await verifiedChannel(); // helper: add rồi set status VERIFIED, badgeExpiresAt
  const u = await ch.update(h.kolId, c.id, { url: c.url, proofImage: c.proofImage });
  expect(u).toMatchObject({ status: 'VERIFIED', badgeExpiresAt: c.badgeExpiresAt });
});
test('đổi ảnh kênh VERIFIED → PENDING_REVIEW, dấu tạm ngừng', async () => {
  const u = await ch.update(h.kolId, (await verifiedChannel()).id, { url: c.url, proofImage: png2 });
  expect(u).toMatchObject({ status: 'PENDING_REVIEW', badgeSuspended: true, badgeExpiresAt: undefined });
});
test('sửa kênh NEEDS_FIX → PENDING_REVIEW, xoá lý do', async () => { /* note undefined */ });
test('hồ sơ SUBMITTED: sửa kênh đang chờ duyệt bị chặn, bật/tắt vẫn được', async () => { /* update rejects Error('LOCKED_IN_REVIEW'); setActive ok */ });
test('bật/tắt không đổi status và dấu', async () => { /* VERIFIED → setActive false → status VERIFIED, active false */ });
test('kênh của người khác → Error NOT_OWNER', async () => { /* MCN setActive kênh của KOL */ });
```

- [ ] **Step 2: Chạy `npm test -- channel` — FAIL**
- [ ] **Step 3: Viết `channelRules.ts` và `channel.ts`.** Kiểm trùng bằng `normalizeChannelUrl` trên mọi kênh trong state (bỏ qua chính kênh đang sửa). `update` coi là "có đổi" khi URL chuẩn hoá khác hoặc `proofImage.name/size/type` khác. Có đổi: `status = 'PENDING_REVIEW'`, `note = undefined`; nếu trước là `VERIFIED` thì `badgeSuspended = true`, `badgeExpiresAt = undefined`, `verifiedAt = undefined`. Khoá sửa khi hồ sơ chủ kênh `SUBMITTED` và kênh `PENDING_REVIEW`. Kênh đầu tiên → `trackFunnel('channel_added')`.
- [ ] **Step 4: Chạy `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(services): channel service (BR-20..24, 4201..4203)`

---

### Task 6: Gửi xét duyệt, Admin duyệt hồ sơ/kênh, hết hạn dấu, `listApprovedKols`

**Files:**
- Create: `src/app/services/mock/review.ts`
- Test: `src/app/services/mock/review.test.ts`

**Interfaces:**
- Consumes: `Db`, `submitChecklist`, `sweepExpired`, `findProfile`, `trackFunnel`, `NoticeMessage`, `addMonths` (`date-fns`)
- Produces:
  - `type ChannelVerdict = { verdict: 'PASS' } | { verdict: 'NEEDS_FIX'; reason: string }`
  - `createReviewService(deps: { db: Db; now: () => number; notify: (m: NoticeMessage) => void; delay?: false })` trả (Task 7 bổ sung thêm hàm vào cùng factory):
    - `submit(accountId: string, pledges: boolean[]): Promise<ReviewRequest>`
    - `approve(ownerId: string, verdicts: Record<string, ChannelVerdict>): Promise<void>`
    - `requestFix(ownerId: string, reason: string): Promise<void>`
    - `reject(ownerId: string, reason: string): Promise<void>`
    - `expireChannelNow(channelId: string): Promise<void>`
  - `listApprovedKols(state: DemoState, now: number = Date.now()): ApprovedKolSummary[]` — export thuần, **Đợt 3 dùng để gộp vào kết quả tìm kiếm**
  - `pendingChannelsOf(state: DemoState, ownerId: string): Channel[]` — kênh `active` và `PENDING_REVIEW`

Luật:
- `submit`: chỉ từ `DRAFT | NEEDS_FIX` (khác → `Error('NOT_SUBMITTABLE')`); mọi mục checklist `ok` (khác → `Error('NOT_ELIGIBLE')`). Ghi `status = 'SUBMITTED'`, `submittedAt`, xoá `decisionReason`, thêm `ReviewRequest`, `trackFunnel('profile_submitted')`.
- `approve`: hồ sơ phải `SUBMITTED` hoặc `APPROVED` có kênh chờ. `verdicts` phải phủ đủ `pendingChannelsOf` (thiếu → `Error('VERDICT_MISSING')`); `NEEDS_FIX` với `reason.trim() === ''` → `Error('REASON_REQUIRED')`. PASS → `VERIFIED`, `verifiedAt = now`, `badgeExpiresAt = addMonths(now, 12).getTime()`, `badgeSuspended = undefined`, `followers = fakeFollowers(url)` (hash URL → 10 000…2 000 000). NEEDS_FIX → `status 'NEEDS_FIX'`, `note = reason`. Nếu hồ sơ đang `SUBMITTED`: KOL → `APPROVED` khi có ≥ 1 kênh `VERIFIED`, ngược lại `NEEDS_FIX` với `decisionReason` "Tất cả kênh cần bổ sung"; MCN → `APPROVED`. Lần duyệt đầu gán `kolId = 'KH' + (900001 + số KOL đã có kolId)` hoặc `mcnId = 'MCN' + (900001 + …)`, `approvedAt = now`. Cập nhật `ReviewRequest` mới nhất (`status`, `decidedAt`).
- `requestFix`/`reject`: chỉ từ `SUBMITTED`; lý do bắt buộc; hồ sơ `NEEDS_FIX`/`REJECTED`, `decisionReason = reason`.
- Mỗi quyết định gọi `notify` hai lần (email tới `contact.email`, SMS tới `contact.phone`), `title` "Kết quả xét duyệt hồ sơ", `body` nguyên văn:
  - Duyệt: `KOL Hub: Hồ sơ của bạn đã được duyệt. {n} kênh nhận dấu Kênh xác thực, hiệu lực đến {dd/MM/yyyy}.` (n = số kênh PASS lần này; hồ sơ đã APPROVED chỉ duyệt kênh thì câu đầu là "Kênh mới của bạn đã được duyệt.")
  - Có kênh cần bổ sung (thêm một tin): `KOL Hub: {m} kênh cần bổ sung. Vui lòng mở Quản lý kênh để xem lý do.`
  - Yêu cầu bổ sung hồ sơ: `KOL Hub: Hồ sơ của bạn cần bổ sung. Lý do: {reason}`
  - Từ chối: `KOL Hub: Hồ sơ của bạn không được duyệt. Lý do: {reason}`
- `expireChannelNow`: kênh `VERIFIED` → `EXPIRED`, `badgeExpiresAt = now`.
- `listApprovedKols`: KOL `status === 'APPROVED'` có `kolId`; kênh `VERIFIED && active && badgeExpiresAt > now`; bỏ KOL không còn kênh nào (BR-54). `displayName = contact.displayName`, `avatar = avatar?.thumbnail`, `category`/`region` = `contact.category`/`contact.province` (chuỗi rỗng → `undefined`), `badgeExpiresAt`/`verifiedAt` = `new Date(...).toISOString()` (`verifiedAt` lấy `approvedAt`). Không có trường nào từ `identities`, `phone`, `address`, `zalo` (BR-58).

- [ ] **Step 1: Viết test thất bại** (`sent = h.notices`, `review = createReviewService({ db, now, notify: m => h.notices.push(m), delay: false })`; helper `readyKol(h)` điền đủ BR-64 với 2 kênh `c1`, `c2`)

```ts
test('chưa đủ điều kiện BR-64 → NOT_ELIGIBLE', async () =>
  await expect(review.submit(h.kolId, [true, true, true])).rejects.toThrow('NOT_ELIGIBLE'));
test('thiếu 1 cam đoan → NOT_ELIGIBLE', async () => { readyKol(h); await expect(review.submit(h.kolId, [true, true, false])).rejects.toThrow('NOT_ELIGIBLE'); });
test('gửi hai lần → lần hai NOT_SUBMITTABLE, chỉ 1 ReviewRequest', async () => {
  readyKol(h); await review.submit(h.kolId, [true, true, true]);
  await expect(review.submit(h.kolId, [true, true, true])).rejects.toThrow('NOT_SUBMITTABLE');
  expect(h.db.read().reviewRequests).toHaveLength(1);
});
test('MCN gửi được khi chưa có kênh (BR-65)', async () => { readyMcn(h); await expect(review.submit(h.mcnId, [true,true,true])).resolves.toMatchObject({ status: 'SUBMITTED' }); });
test('duyệt: c1 Đạt, c2 Cần bổ sung → hồ sơ APPROVED, c1 dấu 12 tháng, c2 có lý do', async () => {
  const { c1, c2 } = readyKol(h); await review.submit(h.kolId, [true,true,true]);
  await review.approve(h.kolId, { [c1]: { verdict: 'PASS' }, [c2]: { verdict: 'NEEDS_FIX', reason: 'Ảnh không thấy tên kênh' } });
  const s = h.db.read();
  expect(findProfile(s, h.kolId)).toMatchObject({ status: 'APPROVED', kolId: 'KH900001' });
  expect(s.channels.find(c => c.id === c1)).toMatchObject({ status: 'VERIFIED', badgeExpiresAt: new Date(2027, 8, 27, 9, 0).getTime() });
  expect(s.channels.find(c => c.id === c2)).toMatchObject({ status: 'NEEDS_FIX', note: 'Ảnh không thấy tên kênh' });
  expect(h.notices.map(n => n.channel)).toEqual(['email', 'sms', 'email', 'sms']);
  expect(h.notices[0].body).toBe('KOL Hub: Hồ sơ của bạn đã được duyệt. 1 kênh nhận dấu Kênh xác thực, hiệu lực đến 27/09/2027.');
});
test('Cần bổ sung không lý do → REASON_REQUIRED, không đổi gì', async () => { /* reason '  ' → throws; profile vẫn SUBMITTED */ });
test('thiếu verdict cho một kênh chờ → VERDICT_MISSING', async () => { /* chỉ gửi verdict c1 */ });
test('KOL: mọi kênh Cần bổ sung → hồ sơ NEEDS_FIX, sửa kênh rồi gửi lại được', async () => { /* approve all NEEDS_FIX → NEEDS_FIX; channel.update → PENDING_REVIEW; submit resolves; reviewRequests length 2 */ });
test('từ chối không lý do → REASON_REQUIRED; có lý do → REJECTED, tin nhắn chứa lý do', async () => { /* body 'KOL Hub: Hồ sơ của bạn không được duyệt. Lý do: Giấy tờ giả' */ });
test('listApprovedKols: chỉ kênh VERIFIED, active, còn hạn; không lộ SĐT/CCCD', async () => {
  const { c1 } = await approvedKol(h);
  const list = listApprovedKols(h.db.read(), h.now());
  expect(list).toEqual([{ kolId: 'KH900001', displayName: 'Khánh Vy', avatar: undefined, category: 'Giáo dục', region: 'Hà Nội', verifiedAt: new Date(h.clock.t).toISOString(),
    channels: [{ platform: 'facebook', url: expect.any(String), followers: expect.any(Number), badgeExpiresAt: new Date(2027, 8, 27, 9, 0).toISOString() }] }]);
  expect(JSON.stringify(list)).not.toMatch(/0912000001|\*{7}/);
});
test('listApprovedKols: badgeExpiresAt === now → loại; tắt kênh → loại; hồ sơ không APPROVED → loại', async () => { /* 3 case, mỗi case list [] */ });
test('expireChannelNow → EXPIRED, KOL rời listApprovedKols', async () => { /* */ });
test('hồ sơ APPROVED thêm kênh mới → approve chỉ đổi kênh, hồ sơ vẫn APPROVED, kolId giữ nguyên', async () => { /* */ });
```

- [ ] **Step 2: Chạy `npm test -- review` — FAIL**
- [ ] **Step 3: Viết `review.ts`.**
- [ ] **Step 4: Chạy `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(services): submit and admin review simulation (BR-15..17, BR-64/65)`

---

### Task 7: Admin duyệt thay đổi, xử lý case eKYC chờ xem xét, hàng chờ Admin

**Files:**
- Modify: `src/app/services/mock/review.ts`
- Test: `src/app/services/mock/review.test.ts` (thêm `describe('admin queue')`)

**Interfaces:**
- Consumes: Task 3 (`ChangeRequest`), Task 4 (`EkycStatus`), Task 6 factory
- Produces (thêm vào kết quả `createReviewService`):
  - `interface AdminQueue { profiles: { ownerType: OwnerType; ownerId: string; displayName: string; status: ProfileStatus; submittedAt?: number; org?: OrgIdentity; gcnFile?: StoredFile; pendingChannels: Channel[] }[]; changes: (ChangeRequest & { displayName: string })[]; ekycCases: { accountId: string; displayName: string; status: 'MANUAL_REVIEW' | 'REPORTED'; ocr?: OcrData }[]; verifiedChannels: (Channel & { displayName: string })[] }`
  - `listAdminQueue(): Promise<AdminQueue>` — `profiles`: hồ sơ `SUBMITTED`, hoặc `APPROVED` có kênh chờ; `changes`: `PENDING_CHANGE`; `ekycCases`: KOL `MANUAL_REVIEW | REPORTED`; `verifiedChannels`: kênh `VERIFIED` (để đẩy hết hạn). Gọi `sweepExpired` trước.
  - `decideChange(changeId: string, decision: { approve: true } | { approve: false; reason: string }): Promise<void>`
  - `closeEkycCase(accountId: string, outcome: 'accept-name' | 'reset', reason?: string): Promise<void>`

Luật:
- `decideChange` duyệt: `displayName` → `contact.displayName = newValue`; `orgIdentity` → `org`, `gcnFile` = `newValue`. Từ chối: lý do bắt buộc (BR-44). Cả hai: `status`, `decidedAt`, `reason`; `notify` email + SMS, `title` "Kết quả duyệt thay đổi hồ sơ", `body` `KOL Hub: Yêu cầu thay đổi {Họ tên KOL/KOC | Thông tin định danh tổ chức} đã được duyệt.` / `KOL Hub: Yêu cầu thay đổi {…} không được duyệt. Lý do: {reason}`.
- `closeEkycCase`: `MANUAL_REVIEW` + `accept-name` → `displayName` = tên CCCD trong `ekycDraft` (ghi thẳng, không qua change request), `ekycStatus = 'OCR_PASSED'`, `nameMismatch = false`; `reset` (dùng cho cả `MANUAL_REVIEW` và `REPORTED`) → `NOT_STARTED`, xoá `ekycDraft`; `notify` `KOL Hub: Yêu cầu xem xét eKYC đã được xử lý. {Bạn có thể tiếp tục quay video khuôn mặt. | Vui lòng xác thực lại. Lý do: {reason}}`.

- [ ] **Step 1: Viết test thất bại**

```ts
test('hàng chờ có hồ sơ SUBMITTED kèm kênh chờ; DRAFT không vào', async () => { /* profiles.map(p => p.ownerId) equals [kolId] */ });
test('duyệt đổi Họ tên → hồ sơ hiển thị tên mới', async () => { /* SUBMITTED + updateContact displayName → decideChange approve → displayName mới, change APPROVED */ });
test('từ chối đổi định danh MCN không lý do → REASON_REQUIRED; có lý do → org giữ nguyên, tin nhắn có lý do', async () => { /* */ });
test('case 4103 chờ xem xét → accept-name → OCR_PASSED, tên theo CCCD', async () => { /* */ });
test('case báo mạo danh → reset → NOT_STARTED, rời hàng chờ', async () => { /* */ });
test('verifiedChannels liệt kê kênh có dấu để đẩy hết hạn', async () => { /* */ });
```

- [ ] **Step 2: Chạy `npm test -- review` — FAIL**
- [ ] **Step 3: Bổ sung `review.ts`.**
- [ ] **Step 4: Chạy `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(services): admin change approval, eKYC case handling, queue (BR-44)`

---

### Task 8: Phễu, nối dịch vụ vào `services/index.ts`, ghi phễu đăng ký

**Files:**
- Create: `src/app/services/mock/funnel.ts`
- Modify: `src/app/services/index.ts`, `src/app/features/register/RegisterPage.tsx`
- Test: `src/app/services/mock/funnel.test.ts`

**Interfaces:**
- Consumes: `Db`, `FunnelEvent`, `normalizeEmail`, `observeDb`, `noticeInbox`, mọi factory Task 3–7
- Produces:
  - `FUNNEL_STEPS: { step: FunnelStep; label: string }[]` theo thứ tự: register_started "Bắt đầu đăng ký", otp_email_verified "Xác thực OTP email", otp_sms_verified "Xác thực OTP SMS", ekyc_ocr_passed "eKYC bước 1 — CCCD", ekyc_face_passed "eKYC bước 2 — khuôn mặt", channel_added "Thêm kênh đầu tiên", profile_submitted "Gửi hồ sơ"
  - `trackFunnel(state: DemoState, subject: string, step: FunnelStep, at: number): void` — subject chuẩn hoá bằng `normalizeEmail`; chỉ ghi lần đầu mỗi `(subject, step)`
  - `buildFunnel(events: FunnelEvent[], subject: string): { step: FunnelStep; label: string; at?: number; sincePrevMs?: number }[]` — `sincePrevMs` tính từ mốc **đã có** gần nhất phía trước
  - `formatDuration(ms: number): string` — `< 1000` → "dưới 1 giây"; còn lại ghép tối đa 2 đơn vị lớn nhất khác 0 trong "giờ", "phút", "giây" (ví dụ "2 phút 5 giây", "1 giờ 3 phút")
  - `createFunnelService(deps: { db: Db; now: () => number })`: `track(subject: string, step: FunnelStep): void`; `subjects(): string[]` (mới nhất trước); `get(subject: string): ReturnType<typeof buildFunnel>`
  - `services/index.ts` export thêm: `profileService`, `ekycService`, `channelService`, `reviewService`, `funnelService`, `noticeInbox`, `subscribeData` (`= liveDb.subscribe`), `detectPlatform`, `validateProofImage`, `validateGcnFile`, `countByFilter`, `matchesFilter`, `buildTimeline`, `listApprovedKols`, `FUNNEL_STEPS`, `formatDuration`, và `export type *` từ `profile-types.ts`. Mọi dịch vụ (kể cả `otpService`, `authService` của Đợt 1) nhận `liveDb = observeDb(db)`; `reviewService.notify = noticeInbox.publish`.

- [ ] **Step 1: Viết test thất bại**

```ts
test('chỉ ghi lần đầu mỗi bước, subject chuẩn hoá', () => {
  const s = seedState(); trackFunnel(s, ' KOL@x.vn ', 'register_started', 1000); trackFunnel(s, 'kol@x.vn', 'register_started', 5000);
  expect(s.funnel).toEqual([{ subject: 'kol@x.vn', step: 'register_started', at: 1000 }]);
});
test('buildFunnel: khoảng cách tính từ mốc đã có gần nhất, bỏ qua mốc thiếu', () => {
  const f = buildFunnel([ev('register_started', 0), ev('otp_email_verified', 30_000), ev('ekyc_ocr_passed', 150_000)], 'kol@x.vn');
  expect(f.map(x => x.sincePrevMs)).toEqual([undefined, 30_000, undefined, 120_000, undefined, undefined, undefined]);
});
test.each([[500, 'dưới 1 giây'], [45_000, '45 giây'], [125_000, '2 phút 5 giây'], [3_780_000, '1 giờ 3 phút']])('formatDuration %i', (ms, s) => expect(formatDuration(ms)).toBe(s));
```

- [ ] **Step 2: Chạy `npm test -- funnel` — FAIL**
- [ ] **Step 3: Viết `funnel.ts`; thay no-op `trackFunnel` tạm (nếu có) ở Task 4/5/6 bằng bản thật.**
- [ ] **Step 4: Sửa `services/index.ts`** như Interfaces. **Sửa `RegisterPage.tsx`:** sau `startRegistration` thành công gọi `funnelService.track(email, 'register_started')`; `onVerified` của OTP email → `'otp_email_verified'`; OTP SMS → `'otp_sms_verified'`.
- [ ] **Step 5: Chạy `npm test` — PASS; `npm run build` — thành công**
- [ ] **Step 6: Commit** — `feat(services): funnel tracking and phase 2 service wiring`

---

### Task 9: Hạ tầng UI, khung trang hồ sơ và SCR-03

**Files:**
- Create: `src/app/features/shared/useLiveQuery.ts`, `src/app/features/shared/files.ts`, `src/app/features/shared/StatusBadges.tsx`, `src/app/features/notice/NoticeInboxToaster.tsx`, `src/app/features/profile/primaryAction.ts`, `src/app/features/profile/ProfileHeader.tsx`, `src/app/features/profile/ProfilePage.tsx`
- Modify: `src/app/routes.tsx` (`ho-so-kol` → `<ProfilePage ownerType="KOL" />`, `ho-so-mcn` → `<ProfilePage ownerType="MCN" />`), `src/app/App.tsx` (thêm `<NoticeInboxToaster />`)
- Test: `src/app/features/profile/primaryAction.test.ts`

**Interfaces:**
- Consumes: `profileService`, `ekycService`, `subscribeData`, `noticeInbox`, `useAuth()`, `ProfileView` (gồm `checklist`), `EkycView` (không import mock)
- Produces:
  - `useLiveQuery<T>(load: () => Promise<T>, deps: unknown[]): { data: T | undefined; loading: boolean; error: unknown; reload(): void }` — lần đầu `loading = true`; khi `subscribeData` báo đổi thì tải lại **không** bật `loading` (giữ `data` cũ)
  - `toStoredFile(file: File): Promise<StoredFile>` — ảnh JPG/PNG: vẽ canvas cạnh dài ≤ 480 px, `toDataURL('image/jpeg', 0.7)`; loại khác: không thumbnail
  - `<ProfileStatusBadge status />` nhãn: DRAFT "Chưa gửi", SUBMITTED "Đang xét duyệt", APPROVED "Đã duyệt", NEEDS_FIX "Cần bổ sung", REJECTED "Không được duyệt"; `<ChannelStatusBadge channel />` nhãn: PENDING_REVIEW "Chờ duyệt", VERIFIED "Kênh xác thực · đến dd/MM/yyyy", NEEDS_FIX "Cần bổ sung", EXPIRED "Hết hạn", thêm chip "Tạm tắt" khi `!active`, "Dấu tạm ngừng" khi `badgeSuspended`; `<PlatformIcon platform />` (Facebook, Youtube, `Music2` cho TikTok)
  - `type ProfileTab = 'lien-he' | 'dinh-danh' | 'kenh'`
  - `primaryAction(input: { ownerType: OwnerType; status: ProfileStatus; ekycStatus?: EkycStatus; eligible: boolean; hasNeedsFixChannel: boolean }): { label: string; tab: ProfileTab | null; disabled: boolean } | null`
  - `<ProfilePage ownerType: OwnerType />` — `Tabs` điều khiển bằng `?tab=` (mặc định `lien-he`), nhãn "Thông tin liên hệ" · "Thông tin định danh" · "Quản lý kênh"; tab con Task 10–13 cắm vào
  - `<ProfileHeader view: ProfileView; ekyc?: EkycView; onNavigate(tab: ProfileTab): void />`

Bảng `primaryAction` (nguyên văn):
| Điều kiện | label | tab | disabled |
|---|---|---|---|
| KOL, DRAFT, eKYC khác PASSED | "Xác thực danh tính" | dinh-danh | false |
| MCN, DRAFT, chưa `eligible` | "Xác thực tổ chức" | dinh-danh | false |
| KOL, DRAFT, eKYC PASSED, chưa `eligible` | "Hoàn thiện hồ sơ" | dinh-danh | false |
| DRAFT, `eligible` (KOL đã PASSED) | "Gửi xét duyệt" | dinh-danh | false |
| SUBMITTED | "Đang xét duyệt" | null | true |
| NEEDS_FIX, có kênh NEEDS_FIX | "Xem yêu cầu bổ sung" | kenh | false |
| NEEDS_FIX, không có | "Xem yêu cầu bổ sung" | dinh-danh | false |
| APPROVED | "Thêm kênh" | kenh | false |
| REJECTED | `null` | | |

(`eligible` = mọi mục của `ProfileView.checklist` đều ok.)

- [ ] **Step 1: Viết test thất bại** — một `test.each` cho 9 dòng bảng trên, `expect(primaryAction(input)).toEqual(expected)`.
- [ ] **Step 2: Chạy `npm test -- primaryAction` — FAIL**
- [ ] **Step 3: Viết `primaryAction.ts` — chạy test PASS.**
- [ ] **Step 4: Viết `useLiveQuery`, `files.ts`, `StatusBadges`, `NoticeInboxToaster`** (toast `sonner` 15 giây, icon `Mail`/`MessageSquare`, tiêu đề "Email tới {email che}" / "Tin nhắn tới {SĐT che}" theo quy ước che của Đợt 1, dòng `title`, thân `body`).
- [ ] **Step 5: Viết `ProfileHeader` (SCR-03).** `Card` gồm: ảnh bìa (`h-32 md:h-48`, `cover.thumbnail` hoặc nền `bg-muted`), avatar 80 px chồng lên mép dưới ảnh bìa (`Avatar`, fallback chữ cái đầu); nút đổi ảnh bìa/avatar (icon `Camera`, `<input type="file" accept="image/jpeg,image/png" hidden>` → `toStoredFile` → `profileService.updateImages`, lỗi 4203 → `toast.error(errorMessage)`); tên (`contact.displayName` hoặc "Chưa đặt tên") + `ShieldCheck` `text-primary` chỉ khi `APPROVED` (Tooltip "Hồ sơ đã được duyệt"); KOL ID/MCN ID nếu có; "{channelCount} kênh"; `ProfileStatusBadge`; nếu có `pendingChanges` thêm `Badge` "Có thay đổi chờ duyệt"; nút chính theo `primaryAction`; thẻ "Hồ sơ hoàn thiện {percent}%" với `Progress` và danh sách 5 mốc (✓ `CheckCircle2` / ○ `Circle`), trên mobile gói trong `Collapsible` mặc định đóng. Không dùng chữ "NetSpace".
- [ ] **Step 6: Viết `ProfilePage`** — `useLiveQuery(() => profileService.getProfile(account.id))` (+ `ekycService.getState` khi KOL); Loading: `Skeleton` cho header và tab; Error: `Alert` + nút "Thử lại" (`reload`). `TabsList` rộng hết màn trên mobile (`w-full grid grid-cols-3`), chữ tab rút gọn dưới `sm` ("Liên hệ" · "Định danh" · "Kênh"). Tạm để nội dung tab là `ComingSoon` tới Task 10–13. Nối route, thêm toaster.
- [ ] **Step 7: Kiểm tra trên trình duyệt (375 px, 1280 px):** đăng nhập KOL mẫu → `/ho-so-kol` hiện 0%, nút "Xác thực danh tính" chuyển `?tab=dinh-danh`; MCN mẫu → "Xác thực tổ chức"; đổi avatar bằng file PNG → hiện ngay, tải lại trang vẫn còn; chọn GIF → toast 4203. Console không lỗi.
- [ ] **Step 8: Commit** — `feat(profile): profile page shell and header (SCR-03)`

---

### Task 10: Tab Thông tin liên hệ (SCR-04)

**Files:**
- Create: `src/app/features/profile/ContactTab.tsx`
- Modify: `src/app/features/profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `ProfileView`, `profileService.updateContact`, `profileService.updateStaff`, `ValidationError`, `KOL_CATEGORIES`, `PROVINCES`
- Produces: `<ContactTab view: ProfileView />`

- [ ] **Step 1: Viết `ContactTab`.** Hai `Card`: "Liên hệ" và "Nhân sự quản lý nội dung", mỗi thẻ có nút bút chì (`Pencil`, `aria-label="Sửa {tên khối}"`) mở `Dialog` sửa. Dạng xem: lưới nhãn/giá trị (1 cột mobile, 2 cột `md`), trường trống hiện "Chưa cập nhật" `text-muted-foreground`, trường bắt buộc còn trống có dấu `*` đỏ. Trường khối Liên hệ: "Họ tên KOL/KOC" (MCN: "Tên hiển thị"), "Số điện thoại", "Email", "Zalo", "Quốc gia", "Tỉnh/Thành phố" (`Select` từ `PROVINCES`), "Địa chỉ", "Lĩnh vực" (`Select` từ `KOL_CATEGORIES`). Khối Nhân sự: "Họ tên nhân sự", "Số điện thoại", "Email". Dialog: `Input`/`Select` kit, nút "Lưu" (loading `Loader2`) → gọi service → `toast.success('Đã lưu thông tin')` → đóng; `ValidationError` hiện dưới đúng trường ("Số điện thoại không hợp lệ", "Email không hợp lệ", "Vui lòng nhập {nhãn}").
- [ ] **Step 2: Hiện `PENDING_CHANGE`.** Khi có change request `displayName`: dưới giá trị "Họ tên KOL/KOC" hiện `Badge` "Chờ duyệt" + dòng "Tên mới: {newValue}". Trong Dialog, khi hồ sơ `SUBMITTED | APPROVED`, dưới trường Họ tên có ghi chú "Thay đổi họ tên cần được duyệt trước khi hiển thị." Sau lưu nếu tạo change request → `toast.info('Đã gửi yêu cầu thay đổi họ tên, chờ duyệt')`.
- [ ] **Step 3: Kiểm tra trên trình duyệt (375 px):** điền đủ Liên hệ + Nhân sự → % tăng 40 điểm; SĐT `0212345678` → lỗi tại trường; (sau Task 12) gửi hồ sơ rồi đổi họ tên → giá trị giữ nguyên, badge "Chờ duyệt".
- [ ] **Step 4: Commit** — `feat(profile): contact tab with pending name change (SCR-04)`

---

### Task 11: Tab Quản lý kênh (SCR-06)

**Files:**
- Create: `src/app/features/channels/ChannelsTab.tsx`, `src/app/features/channels/ChannelFormSheet.tsx`
- Modify: `src/app/features/profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `channelService.list/add/update/setActive`, `detectPlatform`, `validateProofImage`, `countByFilter`, `matchesFilter`, `toStoredFile`, `ChannelStatusBadge`, `PlatformIcon`, `errorMessage`
- Produces: `<ChannelsTab accountId: string; profileStatus: ProfileStatus />`, `<ChannelFormSheet open; onOpenChange; accountId; channel?: Channel />`

- [ ] **Step 1: `ChannelsTab`.** `useLiveQuery(() => channelService.list(accountId))`. Thanh lọc `Tabs` có số lượng: "Tất cả ({all})" · "Đã xác thực ({verified})" · "Chờ duyệt ({pending})" · "Cần bổ sung ({needs_fix})", cuộn ngang trên mobile; nút "+ Thêm kênh". Mỗi kênh là một `Card`: `PlatformIcon`, `handle`, link rút gọn (mở tab mới, `rel="noopener noreferrer"`), `ChannelStatusBadge`, thumbnail ảnh quản lý (56 px), `Switch` "Hoạt động" (`aria-label`) gọi `setActive` → `toast.success('Đã bật kênh' | 'Đã tắt kênh')`, nút "Sửa" (tắt kèm Tooltip "Kênh đang được xét duyệt" khi hồ sơ `SUBMITTED` và kênh `PENDING_REVIEW`). Kênh `NEEDS_FIX`: `Alert` cảnh báo "Cần bổ sung: {note}" + nút "Sửa ảnh". Không có nút xoá. Rỗng theo bộ lọc: "Không có kênh nào ở trạng thái này"; chưa có kênh nào: thêm nút "Thêm kênh đầu tiên". Loading: 3 `Skeleton` thẻ.
- [ ] **Step 2: `ChannelFormSheet`.** `Sheet` `side="bottom"` dưới `md`, `side="right"` từ `md`; tiêu đề "Thêm kênh" / "Sửa kênh". Trường "Link kênh" — gõ tới đâu gọi `detectPlatform` tới đó: nhận ra → chip nền tảng; không nhận ra (và ô không rỗng) → lỗi `errorMessage('KOLHUB-4202')`, nút Lưu khoá. Trường "Ảnh trang quản lý kênh" (`accept="image/jpeg,image/png"`, gợi ý "Chụp màn hình trang quản trị kênh đang đăng nhập, thấy rõ tên kênh. JPG/PNG ≤ 10 MB") — chọn file → `validateProofImage` (lỗi 4203 tại trường) → `toStoredFile` → xem trước. Sửa kênh `VERIFIED`: `Alert` "Đổi link hoặc ảnh sẽ tạm ngừng dấu Kênh xác thực cho tới khi được duyệt lại." Lưu → `add`/`update` → `toast.success('Đã lưu kênh, đang chờ duyệt')` (không đổi gì → `toast('Không có thay đổi')`); 4201 → lỗi dưới trường Link (thêm câu tranh chấp khi `ownedByOther`).
- [ ] **Step 3: Kiểm tra trên trình duyệt (375 px, 1280 px):** thêm kênh TikTok hợp lệ → tab "Chờ duyệt (1)"; link Instagram → lỗi 4202, Lưu khoá; thêm lại cùng link dạng `www.`/`/` cuối → 4201; ảnh > 10 MB → 4203; tắt/bật kênh; sửa không đổi gì → không đổi trạng thái.
- [ ] **Step 4: Commit** — `feat(channels): channel management tab (SCR-06)`

---

### Task 12: Tab định danh KOL — eKYC 3 bước, gửi hồ sơ, Trạng thái xét duyệt (SCR-05)

**Files:**
- Create: `src/app/features/kol-profile/KolIdentityTab.tsx`, `src/app/features/kol-profile/EkycStepper.tsx`, `src/app/features/kol-profile/ekycCopy.ts`, `src/app/features/profile/SubmitPanel.tsx`, `src/app/features/review-status/ReviewStatusBox.tsx`
- Modify: `src/app/features/profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `ekycService.*`, `reviewService.submit`, `ProfileView` (gồm `checklist`), `buildTimeline` (từ `services/index.ts`), `errorMessage`, `toStoredFile`, `useAuth().logout`
- Produces:
  - `EKYC_TIPS: Partial<Record<ErrorCode, string[]>>` và `KOL_PLEDGES: string[]`, `MCN_PLEDGES: string[]` (trong `ekycCopy.ts`, MCN_PLEDGES dùng ở Task 13)
  - `<SubmitPanel ownerType; accountId; view: ProfileView; pledges: string[]; resubmit: boolean />` — checklist ✓/✕ (`CheckCircle2` `text-success` / `XCircle` `text-destructive`), 3 `Checkbox` cam đoan, nút "Gửi xét duyệt" (hoặc "Gửi lại hồ sơ" khi `resubmit`) khoá khi còn mục ✕
  - `<ReviewStatusBox profile: KolProfile | McnProfile />` — chỉ xem (BR-19)
  - `<KolIdentityTab accountId; view: ProfileView; ekyc: EkycView />`

Copy (nguyên văn):
- `KOL_PLEDGES`: "Tôi cam đoan thông tin đã khai là chính xác và là của chính tôi." · "Tôi là chủ sở hữu hoặc người được uỷ quyền quản lý các kênh đã khai." · "Tôi đồng ý cho KOL Hub xử lý dữ liệu cá nhân để xét duyệt hồ sơ theo quy định về bảo vệ dữ liệu cá nhân."
- `MCN_PLEDGES`: "Tôi cam đoan thông tin tổ chức và giấy tờ đã tải lên là chính xác, còn hiệu lực." · "Tôi được tổ chức uỷ quyền đăng ký và quản lý tài khoản này." · câu thứ 3 giống KOL.
- `EKYC_TIPS`: 4101 ["Đặt CCCD trên nền tối, đủ sáng, không bị lóa.", "Giữ máy thẳng, chụp đủ 4 góc thẻ."]; 4102 ["Chỉ chấp nhận CCCD gắn chip còn hạn. Chưa hỗ trợ VNeID."]; 4105 ["Nhìn thẳng camera, bỏ kính và khẩu trang.", "Quay ở nơi đủ sáng."]; 4106 ["Làm theo hướng dẫn trên màn hình, không dùng ảnh hoặc video có sẵn."]; 4107 ["Mở cài đặt trình duyệt → Quyền truy cập camera → Cho phép, rồi thử lại."]; 5101 ["Thử lại sau ít phút. Lần này không bị tính vào số lần thử."].

- [ ] **Step 1: `EkycStepper` (Box 1 — "Xác thực danh tính & gửi hồ sơ").** Thanh 3 bước "Chụp ảnh CCCD" → "Quay video" → "Gửi xét duyệt", bước hiện tại theo `ekyc.status` (`NOT_STARTED` → 1, `OCR_PASSED` → 2, `PASSED` → 3). Dưới `md` nội dung bước mở trong `Dialog` full màn hình (`h-dvh w-screen max-w-none rounded-none md:h-auto md:max-w-lg md:rounded-lg`), nút "Bắt đầu"/"Tiếp tục xác thực" mở dialog; từ `md` hiển thị ngay trong thẻ.
  - Bước 1: hai ô "Mặt trước" / "Mặt sau", mỗi ô `<input type="file" accept="image/*" capture="environment">` ẩn sau `Button` (icon `Camera`), xem trước thumbnail; "Tiếp tục" bật khi đủ 2 ảnh → trạng thái Loading "Đang đọc thông tin CCCD…" (`Loader2`) → `submitIdCard`.
  - Bước 2: hướng dẫn ngắn (nhìn thẳng, đủ sáng, quay đầu chậm), `<input type="file" accept="video/*" capture="user">` → Loading "Đang đối chiếu khuôn mặt…" → `submitFaceVideo`.
  - Bước 3: thẻ "Thông tin từ CCCD" chỉ xem — Họ tên, Ngày sinh, Số CCCD (`idNoMasked`), Ngày cấp, icon `Lock` + "Thông tin định danh đã khoá, chỉ thay đổi bằng xác thực lại."; bên dưới `<SubmitPanel pledges={KOL_PLEDGES} />`.
  - Lỗi: `Alert variant="destructive"` với `errorMessage(code, meta)`, danh sách `EKYC_TIPS[code]`, dòng "Còn {attemptsLeft} lần thử" khi có. 4103: 2 nút "Cập nhật hồ sơ theo giấy tờ" (`resolveNameMismatch('update-profile')`, hiển thị so sánh "Hồ sơ: {profileName} · CCCD: {fullName}") và "Gửi yêu cầu xem xét" (`'request-review'`). 4104: "Đăng nhập tài khoản đó" (`logout()` → `/dang-nhap`) và "Báo cáo bị mạo danh" (`reportImpersonation`). 4108 hoặc `lockedUntil`: thay cả box bằng `Alert` khoá + thời điểm mở + "Liên hệ hỗ trợ".
  - `MANUAL_REVIEW`: box hiện "Yêu cầu xem xét họ tên đang chờ xử lý"; `REPORTED`: "Báo cáo mạo danh đã được ghi nhận, chúng tôi sẽ liên hệ bạn." Không nút.
  - Sau khi gửi (`status !== 'DRAFT' && !== 'NEEDS_FIX'`): box thu gọn thành một dòng "Đã gửi hồ sơ ngày {dd/MM/yyyy}" + thông tin định danh chỉ xem. `NEEDS_FIX`: mở lại bước 3 với `resubmit`.
- [ ] **Step 2: `SubmitPanel`.** Checklist = `view.checklist` + mục "Đã tick đủ 3 cam đoan" tính từ 3 checkbox. Gửi → `reviewService.submit` → `toast.success('Đã gửi hồ sơ xét duyệt')`.
- [ ] **Step 3: `ReviewStatusBox` (Box 2 — "Trạng thái xét duyệt").** Timeline dọc 3 mốc từ `buildTimeline`; màu theo `state` (`done`/`success` `text-success`, `current` `text-primary` + chấm nhấp nháy `animate-pulse`, `warning` `text-warning`, `error` `text-destructive`, `todo` `text-muted-foreground`); ngày giờ `dd/MM/yyyy HH:mm`; `note` hiện dưới mốc. Khi NEEDS_FIX/APPROVED liệt kê kênh `NEEDS_FIX` kèm lý do (chỉ chữ). Không có button, link hay input.
- [ ] **Step 4: `KolIdentityTab`** = `EkycStepper` + `ReviewStatusBox`, xếp dọc trên mobile, 2 cột `lg:grid-cols-[3fr_2fr]`.
- [ ] **Step 5: Kiểm tra trên trình duyệt (375 px, bật mô phỏng mobile để `capture` có tác dụng; desktop rơi về chọn file):** luồng thành công tới "Gửi xét duyệt" khoá khi thiếu điều kiện, mở khi đủ; gửi → box thu gọn, timeline "Đang xét duyệt"; tải lại trang giữa bước 2 → vẫn ở bước 2.
- [ ] **Step 6: Commit** — `feat(kol-profile): eKYC stepper, submit panel, review status (SCR-05)`

---

### Task 13: Tab định danh MCN (SCR-07)

**Files:**
- Create: `src/app/features/mcn-profile/McnIdentityTab.tsx`
- Modify: `src/app/features/profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `profileService.updateOrgIdentity`, `profileService.uploadGcn`, `validateGcnFile`, `toStoredFile`, `<SubmitPanel>`, `<ReviewStatusBox>`, `MCN_PLEDGES`, `ValidationError`
- Produces: `<McnIdentityTab accountId; view: ProfileView />`

- [ ] **Step 1: Viết `McnIdentityTab`.** Box 1 "Xác thực tổ chức & gửi hồ sơ", 3 bước:
  - Bước 1 "Thông tin tổ chức": 5 trường "Tên tổ chức", "Mã số doanh nghiệp", "Ngày cấp" (`Input type="date"`), "Nơi cấp", "Người đại diện theo pháp luật"; "Lưu" gọi `updateOrgIdentity`; "Tiếp tục" khoá khi thiếu trường. Lỗi 4303 dưới "Mã số doanh nghiệp".
  - Bước 2 "Giấy chứng nhận ĐKDN": `<input type="file" accept="image/jpeg,image/png,application/pdf">`, gợi ý "Đủ trang, thấy rõ số và ngày cấp. JPG/PNG/PDF ≤ 10 MB"; `validateGcnFile` (4301/4302 tại chỗ) → `uploadGcn`; hiện tên file + dung lượng (MB, 1 chữ số thập phân) + thumbnail nếu là ảnh.
  - Bước 3 "Xem lại & gửi": bảng 5 trường + tên file GCN, `<SubmitPanel pledges={MCN_PLEDGES} />`.
  - Sau khi gửi (`SUBMITTED | APPROVED`): các trường hiện dạng xem với nút "Đề nghị thay đổi" mở `Dialog` sửa (cùng 5 trường + đổi GCN); lưu → `toast.info('Đã gửi thay đổi, thông tin hiện tại giữ nguyên tới khi được duyệt')`; có bản chờ → `Alert` "Có thay đổi đang chờ duyệt" liệt kê trường khác biệt (giá trị cũ → mới). `REJECTED`: chỉ xem, không nút. `NEEDS_FIX`: sửa trực tiếp như DRAFT + `SubmitPanel` với `resubmit`.
  - Box 2: `<ReviewStatusBox />`.
- [ ] **Step 2: Kiểm tra trên trình duyệt (375 px, 1280 px):** MCN mẫu điền 5 trường → tải PDF 2 MB → điền liên hệ → gửi được dù chưa có kênh (BR-65); file `.docx` → 4301; sau gửi đổi Người đại diện → dữ liệu hiển thị giữ nguyên, có Alert chờ duyệt.
- [ ] **Step 3: Commit** — `feat(mcn-profile): organization identity tab with pending change (SCR-07)`

---

### Task 14: Demo Panel — Giả lập Admin, Case eKYC, Phễu, Giả định

**Files:**
- Create: `src/app/demo/AdminSimulator.tsx`, `src/app/demo/EkycScenarioPicker.tsx`, `src/app/demo/FunnelView.tsx`, `src/app/demo/assumptions.ts`, `src/app/demo/AssumptionsList.tsx`
- Modify: `src/app/demo/DemoPanel.tsx`

**Interfaces:**
- Consumes: `reviewService.listAdminQueue/approve/requestFix/reject/decideChange/closeEkycCase/expireChannelNow`, `ekycService.getScenario/setScenario`, `funnelService.subjects/get`, `FUNNEL_STEPS`, `formatDuration`, `errorMessage`, `useLiveQuery`, `useAuth`
- Produces:
  - `ASSUMPTIONS: { question: string; decision: string }[]` — đúng 8 dòng bảng spec §6, nguyên văn cột "Câu hỏi (mục 11.1)" và "Quyết định cho prototype"
  - `<AdminSimulator />`, `<EkycScenarioPicker />`, `<FunnelView />`, `<AssumptionsList />`

- [ ] **Step 1: `AdminSimulator` (khối "Giả lập Admin").** Dùng `useLiveQuery(() => reviewService.listAdminQueue())`. Bốn nhóm, mỗi nhóm rỗng thì hiện "Không có mục nào":
  - "Hồ sơ chờ duyệt": mỗi hồ sơ một `Card` — tên, loại (KOL/MCN), trạng thái, ngày gửi; MCN hiện 5 trường tổ chức + tên file GCN. Mỗi kênh chờ: handle + nền tảng + thumbnail + `RadioGroup` "Đạt" / "Cần bổ sung" (chọn "Cần bổ sung" hiện `Textarea` lý do bắt buộc). Nút "Duyệt hồ sơ" (khoá tới khi mọi kênh có kết luận và mọi lý do khác rỗng) → `approve`. Hồ sơ `SUBMITTED` có thêm "Yêu cầu bổ sung" và "Từ chối", mỗi nút mở `Dialog` nhập lý do bắt buộc; với MCN, Dialog Từ chối có nút điền nhanh `errorMessage('KOLHUB-4304')`.
  - "Thay đổi chờ duyệt": tên, trường ("Họ tên KOL/KOC" / "Thông tin định danh tổ chức"), cũ → mới; "Duyệt" / "Từ chối" (lý do bắt buộc) → `decideChange`.
  - "Case eKYC chờ xử lý": `MANUAL_REVIEW` — tên hồ sơ vs tên CCCD, "Chấp nhận tên theo CCCD" (`accept-name`) / "Yêu cầu làm lại" (lý do, `reset`); `REPORTED` — "Đóng báo cáo, cho xác thực lại" (`reset`).
  - "Kênh có dấu": handle, hạn dấu, nút "Đẩy sang hết hạn" → `expireChannelNow`.
  - Sau mỗi thao tác: `toast.success` ngắn ("Đã duyệt hồ sơ" …); tin email/SMS giả tự hiện qua `NoticeInboxToaster` (BR-17).
- [ ] **Step 2: `EkycScenarioPicker` (khối "Case eKYC").** `RadioGroup` 9 lựa chọn, nhãn: "Thành công" · "4101 Ảnh mờ/lóa" · "4102 CCCD hết hạn/không chip" · "4103 Họ tên khác hồ sơ" · "4104 CCCD thuộc tài khoản khác" · "4105 Khuôn mặt không khớp" · "4106 Không vượt kiểm tra người thật" · "4107 Chưa cấp quyền camera" · "5101 Lỗi hệ thống"; mã tính lần thử có `Badge` "tính lần thử". Ghi chú: "Áp dụng cho các lần gửi tiếp theo cho tới khi đổi." Đọc/ghi `getScenario`/`setScenario`.
- [ ] **Step 3: `FunnelView` (khối "Phễu").** `Select` subject (mặc định email tài khoản đang đăng nhập nếu có trong `subjects()`, không thì subject mới nhất); danh sách 7 bước `FUNNEL_STEPS`: nhãn, giờ `HH:mm:ss dd/MM` hoặc "—", và "+{formatDuration(sincePrevMs)}" khi có. Chưa có dữ liệu: "Chưa có hành trình nào. Hãy đăng ký một tài khoản KOL mới."
- [ ] **Step 4: `assumptions.ts` + `AssumptionsList` (khối "Giả định").** `Accordion` hoặc danh sách định nghĩa, tiêu đề khối "Giả định (chờ khách xác nhận)".
- [ ] **Step 5: Gắn vào `DemoPanel`** theo thứ tự spec §4: Vai trò · Giả lập Admin · Case eKYC · Phễu · Dữ liệu · Giả định; mỗi khối là một mục `Accordion` để Sheet không quá dài trên mobile; Sheet `w-full sm:max-w-md`, nội dung cuộn (`ScrollArea`).
- [ ] **Step 6: Kiểm tra trên trình duyệt (375 px, 1280 px):**
  - KOL mẫu: điền liên hệ/nhân sự, thêm 2 kênh, eKYC thành công, gửi → Admin: kênh 1 Đạt, kênh 2 Cần bổ sung (thử bỏ trống lý do → nút khoá) → toast email + SMS; header hiện khiên, % = 100, timeline "Đã duyệt"; tab kênh "Cần bổ sung (1)" có lý do.
  - Chọn case 4101, thử 5 lần → thông báo khoá 4108; case 5101 không trừ lần thử; 4103 → 2 nút; 4104 → 2 nút; báo mạo danh → Admin đóng báo cáo → làm lại được.
  - "Đẩy sang hết hạn" → kênh "Hết hạn", biến khỏi tab "Đã xác thực".
  - Đổi họ tên sau duyệt → Admin duyệt thay đổi → tên mới hiện.
  - MCN: gửi → Admin Từ chối với lý do 4304 → timeline "Không được duyệt" + lý do.
  - Phễu: đăng ký KOL mới qua 2 OTP → khối Phễu có 3 mốc đầu với khoảng cách thời gian.
  - Console không lỗi.
- [ ] **Step 7: Commit** — `feat(demo): admin simulator, eKYC scenarios, funnel, assumptions`

---

### Task 15: Kiểm tra cuối Đợt 2

- [ ] **Step 1:** `npm test` — toàn bộ PASS (Đợt 1 + Đợt 2).
- [ ] **Step 2:** `npm run build` — thành công.
- [ ] **Step 3:** Trên trình duyệt ở 375 px, 768 px, 1280 px đi UC-06, UC-07, UC-08, UC-09, UC-10, UC-15, UC-16, UC-17, UC-18, UC-19; đối chiếu: đủ 5 trạng thái hồ sơ §7.2 và 4 trạng thái kênh §7.3 + `INACTIVE`; đủ 9 case §7.4 và các mã 4101–4108, 5101, 4201–4203, 4301–4304 (4304 qua lý do từ chối); các trạng thái Loading/Empty/Error/Success của SCR-05 và SCR-06 theo §9.3; tìm chữ "NetSpace" trong `src/app/features` và `src/app/demo` — không có.
- [ ] **Step 4:** Reset dữ liệu demo → KOL/MCN mẫu về `DRAFT` 0%.
- [ ] **Step 5:** Commit nếu còn thay đổi — `chore: đợt 2 verification fixes`
