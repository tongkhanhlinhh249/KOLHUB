# KOL Hub Prototype — Đợt 1: Nền role, Đăng ký, Đăng nhập — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đăng ký (3 loại tài khoản), xác thực OTP giả lập, đăng nhập / khôi phục mật khẩu, và được điều hướng theo role key với menu riêng; Demo Panel chuyển role nhanh.

**Architecture:** Luật nghiệp vụ nằm trong tầng dịch vụ giả lập thuần TypeScript (`src/app/services/mock/*`), tạo bằng factory nhận `db`, `now()` và `notify` để test được. Màn hình chỉ import `src/app/services/index.ts`. Phân quyền là một hàm thuần `resolveAccess(role, path)` trong `src/app/auth/roles.ts`, dùng chung cho guard, sidebar và thanh điều hướng dưới.

**Tech Stack:** React 18, react-router 7 (`createBrowserRouter`), Tailwind v4, component NetSpace kit trong `src/app/components/ui`, `sonner`, `lucide-react`, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-27-kolhub-user-prototype-design.md` (mục 2, 3 — Đợt 1, 4 — khối Chuyển role/Dữ liệu, 8). Nghiệp vụ gốc: `../NS-KOLHUB-001-nguoi-dung-v1.0.md`.

## Global Constraints

- Màn hình chỉ import dịch vụ từ `src/app/services/index.ts`; không import `services/mock/*` trực tiếp.
- Lỗi nghiệp vụ là `KolhubError` với `code` dạng `KOLHUB-xxxx`; thông điệp tiếng Việt lấy từ `errorMessage()`.
- OTP: 6 số, hiệu lực 5 phút, dùng một lần, gửi lại sau 60 giây, tối đa 5 lần gửi/giờ cho mỗi (kênh, đích), sai 5 lần thì huỷ mã; gửi mã mới làm mã cũ hết hiệu lực (BR-04, BR-49).
- KOL/MCN: tài khoản chỉ được tạo sau khi OTP email **và** OTP SMS đều thành công (BR-04a).
- Mật khẩu ≥ 8 ký tự, có chữ và số (BR-03). Sai mật khẩu 5 lần liên tiếp khoá 15 phút (BR-08).
- Nhãn hàng/Agency chặn email: gmail.com, yahoo.com, yahoo.com.vn, outlook.com, hotmail.com, icloud.com, live.com (BR-45 → KOLHUB-4015).
- Đăng nhập bằng SĐT + OTP chỉ cho KOL/MCN.
- Nội dung SMS đúng nguyên văn MẪU-01/02/03 của tài liệu nghiệp vụ mục 8.
- Không dùng chữ "NetSpace" trong giao diện.
- Component UI dùng kit (`Button`, `Input`, `Label`, `Checkbox`, `Tabs`, `Sheet`, `RadioGroup`…); màu chỉ dùng token (`bg-primary`, `text-muted-foreground`…).
- Mọi truy cập `localStorage` bọc `try/catch`; lỗi thì chạy trong bộ nhớ.

## Review Focus

1. **Email/SĐT viết khác kiểu:** `" Kol@Demo.vn "` và `kol@demo.vn`, `+84912345678` và `0912345678` là cùng một người → phải báo trùng (4002/4001) và đăng nhập được. Test ở Task 4.
2. **Dừng giữa chừng khi đăng ký KOL:** đã qua OTP email nhưng chưa qua OTP SMS → không có tài khoản nào được tạo; đăng nhập báo 4012. Test ở Task 4.
3. **Bấm "Gửi lại mã" liên tục:** trong 60 giây không được gửi mã mới; dịch vụ trả 4007 kèm `retryAfterSec`. Test ở Task 3.
4. **`returnTo` trỏ ra ngoài:** `/dang-nhap?returnTo=https://evil.com` hoặc `//evil.com` → bỏ qua, về màn mặc định. Test ở Task 2.
5. **`localStorage` hỏng:** chuỗi JSON lỗi hoặc sai phiên bản → nạp lại dữ liệu mẫu, không trắng trang. Test ở Task 1.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/app/services/types.ts` | Kiểu dùng chung: `RoleKey`, `AccountType`, `Account`, `OtpChannel`, `OtpPurpose`, `ErrorCode`, `KolhubError` |
| `src/app/services/errors.ts` | `errorMessage(code, meta)` — thông điệp tiếng Việt |
| `src/app/services/mock/db.ts` | Kho dữ liệu demo trong `localStorage` (`kolhub-demo-v1`), fallback bộ nhớ |
| `src/app/services/mock/seed.ts` | Dữ liệu mẫu: 3 tài khoản đăng nhập nhanh |
| `src/app/services/mock/delay.ts` | `delay(ms?)` trễ giả 400–800 ms |
| `src/app/services/mock/normalize.ts` | `normalizeEmail`, `normalizePhone`, `isValidPhone`, `isValidEmail` |
| `src/app/services/mock/otp.ts` | `createOtpService` |
| `src/app/services/mock/auth.ts` | `createAuthService` |
| `src/app/services/index.ts` | Nối dịch vụ mock với `db`, `Date.now`, `otpInbox`; điểm import duy nhất |
| `src/app/services/otpInbox.ts` | Pub/sub tin OTP giả (SMS/email) cho UI |
| `src/app/auth/roles.ts` | Role config, menu, `roleOf`, `resolveAccess`, `getPageMeta` |
| `src/app/auth/AuthContext.tsx` | `AuthProvider`, `useAuth` |
| `src/app/auth/AccessGuard.tsx` | Áp `resolveAccess` cho mọi route |
| `src/app/layouts/GuestLayout.tsx` | Khung khách: logo + thẻ giữa màn hình |
| `src/app/components/Layout.tsx`, `Sidebar.tsx`, `Header.tsx`, `BottomNavigation.tsx` | Sửa: đọc menu từ `roles.ts`, Header có Đăng xuất |
| `src/app/components/navigation.ts` | Xoá (thay bằng `roles.ts`) |
| `src/app/features/otp/OtpStep.tsx` | Bước nhập OTP dùng chung |
| `src/app/features/otp/OtpInboxToaster.tsx` | Hiện tin SMS/email giả bằng `sonner` |
| `src/app/features/register/RegisterPage.tsx`, `AccountTypeCards.tsx`, `KolMcnForm.tsx`, `BizForm.tsx` | SCR-01 |
| `src/app/features/login/LoginPage.tsx`, `ForgotPasswordPage.tsx` | SCR-02 |
| `src/app/features/placeholder/ComingSoon.tsx` | Trang tạm cho màn của Đợt 2/3 và KOL Safety |
| `src/app/demo/DemoPanel.tsx` | Nút nổi + Sheet: đăng nhập nhanh, đăng xuất, reset |
| `src/app/routes.tsx`, `src/app/App.tsx` | Sửa: cấu trúc route mới, `AuthProvider`, `Toaster` |
| `vite.config.ts`, `package.json` | Thêm Vitest |

---

### Task 1: Vitest, kiểu dùng chung, kho dữ liệu demo

**Files:**
- Modify: `package.json` (devDependency `vitest@3.2.4`, script `"test": "vitest run"`), `vite.config.ts` (`test: { environment: 'node', include: ['src/**/*.test.ts'] }`)
- Create: `src/app/services/types.ts`, `src/app/services/errors.ts`, `src/app/services/mock/db.ts`, `src/app/services/mock/seed.ts`, `src/app/services/mock/delay.ts`, `src/app/services/mock/normalize.ts`
- Test: `src/app/services/mock/db.test.ts`, `src/app/services/mock/normalize.test.ts`

**Interfaces:**
- Produces:
  - `type RoleKey = 'kolhub.guest' | 'kolhub.user.kol' | 'kolhub.user.mcn' | 'kolhub.user.biz'`
  - `type AccountType = 'KOL' | 'MCN' | 'BIZ'`
  - `interface Account { id: string; type: AccountType; email: string; phone?: string; fullName?: string; company?: string; createdAt: string }`
  - `type OtpChannel = 'email' | 'sms'`; `type OtpPurpose = 'register' | 'login' | 'reset'`
  - `type ErrorCode` = union của `'KOLHUB-4001'…'KOLHUB-4015'` (4001–4009, 4011–4015)
  - `class KolhubError extends Error { code: ErrorCode; meta?: { attemptsLeft?: number; retryAfterSec?: number; field?: string } }`
  - `errorMessage(code: ErrorCode, meta?: KolhubError['meta']): string`
  - `interface DemoState { version: 1; accounts: StoredAccount[]; otps: OtpRecord[]; registrations: PendingRegistration[]; loginFails: Record<string, { count: number; lockedUntil?: number }>; sessionAccountId: string | null }` (`StoredAccount = Account & { password: string }`; `OtpRecord`, `PendingRegistration` định nghĩa ở Task 3/4 nhưng khai báo kiểu tại `db.ts`)
  - `createDb(storage: Pick<Storage,'getItem'|'setItem'|'removeItem'> | null, seed: () => DemoState): Db` với `interface Db { read(): DemoState; update(fn: (s: DemoState) => void): void; reset(): void }`
  - `db: Db` — instance mặc định dùng `window.localStorage` (bọc try/catch) và `seedState`
  - `seedState(): DemoState` — 3 tài khoản: `kol@demo.kolhub.vn` / `0912000001` (KOL), `mcn@demo.kolhub.vn` / `0912000002` (MCN), `brand@vinamilk-demo.vn` (BIZ, fullName "Nguyễn Minh Anh", company "Công ty Demo Sữa"); mật khẩu chung `demo1234`
  - `delay(ms = 400 + Math.random() * 400): Promise<void>`
  - `normalizeEmail(s): string` (trim + lowercase), `normalizePhone(s): string` (bỏ khoảng trắng/dấu chấm, `+84`/`84` đầu → `0`), `isValidPhone(s)` (`/^0(3|5|7|8|9)\d{8}$/` sau normalize), `isValidEmail(s)`

- [ ] **Step 1: Cài Vitest** — `npm i -D vitest@3.2.4`; thêm script và khối `test` vào `vite.config.ts`.
- [ ] **Step 2: Viết test thất bại**

```ts
// db.test.ts
test('reset về seed khi JSON hỏng', () => {
  const mem = memoryStorage({ 'kolhub-demo-v1': '{not json' });
  const db = createDb(mem, seedState);
  expect(db.read().accounts).toHaveLength(3);
});
test('reset về seed khi sai version', () => {
  const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify({ version: 0 }) });
  expect(createDb(mem, seedState).read().version).toBe(1);
});
test('update ghi lại storage', () => {
  const mem = memoryStorage({});
  const db = createDb(mem, seedState);
  db.update(s => { s.sessionAccountId = 'x'; });
  expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).sessionAccountId).toBe('x');
});
test('storage null vẫn chạy trong bộ nhớ', () => {
  const db = createDb(null, seedState);
  db.update(s => { s.sessionAccountId = 'y'; });
  expect(db.read().sessionAccountId).toBe('y');
});
// normalize.test.ts
test.each([['+84912345678','0912345678'],['84 912 345 678','0912345678'],['0912.345.678','0912345678']])('normalizePhone %s', (a, b) => expect(normalizePhone(a)).toBe(b));
test('normalizeEmail', () => expect(normalizeEmail(' Kol@Demo.VN ')).toBe('kol@demo.vn'));
test('isValidPhone từ chối đầu số 02', () => expect(isValidPhone('0212345678')).toBe(false));
```
(`memoryStorage(init)` là helper nhỏ trong file test.)

- [ ] **Step 3: Chạy `npm test` — FAIL (module chưa có)**
- [ ] **Step 4: Viết `types.ts`, `errors.ts`, `normalize.ts`, `delay.ts`, `seed.ts`, `db.ts`.** `errors.ts` có một câu tiếng Việt cho mỗi mã theo bảng 7.5; 4005/4011 chèn "Còn {attemptsLeft} lần thử", 4007/4013 chèn "Thử lại sau {retryAfterSec} giây"/"… phút". `db.read()` trả bản sao (`structuredClone`).
- [ ] **Step 5: Chạy `npm test` — PASS**
- [ ] **Step 6: Commit** — `git commit -m "feat(services): demo db, shared types, vitest"`

---

### Task 2: Role config và `resolveAccess`

**Files:**
- Create: `src/app/auth/roles.ts`
- Test: `src/app/auth/roles.test.ts`

**Interfaces:**
- Consumes: `RoleKey`, `AccountType`, `Account` (Task 1)
- Produces:
  - `interface MenuItem { icon: LucideIcon; label: string; shortLabel: string; path: string }`
  - `ROLE_CONFIG: Record<RoleKey, { label: string; home: string; menu: MenuItem[] }>`:
    - guest — label "Khách", home `/dang-ky`, menu: Đăng ký `/dang-ky`, Đăng nhập `/dang-nhap`
    - kol — "Cá nhân/KOL", home `/ho-so-kol`, menu: Hồ sơ KOL `/ho-so-kol` (UserRound), KOL Safety `/kol-safety` (ShieldCheck)
    - mcn — "Tổ chức/MCN", home `/ho-so-mcn`, menu: Hồ sơ MCN `/ho-so-mcn` (Users), KOL Safety `/kol-safety`
    - biz — "Nhãn hàng/Agency", home `/tim-kiem-kol`, menu: Tìm kiếm KOL `/tim-kiem-kol` (Search), Danh sách đã lưu `/danh-sach-da-luu` (BookMarked), Tài khoản doanh nghiệp `/tai-khoan-doanh-nghiep` (Building2)
  - `GUEST_PATHS = ['/dang-ky', '/dang-nhap', '/quen-mat-khau']`
  - `roleOf(account: Account | null): RoleKey`
  - `type Access = { allow: true } | { allow: false; redirect: string; reason: 'login' | 'forbidden' | 'home' }`
  - `resolveAccess(role: RoleKey, path: string): Access`
  - `safeReturnTo(role: RoleKey, returnTo: string | null): string` — trả `returnTo` nếu là đường dẫn nội bộ (bắt đầu bằng `/`, không bắt đầu bằng `//`) và `resolveAccess(role, returnTo).allow`; ngược lại trả `ROLE_CONFIG[role].home`
  - `getPageMeta(path: string): { title: string; group: string; description?: string }`

- [ ] **Step 1: Viết test thất bại**

```ts
test('guest vào trang cần đăng nhập → Đăng nhập kèm returnTo', () =>
  expect(resolveAccess('kolhub.guest', '/ho-so-kol')).toEqual({ allow: false, redirect: '/dang-nhap?returnTo=%2Fho-so-kol', reason: 'login' }));
test('KOL vào trang của Nhãn hàng → màn mặc định, forbidden', () =>
  expect(resolveAccess('kolhub.user.kol', '/tim-kiem-kol')).toEqual({ allow: false, redirect: '/ho-so-kol', reason: 'forbidden' }));
test('đã đăng nhập vào trang khách → màn mặc định, không báo lỗi', () =>
  expect(resolveAccess('kolhub.user.biz', '/dang-nhap')).toEqual({ allow: false, redirect: '/tim-kiem-kol', reason: 'home' }));
test('"/" và đường dẫn lạ → màn mặc định', () => {
  expect(resolveAccess('kolhub.user.mcn', '/')).toMatchObject({ redirect: '/ho-so-mcn', reason: 'home' });
  expect(resolveAccess('kolhub.guest', '/khong-ton-tai')).toMatchObject({ redirect: '/dang-ky', reason: 'home' });
});
test('KOL và MCN đều vào được KOL Safety', () => {
  expect(resolveAccess('kolhub.user.kol', '/kol-safety')).toEqual({ allow: true });
  expect(resolveAccess('kolhub.user.mcn', '/kol-safety')).toEqual({ allow: true });
});
test.each(['https://evil.com', '//evil.com', '/tim-kiem-kol', null])('safeReturnTo KOL bỏ qua %s', (r) =>
  expect(safeReturnTo('kolhub.user.kol', r)).toBe('/ho-so-kol'));
test('safeReturnTo giữ đường dẫn hợp quyền', () =>
  expect(safeReturnTo('kolhub.user.biz', '/danh-sach-da-luu')).toBe('/danh-sach-da-luu'));
```

- [ ] **Step 2: Chạy `npm test -- roles` — FAIL**
- [ ] **Step 3: Viết `roles.ts`.** Đường dẫn được phép của role = các `path` trong menu của role đó (guest: `GUEST_PATHS`). `getPageMeta` lấy `title` từ `label` của mục menu, `group` là `ROLE_CONFIG[role].label` của role sở hữu; `description` theo bảng: Hồ sơ KOL "Thông tin liên hệ, định danh và kênh của bạn", Hồ sơ MCN "Thông tin tổ chức, định danh và kênh", Tìm kiếm KOL "Tìm KOL có kênh đã xác thực", Danh sách đã lưu "Các KOL bạn đã lưu theo danh sách".
- [ ] **Step 4: Chạy test — PASS**
- [ ] **Step 5: Commit** — `feat(auth): role config and access rules (BR-66..69)`

---

### Task 3: Dịch vụ OTP

**Files:**
- Create: `src/app/services/mock/otp.ts`, `src/app/services/otpInbox.ts`
- Test: `src/app/services/mock/otp.test.ts`

**Interfaces:**
- Consumes: `Db`, `KolhubError`, `OtpChannel`, `OtpPurpose`, `normalizeEmail`, `normalizePhone`
- Produces:
  - `interface OtpRecord { id: string; channel: OtpChannel; target: string; purpose: OtpPurpose; code: string; expiresAt: number; sentAt: number; failCount: number; status: 'PENDING' | 'VERIFIED' | 'CANCELLED' | 'SUPERSEDED' }`
  - `interface OtpMessage { channel: OtpChannel; target: string; body: string; code: string }`
  - `createOtpService(deps: { db: Db; now: () => number; notify: (m: OtpMessage) => void; genCode?: () => string })` trả:
    - `send(input: { channel: OtpChannel; target: string; purpose: OtpPurpose }): Promise<{ requestId: string; resendAvailableAt: number; expiresAt: number }>`
    - `verify(input: { requestId: string; code: string }): Promise<void>`
    - `isVerified(requestId: string, expect: { channel: OtpChannel; target: string; purpose: OtpPurpose }): boolean`
  - `type OtpService = ReturnType<typeof createOtpService>`
  - `otpInbox: { publish(m: OtpMessage): void; subscribe(fn: (m: OtpMessage) => void): () => void }`
  - `smsBody(purpose: OtpPurpose, code: string): string` — MẪU-01 (register), MẪU-02 (login), MẪU-03 (reset), nguyên văn mục 8; email body: `Mã xác thực KOLHUB của bạn là {code}. Hiệu lực 5 phút.`

- [ ] **Step 1: Viết test thất bại** (dùng `now` giả tăng tay, `genCode: () => '123456'`)

```ts
test('mã hết hạn sau 5 phút → 4006', async () => {
  const { requestId } = await otp.send({ channel: 'sms', target: '0912345678', purpose: 'register' });
  clock += 5 * 60_000 + 1;
  await expect(otp.verify({ requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4006' });
});
test('sai mã → 4005 kèm số lần còn lại; lần sai thứ 5 → 4009 và huỷ mã', async () => {
  const { requestId } = await otp.send(sms);
  for (let i = 1; i <= 4; i++)
    await expect(otp.verify({ requestId, code: '000000' })).rejects.toMatchObject({ code: 'KOLHUB-4005', meta: { attemptsLeft: 5 - i } });
  await expect(otp.verify({ requestId, code: '000000' })).rejects.toMatchObject({ code: 'KOLHUB-4009' });
  await expect(otp.verify({ requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4009' });
});
test('gửi lại trong 60 giây → 4007 kèm retryAfterSec', async () => {
  await otp.send(sms); clock += 20_000;
  await expect(otp.send(sms)).rejects.toMatchObject({ code: 'KOLHUB-4007', meta: { retryAfterSec: 40 } });
});
test('gửi mã mới làm mã cũ hết hiệu lực', async () => {
  const a = await otp.send(sms); clock += 61_000; await otp.send(sms);
  await expect(otp.verify({ requestId: a.requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4006' });
});
test('lần gửi thứ 6 trong 1 giờ → 4007', async () => {
  for (let i = 0; i < 5; i++) { await otp.send(sms); clock += 61_000; }
  await expect(otp.send(sms)).rejects.toMatchObject({ code: 'KOLHUB-4007' });
});
test('mã dùng một lần', async () => {
  const { requestId } = await otp.send(sms);
  await otp.verify({ requestId, code: '123456' });
  await expect(otp.verify({ requestId, code: '123456' })).rejects.toMatchObject({ code: 'KOLHUB-4006' });
});
test('SMS đăng ký dùng đúng MẪU-01', async () => {
  await otp.send(sms);
  expect(sent[0].body).toBe('KOLHUB: Ma xac thuc dang ky tai khoan cua ban la 123456. Hieu luc 5 phut. Khong chia se ma nay cho bat ky ai.');
});
```

- [ ] **Step 2: Chạy `npm test -- otp` — FAIL**
- [ ] **Step 3: Viết `otp.ts` và `otpInbox.ts`.** Chuẩn hoá `target` (email/phone) trước khi lưu và so khớp. Mã SUPERSEDED/VERIFIED khi verify → 4006. Mỗi hàm `await delay()` trước khi xử lý, trừ khi `deps` truyền `delay: false` (test truyền `false`).
- [ ] **Step 4: Chạy test — PASS**
- [ ] **Step 5: Commit** — `feat(services): OTP mock (BR-04, BR-49, MẪU-01..03)`

---

### Task 4: Dịch vụ tài khoản (đăng ký, đăng nhập, khôi phục)

**Files:**
- Create: `src/app/services/mock/auth.ts`, `src/app/services/index.ts`
- Test: `src/app/services/mock/auth.test.ts`

**Interfaces:**
- Consumes: `Db`, `createOtpService` (instance), `normalize*`, `KolhubError`
- Produces:
  - `interface PendingRegistration { id: string; type: AccountType; email: string; phone?: string; password: string; fullName?: string; company?: string; consentAt: string; createdAt: number }`
  - `type RegisterInput = { type: 'KOL' | 'MCN'; phone: string; email: string; password: string; confirmPassword: string; consent: boolean } | { type: 'BIZ'; fullName: string; company: string; email: string; password: string; confirmPassword: string; consent: boolean }`
  - `createAuthService(deps: { db: Db; now: () => number; otp: OtpService; delay?: false })` trả:
    - `startRegistration(input: RegisterInput): Promise<{ registrationId: string }>`
    - `completeRegistration(input: { registrationId: string; emailOtpRequestId: string; smsOtpRequestId?: string }): Promise<Account>` — đặt phiên đăng nhập
    - `loginWithEmail(email: string, password: string): Promise<Account>`
    - `loginWithPhone(phone: string, otpRequestId: string): Promise<Account>`
    - `checkPhoneLogin(phone: string): Promise<void>` — 4012 nếu SĐT không thuộc tài khoản KOL/MCN (gọi trước khi gửi OTP)
    - `resetPassword(input: { channel: OtpChannel; target: string; otpRequestId: string; password: string; confirmPassword: string }): Promise<void>`
    - `quickLogin(type: AccountType): Promise<Account>` (Demo Panel)
    - `logout(): Promise<void>`
    - `currentAccount(): Account | null` (đồng bộ, đọc `sessionAccountId`)
  - `services/index.ts` export `otpService`, `authService`, `otpInbox`, `db`, và kiểu từ `types.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
test('email trùng khác hoa/khoảng trắng → 4002', async () =>
  await expect(auth.startRegistration({ ...kol, email: ' KOL@demo.kolhub.vn ' })).rejects.toMatchObject({ code: 'KOLHUB-4002' }));
test('SĐT trùng dạng +84 → 4001', async () =>
  await expect(auth.startRegistration({ ...kol, phone: '+84912000001' })).rejects.toMatchObject({ code: 'KOLHUB-4001' }));
test.each(['abcdefgh', '12345678', 'ab12'])('mật khẩu %s → 4003', async (p) =>
  await expect(auth.startRegistration({ ...kol, password: p, confirmPassword: p })).rejects.toMatchObject({ code: 'KOLHUB-4003' }));
test('nhập lại không khớp → 4004', async () =>
  await expect(auth.startRegistration({ ...kol, confirmPassword: 'khac1234' })).rejects.toMatchObject({ code: 'KOLHUB-4004' }));
test('Nhãn hàng dùng yahoo.com.vn → 4015', async () =>
  await expect(auth.startRegistration({ ...biz, email: 'a@yahoo.com.vn' })).rejects.toMatchObject({ code: 'KOLHUB-4015' }));
test('KOL mới qua OTP email nhưng chưa qua SMS → không tạo tài khoản', async () => {
  const { registrationId } = await auth.startRegistration(kol);
  const e = await otp.send({ channel: 'email', target: kol.email, purpose: 'register' });
  await otp.verify({ requestId: e.requestId, code: '123456' });
  await expect(auth.completeRegistration({ registrationId, emailOtpRequestId: e.requestId })).rejects.toBeInstanceOf(KolhubError);
  await expect(auth.loginWithEmail(kol.email, kol.password)).rejects.toMatchObject({ code: 'KOLHUB-4012' });
});
test('KOL qua đủ 2 OTP → tài khoản KOL, đang đăng nhập', async () => {
  const acc = await registerFully(kol);
  expect(acc.type).toBe('KOL');
  expect(auth.currentAccount()?.id).toBe(acc.id);
});
test('sai mật khẩu 5 lần → 4013, khoá 15 phút, mở lại sau đó', async () => {
  for (let i = 1; i <= 4; i++)
    await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'sai12345')).rejects.toMatchObject({ code: 'KOLHUB-4011', meta: { attemptsLeft: 5 - i } });
  await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'sai12345')).rejects.toMatchObject({ code: 'KOLHUB-4013' });
  await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'demo1234')).rejects.toMatchObject({ code: 'KOLHUB-4013' });
  clock += 15 * 60_000;
  await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'demo1234')).resolves.toMatchObject({ type: 'KOL' });
});
test('đăng nhập SĐT của tài khoản Nhãn hàng / SĐT lạ → 4012', async () =>
  await expect(auth.checkPhoneLogin('0999999999')).rejects.toMatchObject({ code: 'KOLHUB-4012' }));
test('đặt lại mật khẩu qua SMS rồi đăng nhập bằng mật khẩu mới', async () => { /* send reset OTP, verify, resetPassword, loginWithEmail(new) resolves */ });
```

- [ ] **Step 2: Chạy `npm test -- auth` — FAIL**
- [ ] **Step 3: Viết `auth.ts`.** Thứ tự kiểm tra `startRegistration`: consent → định dạng email/SĐT → trùng (4001/4002, so sau chuẩn hoá, chỉ với `accounts`; đăng ký dang dở không giữ chỗ email/SĐT) → 4015 (BIZ) → 4003 → 4004. `completeRegistration` yêu cầu `otp.isVerified` cho email (purpose `register`, đúng email) và, với KOL/MCN, cho SMS (đúng SĐT); thiếu → `KolhubError('KOLHUB-4014')`. Đếm sai mật khẩu theo email chuẩn hoá; đăng nhập đúng thì xoá bộ đếm.
- [ ] **Step 4: Viết `services/index.ts`** nối `db`, `Date.now`, `otpInbox.publish`.
- [ ] **Step 5: Chạy toàn bộ `npm test` — PASS**
- [ ] **Step 6: Commit** — `feat(services): auth mock (BR-02..10, BR-45)`

---

### Task 5: AuthContext, guard, layout theo role

**Files:**
- Create: `src/app/auth/AuthContext.tsx`, `src/app/auth/AccessGuard.tsx`, `src/app/layouts/GuestLayout.tsx`, `src/app/features/placeholder/ComingSoon.tsx`
- Modify: `src/app/routes.tsx`, `src/app/App.tsx`, `src/app/components/Layout.tsx`, `Sidebar.tsx`, `Header.tsx`, `BottomNavigation.tsx`
- Delete: `src/app/components/navigation.ts`

**Interfaces:**
- Consumes: `authService`, `ROLE_CONFIG`, `roleOf`, `resolveAccess`, `safeReturnTo`, `getPageMeta`
- Produces:
  - `useAuth(): { account: Account | null; role: RoleKey; setAccount(a: Account | null): void; logout(): Promise<void> }` — khởi tạo từ `authService.currentAccount()`
  - `<AccessGuard />` — phần tử của route gốc; gọi `resolveAccess(role, pathname)`; `reason === 'forbidden'` → `toast.error('Bạn không có quyền truy cập trang này')`; render `<Navigate replace>` hoặc `<Outlet />`
  - `<ComingSoon title: string; note: string />`

- [ ] **Step 1: Viết `AuthContext`, `AccessGuard`, `GuestLayout`** (nền `bg-page`, logo `logo.svg` ở trên, nội dung trong khung `max-w-xl`, căn giữa, có `pb-safe`).
- [ ] **Step 2: Viết lại `routes.tsx`**: route gốc `element: <AccessGuard/>`; con 1 `element: <GuestLayout/>` gồm `dang-ky`, `dang-nhap`, `quen-mat-khau`; con 2 `element: <Layout/>` gồm `ho-so-kol` (ComingSoon "Hồ sơ KOL", "Đợt 2"), `ho-so-mcn` (Đợt 2), `kol-safety` ("KOL Safety", "Sắp ra mắt"), `tim-kiem-kol`, `danh-sach-da-luu`, `tai-khoan-doanh-nghiep` (Đợt 3); `index` và `*` → `<Navigate to="/" />` để guard xử lý. Gỡ import các trang cũ khỏi route (giữ file).
- [ ] **Step 3: `App.tsx`** bọc `AuthProvider`, thêm `<Toaster richColors position="top-center" />`. (`<OtpInboxToaster />` thêm ở Task 6; `<DemoPanel />` render trong `AccessGuard` ở Task 9 vì cần router.)
- [ ] **Step 4: Sidebar/BottomNavigation/Header** đọc `ROLE_CONFIG[role].menu`. Sidebar: một nhóm menu duy nhất, bỏ khối "secondary". BottomNavigation: hiện toàn bộ menu của role, bỏ nút "Thêm". Header: badge = `ROLE_CONFIG[role].label`; dropdown có tên/email từ `account`, mục Đăng xuất gọi `logout()` rồi `navigate('/dang-nhap')`; bỏ `useUser`.
- [ ] **Step 5: Kiểm tra** — `npm run build` thành công (project không có `tsconfig`, Vite không kiểm kiểu nên phải chạy thử trên trình duyệt: 3 tài khoản mẫu đăng nhập qua Demo chưa có → tạm dùng `authService.quickLogin` trong console); `npm test` PASS.
- [ ] **Step 6: Commit** — `feat(app): role-based routing, layouts and menus`

---

### Task 6: Bước OTP dùng chung và hộp thư giả

**Files:**
- Create: `src/app/features/otp/OtpStep.tsx`, `src/app/features/otp/OtpInboxToaster.tsx`

**Interfaces:**
- Consumes: `otpService`, `otpInbox`, `errorMessage`
- Produces:
  - `<OtpStep channel: OtpChannel; target: string; purpose: OtpPurpose; onVerified(requestId: string): void; onBack?(): void />` — tự gửi mã khi mount; 6 ô `Input` (`inputMode="numeric"`, `autoComplete="one-time-code"`, dán 6 số tự điền); đếm ngược 60 giây rồi mới bật "Gửi lại mã"; hiện lỗi dưới ô bằng `errorMessage`; nút "Quay lại" gọi `onBack`
  - `<OtpInboxToaster />` — subscribe `otpInbox`; mỗi tin là một toast `sonner` 20 giây, biểu tượng `MessageSquare` (SMS) hoặc `Mail` (email), dòng tiêu đề "Tin nhắn tới {target che giữa}" / "Email tới …", thân là `body`, nút "Điền mã" copy `code` vào clipboard

- [ ] **Step 1: Viết hai component; thêm `<OtpInboxToaster />` vào `App.tsx`.** SĐT hiển thị che giữa: `0912***678`; email: `k***@demo.kolhub.vn`.
- [ ] **Step 2: Kiểm tra trên trình duyệt** qua trang Đăng ký ở Task 7.
- [ ] **Step 3: Commit** — `feat(otp): OtpStep and fake SMS/email inbox`

---

### Task 7: Màn Đăng ký (SCR-01)

**Files:**
- Create: `src/app/features/register/RegisterPage.tsx`, `AccountTypeCards.tsx`, `KolMcnForm.tsx`, `BizForm.tsx`

**Interfaces:**
- Consumes: `authService.startRegistration`, `authService.completeRegistration`, `<OtpStep>`, `useAuth().setAccount`, `ROLE_CONFIG`, `roleOf`
- Produces: `<RegisterPage />` (route `/dang-ky`)

- [ ] **Step 1: `AccountTypeCards`** — `RadioGroup` 3 thẻ theo ảnh tham chiếu: Cá nhân/KOL (`UserRound`, "Người sáng tạo nội dung hoạt động cá nhân"), Tổ chức/MCN (`Users`, "Doanh nghiệp quản lý nhiều kênh và KOL"), Nhãn hàng/Agency (`Building2`, "Doanh nghiệp, đại lý tìm và hợp tác với KOL"). Thẻ chọn có viền `border-primary`; 1 cột trên mobile, 3 cột từ `sm`. Chọn sẵn theo `?loai=kol|mcn|biz`, đổi thẻ thì cập nhật query.
- [ ] **Step 2: `KolMcnForm`** — SĐT, Email, Mật khẩu, Nhập lại mật khẩu, Checkbox đồng ý điều khoản; nút Đăng ký tắt khi chưa tick. **`BizForm`** — Họ tên, Tên công ty, Email công ty (gợi ý "Không dùng Gmail, Yahoo, Outlook…"), Mật khẩu ×2, Checkbox. Lỗi `meta.field` hiện dưới đúng trường; lỗi khác hiện `Alert` trên nút.
- [ ] **Step 3: `RegisterPage`** — trạng thái `'form' | 'otp-email' | 'otp-sms'`. KOL/MCN: form → `OtpStep(email, register)` → `OtpStep(sms, register)` → `completeRegistration` → `setAccount` → `navigate(ROLE_CONFIG[role].home)`. BIZ bỏ bước SMS. "Quay lại" về form, giữ dữ liệu. Link "Đã có tài khoản? Đăng nhập".
- [ ] **Step 4: Kiểm tra trên trình duyệt (375 px và 1280 px):** đăng ký KOL mới hết 2 OTP → vào `/ho-so-kol`; thử email trùng → 4002 dưới trường Email; đăng ký Nhãn hàng bằng `@gmail.com` → 4015; Nhãn hàng hợp lệ → `/tim-kiem-kol`. Console không lỗi.
- [ ] **Step 5: Commit** — `feat(register): SCR-01 with 3 account types and OTP`

---

### Task 8: Màn Đăng nhập và Quên mật khẩu (SCR-02)

**Files:**
- Create: `src/app/features/login/LoginPage.tsx`, `ForgotPasswordPage.tsx`

**Interfaces:**
- Consumes: `authService.loginWithEmail`, `checkPhoneLogin`, `loginWithPhone`, `resetPassword`, `<OtpStep>`, `useAuth().setAccount`, `safeReturnTo`
- Produces: `<LoginPage />` (`/dang-nhap`), `<ForgotPasswordPage />` (`/quen-mat-khau`)

- [ ] **Step 1: `LoginPage`** — `Tabs` "Email" (mặc định) / "Số điện thoại (OTP SMS)". Email: email + mật khẩu → `loginWithEmail`. SĐT: nhập SĐT → `checkPhoneLogin` → `OtpStep(sms, login)` → `loginWithPhone`. Thành công → `navigate(safeReturnTo(roleOf(acc), searchParams.get('returnTo')), { replace: true })`. Link "Quên mật khẩu?" và "Chưa có tài khoản? Đăng ký".
- [ ] **Step 2: `ForgotPasswordPage`** — `RadioGroup` Email / SMS → nhập email hoặc SĐT → `OtpStep(channel, reset)` → mật khẩu mới ×2 → `resetPassword` → `toast.success('Đã đổi mật khẩu. Vui lòng đăng nhập lại.')` → `/dang-nhap`.
- [ ] **Step 3: Kiểm tra trên trình duyệt:** đăng nhập 3 tài khoản mẫu, mỗi role vào đúng màn mặc định với menu riêng; sai mật khẩu 5 lần → thông báo khoá; mở `/danh-sach-da-luu` khi chưa đăng nhập → Đăng nhập → đăng nhập Nhãn hàng quay về `/danh-sach-da-luu`; KOL gõ `/tim-kiem-kol` → về `/ho-so-kol` + toast; `/dang-nhap?returnTo=//evil.com` → màn mặc định.
- [ ] **Step 4: Commit** — `feat(login): SCR-02 email/phone login and password reset`

---

### Task 9: Demo Panel (khối Chuyển role, Dữ liệu)

**Files:**
- Create: `src/app/demo/DemoPanel.tsx`
- Modify: `src/app/auth/AccessGuard.tsx` (render `<DemoPanel />` cạnh `<Outlet />`, vì panel dùng `useNavigate`)

**Interfaces:**
- Consumes: `authService.quickLogin`, `authService.logout`, `db.reset`, `useAuth`, `ROLE_CONFIG`
- Produces: `<DemoPanel />` — Đợt 2/3 sẽ thêm khối Giả lập Admin, Case eKYC, Phễu, Giả định

- [ ] **Step 1: Viết `DemoPanel`.** Nút tròn nổi `FlaskConical`, `fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6`, `aria-label="Bảng điều khiển demo"`. `Sheet` phải: tiêu đề "Chế độ demo"; khối "Vai trò" — 4 nút (Khách, Cá nhân/KOL, Tổ chức/MCN, Nhãn hàng/Agency), nút của role hiện tại ở trạng thái chọn; bấm → `quickLogin`/`logout` → `setAccount` → `navigate(home)`; khối "Dữ liệu" — "Reset dữ liệu demo" có `AlertDialog` xác nhận → `db.reset()` → đăng xuất → `/dang-ky`; dòng ghi chú tài khoản mẫu + mật khẩu `demo1234`.
- [ ] **Step 2: Kiểm tra trên trình duyệt:** chuyển qua lại 4 role, menu/badge/màn mặc định đổi đúng; reset xoá tài khoản vừa đăng ký.
- [ ] **Step 3: Commit** — `feat(demo): demo panel with role switcher and reset`

---

### Task 10: Kiểm tra cuối Đợt 1

- [ ] **Step 1:** `npm test` — toàn bộ PASS.
- [ ] **Step 2:** `npm run build` — thành công.
- [ ] **Step 3:** Trên trình duyệt ở 375 px, 768 px, 1280 px: đi UC-01, UC-02, UC-03, UC-04, UC-05 và các kiểm tra ở Task 7–9; console không lỗi mới.
- [ ] **Step 4:** Commit nếu còn thay đổi — `chore: đợt 1 verification fixes`
