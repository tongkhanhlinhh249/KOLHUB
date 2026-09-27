import { beforeEach, describe, expect, test } from 'vitest';
import { createDb, type Db } from './db';
import { seedState } from './seed';
import { createOtpService, type OtpService } from './otp';
import { createAuthService, type RegisterInput } from './auth';
import { InvalidInputError, KolhubError, type OtpChannel, type OtpPurpose } from '../types';

let clock: number;
let db: Db;
let otp: OtpService;
let auth: ReturnType<typeof createAuthService>;

const kol = {
  type: 'KOL' as const,
  phone: '0987654321',
  email: 'new.kol@demo.vn',
  password: 'matkhau123',
  confirmPassword: 'matkhau123',
  consent: true,
};
const biz = {
  type: 'BIZ' as const,
  fullName: 'Trần Văn B',
  company: 'Công ty B',
  email: 'b@congty-b.vn',
  password: 'matkhau123',
  confirmPassword: 'matkhau123',
  consent: true,
};

beforeEach(() => {
  clock = 1_800_000_000_000;
  db = createDb(null, seedState);
  otp = createOtpService({ db, now: () => clock, notify: () => {}, genCode: () => '123456', delay: false });
  auth = createAuthService({ db, now: () => clock, otp, delay: false });
});

async function verifiedOtp(channel: OtpChannel, target: string, purpose: OtpPurpose) {
  const r = await otp.send({ channel, target, purpose });
  await otp.verify({ requestId: r.requestId, code: '123456' });
  return r.requestId;
}

async function registerFully(input: RegisterInput) {
  const { registrationId } = await auth.startRegistration(input);
  const emailOtpRequestId = await verifiedOtp('email', input.email, 'register');
  const smsOtpRequestId = input.type === 'BIZ' ? undefined : await verifiedOtp('sms', input.phone, 'register');
  return auth.completeRegistration({ registrationId, emailOtpRequestId, smsOtpRequestId });
}

describe('startRegistration', () => {
  test('email trùng khác hoa/khoảng trắng → 4002', async () =>
    await expect(auth.startRegistration({ ...kol, email: ' KOL@demo.kolhub.vn ' })).rejects.toMatchObject({
      code: 'KOLHUB-4002',
      meta: { field: 'email' },
    }));
  test('SĐT trùng dạng +84 → 4001', async () =>
    await expect(auth.startRegistration({ ...kol, phone: '+84912000001' })).rejects.toMatchObject({
      code: 'KOLHUB-4001',
      meta: { field: 'phone' },
    }));
  test.each(['abcdefgh', '12345678', 'ab12'])('mật khẩu %s → 4003', async (p) =>
    await expect(auth.startRegistration({ ...kol, password: p, confirmPassword: p })).rejects.toMatchObject({
      code: 'KOLHUB-4003',
    }));
  test('nhập lại không khớp → 4004', async () =>
    await expect(auth.startRegistration({ ...kol, confirmPassword: 'khac1234' })).rejects.toMatchObject({
      code: 'KOLHUB-4004',
      meta: { field: 'confirmPassword' },
    }));
  test('Nhãn hàng dùng yahoo.com.vn → 4015', async () =>
    await expect(auth.startRegistration({ ...biz, email: 'a@yahoo.com.vn' })).rejects.toMatchObject({
      code: 'KOLHUB-4015',
      meta: { field: 'email' },
    }));
  test.each(['a@gmail.com', 'a@GMAIL.com', 'a@outlook.com', 'a@hotmail.com', 'a@icloud.com', 'a@live.com', 'a@yahoo.com'])(
    'Nhãn hàng dùng %s → 4015',
    async (email) => await expect(auth.startRegistration({ ...biz, email })).rejects.toMatchObject({ code: 'KOLHUB-4015' }),
  );
  test('KOL dùng gmail vẫn được', async () =>
    await expect(auth.startRegistration({ ...kol, email: 'kol.moi@gmail.com' })).resolves.toHaveProperty('registrationId'));
  test('chưa đồng ý điều khoản → InvalidInputError consent', async () =>
    await expect(auth.startRegistration({ ...kol, consent: false })).rejects.toMatchObject({ field: 'consent' }));
  test('SĐT / email sai định dạng → InvalidInputError', async () => {
    await expect(auth.startRegistration({ ...kol, phone: '0212345678' })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(auth.startRegistration({ ...kol, email: 'abc' })).rejects.toMatchObject({ field: 'email' });
  });
  test('trùng được kiểm trước mật khẩu', async () =>
    await expect(
      auth.startRegistration({ ...kol, email: 'kol@demo.kolhub.vn', password: 'x', confirmPassword: 'y' }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4002' }));
  test('đăng ký dang dở không giữ chỗ email/SĐT', async () => {
    await auth.startRegistration(kol);
    await expect(auth.startRegistration(kol)).resolves.toHaveProperty('registrationId');
  });
});

describe('completeRegistration', () => {
  test('KOL mới qua OTP email nhưng chưa qua SMS → không tạo tài khoản', async () => {
    const { registrationId } = await auth.startRegistration(kol);
    const e = await otp.send({ channel: 'email', target: kol.email, purpose: 'register' });
    await otp.verify({ requestId: e.requestId, code: '123456' });
    await expect(auth.completeRegistration({ registrationId, emailOtpRequestId: e.requestId })).rejects.toBeInstanceOf(
      KolhubError,
    );
    await expect(auth.completeRegistration({ registrationId, emailOtpRequestId: e.requestId })).rejects.toMatchObject({
      code: 'KOLHUB-4014',
    });
    await expect(auth.loginWithEmail(kol.email, kol.password)).rejects.toMatchObject({ code: 'KOLHUB-4012' });
    expect(auth.currentAccount()).toBeNull();
  });

  test('OTP email của email khác → 4014', async () => {
    const { registrationId } = await auth.startRegistration(kol);
    const other = await verifiedOtp('email', 'other@demo.vn', 'register');
    const s = await verifiedOtp('sms', kol.phone, 'register');
    await expect(
      auth.completeRegistration({ registrationId, emailOtpRequestId: other, smsOtpRequestId: s }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  });

  test('KOL qua đủ 2 OTP → tài khoản KOL, đang đăng nhập', async () => {
    const acc = await registerFully(kol);
    expect(acc.type).toBe('KOL');
    expect(acc).not.toHaveProperty('password');
    expect(auth.currentAccount()?.id).toBe(acc.id);
    expect(db.read().registrations).toHaveLength(0);
  });

  test('email/SĐT viết khác kiểu được chuẩn hoá khi lưu, đăng nhập được', async () => {
    const acc = await registerFully({ ...kol, email: ' New.KOL@Demo.vn ', phone: '+84987654321' });
    expect(acc).toMatchObject({ email: 'new.kol@demo.vn', phone: '0987654321' });
    await auth.logout();
    await expect(auth.loginWithEmail('new.kol@demo.vn', kol.password)).resolves.toMatchObject({ id: acc.id });
    await expect(auth.startRegistration({ ...kol, phone: '0987 654 321', email: 'x@demo.vn' })).rejects.toMatchObject({
      code: 'KOLHUB-4001',
    });
  });

  test('Nhãn hàng chỉ cần OTP email', async () => {
    const acc = await registerFully(biz);
    expect(acc).toMatchObject({ type: 'BIZ', fullName: 'Trần Văn B', company: 'Công ty B', email: biz.email });
    expect(auth.currentAccount()?.type).toBe('BIZ');
  });

  test('registrationId lạ → 4014', async () =>
    await expect(auth.completeRegistration({ registrationId: 'x', emailOtpRequestId: 'y' })).rejects.toMatchObject({
      code: 'KOLHUB-4014',
    }));

  test('người khác đăng ký trước khi hoàn tất → 4001', async () => {
    const { registrationId } = await auth.startRegistration(kol);
    const e = await verifiedOtp('email', kol.email, 'register');
    const s = await verifiedOtp('sms', kol.phone, 'register');
    clock += 61_000;
    await registerFully(kol);
    await expect(
      auth.completeRegistration({ registrationId, emailOtpRequestId: e, smsOtpRequestId: s }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4001' });
    expect(db.read().accounts.filter((a) => a.email === kol.email)).toHaveLength(1);
  });
});

describe('login', () => {
  test('đăng nhập email khác hoa/khoảng trắng', async () =>
    await expect(auth.loginWithEmail(' KOL@Demo.KolHub.vn ', 'demo1234')).resolves.toMatchObject({ type: 'KOL' }));

  test('email không tồn tại → 4012', async () =>
    await expect(auth.loginWithEmail('khong@co.vn', 'demo1234')).rejects.toMatchObject({ code: 'KOLHUB-4012' }));

  test('sai mật khẩu 5 lần → 4013, khoá 15 phút, mở lại sau đó', async () => {
    for (let i = 1; i <= 4; i++)
      await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'sai12345')).rejects.toMatchObject({
        code: 'KOLHUB-4011',
        meta: { attemptsLeft: 5 - i },
      });
    await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'sai12345')).rejects.toMatchObject({ code: 'KOLHUB-4013' });
    await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'demo1234')).rejects.toMatchObject({ code: 'KOLHUB-4013' });
    clock += 15 * 60_000;
    await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'demo1234')).resolves.toMatchObject({ type: 'KOL' });
  });

  test('đăng nhập đúng thì xoá bộ đếm sai', async () => {
    for (let i = 0; i < 4; i++) await auth.loginWithEmail('kol@demo.kolhub.vn', 'sai12345').catch(() => {});
    await auth.loginWithEmail('kol@demo.kolhub.vn', 'demo1234');
    await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'sai12345')).rejects.toMatchObject({
      code: 'KOLHUB-4011',
      meta: { attemptsLeft: 4 },
    });
  });

  test('đăng nhập SĐT của tài khoản Nhãn hàng / SĐT lạ → 4012', async () =>
    await expect(auth.checkPhoneLogin('0999999999')).rejects.toMatchObject({ code: 'KOLHUB-4012' }));

  test('SĐT của KOL dạng +84 hợp lệ để đăng nhập', async () =>
    await expect(auth.checkPhoneLogin('+84 912 000 001')).resolves.toBeUndefined());

  test('đăng nhập SĐT + OTP', async () => {
    const r = await verifiedOtp('sms', '0912000002', 'login');
    await expect(auth.loginWithPhone('+84912000002', r)).resolves.toMatchObject({ type: 'MCN' });
    expect(auth.currentAccount()?.type).toBe('MCN');
  });

  test('đăng nhập SĐT với OTP chưa xác thực / sai mục đích → 4014', async () => {
    const r = await otp.send({ channel: 'sms', target: '0912000002', purpose: 'login' });
    await expect(auth.loginWithPhone('0912000002', r.requestId)).rejects.toMatchObject({ code: 'KOLHUB-4014' });
    clock += 61_000;
    const reg = await verifiedOtp('sms', '0912000002', 'register');
    await expect(auth.loginWithPhone('0912000002', reg)).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  });

  test('quickLogin và logout', async () => {
    await expect(auth.quickLogin('BIZ')).resolves.toMatchObject({ email: 'brand@vinamilk-demo.vn' });
    expect(auth.currentAccount()?.type).toBe('BIZ');
    await auth.logout();
    expect(auth.currentAccount()).toBeNull();
  });

  test('quickLogin theo khoá tài khoản demo; kiểu cũ vẫn chạy', async () => {
    await expect(auth.quickLogin('KOL')).resolves.toMatchObject({ email: 'kol@demo.kolhub.vn' });
    await expect(auth.quickLogin('kol-new')).resolves.toMatchObject({ email: 'kol@demo.kolhub.vn' });
    await expect(auth.quickLogin('kol-verified')).resolves.toMatchObject({ type: 'KOL', email: 'khanhvy@demo.kolhub.vn' });
    expect(auth.currentAccount()?.email).toBe('khanhvy@demo.kolhub.vn');
    await expect(auth.quickLogin('mcn')).resolves.toMatchObject({ email: 'mcn@demo.kolhub.vn' });
    await expect(auth.quickLogin('biz')).resolves.toMatchObject({ email: 'brand@vinamilk-demo.vn' });
    expect(auth.currentAccount()).not.toHaveProperty('password');
    await expect(auth.quickLogin('guest' as never)).rejects.toMatchObject({ code: 'KOLHUB-4012' });
  });

  test('KOL mẫu đã duyệt đăng nhập bằng khanhvy@demo.kolhub.vn / demo1234', async () => {
    await expect(auth.loginWithEmail('khanhvy@demo.kolhub.vn', 'demo1234')).resolves.toMatchObject({ type: 'KOL' });
  });
});

describe('resetPassword', () => {
  test('đặt lại mật khẩu qua SMS rồi đăng nhập bằng mật khẩu mới', async () => {
    const r = await verifiedOtp('sms', '0912000001', 'reset');
    await auth.resetPassword({
      channel: 'sms',
      target: '0912000001',
      otpRequestId: r,
      password: 'moi12345',
      confirmPassword: 'moi12345',
    });
    await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'demo1234')).rejects.toMatchObject({ code: 'KOLHUB-4011' });
    await expect(auth.loginWithEmail('kol@demo.kolhub.vn', 'moi12345')).resolves.toMatchObject({ type: 'KOL' });
  });

  test('đặt lại qua email, mở khoá đăng nhập', async () => {
    for (let i = 0; i < 5; i++) await auth.loginWithEmail('brand@vinamilk-demo.vn', 'sai12345').catch(() => {});
    const r = await verifiedOtp('email', 'Brand@Vinamilk-Demo.vn', 'reset');
    await auth.resetPassword({
      channel: 'email',
      target: 'brand@vinamilk-demo.vn',
      otpRequestId: r,
      password: 'moi12345',
      confirmPassword: 'moi12345',
    });
    await expect(auth.loginWithEmail('brand@vinamilk-demo.vn', 'moi12345')).resolves.toMatchObject({ type: 'BIZ' });
  });

  test('đặt lại đăng xuất phiên hiện tại của tài khoản đó', async () => {
    await auth.quickLogin('KOL');
    const r = await verifiedOtp('sms', '0912000001', 'reset');
    await auth.resetPassword({ channel: 'sms', target: '0912000001', otpRequestId: r, password: 'moi12345', confirmPassword: 'moi12345' });
    expect(auth.currentAccount()).toBeNull();
  });

  test('mật khẩu mới không đạt / không khớp / OTP chưa xác thực', async () => {
    const r = await verifiedOtp('sms', '0912000001', 'reset');
    const base = { channel: 'sms' as const, target: '0912000001', otpRequestId: r };
    await expect(auth.resetPassword({ ...base, password: 'abc', confirmPassword: 'abc' })).rejects.toMatchObject({ code: 'KOLHUB-4003' });
    await expect(auth.resetPassword({ ...base, password: 'moi12345', confirmPassword: 'moi12346' })).rejects.toMatchObject({
      code: 'KOLHUB-4004',
    });
    await expect(
      auth.resetPassword({ ...base, otpRequestId: 'x', password: 'moi12345', confirmPassword: 'moi12345' }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4014' });
  });

  test('đích không có tài khoản → 4012', async () => {
    const r = await verifiedOtp('sms', '0999999999', 'reset');
    await expect(
      auth.resetPassword({ channel: 'sms', target: '0999999999', otpRequestId: r, password: 'moi12345', confirmPassword: 'moi12345' }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4012' });
  });
});
