import { beforeEach, expect, test } from 'vitest';
import { createAuthService } from './auth';
import { createBizAccountService } from './bizAccount';
import { createDb, type Db } from './db';
import { createOtpService, type OtpService } from './otp';
import { createSavedListService } from './savedLists';
import { seedState } from './seed';

let clock: number;
let db: Db;
let otp: OtpService;
let auth: ReturnType<typeof createAuthService>;
let biz: ReturnType<typeof createBizAccountService>;

beforeEach(async () => {
  clock = Date.UTC(2026, 8, 27, 3);
  db = createDb(null, seedState);
  otp = createOtpService({ db, now: () => clock, notify: () => {}, genCode: () => '123456', delay: false });
  auth = createAuthService({ db, now: () => clock, otp, delay: false });
  biz = createBizAccountService({ db, now: () => clock, otp, delay: false });
  await auth.loginWithEmail('brand@vinamilk-demo.vn', 'demo1234');
});

async function verifiedChangeOtp(target: string) {
  const r = await otp.send({ channel: 'email', target, purpose: 'change-email' });
  await otp.verify({ requestId: r.requestId, code: '123456' });
  return r.requestId;
}

test('sửa họ tên, tên công ty: trim và lưu', async () => {
  expect(await biz.updateBizProfile({ fullName: ' Trần B ', company: ' Công ty X ' })).toMatchObject({
    fullName: 'Trần B',
    company: 'Công ty X',
  });
  expect(auth.currentAccount()).toMatchObject({ fullName: 'Trần B', company: 'Công ty X' });
});

test('kết quả không chứa mật khẩu', async () =>
  expect(await biz.updateBizProfile({ fullName: 'A', company: 'B' })).not.toHaveProperty('password'));

test('tên công ty rỗng → 4018 field company', async () =>
  await expect(biz.updateBizProfile({ fullName: 'A', company: '  ' })).rejects.toMatchObject({
    code: 'KOLHUB-4018',
    meta: { field: 'company' },
  }));

test('họ tên > 200 ký tự → 4018 field fullName; thông báo có nhãn trường', async () => {
  const err = await biz.updateBizProfile({ fullName: 'a'.repeat(201), company: 'B' }).catch((e) => e);
  expect(err).toMatchObject({ code: 'KOLHUB-4018', meta: { field: 'fullName' } });
  expect(err.message).toBe('Họ tên không hợp lệ hoặc còn trống.');
});

test.each([
  ['ai@gmail.com', 'KOLHUB-4015'],
  ['x@yahoo.com.vn', 'KOLHUB-4015'],
  [' BRAND@vinamilk-demo.vn ', 'KOLHUB-4017'],
  ['KOL@demo.kolhub.vn', 'KOLHUB-4002'],
  ['khong-phai-email', 'KOLHUB-4018'],
])('startCompanyEmailChange(%s) → %s', async (email, code) =>
  await expect(biz.startCompanyEmailChange(email)).rejects.toMatchObject({ code }));

test('BR-63: bắt đầu đổi chưa làm đổi email', async () => {
  expect(await biz.startCompanyEmailChange(' Mua-Hang@vinamilk-demo.vn ')).toEqual({ email: 'mua-hang@vinamilk-demo.vn' });
  expect(auth.currentAccount()?.email).toBe('brand@vinamilk-demo.vn');
});

test('BR-63: xác nhận khi OTP chưa verify / verify cho email khác / sai mục đích → 4014', async () => {
  const a = await otp.send({ channel: 'email', target: 'mua-hang@vinamilk-demo.vn', purpose: 'change-email' });
  await expect(
    biz.confirmCompanyEmailChange({ newEmail: 'mua-hang@vinamilk-demo.vn', otpRequestId: a.requestId }),
  ).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  const b = await otp.send({ channel: 'email', target: 'khac@vinamilk-demo.vn', purpose: 'change-email' });
  await otp.verify({ requestId: b.requestId, code: '123456' });
  await expect(
    biz.confirmCompanyEmailChange({ newEmail: 'mua-hang@vinamilk-demo.vn', otpRequestId: b.requestId }),
  ).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  const c = await otp.send({ channel: 'email', target: 'mua-hang2@vinamilk-demo.vn', purpose: 'register' });
  await otp.verify({ requestId: c.requestId, code: '123456' });
  await expect(
    biz.confirmCompanyEmailChange({ newEmail: 'mua-hang2@vinamilk-demo.vn', otpRequestId: c.requestId }),
  ).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  expect(auth.currentAccount()?.email).toBe('brand@vinamilk-demo.vn');
});

test('BR-63: đủ OTP → đổi email; đăng nhập bằng email mới được, email cũ 4012', async () => {
  const id = await verifiedChangeOtp('Mua-Hang@vinamilk-demo.vn');
  expect(await biz.confirmCompanyEmailChange({ newEmail: 'Mua-Hang@vinamilk-demo.vn', otpRequestId: id })).toMatchObject({
    email: 'mua-hang@vinamilk-demo.vn',
  });
  expect(auth.currentAccount()?.email).toBe('mua-hang@vinamilk-demo.vn');
  await expect(auth.loginWithEmail('mua-hang@vinamilk-demo.vn', 'demo1234')).resolves.toMatchObject({ type: 'BIZ' });
  await expect(auth.loginWithEmail('brand@vinamilk-demo.vn', 'demo1234')).rejects.toMatchObject({ code: 'KOLHUB-4012' });
});

test('email mới bị tài khoản khác lấy mất giữa chừng → confirm 4002', async () => {
  const id = await verifiedChangeOtp('mua-hang@vinamilk-demo.vn');
  db.update((s) => {
    s.accounts.find((a) => a.type === 'KOL')!.email = 'mua-hang@vinamilk-demo.vn';
  });
  await expect(
    biz.confirmCompanyEmailChange({ newEmail: 'mua-hang@vinamilk-demo.vn', otpRequestId: id }),
  ).rejects.toMatchObject({ code: 'KOLHUB-4002' });
});

test('danh sách đã lưu vẫn thuộc tài khoản sau khi đổi email', async () => {
  const lists = createSavedListService({ db, now: () => clock, delay: false });
  expect(await lists.listLists()).toHaveLength(2);
  const id = await verifiedChangeOtp('mua-hang@vinamilk-demo.vn');
  await biz.confirmCompanyEmailChange({ newEmail: 'mua-hang@vinamilk-demo.vn', otpRequestId: id });
  expect(await lists.listLists()).toHaveLength(2);
});

test('phiên KOL → 4016', async () => {
  await auth.loginWithEmail('kol@demo.kolhub.vn', 'demo1234');
  await expect(biz.updateBizProfile({ fullName: 'A', company: 'B' })).rejects.toMatchObject({ code: 'KOLHUB-4016' });
  await expect(biz.startCompanyEmailChange('a@congty.vn')).rejects.toMatchObject({ code: 'KOLHUB-4016' });
});
